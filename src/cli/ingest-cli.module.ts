import { Module } from '@nestjs/common';
import { AppConfigModule } from '../infrastructure/config/app-config.module.js';
import { IngestionModule } from '../ingestion/ingestion.module.js';

// Only what `npm run ingest` needs: config + ingestion. No HTTP controllers.
@Module({
  imports: [AppConfigModule, IngestionModule],
})
export class IngestCliModule {}
