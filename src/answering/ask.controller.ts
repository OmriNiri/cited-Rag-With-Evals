import {
  Body,
  Controller,
  HttpCode,
  Logger,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AnswerService } from './answer.service.js';
import type { CitedAnswer } from './answer.types.js';
import { LlmError } from './llm-error.js';
import { parseAskBody } from './parse-ask-body.js';

// POST /ask {"question": "..."} -> CitedAnswer.
// A refusal is a normal answer (200), not an error: the system worked and decided
// it cannot answer. Only "the model is unavailable" is an error (503).
@Controller('ask')
export class AskController {
  private readonly logger = new Logger(AskController.name);

  constructor(private readonly answers: AnswerService) {}

  @Post()
  @HttpCode(200) // Nest's default for POST is 201 Created, but nothing is created
  async ask(@Body() body: unknown): Promise<CitedAnswer> {
    const question = parseAskBody(body);
    try {
      return await this.answers.ask(question);
    } catch (error) {
      if (error instanceof LlmError) {
        // Full reason in the server log; the client only needs to know to retry later.
        this.logger.error(`Model failed after retry: ${error.message}`);
        throw new ServiceUnavailableException(
          'The language model is unavailable, please try again later',
        );
      }
      throw error; // anything else is a bug or a database problem -> 500
    }
  }
}
