// One line of eval/questions.jsonl.

/** Is the question phrased like a person would ask, or in the law's own words? (D18 hypothesis) */
export type EvalWording = 'casual' | 'legal';

export interface EvalQuestion {
  id: string; // "q01"
  question: string;
  answerable: boolean; // false: the corpus does not answer it, the right result is a refusal
  // Articles that answer the question, e.g. ["Art. 335c"]. Article level, not chunk
  // level, so re-chunking does not break the set. Empty when not answerable.
  goldArticles: string[];
  wording: EvalWording;
  note?: string;
}
