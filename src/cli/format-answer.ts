import type { CitedAnswer, RefusalReason } from '../answering/answer.types.js';

// Plain-language meaning of each refusal gate, for people reading the terminal.
const REFUSAL_TEXT: Record<RefusalReason, string> = {
  low_retrieval_score:
    'nothing in the corpus is close enough to the question (gate 1, no model call)',
  model_insufficient_context:
    'the model said the retrieved passages do not answer the question (gate 2)',
  no_valid_citation:
    'the model answered, but none of its quotes was found word for word (gate 3)',
};

/** Readable terminal output for one answer. Pure: returns text, prints nothing. */
export function formatAnswer(result: CitedAnswer): string {
  const lines: string[] = [];

  if (result.refused) {
    const reason = result.refusalReason ?? 'no_valid_citation';
    lines.push(`REFUSED: ${REFUSAL_TEXT[reason]}`, `  reason code: ${reason}`);
  } else {
    lines.push('ANSWER', `  ${result.answer}`);
  }

  // Shown for refusals too (gate 3): the rejected quotes explain the refusal.
  if (result.citations.length > 0) {
    lines.push('', 'CITATIONS');
    for (const c of result.citations) {
      const mark = c.valid ? '✓' : `✗ ${c.invalidReason}`;
      lines.push(
        `  ${mark}  [${c.passage}] ${c.article ?? '?'}  ${c.chunkId ?? ''}`.trimEnd(),
        `     "${c.quote}"`,
      );
    }
  }

  return lines.join('\n');
}
