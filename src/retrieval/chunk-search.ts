import type { SearchHit, SearchOptions } from './search.types.js';

// What retrieval needs from storage: two read queries, nothing about SQL.
// Separate from ingestion's ChunkStore (write-only): each feature depends on
// the smallest interface it needs (interface segregation, DECISIONS D19).

export interface ChunkSearch {
  /** Nearest chunks to a query embedding, most similar first. */
  searchByVector(
    embedding: number[],
    options: SearchOptions,
  ): Promise<SearchHit[]>;

  /** Full-text matches for a natural-language query, best match first. */
  searchByKeyword(query: string, options: SearchOptions): Promise<SearchHit[]>;
}

export const CHUNK_SEARCH = Symbol('CHUNK_SEARCH');
