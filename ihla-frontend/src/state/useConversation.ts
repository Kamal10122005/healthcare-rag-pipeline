import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from './AppProvider';
import { toServiceError } from '@/services/errors';
import type {
  Conversation,
  ConversationMessage,
  ConversationSummary,
  ServiceErrorInfo,
} from '@/types/models';

/**
 * Owns the assistant conversation: history, the active thread, and asking.
 *
 * Failure behaviour (this is the part that matters):
 *   - the user's turn stays on screen
 *   - the assistant turn becomes an error turn carrying the real failure
 *   - the question text is handed back to the composer via `restoredDraft`
 *   - `retryLast()` re-sends the exact same question
 *
 * At no point is demonstration content substituted for a failed live request.
 *
 * Staleness control. Three independent races are guarded here, because any one
 * of them could put content from one data source into a view labelled as the
 * other — which is the exact failure this product must not have:
 *
 *   1. Mode switch mid-request. Every async callback captures the service
 *      instance it started with and discards its result if the active service
 *      has since changed. In-flight requests are also aborted on switch.
 *   2. Rapid conversation switching. Each selection takes a monotonically
 *      increasing sequence number; only the newest may write to state, and the
 *      previous request is aborted.
 *   3. Unmount. A mounted-ref gate plus abort on cleanup.
 *
 * Abort is both signalled (so the network request is actually cancelled) and
 * checked on return (so a response already in flight cannot win a race).
 */

let localIdCounter = 0;
const localId = (prefix: string) => `${prefix}-local-${(localIdCounter += 1)}`;

export interface ConversationController {
  conversationId: string | null;
  messages: ConversationMessage[];

  conversations: ConversationSummary[];
  conversationsLoading: boolean;
  conversationsError: ServiceErrorInfo | null;
  reloadConversations: () => void;

  threadLoading: boolean;
  threadError: ServiceErrorInfo | null;

  asking: boolean;
  ask: (question: string) => Promise<void>;
  retryLast: () => void;

  startNew: () => void;
  select: (conversationId: string) => void;
  remove: (conversationId: string) => Promise<boolean>;

  /** Text handed back to the composer after a failure, so nothing is lost. */
  restoredDraft: string | null;
  consumeRestoredDraft: () => void;
}

export function useConversation(): ConversationController {
  const { service, readingLevel } = useApp();

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState<ServiceErrorInfo | null>(null);

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [conversationsError, setConversationsError] = useState<ServiceErrorInfo | null>(null);

  const [asking, setAsking] = useState(false);
  const [restoredDraft, setRestoredDraft] = useState<string | null>(null);
  const lastQuestion = useRef<string | null>(null);

  /** The service every in-flight request was started against. */
  const serviceRef = useRef(service);
  serviceRef.current = service;

  /** Monotonic sequence for conversation selection; only the newest may write. */
  const selectSeq = useRef(0);

  const listController = useRef<AbortController | null>(null);
  const selectController = useRef<AbortController | null>(null);
  const askController = useRef<AbortController | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      listController.current?.abort();
      selectController.current?.abort();
      askController.current?.abort();
    };
  }, []);

  /** True when this request may still write to state. */
  const isCurrent = useCallback(
    (startedWith: unknown, signal: AbortSignal) =>
      mountedRef.current && !signal.aborted && serviceRef.current === startedWith,
    [],
  );

  /* ------------------------- conversation list ------------------------- */

  const reloadConversations = useCallback(() => {
    listController.current?.abort();
    const controller = new AbortController();
    listController.current = controller;

    const startedWith = service;
    setConversationsLoading(true);
    setConversationsError(null);

    service
      .listConversations(controller.signal)
      .then((list) => {
        if (!isCurrent(startedWith, controller.signal)) return;
        setConversations(list);
        setConversationsLoading(false);
      })
      .catch((error: unknown) => {
        if (!isCurrent(startedWith, controller.signal)) return;
        const serviceError = toServiceError(error);
        if (serviceError.isAborted) return;
        // The history rail fails independently; the composer stays usable.
        setConversations([]);
        setConversationsError(serviceError.toInfo());
        setConversationsLoading(false);
      });
  }, [service, isCurrent]);

  /**
   * Switching mode means switching data source. Everything in flight is
   * cancelled and the thread is cleared, so a response started under the old
   * service can neither land in the new view nor be shown with the wrong
   * origin label.
   */
  useEffect(() => {
    listController.current?.abort();
    selectController.current?.abort();
    askController.current?.abort();
    selectSeq.current += 1;

    setConversationId(null);
    setMessages([]);
    setThreadError(null);
    setThreadLoading(false);
    setAsking(false);
    setRestoredDraft(null);
    lastQuestion.current = null;

    reloadConversations();
  }, [service, reloadConversations]);

  /* ----------------------------- selection ----------------------------- */

  const select = useCallback(
    (id: string) => {
      selectController.current?.abort();
      const controller = new AbortController();
      selectController.current = controller;

      const seq = (selectSeq.current += 1);
      const startedWith = service;

      setConversationId(id);
      setThreadLoading(true);
      setThreadError(null);

      service
        .getConversation(id, controller.signal)
        .then((conversation: Conversation) => {
          // Both guards matter: `seq` catches a faster second click, the
          // service check catches a mode switch.
          if (seq !== selectSeq.current) return;
          if (!isCurrent(startedWith, controller.signal)) return;
          setMessages(conversation.messages);
          setThreadLoading(false);
        })
        .catch((error: unknown) => {
          if (seq !== selectSeq.current) return;
          if (!isCurrent(startedWith, controller.signal)) return;
          const serviceError = toServiceError(error);
          if (serviceError.isAborted) return;
          setMessages([]);
          setThreadError(serviceError.toInfo());
          setThreadLoading(false);
        });
    },
    [service, isCurrent],
  );

  const startNew = useCallback(() => {
    selectController.current?.abort();
    selectSeq.current += 1;
    setConversationId(null);
    setMessages([]);
    setThreadError(null);
    setThreadLoading(false);
    lastQuestion.current = null;
  }, []);

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      const startedWith = service;
      try {
        await service.deleteConversation(id);
        if (!mountedRef.current || serviceRef.current !== startedWith) return true;
        setConversations((current) => current.filter((item) => item.id !== id));
        if (conversationId === id) startNew();
        return true;
      } catch {
        return false;
      }
    },
    [service, conversationId, startNew],
  );

  /* ------------------------------- ask -------------------------------- */

  const ask = useCallback(
    async (rawQuestion: string) => {
      const question = rawQuestion.trim();
      if (!question || asking) return;

      askController.current?.abort();
      const controller = new AbortController();
      askController.current = controller;
      const startedWith = service;
      const askSeq = selectSeq.current;

      lastQuestion.current = question;
      setRestoredDraft(null);
      setAsking(true);
      setThreadError(null);

      const origin = service.mode === 'demo' ? 'demo' : 'live';

      const userMessage: ConversationMessage = {
        id: localId('user'),
        role: 'user',
        text: question,
        answer: null,
        createdAt: new Date().toISOString(),
        status: 'complete',
        error: null,
        origin,
      };

      const pendingId = localId('assistant');
      const pendingMessage: ConversationMessage = {
        id: pendingId,
        role: 'assistant',
        text: null,
        answer: null,
        createdAt: new Date().toISOString(),
        status: 'pending',
        error: null,
        origin,
      };

      // Drop any previous failed turn before asking again.
      setMessages((current) => [
        ...current.filter((message) => message.status !== 'error'),
        userMessage,
        pendingMessage,
      ]);

      try {
        const response = await service.askQuestion(
          {
            question,
            conversationId: conversationId ?? undefined,
            readingLevel,
          },
          controller.signal,
        );

        // A mode switch or a conversation change while the answer was in
        // flight invalidates it entirely — it is not rendered anywhere.
        if (!isCurrent(startedWith, controller.signal) || askSeq !== selectSeq.current) {
          // Still release the composer when the user merely switched
          // conversations; otherwise the Ask button stays stuck in "Working".
          if (mountedRef.current && serviceRef.current === startedWith) setAsking(false);
          return;
        }

        setMessages((current) =>
          current.map((message) =>
            message.id === pendingId
              ? {
                  ...message,
                  id: response.messageId,
                  answer: response.answer,
                  status: 'complete' as const,
                  origin: response.answer.origin,
                }
              : message,
          ),
        );

        if (!conversationId) setConversationId(response.conversationId);
        setAsking(false);
        reloadConversations();
      } catch (error: unknown) {
        if (!isCurrent(startedWith, controller.signal) || askSeq !== selectSeq.current) {
          if (mountedRef.current && serviceRef.current === startedWith) setAsking(false);
          return;
        }

        const serviceError = toServiceError(error);
        if (serviceError.isAborted) {
          setMessages((current) => current.filter((message) => message.id !== pendingId));
          setAsking(false);
          return;
        }

        // No fallback content. The turn becomes an error, and the question
        // goes back to the composer so the user does not have to retype it.
        setMessages((current) =>
          current.map((message) =>
            message.id === pendingId
              ? { ...message, status: 'error' as const, error: serviceError.toInfo() }
              : message,
          ),
        );
        setRestoredDraft(question);
        setAsking(false);
      }
    },
    [asking, conversationId, readingLevel, reloadConversations, service, isCurrent],
  );

  const retryLast = useCallback(() => {
    const question = lastQuestion.current;
    if (!question) return;
    // Remove the failed pair; `ask` re-adds the user turn.
    setMessages((current) => {
      const withoutError = current.filter((message) => message.status !== 'error');
      const lastUserIndex = [...withoutError]
        .reverse()
        .findIndex((message) => message.role === 'user' && message.text === question);
      if (lastUserIndex < 0) return withoutError;
      const absoluteIndex = withoutError.length - 1 - lastUserIndex;
      return withoutError.filter((_, index) => index !== absoluteIndex);
    });
    void ask(question);
  }, [ask]);

  const consumeRestoredDraft = useCallback(() => setRestoredDraft(null), []);

  return {
    conversationId,
    messages,
    conversations,
    conversationsLoading,
    conversationsError,
    reloadConversations,
    threadLoading,
    threadError,
    asking,
    ask,
    retryLast,
    startNew,
    select,
    remove,
    restoredDraft,
    consumeRestoredDraft,
  };
}
