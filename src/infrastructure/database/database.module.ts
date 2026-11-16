import { Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { CHUNK_STORE } from '../../ingestion/chunk-store.js';
import { CHUNK_SEARCH } from '../../retrieval/chunk-search.js';
import type { Env } from '../config/env.validation.js';
import { ChunksSearchRepository } from './chunks-search.repository.js';
import { ChunksRepository } from './chunks.repository.js';
import { PG_POOL } from './pg-pool.token.js';

@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      // One pool for the whole app: it keeps a few connections open and reuses
      // them, instead of opening a new connection per query (slow).
      useFactory: (config: ConfigService<Env, true>) =>
        new Pool({
          connectionString: config.get('DATABASE_URL', { infer: true }),
          // Fail fast if the database is unreachable instead of hanging.
          connectionTimeoutMillis: 2000,
        }),
    },
    // Business code asks for interfaces (CHUNK_STORE, CHUNK_SEARCH); this is where
    // they get bound to the Postgres implementations.
    { provide: CHUNK_STORE, useClass: ChunksRepository },
    { provide: CHUNK_SEARCH, useClass: ChunksSearchRepository },
  ],
  exports: [PG_POOL, CHUNK_STORE, CHUNK_SEARCH],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  // Close all connections cleanly when the app stops (Ctrl+C, container stop).
  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
