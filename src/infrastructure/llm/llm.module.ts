import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLM_CLIENT } from '../../answering/llm-client.js';
import { readLlmConfig } from './llm.config.js';
import { OpenAiCompatibleClient } from './openai-compatible.client.js';

// Binds the LlmClient interface to the OpenAI-compatible HTTP client.
// The LLM settings are read and validated here, so only processes that import
// this module (the API, `npm run ask`) need them.
@Module({
  providers: [
    {
      provide: LLM_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new OpenAiCompatibleClient(
          readLlmConfig({
            LLM_BASE_URL: config.get<string>('LLM_BASE_URL'),
            LLM_API_KEY: config.get<string>('LLM_API_KEY'),
            LLM_MODEL: config.get<string>('LLM_MODEL'),
            LLM_TIMEOUT_MS: config.get<string>('LLM_TIMEOUT_MS'),
          }),
        ),
    },
  ],
  exports: [LLM_CLIENT],
})
export class LlmModule {}
