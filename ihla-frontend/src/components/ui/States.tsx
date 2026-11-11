import type { ReactNode } from 'react';
import { AlertTriangle, PlugZap, RefreshCw, ServerCrash } from 'lucide-react';
import { cn } from '@/lib/cn';
import { errorHeadline } from '@/services/errors';
import type { ServiceErrorInfo } from '@/types/models';
import { Button } from './Button';
import { Panel } from './Panel';

/* ------------------------------ loading ------------------------------ */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton h-4 w-full', className)} aria-hidden />;
}

export function SkeletonLines({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={index === lines - 1 ? 'w-2/3' : index % 2 === 0 ? 'w-full' : 'w-11/12'}
        />
      ))}
    </div>
  );
}

export function LoadingPanel({
  label,
  lines = 4,
  className,
}: {
  label: string;
  lines?: number;
  className?: string;
}) {
  return (
    <Panel padded className={cn('space-y-3', className)} aria-busy="true">
      <span className="sr-only" role="status">
        {label}
      </span>
      <Skeleton className="h-3 w-24" />
      <SkeletonLines lines={lines} />
    </Panel>
  );
}

/* ------------------------------- empty ------------------------------- */

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact = false,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'gap-2 px-4 py-8' : 'gap-3 px-6 py-14',
        className,
      )}
    >
      {icon && (
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-surface-sunken text-ink-subtle">
          {icon}
        </div>
      )}
      <div className="space-y-1">
        <p className="text-sm font-semibold text-ink">{title}</p>
        {description && (
          <p className="mx-auto max-w-sm text-xs leading-relaxed text-ink-muted">
            {description}
          </p>
        )}
      </div>
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}

/* ------------------------------- error ------------------------------- */

/**
 * The connection/failure state.
 *
 * It intentionally offers a retry and shows developer detail, and it never
 * renders alternative content in place of the thing that failed — see the
 * safety rule in `src/services/index.ts`.
 */
export function ErrorState({
  error,
  onRetry,
  retrying = false,
  title,
  className,
  compact = false,
  children,
}: {
  error: ServiceErrorInfo;
  onRetry?: () => void;
  retrying?: boolean;
  title?: string;
  className?: string;
  compact?: boolean;
  children?: ReactNode;
}) {
  const Icon =
    error.kind === 'network' || error.kind === 'timeout'
      ? PlugZap
      : error.kind === 'not_configured'
        ? AlertTriangle
        : ServerCrash;

  return (
    <div
      role="alert"
      className={cn(
        'rounded-lg border border-danger-border bg-danger-soft',
        compact ? 'p-3' : 'p-4 sm:p-5',
        className,
      )}
    >
      <div className="flex gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-danger">
              {title ?? errorHeadline(error)}
            </p>
            <p className="text-xs leading-relaxed text-ink">{error.message}</p>
          </div>

          {(error.detail || error.endpoint) && (
            <details className="group">
              <summary className="cursor-pointer list-none text-2xs font-semibold uppercase tracking-[0.04em] text-ink-muted hover:text-ink">
                Technical detail
              </summary>
              <div className="mt-1.5 space-y-1 rounded border border-danger-border/60 bg-surface/60 p-2 font-mono text-2xs leading-relaxed text-ink-muted">
                {error.endpoint && (
                  <p className="break-all">
                    <span className="text-ink-subtle">endpoint </span>
                    {error.endpoint}
                  </p>
                )}
                {error.status !== null && (
                  <p>
                    <span className="text-ink-subtle">status </span>
                    {error.status}
                  </p>
                )}
                {error.detail && <p className="break-words">{error.detail}</p>}
              </div>
            </details>
          )}

          {children}

          {onRetry && error.retryable && (
            <div className="pt-0.5">
              <Button
                size="sm"
                variant="secondary"
                onClick={onRetry}
                loading={retrying}
                leadingIcon={<RefreshCw className="h-3.5 w-3.5" aria-hidden />}
              >
                Try again
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Shown where a feature exists in the UI but depends on backend work that is
 * not finished. Deliberately distinct from an error: nothing has gone wrong.
 */
export function IntegrationRequired({
  feature,
  detail,
  className,
}: {
  feature: string;
  detail: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border border-dashed border-line-strong bg-surface-sunken p-4',
        className,
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.04em] text-ink-muted">
        Awaiting backend integration
      </p>
      <p className="mt-1 text-sm font-medium text-ink">{feature}</p>
      <p className="mt-1 max-w-prose text-xs leading-relaxed text-ink-muted">{detail}</p>
    </div>
  );
}
