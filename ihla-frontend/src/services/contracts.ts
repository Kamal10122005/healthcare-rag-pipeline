/**
 * The service contract every data source must satisfy.
 *
 * Two implementations exist:
 *   - `DemoService`      — src/services/demo/demoService.ts  (no network)
 *   - `ConnectedService` — src/services/connected/connectedService.ts (HTTP)
 *
 * The UI only ever talks to this interface, obtained via `useService()`.
 * Adding a capability means: add it here, implement it in BOTH services,
 * then use it in the UI. A service that cannot support a capability must
 * throw a `ServiceError` of kind `not_supported` — it must never return
 * fabricated data.
 */

import type {
  BackendHealth,
  Conversation,
  ConversationSummary,
  DocumentCategory,
  DocumentRecord,
  DocumentStatus,
  FeedbackSubmission,
  KnowledgeTopic,
  ProcessingStatus,
  ReadingLevel,
  ServiceMode,
  StructuredAnswer,
} from '@/types/models';

/* ------------------------------ requests ------------------------------ */

export interface AskQuestionRequest {
  question: string;
  /** Omit to start a new conversation. */
  conversationId?: string;
  /** Preferred reading level for the generated answer. */
  readingLevel: ReadingLevel;
}

export interface AskQuestionResponse {
  conversationId: string;
  /** Id assigned to the assistant turn — used when submitting feedback. */
  messageId: string;
  answer: StructuredAnswer;
}

export interface DocumentQuery {
  /** Free-text match across title, publisher and description. */
  search?: string;
  category?: DocumentCategory | 'all';
  status?: DocumentStatus | 'all';
  sort?: 'recent' | 'title' | 'relevance';
}

export interface DocumentListResponse {
  documents: DocumentRecord[];
  total: number;
}

export interface UploadDocumentRequest {
  file: File;
  category: DocumentCategory;
  publisher: string;
}

export interface UploadAccepted {
  documentId: string;
  /** Server-acknowledged receipt time. */
  acceptedAt: string;
}

/* ------------------------------ service ------------------------------- */

export interface HealthAssistantService {
  readonly mode: ServiceMode;

  /** Liveness/readiness probe. Used by the connection indicator in the shell. */
  checkHealth(signal?: AbortSignal): Promise<BackendHealth>;

  askQuestion(
    request: AskQuestionRequest,
    signal?: AbortSignal,
  ): Promise<AskQuestionResponse>;

  listConversations(signal?: AbortSignal): Promise<ConversationSummary[]>;

  getConversation(
    conversationId: string,
    signal?: AbortSignal,
  ): Promise<Conversation>;

  deleteConversation(conversationId: string, signal?: AbortSignal): Promise<void>;

  listDocuments(
    query: DocumentQuery,
    signal?: AbortSignal,
  ): Promise<DocumentListResponse>;

  getDocument(documentId: string, signal?: AbortSignal): Promise<DocumentRecord>;

  uploadDocument(
    request: UploadDocumentRequest,
    signal?: AbortSignal,
  ): Promise<UploadAccepted>;

  getProcessingStatus(
    documentId: string,
    signal?: AbortSignal,
  ): Promise<ProcessingStatus>;

  listKnowledgeTopics(signal?: AbortSignal): Promise<KnowledgeTopic[]>;

  submitFeedback(
    submission: FeedbackSubmission,
    signal?: AbortSignal,
  ): Promise<void>;
}
