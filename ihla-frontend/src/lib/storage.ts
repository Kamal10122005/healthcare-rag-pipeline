import { useCallback, useState } from 'react';

/**
 * localStorage-backed state that degrades gracefully.
 *
 * Storage is unavailable in private windows and some embedded browsers, so
 * every access is guarded. A failure here must never break a screen.
 */
export function readStored<T>(key: string, fallback: T, isValid?: (value: unknown) => boolean): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw) as unknown;
    if (isValid && !isValid(parsed)) return fallback;
    return parsed as T;
  } catch {
    return fallback;
  }
}

export function writeStored(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function usePersistentState<T>(
  key: string,
  initial: T,
  isValid?: (value: unknown) => boolean,
): [T, (next: T | ((current: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => readStored(key, initial, isValid));

  const update = useCallback(
    (next: T | ((current: T) => T)) => {
      setValue((current) => {
        const resolved =
          typeof next === 'function' ? (next as (c: T) => T)(current) : next;
        writeStored(key, resolved);
        return resolved;
      });
    },
    [key],
  );

  return [value, update];
}

export const STORAGE_KEYS = {
  mode: 'ihla.mode',
  theme: 'ihla.theme',
  readingLevel: 'ihla.readingLevel',
  savedAnswers: 'ihla.savedAnswers',
  recentTopics: 'ihla.recentTopics',
  disclaimerAcknowledged: 'ihla.disclaimerAcknowledged',
  density: 'ihla.density',
} as const;
