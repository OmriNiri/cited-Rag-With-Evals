import type { CountTokens } from './chunk.types.js';

/**
 * Breaks a piece of text that is too big for one chunk into smaller pieces,
 * using the most natural boundary available:
 *   1. lines (a paragraph's list items are on separate lines)
 *   2. sentences
 * A single sentence that is still too long is kept whole: cutting mid-sentence
 * would make it unreadable and uncitable. (Does not occur in the current corpus;
 * the ingestion stats report the largest chunk so it would be noticed.)
 */
export function splitOversized(
  text: string,
  maxTokens: number,
  countTokens: CountTokens,
): string[] {
  if (countTokens(text) <= maxTokens) return [text];

  const lines = text.split('\n');
  if (lines.length > 1) {
    return lines.flatMap((line) =>
      splitOversized(line, maxTokens, countTokens),
    );
  }

  // Split after ". ", "; " or ": " — keeps the punctuation with its sentence.
  const sentences = text.split(/(?<=[.;:])\s+/);
  if (sentences.length > 1) {
    return sentences.flatMap((s) => splitOversized(s, maxTokens, countTokens));
  }

  return [text];
}
