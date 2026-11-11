import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/cn';

const CONTROL_BASE =
  'w-full rounded-md border border-line bg-surface text-ink placeholder:text-ink-subtle ' +
  'transition-[border-color,box-shadow] duration-150 hover:border-line-strong ' +
  'disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-ink-subtle';

/** Label + help/error text wrapper. Wires up aria-describedby correctly. */
export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  children,
  className,
  labelHidden = false,
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  htmlFor: string;
  children: ReactNode;
  className?: string;
  labelHidden?: boolean;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label
        htmlFor={htmlFor}
        className={cn(
          'block text-xs font-semibold text-ink',
          labelHidden && 'sr-only',
        )}
      >
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${htmlFor}-hint`} className="text-xs leading-relaxed text-ink-subtle">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  leadingIcon?: ReactNode;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { className, invalid, leadingIcon, ...rest },
  ref,
) {
  return (
    <div className="relative">
      {leadingIcon && (
        <span
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle"
          aria-hidden
        >
          {leadingIcon}
        </span>
      )}
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          CONTROL_BASE,
          'h-9 px-3 text-sm',
          leadingIcon && 'pl-9',
          invalid && 'border-danger-border',
          className,
        )}
        {...rest}
      />
    </div>
  );
});

export const TextArea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(function TextArea({ className, invalid, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        CONTROL_BASE,
        'min-h-[84px] resize-y px-3 py-2 text-sm leading-relaxed',
        invalid && 'border-danger-border',
        className,
      )}
      {...rest}
    />
  );
});

export interface SelectOption {
  value: string;
  label: string;
}

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & { options: SelectOption[] }
>(function Select({ className, options, ...rest }, ref) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          CONTROL_BASE,
          'h-9 appearance-none pl-3 pr-8 text-sm',
          className,
        )}
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-subtle"
        aria-hidden
      />
    </div>
  );
});

/** Labelled search box used by the library and knowledge screens. */
export function SearchField({
  value,
  onValueChange,
  label,
  placeholder,
  className,
}: {
  value: string;
  onValueChange: (next: string) => void;
  label: string;
  placeholder?: string;
  className?: string;
}) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id} labelHidden className={className}>
      <TextInput
        id={id}
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onValueChange(event.target.value)}
        leadingIcon={<Search className="h-3.5 w-3.5" />}
      />
    </Field>
  );
}

/** Small segmented control — used for reading level and library view switches. */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
  size = 'md',
}: {
  value: T;
  onChange: (next: T) => void;
  options: Array<{ value: T; label: string; title?: string }>;
  label: string;
  className?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-md border border-line bg-surface-sunken p-0.5',
        className,
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            title={option.title}
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded font-medium transition-colors duration-150',
              size === 'sm' ? 'px-2 py-1 text-2xs' : 'px-2.5 py-1 text-xs',
              selected
                ? 'bg-surface text-ink shadow-xs'
                : 'text-ink-muted hover:text-ink',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Accessible switch for settings. */
export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
  disabledReason,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0 space-y-0.5">
        <label htmlFor={id} className="block text-sm font-medium text-ink">
          {label}
        </label>
        {description && (
          <p className="max-w-prose text-xs leading-relaxed text-ink-muted">{description}</p>
        )}
        {disabled && disabledReason && (
          <p className="text-xs leading-relaxed text-ink-subtle">{disabledReason}</p>
        )}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 h-5 w-9 shrink-0 rounded-full border transition-colors duration-150',
          checked ? 'border-brand bg-brand' : 'border-line-strong bg-surface-sunken',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-3.5 w-3.5 rounded-full bg-surface shadow-xs transition-transform duration-150',
            checked ? 'translate-x-[1.1rem]' : 'translate-x-0.5',
            checked && 'bg-brand-contrast',
          )}
        />
      </button>
    </div>
  );
}
