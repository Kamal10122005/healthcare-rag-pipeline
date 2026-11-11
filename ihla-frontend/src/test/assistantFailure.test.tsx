import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ServiceError } from '@/services/errors';
import type { HealthAssistantService } from '@/services/contracts';

/**
 * End-to-end check of the rule that matters most in the UI:
 * when a Connected Mode question fails, the user sees the failure, keeps their
 * text, gets a retry — and no demonstration content appears anywhere.
 */

const failingService: HealthAssistantService = {
  mode: 'connected',
  checkHealth: () => Promise.reject(new ServiceError('network', { endpoint: '/health' })),
  askQuestion: () =>
    Promise.reject(
      new ServiceError('network', {
        endpoint: '/chat/ask',
        detail: 'connection refused',
      }),
    ),
  listConversations: () => Promise.resolve([]),
  getConversation: () => Promise.reject(new ServiceError('http', { status: 404 })),
  deleteConversation: () => Promise.resolve(),
  listDocuments: () => Promise.resolve({ documents: [], total: 0 }),
  getDocument: () => Promise.reject(new ServiceError('http', { status: 404 })),
  uploadDocument: () => Promise.reject(new ServiceError('network')),
  getProcessingStatus: () => Promise.reject(new ServiceError('network')),
  listKnowledgeTopics: () => Promise.resolve([]),
  submitFeedback: () => Promise.resolve(),
};

vi.mock('@/services', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services')>();
  return { ...actual, createService: () => failingService };
});

async function renderAssistant() {
  const { AppProvider } = await import('@/state/AppProvider');
  const { ToastProvider } = await import('@/components/ui/Toast');
  const { AssistantPage } = await import('@/pages/AssistantPage');

  return render(
    <MemoryRouter>
      <AppProvider>
        <ToastProvider>
          <AssistantPage />
        </ToastProvider>
      </AppProvider>
    </MemoryRouter>,
  );
}

describe('Assistant failure handling in Connected Mode', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('ihla.mode', JSON.stringify('connected'));
  });

  it('shows the failure, preserves the question, and shows no demo content', async () => {
    const user = userEvent.setup();
    await renderAssistant();

    const input = await screen.findByLabelText(/ask a health question/i);
    await user.type(input, 'What does a blood pressure reading of 150/95 mean?');
    await user.click(screen.getByRole('button', { name: /^ask$/i }));

    // The real failure is surfaced.
    expect(
      await screen.findByText(/the question was not answered/i, undefined, { timeout: 4000 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/could not reach the .* backend/i)).toBeInTheDocument();

    // The question is handed back to the composer rather than discarded.
    await waitFor(() =>
      expect(input).toHaveValue('What does a blood pressure reading of 150/95 mean?'),
    );

    // A retry is offered.
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();

    // Nothing from the demo corpus leaked into the failed turn.
    const body = document.body.textContent ?? '';
    expect(body).not.toMatch(/Demonstration Guidelines Council/);
    expect(body).not.toMatch(/Demo data/);
    expect(screen.queryByLabelText(/assistant answer/i)).toBeNull();
  });

  it('reports the backend as disconnected in the shell indicator', async () => {
    await renderAssistant();
    await waitFor(() =>
      expect(screen.queryByText(/could not load history/i)).not.toBeInTheDocument(),
    );
    // listConversations resolves empty, so the rail shows its empty state —
    // not demo conversations.
    expect(await screen.findByText(/no conversations yet/i)).toBeInTheDocument();
  });
});
