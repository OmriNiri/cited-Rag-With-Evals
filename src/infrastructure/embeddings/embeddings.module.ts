import { Module } from '@nestjs/common';
import { EMBEDDER } from '../../ingestion/embedder.js';
import { MiniLmEmbedder } from './minilm.embedder.js';

// Binds the business interface (EMBEDDER) to the concrete local model.
// Swapping to another embedder means changing only this file (and vector(N) in schema.sql).
@Module({
  providers: [
    {
      provide: EMBEDDER,
      // Async factory: Nest waits for the model to load before the app starts,
      // so the first request never pays the loading time.
      useFactory: () => MiniLmEmbedder.create(),
    },
  ],
  exports: [EMBEDDER],
})
export class EmbeddingsModule {}
