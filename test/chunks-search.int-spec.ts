// ChunksSearchRepository against a real Postgres, with hand-made chunks whose
// expected ranking is known in advance.

import { ChunksSearchRepository } from '../src/infrastructure/database/chunks-search.repository.js';
import { ChunksRepository } from '../src/infrastructure/database/chunks.repository.js';
import { axis, fakeChunk } from './helpers/fake-chunks.js';
import {
  createTestDatabase,
  type TestDatabase,
} from './helpers/test-database.js';

describe('ChunksSearchRepository (integration)', () => {
  let db: TestDatabase;
  let search: ChunksSearchRepository;
  const ids = (hits: { id: string }[]) => hits.map((h) => h.id);

  beforeAll(async () => {
    db = await createTestDatabase();
    search = new ChunksSearchRepository(db.pool);
    const store = new ChunksRepository(db.pool);

    // [0.8, 0.6] is a unit vector at cosine 0.8 from axis 0.
    const between = axis(0, 0.8).map((v, i) => (i === 1 ? 0.6 : v));

    await store.replaceDocument('law', [
      fakeChunk('law', 0, {
        text: 'The employment may be terminated at one month notice.',
        embedding: axis(0),
      }),
      fakeChunk('law', 1, {
        text: 'Notice of termination during probation is seven days.',
        embedding: between,
      }),
      fakeChunk('law', 2, {
        text: 'The employer pays a salary supplement for overtime.',
        embedding: axis(1),
      }),
      fakeChunk('law', 3, {
        section: 'Probation period',
        text: 'Special rules apply.',
        embedding: axis(2),
      }),
    ]);
    await store.replaceDocument('other', [
      fakeChunk('other', 0, {
        text: 'Notice rules of another document.',
        embedding: axis(0),
      }),
    ]);
  });

  afterAll(async () => {
    await db?.drop(); // db is undefined if setup failed; do not hide the real error
  });

  describe('searchByVector', () => {
    it('returns the nearest chunks first, with cosine similarity as score', async () => {
      const hits = await search.searchByVector(axis(0), {
        limit: 3,
        document: 'law',
      });

      expect(ids(hits)).toEqual(['law:art-0:0', 'law:art-1:0', 'law:art-2:0']);
      expect(hits.map((h) => Number(h.score.toFixed(3)))).toEqual([1, 0.8, 0]);
    });

    it('respects the limit', async () => {
      expect(await search.searchByVector(axis(0), { limit: 2 })).toHaveLength(
        2,
      );
    });

    it('searches all documents when no filter is given', async () => {
      const hits = await search.searchByVector(axis(0), { limit: 10 });
      expect(ids(hits)).toContain('other:art-0:0');
    });
  });

  describe('searchByKeyword', () => {
    it('matches ANY word (OR), ranking chunks with more matches higher', async () => {
      const hits = await search.searchByKeyword(
        'How long is the notice period during probation?',
        { limit: 10, document: 'law' },
      );

      // Chunk 1 has "notice" + "probation"; chunk 3 has "probation" (+ "period"
      // in its heading); chunk 0 only "notice". The overtime chunk matches nothing.
      expect(ids(hits)[0]).toBe('law:art-1:0');
      expect(ids(hits)).toEqual(
        expect.arrayContaining(['law:art-0:0', 'law:art-3:0']),
      );
      expect(ids(hits)).not.toContain('law:art-2:0');
    });

    it('matches different forms of a word (stemming)', async () => {
      const hits = await search.searchByKeyword('terminating', {
        limit: 10,
        document: 'law',
      });
      // "terminated" and "termination" both stem to "termin".
      expect(ids(hits).sort()).toEqual(['law:art-0:0', 'law:art-1:0']);
    });

    it('finds a chunk through its section heading', async () => {
      const hits = await search.searchByKeyword('probation', {
        limit: 10,
        document: 'law',
      });
      expect(ids(hits)).toContain('law:art-3:0');
    });

    it('applies the document filter', async () => {
      const hits = await search.searchByKeyword('notice', {
        limit: 10,
        document: 'other',
      });
      expect(ids(hits)).toEqual(['other:art-0:0']);
    });

    it('returns nothing (no error) for a query of only stop words', async () => {
      expect(await search.searchByKeyword('the of and', { limit: 10 })).toEqual(
        [],
      );
    });
  });
});
