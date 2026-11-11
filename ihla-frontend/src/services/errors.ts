/**
 * Error handling utilities.
 *
 * Every failure that reaches the UI is a `ServiceError`. The UI renders
 * `toInfo()` output — a serialisable, user-safe description — and decides
 * whether to offer a retry based on `retryable`.
 *
 * Critical rule: a failure is NEVER substituted with demonstration content.
 * Callers surface the error; they do not fall back.
 */

import type { ServiceErrorInfo, ServiceErrorKind } from '@/types/models';

const USER_MESSAGES: Record<ServiceErrorKind, string> = {
  network:
    'Could not reach the Health Literacy Assistant backend. The service may be offline or unreachable from this network.',
  timeout:
    'The backend took too long to respond. It may be processing a large request, or it may be unavailable.',
  http: 'The backend rejected the request.',
  parse:
    'The backend responded in a format this app does not recognise. The API contract may have changed.',
  aborted: 'The request was cancelled.',
  not_configured:
    'Connected Mode is selected but no API base URL is configured. Set VITE_API_BASE_URL in your .env file.',
  not_supported:
    'This capability is not available in the current mode.',
};

export class ServiceError extends Error {
  readonly kind: ServiceErrorKind;
  readonly status: number | null;
  readonly endpoint: string | null;
  readonly detail: string | null;
  readonly occurredAt: string;

  constructor(
    kind: ServiceErrorKind,
    options: {
      message?: string;
      detail?: string | null;
      status?: number | null;
      endpoint?: string | null;
      cause?: unknown;
    } = {},
  ) {
    super(options.message ?? USER_MESSAGES[kind]);
    this.name = 'ServiceError';
    this.kind = kind;
    this.status = options.status ?? null;
    this.endpoint = options.endpoint ?? null;
    this.detail = options.detail ?? null;
    this.occurredAt = new Date().toISOString();
    if (options.cause !== undefined) {
      (this as { cause?: unknown }).cause = options.cause;
    }
  }

  /** Aborted requests are user-initiated; the UI should stay silent about them. */
  get isAborted(): boolean {
    return this.kind === 'aborted';
  }

  get retryable(): boolean {
    if (this.kind === 'aborted' || this.kind === 'not_supported') return false;
    if (this.kind === 'not_configured') return false;
    // 4xx other than 408/429 will fail again identically — no point retrying.
    if (this.kind === 'http' && this.status !== null) {
      if (this.status === 408 || this.status === 429) return true;
      return this.status >= 500;
    }
    return true;
  }

  toInfo(): ServiceErrorInfo {
    return {
      kind: this.kind,
      message: this.message,
      detail: this.detail,
      status: this.status,
      endpoint: this.endpoint,
      retryable: this.retryable,
      occurredAt: this.occurredAt,
    };
  }
}

/** Normalises anything thrown into a `ServiceError`. */
export function toServiceError(error: unknown, endpoint?: string): ServiceError {
  if (error instanceof ServiceError) return error;

  if (error instanceof DOMException && error.name === 'AbortError') {
    return new ServiceError('aborted', { endpoint });
  }

  if (error instanceof TypeError) {
    // fetch() rejects with TypeError for DNS/connection/CORS failures.
    return new ServiceError('network', {
      detail: error.message,
      endpoint,
      cause: error,
    });
  }

  return new ServiceError('network', {
    detail: error instanceof Error ? error.message : String(error),
    endpoint,
    cause: error,
  });
}

/** Short label for the error banner heading. */
export function errorHeadline(info: ServiceErrorInfo): string {
  switch (info.kind) {
    case 'network':
      return 'Backend unreachable';
    case 'timeout':
      return 'Request timed out';
    case 'http':
      return info.status ? `Request failed (${info.status})` : 'Request failed';
    case 'parse':
      return 'Unexpected response';
    case 'not_configured':
      return 'Connected Mode not configured';
    case 'not_supported':
      return 'Not available in this mode';
    case 'aborted':
      return 'Request cancelled';
    default:
      return 'Something went wrong';
  }
}
