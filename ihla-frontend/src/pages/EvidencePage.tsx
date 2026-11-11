import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileSearch, Layers } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Panel, SectionHeader } from '@/components/ui/Panel';
import { Badge, OriginBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/States';
import { SourceExcerpt } from '@/components/evidence/SourceExcerpt';
import { ConfidenceIndicator } from '@/components/assistant/ConfidenceIndicator';
import { useLatestAnswer } from '@/state/latestAnswer';
import { RELEVANCE_BAND_LABELS, relevanceBand, formatDateTime } from '@/lib/format';

/**
 * Evidence & sources explorer.
 *
 * Left: the claims the answer made. Right: the passage behind the selected
 * citation. The point of the screen is to make the link between a generated
 * statement and its source inspectable rather than implied.
 */
export function EvidencePage() {
  const latest = useLatestAnswer();
  const [selected, setSelected] = useState<string | null>(null);

  const citations = latest?.answer.citations ?? [];

  useEffect(() => {
    setSelected(citations[0]?.id ?? null);
  }, [latest?.messageId]); // eslint-disable-line react-hooks/exhaustive-deps

  const active = useMemo(
    () => citations.find((citation) => citation.id === selected) ?? citations[0] ?? null,
    [citations, selected],
  );

  if (!latest) {
    return (
      <div className="mx-auto w-full max-w-content px-4 py-10 sm:px-6">
        <Panel>
          <EmptyState
            icon={<FileSearch className="h-5 w-5" aria-hidden />}
            title="No answer selected yet"
            description="Ask a question in the Assistant, then open any citation to inspect the passage it came from. The evidence for the most recent answer appears here."
            action={
              <Link
                to="/assistant"
                className="inline-flex h-9 items-center rounded-md bg-brand px-3.5 text-sm font-medium text-brand-contrast transition-colors hover:bg-brand-hover"
              >
                Go to the Assistant
              </Link>
            }
          />
        </Panel>
      </div>
    );
  }

  const claims = [
    { kind: 'Summary', items: [latest.answer.summary] },
    { kind: 'Key points', items: latest.answer.keyPoints },
    { kind: 'Precautions', items: latest.answer.precautions },
  ].filter((group) => group.items.filter(Boolean).length > 0);

  return (
    <div className="mx-auto w-full max-w-content space-y-5 px-4 py-5 sm:px-6">
      <Panel padded>
        <SectionHeader
          eyebrow="Answer under review"
          title={latest.question || 'Most recent answer'}
          description={`Answered ${formatDateTime(latest.answeredAt)} · ${citations.length} retrieved ${
            citations.length === 1 ? 'passage' : 'passages'
          }`}
          actions={<OriginBadge origin={latest.answer.origin} />}
        />
        <ConfidenceIndicator
          className="mt-3"
          confidence={latest.answer.confidence}
          citationCount={citations.length}
          note={latest.answer.confidenceNote}
        />
      </Panel>

      {citations.length === 0 ? (
        <Panel>
          <EmptyState
            icon={<Layers className="h-5 w-5" aria-hidden />}
            title="This answer has no supporting passages"
            description="Nothing was retrieved above the relevance threshold, so the assistant did not generate a cited answer. There is no evidence to inspect."
          />
        </Panel>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <div className="space-y-5">
            <Panel padded>
              <SectionHeader level={3} eyebrow="Claims" title="What the answer stated" />
              <div className="mt-3 space-y-3">
                {claims.map((group) => (
                  <div key={group.kind} className="space-y-1.5">
                    <p className="eyebrow">{group.kind}</p>
                    <ul className="space-y-1.5">
                      {group.items.filter(Boolean).map((item, index) => (
                        <li
                          key={index}
                          className="rounded-md border border-line bg-surface-sunken px-2.5 py-2 text-xs leading-relaxed text-ink"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel padded>
              <SectionHeader
                level={3}
                eyebrow="Retrieved passages"
                title="Select a source to inspect"
              />
              <ul className="mt-3 space-y-1.5">
                {citations.map((citation) => {
                  const isActive = active?.id === citation.id;
                  const band = relevanceBand(citation.relevance);
                  return (
                    <li key={citation.id}>
                      <button
                        type="button"
                        onClick={() => setSelected(citation.id)}
                        aria-current={isActive ? 'true' : undefined}
                        className={cn(
                          'w-full rounded-md border px-2.5 py-2 text-left transition-colors',
                          isActive
                            ? 'border-accent-border bg-accent-soft'
                            : 'border-line hover:border-line-strong hover:bg-surface-sunken',
                        )}
                      >
                        <span className="flex items-center gap-1.5">
                          <Badge tone={isActive ? 'accent' : 'neutral'}>{citation.label}</Badge>
                          <span className="truncate text-xs font-medium text-ink">
                            {citation.documentTitle}
                          </span>
                        </span>
                        <span className="mt-1 block truncate text-2xs text-ink-muted">
                          {citation.section ?? 'Section not stated'} ·{' '}
                          {RELEVANCE_BAND_LABELS[band]}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          </div>

          <Panel padded className="h-fit lg:sticky lg:top-0">
            {active && <SourceExcerpt citation={active} />}
          </Panel>
        </div>
      )}
    </div>
  );
}
