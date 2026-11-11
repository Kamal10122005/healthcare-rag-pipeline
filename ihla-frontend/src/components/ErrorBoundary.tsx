import { Component, type ErrorInfo, type ReactNode } from 'react';

/** Last-resort boundary so a render crash shows something honest, not a blank page. */
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Replace with the team's error reporter when one exists.
    console.error('Unhandled UI error:', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas p-6">
        <div className="max-w-md space-y-3 rounded-lg border border-danger-border bg-surface p-5 shadow-md">
          <h1 className="text-md font-semibold text-danger">The application stopped</h1>
          <p className="text-sm leading-relaxed text-ink-muted">
            An unexpected error broke this screen. Nothing has been sent or saved as a result.
            Reload to continue.
          </p>
          <pre className="max-h-40 overflow-auto rounded border border-line bg-surface-sunken p-2 font-mono text-2xs text-ink-muted">
            {error.message}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="h-9 rounded-md bg-brand px-3.5 text-sm font-medium text-brand-contrast hover:bg-brand-hover"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
