import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { App } from '@/App';
import { AppProvider } from '@/state/AppProvider';
import { ToastProvider } from '@/components/ui/Toast';
import { setLatestAnswer } from '@/state/latestAnswer';

/** Boots the real app in Demo Mode and walks every section. */
function renderApp(initialPath = '/assistant') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AppProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AppProvider>
    </MemoryRouter>,
  );
}

describe('Application smoke test (Demo Mode)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('ihla.mode', JSON.stringify('demo'));
    // Module-level session state must not leak between tests.
    setLatestAnswer(null);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders the assistant with starter questions and labels demo data', async () => {
    renderApp();
    expect(
      await screen.findByText(/ask a health question, see where the answer came from/i),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/what does a blood pressure reading of 150\/95 mean\?/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/demo/i).length).toBeGreaterThan(0);
  });

  it('answers a question with structured sections and citations', async () => {
    const user = userEvent.setup();
    renderApp();

    const input = await screen.findByLabelText(/ask a health question/i);
    await user.type(input, 'Can I take paracetamol and ibuprofen together?');
    await user.click(screen.getByRole('button', { name: /^ask$/i }));

    const answer = await screen.findByLabelText(/assistant answer/i, undefined, {
      timeout: 6000,
    });
    expect(answer).toBeInTheDocument();
    expect(screen.getByText(/key points/i)).toBeInTheDocument();
    expect(screen.getByText(/important precautions/i)).toBeInTheDocument();
    expect(screen.getByText(/^sources \(\d+\)$/i)).toBeInTheDocument();
  });

  it('opens a source passage when a citation is selected', async () => {
    const user = userEvent.setup();
    renderApp();

    const input = await screen.findByLabelText(/ask a health question/i);
    await user.type(input, 'What is HbA1c?');
    await user.click(screen.getByRole('button', { name: /^ask$/i }));
    await screen.findByLabelText(/assistant answer/i, undefined, { timeout: 6000 });

    // Chips are labelled "<marker> <section>"; the document title is on the
    // tooltip and inside the drawer.
    const chips = screen.getAllByRole('button', { name: /^S1\b/i });
    await user.click(chips[0]);

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    // The drawer still names the source document in full.
    expect(
      screen.getByText(/understanding type 2 diabetes/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/fictional examples written for the demo/i),
    ).toBeInTheDocument();
  });

  it('loads the document library with filters', async () => {
    renderApp('/library');
    expect(
      (await screen.findAllByRole('heading', { name: /document library/i })).length,
    ).toBeGreaterThan(0);
    await waitFor(() =>
      expect(screen.getByText(/managing raised blood pressure/i)).toBeInTheDocument(),
    );
    expect(screen.getByLabelText(/filter by category/i)).toBeInTheDocument();
  });

  it('loads the knowledge workspace', async () => {
    renderApp('/knowledge');
    expect(
      (await screen.findAllByRole('heading', { name: /health knowledge/i })).length,
    ).toBeGreaterThan(0);
    expect((await screen.findAllByText(/blood pressure/i)).length).toBeGreaterThan(0);
  });

  it('loads the safety centre', async () => {
    renderApp('/safety');
    expect(
      await screen.findByText(/in an emergency, do not use this assistant/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/not supported by sources/i)).toBeInTheDocument();
  });

  it('loads settings and is honest about unbuilt features', async () => {
    renderApp('/settings');
    expect(
      (await screen.findAllByRole('heading', { name: /answer preferences/i })).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(/awaiting backend integration/i).length).toBeGreaterThan(0);
  });

  it('shows the evidence explorer empty state before any answer is inspected', async () => {
    renderApp('/evidence');
    expect(await screen.findByText(/no answer selected yet/i)).toBeInTheDocument();
  });
});
