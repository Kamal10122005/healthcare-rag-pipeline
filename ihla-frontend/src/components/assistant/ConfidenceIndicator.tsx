import { cn } from '@/lib/cn';
import { CONFIDENCE_DESCRIPTIONS, CONFIDENCE_LABELS } from '@/lib/format';
import type { EvidenceConfidence } from '@/types/models';

const LEVELS: Record<EvidenceConfidence, { filled: number; tone: string; text: string }> = {
  high: { filled: 3, tone: 'bg-success', text: 'text-success' },
  moderate: { filled: 2, tone: 'bg-accent', text: 'text-accent' },
  low: { filled: 1, tone: 'bg-warning', text: 'text-warning' },
  insufficient: { filled: 0, tone: 'bg-line-strong', text: 'text-ink-muted' },
};

/**
 * Evidence support indicator.
 *
 * Deliberately NOT a percentage. A number implies a precision the retrieval
 * score does not have, and users read "87% confident" as "87% likely to be
 * correct". Three discrete bars plus a plain-language label communicate the
 * same thing without inviting that misreading.
 */
export function ConfidenceIndicator({
  confidence,
  citationCount,
  note,
  className,
  compact = false,
}: {
  confidence: EvidenceConfidence;
  citationCount: number;
  note?: string | null;
  className?: string;
  compact?: boolean;
}) {
  const level = LEVELS[confidence];

  if (compact) {
    return (
      <span
        className={cn('inline-flex items-center gap-1.5', className)}
        title={CONFIDENCE_DESCRIPTIONS[confidence]}
      >
        <Bars filled={level.filled} tone={level.tone} />
        <span className={cn('text-2xs font-semibold uppercase tracking-[0.04em]', level.text)}>
          {CONFIDENCE_LABELS[confidence]}
        </span>
      </span>
    );
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-line bg-surface-sunken px-3 py-2.5',
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <Bars filled={level.filled} tone={level.tone} />
          <span className={cn('text-xs font-semibold', level.text)}>
            {CONFIDENCE_LABELS[confidence]}
          </span>
        </span>
        <span className="text-2xs font-medium uppercase tracking-[0.04em] text-ink-subtle">
          {citationCount === 0
            ? 'No passages retrieved'
            : `${citationCount} supporting ${citationCount === 1 ? 'passage' : 'passages'}`}
        </span>
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
        {note ?? CONFIDENCE_DESCRIPTIONS[confidence]}
      </p>
    </div>
  );
}

function Bars({ filled, tone }: { filled: number; tone: string }) {
  return (
    <span className="flex items-end gap-0.5" aria-hidden>
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className={cn(
            'w-1 rounded-sm transition-colors',
            index === 0 ? 'h-2' : index === 1 ? 'h-3' : 'h-4',
            index < filled ? tone : 'bg-line-strong/60',
          )}
        />
      ))}
    </span>
  );
}
