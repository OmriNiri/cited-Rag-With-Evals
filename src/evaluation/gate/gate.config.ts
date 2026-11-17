// Minimum retrieval quality CI accepts (DECISIONS D33). Checked by `npm run eval:gate`
// on the results `npm run eval:retrieval` just wrote. Baseline = Phase 4 run
// (eval/results/retrieval.md, threshold.md) for the retriever /ask uses (vector).
// Each limit allows ONE question of slack: CI runs on Linux, development on macOS,
// and tiny floating-point differences in the embedding model could move one rank.

export const RETRIEVAL_GATE = {
  // The gate counts questions, so a changed eval set must update this on purpose.
  answerableQuestions: 30,
  // Baseline 29/30 found a gold article in the top 5 (the top-k /ask uses).
  minHitsAt5: 28,
  // Baseline MRR@10 = 0.754; one question dropping from rank 1 to "not found"
  // costs 1/30 = 0.033.
  minMrr: 0.72,
  // Baseline 0/30: no answerable question refused by gate 1. A refusal there is
  // final, so no slack: any new false refusal fails the build.
  maxFalseRefusals: 0,
} as const;
