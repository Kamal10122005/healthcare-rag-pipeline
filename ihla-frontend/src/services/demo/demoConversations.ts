/**
 * Seed conversations so Demo Mode opens with history rather than an empty rail.
 * All content is demonstration data — see `demoDocuments.ts`.
 */

import type { Conversation, ConversationMessage } from '@/types/models';
import { demoAnswerLibrary } from './demoAnswers';

const DAY = 24 * 60 * 60 * 1000;

function iso(offsetMs: number): string {
  return new Date(Date.now() - offsetMs).toISOString();
}

function pair(
  idPrefix: string,
  question: string,
  answer: ConversationMessage['answer'],
  offsetMs: number,
): ConversationMessage[] {
  return [
    {
      id: `${idPrefix}-u`,
      role: 'user',
      text: question,
      answer: null,
      createdAt: iso(offsetMs),
      status: 'complete',
      error: null,
      origin: 'demo',
    },
    {
      id: `${idPrefix}-a`,
      role: 'assistant',
      text: null,
      answer,
      createdAt: iso(offsetMs - 4_000),
      status: 'complete',
      error: null,
      origin: 'demo',
    },
  ];
}

export function seedDemoConversations(): Conversation[] {
  const bp = pair(
    'seed-bp',
    'What does a blood pressure reading of 150/95 mean?',
    demoAnswerLibrary.bloodPressureAnswer,
    2 * DAY,
  );
  const bpFollowUp = pair(
    'seed-bp-2',
    'Which lifestyle changes affect blood pressure most?',
    demoAnswerLibrary.bloodPressureAnswer,
    2 * DAY - 90_000,
  );

  const abx = pair(
    'seed-abx',
    'Do I need antibiotics for a cold?',
    demoAnswerLibrary.antibioticsAnswer,
    6 * 60 * 60 * 1000,
  );

  const unknown = pair(
    'seed-unknown',
    'What does the guideline say about altitude sickness?',
    demoAnswerLibrary.insufficientAnswer,
    40 * 60 * 1000,
  );

  const conversations: Conversation[] = [
    {
      id: 'seed-conversation-unknown',
      title: 'What does the guideline say about altitude sickness?',
      createdAt: unknown[0].createdAt,
      updatedAt: unknown[1].createdAt,
      messageCount: unknown.length,
      origin: 'demo',
      messages: unknown,
    },
    {
      id: 'seed-conversation-abx',
      title: 'Do I need antibiotics for a cold?',
      createdAt: abx[0].createdAt,
      updatedAt: abx[1].createdAt,
      messageCount: abx.length,
      origin: 'demo',
      messages: abx,
    },
    {
      id: 'seed-conversation-bp',
      title: 'Blood pressure reading of 150/95',
      createdAt: bp[0].createdAt,
      updatedAt: bpFollowUp[1].createdAt,
      messageCount: bp.length + bpFollowUp.length,
      origin: 'demo',
      messages: [...bp, ...bpFollowUp],
    },
  ];

  return conversations;
}
