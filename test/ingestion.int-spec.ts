// The full ingestion pipeline with the real corpus, real MiniLM model and real Postgres.

import { ChunksRepository } from '../src/infrastructure/database/chunks.repository.js';
import { MiniLmEmbedder } from '../src/infrastructure/embeddings/minilm.embedder.js';
import { MAX_EMBEDDING_TOKENS } from '../src/ingestion/chunking.config.js';
import { IngestionService } from '../src/ingestion/ingestion.service.js';
import {
  createTestDatabase,
  type TestDatabase,
} from './helpers/test-database.js';

describe('Ingestion pipeline (integration)', () => {
  let db: TestDatabase;
  let service: IngestionService;

  const snapshot = async () =>
    (
      await db.pool.query<{ id: string; dims: number }>(
        'SELECT id, vector_dims(embedding) AS dims FROM chunks ORDER BY id',
      )
    ).rows;

  beforeAll(async () => {
    db = await createTestDatabase();
    // Plain constructors instead of Nest: the test wires the real parts directly.
    service = new IngestionService(
      await MiniLmEmbedder.create(),
      new ChunksRepository(db.pool),
    );
  });

  afterAll(async () => {
    await db.drop();
  });

  it('stores every chunk with a 384-dim embedding, within the token limit', async () => {
    const [report] = await service.ingestDirectory('corpus');
    const rows = await snapshot();

    expect(rows).toHaveLength(report.chunks);
    expect(rows.every((r) => r.dims === 384)).toBe(true);
    expect(report.maxChunkTokens).toBeLessThanOrEqual(MAX_EMBEDDING_TOKENS);
  });

  it('is idempotent: a second run leaves exactly the same rows', async () => {
    const before = await snapshot();
    await service.ingestDirectory('corpus');

    expect(await snapshot()).toEqual(before);
  });
});
