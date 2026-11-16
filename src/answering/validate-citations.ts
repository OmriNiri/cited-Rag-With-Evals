import type { SearchHit } from '../retrieval/search.types.js';
import { MIN_QUOTE_WORDS } from './answering.config.js';
import type { ValidatedCitation } from './answer.types.js';
import type { ModelCitation } from './model-answer.js';
import { countWords, normalizeForMatch } from './normalize-for-match.js';

/**
 * Deterministic check of every citation the model gave — this is what stops the
 * model from inventing sources. For each citation:
 *   1. map the passage number to the chunk that was shown as [n]  (else unknown_passage)
 *   2. require at least MIN_QUOTE_WORDS words                      (else too_short)
 *   3. require the quote to appear in that chunk's stored text     (else not_found)
 * Nothing is trusted to the model; invalid citations are kept and flagged.
 */
export function validateCitations(
  citations: ModelCitation[],
  hits: SearchHit[],
): ValidatedCitation[] {
  return citations.map(({ passage, quote }) => {
    const hit = hits[passage - 1]; // [1] in the prompt is hits[0]
    if (!hit) {
      return invalid(passage, null, quote, 'unknown_passage');
    }
    if (countWords(quote) < MIN_QUOTE_WORDS) {
      return invalid(passage, hit, quote, 'too_short');
    }
    if (!normalizeForMatch(hit.text).includes(normalizeForMatch(quote))) {
      return invalid(passage, hit, quote, 'not_found');
    }
    return {
      passage,
      chunkId: hit.id,
      article: hit.article,
      quote,
      valid: true,
    };
  });
}

function invalid(
  passage: number,
  hit: SearchHit | null,
  quote: string,
  invalidReason: ValidatedCitation['invalidReason'],
): ValidatedCitation {
  return {
    passage,
    chunkId: hit?.id ?? null,
    article: hit?.article ?? null,
    quote,
    valid: false,
    invalidReason,
  };
}
