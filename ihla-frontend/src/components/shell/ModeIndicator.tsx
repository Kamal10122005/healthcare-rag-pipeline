import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  FlaskConical,
  Loader2,
  Radio,
  RefreshCw,
  WifiOff,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useApp } from '@/state/AppProvider';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SegmentedControl } from '@/components/ui/Field';
import { ErrorState } from '@/components/ui/States';
import { appConfig } from '@/config/env';

/**
 * The connection pill in the top bar.
 *
 * It is the single place that tells the user, at all times, whether what they
 * are looking at came from the real backend or from demonstration data. It is
 * never hidden and never optimistic.
 */
export function ModeIndicator() {
  const {
    mode,
    setMode,
    modeSwitchAllowed,
    connection,
    checkConnection,
    connectedModeConfigured,
  } = useApp();
  const [open, setOpen] = useState(false);

  const isDemo = mode === 'demo';
  const offline = mode === 'connected' && connection.status === 'offline';
  const checking = connection.status === 'checking';

  const label = isDemo
    ? 'Demo mode'
    : offline
      ? 'Disconnected'
      : checking
        ? 'Connecting…'
        : 'Connected';

  const Icon = isDemo ? FlaskConical : offline ? WifiOff : checking ? Loader2 : Radio;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Data source: ${label}. Open data source settings.`}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-2xs font-semibold uppercase tracking-[0.04em] transition-colors',
          isDemo && 'border-demo-border bg-demo-soft text-demo hover:brightness-95',
          !isDemo && offline && 'border-danger-border bg-danger-soft text-danger',
          !isDemo && !offline && 'border-success-border bg-success-soft text-success',
        )}
      >
        <Icon className={cn('h-3 w-3', checking && 'animate-spin')} aria-hidden />
        <span>{label}</span>
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Data source"
        description="Which service the application is reading from right now."
        size="md"
        footer={
          <Button variant="primary" onClick={() => setOpen(false)}>
            Done
          </Button>
        }
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <p className="eyebrow">Mode</p>
            <SegmentedControl
              label="Data source mode"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'demo', label: 'Demo' },
                { value: 'connected', label: 'Connected' },
              ]}
            />
            {!modeSwitchAllowed && (
              <p className="text-xs text-ink-muted">
                Mode switching is disabled for this deployment (VITE_ALLOW_MODE_SWITCH).
              </p>
            )}
          </div>

          {isDemo ? (
            <div className="space-y-2 rounded-lg border border-demo-border bg-demo-soft p-3">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-demo">
                <FlaskConical className="h-3.5 w-3.5" aria-hidden />
                Demonstration data
              </p>
              <p className="text-xs leading-relaxed text-ink">
                Answers, sources and documents are served from a local sample corpus. The
                publishers and excerpts are fictional examples written for this demo — they are
                not real medical sources and must not be cited. No network request is made.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1 rounded-lg border border-line bg-surface-sunken p-3">
                <p className="eyebrow">Backend</p>
                <p className="break-all font-mono text-xs text-ink">
                  {appConfig.apiBaseUrl || 'not configured'}
                </p>
              </div>

              {connection.status === 'online' && connection.health && (
                <div className="space-y-2 rounded-lg border border-success-border bg-success-soft p-3">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-success">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                    Backend reachable
                  </p>
                  {connection.health.version && (
                    <p className="font-mono text-2xs text-ink-muted">
                      version {connection.health.version}
                    </p>
                  )}
                  {Object.keys(connection.health.components).length > 0 && (
                    <ul className="space-y-0.5 text-xs text-ink">
                      {Object.entries(connection.health.components).map(([name, status]) => (
                        <li key={name} className="flex items-center justify-between gap-3">
                          <span className="font-mono text-2xs text-ink-muted">{name}</span>
                          <span
                            className={cn(
                              'text-2xs font-semibold uppercase',
                              status === 'ok' && 'text-success',
                              status === 'degraded' && 'text-warning',
                              status === 'down' && 'text-danger',
                            )}
                          >
                            {status}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {offline && connection.error && (
                <ErrorState
                  error={connection.error}
                  onRetry={() => void checkConnection()}
                  retrying={checking}
                  compact
                >
                  {!connectedModeConfigured && (
                    <p className="text-xs leading-relaxed text-ink">
                      Set <code className="font-mono">VITE_API_BASE_URL</code> in your{' '}
                      <code className="font-mono">.env</code> file, then restart the dev server.
                    </p>
                  )}
                </ErrorState>
              )}

              <div className="flex items-start gap-2 rounded-lg border border-warning-border bg-warning-soft p-3">
                <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0 text-warning" aria-hidden />
                <p className="text-xs leading-relaxed text-ink">
                  Connected Mode never falls back to demonstration content. If the backend is
                  unavailable, the application shows the failure and keeps your input rather than
                  showing sample data.
                </p>
              </div>

              <Button
                size="sm"
                variant="secondary"
                onClick={() => void checkConnection()}
                loading={checking}
                leadingIcon={<RefreshCw className="h-3.5 w-3.5" aria-hidden />}
              >
                Re-check connection
              </Button>
            </div>
          )}

          <p className="text-xs leading-relaxed text-ink-muted">
            More detail is in{' '}
            <Link
              to="/safety"
              onClick={() => setOpen(false)}
              className="font-medium text-brand underline underline-offset-2"
            >
              Safety &amp; trust
            </Link>
            .
          </p>
        </div>
      </Modal>
    </>
  );
}
