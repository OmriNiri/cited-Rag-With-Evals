// `npm run ingest`: builds the chunks table from corpus/*.txt.
// Thin entry point: start Nest without HTTP, ensure the schema, run the service, print a summary.

import { NestFactory } from '@nestjs/core';
import type { Pool } from 'pg';
import { applySchema } from '../infrastructure/database/apply-schema.js';
import { PG_POOL } from '../infrastructure/database/pg-pool.token.js';
import { IngestionService } from '../ingestion/ingestion.service.js';
import { IngestCliModule } from './ingest-cli.module.js';

const CORPUS_DIR = 'corpus'; // relative to the project root, where npm scripts run

// createApplicationContext = full dependency injection, but no web server.
const app = await NestFactory.createApplicationContext(IngestCliModule, {
  logger: ['log', 'warn', 'error'],
});

try {
  // Idempotent: creates the table and indexes on first run, does nothing afterwards.
  await applySchema(app.get<Pool>(PG_POOL));

  const started = Date.now();
  const reports = await app.get(IngestionService).ingestDirectory(CORPUS_DIR);

  console.table(reports);
  console.log(`Done in ${((Date.now() - started) / 1000).toFixed(1)} s`);
} catch (error) {
  console.error('Ingestion failed:', error);
  process.exitCode = 1; // non-zero exit so scripts/CI notice the failure
} finally {
  await app.close(); // runs shutdown hooks -> closes the database pool
}
