import type { RetrievalMode } from '../retrieval/retriever.js';

// Answering limits. The retriever, threshold and top-k were chosen from the
// Phase 4 eval (eval/results/, DECISIONS D28–D29).

// Quotes shorter than this cannot count as evidence ("the employer" appears everywhere).
export const MIN_QUOTE_WORDS = 4;

// Gate 1: if the best chunk's cosine similarity to the question is below this,
// refuse without calling the model. Kept after the Phase 4 sweep (D29): on the
// 40-question set it refuses 0/30 answerable questions (lowest 0.366) and blocks
// 5/10 unanswerable ones; gates 2–3 handle the rest. The margin is thin.
export const MIN_TOP_SIMILARITY = 0.35;

// Chunks given to the model. Vector hit@5 = 29/30 on the eval set (D29).
export const ANSWER_TOP_K = 5;

// Calls per question when the model fails in a way worth retrying (timeout,
// unreachable, 5xx, malformed JSON): the first try + one retry. More retries
// would mostly make a user wait longer for the same failure.
export const LLM_ATTEMPTS = 2;

// Longest accepted question. The embedding model reads at most 256 tokens, and a
// real question is one or two sentences; a cap also limits abuse of the endpoint.
export const MAX_QUESTION_CHARS = 500;

// Retriever that supplies the passages. Vector, not hybrid (D28): better hit@5
// (29/30 vs 25/30) and gold-citation rate in the Phase 4 eval.
export const ANSWER_RETRIEVAL_MODE: RetrievalMode = 'vector';
