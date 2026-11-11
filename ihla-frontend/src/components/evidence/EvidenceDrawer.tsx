import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { OriginBadge } from '@/components/ui/Badge';
import { SourceExcerpt } from './SourceExcerpt';
import type { Citation } from '@/types/models';

/**
 * Opened when a citation marker is selected anywhere in the product.
 *
 * It keeps the whole citation set for the answer so the user can page through
 * the evidence without going back to the answer and clicking the next marker —
 * reading the evidence is meant to be a flow, not a lookup.
 */
export function EvidenceDrawer({
  citations,
  activeLabel,
  onClose,
  questionContext,
}: {
  citations: Citation[];
  activeLabel: string | null;
  onClose: () => void;
  questionContext?: string;
}) {
  const index = useMemo(() => {
    if (!activeLabel) return 0;
    const found = citations.findIndex((citation) => citation.label === activeLabel);
    return found >= 0 ? found : 0;
  }, [citations, activeLabel]);

  const [cursor, setCursor] = useState(index);
  useEffect(() => setCursor(index), [index]);

  const open = activeLabel !== null && citations.length > 0;
  const citation = citations[Math.min(cursor, citations.length - 1)];

  if (!open || !citation) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Source ${citation.label}`}
      description={questionContext ? `Supporting: ${questionContext}` : undefined}
      titleAccessory={<OriginBadge origin={citation.origin} compact />}
      size="lg"
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <span className="text-xs tabular-nums text-ink-muted">
            {cursor + 1} of {citations.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={cursor === 0}
              onClick={() => setCursor((value) => Math.max(0, value - 1))}
              leadingIcon={<ChevronLeft className="h-3.5 w-3.5" aria-hidden />}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={cursor >= citations.length - 1}
              onClick={() => setCursor((value) => Math.min(citations.length - 1, value + 1))}
              trailingIcon={<ChevronRight className="h-3.5 w-3.5" aria-hidden />}
            >
              Next
            </Button>
          </div>
        </div>
      }
    >
      <SourceExcerpt citation={citation} />
    </Modal>
  );
}
