import { MIN_TOP_SIMILARITY } from './answering.config.js';
import type {
  CitedAnswer,
  RefusalReason,
  ValidatedCitation,
} from './answer.types.js';
import type { ModelAnswer } from './model-answer.js';

// The three refusal gates (DECISIONS D25). Pure functions: the service calls
// gate 1 before the model, gates 2–3 after it.

/** Gate 1 — before calling the model. Returns the refusal, or null to continue. */
export function refuseOnLowRetrieval(
  topSimilarity: number,
): CitedAnswer | null {
  return topSimilarity < MIN_TOP_SIMILARITY
    ? refusal('low_retrieval_score')
    : null;
}

/**
 * Gates 2 and 3 — after the model replied and citations were validated.
 * Rule: a factual answer is only returned if at least one citation is valid.
 * A partly valid answer is returned with its invalid citations flagged.
 */
export function decideAnswer(
  model: ModelAnswer,
  citations: ValidatedCitation[],
): CitedAnswer {
  // Gate 2: the model says the passages do not answer the question.
  // An empty answer without "refused" means the same thing in practice.
  if (model.refused || model.answer === '') {
    return { ...refusal('model_insufficient_context'), citations };
  }

  // Gate 3: never return an uncited (or falsely cited) factual answer.
  if (!citations.some((c) => c.valid)) {
    return { ...refusal('no_valid_citation'), citations };
  }

  return { refused: false, answer: model.answer, citations };
}

function refusal(refusalReason: RefusalReason): CitedAnswer {
  return { refused: true, refusalReason, answer: '', citations: [] };
}
