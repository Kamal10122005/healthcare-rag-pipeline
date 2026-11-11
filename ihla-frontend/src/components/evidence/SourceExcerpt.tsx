import { FileText, Quote } from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  RELEVANCE_BAND_LABELS,
  SOURCE_TYPE_LABELS,
  formatDate,
  relevanceBand,
  splitOnHighlight,
} from '@/lib/format';
import { Badge, OriginBadge } from '@/components/ui/Badge';
import type { Citation } from '@/types/models';

/**
 * A retrieved passage, shown with the sentence that most directly supports the
 * claim highlighted. The highlight is rendered by splitting the string — never
 * by injecting HTML — so source text cannot smuggle markup into the page.
 */
export function SourceExcerpt({
  citation,
  showMeta = true,
  className,
}: {
  citation: Citation;
  showMeta?: boolean;
  className?: string;
}) {
  const { before, match, after } = splitOnHighlight(citation.excerpt, citation.highlight);
  const band = relevanceBand(citation.relevance);

  return (
    <div className={cn('space-y-3', className)}>
      {showMeta && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="brand">{citation.label}</Badge>
            <Badge tone="neutral">{SOURCE_TYPE_LABELS[citation.sourceType]}</Badge>
            <Badge
              tone={band === 'strong' ? 'success' : band === 'moderate' ? 'accent' : 'warning'}
              title={`Retrieval score: ${citation.relevance.toFixed(2)}`}
            >
              {RELEVANCE_BAND_LABELS[band]}
            </Badge>
            <OriginBadge origin={citation.origin} compact />
          </div>

          <div className="space-y-0.5">
            <p className="flex items-start gap-1.5 text-sm font-medium leading-snug text-ink">
              <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-subtle" aria-hidden />
              {citation.documentTitle}
            </p>
            <p className="pl-5 text-xs text-ink-muted">
              {citation.publisher} · {formatDate(citation.publishedOn)}
              {citation.section ? ` · ${citation.section}` : ''}
              {citation.page !== null ? ` · p. ${citation.page}` : ''}
            </p>
          </div>
        </div>
      )}

      <blockquote className="relative rounded-md border border-line bg-surface-sunken p-3 pl-9">
        <Quote
          className="absolute left-3 top-3 h-3.5 w-3.5 text-ink-subtle/70"
          aria-hidden
        />
        <p className="text-sm leading-relaxed text-ink">
          {before}
          {match && <mark className="evidence-mark">{match}</mark>}
          {after}
        </p>
      </blockquote>

      {citation.origin === 'demo' && (
        <p className="text-2xs leading-relaxed text-demo">
          Demonstration passage. This publisher and excerpt are fictional examples written for
          the demo — do not cite them.
        </p>
      )}

      {citation.url && (
        <a
          href={citation.url}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-block text-xs font-medium text-brand underline underline-offset-2 hover:text-brand-hover"
        >
          Open source document
        </a>
      )}
    </div>
  );
}
