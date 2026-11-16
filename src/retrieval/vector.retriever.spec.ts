import type { Embedder } from '../ingestion/embedder.js';
import type { ChunkSearch } from './chunk-search.js';
import { VectorRetriever } from './vector.retriever.js';

describe('VectorRetriever', () => {
  it('embeds the question and searches with that vector and the same options', async () => {
    // Mocks kept as standalone functions so the assertions can inspect them directly.
    const embed = vi.fn().mockResolvedValue([[0.1, 0.2, 0.3]]);
    const searchByVector = vi.fn().mockResolvedValue([]);

    const embedder: Embedder = { dimensions: 3, countTokens: () => 0, embed };
    const search: ChunkSearch = { searchByVector, searchByKeyword: vi.fn() };

    await new VectorRetriever(embedder, search).retrieve('notice?', {
      limit: 5,
      document: 'law',
    });

    expect(embed).toHaveBeenCalledWith(['notice?']);
    expect(searchByVector).toHaveBeenCalledWith([0.1, 0.2, 0.3], {
      limit: 5,
      document: 'law',
    });
  });
});
