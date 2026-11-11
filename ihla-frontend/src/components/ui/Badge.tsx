import type { ReactNode } from 'react';
import { FlaskConical } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { DataOrigin } from '@/types/models';

export type BadgeTone =
  | 'neutral'
  | 'brand'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'demo';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-surface-sunken text-ink-muted border-line',
  brand: 'bg-brand-soft text-brand border-brand-border',
  accent: 'bg-accent-soft text-accent border-accent-border',
  success: 'bg-success-soft text-success border-success-border',
  warning: 'bg-warning-soft text-warning border-warning-border',
  danger: 'bg-danger-soft text-danger border-danger-border',
  demo: 'bg-demo-soft text-demo border-demo-border',
};

export interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
  /** Pills are reserved for status; everything else uses the squarer radius. */
  pill?: boolean;
  title?: string;
}

export function Badge({
  tone = 'neutral',
  children,
  icon,
  className,
  pill = false,
  title,
}: BadgeProps) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1 border px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-[0.04em]',
        pill ? 'rounded-full px-2' : 'rounded-sm',
        TONES[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

/**
 * The demonstration-data marker.
 *
 * Rendered wherever content with `origin: 'demo'` is displayed. This is a
 * product requirement: a reviewer must never be able to mistake sample
 * content for a real retrieval result.
 */
export function OriginBadge({
  origin,
  className,
  compact = false,
}: {
  origin: DataOrigin;
  className?: string;
  compact?: boolean;
}) {
  if (origin !== 'demo') return null;
  return (
    <Badge
      tone="demo"
      className={className}
      icon={<FlaskConical className="h-3 w-3" aria-hidden />}
      title="Demonstration data — not a real medical source."
    >
      {compact ? 'Demo' : 'Demo data'}
    </Badge>
  );
}
