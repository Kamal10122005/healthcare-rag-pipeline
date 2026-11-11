/**
 * The single place where network requests are issued.
 *
 * Responsibilities:
 *  - build URLs from the configured base
 *  - attach headers (API key, credentials)
 *  - enforce timeouts, honouring an externally supplied AbortSignal
 *  - translate every failure mode into a `ServiceError`
 *
 * It deliberately knows nothing about the domain. Mapping wire payloads to
 * domain models happens in `mappers.ts`.
 */

import { appConfig, isConnectedModeConfigured, type AppConfig } from '@/config/env';
import { ServiceError, toServiceError } from '@/services/errors';

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** JSON-serialisable body. Mutually exclusive with `formData`. */
  body?: unknown;
  formData?: FormData;
  query?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Set to true for endpoints that legitimately return no content. */
  expectEmpty?: boolean;
}

export class HttpClient {
  constructor(private readonly config: AppConfig = appConfig) {}

  get baseUrl(): string {
    return this.config.apiBaseUrl;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    if (!isConnectedModeConfigured(this.config)) {
      throw new ServiceError('not_configured', { endpoint: path });
    }

    const url = this.buildUrl(path, options.query);
    const timeoutMs = options.timeoutMs ?? this.config.requestTimeoutMs;

    const timeoutController = new AbortController();
    const timer = setTimeout(() => timeoutController.abort(), timeoutMs);
    const cleanupExternal = linkSignals(options.signal, timeoutController);

    // No credential is attached here by design. The browser bundle cannot hold
    // a secret, so authentication is carried either by an httpOnly session
    // cookie (`credentials: 'include'`, set below) or by a server-side proxy
    // that adds the upstream credential. Do not add an API-key header.
    const headers: Record<string, string> = { Accept: 'application/json' };

    let init: RequestInit = {
      method: options.method ?? 'GET',
      headers,
      signal: timeoutController.signal,
      credentials: this.config.withCredentials ? 'include' : 'same-origin',
    };

    if (options.formData) {
      // Content-Type is intentionally omitted: the browser sets the multipart boundary.
      init = { ...init, body: options.formData };
    } else if (options.body !== undefined) {
      init = {
        ...init,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(options.body),
      };
    }

    let response: Response;
    try {
      response = await fetch(url, init);
    } catch (error) {
      // Distinguish our timeout from a caller-initiated cancellation.
      if (isAbortError(error)) {
        if (options.signal?.aborted) {
          throw new ServiceError('aborted', { endpoint: path });
        }
        throw new ServiceError('timeout', {
          endpoint: path,
          detail: `No response within ${timeoutMs} ms`,
        });
      }
      throw toServiceError(error, path);
    } finally {
      clearTimeout(timer);
      cleanupExternal();
    }

    if (!response.ok) {
      throw new ServiceError('http', {
        status: response.status,
        endpoint: path,
        detail: await readErrorDetail(response),
        message: httpMessage(response.status),
      });
    }

    if (options.expectEmpty || response.status === 204) {
      return undefined as T;
    }

    const raw = await response.text();
    if (raw.trim().length === 0) return undefined as T;

    try {
      return JSON.parse(raw) as T;
    } catch (error) {
      throw new ServiceError('parse', {
        endpoint: path,
        status: response.status,
        detail: error instanceof Error ? error.message : 'Response was not valid JSON',
      });
    }
  }

  private buildUrl(
    path: string,
    query?: Record<string, string | number | boolean | undefined>,
  ): string {
    const base = this.config.apiBaseUrl;
    // A relative base (e.g. "/api" behind the dev proxy) must stay relative.
    const absolute = /^https?:\/\//i.test(base);
    const joined = `${base}${path.startsWith('/') ? path : `/${path}`}`;

    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined && value !== '') search.set(key, String(value));
    }
    const qs = search.toString();

    if (!absolute) return qs ? `${joined}?${qs}` : joined;

    const url = new URL(joined);
    search.forEach((value, key) => url.searchParams.set(key, value));
    return url.toString();
  }
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  );
}

/** Forwards an external abort to our internal controller; returns an unsubscribe fn. */
function linkSignals(
  external: AbortSignal | undefined,
  controller: AbortController,
): () => void {
  if (!external) return () => {};
  if (external.aborted) {
    controller.abort();
    return () => {};
  }
  const onAbort = () => controller.abort();
  external.addEventListener('abort', onAbort);
  return () => external.removeEventListener('abort', onAbort);
}

async function readErrorDetail(response: Response): Promise<string> {
  try {
    const text = await response.text();
    if (!text) return response.statusText || `HTTP ${response.status}`;
    try {
      const parsed = JSON.parse(text) as { detail?: unknown; message?: unknown };
      const detail = parsed.detail ?? parsed.message;
      if (typeof detail === 'string') return detail;
      return text.slice(0, 500);
    } catch {
      return text.slice(0, 500);
    }
  } catch {
    return response.statusText || `HTTP ${response.status}`;
  }
}

function httpMessage(status: number): string {
  if (status === 401 || status === 403)
    return 'The backend refused this request. Check the API key or session configuration.';
  if (status === 404)
    return 'The backend does not expose this endpoint yet. Check src/services/connected/endpoints.ts.';
  if (status === 413) return 'The backend rejected the upload because the file is too large.';
  if (status === 429) return 'Too many requests. Wait a moment and try again.';
  if (status >= 500) return 'The backend encountered an internal error while handling this request.';
  return 'The backend rejected the request.';
}

export const httpClient = new HttpClient();
