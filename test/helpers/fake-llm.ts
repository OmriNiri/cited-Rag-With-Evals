import type { LlmClient, LlmRequest } from '../../src/answering/llm-client.js';

/**
 * Plays back scripted replies in order: a string is returned as the model's
 * reply, an Error is thrown. Remembers every request it received.
 */
export class FakeLlmClient implements LlmClient {
  readonly model = 'fake-model';
  readonly requests: LlmRequest[] = [];

  constructor(private readonly script: (string | Error)[]) {}

  complete(request: LlmRequest): Promise<string> {
    this.requests.push(request);
    const next = this.script.shift();
    if (next === undefined) throw new Error('FakeLlmClient: no reply left');
    return next instanceof Error ? Promise.reject(next) : Promise.resolve(next);
  }
}

/** A well-formed model reply as JSON text. */
export function modelReply(
  answer: string,
  citations: { passage: number; quote: string }[],
  refused = false,
): string {
  return JSON.stringify({ answer, citations, refused });
}
