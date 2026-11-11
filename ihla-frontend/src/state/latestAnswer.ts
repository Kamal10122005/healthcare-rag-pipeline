import { useSyncExternalStore } from 'react';
import type { StructuredAnswer } from '@/types/models';

/**
 * The most recent answered turn, shared between the Assistant and the
 * Evidence explorer so "open in Evidence explorer" has something to show.
 * Session-scoped and in-memory by design: evidence belongs to the answer it
 * came from, so persisting it across reloads would risk showing a user
 * evidence detached from the answer that produced it.
 */
export interface LatestAnswer {
  question: string;
  answer: StructuredAnswer;
  messageId: string;
  answeredAt: string;
}

let current: LatestAnswer | null = null;
const listeners = new Set<() => void>();

export function setLatestAnswer(value: LatestAnswer | null): void {
  current = value;
  listeners.forEach((listener) => listener());
}

export function useLatestAnswer(): LatestAnswer | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current,
    () => null,
  );
}
