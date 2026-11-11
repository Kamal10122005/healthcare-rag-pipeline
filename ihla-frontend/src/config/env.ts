/**
 * Environment-dependent configuration.
 *
 * Everything the app needs from the outside world is read here, once.
 * No component reads `import.meta.env` directly.
 *
 * See `.env.example` for the full list of supported variables.
 */

import type { ServiceMode } from '@/types/models';

function readString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value !== 'string') return fallback;
  const normalised = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalised)) return true;
  if (['false', '0', 'no', 'off'].includes(normalised)) return false;
  return fallback;
}

function readNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const env = import.meta.env as Record<string, unknown>;

const rawMode = readString(env.VITE_APP_MODE, 'demo').toLowerCase();
const defaultMode: ServiceMode = rawMode === 'connected' ? 'connected' : 'demo';

export const appConfig = {
  /** Product name used in the shell, document title and about screen. */
  appName: readString(env.VITE_APP_NAME, 'Intelligent Health Literacy Assistant'),
  appShortName: readString(env.VITE_APP_SHORT_NAME, 'Health Literacy Assistant'),

  /** Mode the app boots into. A user override is persisted in localStorage. */
  defaultMode,

  /** Whether the user may switch modes from the UI. Disable for a pinned deployment. */
  allowModeSwitch: readBoolean(env.VITE_ALLOW_MODE_SWITCH, true),

  /**
   * Base URL of the FastAPI backend, without a trailing slash.
   * Empty means Connected Mode is unconfigured and will fail loudly.
   */
  apiBaseUrl: readString(env.VITE_API_BASE_URL, '').replace(/\/+$/, ''),

  /** Per-request timeout in milliseconds. */
  requestTimeoutMs: readNumber(env.VITE_API_TIMEOUT_MS, 30_000),

  /** Longer budget for question answering, which runs retrieval + generation. */
  askTimeoutMs: readNumber(env.VITE_ASK_TIMEOUT_MS, 90_000),

  /**
   * NOTE — there is deliberately no API key here.
   *
   * Vite inlines every VITE_* variable into the JavaScript bundle at build
   * time. A key placed there is not configuration, it is published: anyone can
   * read it from the served asset or from DevTools, and it cannot be rotated
   * without a rebuild and redeploy. A previous revision of this file exposed
   * `VITE_API_KEY`; it has been removed, and nothing should reintroduce it.
   *
   * Authentication belongs on the server. See FRONTEND_INTEGRATION_GUIDE.md
   * ("Authentication") for the two supported patterns: an httpOnly session
   * cookie (enable `withCredentials` below), or a server-side proxy that
   * attaches the upstream credential. Either way the browser never holds the
   * secret.
   */

  /** Send cookies with API requests (required for httpOnly session auth). */
  withCredentials: readBoolean(env.VITE_API_WITH_CREDENTIALS, false),

  /** Max upload size accepted by the UI before it even attempts a request. */
  maxUploadBytes: readNumber(env.VITE_MAX_UPLOAD_BYTES, 25 * 1024 * 1024),

  /** Simulated latency for demo responses, so loading states are exercised. */
  demoLatencyMs: readNumber(env.VITE_DEMO_LATENCY_MS, 900),

  /** Emergency number shown in safety notices. Varies by country. */
  emergencyNumber: readString(env.VITE_EMERGENCY_NUMBER, '112'),

  buildVersion: readString(env.VITE_APP_VERSION, '1.0.0'),
} as const;

export type AppConfig = typeof appConfig;

/** True when Connected Mode has everything it needs to issue requests. */
export function isConnectedModeConfigured(config: AppConfig = appConfig): boolean {
  return config.apiBaseUrl.length > 0;
}
