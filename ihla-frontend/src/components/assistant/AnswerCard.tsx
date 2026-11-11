import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertOctagon,
  ArrowUpRight,
  Check,
  ClipboardCopy,
  ListChecks,
  Star,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { appConfig } from '@/config/env';
import { answerToPlainText, copyText } from '@/lib/clipboard';
import { tokenizeCitations } from '@/lib/format';
import { Badge, OriginBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { useToast } from '@/components/ui/Toast';
import { ConfidenceIndicator } from './ConfidenceIndicator';
import { SafetyNotices } from './SafetyNotices';
import type { Citation, FeedbackRating, StructuredAnswer } from '@/types/models';

export interface AnswerCardProps {
  answer: StructuredAnswer;
  question: string;
  /** Null when the message has not been persisted (should not normally happen). */
  messageId: string | null;
  onCitationSelect: (label: string) => void;
  onFeedback?: (rating: FeedbackRating) => void;
  feedbackState?: FeedbackRating | null;
  feedbackPending?: boolean;
  onSave?: () => void;
  saved?: boolean;
}

/**
 * The answer surface.
 *
 * Structure is the point: a reader should be able to take the summary alone,
 * or read the explanation, or jump straight to precautions — without having to
 * parse a wall of generated prose. Each section is only rendered when the
 * generator actually produced content for it.
 */
export function AnswerCard({
  answer,
  question,
  messageId,
  onCitationSelect,
  onFeedback,
  feedbackState,
  feedbackPending,
  onSave,
  saved,
}: AnswerCardProps) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const isEmergency = answer.safetyNotices.some((notice) => notice.level === 'emergency');
  const hasEvidence = answer.citations.length > 0;

  const handleCopy = async () => {
    const ok = await copyText(answerToPlainText(answer, question, appConfig.appName));
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2_000);
      toast.push({
        tone: 'success',
        title: 'Answer copied',
        description: 'Sources and the information disclaimer were included.',
      });
    } else {
      // Never claim success for something that did not happen.
      toast.push({
        tone: 'error',
        title: 'Could not copy',
        description:
          'The browser blocked clipboard access. Select the text manually to copy it.',
      });
    }
  };

  return (
    <Panel
      as="article"
      className={cn(
        'animate-rise-in overflow-hidden',
        isEmergency && 'border-danger-border',
      )}
      aria-label="Assistant answer"
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-sunken px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="eyebrow">Answer</span>
          <ConfidenceIndicator
            compact
            confidence={answer.confidence}
            citationCount={answer.citations.length}
          />
          <OriginBadge origin={answer.origin} compact />
        </div>

        <div className="flex items-center gap-1">
          {onSave && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSave}
              leadingIcon={
                <Star className={cn('h-3.5 w-3.5', saved && 'fill-warning text-warning')} aria-hidden />
              }
            >
              {saved ? 'Saved' : 'Save'}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void handleCopy()}
            leadingIcon={
              copied ? (
                <Check className="h-3.5 w-3.5 text-success" aria-hidden />
              ) : (
                <ClipboardCopy className="h-3.5 w-3.5" aria-hidden />
              )
            }
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
      </header>

      <div className="space-y-5 px-4 py-4 sm:px-5">
        <SafetyNotices notices={answer.safetyNotices.filter((n) => n.level === 'emergency')} />

        {/* Summary — the answer in one or two sentences. */}
        {answer.summary && (
          <p className="border-l-2 border-brand pl-3 text-md font-medium leading-relaxed text-ink">
            <CitedText text={answer.summary} citations={answer.citations} onSelect={onCitationSelect} />
          </p>
        )}

        {answer.explanation.length > 0 && (
          <div className="max-w-prose space-y-3">
            {answer.explanation.map((paragraph, index) => (
              <p key={index} className="text-sm leading-relaxed text-ink-muted">
                <CitedText
                  text={paragraph}
                  citations={answer.citations}
                  onSelect={onCitationSelect}
                />
              </p>
            ))}
          </div>
        )}

        {answer.keyPoints.length > 0 && (
          <section className="space-y-2">
            <h3 className="eyebrow flex items-center gap-1.5">
              <ListChecks className="h-3 w-3" aria-hidden />
              Key points
            </h3>
            <ul className="space-y-1.5">
              {answer.keyPoints.map((point, index) => (
                <li key={index} className="flex gap-2.5 text-sm leading-relaxed text-ink">
                  <span
                    className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-accent"
                    aria-hidden
                  />
                  <span>
                    <CitedText
                      text={point}
                      citations={answer.citations}
                      onSelect={onCitationSelect}
                    />
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {answer.precautions.length > 0 && (
          <section className="rounded-lg border border-warning-border bg-warning-soft p-3">
            <h3 className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-[0.06em] text-warning">
              <AlertOctagon className="h-3 w-3" aria-hidden />
              Important precautions
            </h3>
            <ul className="mt-1.5 space-y-1.5">
              {answer.precautions.map((point, index) => (
                <li key={index} className="flex gap-2 text-xs leading-relaxed text-ink">
                  <span className="mt-[0.4rem] h-1 w-1 shrink-0 rounded-full bg-warning" aria-hidden />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {answer.nextSteps.length > 0 && (
          <section className="space-y-2">
            <h3 className="eyebrow">Suggested next steps</h3>
            <ol className="space-y-1.5">
              {answer.nextSteps.map((step, index) => (
                <li key={index} className="flex gap-2.5 text-sm leading-relaxed text-ink">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm bg-brand-soft text-2xs font-semibold tabular-nums text-brand">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        <ConfidenceIndicator
          confidence={answer.confidence}
          citationCount={answer.citations.length}
          note={answer.confidenceNote}
        />

        <SafetyNotices notices={answer.safetyNotices.filter((n) => n.level !== 'emergency')} />

        {/* Evidence strip */}
        <section className="space-y-2 border-t border-line pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="eyebrow">
              {hasEvidence ? `Sources (${answer.citations.length})` : 'Sources'}
            </h3>
            {hasEvidence && (
              <Link
                to="/evidence"
                className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:text-brand-hover"
              >
                Open in Evidence explorer
                <ArrowUpRight className="h-3 w-3" aria-hidden />
              </Link>
            )}
          </div>

          {hasEvidence ? (
            <ul className="flex flex-wrap gap-1.5">
              {answer.citations.map((citation) => (
                <li key={citation.id}>
                  <button
                    type="button"
                    onClick={() => onCitationSelect(citation.label)}
                    title={`${citation.documentTitle}${
                      citation.section ? ` — ${citation.section}` : ''
                    }`}
                    className="group flex max-w-full items-center gap-1.5 rounded-md border border-line bg-surface px-2 py-1 text-left transition-colors hover:border-accent-border hover:bg-accent-soft"
                  >
                    <Badge tone="accent">{citation.label}</Badge>
                    {/*
                      Several passages often come from the same document, so
                      showing the title on every chip made S1/S2/S3 look
                      identical. The section distinguishes them; the full
                      document title is on the tooltip and in the drawer.
                    */}
                    <span className="truncate text-xs text-ink-muted group-hover:text-ink">
                      {citation.section ?? citation.documentTitle}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-md border border-dashed border-line-strong bg-surface-sunken p-3 text-xs leading-relaxed text-ink-muted">
              No passage from the knowledge base supports an answer to this question, so none
              has been generated. Nothing above was produced from outside the indexed sources.
            </p>
          )}
        </section>

        {/* Feedback */}
        {onFeedback && messageId && (
          <footer className="flex flex-wrap items-center gap-3 border-t border-line pt-3">
            <span className="text-xs text-ink-muted">Was this useful?</span>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant={feedbackState === 'helpful' ? 'accent' : 'secondary'}
                onClick={() => onFeedback('helpful')}
                disabled={feedbackPending || feedbackState !== null}
                leadingIcon={<ThumbsUp className="h-3.5 w-3.5" aria-hidden />}
                aria-pressed={feedbackState === 'helpful'}
              >
                Yes
              </Button>
              <Button
                size="sm"
                variant={feedbackState === 'not_helpful' ? 'accent' : 'secondary'}
                onClick={() => onFeedback('not_helpful')}
                disabled={feedbackPending || feedbackState !== null}
                leadingIcon={<ThumbsDown className="h-3.5 w-3.5" aria-hidden />}
                aria-pressed={feedbackState === 'not_helpful'}
              >
                No
              </Button>
            </div>
            {feedbackState && (
              <span className="text-xs text-ink-subtle">Thanks — feedback recorded.</span>
            )}
          </footer>
        )}
      </div>
    </Panel>
  );
}

/**
 * Renders answer text, turning inline `[S1]` markers into interactive chips.
 * A marker with no matching citation is rendered as plain text rather than a
 * dead link.
 */
function CitedText({
  text,
  citations,
  onSelect,
}: {
  text: string;
  citations: Citation[];
  onSelect: (label: string) => void;
}) {
  const parts = tokenizeCitations(text);
  if (parts.length === 1 && parts[0].type === 'text') return <>{text}</>;

  return (
    <>
      {parts.map((part, index) => {
        if (part.type === 'text') return <span key={index}>{part.value}</span>;
        const exists = citations.some((citation) => citation.label === part.label);
        if (!exists) return <span key={index}>[{part.label}]</span>;
        return (
          <button
            key={index}
            type="button"
            onClick={() => onSelect(part.label)}
            title={`View source ${part.label}`}
            className="mx-0.5 inline-flex items-center rounded-sm border border-accent-border bg-accent-soft px-1 align-baseline text-2xs font-semibold text-accent transition-colors hover:bg-accent hover:text-white"
          >
            {part.label}
          </button>
        );
      })}
    </>
  );
}
