import { STORAGE_KEYS, readStored, writeStored } from './storage';
import type { StructuredAnswer } from '@/types/models';

/**
 * Answers the user chose to keep. Stored locally only — this is explicitly a
 * client-side convenience, not a synced account feature, and the Settings and
 * Knowledge screens say so.
 */
export interface SavedAnswer {
  id: string;
  question: string;
  answer: StructuredAnswer;
  savedAt: string;
}

export function listSavedAnswers(): SavedAnswer[] {
  const items = readStored<SavedAnswer[]>(STORAGE_KEYS.savedAnswers, [], Array.isArray);
  return items.filter((item) => item && typeof item.question === 'string' && item.answer);
}

export function saveAnswer(entry: SavedAnswer): SavedAnswer[] {
  const next = [entry, ...listSavedAnswers().filter((item) => item.id !== entry.id)].slice(0, 50);
  writeStored(STORAGE_KEYS.savedAnswers, next);
  return next;
}

export function removeSavedAnswer(id: string): SavedAnswer[] {
  const next = listSavedAnswers().filter((item) => item.id !== id);
  writeStored(STORAGE_KEYS.savedAnswers, next);
  return next;
}

export function clearSavedAnswers(): void {
  writeStored(STORAGE_KEYS.savedAnswers, []);
}

export function recordRecentTopic(topic: string): void {
  const current = readStored<string[]>(STORAGE_KEYS.recentTopics, [], Array.isArray);
  const next = [topic, ...current.filter((item) => item !== topic)].slice(0, 8);
  writeStored(STORAGE_KEYS.recentTopics, next);
}

export function listRecentTopics(): string[] {
  return readStored<string[]>(STORAGE_KEYS.recentTopics, [], Array.isArray);
}
