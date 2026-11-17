import { Module } from '@nestjs/common';
import { LlmModule } from '../infrastructure/llm/llm.module.js';
import { RetrievalModule } from '../retrieval/retrieval.module.js';
import { AnswerService } from './answer.service.js';

// RetrievalModule provides RETRIEVERS, LlmModule provides LLM_CLIENT.
@Module({
  imports: [RetrievalModule, LlmModule],
  providers: [AnswerService],
  exports: [AnswerService],
})
export class AnsweringModule {}
