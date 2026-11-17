// Settings of the evaluation itself (not of the system being evaluated).

// How deep each retriever's ranking is read. A gold article first found below
// this depth counts as "not found" (reciprocal rank 0), i.e. MRR is MRR@10.
export const EVAL_DEPTH = 10;

// The k values reported as hit@k; the curve is used to choose ANSWER_TOP_K.
export const EVAL_KS = [1, 3, 5, 10] as const;

export const RESULTS_DIR = 'eval/results'; // relative to the project root

// Gate-1 thresholds tried by the sweep: 0.20, 0.25, ... 0.60. Built from whole
// numbers so 0.35 is exactly 0.35 (0.2 + 3 * 0.05 is 0.35000000000000003).
export const SWEEP_THRESHOLDS = Array.from(
  { length: 9 },
  (_, i) => (20 + 5 * i) / 100,
);

// Answers sampled for the blind human check of the judge (Phase 4, step 5).
export const JUDGE_CHECK_SIZE = 15;
export const JUDGE_CHECK_PATH = 'eval/JUDGE-CHECK.md'; // human labels: committed, never overwritten
