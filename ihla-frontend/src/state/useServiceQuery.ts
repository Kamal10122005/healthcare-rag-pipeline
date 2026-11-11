import { useCallback, useEffect, useRef, useState } from 'react';
import { toServiceError } from '@/services/errors';
import type { ServiceErrorInfo } from '@/types/models';

export interface QueryState<T> {
  data: T | null;
  error: ServiceErrorInfo | null;
  loading: boolean;
  /** True while a retry runs with data already on screen. */
  refreshing: boolean;
}

export interface QueryResult<T> extends QueryState<T> {
  refetch: () => void;
  /** Local mutation of the cached value, e.g. after an optimistic change. */
  setData: (updater: (current: T | null) => T | null) => void;
}

/**
 * Minimal async data hook used by every screen.
 *
 * Deliberately small — the app has no server-cache requirements that would
 * justify adding React Query as a dependency, and keeping it local means
 * there is exactly one place where failures become `ServiceErrorInfo`.
 *
 * On failure it clears nothing and substitutes nothing: `data` keeps whatever
 * was last successfully loaded, `error` is set, and the screen decides what to
 * render. It never supplies placeholder content of its own.
 */
export function useServiceQuery<T>(
  runner: (signal: AbortSignal) => Promise<T>,
  deps: unknown[],
  options: { enabled?: boolean } = {},
): QueryResult<T> {
  const enabled = options.enabled ?? true;

  const [state, setState] = useState<QueryState<T>>({
    data: null,
    error: null,
    loading: enabled,
    refreshing: false,
  });

  const runnerRef = useRef(runner);
  runnerRef.current = runner;

  const controllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      setState({ data: null, error: null, loading: false, refreshing: false });
      return;
    }

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setState((current) => ({
      ...current,
      loading: current.data === null,
      refreshing: current.data !== null,
      error: null,
    }));

    runnerRef
      .current(controller.signal)
      .then((data) => {
        if (controller.signal.aborted || !mountedRef.current) return;
        setState({ data, error: null, loading: false, refreshing: false });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || !mountedRef.current) return;
        const serviceError = toServiceError(error);
        if (serviceError.isAborted) return;
        setState((current) => ({
          data: current.data,
          error: serviceError.toInfo(),
          loading: false,
          refreshing: false,
        }));
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled, nonce]);

  const refetch = useCallback(() => setNonce((value) => value + 1), []);

  const setData = useCallback((updater: (current: T | null) => T | null) => {
    setState((current) => ({ ...current, data: updater(current.data) }));
  }, []);

  return { ...state, refetch, setData };
}
