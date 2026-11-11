import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** The one surface primitive. Everything with a border in this product is a Panel. */
export interface PanelProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  /** `flat` for content regions, `raised` for things that sit above the page. */
  elevation?: 'flat' | 'raised' | 'none';
  padded?: boolean;
  interactive?: boolean;
}

export function Panel({
  as: Tag = 'div',
  elevation = 'flat',
  padded = false,
  interactive = false,
  className,
  children,
  ...rest
}: PanelProps) {
  return (
    <Tag
      className={cn(
        'rounded-lg border border-line bg-surface',
        elevation === 'flat' && 'shadow-xs',
        elevation === 'raised' && 'shadow-md',
        padded && 'p-4 sm:p-5',
        interactive &&
          'cursor-pointer transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-px hover:border-line-strong hover:shadow-md',
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** Consistent heading block for panels and page sections. */
export function SectionHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
  level = 2,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  level?: 2 | 3;
}) {
  const Heading = (level === 2 ? 'h2' : 'h3') as ElementType;
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-3', className)}>
      <div className="min-w-0 space-y-1">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <Heading
          className={cn('font-semibold tracking-tight', level === 2 ? 'text-lg' : 'text-md')}
        >
          {title}
        </Heading>
        {description && (
          <p className="max-w-prose text-sm leading-relaxed text-ink-muted">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
