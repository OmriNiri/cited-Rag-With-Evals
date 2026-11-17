import { LlmError } from '../../answering/llm-error.js';
import type { LlmClient, LlmRequest } from '../../answering/llm-client.js';
import type { LlmConfig } from './llm.config.js';

// Talks to any server implementing the OpenAI "chat completions" HTTP API:
// Ollama locally, or hosted providers by changing LLM_BASE_URL (DECISIONS D4).
// Plain fetch, no SDK: one POST request is all we need.

interface ChatCompletionResponse {
  choices?: { message?: { content?: unknown } }[];
}

export class OpenAiCompatibleClient implements LlmClient {
  readonly model: string;

  constructor(
    private readonly config: LlmConfig,
    // Injectable so unit tests can replace the network with a fake.
    private readonly fetchFn: typeof fetch = fetch,
  ) {
    this.model = config.model;
  }

  async complete({ messages, jsonSchema }: LlmRequest): Promise<string> {
    let response: Response;
    try {
      response = await this.fetchFn(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey
            ? { Authorization: `Bearer ${this.config.apiKey}` }
            : {}),
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0, // most likely token every time: repeatable answers for evaluation
          response_format: {
            type: 'json_schema',
            json_schema: { name: 'answer', schema: jsonSchema, strict: true },
          },
        }),
        // Aborts the request if the model has not answered in time.
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });
    } catch (error) {
      const timedOut = (error as Error).name === 'TimeoutError';
      throw new LlmError(
        timedOut
          ? `LLM did not answer within ${this.config.timeoutMs} ms`
          : `LLM server unreachable at ${this.config.baseUrl}`,
        true,
        { cause: error },
      );
    }

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 200);
      // 5xx = server trouble, 429 = rate limited: may succeed later. Other 4xx will not.
      const retryable = response.status >= 500 || response.status === 429;
      throw new LlmError(
        `LLM returned HTTP ${response.status}: ${detail}`,
        retryable,
      );
    }

    let body: ChatCompletionResponse;
    try {
      body = (await response.json()) as ChatCompletionResponse;
    } catch (error) {
      // e.g. an HTML error page from a proxy, sent with status 200
      throw new LlmError('LLM server sent a non-JSON response', true, {
        cause: error,
      });
    }

    const content = body.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || content.trim() === '') {
      throw new LlmError('LLM reply has no text content', true);
    }
    return content;
  }
}
