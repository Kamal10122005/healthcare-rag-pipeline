import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ConnectedService } from '@/services/connected/connectedService';
import { HttpClient } from '@/services/connected/httpClient';
import { ServiceError } from '@/services/errors';
import { createService } from '@/services';
import { appConfig } from '@/config/env';

/** A service pointed at a configured (but stubbed) backend. */
const makeService = () =>
  new ConnectedService(new HttpClient({ ...appConfig, apiBaseUrl: 'https://api.test' }));

/**
 * The safety rule from the brief:
 *   "A failed Connected Mode request must NEVER silently fall back to Demo
 *    Mode content."
 *
 * These tests enforce it three ways: structurally (no demo import reachable
 * from the connected service), behaviourally (a failed request throws rather
 * than resolving with content), and at the resolver (mode decides the
 * implementation, with no error branch).
 */

const SRC = path.resolve(__dirname, '..');

describe('Connected Mode cannot reach demo content', () => {
  const connectedFiles = [
    'services/connected/connectedService.ts',
    'services/connected/httpClient.ts',
    'services/connected/mappers.ts',
    'services/connected/endpoints.ts',
  ];

  it.each(connectedFiles)('%s imports nothing from services/demo', (file) => {
    const source = readFileSync(path.join(SRC, file), 'utf8');
    expect(source).not.toMatch(/from\s+['"].*services\/demo/);
    expect(source).not.toMatch(/import\(['"].*services\/demo/);
    expect(source).not.toMatch(/demoAnswers|demoDocuments|DemoService/);
  });
});

describe('ConnectedService failure behaviour', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('throws a network ServiceError when fetch rejects — it does not resolve with content', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    );

    const service = makeService();

    await expect(
      service.askQuestion({ question: 'What is HbA1c?', readingLevel: 'standard' }),
    ).rejects.toBeInstanceOf(ServiceError);
  });

  it('throws on a 500 rather than returning a demo answer', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ detail: 'retriever unavailable' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
      ),
    );

    const service = makeService();
    const error = await service
      .askQuestion({ question: 'Do I need antibiotics?', readingLevel: 'standard' })
      .then(() => null)
      .catch((caught: unknown) => caught as ServiceError);

    expect(error).toBeInstanceOf(ServiceError);
    expect(error?.kind).toBe('http');
    expect(error?.status).toBe(500);
    expect(error?.retryable).toBe(true);
  });

  it('throws parse errors when the backend omits required identifiers', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ answer: { summary: 'Something' } }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
      ),
    );

    const service = makeService();
    await expect(
      service.askQuestion({ question: 'Anything', readingLevel: 'standard' }),
    ).rejects.toMatchObject({ kind: 'parse' });
  });
});

describe('createService', () => {
  it('returns a service whose mode matches what was requested', () => {
    expect(createService('demo').mode).toBe('demo');
    expect(createService('connected').mode).toBe('connected');
  });
});
