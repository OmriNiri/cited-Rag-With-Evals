import { LlmError } from './llm-error.js';
import { parseModelAnswer } from './parse-model-answer.js';

const valid = {
  answer: ' One month. ',
  citations: [{ passage: 1, quote: 'at one month’s notice during' }],
  refused: false,
};

/** Asserts that parsing fails with a retryable LlmError whose message matches. */
const expectMalformed = (raw: string, message: RegExp) => {
  let error: unknown;
  try {
    parseModelAnswer(raw);
  } catch (e) {
    error = e;
  }
  expect(error).toBeInstanceOf(LlmError);
  expect((error as LlmError).retryable).toBe(true);
  expect((error as LlmError).message).toMatch(message);
};

describe('parseModelAnswer', () => {
  it('parses a valid reply and trims the answer', () => {
    expect(parseModelAnswer(JSON.stringify(valid))).toEqual({
      ...valid,
      answer: 'One month.',
    });
  });

  it('accepts JSON wrapped in a ```json code fence', () => {
    const raw = '```json\n' + JSON.stringify(valid) + '\n```';
    expect(parseModelAnswer(raw).refused).toBe(false);
  });

  it('ignores a <think> block before the JSON', () => {
    const raw =
      '<think>Let me look at passage 1...</think>\n' + JSON.stringify(valid);
    expect(parseModelAnswer(raw).citations).toHaveLength(1);
  });

  it('ignores extra fields the schema does not know', () => {
    const raw = JSON.stringify({ ...valid, confidence: 0.9 });
    expect(parseModelAnswer(raw)).not.toHaveProperty('confidence');
  });

  it('rejects text that is not JSON', () => {
    expectMalformed('The notice period is one month.', /not valid JSON/);
  });

  it('rejects a reply with a missing or wrongly typed field', () => {
    expectMalformed(JSON.stringify({ ...valid, refused: 'no' }), /"refused"/);
    expectMalformed(
      JSON.stringify({ answer: 'x', refused: false }),
      /"citations"/,
    );
    expectMalformed('[1, 2]', /not a JSON object/);
  });

  it('rejects citations without an integer passage number', () => {
    const raw = JSON.stringify({
      ...valid,
      citations: [{ passage: '1', quote: 'x' }],
    });
    expectMalformed(raw, /citation 0/);
  });
});
