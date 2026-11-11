/** @type {import('tailwindcss').Config} */

/**
 * Design tokens for the Intelligent Health Literacy Assistant.
 *
 * Colours are declared as HSL channel triplets in `src/styles/tokens.css`
 * and consumed here through `hsl(var(--token) / <alpha-value>)`. That keeps
 * one source of truth for light and dark themes and lets every utility
 * (`bg-surface`, `text-muted`, `border-subtle`, ...) stay semantic rather
 * than hard-coding a colour value inside a component.
 */
const token = (name) => `hsl(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: token('canvas'),
        surface: {
          DEFAULT: token('surface'),
          raised: token('surface-raised'),
          sunken: token('surface-sunken'),
          inverse: token('surface-inverse'),
        },
        line: {
          DEFAULT: token('line'),
          strong: token('line-strong'),
        },
        ink: {
          DEFAULT: token('ink'),
          muted: token('ink-muted'),
          subtle: token('ink-subtle'),
          inverse: token('ink-inverse'),
        },
        brand: {
          DEFAULT: token('brand'),
          hover: token('brand-hover'),
          soft: token('brand-soft'),
          border: token('brand-border'),
          contrast: token('brand-contrast'),
        },
        accent: {
          DEFAULT: token('accent'),
          hover: token('accent-hover'),
          soft: token('accent-soft'),
          border: token('accent-border'),
        },
        success: {
          DEFAULT: token('success'),
          soft: token('success-soft'),
          border: token('success-border'),
        },
        warning: {
          DEFAULT: token('warning'),
          soft: token('warning-soft'),
          border: token('warning-border'),
        },
        danger: {
          DEFAULT: token('danger'),
          soft: token('danger-soft'),
          border: token('danger-border'),
        },
        demo: {
          DEFAULT: token('demo'),
          soft: token('demo-soft'),
          border: token('demo-border'),
        },
        focus: token('focus'),
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      fontSize: {
        // A restrained 8-step scale. Headings stay deliberately small —
        // hierarchy comes from weight, colour and spacing, not size.
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.04em' }],
        xs: ['0.75rem', { lineHeight: '1.125rem' }],
        sm: ['0.8125rem', { lineHeight: '1.25rem' }],
        base: ['0.875rem', { lineHeight: '1.5rem' }],
        md: ['0.9375rem', { lineHeight: '1.625rem' }],
        lg: ['1.0625rem', { lineHeight: '1.625rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.012em' }],
        '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.018em' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.022em' }],
      },
      spacing: {
        '4.5': '1.125rem',
        '13': '3.25rem',
        '18': '4.5rem',
        '68': '17rem',
        '76': '19rem',
        '88': '22rem',
      },
      borderRadius: {
        // Deliberately tight. Pills are reserved for status chips only.
        sm: '0.25rem',
        DEFAULT: '0.375rem',
        md: '0.4375rem',
        lg: '0.625rem',
        xl: '0.875rem',
      },
      boxShadow: {
        xs: '0 1px 2px 0 hsl(var(--shadow) / 0.05)',
        sm: '0 1px 2px 0 hsl(var(--shadow) / 0.06), 0 1px 3px 0 hsl(var(--shadow) / 0.06)',
        md: '0 2px 4px -1px hsl(var(--shadow) / 0.06), 0 4px 12px -2px hsl(var(--shadow) / 0.08)',
        lg: '0 4px 8px -2px hsl(var(--shadow) / 0.08), 0 12px 28px -6px hsl(var(--shadow) / 0.12)',
        overlay: '0 16px 48px -12px hsl(var(--shadow) / 0.28)',
        focus: '0 0 0 3px hsl(var(--focus) / 0.28)',
      },
      maxWidth: {
        prose: '68ch',
        content: '78rem',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'rise-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'translateY(4px) scale(0.985)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(12px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.45' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 160ms ease-out both',
        'rise-in': 'rise-in 220ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'scale-in': 'scale-in 160ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'slide-in-right': 'slide-in-right 220ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'pulse-soft': 'pulse-soft 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
