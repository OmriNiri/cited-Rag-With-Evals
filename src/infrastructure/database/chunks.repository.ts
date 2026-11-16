import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import type { ChunkStore } from '../../ingestion/chunk-store.js';
import type { EmbeddedChunk } from '../../ingestion/chunk.types.js';
import { PG_POOL } from './pg-pool.token.js';

/** All SQL for the chunks table lives here. */
@Injectable()
export class ChunksRepository implements ChunkStore {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async replaceDocument(
    document: string,
    chunks: EmbeddedChunk[],
  ): Promise<void> {
    // A transaction needs one dedicated connection: BEGIN, the statements and
    // COMMIT must all run on the same connection, so we borrow one from the pool.
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Delete-then-insert (not upsert) also removes chunks that no longer exist,
      // e.g. when a document got shorter (DECISIONS D14).
      await client.query('DELETE FROM chunks WHERE document = $1', [document]);

      for (const chunk of chunks) {
        await client.query(
          `INSERT INTO chunks (id, document, section, article, position, text, embedding)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            chunk.id,
            chunk.document,
            chunk.section,
            chunk.article,
            chunk.position,
            chunk.text,
            // pgvector accepts the text form "[0.1,0.2,...]", which is exactly JSON array syntax.
            JSON.stringify(chunk.embedding),
          ],
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      // Any failure undoes the DELETE too: the old chunks stay, nothing half-written.
      await client.query('ROLLBACK');
      throw error;
    } finally {
      // Always hand the connection back, or the pool slowly runs out.
      client.release();
    }
  }
}
