import { Module } from '@nestjs/common';
import { DatabaseModule } from '../infrastructure/database/database.module.js';
import { EmbeddingsModule } from '../infrastructure/embeddings/embeddings.module.js';
import { HybridRetriever } from './hybrid.retriever.js';
import { KeywordRetriever } from './keyword.retriever.js';
import { RETRIEVERS, type Retrievers } from './retriever.js';
import { VectorRetriever } from './vector.retriever.js';

@Module({
  // DatabaseModule provides CHUNK_SEARCH, EmbeddingsModule provides EMBEDDER.
  imports: [DatabaseModule, EmbeddingsModule],
  providers: [
    VectorRetriever,
    KeywordRetriever,
    HybridRetriever,
    {
      // One object holding all three, so callers can pick by name ("hybrid")
      // or loop over all of them (the eval in Phase 4).
      provide: RETRIEVERS,
      inject: [VectorRetriever, KeywordRetriever, HybridRetriever],
      useFactory: (
        vector: VectorRetriever,
        keyword: KeywordRetriever,
        hybrid: HybridRetriever,
      ): Retrievers => ({ vector, keyword, hybrid }),
    },
  ],
  exports: [RETRIEVERS],
})
export class RetrievalModule {}
