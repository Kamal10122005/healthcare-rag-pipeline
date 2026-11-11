/**
 * Connected Mode: talks to the real FastAPI backend.
 *
 * SAFETY INVARIANT — do not break this:
 *   This service NEVER imports from `src/services/demo`. If a request fails,
 *   it throws. It does not return sample data, cached demo content, or a
 *   "best effort" placeholder. The UI is responsible for showing the failure.
 *
 * There is a test that asserts this module contains no demo import.
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
import { endpoints } from './endpoints';
import { HttpClient, httpClient } from './httpClient';
import {
  mapAnswer,
  mapConversation,
  mapConversationSummary,
  mapDocument,
  mapHealth,
  mapKnowledgeTopic,
  mapProcessingStatus,
} from './mappers';
import type {
  BackendHealth,
  Conversation,
  ConversationSummary,
  DocumentRecord,
  FeedbackSubmission,
  KnowledgeTopic,
  ProcessingStatus,
  ServiceMode,
} from '@/types/models';

export class ConnectedService implements HealthAssistantService {
  readonly mode: ServiceMode = 'connected';

  constructor(private readonly http: HttpClient = httpClient) {}

  async checkHealth(signal?: AbortSignal): Promise<BackendHealth> {
    const raw = await this.http.request<unknown>(endpoints.health, {
      signal,
      timeoutMs: 8_000,
    });
    return mapHealth(raw);
  }

  async askQuestion(
    request: AskQuestionRequest,
    signal?: AbortSignal,
  ): Promise<AskQuestionResponse> {
    const raw = await this.http.request<Record<string, unknown>>(endpoints.ask, {
      method: 'POST',
      signal,
      timeoutMs: appConfig.askTimeoutMs,
      body: {
        question: request.question,
        conversation_id: request.conversationId ?? null,
        reading_level: request.readingLevel,
      },
    });

    const conversationId = pickString(raw, ['conversation_id', 'conversationId']);
    const messageId = pickString(raw, ['message_id', 'messageId']);

    if (!conversationId || !messageId) {
      throw new ServiceError('parse', {
        endpoint: endpoints.ask,
        detail:
          'Response is missing conversation_id and/or message_id, which the UI needs to thread the conversation and attach feedback.',
      });
    }

    return {
      conversationId,
      messageId,
      answer: mapAnswer(raw.answer ?? raw),
    };
  }

  async listConversations(signal?: AbortSignal): Promise<ConversationSummary[]> {
    const raw = await this.http.request<unknown>(endpoints.conversations, { signal });
    return unwrapList(raw, 'conversations').map(mapConversationSummary);
  }

  async getConversation(conversationId: string, signal?: AbortSignal): Promise<Conversation> {
    const raw = await this.http.request<unknown>(endpoints.conversation(conversationId), {
      signal,
    });
    return mapConversation(raw);
  }

  async deleteConversation(conversationId: string, signal?: AbortSignal): Promise<void> {
    await this.http.request<void>(endpoints.conversation(conversationId), {
      method: 'DELETE',
      expectEmpty: true,
      signal,
    });
  }

  async listDocuments(
    query: DocumentQuery,
    signal?: AbortSignal,
  ): Promise<DocumentListResponse> {
    const raw = await this.http.request<unknown>(endpoints.documents, {
      signal,
      query: {
        search: query.search,
        category: query.category && query.category !== 'all' ? query.category : undefined,
        status: query.status && query.status !== 'all' ? query.status : undefined,
        sort: query.sort,
      },
    });

    const documents = unwrapList(raw, 'documents').map(mapDocument);
    const total =
      typeof (raw as Record<string, unknown>)?.total === 'number'
        ? ((raw as Record<string, unknown>).total as number)
        : documents.length;

    return { documents, total };
  }

  async getDocument(documentId: string, signal?: AbortSignal): Promise<DocumentRecord> {
    const raw = await this.http.request<unknown>(endpoints.document(documentId), { signal });
    return mapDocument(raw, 0);
  }

  async uploadDocument(
    request: UploadDocumentRequest,
    signal?: AbortSignal,
  ): Promise<UploadAccepted> {
    const form = new FormData();
    form.append('file', request.file, request.file.name);
    form.append('category', request.category);
    form.append('publisher', request.publisher);

    const raw = await this.http.request<Record<string, unknown>>(endpoints.documentUpload, {
      method: 'POST',
      formData: form,
      signal,
    });

    const documentId = pickString(raw, ['document_id', 'documentId', 'id']);
    if (!documentId) {
      throw new ServiceError('parse', {
        endpoint: endpoints.documentUpload,
        detail: 'Upload response did not include a document id, so ingestion cannot be tracked.',
      });
    }

    return {
      documentId,
      acceptedAt: pickString(raw, ['accepted_at', 'acceptedAt']) ?? new Date().toISOString(),
    };
  }

  async getProcessingStatus(
    documentId: string,
    signal?: AbortSignal,
  ): Promise<ProcessingStatus> {
    const raw = await this.http.request<unknown>(endpoints.documentStatus(documentId), {
      signal,
    });
    return mapProcessingStatus(raw, documentId);
  }

  async listKnowledgeTopics(signal?: AbortSignal): Promise<KnowledgeTopic[]> {
    const raw = await this.http.request<unknown>(endpoints.knowledgeTopics, { signal });
    return unwrapList(raw, 'topics').map(mapKnowledgeTopic);
  }

  async submitFeedback(submission: FeedbackSubmission, signal?: AbortSignal): Promise<void> {
    await this.http.request<void>(endpoints.feedback, {
      method: 'POST',
      expectEmpty: true,
      signal,
      body: {
        conversation_id: submission.conversationId,
        message_id: submission.messageId,
        rating: submission.rating,
        reasons: submission.reasons,
        comment: submission.comment,
      },
    });
  }
}

/** Accepts either a bare array or `{ <key>: [...] }`. */
function unwrapList(raw: unknown, key: string): unknown[] {
  if (Array.isArray(raw)) return raw;
  const container = raw as Record<string, unknown> | null;
  const value = container?.[key] ?? container?.items ?? container?.results;
  return Array.isArray(value) ? value : [];
}

function pickString(source: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return null;
}
