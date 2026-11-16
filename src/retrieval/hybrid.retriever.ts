import { Inject, Injectable } from '@nestjs/common';
import { KeywordRetriever } from './keyword.retriever.js';
import { HYBRID_CANDIDATES } from './retrieval.config.js';
import type { Retriever } from './retriever.js';
import { reciprocalRankFusion } from './rrf.js';
import type { SearchHit, SearchOptions } from './search.types.js';
import { VectorRetriever } from './vector.retriever.js';

/**
 * Runs vector and keyword search, then merges both rankings with RRF.
 * Depends on the Retriever interface (Nest injects the two concrete classes),
 * so unit tests can pass simple fakes.
 */
@Injectable()
export class HybridRetriever implements Retriever {
  readonly mode = 'hybrid';

  constructor(
    @Inject(VectorRetriever) private readonly vector: Retriever,
    @Inject(KeywordRetriever) private readonly keyword: Retriever,
  ) {}

  async retrieve(
    question: string,
    options: SearchOptions,
  ): Promise<SearchHit[]> {
    const candidates = {
      ...options,
      limit: Math.max(HYBRID_CANDIDATES, options.limit),
    };

    // Independent searches, so they run at the same time.
    const [vectorHits, keywordHits] = await Promise.all([
      this.vector.retrieve(question, candidates),
      this.keyword.retrieve(question, candidates),
    ]);

    // RRF only needs ids in order; the chunk data is looked up afterwards.
    const byId = new Map<string, SearchHit>();
    for (const hit of [...vectorHits, ...keywordHits]) byId.set(hit.id, hit);

    return reciprocalRankFusion([
      vectorHits.map((h) => h.id),
      keywordHits.map((h) => h.id),
    ])
      .slice(0, options.limit)
      .map(({ id, score }) => ({ ...byId.get(id)!, score })); // score = RRF score
  }
}
