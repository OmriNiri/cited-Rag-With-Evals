// Shapes shared by everything in retrieval/.

/** One retrieved chunk with the score of the method that found it. */
export interface SearchHit {
  id: string;
  document: string;
  section: string;
  article: string;
  text: string;
  // Meaning depends on the method: cosine similarity (vector), ts_rank (keyword),
  // RRF score (hybrid). Only comparable within one method's results.
  score: number;
}

export interface SearchOptions {
  limit: number; // how many hits to return (top-k)
  document?: string; // optional filter: only chunks from this document
}
