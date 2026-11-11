/**
 * Demonstration knowledge base.
 *
 * ⚠️  IMPORTANT — READ BEFORE EDITING
 *
 * Every publisher name here is deliberately fictional ("Demonstration
 * Guidelines Council", "Sample Public Health Agency", ...) and every excerpt
 * was written for this demo. Nothing in this file is a quotation from, or an
 * attribution to, a real medical guideline, agency or journal.
 *
 * This is a product requirement, not a stylistic choice: the application must
 * never imply that mock evidence is real. If you replace this content, keep
 * the publishers fictional and the URLs null, or wire up Connected Mode and
 * use the real corpus instead.
 *
 * The health information itself is kept consistent with mainstream, widely
 * accepted public guidance so the demo is not medically misleading — but it is
 * still illustrative text, not a source.
 */

import type { DocumentRecord, KnowledgeTopic } from '@/types/models';

export const DEMO_DISCLAIMER =
  'Demonstration data. Publishers, documents and excerpts below are fictional examples written for this demo — they are not real medical sources and must not be cited.';

export const demoDocuments: DocumentRecord[] = [
  {
    id: 'doc-bp-001',
    title: 'Managing Raised Blood Pressure in Adults — Demonstration Guideline',
    publisher: 'Demonstration Guidelines Council',
    category: 'cardiometabolic',
    sourceType: 'clinical_guideline',
    publishedOn: '2025-03-18',
    addedAt: '2026-09-02T09:12:00.000Z',
    pageCount: 86,
    sizeBytes: 3_412_880,
    status: 'indexed',
    chunkCount: 412,
    description:
      'Sample guideline covering measurement technique, diagnostic thresholds, lifestyle measures and when to seek clinical review for raised blood pressure.',
    url: null,
    failureReason: null,
    origin: 'demo',
  },
  {
    id: 'doc-dm-002',
    title: 'Understanding Type 2 Diabetes and HbA1c — Demonstration Handbook',
    publisher: 'Sample Public Health Agency',
    category: 'cardiometabolic',
    sourceType: 'patient_education',
    publishedOn: '2025-07-04',
    addedAt: '2026-09-02T09:14:00.000Z',
    pageCount: 44,
    sizeBytes: 1_905_112,
    status: 'indexed',
    chunkCount: 198,
    description:
      'Plain-language sample handbook explaining blood glucose, the HbA1c test, diagnostic ranges and self-management basics.',
    url: null,
    failureReason: null,
    origin: 'demo',
  },
  {
    id: 'doc-abx-003',
    title: 'Appropriate Antibiotic Use for Respiratory Infections — Demonstration Guideline',
    publisher: 'Demonstration Guidelines Council',
    category: 'infectious_disease',
    sourceType: 'clinical_guideline',
    publishedOn: '2024-11-22',
    addedAt: '2026-09-05T11:30:00.000Z',
    pageCount: 62,
    sizeBytes: 2_740_304,
    status: 'indexed',
    chunkCount: 287,
    description:
      'Sample stewardship guidance on when antibiotics are and are not indicated for upper respiratory tract infections, and how resistance develops.',
    url: null,
    failureReason: null,
    origin: 'demo',
  },
  {
    id: 'doc-fev-004',
    title: 'Fever in Children Under Five — Demonstration Care Pathway',
    publisher: 'Example Paediatric Reference Board',
    category: 'maternal_child',
    sourceType: 'clinical_guideline',
    publishedOn: '2025-01-30',
    addedAt: '2026-09-07T08:05:00.000Z',
    pageCount: 51,
    sizeBytes: 2_118_664,
    status: 'indexed',
    chunkCount: 221,
    description:
      'Sample care pathway describing temperature measurement, traffic-light warning signs and thresholds for urgent assessment in young children.',
    url: null,
    failureReason: null,
    origin: 'demo',
  },
  {
    id: 'doc-anlg-005',
    title: 'Over-the-Counter Analgesics: Safe Use — Demonstration Monograph',
    publisher: 'Sample Medicines Information Service',
    category: 'medication_safety',
    sourceType: 'drug_label',
    publishedOn: '2025-05-12',
    addedAt: '2026-09-11T14:48:00.000Z',
    pageCount: 28,
    sizeBytes: 1_204_440,
    status: 'indexed',
    chunkCount: 134,
    description:
      'Sample monograph covering paracetamol and ibuprofen: maximum daily limits, interactions, and groups who should seek advice before use.',
    url: null,
    failureReason: null,
    origin: 'demo',
  },
  {
    id: 'doc-slp-006',
    title: 'Sleep, Stress and Everyday Wellbeing — Demonstration Review',
    publisher: 'Example Institute of Preventive Health',
    category: 'mental_health',
    sourceType: 'systematic_review',
    publishedOn: '2024-08-09',
    addedAt: '2026-09-18T16:20:00.000Z',
    pageCount: 119,
    sizeBytes: 4_883_220,
    status: 'indexed',
    chunkCount: 503,
    description:
      'Sample evidence review of non-pharmacological approaches to sleep quality, stress regulation and their relationship with cardiometabolic risk.',
    url: null,
    failureReason: null,
    origin: 'demo',
  },
  {
    id: 'doc-asth-007',
    title: 'Asthma Inhaler Technique and Review — Demonstration Summary',
    publisher: 'Demonstration Respiratory Network',
    category: 'respiratory',
    sourceType: 'patient_education',
    publishedOn: '2025-09-27',
    addedAt: '2026-10-21T10:02:00.000Z',
    pageCount: 19,
    sizeBytes: 842_190,
    status: 'processing',
    chunkCount: null,
    description:
      'Sample summary on reliever versus preventer inhalers, spacer use and signs that an asthma review is needed.',
    url: null,
    failureReason: null,
    origin: 'demo',
  },
  {
    id: 'doc-nutr-008',
    title: 'Dietary Sodium and Cardiovascular Risk — Demonstration Briefing',
    publisher: 'Sample Public Health Agency',
    category: 'general_health',
    sourceType: 'public_health_authority',
    publishedOn: '2026-02-14',
    addedAt: '2026-11-02T07:41:00.000Z',
    pageCount: null,
    sizeBytes: 996_118,
    status: 'failed',
    chunkCount: null,
    description:
      'Sample briefing on sodium intake targets and practical substitution strategies.',
    url: null,
    failureReason:
      'Text extraction produced no readable content — the sample PDF appears to be a scanned image without an OCR layer.',
    origin: 'demo',
  },
];

export const demoKnowledgeTopics: KnowledgeTopic[] = [
  {
    id: 'topic-bp',
    name: 'Blood pressure',
    category: 'cardiometabolic',
    summary:
      'What the two numbers mean, how readings are interpreted, and which lifestyle measures the sample guideline associates with lower readings.',
    questions: [
      'What does a blood pressure reading of 150/95 mean?',
      'How should blood pressure be measured at home?',
      'Which lifestyle changes affect blood pressure most?',
    ],
    documentIds: ['doc-bp-001', 'doc-nutr-008'],
    origin: 'demo',
  },
  {
    id: 'topic-diabetes',
    name: 'Type 2 diabetes',
    category: 'cardiometabolic',
    summary:
      'Blood glucose basics, what the HbA1c test measures, and how the sample handbook describes the diagnostic ranges.',
    questions: [
      'What is HbA1c and what do the numbers mean?',
      'What is the difference between type 1 and type 2 diabetes?',
    ],
    documentIds: ['doc-dm-002'],
    origin: 'demo',
  },
  {
    id: 'topic-antibiotics',
    name: 'Antibiotics and infections',
    category: 'infectious_disease',
    summary:
      'When antibiotics help, why they do not work on viral illness, and how resistance develops according to the sample stewardship guideline.',
    questions: [
      'Do I need antibiotics for a cold?',
      'Why does antibiotic resistance happen?',
    ],
    documentIds: ['doc-abx-003'],
    origin: 'demo',
  },
  {
    id: 'topic-child-fever',
    name: 'Fever in young children',
    category: 'maternal_child',
    summary:
      'Measuring temperature accurately and the warning signs the sample paediatric pathway treats as grounds for urgent assessment.',
    questions: [
      'When should I worry about a fever in my child?',
      'How should a child’s temperature be measured?',
    ],
    documentIds: ['doc-fev-004', 'doc-anlg-005'],
    origin: 'demo',
  },
  {
    id: 'topic-pain-relief',
    name: 'Everyday pain relief',
    category: 'medication_safety',
    summary:
      'Daily limits, overlap between combination products, and who the sample monograph says should seek advice first.',
    questions: [
      'Can I take paracetamol and ibuprofen together?',
      'What is the maximum daily dose of paracetamol for an adult?',
    ],
    documentIds: ['doc-anlg-005'],
    origin: 'demo',
  },
  {
    id: 'topic-sleep',
    name: 'Sleep and stress',
    category: 'mental_health',
    summary:
      'Non-medication approaches to sleep quality and stress, and how the sample review links them to longer-term health risk.',
    questions: [
      'How does poor sleep affect physical health?',
      'What non-medication approaches improve sleep?',
    ],
    documentIds: ['doc-slp-006'],
    origin: 'demo',
  },
];

export const demoSuggestedQuestions: string[] = [
  'What does a blood pressure reading of 150/95 mean?',
  'Do I need antibiotics for a cold?',
  'What is HbA1c and what do the numbers mean?',
  'When should I worry about a fever in my child?',
  'Can I take paracetamol and ibuprofen together?',
];
