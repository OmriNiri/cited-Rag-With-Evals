// Settings of the evaluation itself (not of the system being evaluated).

// How deep each retriever's ranking is read. A gold article first found below
// this depth counts as "not found" (reciprocal rank 0), i.e. MRR is MRR@10.
export const EVAL_DEPTH = 10;

// The k values reported as hit@k; the curve is used to choose ANSWER_TOP_K.
export const EVAL_KS = [1, 3, 5, 10] as const;

export const RESULTS_DIR = 'eval/results'; // relative to the project root
