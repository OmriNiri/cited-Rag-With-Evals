import { Module } from '@nestjs/common';
import { AnsweringModule } from '../answering/answering.module.js';
import { AppConfigModule } from '../infrastructure/config/app-config.module.js';
import { LlmModule } from '../infrastructure/llm/llm.module.js';

// `npm run eval:answers`: the answering pipeline (AnswerService) + the LLM client
// for the judge. Nest creates LlmModule once, so both share one client.
@Module({
  imports: [AppConfigModule, AnsweringModule, LlmModule],
})
export class EvalAnswersCliModule {}
