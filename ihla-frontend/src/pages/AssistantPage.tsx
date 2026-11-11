import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { History, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { OriginBadge } from '@/components/ui/Badge';
import { ErrorState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { Composer, ThinkingCard } from '@/components/assistant/Composer';
import { ConversationRail } from '@/components/assistant/ConversationRail';
import { AnswerCard } from '@/components/assistant/AnswerCard';
import { EvidenceDrawer } from '@/components/evidence/EvidenceDrawer';
import { useApp } from '@/state/AppProvider';
import { useConversation } from '@/state/useConversation';
import { useServiceQuery } from '@/state/useServiceQuery';
import { setLatestAnswer } from '@/state/latestAnswer';
import { listSavedAnswers, saveAnswer } from '@/lib/savedAnswers';
import { formatDateTime } from '@/lib/format';
import type { Citation, FeedbackRating } from '@/types/models';

export function AssistantPage() {
  const { service, mode } = useApp();
  const toast = useToast();
  const controller = useConversation();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [activeCitation, setActiveCitation] = useState<{
    label: string;
    citations: Citation[];
    question: string;
  } | null>(null);
  const [feedback, setFeedback] = useState<Record<string, FeedbackRating>>({});
  const [feedbackPending, setFeedbackPending] = useState<string | null>(null);
  // Seeded from storage so an already-saved answer does not offer "Save" again.
  const [savedIds, setSavedIds] = useState<string[]>(() =>
    listSavedAnswers().map((item) => item.id),
  );

  const bottomRef = useRef<HTMLDivElement>(null);
  const { messages, asking } = controller;

  // A starter question handed over from the Knowledge workspace.
  const location = useLocation();
  const navigate = useNavigate();
  const handoff = (location.state as { question?: string } | null)?.question;
  const handoffRef = useRef<string | null>(null);
  useEffect(() => {
    if (!handoff || handoffRef.current === handoff) return;
    handoffRef.current = handoff;
    navigate('.', { replace: true, state: null });
    void controller.ask(handoff);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handoff]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, asking]);

  // Starter questions come from the knowledge base, not a hardcoded UI list.
  const topics = useServiceQuery((signal) => service.listKnowledgeTopics(signal), [service]);
  const suggestions = useMemo(
    () => (topics.data ?? []).flatMap((topic) => topic.questions).slice(0, 5),
    [topics.data],
  );

  const questionFor = useCallback(
    (index: number): string => {
      for (let i = index - 1; i >= 0; i -= 1) {
        if (messages[i].role === 'user' && messages[i].text) return messages[i].text as string;
      }
      return '';
    },
    [messages],
  );

  const handleFeedback = async (messageId: string, rating: FeedbackRating) => {
    // Feedback is keyed on the conversation server-side. Without an id the
    // submission could not be attributed, so it is not sent and not claimed.
    if (!controller.conversationId) {
      toast.push({
        tone: 'error',
        title: 'Feedback not sent',
        description: 'This answer has no saved conversation to attach feedback to.',
      });
      return;
    }

    setFeedbackPending(messageId);
    try {
      await service.submitFeedback({
        conversationId: controller.conversationId,
        messageId,
        rating,
        reasons: [],
        comment: null,
      });
      setFeedback((current) => ({ ...current, [messageId]: rating }));
      toast.push({ tone: 'success', title: 'Feedback recorded' });
    } catch {
      toast.push({
        tone: 'error',
        title: 'Feedback not sent',
        description: 'The request failed, so nothing was recorded. Try again in a moment.',
      });
    } finally {
      setFeedbackPending(null);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await controller.remove(id);
    toast.push(
      ok
        ? { tone: 'success', title: 'Conversation deleted' }
        : { tone: 'error', title: 'Could not delete conversation' },
    );
  };

  const threadIsEmpty = messages.length === 0 && !controller.threadLoading;

  return (
    <div className="mx-auto flex h-full w-full max-w-content gap-6 px-4 py-4 sm:px-6 sm:py-5">
      {/* History rail */}
      <aside className="hidden w-64 shrink-0 xl:block">
        <ConversationRail controller={controller} onDelete={handleDelete} />
      </aside>

      {historyOpen && (
        <div className="fixed inset-0 z-40 xl:hidden">
          <div
            className="absolute inset-0 bg-surface-inverse/40"
            onClick={() => setHistoryOpen(false)}
            aria-hidden
          />
          <div className="absolute right-0 top-0 flex h-full w-80 max-w-[88vw] animate-slide-in-right flex-col gap-3 border-l border-line bg-surface p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Conversations</p>
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                aria-label="Close history"
                onClick={() => setHistoryOpen(false)}
              >
                <X className="h-4 w-4" aria-hidden />
              </Button>
            </div>
            <ConversationRail controller={controller} onDelete={handleDelete} />
          </div>
        </div>
      )}

      {/* Thread */}
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-end pb-2 xl:hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setHistoryOpen(true)}
            leadingIcon={<History className="h-3.5 w-3.5" aria-hidden />}
          >
            History
          </Button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-4 pr-0.5">
          {controller.threadError && (
            <ErrorState
              error={controller.threadError}
              title="Could not open that conversation"
              onRetry={controller.startNew}
            />
          )}

          {threadIsEmpty && !controller.threadError && (
            <WelcomePanel
              suggestions={suggestions}
              loading={topics.loading}
              onPick={(question) => void controller.ask(question)}
              demo={mode === 'demo'}
            />
          )}

          {messages.map((message, index) => {
            if (message.role === 'user') {
              return (
                <div key={message.id} className="flex justify-end">
                  <div className="max-w-[min(42rem,85%)] rounded-lg rounded-br-sm border border-brand-border bg-brand-soft px-3.5 py-2.5">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
                      {message.text}
                    </p>
                    <p className="mt-1 text-2xs text-ink-subtle">
                      {formatDateTime(message.createdAt)}
                    </p>
                  </div>
                </div>
              );
            }

            if (message.status === 'pending') return <ThinkingCard key={message.id} />;

            if (message.status === 'error' && message.error) {
              return (
                <ErrorState
                  key={message.id}
                  error={message.error}
                  onRetry={controller.retryLast}
                  retrying={controller.asking}
                  title="The question was not answered"
                >
                  <p className="text-xs leading-relaxed text-ink">
                    Your question has been put back in the box below so nothing is lost. No
                    sample or cached content has been shown in place of a real answer.
                  </p>
                </ErrorState>
              );
            }

            if (!message.answer) return null;
            const question = questionFor(index);

            return (
              <AnswerCard
                key={message.id}
                answer={message.answer}
                question={question}
                messageId={message.id}
                feedbackState={feedback[message.id] ?? null}
                feedbackPending={feedbackPending === message.id}
                saved={savedIds.includes(message.id)}
                onSave={() => {
                  saveAnswer({
                    id: message.id,
                    question,
                    answer: message.answer!,
                    savedAt: new Date().toISOString(),
                  });
                  setSavedIds((current) => [...current, message.id]);
                  toast.push({
                    tone: 'success',
                    title: 'Saved',
                    description: 'Find it in the Knowledge workspace. Stored in this browser only.',
                  });
                }}
                onFeedback={(rating) => void handleFeedback(message.id, rating)}
                onCitationSelect={(label) => {
                  setActiveCitation({
                    label,
                    citations: message.answer!.citations,
                    question,
                  });
                  setLatestAnswer({
                    question,
                    answer: message.answer!,
                    messageId: message.id,
                    answeredAt: message.createdAt,
                  });
                }}
              />
            );
          })}

          <div ref={bottomRef} />
        </div>

        <div className="shrink-0 pt-1">
          <Composer
            onSubmit={(question) => {
              void controller.ask(question);
            }}
            busy={controller.asking}
            restoredDraft={controller.restoredDraft}
            onDraftConsumed={controller.consumeRestoredDraft}
          />
          <p className="px-1 pt-2 text-2xs leading-relaxed text-ink-subtle">
            Answers come only from the indexed documents and always show their sources. This is
            health information, not medical advice, and not a diagnosis.
          </p>
        </div>
      </section>

      <EvidenceDrawer
        citations={activeCitation?.citations ?? []}
        activeLabel={activeCitation?.label ?? null}
        questionContext={activeCitation?.question}
        onClose={() => setActiveCitation(null)}
      />
    </div>
  );
}

function WelcomePanel({
  suggestions,
  loading,
  onPick,
  demo,
}: {
  suggestions: string[];
  loading: boolean;
  onPick: (question: string) => void;
  demo: boolean;
}) {
  return (
    <div className="surface-grid relative flex min-h-[18rem] flex-col items-center justify-center rounded-xl px-4 py-10 text-center">
      <div className="max-w-xl space-y-3">
        <p className="eyebrow inline-flex items-center gap-1.5">
          <Sparkles className="h-3 w-3" aria-hidden />
          Evidence-grounded answers
        </p>
        <h2 className="text-2xl font-semibold tracking-tight">
          Ask a health question, see where the answer came from
        </h2>
        <p className="mx-auto max-w-prose text-sm leading-relaxed text-ink-muted">
          Every answer is assembled from the documents in the library and shows the exact
          passages it rests on. When the sources do not cover a question, the assistant says so
          instead of guessing.
        </p>
        {demo && (
          <div className="flex justify-center pt-1">
            <OriginBadge origin="demo" />
          </div>
        )}
      </div>

      <Panel padded className="mt-7 w-full max-w-2xl text-left">
        <p className="eyebrow">Start with one of these</p>
        <ul className="mt-2.5 grid gap-1.5">
          {loading &&
            Array.from({ length: 4 }).map((_, index) => (
              <li key={index} className="skeleton h-8 w-full" />
            ))}
          {!loading &&
            suggestions.map((question) => (
              <li key={question}>
                <button
                  type="button"
                  onClick={() => onPick(question)}
                  className="w-full rounded-md border border-transparent px-2.5 py-2 text-left text-sm text-ink transition-colors hover:border-line hover:bg-surface-sunken"
                >
                  {question}
                </button>
              </li>
            ))}
          {!loading && suggestions.length === 0 && (
            <li className="px-2.5 py-2 text-sm text-ink-muted">
              No starter questions were returned by the knowledge service.
            </li>
          )}
        </ul>
      </Panel>
    </div>
  );
}
