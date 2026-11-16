import { FakeRetriever } from '../../test/helpers/fake-retrieval.js';
import { HybridRetriever } from './hybrid.retriever.js';
import { HYBRID_CANDIDATES } from './retrieval.config.js';
import { RRF_K } from './rrf.js';

describe('HybridRetriever', () => {
  const setup = (vectorRanking: string[], keywordRanking: string[]) => {
    const vector = new FakeRetriever('vector', vectorRanking);
    const keyword = new FakeRetriever('keyword', keywordRanking);
    return { vector, keyword, hybrid: new HybridRetriever(vector, keyword) };
  };

  it('fuses both rankings with RRF and returns the fused score', async () => {
    const { hybrid } = setup(['x', 'y'], ['z', 'y']);

    const hits = await hybrid.retrieve('q', { limit: 3 });

    expect(hits.map((h) => h.id)).toEqual(['y', 'x', 'z']);
    expect(hits[0].score).toBe(2 / (RRF_K + 2));
  });

  it('keeps the chunk data (text etc.) of each hit', async () => {
    const { hybrid } = setup(['x'], []);
    const [hit] = await hybrid.retrieve('q', { limit: 1 });
    expect(hit.text).toBe('text of x');
  });

  it('asks each method for more candidates than the final limit', async () => {
    const { hybrid, vector, keyword } = setup([], []);

    await hybrid.retrieve('q', { limit: 5 });

    expect(vector.calls[0].options.limit).toBe(HYBRID_CANDIDATES);
    expect(keyword.calls[0].options.limit).toBe(HYBRID_CANDIDATES);
  });

  it('asks for at least `limit` candidates when the limit is large', async () => {
    const { hybrid, vector } = setup([], []);
    await hybrid.retrieve('q', { limit: 50 });
    expect(vector.calls[0].options.limit).toBe(50);
  });

  it('passes the question and document filter to both methods', async () => {
    const { hybrid, vector, keyword } = setup([], []);

    await hybrid.retrieve('notice?', { limit: 5, document: 'law' });

    for (const fake of [vector, keyword]) {
      expect(fake.calls[0].question).toBe('notice?');
      expect(fake.calls[0].options.document).toBe('law');
    }
  });

  it('cuts the fused list to the requested limit', async () => {
    const { hybrid } = setup(['a', 'b', 'c'], ['d', 'e', 'f']);
    expect(await hybrid.retrieve('q', { limit: 2 })).toHaveLength(2);
  });

  it('still works when one method finds nothing', async () => {
    const { hybrid } = setup(['a', 'b'], []);
    const hits = await hybrid.retrieve('q', { limit: 5 });
    expect(hits.map((h) => h.id)).toEqual(['a', 'b']);
  });
});
