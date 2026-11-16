import { Module } from '@nestjs/common';
import { AppConfigModule } from '../infrastructure/config/app-config.module.js';
import { RetrievalModule } from '../retrieval/retrieval.module.js';

// Only what `npm run search` needs: config + retrieval. No HTTP controllers.
@Module({
  imports: [AppConfigModule, RetrievalModule],
})
export class SearchCliModule {}
