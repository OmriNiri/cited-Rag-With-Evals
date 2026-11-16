import { Module } from '@nestjs/common';
import { DatabaseModule } from '../infrastructure/database/database.module.js';
import { EmbeddingsModule } from '../infrastructure/embeddings/embeddings.module.js';
import { IngestionService } from './ingestion.service.js';

// Importing these modules is what makes CHUNK_STORE and EMBEDDER injectable here.
@Module({
  imports: [DatabaseModule, EmbeddingsModule],
  providers: [IngestionService],
  exports: [IngestionService],
})
export class IngestionModule {}
