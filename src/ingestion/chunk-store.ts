import type { EmbeddedChunk } from './chunk.types.js';

// What ingestion needs from storage — nothing about SQL or Postgres.
// Implemented by ChunksRepository in src/infrastructure/database/ (DECISIONS D10).

export interface ChunkStore {
  /**
   * Makes the stored chunks of `document` exactly equal to `chunks`:
   * old ones are removed, new ones inserted, all-or-nothing.
   * Calling it twice with the same input leaves the same rows (idempotent).
   */
  replaceDocument(document: string, chunks: EmbeddedChunk[]): Promise<void>;
}

export const CHUNK_STORE = Symbol('CHUNK_STORE');
