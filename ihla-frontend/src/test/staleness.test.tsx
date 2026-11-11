import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ServiceError } from '@/services/errors';
import type { HealthAssistantService } from '@/services/contracts';
import type { Conversation, StructuredAnswer } from '@/types/models';

/**
 * Regression tests for stale in-flight responses.
 *
 * Two races could put content from one data source into a view labelled as the
 * other, or show an older conversation as if it were the one just clicked:
 *
 *   1. The mode is switched while a question is still being answered.
 *   2. Conversations are switched faster than they load, out of order.
 *
 * Both are guarded in `useConversation`. These tests fail if either guard is
 * removed.
 */

/* ----------------------------- test doubles ----------------------------- */

function makeAnswer(summary: string, origin: 'demo' | 'live'): StructuredAnswer {
  return {
    summary,
    explanation: [],
    keyPoints: [],
    precautions: [],
    nextSteps: [],
    citations: [],
    confidence: 'moderate',
    confidenceNote: null,
    safetyNotices: [],
    readingLevel: 'standard',
    origin,
  };
}

function makeConversation(id: string, text: string): Conversation {
  return {
    id,
    title: text,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messageCount: 1,
    origin: 'demo',
    messages: [
      {
        id: `${id}-m1`,
        role: 'user',
        text,
        answer: null,
        createdAt: new Date().toISOString(),
        status: 'complete',
        error: null,
        origin: 'demo',
      },
    ],
  };
}

/** A deferred promise whose resolution the test controls. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

interface Controllable extends HealthAssistantService {
  /**
   * When true the double ignores its AbortSignal, simulating a response that
   * was already in flight when abort was called — fetch cannot un-send a
   * response that is mid-arrival. This is the residual race the generation
   * guards exist for, and it is the condition these tests must exercise:
   * asserting only that abort was called would pass even with the guards
   * removed.
   */
  ignoreAbort: boolean;
  pendingAsk: ReturnType<typeof deferred<string>> | null;
  /** Resolves a getConversation call by conversation id. */
  releaseConversation: (id: string) => void;
  abortedAsks: number;
  abortedConversationLoads: number;
}

function makeControllableService(mode: 'demo' | 'connected'): Controllable {
  const conversationWaiters = new Map<string, () => void>();

  const service: Controllable = {
    mode,
    ignoreAbort: false,
    pendingAsk: null,
    abortedAsks: 0,
    abortedConversationLoads: 0,

    releaseConversation(id: string) {
      conversationWaiters.get(id)?.();
      conversationWaiters.delete(id);
    },

    checkHealth: () =>
      Promise.resolve({
        status: 'ok',
        version: mode,
        components: {},
        checkedAt: new Date().toISOString(),
      }),

    askQuestion: (_request, signal) => {
      const pending = deferred<string>();
      service.pendingAsk = pending;
      signal?.addEventListener('abort', () => {
        service.abortedAsks += 1;
        if (!service.ignoreAbort) pending.reject(new ServiceError('aborted'));
      });
      return pending.promise.then((summary) => ({
        conversationId: `conv-${mode}`,
        messageId: `msg-${mode}`,
        answer: makeAnswer(summary, mode === 'demo' ? 'demo' : 'live'),
      }));
    },

    listConversations: () =>
      Promise.resolve([
        {
          id: 'conv-a',
          title: 'Conversation A',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messageCount: 1,
          origin: 'demo' as const,
        },
        {
          id: 'conv-b',
          title: 'Conversation B',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messageCount: 1,
          origin: 'demo' as const,
        },
      ]),

    getConversation: (id, signal) => {
      const gate = deferred<void>();
      conversationWaiters.set(id, () => gate.resolve());
      signal?.addEventListener('abort', () => {
        service.abortedConversationLoads += 1;
        if (!service.ignoreAbort) gate.reject(new ServiceError('aborted'));
      });
      return gate.promise.then(() =>
        makeConversation(id, `Body of ${id.toUpperCase()}`),
      );
    },

    deleteConversation: () => Promise.resolve(),
    listDocuments: () => Promise.resolve({ documents: [], total: 0 }),
    getDocument: () => Promise.reject(new ServiceError('http', { status: 404 })),
    uploadDocument: () => Promise.reject(new ServiceError('network')),
    getProcessingStatus: () => Promise.reject(new ServiceError('network')),
    listKnowledgeTopics: () => Promise.resolve([]),
    submitFeedback: () => Promise.resolve(),
  };

  return service;
}

const demoService = makeControllableService('demo');
const connectedService = makeControllableService('connected');

vi.mock('@/services', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services')>();
  return {
    ...actual,
    createService: (mode: 'demo' | 'connected') =>
      mode === 'demo' ? demoService : connectedService,
  };
});

/* -------------------------------- tests -------------------------------- */

describe('Stale response protection', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('ihla.mode', JSON.stringify('demo'));
    demoService.pendingAsk = null;
    connectedService.pendingAsk = null;
    demoService.abortedAsks = 0;
    connectedService.abortedAsks = 0;
    demoService.abortedConversationLoads = 0;
    demoService.ignoreAbort = false;
    connectedService.ignoreAbort = false;
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('discards an answer that resolves after the mode was switched', async () => {
    const { AppProvider, useApp } = await import('@/state/AppProvider');
    const { ToastProvider } = await import('@/components/ui/Toast');
    const { AssistantPage } = await import('@/pages/AssistantPage');

    let switchMode: (mode: 'demo' | 'connected') => void = () => {};
    function ModeHandle() {
      switchMode = useApp().setMode;
      return null;
    }

    // The request completes despite being aborted — the guard must catch it.
    demoService.ignoreAbort = true;

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AppProvider>
          <ToastProvider>
            <ModeHandle />
            <AssistantPage />
          </ToastProvider>
        </AppProvider>
      </MemoryRouter>,
    );

    const input = await screen.findByLabelText(/ask a health question/i);
    await user.type(input, 'What is HbA1c?');
    await user.click(screen.getByRole('button', { name: /^ask$/i }));

    await waitFor(() => expect(demoService.pendingAsk).not.toBeNull());
    const inFlight = demoService.pendingAsk!;

    // Switch to Connected Mode while the demo answer is still outstanding.
    await act(async () => {
      switchMode('connected');
    });

    // The late demo answer now resolves.
    await act(async () => {
      inFlight.resolve('STALE DEMO ANSWER THAT MUST NOT APPEAR');
      await Promise.resolve();
    });

    // It must not be rendered anywhere, in any form.
    await waitFor(() => {
      expect(
        screen.queryByText(/stale demo answer that must not appear/i),
      ).not.toBeInTheDocument();
    });
    expect(screen.queryByLabelText(/assistant answer/i)).toBeNull();

    // The in-flight request was actively cancelled, not merely ignored.
    expect(demoService.abortedAsks).toBeGreaterThan(0);
  });

  it('aborts an outstanding question when the mode is switched', async () => {
    const { AppProvider, useApp } = await import('@/state/AppProvider');
    const { ToastProvider } = await import('@/components/ui/Toast');
    const { AssistantPage } = await import('@/pages/AssistantPage');

    let switchMode: (mode: 'demo' | 'connected') => void = () => {};
    function ModeHandle() {
      switchMode = useApp().setMode;
      return null;
    }

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AppProvider>
          <ToastProvider>
            <ModeHandle />
            <AssistantPage />
          </ToastProvider>
        </AppProvider>
      </MemoryRouter>,
    );

    const input = await screen.findByLabelText(/ask a health question/i);
    await user.type(input, 'What is HbA1c?');
    await user.click(screen.getByRole('button', { name: /^ask$/i }));
    await waitFor(() => expect(demoService.pendingAsk).not.toBeNull());

    await act(async () => {
      switchMode('connected');
    });

    // Cancelled at the transport, and the thread is cleared so nothing from
    // the previous service remains on screen.
    expect(demoService.abortedAsks).toBeGreaterThan(0);
    await waitFor(() => expect(screen.queryByText('What is HbA1c?')).not.toBeInTheDocument());
  });

  it('does not adopt a conversation id from an answer that resolved after a mode switch', async () => {
    const { AppProvider, useApp } = await import('@/state/AppProvider');
    const { useConversation } = await import('@/state/useConversation');

    // The demo request completes despite abort, so only the generation guard
    // can stop its conversation id being adopted under the new mode. Without
    // that guard the next live question would be threaded onto a demo
    // conversation id and sent to the real backend.
    demoService.ignoreAbort = true;

    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter>
        <AppProvider>{children}</AppProvider>
      </MemoryRouter>
    );

    const { result } = renderHook(
      () => ({ app: useApp(), conversation: useConversation() }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.app.mode).toBe('demo'));

    act(() => {
      void result.current.conversation.ask('What is HbA1c?');
    });
    await waitFor(() => expect(demoService.pendingAsk).not.toBeNull());
    const inFlight = demoService.pendingAsk!;

    await act(async () => {
      result.current.app.setMode('connected');
    });

    await act(async () => {
      inFlight.resolve('STALE');
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.app.mode).toBe('connected');
    expect(result.current.conversation.conversationId).toBeNull();
    expect(result.current.conversation.messages).toHaveLength(0);
  });

  it('ignores an out-of-order conversation load (rapid switching)', async () => {
    const { AppProvider } = await import('@/state/AppProvider');
    const { useConversation } = await import('@/state/useConversation');

    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter>
        <AppProvider>{children}</AppProvider>
      </MemoryRouter>
    );

    // Both loads run to completion regardless of abort, so only the sequence
    // guard can prevent A from overwriting B.
    demoService.ignoreAbort = true;

    const { result } = renderHook(() => useConversation(), { wrapper });
    await waitFor(() => expect(result.current.conversations).toHaveLength(2));

    // Click A, then immediately click B before A has loaded.
    await act(async () => {
      result.current.select('conv-a');
    });
    await act(async () => {
      result.current.select('conv-b');
    });

    expect(result.current.conversationId).toBe('conv-b');
    // Selecting B aborted the outstanding load for A.
    expect(demoService.abortedConversationLoads).toBeGreaterThan(0);

    // B resolves first and is shown.
    await act(async () => {
      demoService.releaseConversation('conv-b');
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.messages).toHaveLength(1));
    expect(result.current.messages[0].text).toBe('Body of CONV-B');

    // A's slow response arrives afterwards and must be discarded.
    await act(async () => {
      demoService.releaseConversation('conv-a');
      await Promise.resolve();
    });

    expect(result.current.conversationId).toBe('conv-b');
    expect(result.current.messages[0].text).toBe('Body of CONV-B');
    expect(result.current.threadError).toBeNull();
  });
});
