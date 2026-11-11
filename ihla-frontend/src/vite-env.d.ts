/// <reference types="vite/client" />

/**
 * Environment variables consumed by the app. Keep this in sync with
 * `.env.example` and `src/config/env.ts`.
 */
interface ImportMetaEnv {
  readonly VITE_APP_NAME?: string;
  readonly VITE_APP_SHORT_NAME?: string;
  readonly VITE_APP_VERSION?: string;
  readonly VITE_APP_MODE?: 'demo' | 'connected';
  readonly VITE_ALLOW_MODE_SWITCH?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_API_TIMEOUT_MS?: string;
  readonly VITE_ASK_TIMEOUT_MS?: string;
  readonly VITE_API_WITH_CREDENTIALS?: string;
  readonly VITE_MAX_UPLOAD_BYTES?: string;
  readonly VITE_DEMO_LATENCY_MS?: string;
  readonly VITE_EMERGENCY_NUMBER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
