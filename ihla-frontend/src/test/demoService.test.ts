import { beforeEach, describe, expect, it } from 'vitest';
import { DemoService } from '@/services/demo/demoService';
import { resolveDemoAnswer } from '@/services/demo/demoAnswers';
import { splitOnHighlight, tokenizeCitations, formatBytes } from '@/lib/format';
import { answerToPlainText } from '@/lib/clipboard';

describe('DemoService', () => {
  let service: DemoService;

  beforeEach(() => {
    localStorage.clear();
    service = new DemoService(0);
    service.reset();
  });

  it('stamps every answer as demo data', async () => {
    const response = await service.askQuestion({
      question: 'What is HbA1c and what do the numbers mean?',
      readingLevel: 'standard',
    });
    expect(response.answer.origin).toBe('demo');
    expect(response.answer.citations.every((c) => c.origin === 'demo')).toBe(true);
  });

  it('threads follow-up questions into the same conversation', async () => {
    const first = await service.askQuestion({
      question: 'What does a blood pressure reading of 150/95 mean?',
      readingLevel: 'standard',
    });
    const second = await service.askQuestion({
      question: 'And how should I measure it at home?',
      conversationId: first.conversationId,
      readingLevel: 'standard',
    });

    expect(second.conversationId).toBe(first.conversationId);
    const conversation = await service.getConversation(first.conversationId);
    expect(conversation.messages).toHaveLength(4);
  });

  it('rejects an empty question instead of inventing an answer', async () => {
    await expect(
      service.askQuestion({ question: '   ', readingLevel: 'standard' }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('filters documents by search term and category', async () => {
    const all = await service.listDocuments({});
    expect(all.documents.length).toBeGreaterThan(0);

    const searched = await service.listDocuments({ search: 'antibiotic' });
    expect(searched.documents.length).toBeGreaterThan(0);
    expect(
      searched.documents.every((doc) =>
        `${doc.title} ${doc.publisher} ${doc.description}`
          .toLowerCase()
          .includes('antibiotic'),
      ),
    ).toBe(true);

    const filtered = await service.listDocuments({ category: 'medication_safety' });
    expect(filtered.documents.every((doc) => doc.category === 'medication_safety')).toBe(true);
  });

  it('deletes a conversation and then reports it missing', async () => {
    const { conversationId } = await service.askQuestion({
      question: 'Do I need antibiotics for a cold?',
      readingLevel: 'standard',
    });
    await service.deleteConversation(conversationId);
    await expect(service.getConversation(conversationId)).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe('resolveDemoAnswer', () => {
  it('intercepts emergency questions without retrieving anything', () => {
    const answer = resolveDemoAnswer('I have chest pain radiating down my arm');
    expect(answer.safetyNotices.some((n) => n.level === 'emergency')).toBe(true);
    expect(answer.citations).toHaveLength(0);
    expect(answer.confidence).toBe('insufficient');
  });

  it('returns an insufficient-evidence answer for uncovered topics', () => {
    const answer = resolveDemoAnswer('What does the corpus say about deep sea diving?');
    expect(answer.confidence).toBe('insufficient');
    expect(answer.citations).toHaveLength(0);
  });

  it('returns cited answers for covered topics', () => {
    const answer = resolveDemoAnswer('Can I take paracetamol and ibuprofen together?');
    expect(answer.citations.length).toBeGreaterThan(0);
    expect(answer.precautions.length).toBeGreaterThan(0);
  });

  it('only produces highlights that exist inside their excerpt', () => {
    for (const question of [
      'blood pressure',
      'antibiotics',
      'hba1c',
      'fever in my child',
      'paracetamol',
    ]) {
      for (const citation of resolveDemoAnswer(question).citations) {
        if (citation.highlight) {
          expect(citation.excerpt).toContain(citation.highlight);
        }
      }
    }
  });
});

describe('formatting helpers', () => {
  it('splits an excerpt around its highlight', () => {
    const result = splitOnHighlight('abc DEF ghi', 'DEF');
    expect(result).toEqual({ before: 'abc ', match: 'DEF', after: ' ghi' });
  });

  it('ignores a highlight that is not present', () => {
    expect(splitOnHighlight('abc', 'zzz')).toEqual({ before: 'abc', match: '', after: '' });
  });

  it('tokenizes inline citation markers', () => {
    expect(tokenizeCitations('Water helps [S1] a lot.')).toEqual([
      { type: 'text', value: 'Water helps ' },
      { type: 'citation', label: 'S1' },
      { type: 'text', value: ' a lot.' },
    ]);
  });

  it('formats byte sizes', () => {
    expect(formatBytes(null)).toBe('Size unknown');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1024 * 1024 * 3)).toBe('3.0 MB');
  });
});

describe('answerToPlainText', () => {
  it('includes sources and the demo warning when copying demo answers', () => {
    const answer = resolveDemoAnswer('What is HbA1c?');
    const text = answerToPlainText(answer, 'What is HbA1c?', 'Test App');
    expect(text).toContain('Sources:');
    expect(text).toContain('Demo Mode');
    expect(text).toContain('not medical advice');
  });

  it('states plainly when there are no sources', () => {
    const answer = resolveDemoAnswer('deep sea diving physiology');
    const text = answerToPlainText(answer, 'q', 'Test App');
    expect(text).toContain('Sources: none');
  });
});
