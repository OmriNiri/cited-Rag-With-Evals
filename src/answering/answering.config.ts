// Answering limits. Values marked PROVISIONAL are replaced by eval-tuned ones in Phase 4.

// Quotes shorter than this cannot count as evidence ("the employer" appears everywhere).
export const MIN_QUOTE_WORDS = 4;

// Gate 1: if the best chunk's cosine similarity to the question is below this,
// refuse without calling the model. PROVISIONAL (DECISIONS D25): on 10 hand-picked
// questions, in-scope ones scored 0.43–0.70 and out-of-scope ones 0.14–0.42.
// 0.35 blocks clearly unrelated questions and lets borderline ones reach gates 2–3.
export const MIN_TOP_SIMILARITY = 0.35;

// Chunks given to the model. PROVISIONAL: chosen from eval numbers in Phase 4.
export const ANSWER_TOP_K = 5;

// Calls per question when the model fails in a way worth retrying (timeout,
// unreachable, 5xx, malformed JSON): the first try + one retry. More retries
// would mostly make a user wait longer for the same failure.
export const LLM_ATTEMPTS = 2;
