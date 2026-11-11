/** Presentation helpers. Pure functions — safe to unit test. */

import type {
  DocumentCategory,
  DocumentStatus,
  EvidenceConfidence,
  IngestionStage,
  ReadingLevel,
  SourceType,
} from '@/types/models';

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  clinical_guideline: 'Clinical guideline',
  public_health_authority: 'Public health authority',
  systematic_review: 'Systematic review',
  peer_reviewed_article: 'Peer-reviewed article',
  patient_education: 'Patient education',
  drug_label: 'Medicine information',
  other: 'Other source',
};

export const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  cardiometabolic: 'Heart & metabolic',
  infectious_disease: 'Infections',
  respiratory: 'Respiratory',
  maternal_child: 'Maternal & child',
  mental_health: 'Mental health & sleep',
  medication_safety: 'Medication safety',
  general_health: 'General health',
};

export const STATUS_LABELS: Record<DocumentStatus, string> = {
  indexed: 'Indexed',
  processing: 'Processing',
  queued: 'Queued',
  failed: 'Failed',
};

export const STAGE_LABELS: Record<IngestionStage, string> = {
  uploaded: 'Uploaded',
  extracting: 'Extracting text',
  chunking: 'Creating passages',
  embedding: 'Generating embeddings',
  indexing: 'Writing to index',
  complete: 'Complete',
  failed: 'Failed',
};

export const CONFIDENCE_LABELS: Record<EvidenceConfidence, string> = {
  high: 'Well supported',
  moderate: 'Partly supported',
  low: 'Weakly supported',
  insufficient: 'Not supported by sources',
};

export const CONFIDENCE_DESCRIPTIONS: Record<EvidenceConfidence, string> = {
  high: 'Several retrieved passages directly address the question and agree with each other.',
  moderate:
    'Retrieved passages support the main points, but part of the question is not covered by the indexed sources.',
  low: 'Only loosely related passages were retrieved. Treat this answer as a starting point, not a conclusion.',
  insufficient:
    'No retrieved passage supports an answer to this question. Nothing has been generated from outside the knowledge base.',
};

export const READING_LEVEL_LABELS: Record<ReadingLevel, string> = {
  plain: 'Plain language',
  standard: 'Standard',
  clinical: 'Clinical detail',
};

export const READING_LEVEL_HINTS: Record<ReadingLevel, string> = {
  plain: 'Short sentences, everyday words, no jargon.',
  standard: 'Balanced explanation with terms defined as they appear.',
  clinical: 'Keeps clinical terminology and numeric thresholds intact.',
};

/* ------------------------------ dates ------------------------------ */

export function formatDate(iso: string | null): string {
  if (!iso) return 'Date not stated';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Date not stated';
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60_000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;

  const days = Math.round(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;

  return formatDate(iso);
}

/* ------------------------------ sizes ------------------------------ */

export function formatBytes(bytes: number | null): string {
  if (bytes === null || !Number.isFinite(bytes)) return 'Size unknown';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

export function formatPercent(value: number): string {
  return `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`;
}

/** Relevance is a retrieval score; the UI shows a band rather than false precision. */
export function relevanceBand(relevance: number): 'strong' | 'moderate' | 'weak' {
  if (relevance >= 0.85) return 'strong';
  if (relevance >= 0.65) return 'moderate';
  return 'weak';
}

export const RELEVANCE_BAND_LABELS: Record<ReturnType<typeof relevanceBand>, string> = {
  strong: 'Strong match',
  moderate: 'Moderate match',
  weak: 'Weak match',
};

/** Splits an excerpt around a highlight so it can be marked up safely (no dangerouslySetInnerHTML). */
export function splitOnHighlight(
  excerpt: string,
  highlight: string | null,
): { before: string; match: string; after: string } {
  if (!highlight) return { before: excerpt, match: '', after: '' };
  const index = excerpt.indexOf(highlight);
  if (index < 0) return { before: excerpt, match: '', after: '' };
  return {
    before: excerpt.slice(0, index),
    match: highlight,
    after: excerpt.slice(index + highlight.length),
  };
}

/**
 * Finds inline citation markers like "[S1]" in answer text so they can be
 * rendered as interactive chips rather than literal brackets.
 */
export function tokenizeCitations(
  text: string,
): Array<{ type: 'text'; value: string } | { type: 'citation'; label: string }> {
  const pattern = /\[(S\d{1,2})\]/g;
  const parts: Array<{ type: 'text'; value: string } | { type: 'citation'; label: string }> = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) {
      parts.push({ type: 'text', value: text.slice(cursor, match.index) });
    }
    parts.push({ type: 'citation', label: match[1] });
    cursor = match.index + match[0].length;
  }

  if (cursor < text.length) parts.push({ type: 'text', value: text.slice(cursor) });
  return parts;
}
