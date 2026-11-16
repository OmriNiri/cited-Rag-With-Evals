import { Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import type { Env } from '../config/env.validation.js';

// Injection token for the shared pool. A Symbol (not the Pool class) is used so
// consumers ask for "the app's pool" explicitly: @Inject(PG_POOL).
export const PG_POOL = Symbol('PG_POOL');

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
  ],
  exports: [PG_POOL],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  // Close all connections cleanly when the app stops (Ctrl+C, container stop).
  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
