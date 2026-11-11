import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

export type ToastTone = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
  id: string;
  tone: ToastTone;
  title: string;
  description?: string;
}

interface ToastContextValue {
  toasts: Toast[];
  /** Returns the toast id so a caller can dismiss it early. */
  push: (toast: Omit<Toast, 'id'> & { durationMs?: number }) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_STYLES: Record<ToastTone, { wrapper: string; icon: ReactNode }> = {
  info: {
    wrapper: 'border-line',
    icon: <Info className="h-4 w-4 text-brand" aria-hidden />,
  },
  success: {
    wrapper: 'border-success-border',
    icon: <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />,
  },
  warning: {
    wrapper: 'border-warning-border',
    icon: <AlertTriangle className="h-4 w-4 text-warning" aria-hidden />,
  },
  error: {
    wrapper: 'border-danger-border',
    icon: <XCircle className="h-4 w-4 text-danger" aria-hidden />,
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<string, number>());

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback<ToastContextValue['push']>(
    ({ durationMs = 5_000, ...toast }) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((current) => [...current.slice(-3), { ...toast, id }]);
      if (durationMs > 0) {
        timers.current.set(
          id,
          window.setTimeout(() => dismiss(id), durationMs),
        );
      }
      return id;
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toasts, push, dismiss }), [toasts, push, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          aria-live="polite"
          className={cn(
            'pointer-events-auto flex animate-slide-in-right items-start gap-2.5 rounded-lg border bg-surface p-3 shadow-lg',
            TONE_STYLES[toast.tone].wrapper,
          )}
        >
          <span className="mt-px shrink-0">{TONE_STYLES[toast.tone].icon}</span>
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="text-xs font-semibold text-ink">{toast.title}</p>
            {toast.description && (
              <p className="text-xs leading-relaxed text-ink-muted">{toast.description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            aria-label={`Dismiss notification: ${toast.title}`}
            className="shrink-0 rounded p-0.5 text-ink-subtle transition-colors hover:text-ink"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>.');
  return context;
}
