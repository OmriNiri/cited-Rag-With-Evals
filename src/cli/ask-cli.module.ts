import { Module } from '@nestjs/common';
import { AnsweringModule } from '../answering/answering.module.js';
import { AppConfigModule } from '../infrastructure/config/app-config.module.js';

// Only what `npm run ask` needs: config + the answering pipeline. No HTTP server.
@Module({
  imports: [AppConfigModule, AnsweringModule],
})
export class AskCliModule {}
