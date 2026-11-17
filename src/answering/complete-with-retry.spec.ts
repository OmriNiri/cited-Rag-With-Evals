import { FakeLlmClient, modelReply } from '../../test/helpers/fake-llm.js';
import { completeWithRetry } from './complete-with-retry.js';
import { LlmError } from './llm-error.js';
import { MODEL_ANSWER_SCHEMA } from './model-answer.js';
import { parseModelAnswer } from './parse-model-answer.js';

const request = {
  messages: [{ role: 'user' as const, content: 'q' }],
  jsonSchema: MODEL_ANSWER_SCHEMA,
};
const good = modelReply('One month.', [{ passage: 1, quote: 'a b c d' }]);
const run = (client: FakeLlmClient) =>
  completeWithRetry(client, request, parseModelAnswer);

describe('completeWithRetry', () => {
  it('returns the parsed reply on the first try', async () => {
    const client = new FakeLlmClient([good]);
    await expect(run(client)).resolves.toMatchObject({ answer: 'One month.' });
    expect(client.requests).toHaveLength(1);
  });

  it('retries once after a retryable error (e.g. timeout)', async () => {
    const client = new FakeLlmClient([new LlmError('timeout', true), good]);
    await expect(run(client)).resolves.toMatchObject({ answer: 'One month.' });
    expect(client.requests).toHaveLength(2);
  });

  it('retries once after a malformed reply (parse errors are retryable)', async () => {
    const client = new FakeLlmClient(['not json', good]);
    await expect(run(client)).resolves.toBeDefined();
    expect(client.requests).toHaveLength(2);
  });

  it('gives up after the retry and throws the last error', async () => {
    const client = new FakeLlmClient([
      new LlmError('first', true),
      new LlmError('second', true),
      good, // never reached
    ]);
    await expect(run(client)).rejects.toThrow('second');
    expect(client.requests).toHaveLength(2);
  });

  it('does not retry an error that will not fix itself (e.g. 401)', async () => {
    const client = new FakeLlmClient([new LlmError('HTTP 401', false), good]);
    await expect(run(client)).rejects.toThrow('401');
    expect(client.requests).toHaveLength(1);
  });

  it('sends the request unchanged, incl. its JSON schema', async () => {
    const client = new FakeLlmClient([good]);
    await run(client);
    expect(client.requests[0]).toEqual(request);
  });

  it('works with any parser (generic), e.g. the judge verdict', async () => {
    const client = new FakeLlmClient(['{"n":1}']);
    await expect(
      completeWithRetry(
        client,
        request,
        (raw) => JSON.parse(raw) as { n: number },
      ),
    ).resolves.toEqual({ n: 1 });
  });
});
