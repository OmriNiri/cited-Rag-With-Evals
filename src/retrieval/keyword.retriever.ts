import { Inject, Injectable } from '@nestjs/common';
import { CHUNK_SEARCH, type ChunkSearch } from './chunk-search.js';
import type { Retriever } from './retriever.js';
import type { SearchHit, SearchOptions } from './search.types.js';

/** Lexical search: finds chunks containing the question's words (stemmed, OR). */
@Injectable()
export class KeywordRetriever implements Retriever {
  readonly mode = 'keyword';

  constructor(@Inject(CHUNK_SEARCH) private readonly search: ChunkSearch) {}

  retrieve(question: string, options: SearchOptions): Promise<SearchHit[]> {
    return this.search.searchByKeyword(question, options);
  }
}
