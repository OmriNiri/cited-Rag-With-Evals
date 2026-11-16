// What business code needs from an embedding model — nothing about *which* model.
// Implemented in src/infrastructure/embeddings/ (DECISIONS D10).
// Retrieval (Phase 2) uses the same interface to embed questions.

export interface Embedder {
  /** Length of every vector this model returns (must match vector(N) in schema.sql). */
  readonly dimensions: number;

  /** Model-specific token count, incl. special tokens. Used for chunk sizing. */
  countTokens(text: string): number;

  /** One unit-length vector per input text, in the same order. */
  embed(texts: string[]): Promise<number[][]>;
}

/** Injection token: modules ask for "the app's embedder" with @Inject(EMBEDDER). */
export const EMBEDDER = Symbol('EMBEDDER');
