import { useEffect, useRef, useState } from 'react';
import { CornerDownLeft, Square } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/Field';
import { READING_LEVEL_HINTS, READING_LEVEL_LABELS } from '@/lib/format';
import { useApp } from '@/state/AppProvider';

const MAX_LENGTH = 1200;

/** Question input. Autogrows, submits on Enter, keeps text on failure. */
export function Composer({
  onSubmit,
  busy,
  restoredDraft,
  onDraftConsumed,
  compact = false,
}: {
  onSubmit: (question: string) => void;
  busy: boolean;
  restoredDraft: string | null;
  onDraftConsumed: () => void;
  compact?: boolean;
}) {
  const { readingLevel, setReadingLevel } = useApp();
  const [value, setValue] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (restoredDraft === null) return;
    setValue(restoredDraft);
    onDraftConsumed();
    ref.current?.focus();
  }, [restoredDraft, onDraftConsumed]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [value]);

  const submit = () => {
    const question = value.trim();
    if (!question || busy) return;
    onSubmit(question);
    setValue('');
  };

  const tooLong = value.length > MAX_LENGTH;

  return (
    <div
      className={cn(
        'rounded-xl border border-line bg-surface shadow-md transition-shadow focus-within:border-brand-border focus-within:shadow-lg',
        compact && 'shadow-sm',
      )}
    >
      <label htmlFor="composer-input" className="sr-only">
        Ask a health question
      </label>
      <textarea
        id="composer-input"
        ref={ref}
        rows={compact ? 1 : 2}
        value={value}
        disabled={busy}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            submit();
          }
        }}
        placeholder="Ask about a symptom, a test result, a medicine or a guideline…"
        aria-describedby="composer-help"
        className="w-full resize-none rounded-t-xl bg-transparent px-4 pt-3.5 text-md leading-relaxed text-ink placeholder:text-ink-subtle focus:outline-none disabled:opacity-60"
      />

      <div className="flex flex-wrap items-center justify-between gap-2 px-3 pb-3 pt-1.5">
        <div className="flex items-center gap-2">
          <SegmentedControl
            size="sm"
            label="Reading level"
            value={readingLevel}
            onChange={setReadingLevel}
            options={(['plain', 'standard', 'clinical'] as const).map((level) => ({
              value: level,
              label: READING_LEVEL_LABELS[level],
              title: READING_LEVEL_HINTS[level],
            }))}
          />
        </div>

        <div className="flex items-center gap-2">
          <span
            id="composer-help"
            className={cn('text-2xs', tooLong ? 'text-danger' : 'text-ink-subtle')}
          >
            {tooLong ? `${value.length}/${MAX_LENGTH}` : 'Enter to send · Shift+Enter for a new line'}
          </span>
          <Button
            variant="primary"
            size="sm"
            onClick={submit}
            disabled={value.trim().length === 0 || tooLong}
            loading={busy}
            leadingIcon={
              busy ? undefined : <CornerDownLeft className="h-3.5 w-3.5" aria-hidden />
            }
          >
            {busy ? 'Working' : 'Ask'}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Thinking state shown in place of the pending answer. */
export function ThinkingCard() {
  const steps = ['Checking the question for safety signals', 'Retrieving passages', 'Drafting a cited answer'];
  return (
    <div className="animate-rise-in rounded-lg border border-line bg-surface p-4 shadow-xs" aria-busy="true">
      <p className="eyebrow flex items-center gap-1.5">
        <Square className="h-2.5 w-2.5 animate-pulse-soft fill-accent text-accent" aria-hidden />
        Working
      </p>
      <ul className="mt-2.5 space-y-1.5" role="status">
        {steps.map((step, index) => (
          <li
            key={step}
            className="flex items-center gap-2 text-sm text-ink-muted"
            style={{ animationDelay: `${index * 120}ms` }}
          >
            <span className="h-1 w-1 animate-pulse-soft rounded-full bg-accent" aria-hidden />
            {step}
          </li>
        ))}
      </ul>
      <div className="mt-3 space-y-2">
        <div className="skeleton h-3 w-11/12" />
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-3 w-2/3" />
      </div>
    </div>
  );
}
