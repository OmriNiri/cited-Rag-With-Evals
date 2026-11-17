import { ANSWER_RETRIEVAL_MODE } from '../answering/answering.config.js';
import { parseEvalAnswersArgs } from './parse-eval-answers-args.js';

describe('parseEvalAnswersArgs', () => {
  it('defaults to the retriever the API uses, and a full run', () => {
    expect(parseEvalAnswersArgs([])).toEqual({
      mode: ANSWER_RETRIEVAL_MODE,
      rescore: false,
    });
  });

  it('accepts a known mode and --rescore', () => {
    expect(parseEvalAnswersArgs(['--mode', 'vector', '--rescore'])).toEqual({
      mode: 'vector',
      rescore: true,
    });
  });

  it('rejects an unknown mode with the usage line', () => {
    expect(() => parseEvalAnswersArgs(['--mode', 'magic'])).toThrow(
      /Unknown --mode[\s\S]*eval:answers/,
    );
  });
});
