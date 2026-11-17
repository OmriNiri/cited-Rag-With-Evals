import { Module } from '@nestjs/common';
import { LlmModule } from '../infrastructure/llm/llm.module.js';
import { RetrievalModule } from '../retrieval/retrieval.module.js';
import { AnswerService } from './answer.service.js';
import { AskController } from './ask.controller.js';

// RetrievalModule provides RETRIEVERS, LlmModule provides LLM_CLIENT.
// The controller is only served when this module is part of the HTTP app; CLI
// commands that import it just use AnswerService.
@Module({
  imports: [RetrievalModule, LlmModule],
  controllers: [AskController],
  providers: [AnswerService],
  exports: [AnswerService],
})
export class AnsweringModule {}
