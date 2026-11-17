import { LlmError } from '../../answering/llm-error.js';
import type { LlmRequest } from '../../answering/llm-client.js';
import type { LlmConfig } from './llm.config.js';
import { OpenAiCompatibleClient } from './openai-compatible.client.js';

const config: LlmConfig = {
  baseUrl: 'http://llm.test/v1',
  model: 'test-model',
  timeoutMs: 1000,
};
const request: LlmRequest = {
  messages: [{ role: 'user', content: 'hi' }],
  jsonSchema: { type: 'object' },
};

const okReply = (content: unknown) =>
  new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
    status: 200,
  });

/** A client whose "network" is a mock returning (or throwing) what the test says. */
const clientWith = (result: Response | Error, cfg: LlmConfig = config) => {
  const fetchFn = vi.fn(() =>
    result instanceof Error ? Promise.reject(result) : Promise.resolve(result),
  );
  return { fetchFn, client: new OpenAiCompatibleClient(cfg, fetchFn) };
};

/** Runs the call and returns the LlmError it throws. */
const errorOf = async (client: OpenAiCompatibleClient): Promise<LlmError> => {
  const error = await client.complete(request).catch((e: unknown) => e);
  expect(error).toBeInstanceOf(LlmError);
  return error as LlmError;
};

describe('OpenAiCompatibleClient', () => {
  it('posts an OpenAI-style chat request and returns the reply text', async () => {
    const { client, fetchFn } = clientWith(okReply('{"answer":"x"}'));

    expect(await client.complete(request)).toBe('{"answer":"x"}');

    const [url, init] = fetchFn.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe('http://llm.test/v1/chat/completions');
    expect(JSON.parse(init.body as string)).toMatchObject({
      model: 'test-model',
      messages: request.messages,
      temperature: 0,
      response_format: {
        type: 'json_schema',
        json_schema: { schema: { type: 'object' } },
      },
    });
  });

  it('sends a Bearer token only when an API key is configured', async () => {
    const authOf = async (cfg: LlmConfig) => {
      const { client, fetchFn } = clientWith(okReply('{}'), cfg);
      await client.complete(request);
      const init = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
      return (init[1].headers as Record<string, string>).Authorization;
    };

    expect(await authOf(config)).toBeUndefined();
    expect(await authOf({ ...config, apiKey: 'secret' })).toBe('Bearer secret');
  });

  it('marks server errors (5xx) as retryable', async () => {
    const { client } = clientWith(new Response('boom', { status: 503 }));
    const error = await errorOf(client);
    expect(error.retryable).toBe(true);
    expect(error.message).toContain('HTTP 503');
  });

  it('marks request errors (4xx, e.g. unknown model) as NOT retryable', async () => {
    const { client } = clientWith(
      new Response('model not found', { status: 404 }),
    );
    const error = await errorOf(client);
    expect(error.retryable).toBe(false);
    expect(error.message).toContain('model not found');
  });

  it('turns an unreachable server into a retryable error', async () => {
    const { client } = clientWith(new TypeError('fetch failed'));
    const error = await errorOf(client);
    expect(error.retryable).toBe(true);
    expect(error.message).toContain('unreachable');
  });

  it('reports a timeout clearly', async () => {
    const timeout = new DOMException('timed out', 'TimeoutError');
    const { client } = clientWith(timeout);
    const error = await errorOf(client);
    expect(error.retryable).toBe(true);
    expect(error.message).toContain('within 1000 ms');
  });

  it('turns a non-JSON 200 response into a retryable LlmError', async () => {
    const { client } = clientWith(new Response('<html>proxy</html>'));
    const error = await errorOf(client);
    expect(error.retryable).toBe(true);
    expect(error.message).toContain('non-JSON');
  });

  it('rejects a reply without text content', async () => {
    const { client } = clientWith(okReply(null));
    expect((await errorOf(client)).message).toContain('no text content');
  });
});
