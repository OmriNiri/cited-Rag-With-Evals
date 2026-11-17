import { LLM_ATTEMPTS } from './answering.config.js';
import type { ChatMessage, LlmClient } from './llm-client.js';
import { LlmError } from './llm-error.js';
import { MODEL_ANSWER_SCHEMA, type ModelAnswer } from './model-answer.js';
import { parseModelAnswer } from './parse-model-answer.js';

/**
 * Asks the model and parses its reply. Calling AND parsing are retried together:
 * a malformed reply is as worth retrying as a timeout. Only errors marked
 * retryable are retried (a 401 or 404 will not fix itself); the last error is
 * thrown so the caller can turn it into a 503.
 */
export async function completeWithRetry(
  client: LlmClient,
  messages: ChatMessage[],
  attempts = LLM_ATTEMPTS,
): Promise<ModelAnswer> {
  for (let attempt = 1; ; attempt++) {
    try {
      const raw = await client.complete({
        messages,
        jsonSchema: MODEL_ANSWER_SCHEMA,
      });
      return parseModelAnswer(raw);
    } catch (error) {
      const retryable = error instanceof LlmError && error.retryable;
      if (!retryable || attempt >= attempts) throw error;
    }
  }
}
