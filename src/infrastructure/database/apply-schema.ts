import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Pool, PoolClient } from 'pg';

// schema.sql sits next to this file. Nest copies it into dist/ at build time
// (see "assets" in nest-cli.json), so this path works in src/ and dist/ alike.
const SCHEMA_PATH = join(import.meta.dirname, 'schema.sql');

/** Creates the extension, table and indexes if they do not exist yet. Idempotent. */
export async function applySchema(db: Pool | PoolClient): Promise<void> {
  const sql = await readFile(SCHEMA_PATH, 'utf8');
  // A query without parameters may contain several statements; pg sends them in one go.
  await db.query(sql);
}
