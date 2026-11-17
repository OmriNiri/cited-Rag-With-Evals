import type { AnswerRow } from './answer-eval.js';
import type { EvalQuestion } from './eval-question.js';
import { relabelRows } from './relabel-rows.js';

const row: AnswerRow = {
  id: 'q1',
  answerable: true,
  wording: 'casual',
  goldArticles: ['Art. 1'],
  outcome: 'answered',
  answer: 'A.',
  citations: [],
  seconds: 1,
};
const question: EvalQuestion = {
  id: 'q1',
  question: 'Q?',
  answerable: true,
  goldArticles: ['Art. 2'], // corrected label
  wording: 'legal',
};

describe('relabelRows', () => {
  it('replaces the labels but keeps what the model did', () => {
    expect(relabelRows([row], [question])).toEqual([
      { ...row, goldArticles: ['Art. 2'], wording: 'legal' },
    ]);
  });

  it('refuses to re-score when the question sets differ', () => {
    expect(() => relabelRows([row], [{ ...question, id: 'q2' }])).toThrow(
      /differ \(q1, q2\)/,
    );
  });
});
