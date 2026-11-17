import { MAX_QUESTION_CHARS } from '../answering/answering.config.js';
import { parseAskArgs } from './parse-ask-args.js';

describe('parseAskArgs', () => {
  it('joins unquoted words into one question', () => {
    expect(parseAskArgs(['What', 'is', 'the', 'notice', 'period?'])).toBe(
      'What is the notice period?',
    );
  });

  it('rejects a missing question with the usage line', () => {
    expect(() => parseAskArgs([])).toThrow(
      /Missing question[\s\S]*npm run ask/,
    );
    expect(() => parseAskArgs(['   '])).toThrow('Missing question');
  });

  it('rejects a question over the same limit as POST /ask', () => {
    expect(() => parseAskArgs(['a'.repeat(MAX_QUESTION_CHARS + 1)])).toThrow(
      'too long',
    );
  });
});
