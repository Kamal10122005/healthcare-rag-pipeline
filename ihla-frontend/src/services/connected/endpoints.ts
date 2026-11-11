/**
 * PROPOSED backend endpoints.
 *
 * ⚠️  These paths are a proposal from the frontend, not endpoints that are
 *     known to exist. Nothing in this file has been verified against a running
 *     backend. The backend team should either implement these paths or change
 *     the values here to match the real API — this is the ONLY file that needs
 *     editing to re-point the frontend at different routes.
 *
 * Request/response bodies are documented in FRONTEND_INTEGRATION_GUIDE.md.
 */

export const endpoints = {
  health: '/health',

  ask: '/chat/ask',
  conversations: '/chat/conversations',
  conversation: (id: string) => `/chat/conversations/${encodeURIComponent(id)}`,

  documents: '/documents',
  document: (id: string) => `/documents/${encodeURIComponent(id)}`,
  documentUpload: '/documents/upload',
  documentStatus: (id: string) =>
    `/documents/${encodeURIComponent(id)}/status`,

  knowledgeTopics: '/knowledge/topics',

  feedback: '/feedback',
} as const;
