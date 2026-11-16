import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Pool } from 'pg';

// schema.sql sits next to this file. Nest copies it into dist/ at build time
// (see "assets" in nest-cli.json), so this path works in src/ and dist/ alike.
const SCHEMA_PATH = join(import.meta.dirname, 'schema.sql');

// Any fixed number works; every caller of applySchema uses this same key.
const SCHEMA_LOCK_KEY = 319_343;

/**
 * Creates the extension, table and indexes if they do not exist yet.
 * Idempotent AND safe when several processes run it at the same time (DECISIONS D21).
 */
export async function applySchema(pool: Pool): Promise<void> {
  const sql = await readFile(SCHEMA_PATH, 'utf8');

  // "IF NOT EXISTS" is check-then-create, which is not atomic: two processes can
  // both see "missing" and both try to create -> duplicate-key error. An advisory
  // lock makes them take turns. The lock belongs to this transaction, so it is
  // released automatically at COMMIT or ROLLBACK (it can never be left behind).
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [SCHEMA_LOCK_KEY]);
    // A query without parameters may contain several statements; pg sends them in one go.
    await client.query(sql);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
