import { Inject, Injectable } from '@nestjs/common';
import { EMBEDDER, type Embedder } from '../ingestion/embedder.js';
import { CHUNK_SEARCH, type ChunkSearch } from './chunk-search.js';
import type { Retriever } from './retriever.js';
import type { SearchHit, SearchOptions } from './search.types.js';

/** Semantic search: finds chunks with similar *meaning*, even with different words. */
@Injectable()
export class VectorRetriever implements Retriever {
  readonly mode = 'vector';

  constructor(
    @Inject(EMBEDDER) private readonly embedder: Embedder,
    @Inject(CHUNK_SEARCH) private readonly search: ChunkSearch,
  ) {}

  async retrieve(
    question: string,
    options: SearchOptions,
  ): Promise<SearchHit[]> {
    // The question is embedded with the same model as the chunks; otherwise the
    // vectors would live in different "spaces" and distances would be meaningless.
    const [embedding] = await this.embedder.embed([question]);
    return this.search.searchByVector(embedding, options);
  }
}
