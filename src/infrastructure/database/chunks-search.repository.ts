import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import type { ChunkSearch } from '../../retrieval/chunk-search.js';
import type { SearchHit, SearchOptions } from '../../retrieval/search.types.js';
import { PG_POOL } from './pg-pool.token.js';

// Read-side SQL for the chunks table. Write-side SQL is in chunks.repository.ts.
// In both queries, `$2::text IS NULL OR document = $2` makes the document filter
// optional with one query instead of two string-built variants.

const VECTOR_SQL = `
  SELECT id, document, section, article, text,
         1 - (embedding <=> $1::vector) AS score   -- cosine distance -> similarity
  FROM chunks
  WHERE ($2::text IS NULL OR document = $2)
  ORDER BY embedding <=> $1::vector, id           -- same expression as the HNSW index
  LIMIT $3`;

// plainto_tsquery joins the words with AND ("&"): a natural question then matches
// almost nothing, because every word (incl. "long", "how") must appear. Replacing
// "&" by "|" (OR) lets any word match; ts_rank then puts chunks with more and rarer
// matching words first (DECISIONS D17).
const KEYWORD_SQL = `
  WITH q AS (
    SELECT replace(plainto_tsquery('english', $1)::text, '&', '|')::tsquery AS query
  )
  SELECT id, document, section, article, text,
         ts_rank(tsv, q.query) AS score
  FROM chunks, q
  WHERE tsv @@ q.query
    AND ($2::text IS NULL OR document = $2)
  ORDER BY score DESC, id
  LIMIT $3`;

@Injectable()
export class ChunksSearchRepository implements ChunkSearch {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async searchByVector(
    embedding: number[],
    { limit, document }: SearchOptions,
  ): Promise<SearchHit[]> {
    const { rows } = await this.pool.query<SearchHit>(VECTOR_SQL, [
      JSON.stringify(embedding), // pgvector text format "[0.1,0.2,...]"
      document ?? null,
      limit,
    ]);
    return rows;
  }

  async searchByKeyword(
    query: string,
    { limit, document }: SearchOptions,
  ): Promise<SearchHit[]> {
    const { rows } = await this.pool.query<SearchHit>(KEYWORD_SQL, [
      query,
      document ?? null,
      limit,
    ]);
    return rows;
  }
}
