/**
 * Demo Mode: a complete, self-contained implementation of the service
 * contract that performs no network I/O.
 *
 * It exists so the product can be demonstrated, designed against and tested
 * before the backend exists. Everything it returns is stamped
 * `origin: 'demo'`, and the UI renders a demonstration-data marker wherever
 * that appears.
 *
 * State (conversations, uploads) lives in memory for the session and is
 * mirrored to localStorage so a page refresh does not wipe a live demo.
 */

import { appConfig } from '@/config/env';
import type {
  AskQuestionRequest,
  AskQuestionResponse,
  DocumentListResponse,
  DocumentQuery,
  HealthAssistantService,
  UploadAccepted,
  UploadDocumentRequest,
} from '@/services/contracts';
import { ServiceError } from '@/services/errors';
import type {
  BackendHealth,
  Conversation,
  ConversationMessage,
  ConversationSummary,
  DocumentRecord,
  FeedbackSubmission,
  KnowledgeTopic,
  ProcessingStatus,
  ServiceMode,
  StructuredAnswer,
} from '@/types/models';
import { resolveDemoAnswer } from './demoAnswers';
import { demoDocuments, demoKnowledgeTopics } from './demoDocuments';
import { seedDemoConversations } from './demoConversations';

const STORAGE_KEY = 'ihla.demo.state.v1';

interface DemoState {
  conversations: Conversation[];
  uploads: DocumentRecord[];
  /** Feedback captured during the session, so the UI can reflect what was sent. */
  feedback: FeedbackSubmission[];
}

function createInitialState(): DemoState {
  return { conversations: seedDemoConversations(), uploads: [], feedback: [] };
}

function loadState(): DemoState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw) as Partial<DemoState>;
    return {
      conversations: Array.isArray(parsed.conversations)
        ? parsed.conversations
        : seedDemoConversations(),
      uploads: Array.isArray(parsed.uploads) ? parsed.uploads : [],
      feedback: Array.isArray(parsed.feedback) ? parsed.feedback : [],
    };
  } catch {
    // Private browsing, disabled storage, or corrupted payload — start clean.
    return createInitialState();
  }
}

function saveState(state: DemoState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* Storage is a convenience here, never a requirement. */
  }
}

const delay = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new ServiceError('aborted'));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      reject(new ServiceError('aborted'));
    }
    signal?.addEventListener('abort', onAbort, { once: true });
  });

const uid = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function titleFromQuestion(question: string): string {
  const cleaned = question.trim().replace(/\s+/g, ' ');
  if (cleaned.length <= 52) return cleaned;
  return `${cleaned.slice(0, 49).trimEnd()}…`;
}

export class DemoService implements HealthAssistantService {
  readonly mode: ServiceMode = 'demo';

  private state: DemoState;

  /** Simulated ingestion progress for documents uploaded during the session. */
  private readonly uploadStartedAt = new Map<string, number>();

  constructor(private readonly latencyMs: number = appConfig.demoLatencyMs) {
    this.state = loadState();
  }

  /** Test/demo helper: wipes persisted demo state. */
  reset(): void {
    this.state = createInitialState();
    this.uploadStartedAt.clear();
    saveState(this.state);
  }

  async checkHealth(signal?: AbortSignal): Promise<BackendHealth> {
    await delay(120, signal);
    return {
      status: 'ok',
      version: `demo-${appConfig.buildVersion}`,
      components: {
        retrieval: 'ok',
        generation: 'ok',
        vector_store: 'ok',
        document_store: 'ok',
      },
      checkedAt: new Date().toISOString(),
    };
  }

  async askQuestion(
    request: AskQuestionRequest,
    signal?: AbortSignal,
  ): Promise<AskQuestionResponse> {
    const question = request.question.trim();
    if (!question) {
      throw new ServiceError('http', {
        status: 400,
        message: 'Enter a question before sending.',
      });
    }

    // Long enough to exercise the thinking state; scaled a little by length.
    await delay(this.latencyMs + Math.min(question.length * 6, 700), signal);

    const answer: StructuredAnswer = {
      ...resolveDemoAnswer(question),
      readingLevel: request.readingLevel,
    };

    const now = new Date().toISOString();
    const conversation = request.conversationId
      ? this.findConversation(request.conversationId)
      : null;

    const userMessage: ConversationMessage = {
      id: uid('msg'),
      role: 'user',
      text: question,
      answer: null,
      createdAt: now,
      status: 'complete',
      error: null,
      origin: 'demo',
    };

    const assistantMessage: ConversationMessage = {
      id: uid('msg'),
      role: 'assistant',
      text: null,
      answer,
      createdAt: new Date(Date.now() + 1).toISOString(),
      status: 'complete',
      error: null,
      origin: 'demo',
    };

    if (conversation) {
      conversation.messages.push(userMessage, assistantMessage);
      conversation.updatedAt = assistantMessage.createdAt;
      conversation.messageCount = conversation.messages.length;
    } else {
      const created: Conversation = {
        id: uid('conv'),
        title: titleFromQuestion(question),
        createdAt: now,
        updatedAt: assistantMessage.createdAt,
        messageCount: 2,
        origin: 'demo',
        messages: [userMessage, assistantMessage],
      };
      this.state.conversations.unshift(created);
      saveState(this.state);
      return { conversationId: created.id, messageId: assistantMessage.id, answer };
    }

    saveState(this.state);
    return {
      conversationId: conversation.id,
      messageId: assistantMessage.id,
      answer,
    };
  }

  async listConversations(signal?: AbortSignal): Promise<ConversationSummary[]> {
    await delay(160, signal);
    return [...this.state.conversations]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map(({ messages: _messages, ...summary }) => ({
        ...summary,
        messageCount: _messages.length,
      }));
  }

  async getConversation(conversationId: string, signal?: AbortSignal): Promise<Conversation> {
    await delay(160, signal);
    const conversation = this.findConversation(conversationId);
    if (!conversation) {
      throw new ServiceError('http', {
        status: 404,
        message: 'That conversation is no longer available in this demo session.',
      });
    }
    // Return a copy so UI mutations cannot corrupt the store.
    return structuredCloneSafe(conversation);
  }

  async deleteConversation(conversationId: string, signal?: AbortSignal): Promise<void> {
    await delay(140, signal);
    const before = this.state.conversations.length;
    this.state.conversations = this.state.conversations.filter(
      (conversation) => conversation.id !== conversationId,
    );
    if (this.state.conversations.length === before) {
      throw new ServiceError('http', { status: 404, message: 'Conversation not found.' });
    }
    saveState(this.state);
  }

  async listDocuments(
    query: DocumentQuery,
    signal?: AbortSignal,
  ): Promise<DocumentListResponse> {
    await delay(220, signal);

    const all = [...this.state.uploads, ...demoDocuments].map((doc) =>
      this.withSimulatedProgress(doc),
    );

    const search = query.search?.trim().toLowerCase() ?? '';
    let filtered = all.filter((doc) => {
      if (query.category && query.category !== 'all' && doc.category !== query.category)
        return false;
      if (query.status && query.status !== 'all' && doc.status !== query.status) return false;
      if (!search) return true;
      return (
        doc.title.toLowerCase().includes(search) ||
        doc.publisher.toLowerCase().includes(search) ||
        doc.description.toLowerCase().includes(search)
      );
    });

    if (query.sort === 'title') {
      filtered = filtered.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      filtered = filtered.sort((a, b) => b.addedAt.localeCompare(a.addedAt));
    }

    return { documents: filtered, total: filtered.length };
  }

  async getDocument(documentId: string, signal?: AbortSignal): Promise<DocumentRecord> {
    await delay(140, signal);
    const found = [...this.state.uploads, ...demoDocuments].find(
      (doc) => doc.id === documentId,
    );
    if (!found) {
      throw new ServiceError('http', { status: 404, message: 'Document not found.' });
    }
    return this.withSimulatedProgress(found);
  }

  async uploadDocument(
    request: UploadDocumentRequest,
    signal?: AbortSignal,
  ): Promise<UploadAccepted> {
    if (request.file.size > appConfig.maxUploadBytes) {
      throw new ServiceError('http', {
        status: 413,
        message: `That file is larger than the ${Math.round(
          appConfig.maxUploadBytes / (1024 * 1024),
        )} MB limit configured for uploads.`,
      });
    }

    await delay(this.latencyMs, signal);

    const id = uid('doc');
    const now = new Date().toISOString();

    this.state.uploads.unshift({
      id,
      title: request.file.name.replace(/\.pdf$/i, ''),
      publisher: request.publisher || 'Uploaded in demo session',
      category: request.category,
      sourceType: 'other',
      publishedOn: null,
      addedAt: now,
      pageCount: null,
      sizeBytes: request.file.size,
      status: 'processing',
      chunkCount: null,
      description:
        'Uploaded during this demonstration session. No file was transmitted and no text was extracted — ingestion is simulated so the processing states can be reviewed.',
      url: null,
      failureReason: null,
      origin: 'demo',
    });

    this.uploadStartedAt.set(id, Date.now());
    saveState(this.state);

    return { documentId: id, acceptedAt: now };
  }

  async getProcessingStatus(
    documentId: string,
    signal?: AbortSignal,
  ): Promise<ProcessingStatus> {
    await delay(120, signal);

    const document = [...this.state.uploads, ...demoDocuments].find(
      (doc) => doc.id === documentId,
    );
    if (!document) {
      throw new ServiceError('http', { status: 404, message: 'Document not found.' });
    }

    if (document.status === 'failed') {
      return {
        documentId,
        stage: 'failed',
        progress: 0,
        message: document.failureReason ?? 'Ingestion failed.',
        updatedAt: new Date().toISOString(),
        origin: 'demo',
      };
    }

    if (document.status === 'indexed') {
      return {
        documentId,
        stage: 'complete',
        progress: 1,
        message: `Indexed${document.chunkCount ? ` — ${document.chunkCount} passages available for retrieval` : ''}.`,
        updatedAt: document.addedAt,
        origin: 'demo',
      };
    }

    const progress = this.simulatedProgress(documentId);
    const stage: ProcessingStatus['stage'] =
      progress < 0.25
        ? 'extracting'
        : progress < 0.5
          ? 'chunking'
          : progress < 0.8
            ? 'embedding'
            : progress < 1
              ? 'indexing'
              : 'complete';

    const messages: Record<ProcessingStatus['stage'], string> = {
      uploaded: 'Queued for processing.',
      extracting: 'Extracting text and layout from the document.',
      chunking: 'Splitting the document into retrievable passages.',
      embedding: 'Generating embeddings for each passage.',
      indexing: 'Writing passages to the vector index.',
      complete: 'Indexing complete.',
      failed: 'Ingestion failed.',
    };

    return {
      documentId,
      stage,
      progress,
      message: messages[stage],
      updatedAt: new Date().toISOString(),
      origin: 'demo',
    };
  }

  async listKnowledgeTopics(signal?: AbortSignal): Promise<KnowledgeTopic[]> {
    await delay(180, signal);
    return demoKnowledgeTopics;
  }

  async submitFeedback(submission: FeedbackSubmission, signal?: AbortSignal): Promise<void> {
    await delay(260, signal);
    this.state.feedback.push(submission);
    saveState(this.state);
  }

  /* --------------------------- internals --------------------------- */

  private findConversation(id: string): Conversation | null {
    return this.state.conversations.find((conversation) => conversation.id === id) ?? null;
  }

  /** Uploads progress over ~20s so the processing UI is observable. */
  private simulatedProgress(documentId: string): number {
    const startedAt = this.uploadStartedAt.get(documentId);
    if (startedAt === undefined) return 0.1;
    const elapsed = Date.now() - startedAt;
    return Math.min(1, elapsed / 20_000);
  }

  private withSimulatedProgress(document: DocumentRecord): DocumentRecord {
    if (document.status !== 'processing' || !this.uploadStartedAt.has(document.id)) {
      return document;
    }
    if (this.simulatedProgress(document.id) >= 1) {
      const completed: DocumentRecord = {
        ...document,
        status: 'indexed',
        chunkCount: Math.max(12, Math.round((document.sizeBytes ?? 400_000) / 9_000)),
      };
      const index = this.state.uploads.findIndex((doc) => doc.id === document.id);
      if (index >= 0) {
        this.state.uploads[index] = completed;
        saveState(this.state);
      }
      return completed;
    }
    return document;
  }
}

/** structuredClone is not available in every test environment. */
function structuredCloneSafe<T>(value: T): T {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}
