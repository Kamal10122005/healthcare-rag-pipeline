import { Link } from 'react-router-dom';
import { AlertTriangle, Info, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/cn';
import { appConfig } from '@/config/env';
import type { SafetyNotice } from '@/types/models';

const STYLES = {
  emergency: {
    wrapper: 'border-danger-border bg-danger-soft',
    icon: ShieldAlert,
    iconClass: 'text-danger',
    titleClass: 'text-danger',
  },
  caution: {
    wrapper: 'border-warning-border bg-warning-soft',
    icon: AlertTriangle,
    iconClass: 'text-warning',
    titleClass: 'text-warning',
  },
  info: {
    wrapper: 'border-line bg-surface-sunken',
    icon: Info,
    iconClass: 'text-ink-subtle',
    titleClass: 'text-ink',
  },
} as const;

/**
 * Safety notices attached to an answer.
 *
 * Emergency notices render first and carry the emergency number, because at
 * that point the rest of the answer is not the thing the user needs.
 */
export function SafetyNotices({
  notices,
  className,
}: {
  notices: SafetyNotice[];
  className?: string;
}) {
  if (notices.length === 0) return null;

  const ordered = [...notices].sort((a, b) => rank(a.level) - rank(b.level));

  return (
    <div className={cn('space-y-2', className)}>
      {ordered.map((notice) => {
        const style = STYLES[notice.level];
        const Icon = style.icon;
        return (
          <div
            key={notice.id}
            role={notice.level === 'emergency' ? 'alert' : undefined}
            className={cn('rounded-lg border p-3', style.wrapper)}
          >
            <div className="flex gap-2.5">
              <Icon className={cn('mt-px h-4 w-4 shrink-0', style.iconClass)} aria-hidden />
              <div className="min-w-0 space-y-1">
                <p className={cn('text-xs font-semibold', style.titleClass)}>{notice.title}</p>
                <p className="text-xs leading-relaxed text-ink">{notice.message}</p>

                {notice.level === 'emergency' && (
                  <p className="pt-0.5 text-xs font-semibold text-danger">
                    Emergency number: {appConfig.emergencyNumber}
                  </p>
                )}

                {notice.actionLabel && (
                  <Link
                    to="/safety"
                    className="inline-block pt-0.5 text-xs font-medium text-brand underline underline-offset-2 hover:text-brand-hover"
                  >
                    {notice.actionLabel}
                  </Link>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function rank(level: SafetyNotice['level']): number {
  return level === 'emergency' ? 0 : level === 'caution' ? 1 : 2;
}
