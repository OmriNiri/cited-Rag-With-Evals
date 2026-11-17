import { FakeLlmClient, modelReply } from '../../test/helpers/fake-llm.js';
import { completeWithRetry } from './complete-with-retry.js';
import { LlmError } from './llm-error.js';

const messages = [{ role: 'user' as const, content: 'q' }];
const good = modelReply('One month.', [{ passage: 1, quote: 'a b c d' }]);

describe('completeWithRetry', () => {
  it('returns the parsed answer on the first try', async () => {
    const client = new FakeLlmClient([good]);
    await expect(completeWithRetry(client, messages)).resolves.toMatchObject({
      answer: 'One month.',
    });
    expect(client.requests).toHaveLength(1);
  });

  it('retries once after a retryable error (e.g. timeout)', async () => {
    const client = new FakeLlmClient([new LlmError('timeout', true), good]);
    await expect(completeWithRetry(client, messages)).resolves.toMatchObject({
      answer: 'One month.',
    });
    expect(client.requests).toHaveLength(2);
  });

  it('retries once after a malformed reply (parse errors are retryable)', async () => {
    const client = new FakeLlmClient(['not json', good]);
    await expect(completeWithRetry(client, messages)).resolves.toBeDefined();
    expect(client.requests).toHaveLength(2);
  });

  it('gives up after the retry and throws the last error', async () => {
    const client = new FakeLlmClient([
      new LlmError('first', true),
      new LlmError('second', true),
      good, // never reached
    ]);
    await expect(completeWithRetry(client, messages)).rejects.toThrow('second');
    expect(client.requests).toHaveLength(2);
  });

  it('does not retry an error that will not fix itself (e.g. 401)', async () => {
    const client = new FakeLlmClient([new LlmError('HTTP 401', false), good]);
    await expect(completeWithRetry(client, messages)).rejects.toThrow('401');
    expect(client.requests).toHaveLength(1);
  });

  it('sends the answer JSON schema with every request', async () => {
    const client = new FakeLlmClient([good]);
    await completeWithRetry(client, messages);
    expect(client.requests[0].jsonSchema).toMatchObject({
      required: ['answer', 'citations', 'refused'],
    });
  });
});
