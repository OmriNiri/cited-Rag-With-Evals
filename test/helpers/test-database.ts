// Gives each integration test file its own empty, temporary Postgres schema
// (DECISIONS D15). Tests run against the real database engine, but never touch
// the `chunks` table in the developer's `public` schema, and the schema is
// dropped afterwards.

import { randomBytes } from 'node:crypto';
import { Pool } from 'pg';
import { applySchema } from '../../src/infrastructure/database/apply-schema.js';

// Same default as .env.example. Tests read the env var directly (no Nest config),
// and CI sets it to its own Postgres service.
const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgres://rag:rag@localhost:5432/rag';

export interface TestDatabase {
  pool: Pool;
  drop(): Promise<void>;
}

export async function createTestDatabase(): Promise<TestDatabase> {
  const schema = `test_${randomBytes(4).toString('hex')}`;

  const admin = new Pool({ connectionString: DATABASE_URL });
  await admin.query(`CREATE SCHEMA ${schema}`);

  // search_path = where unqualified table names resolve. Our schema first, so
  // "chunks" means test_xxxx.chunks; then public, where the vector type lives.
  const pool = new Pool({
    connectionString: DATABASE_URL,
    options: `-c search_path=${schema},public`,
  });
  await applySchema(pool);

  return {
    pool,
    async drop() {
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    },
  };
}
