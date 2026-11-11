/**
 * Domain models for the Intelligent Health Literacy Assistant.
 *
 * These types are the contract between the UI and *any* data source.
 * Both the demo service and the live backend service produce exactly these
 * shapes, which is what allows every screen to stay source-agnostic.
 *
 * ⚠️  Backend team: changing anything in this file changes the wire contract.
 *     Coordinate before editing — see FRONTEND_INTEGRATION_GUIDE.md.
 */

/** Where a piece of data came from. Rendered in the UI; never inferred or guessed. */
export type DataOrigin = 'demo' | 'live';

/** Which service implementation is currently active. */
export type ServiceMode = 'demo' | 'connected';

/* ------------------------------------------------------------------ */
/* Evidence                                                            */
/* ------------------------------------------------------------------ */

export type SourceType =
  | 'clinical_guideline'
  | 'public_health_authority'
  | 'systematic_review'
  | 'peer_reviewed_article'
  | 'patient_education'
  | 'drug_label'
  | 'other';

export type DocumentCategory =
  | 'cardiometabolic'
  | 'infectious_disease'
  | 'respiratory'
  | 'maternal_child'
  | 'mental_health'
  | 'medication_safety'
  | 'general_health';

/**
 * A single retrieved passage that supports part of an answer.
 * `label` is the human-facing marker shown inline in the answer text (e.g. "S1").
 */
export interface Citation {
  id: string;
  /** Inline marker shown in the answer body, e.g. "S1". */
  label: string;
  documentId: string;
  documentTitle: string;
  sourceType: SourceType;
  publisher: string;
  /** ISO-8601 date, or null when the source states no publication date. */
  publishedOn: string | null;
  /** Section / heading the passage was retrieved from. */
  section: string | null;
  page: number | null;
  /** The retrieved chunk text, verbatim from the indexed document. */
  excerpt: string;
  /**
   * Substring of `excerpt` that most directly supports the claim.
   * Rendered as a highlight. Must be an exact substring or it is ignored.
   */
  highlight: string | null;
  /** Retrieval/rerank score normalised to 0..1. */
  relevance: number;
  url: string | null;
  origin: DataOrigin;
}

/* ------------------------------------------------------------------ */
/* Answers                                                             */
/* ------------------------------------------------------------------ */

/**
 * How well the retrieved evidence supports the answer.
 * `insufficient` is a first-class outcome, not a failure: the product is
 * required to say "the indexed sources do not cover this".
 */
export type EvidenceConfidence = 'high' | 'moderate' | 'low' | 'insufficient';

export type SafetyLevel = 'emergency' | 'caution' | 'info';

export interface SafetyNotice {
  id: string;
  level: SafetyLevel;
  title: string;
  message: string;
  /** Optional call-to-action label, e.g. "Emergency numbers". */
  actionLabel?: string;
}

/**
 * Structured answer payload. The UI renders each section distinctly, so the
 * generator should populate the fields it can and leave the rest empty rather
 * than packing everything into `explanation`.
 */
export interface StructuredAnswer {
  /** One or two sentences. Always present. */
  summary: string;
  /** Body paragraphs in reading order. May be empty for very short answers. */
  explanation: string[];
  keyPoints: string[];
  precautions: string[];
  nextSteps: string[];
  citations: Citation[];
  confidence: EvidenceConfidence;
  /** Shown when confidence is low/insufficient, explaining what is missing. */
  confidenceNote: string | null;
  safetyNotices: SafetyNotice[];
  /** Reading level the answer was written for. */
  readingLevel: ReadingLevel;
  origin: DataOrigin;
}

export type ReadingLevel = 'plain' | 'standard' | 'clinical';

export type MessageRole = 'user' | 'assistant';
export type MessageStatus = 'pending' | 'complete' | 'error';

export interface ConversationMessage {
  id: string;
  role: MessageRole;
  /** Raw text for user turns; null for assistant turns (use `answer`). */
  text: string | null;
  /** Structured payload for assistant turns; null for user turns. */
  answer: StructuredAnswer | null;
  createdAt: string;
  status: MessageStatus;
  /** Present only when `status === 'error'`. Never contains demo content. */
  error: ServiceErrorInfo | null;
  origin: DataOrigin;
}

export interface ConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  origin: DataOrigin;
}

export interface Conversation extends ConversationSummary {
  messages: ConversationMessage[];
}

/* ------------------------------------------------------------------ */
/* Documents                                                           */
/* ------------------------------------------------------------------ */

export type DocumentStatus = 'indexed' | 'processing' | 'queued' | 'failed';

export interface DocumentRecord {
  id: string;
  title: string;
  publisher: string;
  category: DocumentCategory;
  sourceType: SourceType;
  publishedOn: string | null;
  addedAt: string;
  pageCount: number | null;
  sizeBytes: number | null;
  status: DocumentStatus;
  /** Number of indexed chunks; null until ingestion completes. */
  chunkCount: number | null;
  description: string;
  url: string | null;
  /** Populated only when `status === 'failed'`. */
  failureReason: string | null;
  origin: DataOrigin;
}

export type IngestionStage =
  | 'uploaded'
  | 'extracting'
  | 'chunking'
  | 'embedding'
  | 'indexing'
  | 'complete'
  | 'failed';

export interface ProcessingStatus {
  documentId: string;
  stage: IngestionStage;
  /** 0..1 */
  progress: number;
  message: string;
  updatedAt: string;
  origin: DataOrigin;
}

/* ------------------------------------------------------------------ */
/* Knowledge workspace                                                 */
/* ------------------------------------------------------------------ */

export interface KnowledgeTopic {
  id: string;
  name: string;
  category: DocumentCategory;
  summary: string;
  /** Starter questions users can send straight to the assistant. */
  questions: string[];
  /** Documents in the knowledge base that cover this topic. */
  documentIds: string[];
  origin: DataOrigin;
}

/* ------------------------------------------------------------------ */
/* Feedback                                                            */
/* ------------------------------------------------------------------ */

export type FeedbackRating = 'helpful' | 'not_helpful';

export interface FeedbackSubmission {
  conversationId: string;
  messageId: string;
  rating: FeedbackRating;
  /** Structured reason codes, e.g. "missing_evidence". */
  reasons: string[];
  comment: string | null;
}

/* ------------------------------------------------------------------ */
/* Backend health                                                      */
/* ------------------------------------------------------------------ */

export interface BackendHealth {
  status: 'ok' | 'degraded';
  /** Free-form version string reported by the API, if any. */
  version: string | null;
  /** Per-subsystem readiness as reported by the backend. */
  components: Record<string, 'ok' | 'degraded' | 'down'>;
  checkedAt: string;
}

/* ------------------------------------------------------------------ */
/* Errors                                                              */
/* ------------------------------------------------------------------ */

export type ServiceErrorKind =
  | 'network'
  | 'timeout'
  | 'http'
  | 'parse'
  | 'aborted'
  | 'not_configured'
  | 'not_supported';

/** Serialisable error description stored in state and rendered by the UI. */
export interface ServiceErrorInfo {
  kind: ServiceErrorKind;
  /** Short, user-facing sentence. Never blames the user. */
  message: string;
  /** Developer-facing detail: status text, parse error, endpoint path. */
  detail: string | null;
  status: number | null;
  endpoint: string | null;
  /** Whether the UI should offer a retry affordance. */
  retryable: boolean;
  occurredAt: string;
}
