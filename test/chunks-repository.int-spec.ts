// ChunksRepository against a real Postgres: the transaction guarantees.

import { ChunksRepository } from '../src/infrastructure/database/chunks.repository.js';
import { fakeChunk } from './helpers/fake-chunks.js';
import {
  createTestDatabase,
  type TestDatabase,
} from './helpers/test-database.js';

describe('ChunksRepository (integration)', () => {
  let db: TestDatabase;
  let repository: ChunksRepository;

  const ids = async (document: string): Promise<string[]> =>
    (
      await db.pool.query<{ id: string }>(
        'SELECT id FROM chunks WHERE document = $1 ORDER BY position',
        [document],
      )
    ).rows.map((r) => r.id);

  beforeEach(async () => {
    db = await createTestDatabase();
    repository = new ChunksRepository(db.pool);
  });

  afterEach(async () => {
    await db.drop();
  });

  it('removes chunks that no longer exist when a document gets shorter', async () => {
    await repository.replaceDocument(
      'doc',
      [0, 1, 2].map((p) => fakeChunk('doc', p)),
    );
    await repository.replaceDocument('doc', [fakeChunk('doc', 0)]);

    expect(await ids('doc')).toEqual(['doc:art-0:0']);
  });

  it('leaves other documents untouched', async () => {
    await repository.replaceDocument('a', [fakeChunk('a', 0)]);
    await repository.replaceDocument('b', [fakeChunk('b', 0)]);
    await repository.replaceDocument('a', []);

    expect(await ids('b')).toEqual(['b:art-0:0']);
  });

  it('rolls back completely on failure: the old chunks survive', async () => {
    await repository.replaceDocument('doc', [
      fakeChunk('doc', 0),
      fakeChunk('doc', 1),
    ]);

    // Same position twice violates UNIQUE(document, position) on the 2nd INSERT,
    // after the DELETE has already run inside the transaction.
    const broken = [
      fakeChunk('doc', 5),
      { ...fakeChunk('doc', 6), position: 5 },
    ];
    await expect(repository.replaceDocument('doc', broken)).rejects.toThrow();

    expect(await ids('doc')).toEqual(['doc:art-0:0', 'doc:art-1:0']);
  });

  it('returns a clean connection to the pool after a failure', async () => {
    const broken = [
      fakeChunk('doc', 5),
      { ...fakeChunk('doc', 6), position: 5 },
    ];
    await expect(repository.replaceDocument('doc', broken)).rejects.toThrow();

    // The pool hands the same idle connection out again. Without ROLLBACK it would
    // still be inside the failed transaction and every statement would be refused.
    await repository.replaceDocument('doc', [fakeChunk('doc', 0)]);
    expect(await ids('doc')).toEqual(['doc:art-0:0']);
  });
});
