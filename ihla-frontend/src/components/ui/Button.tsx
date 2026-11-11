import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-brand text-brand-contrast hover:bg-brand-hover shadow-xs disabled:bg-brand/50',
  secondary:
    'bg-surface text-ink border border-line hover:border-line-strong hover:bg-surface-sunken shadow-xs',
  ghost: 'text-ink-muted hover:text-ink hover:bg-surface-sunken',
  danger: 'bg-danger text-white hover:brightness-110 shadow-xs',
  accent: 'bg-accent text-white hover:bg-accent-hover shadow-xs',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-2.5 text-xs gap-1.5 rounded',
  md: 'h-9 px-3.5 text-sm gap-2 rounded-md',
  lg: 'h-11 px-5 text-md gap-2 rounded-lg',
};

const ICON_SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 w-8 rounded',
  md: 'h-9 w-9 rounded-md',
  lg: 'h-11 w-11 rounded-lg',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Renders a square button. `aria-label` becomes required in practice. */
  iconOnly?: boolean;
  loading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    iconOnly = false,
    loading = false,
    leadingIcon,
    trailingIcon,
    fullWidth = false,
    className,
    disabled,
    children,
    type = 'button',
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex select-none items-center justify-center font-medium',
        'transition-[background-color,border-color,color,box-shadow,transform] duration-150',
        'active:translate-y-px disabled:pointer-events-none disabled:opacity-60',
        VARIANTS[variant],
        iconOnly ? ICON_SIZES[size] : SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
      ) : (
        leadingIcon
      )}
      {/*
        Children always render. An icon-only button receives its icon AS its
        children (with the accessible name supplied by `aria-label`), so
        suppressing children here produced visually empty — but still
        clickable — buttons for the nav toggle, theme switch, modal close and
        delete controls.
      */}
      {children}
      {!loading && trailingIcon}
    </button>
  );
});
