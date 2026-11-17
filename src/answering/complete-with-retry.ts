import { LLM_ATTEMPTS } from './answering.config.js';
import type { LlmClient, LlmRequest } from './llm-client.js';
import { LlmError } from './llm-error.js';

/**
 * Asks the model and parses its reply with `parse`. Used for answers and for the
 * eval judge. Calling AND parsing are retried together: a malformed reply is as
 * worth retrying as a timeout. Only errors marked retryable are retried (a 401
 * or 404 will not fix itself); the last error is thrown to the caller.
 */
export async function completeWithRetry<T>(
  client: LlmClient,
  request: LlmRequest,
  parse: (raw: string) => T,
  attempts = LLM_ATTEMPTS,
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return parse(await client.complete(request));
    } catch (error) {
      const retryable = error instanceof LlmError && error.retryable;
      if (!retryable || attempt >= attempts) throw error;
    }
  }
}
