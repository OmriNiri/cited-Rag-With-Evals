import { MIN_TOP_SIMILARITY } from './answering.config.js';
import type { ValidatedCitation } from './answer.types.js';
import type { ModelAnswer } from './model-answer.js';
import { decideAnswer, refuseOnLowRetrieval } from './refusal-policy.js';

const citation = (valid: boolean): ValidatedCitation => ({
  passage: 1,
  chunkId: 'c1',
  article: 'Art. 1',
  quote: 'some quote of four words',
  valid,
  ...(valid ? {} : { invalidReason: 'not_found' as const }),
});

const answer = (overrides: Partial<ModelAnswer> = {}): ModelAnswer => ({
  answer: 'One month.',
  citations: [],
  refused: false,
  ...overrides,
});

describe('refuseOnLowRetrieval (gate 1)', () => {
  it('refuses below the threshold, before any model call', () => {
    expect(refuseOnLowRetrieval(MIN_TOP_SIMILARITY - 0.01)).toEqual({
      refused: true,
      refusalReason: 'low_retrieval_score',
      answer: '',
      citations: [],
    });
  });

  it('lets the question through at or above the threshold', () => {
    expect(refuseOnLowRetrieval(MIN_TOP_SIMILARITY)).toBeNull();
  });
});

describe('decideAnswer (gates 2 and 3)', () => {
  it('returns the answer when at least one citation is valid', () => {
    expect(decideAnswer(answer(), [citation(true)])).toEqual({
      refused: false,
      answer: 'One month.',
      citations: [citation(true)],
    });
  });

  it('keeps a partly valid answer and shows the invalid citation too', () => {
    const result = decideAnswer(answer(), [citation(true), citation(false)]);
    expect(result.refused).toBe(false);
    expect(result.citations.map((c) => c.valid)).toEqual([true, false]);
  });

  it('gate 2: refuses when the model says the passages are insufficient', () => {
    const result = decideAnswer(answer({ refused: true }), []);
    expect(result).toMatchObject({
      refused: true,
      refusalReason: 'model_insufficient_context',
      answer: '',
    });
  });

  it('gate 2: treats an empty answer like a refusal', () => {
    expect(
      decideAnswer(answer({ answer: '' }), [citation(true)]).refusalReason,
    ).toBe('model_insufficient_context');
  });

  it('gate 3: never returns an answer whose citations are all invalid', () => {
    const result = decideAnswer(answer(), [citation(false), citation(false)]);
    expect(result).toMatchObject({
      refused: true,
      refusalReason: 'no_valid_citation',
      answer: '',
    });
    // The rejected citations stay visible, so it is clear WHY it was refused.
    expect(result.citations).toHaveLength(2);
  });

  it('gate 3: never returns an answer with no citations at all', () => {
    expect(decideAnswer(answer(), []).refusalReason).toBe('no_valid_citation');
  });
});
