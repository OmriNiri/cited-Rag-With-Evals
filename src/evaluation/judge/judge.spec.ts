import { FakeLlmClient } from '../../../test/helpers/fake-llm.js';
import { FaithfulnessJudge } from './faithfulness-judge.js';
import { buildJudgePrompt } from './judge-prompt.js';
import { parseVerdict } from './parse-verdict.js';

describe('buildJudgePrompt', () => {
  it('shows question, answer and numbered quotes with their article', () => {
    const [system, user] = buildJudgePrompt('Q?', 'A.', [
      { article: 'Art. 335c', quote: 'at one month’s notice' },
    ]);
    expect(system.content).toContain('Use ONLY the quotes');
    expect(user.content).toBe(
      'Question: Q?\n\nAnswer: A.\n\nQuotes:\n[1] (Art. 335c) "at one month’s notice"',
    );
  });
});

describe('parseVerdict', () => {
  it('accepts the three verdicts and trims the reason', () => {
    expect(parseVerdict('{"verdict":"partial","reason":" x "}')).toEqual({
      verdict: 'partial',
      reason: 'x',
    });
  });

  it.each([
    ['not JSON', 'nope', 'not valid JSON'],
    ['unknown verdict', '{"verdict":"maybe","reason":"x"}', 'must be one of'],
    ['missing reason', '{"verdict":"supported"}', '"reason"'],
    ['null', 'null', 'must be one of'],
  ])('rejects %s with a retryable error', (_, raw, message) => {
    expect(() => parseVerdict(raw)).toThrow(message);
    try {
      parseVerdict(raw);
    } catch (error) {
      expect((error as { retryable: boolean }).retryable).toBe(true);
    }
  });
});

describe('FaithfulnessJudge', () => {
  it('sends the verdict schema and retries a malformed reply once', async () => {
    const client = new FakeLlmClient([
      'garbage',
      '{"verdict":"supported","reason":"stated in [1]"}',
    ]);
    const verdict = await new FaithfulnessJudge(client).judge('Q?', 'A.', []);
    expect(verdict.verdict).toBe('supported');
    expect(client.requests).toHaveLength(2);
    expect(client.requests[0].jsonSchema).toMatchObject({
      required: ['verdict', 'reason'],
    });
  });
});
