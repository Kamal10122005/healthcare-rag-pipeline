import { appConfig } from '@/config/env';

/**
 * Wordmark for the navigation rail.
 *
 * The glyph is a stylised pulse line that resolves into a reading baseline —
 * health information made legible. Drawn inline rather than imported as an
 * asset so it inherits theme colours.
 */
export function ProductMark() {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <svg
        viewBox="0 0 32 32"
        className="h-8 w-8 shrink-0"
        role="img"
        aria-label={appConfig.appName}
      >
        <rect width="32" height="32" rx="7" className="fill-white/[0.08]" />
        <rect
          x="0.5"
          y="0.5"
          width="31"
          height="31"
          rx="6.5"
          fill="none"
          className="stroke-white/15"
        />
        <path
          d="M6.5 17h3.6l2.2-5.6 3.1 11 2.5-7 1.7 3.6h5.9"
          fill="none"
          stroke="hsl(var(--accent))"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold tracking-tight text-ink-inverse">
          Health Literacy
        </p>
        <p className="truncate text-2xs font-medium uppercase tracking-[0.1em] text-ink-inverse/45">
          Assistant
        </p>
      </div>
    </div>
  );
}
