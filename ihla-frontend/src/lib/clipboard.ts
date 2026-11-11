/**
 * Clipboard helper.
 *
 * Returns whether the copy actually succeeded, so the UI never shows a
 * success toast for an operation that silently failed (clipboard access is
 * blocked in insecure contexts and in some embedded browsers).
 */

import type { StructuredAnswer } from '@/types/models';

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Renders an answer as plain text for copying — including its sources, because
 * an answer separated from its evidence is exactly what this product exists to
 * prevent.
 */
export function answerToPlainText(
  answer: StructuredAnswer,
  question: string,
  appName: string,
): string {
  const lines: string[] = [];

  lines.push(`Question: ${question}`, '', answer.summary, '');

  if (answer.explanation.length > 0) {
    lines.push(...answer.explanation, '');
  }

  if (answer.keyPoints.length > 0) {
    lines.push('Key points:');
    lines.push(...answer.keyPoints.map((point) => `  - ${point}`), '');
  }

  if (answer.precautions.length > 0) {
    lines.push('Important precautions:');
    lines.push(...answer.precautions.map((point) => `  - ${point}`), '');
  }

  if (answer.nextSteps.length > 0) {
    lines.push('Suggested next steps:');
    lines.push(...answer.nextSteps.map((point) => `  - ${point}`), '');
  }

  if (answer.citations.length > 0) {
    lines.push('Sources:');
    for (const citation of answer.citations) {
      const location = [citation.section, citation.page ? `p. ${citation.page}` : null]
        .filter(Boolean)
        .join(', ');
      lines.push(
        `  [${citation.label}] ${citation.documentTitle} — ${citation.publisher}${
          location ? ` (${location})` : ''
        }`,
      );
    }
    lines.push('');
  } else {
    lines.push('Sources: none — no supporting passage was retrieved.', '');
  }

  if (answer.origin === 'demo') {
    lines.push(
      'NOTE: Generated in Demo Mode. The sources above are fictional examples created for demonstration and must not be cited.',
    );
  }

  lines.push(
    `${appName} provides health information, not medical advice. It does not replace assessment by a qualified clinician.`,
  );

  return lines.join('\n');
}
