// The checked answer that leaves the answering pipeline.

export type RefusalReason =
  | 'low_retrieval_score' // gate 1: nothing relevant enough was retrieved
  | 'model_insufficient_context' // gate 2: the model said the passages do not answer it
  | 'no_valid_citation'; // gate 3: no quote survived the verbatim check

export type InvalidCitationReason =
  | 'unknown_passage' // passage number not among those shown to the model
  | 'too_short' // fewer than MIN_QUOTE_WORDS words
  | 'not_found'; // quote is not word for word in that passage

export interface ValidatedCitation {
  passage: number;
  chunkId: string | null; // null when the passage number was invalid
  article: string | null;
  quote: string;
  valid: boolean;
  invalidReason?: InvalidCitationReason;
}

export interface CitedAnswer {
  refused: boolean;
  refusalReason?: RefusalReason;
  answer: string; // "" when refused
  citations: ValidatedCitation[]; // all of them, invalid ones flagged (never hidden)
}
