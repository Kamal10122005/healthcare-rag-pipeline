import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface TabItem<T extends string> {
  value: T;
  label: string;
  count?: number;
  icon?: ReactNode;
}

/** Underlined tab bar with correct roving-tabindex keyboard behaviour. */
export function Tabs<T extends string>({
  value,
  onChange,
  items,
  label,
  className,
}: {
  value: T;
  onChange: (next: T) => void;
  items: Array<TabItem<T>>;
  label: string;
  className?: string;
}) {
  const baseId = useId();

  const move = (direction: 1 | -1) => {
    const index = items.findIndex((item) => item.value === value);
    const next = (index + direction + items.length) % items.length;
    onChange(items[next].value);
    document.getElementById(`${baseId}-${items[next].value}`)?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn('flex items-center gap-1 border-b border-line', className)}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          move(1);
        } else if (event.key === 'ArrowLeft') {
          event.preventDefault();
          move(-1);
        }
      }}
    >
      {items.map((item) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            id={`${baseId}-${item.value}`}
            role="tab"
            type="button"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.value)}
            className={cn(
              'relative -mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-2.5 py-2 text-sm font-medium transition-colors duration-150',
              selected
                ? 'border-brand text-ink'
                : 'border-transparent text-ink-muted hover:border-line-strong hover:text-ink',
            )}
          >
            {item.icon}
            {item.label}
            {typeof item.count === 'number' && (
              <span
                className={cn(
                  'rounded-sm px-1 py-px text-2xs font-semibold tabular-nums',
                  selected ? 'bg-brand-soft text-brand' : 'bg-surface-sunken text-ink-subtle',
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Progressive-disclosure block used for source previews and FAQ entries. */
export function Disclosure({
  summary,
  children,
  defaultOpen = false,
  className,
  summaryClassName,
}: {
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  summaryClassName?: string;
}) {
  return (
    <details
      open={defaultOpen}
      className={cn('group border-b border-line last:border-b-0', className)}
    >
      <summary
        className={cn(
          'flex cursor-pointer list-none items-center justify-between gap-3 py-3 text-sm font-medium text-ink transition-colors hover:text-brand',
          summaryClassName,
        )}
      >
        {summary}
        <svg
          viewBox="0 0 12 12"
          className="h-3 w-3 shrink-0 text-ink-subtle transition-transform duration-200 group-open:rotate-180"
          aria-hidden
        >
          <path
            d="M2.5 4.5 6 8l3.5-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </summary>
      <div className="pb-4 pt-0.5 text-sm leading-relaxed text-ink-muted">{children}</div>
    </details>
  );
}

/** Thin determinate progress bar for document ingestion. */
export function ProgressBar({
  value,
  label,
  tone = 'brand',
  className,
}: {
  value: number;
  label: string;
  tone?: 'brand' | 'accent' | 'danger';
  className?: string;
}) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn('h-1 w-full overflow-hidden rounded-full bg-line', className)}
    >
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-500 ease-out',
          tone === 'brand' && 'bg-brand',
          tone === 'accent' && 'bg-accent',
          tone === 'danger' && 'bg-danger',
        )}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
