/**
 * Wire payload → domain model mapping.
 *
 * The backend is still being built, so these mappers are defensive: unknown
 * enum values degrade to a safe default and missing optional fields become
 * `null`. What they never do is invent content — if the backend omits
 * citations, the answer has no citations and the UI says so.
 *
 * Everything produced here is stamped `origin: 'live'`, which is what lets the
 * UI prove to the user that nothing on screen is demonstration data.
 */

import type {
  BackendHealth,
  Citation,
  Conversation,
  ConversationMessage,
  ConversationSummary,
  DocumentCategory,
  DocumentRecord,
  DocumentStatus,
  EvidenceConfidence,
  IngestionStage,
  KnowledgeTopic,
  ProcessingStatus,
  ReadingLevel,
  SafetyLevel,
  SafetyNotice,
  SourceType,
  StructuredAnswer,
} from '@/types/models';

type Dict = Record<string, unknown>;

const asDict = (value: unknown): Dict =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Dict) : {};

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const asString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const asNullableString = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null;

const asNumber = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const asNullableNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const asStringArray = (value: unknown): string[] =>
  asArray(value).filter((item): item is string => typeof item === 'string');

const oneOf = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

const nowIso = () => new Date().toISOString();

const SOURCE_TYPES: readonly SourceType[] = [
  'clinical_guideline',
  'public_health_authority',
  'systematic_review',
  'peer_reviewed_article',
  'patient_education',
  'drug_label',
  'other',
];

const CATEGORIES: readonly DocumentCategory[] = [
  'cardiometabolic',
  'infectious_disease',
  'respiratory',
  'maternal_child',
  'mental_health',
  'medication_safety',
  'general_health',
];

const CONFIDENCES: readonly EvidenceConfidence[] = [
  'high',
  'moderate',
  'low',
  'insufficient',
];

const SAFETY_LEVELS: readonly SafetyLevel[] = ['emergency', 'caution', 'info'];
const READING_LEVELS: readonly ReadingLevel[] = ['plain', 'standard', 'clinical'];
const DOC_STATUSES: readonly DocumentStatus[] = ['indexed', 'processing', 'queued', 'failed'];
const STAGES: readonly IngestionStage[] = [
  'uploaded',
  'extracting',
  'chunking',
  'embedding',
  'indexing',
  'complete',
  'failed',
];

/* ------------------------------------------------------------------ */

export function mapCitation(raw: unknown, index: number): Citation {
  const d = asDict(raw);
  const excerpt = asString(d.excerpt ?? d.text ?? d.content);
  const highlight = asNullableString(d.highlight);
  return {
    id: asString(d.id ?? d.citation_id, `citation-${index + 1}`),
    label: asString(d.label ?? d.marker, `S${index + 1}`),
    documentId: asString(d.document_id ?? d.documentId),
    documentTitle: asString(d.document_title ?? d.documentTitle, 'Untitled source'),
    sourceType: oneOf(d.source_type ?? d.sourceType, SOURCE_TYPES, 'other'),
    publisher: asString(d.publisher, 'Unknown publisher'),
    publishedOn: asNullableString(d.published_on ?? d.publishedOn),
    section: asNullableString(d.section ?? d.heading),
    page: asNullableNumber(d.page ?? d.page_number),
    excerpt,
    // Only keep a highlight the UI can actually locate in the excerpt.
    highlight: highlight && excerpt.includes(highlight) ? highlight : null,
    relevance: clamp01(asNumber(d.relevance ?? d.score, 0)),
    url: asNullableString(d.url ?? d.source_url),
    origin: 'live',
  };
}

export function mapSafetyNotice(raw: unknown, index: number): SafetyNotice {
  const d = asDict(raw);
  return {
    id: asString(d.id, `notice-${index + 1}`),
    level: oneOf(d.level ?? d.severity, SAFETY_LEVELS, 'info'),
    title: asString(d.title, 'Safety notice'),
    message: asString(d.message ?? d.text),
  };
}

export function mapAnswer(raw: unknown): StructuredAnswer {
  const d = asDict(raw);
  const citations = asArray(d.citations ?? d.sources).map(mapCitation);
  return {
    summary: asString(d.summary ?? d.short_answer),
    explanation: asStringArray(d.explanation ?? d.body ?? d.paragraphs),
    keyPoints: asStringArray(d.key_points ?? d.keyPoints),
    precautions: asStringArray(d.precautions ?? d.warnings),
    nextSteps: asStringArray(d.next_steps ?? d.nextSteps),
    citations,
    confidence: oneOf(d.confidence, CONFIDENCES, citations.length > 0 ? 'moderate' : 'insufficient'),
    confidenceNote: asNullableString(d.confidence_note ?? d.confidenceNote),
    safetyNotices: asArray(d.safety_notices ?? d.safetyNotices).map(mapSafetyNotice),
    readingLevel: oneOf(d.reading_level ?? d.readingLevel, READING_LEVELS, 'standard'),
    origin: 'live',
  };
}

export function mapMessage(raw: unknown, index: number): ConversationMessage {
  const d = asDict(raw);
  const role = d.role === 'assistant' ? 'assistant' : 'user';
  return {
    id: asString(d.id ?? d.message_id, `message-${index + 1}`),
    role,
    text: role === 'user' ? asString(d.text ?? d.content ?? d.question) : null,
    answer: role === 'assistant' ? mapAnswer(d.answer ?? d) : null,
    createdAt: asString(d.created_at ?? d.createdAt, nowIso()),
    status: 'complete',
    error: null,
    origin: 'live',
  };
}

export function mapConversationSummary(raw: unknown, index: number): ConversationSummary {
  const d = asDict(raw);
  const createdAt = asString(d.created_at ?? d.createdAt, nowIso());
  return {
    id: asString(d.id ?? d.conversation_id, `conversation-${index + 1}`),
    title: asString(d.title, 'Untitled conversation'),
    createdAt,
    updatedAt: asString(d.updated_at ?? d.updatedAt, createdAt),
    messageCount: asNumber(d.message_count ?? d.messageCount, asArray(d.messages).length),
    origin: 'live',
  };
}

export function mapConversation(raw: unknown): Conversation {
  const d = asDict(raw);
  return {
    ...mapConversationSummary(d, 0),
    messages: asArray(d.messages).map(mapMessage),
  };
}

export function mapDocument(raw: unknown, index: number): DocumentRecord {
  const d = asDict(raw);
  return {
    id: asString(d.id ?? d.document_id, `document-${index + 1}`),
    title: asString(d.title ?? d.filename, 'Untitled document'),
    publisher: asString(d.publisher, 'Unknown publisher'),
    category: oneOf(d.category, CATEGORIES, 'general_health'),
    sourceType: oneOf(d.source_type ?? d.sourceType, SOURCE_TYPES, 'other'),
    publishedOn: asNullableString(d.published_on ?? d.publishedOn),
    addedAt: asString(d.added_at ?? d.addedAt ?? d.created_at, nowIso()),
    pageCount: asNullableNumber(d.page_count ?? d.pageCount),
    sizeBytes: asNullableNumber(d.size_bytes ?? d.sizeBytes),
    status: oneOf(d.status, DOC_STATUSES, 'queued'),
    chunkCount: asNullableNumber(d.chunk_count ?? d.chunkCount),
    description: asString(d.description ?? d.summary),
    url: asNullableString(d.url ?? d.source_url),
    failureReason: asNullableString(d.failure_reason ?? d.failureReason),
    origin: 'live',
  };
}

export function mapProcessingStatus(raw: unknown, documentId: string): ProcessingStatus {
  const d = asDict(raw);
  return {
    documentId: asString(d.document_id ?? d.documentId, documentId),
    stage: oneOf(d.stage ?? d.status, STAGES, 'uploaded'),
    progress: clamp01(asNumber(d.progress, 0)),
    message: asString(d.message ?? d.detail, 'Processing'),
    updatedAt: asString(d.updated_at ?? d.updatedAt, nowIso()),
    origin: 'live',
  };
}

export function mapKnowledgeTopic(raw: unknown, index: number): KnowledgeTopic {
  const d = asDict(raw);
  return {
    id: asString(d.id, `topic-${index + 1}`),
    name: asString(d.name ?? d.title, 'Untitled topic'),
    category: oneOf(d.category, CATEGORIES, 'general_health'),
    summary: asString(d.summary ?? d.description),
    questions: asStringArray(d.questions ?? d.starter_questions),
    documentIds: asStringArray(d.document_ids ?? d.documentIds),
    origin: 'live',
  };
}

export function mapHealth(raw: unknown): BackendHealth {
  const d = asDict(raw);
  const components: Record<string, 'ok' | 'degraded' | 'down'> = {};
  for (const [key, value] of Object.entries(asDict(d.components ?? d.services))) {
    components[key] = oneOf(value, ['ok', 'degraded', 'down'] as const, 'degraded');
  }
  return {
    status: d.status === 'degraded' ? 'degraded' : 'ok',
    version: asNullableString(d.version),
    components,
    checkedAt: nowIso(),
  };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
