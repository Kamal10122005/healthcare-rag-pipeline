/**
 * Scripted demonstration answers.
 *
 * ⚠️  All excerpts below were written for this demo. They are not quotations
 *     from real documents and the publishers they are attributed to do not
 *     exist. See the header of `demoDocuments.ts`.
 *
 * Each entry demonstrates a different state the real pipeline must be able to
 * express, which is the point of the demo:
 *   - well-supported answer (high confidence, several sources)
 *   - answer with a stewardship caution
 *   - answer with a paediatric safety caution
 *   - medication-safety answer
 *   - emergency interception (no answer attempted)
 *   - insufficient evidence (knowledge base does not cover the question)
 */

import type { Citation, StructuredAnswer } from '@/types/models';

interface CitationSeed {
  documentId: string;
  documentTitle: string;
  publisher: string;
  sourceType: Citation['sourceType'];
  publishedOn: string | null;
  section: string;
  page: number;
  excerpt: string;
  highlight: string;
  relevance: number;
}

function buildCitations(seeds: CitationSeed[]): Citation[] {
  return seeds.map((seed, index) => ({
    id: `demo-citation-${seed.documentId}-${index + 1}`,
    label: `S${index + 1}`,
    documentId: seed.documentId,
    documentTitle: seed.documentTitle,
    sourceType: seed.sourceType,
    publisher: seed.publisher,
    publishedOn: seed.publishedOn,
    section: seed.section,
    page: seed.page,
    excerpt: seed.excerpt,
    highlight: seed.excerpt.includes(seed.highlight) ? seed.highlight : null,
    relevance: seed.relevance,
    url: null,
    origin: 'demo' as const,
  }));
}

const GENERAL_DISCLAIMER_NOTICE = {
  id: 'notice-general',
  level: 'info' as const,
  title: 'Information, not medical advice',
  message:
    'This answer explains what the indexed sources say. It is not a diagnosis, a treatment plan, or a substitute for assessment by a qualified clinician who knows your history.',
};

/* ------------------------------------------------------------------ */

const bloodPressureAnswer: StructuredAnswer = {
  summary:
    'A reading of 150/95 mmHg is above the range the sample guideline describes as normal. A single raised reading is not a diagnosis — the guideline describes confirming it with repeat measurements before anything is concluded.',
  explanation: [
    'The first number (150) is systolic pressure, the pressure in the arteries while the heart contracts. The second (95) is diastolic pressure, the pressure between beats. Both are measured in millimetres of mercury (mmHg).',
    'The sample guideline treats readings at or above 140/90 mmHg in a clinic setting as raised, and recommends that a raised reading is repeated — ideally with home or ambulatory measurement over several days — before it is treated as a diagnosis. Blood pressure varies with activity, stress, caffeine, pain, time of day and even how the cuff is positioned.',
    'Where a raised reading is confirmed, the guideline describes assessment of overall cardiovascular risk rather than treating the number alone: age, smoking status, cholesterol, blood glucose and kidney function all feed into what is recommended next.',
  ],
  keyPoints: [
    '150/95 mmHg sits above the raised threshold described in the sample guideline (140/90 mmHg in clinic).',
    'One elevated reading is not a diagnosis — confirmation over time is the described practice.',
    'Measurement technique matters: seated, back supported, arm at heart level, no caffeine or exercise in the preceding 30 minutes.',
    'Decisions in the sample guideline depend on overall cardiovascular risk, not on the reading in isolation.',
  ],
  precautions: [
    'Readings at or above 180/120 mmHg are described in the sample guideline as requiring same-day clinical assessment, particularly with chest pain, breathlessness, visual change, severe headache or neurological symptoms.',
    'Do not start, stop or change any blood pressure medication based on this answer.',
  ],
  nextSteps: [
    'Record readings twice daily for about a week, at the same times, and bring the log to a clinician.',
    'Ask a pharmacist or nurse to check your home monitor and cuff size if you use one.',
    'Discuss the log with a doctor rather than acting on individual readings.',
  ],
  citations: buildCitations([
    {
      documentId: 'doc-bp-001',
      documentTitle: 'Managing Raised Blood Pressure in Adults — Demonstration Guideline',
      publisher: 'Demonstration Guidelines Council',
      sourceType: 'clinical_guideline',
      publishedOn: '2025-03-18',
      section: '3.2 Diagnostic thresholds',
      page: 21,
      excerpt:
        'For the purposes of this demonstration guideline, a clinic measurement at or above 140/90 mmHg is classified as raised. A single raised measurement should not be treated as a diagnosis; confirmation using repeated clinic, home or ambulatory measurement is described before any management decision is made.',
      highlight:
        'A single raised measurement should not be treated as a diagnosis',
      relevance: 0.94,
    },
    {
      documentId: 'doc-bp-001',
      documentTitle: 'Managing Raised Blood Pressure in Adults — Demonstration Guideline',
      publisher: 'Demonstration Guidelines Council',
      sourceType: 'clinical_guideline',
      publishedOn: '2025-03-18',
      section: '2.4 Measurement technique',
      page: 14,
      excerpt:
        'Measurement conditions materially affect the recorded value. This demonstration guideline describes the subject seated with back supported and the cuff supported at heart level, after several minutes at rest, avoiding caffeine, smoking and exertion in the preceding thirty minutes. Cuff size mismatched to arm circumference is a common source of error.',
      highlight: 'Cuff size mismatched to arm circumference is a common source of error',
      relevance: 0.81,
    },
    {
      documentId: 'doc-nutr-008',
      documentTitle: 'Dietary Sodium and Cardiovascular Risk — Demonstration Briefing',
      publisher: 'Sample Public Health Agency',
      sourceType: 'public_health_authority',
      publishedOn: '2026-02-14',
      section: '1.1 Population intake',
      page: 3,
      excerpt:
        'This demonstration briefing associates reduced dietary sodium with modest average reductions in systolic pressure at population level, alongside regular physical activity and limited alcohol intake.',
      highlight: 'modest average reductions in systolic pressure at population level',
      relevance: 0.62,
    },
  ]),
  confidence: 'high',
  confidenceNote: null,
  safetyNotices: [
    {
      id: 'notice-bp-urgent',
      level: 'caution',
      title: 'Seek same-day assessment for very high readings',
      message:
        'If a reading reaches 180/120 mmHg, or comes with chest pain, breathlessness, severe headache, visual change or weakness, contact a clinician the same day rather than waiting.',
    },
    GENERAL_DISCLAIMER_NOTICE,
  ],
  readingLevel: 'standard',
  origin: 'demo',
};

const antibioticsAnswer: StructuredAnswer = {
  summary:
    'The sample stewardship guideline describes most common colds as viral, and antibiotics as having no effect on viruses. It reserves antibiotics for cases where a bacterial infection is suspected on clinical assessment.',
  explanation: [
    'A common cold is usually caused by a virus. Antibiotics act on bacteria — on cell wall synthesis, protein synthesis and similar bacterial machinery — so they have no mechanism of action against a viral infection.',
    'The sample guideline describes symptom duration alone as a weak signal: cough after a viral upper respiratory infection commonly persists for two to three weeks without indicating bacterial infection. What prompts reassessment in the guideline is the pattern — symptoms that worsen after initially improving, high fever that persists, breathing difficulty, or focal findings on examination.',
    'Taking antibiotics when they are not needed is described as carrying both individual cost (side effects, disruption of normal gut flora) and population cost, since exposure selects for resistant organisms.',
  ],
  keyPoints: [
    'Antibiotics do not act on viruses, and most colds are viral.',
    'A cough lasting two to three weeks after a cold is described as common and not by itself a reason for antibiotics.',
    'Deterioration after initial improvement is one of the patterns the sample guideline flags for reassessment.',
    'Unnecessary courses contribute to resistance at population level.',
  ],
  precautions: [
    'Do not take antibiotics left over from a previous course, or prescribed for someone else.',
    'If a course is prescribed, the sample guideline describes completing it as directed unless a clinician says otherwise.',
  ],
  nextSteps: [
    'Treat symptoms — fluids, rest, and analgesia if appropriate for you.',
    'Seek assessment if breathing becomes difficult, if you cannot keep fluids down, or if symptoms clearly worsen after improving.',
    'Ask a pharmacist about symptom relief options suited to your other conditions and medicines.',
  ],
  citations: buildCitations([
    {
      documentId: 'doc-abx-003',
      documentTitle:
        'Appropriate Antibiotic Use for Respiratory Infections — Demonstration Guideline',
      publisher: 'Demonstration Guidelines Council',
      sourceType: 'clinical_guideline',
      publishedOn: '2024-11-22',
      section: '4.1 Upper respiratory tract infection',
      page: 27,
      excerpt:
        'The majority of upper respiratory tract infections in this demonstration corpus are described as viral in origin. Antibiotics have no activity against viral pathogens and are not recommended for uncomplicated presentations, irrespective of sputum colour.',
      highlight: 'Antibiotics have no activity against viral pathogens',
      relevance: 0.96,
    },
    {
      documentId: 'doc-abx-003',
      documentTitle:
        'Appropriate Antibiotic Use for Respiratory Infections — Demonstration Guideline',
      publisher: 'Demonstration Guidelines Council',
      sourceType: 'clinical_guideline',
      publishedOn: '2024-11-22',
      section: '4.3 Safety-netting advice',
      page: 31,
      excerpt:
        'Reassessment is described where symptoms deteriorate after an initial period of improvement, where fever persists beyond the expected course, or where breathing difficulty, chest pain or confusion develop.',
      highlight: 'symptoms deteriorate after an initial period of improvement',
      relevance: 0.88,
    },
    {
      documentId: 'doc-abx-003',
      documentTitle:
        'Appropriate Antibiotic Use for Respiratory Infections — Demonstration Guideline',
      publisher: 'Demonstration Guidelines Council',
      sourceType: 'clinical_guideline',
      publishedOn: '2024-11-22',
      section: '6.2 Resistance',
      page: 44,
      excerpt:
        'Each unnecessary exposure is described as applying selection pressure that favours resistant organisms, with effects that accrue at community rather than individual level.',
      highlight: 'selection pressure that favours resistant organisms',
      relevance: 0.73,
    },
  ]),
  confidence: 'high',
  confidenceNote: null,
  safetyNotices: [
    {
      id: 'notice-abx',
      level: 'caution',
      title: 'Antibiotic decisions need a clinical assessment',
      message:
        'Whether an individual infection is bacterial cannot be determined from a description of symptoms alone. This answer explains general guidance; it does not assess your illness.',
    },
    GENERAL_DISCLAIMER_NOTICE,
  ],
  readingLevel: 'standard',
  origin: 'demo',
};

const hba1cAnswer: StructuredAnswer = {
  summary:
    'HbA1c reflects average blood glucose over roughly the previous two to three months. The sample handbook describes 48 mmol/mol (6.5%) and above as the diabetes range, and 42–47 mmol/mol (6.0–6.4%) as increased risk.',
  explanation: [
    'Glucose in the blood attaches to haemoglobin inside red blood cells. Because those cells live for about three months, the proportion of haemoglobin carrying glucose gives an average picture of glucose levels across that period — unlike a finger-prick reading, which captures a single moment.',
    'The sample handbook reports HbA1c in two units: mmol/mol (IFCC) and the older percentage (DCCT). Laboratories in different countries report one or both, which is why a result may look unfamiliar.',
    'The handbook notes that HbA1c can be misleading in some situations — anaemia, recent blood loss or transfusion, pregnancy, and some haemoglobin variants — where other tests are described as preferable.',
  ],
  keyPoints: [
    'HbA1c is an average over roughly two to three months, not a snapshot.',
    'Sample handbook ranges: 48 mmol/mol (6.5%) and above is the diabetes range; 42–47 mmol/mol (6.0–6.4%) indicates increased risk.',
    'Diagnosis in the handbook rests on repeat testing or a second test type, not one result.',
    'Conditions affecting red blood cells can distort the result.',
  ],
  precautions: [
    'An HbA1c result interprets differently depending on your age, pregnancy status and other conditions — the number alone is not the whole picture.',
    'Do not adjust any diabetes medication based on this answer.',
  ],
  nextSteps: [
    'Ask which unit your laboratory reports, so you can compare results over time consistently.',
    'Ask whether a repeat or confirmatory test is indicated for your result.',
    'Discuss what target range is appropriate for you specifically.',
  ],
  citations: buildCitations([
    {
      documentId: 'doc-dm-002',
      documentTitle: 'Understanding Type 2 Diabetes and HbA1c — Demonstration Handbook',
      publisher: 'Sample Public Health Agency',
      sourceType: 'patient_education',
      publishedOn: '2025-07-04',
      section: '2.1 What HbA1c measures',
      page: 9,
      excerpt:
        'HbA1c reflects the proportion of haemoglobin that has become glycated, and therefore summarises average glucose exposure over approximately the preceding two to three months rather than at a single point in time.',
      highlight: 'approximately the preceding two to three months',
      relevance: 0.95,
    },
    {
      documentId: 'doc-dm-002',
      documentTitle: 'Understanding Type 2 Diabetes and HbA1c — Demonstration Handbook',
      publisher: 'Sample Public Health Agency',
      sourceType: 'patient_education',
      publishedOn: '2025-07-04',
      section: '2.3 Interpreting the result',
      page: 12,
      excerpt:
        'In this demonstration handbook a value of 48 mmol/mol (6.5%) or above falls in the diabetes range, while 42 to 47 mmol/mol (6.0 to 6.4%) is described as indicating increased risk. Confirmation by a repeat test is described before diagnosis in an asymptomatic person.',
      highlight: '48 mmol/mol (6.5%) or above falls in the diabetes range',
      relevance: 0.93,
    },
    {
      documentId: 'doc-dm-002',
      documentTitle: 'Understanding Type 2 Diabetes and HbA1c — Demonstration Handbook',
      publisher: 'Sample Public Health Agency',
      sourceType: 'patient_education',
      publishedOn: '2025-07-04',
      section: '2.5 When HbA1c is unreliable',
      page: 15,
      excerpt:
        'Conditions that alter red cell turnover — including anaemia, recent transfusion, pregnancy and certain haemoglobin variants — are described as making HbA1c less reliable, with alternative testing preferred.',
      highlight: 'Conditions that alter red cell turnover',
      relevance: 0.79,
    },
  ]),
  confidence: 'high',
  confidenceNote: null,
  safetyNotices: [GENERAL_DISCLAIMER_NOTICE],
  readingLevel: 'standard',
  origin: 'demo',
};

const childFeverAnswer: StructuredAnswer = {
  summary:
    'The sample paediatric pathway treats the child’s overall condition as more informative than the temperature number, and lists specific warning signs that warrant urgent assessment regardless of how high the fever is.',
  explanation: [
    'Fever itself is a response to infection rather than a disease. The sample pathway describes how a child looks and behaves — alertness, breathing, colour, fluid intake, responsiveness — as carrying more weight than the reading on the thermometer.',
    'Two thresholds in the pathway relate to age rather than behaviour: a temperature of 38°C or above in an infant under three months, and 39°C or above in an infant aged three to six months, are both described as requiring prompt clinical assessment.',
    'The pathway groups other features into warning signs, which include difficulty breathing, a rash that does not fade under pressure, unusual drowsiness or difficulty waking, persistent vomiting, reduced wet nappies or urine output, a seizure, or a stiff neck.',
  ],
  keyPoints: [
    'How the child looks and behaves matters more than the height of the fever.',
    'Under 3 months with 38°C or above: prompt assessment, per the sample pathway.',
    '3–6 months with 39°C or above: prompt assessment, per the sample pathway.',
    'A non-blanching rash, breathing difficulty, drowsiness, seizure or stiff neck are urgent regardless of temperature.',
  ],
  precautions: [
    'A child who is difficult to wake, is breathing with visible effort, or has a rash that does not fade when pressed needs emergency assessment immediately.',
    'Medication for fever is described as being for comfort, not for bringing the number down as a goal in itself.',
  ],
  nextSteps: [
    'Check the warning-sign list against how your child is right now.',
    'Keep fluids going and recheck the child regularly, including overnight.',
    'Contact a clinician or emergency service if any warning sign is present, or if you are worried and the picture is not improving.',
  ],
  citations: buildCitations([
    {
      documentId: 'doc-fev-004',
      documentTitle: 'Fever in Children Under Five — Demonstration Care Pathway',
      publisher: 'Example Paediatric Reference Board',
      sourceType: 'clinical_guideline',
      publishedOn: '2025-01-30',
      section: '3.1 Age-based thresholds',
      page: 16,
      excerpt:
        'This demonstration pathway describes prompt clinical assessment for an infant under three months with a temperature of 38°C or above, and for an infant aged three to six months with a temperature of 39°C or above.',
      highlight: 'an infant under three months with a temperature of 38°C or above',
      relevance: 0.97,
    },
    {
      documentId: 'doc-fev-004',
      documentTitle: 'Fever in Children Under Five — Demonstration Care Pathway',
      publisher: 'Example Paediatric Reference Board',
      sourceType: 'clinical_guideline',
      publishedOn: '2025-01-30',
      section: '3.4 Warning features',
      page: 22,
      excerpt:
        'Features described as requiring urgent assessment irrespective of temperature include a rash that does not fade on pressure, increased work of breathing, reduced responsiveness or difficulty rousing the child, seizure, neck stiffness, and markedly reduced urine output.',
      highlight: 'a rash that does not fade on pressure',
      relevance: 0.95,
    },
    {
      documentId: 'doc-anlg-005',
      documentTitle: 'Over-the-Counter Analgesics: Safe Use — Demonstration Monograph',
      publisher: 'Sample Medicines Information Service',
      sourceType: 'drug_label',
      publishedOn: '2025-05-12',
      section: '5.2 Paediatric use',
      page: 18,
      excerpt:
        'Antipyretics are described as being given to relieve distress rather than to normalise temperature, with dosing by weight and age according to the product label.',
      highlight: 'to relieve distress rather than to normalise temperature',
      relevance: 0.68,
    },
  ]),
  confidence: 'high',
  confidenceNote: null,
  safetyNotices: [
    {
      id: 'notice-fever-urgent',
      level: 'caution',
      title: 'Warning signs override everything else in this answer',
      message:
        'If your child has a rash that does not fade under pressure, is struggling to breathe, is hard to wake, has had a seizure, or you believe they are seriously unwell — seek emergency care now rather than reading further.',
      actionLabel: 'Emergency guidance',
    },
    GENERAL_DISCLAIMER_NOTICE,
  ],
  readingLevel: 'plain',
  origin: 'demo',
};

const analgesicAnswer: StructuredAnswer = {
  summary:
    'The sample monograph describes paracetamol and ibuprofen as acting differently and as being used together in some circumstances — but it places firm limits on the daily total of each, and lists groups who should get advice before using ibuprofen at all.',
  explanation: [
    'Paracetamol and ibuprofen work by different mechanisms, so the monograph does not treat combined use as a duplication. What it treats as the real risk is exceeding the daily maximum of either one.',
    'For paracetamol, the most common route to exceeding the limit described in the monograph is accidental: combination cold, flu and night-time products frequently contain paracetamol without that being obvious from the front of the pack.',
    'Ibuprofen belongs to the NSAID class. The monograph describes caution or avoidance in people with stomach ulcer history, kidney disease, heart failure, uncontrolled high blood pressure, asthma that worsens with NSAIDs, in later pregnancy, and alongside anticoagulants.',
  ],
  keyPoints: [
    'The two act differently; the monograph does not describe combined use as duplication.',
    'Adult paracetamol maximum in the monograph: 4 g in 24 hours, with at least four hours between doses.',
    'Check every combination product for hidden paracetamol before taking more.',
    'Ibuprofen requires caution in several specific groups listed in the monograph.',
  ],
  precautions: [
    'Paracetamol overdose can damage the liver seriously before any symptoms appear — treat the daily limit as absolute.',
    'This answer describes general adult guidance. Doses for children are by weight and age, and this answer does not provide them.',
    'If you take prescription medicines or have liver, kidney, stomach or heart conditions, get individual advice before combining analgesics.',
  ],
  nextSteps: [
    'Read the label of every product you are taking and add up the paracetamol content.',
    'Ask a pharmacist to check the combination against your other medicines and conditions.',
    'Seek urgent advice if pain persists beyond the duration stated on the pack.',
  ],
  citations: buildCitations([
    {
      documentId: 'doc-anlg-005',
      documentTitle: 'Over-the-Counter Analgesics: Safe Use — Demonstration Monograph',
      publisher: 'Sample Medicines Information Service',
      sourceType: 'drug_label',
      publishedOn: '2025-05-12',
      section: '2.1 Paracetamol limits',
      page: 6,
      excerpt:
        'For adults, this demonstration monograph states a maximum of 4 g of paracetamol in any 24-hour period, with a minimum interval of four hours between doses. Exceeding this limit may cause serious liver injury, which can occur before any symptoms are noticed.',
      highlight: 'may cause serious liver injury, which can occur before any symptoms are noticed',
      relevance: 0.96,
    },
    {
      documentId: 'doc-anlg-005',
      documentTitle: 'Over-the-Counter Analgesics: Safe Use — Demonstration Monograph',
      publisher: 'Sample Medicines Information Service',
      sourceType: 'drug_label',
      publishedOn: '2025-05-12',
      section: '2.4 Hidden sources',
      page: 9,
      excerpt:
        'Combination cold and influenza preparations frequently contain paracetamol. The monograph describes checking the full ingredient list of every product taken concurrently before calculating the daily total.',
      highlight: 'Combination cold and influenza preparations frequently contain paracetamol',
      relevance: 0.9,
    },
    {
      documentId: 'doc-anlg-005',
      documentTitle: 'Over-the-Counter Analgesics: Safe Use — Demonstration Monograph',
      publisher: 'Sample Medicines Information Service',
      sourceType: 'drug_label',
      publishedOn: '2025-05-12',
      section: '3.3 NSAID cautions',
      page: 13,
      excerpt:
        'Caution or avoidance is described for individuals with a history of peptic ulceration, impaired renal function, heart failure, uncontrolled hypertension, NSAID-sensitive asthma, in the third trimester of pregnancy, and for those taking anticoagulant therapy.',
      highlight: 'a history of peptic ulceration, impaired renal function',
      relevance: 0.87,
    },
  ]),
  confidence: 'moderate',
  confidenceNote:
    'The sample monograph covers general adult use. It does not cover paediatric dosing, pregnancy-specific dosing, or interactions with specific prescription medicines, so those parts of the question are unanswered here.',
  safetyNotices: [
    {
      id: 'notice-analgesic',
      level: 'caution',
      title: 'Medicine limits are not negotiable',
      message:
        'If you think you or someone else may have taken more than the daily maximum of paracetamol, contact emergency services or a poisons service immediately — do not wait for symptoms.',
    },
    GENERAL_DISCLAIMER_NOTICE,
  ],
  readingLevel: 'standard',
  origin: 'demo',
};

const emergencyAnswer: StructuredAnswer = {
  summary:
    'This question describes symptoms that can indicate a medical emergency. This assistant does not assess emergencies — contact emergency services now.',
  explanation: [
    'Symptoms such as chest pain or pressure, severe breathlessness, face or limb weakness, slurred speech, a seizure, uncontrolled bleeding, or a sudden severe headache need immediate in-person assessment. Time matters for several of the conditions these can indicate.',
    'No information retrieval system can distinguish a benign cause from a dangerous one based on a typed description, and this assistant will not attempt to.',
  ],
  keyPoints: [
    'Contact emergency services now rather than continuing to read.',
    'If someone is with you, tell them what is happening.',
    'Do not drive yourself if you are the one with symptoms.',
  ],
  precautions: [
    'This assistant has intentionally not generated a clinical answer for this question.',
  ],
  nextSteps: [
    'Call your local emergency number immediately.',
    'If available to you, go to the nearest emergency department.',
  ],
  citations: [],
  confidence: 'insufficient',
  confidenceNote:
    'No retrieval was performed. The safety layer intercepted this question before the knowledge base was queried.',
  safetyNotices: [
    {
      id: 'notice-emergency',
      level: 'emergency',
      title: 'This may be a medical emergency',
      message:
        'Stop and contact emergency services immediately. This assistant cannot assess urgent symptoms and has not attempted to answer the question.',
      actionLabel: 'Emergency guidance',
    },
  ],
  readingLevel: 'plain',
  origin: 'demo',
};

const insufficientAnswer: StructuredAnswer = {
  summary:
    'The demonstration knowledge base does not contain sources that cover this question, so no answer has been generated.',
  explanation: [
    'This assistant answers only from the documents indexed in its knowledge base. When retrieval returns nothing relevant above the confidence threshold, the correct behaviour is to say so rather than to generate an answer from the language model’s own parametric knowledge — that answer would have no evidence behind it and no citations to show.',
    'In Demo Mode the knowledge base is a small, clearly fictional sample corpus covering blood pressure, type 2 diabetes, antibiotic use, paediatric fever, everyday analgesics and sleep. Questions outside those topics land here by design.',
  ],
  keyPoints: [
    'No supporting passages were retrieved above the relevance threshold.',
    'No answer was generated, because there would be nothing to cite.',
    'This is the intended behaviour, not a failure of the application.',
  ],
  precautions: [
    'An absence of evidence here says nothing about the underlying health question. It only means this knowledge base does not cover it.',
  ],
  nextSteps: [
    'Try one of the suggested questions to see a fully evidenced answer.',
    'Browse the Document Library to see what the demo corpus actually covers.',
    'For a real question about your health, speak to a qualified clinician.',
  ],
  citations: [],
  confidence: 'insufficient',
  confidenceNote:
    'Retrieval returned no passage above the relevance threshold for this question.',
  safetyNotices: [GENERAL_DISCLAIMER_NOTICE],
  readingLevel: 'standard',
  origin: 'demo',
};

/* ------------------------------------------------------------------ */

interface AnswerRule {
  id: string;
  /** Any match wins. Lower-cased comparison against the question. */
  keywords: string[][];
  answer: StructuredAnswer;
}

/**
 * Emergency patterns are checked first and short-circuit retrieval entirely,
 * mirroring how the safety guardrail is expected to behave in production.
 */
const EMERGENCY_PATTERNS: string[][] = [
  ['chest pain'],
  ['chest', 'pressure', 'arm'],
  ['heart attack'],
  ['stroke'],
  ['cannot breathe'],
  ["can't breathe"],
  ['struggling to breathe'],
  ['unconscious'],
  ['severe bleeding'],
  ['bleeding heavily'],
  ['overdose'],
  ['seizure', 'now'],
];

const ANSWER_RULES: AnswerRule[] = [
  {
    id: 'blood-pressure',
    keywords: [
      ['blood pressure'],
      ['bp', 'reading'],
      ['systolic'],
      ['diastolic'],
      ['hypertension'],
      ['150/95'],
      ['140/90'],
    ],
    answer: bloodPressureAnswer,
  },
  {
    id: 'antibiotics',
    keywords: [['antibiotic'], ['antibiotics'], ['cold', 'medicine'], ['resistance']],
    answer: antibioticsAnswer,
  },
  {
    id: 'hba1c',
    keywords: [['hba1c'], ['a1c'], ['diabetes'], ['blood sugar'], ['blood glucose']],
    answer: hba1cAnswer,
  },
  {
    id: 'child-fever',
    keywords: [
      ['fever', 'child'],
      ['fever', 'baby'],
      ['temperature', 'child'],
      ['child', 'worry'],
      ['toddler', 'fever'],
    ],
    answer: childFeverAnswer,
  },
  {
    id: 'analgesics',
    keywords: [
      ['paracetamol'],
      ['acetaminophen'],
      ['ibuprofen'],
      ['painkiller'],
      ['pain relief'],
    ],
    answer: analgesicAnswer,
  },
];

function matches(question: string, groups: string[][]): boolean {
  const haystack = question.toLowerCase();
  return groups.some((group) => group.every((term) => haystack.includes(term)));
}

/** Resolves a demonstration answer for a question. Never returns null. */
export function resolveDemoAnswer(question: string): StructuredAnswer {
  if (matches(question, EMERGENCY_PATTERNS)) return emergencyAnswer;
  const rule = ANSWER_RULES.find((candidate) => matches(question, candidate.keywords));
  return rule ? rule.answer : insufficientAnswer;
}

export const demoAnswerLibrary = {
  bloodPressureAnswer,
  antibioticsAnswer,
  hba1cAnswer,
  childFeverAnswer,
  analgesicAnswer,
  emergencyAnswer,
  insufficientAnswer,
};
