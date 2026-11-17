import { fakeHit } from '../../test/helpers/fake-retrieval.js';
import type { Retriever } from '../retrieval/retriever.js';
import type { EvalQuestion } from './eval-question.js';
import { collectTopSimilarities, sweepThresholds } from './threshold-sweep.js';

const rows = [
  { id: 'a1', answerable: true, topSimilarity: 0.6 },
  { id: 'a2', answerable: true, topSimilarity: 0.4 },
  { id: 'u1', answerable: false, topSimilarity: 0.45 },
  { id: 'u2', answerable: false, topSimilarity: 0.2 },
];

describe('sweepThresholds', () => {
  it('lists false refusals and passed unanswerable questions per threshold', () => {
    expect(sweepThresholds(rows, [0.3, 0.5])).toEqual([
      { threshold: 0.3, falseRefusals: [], passedUnanswerable: ['u1'] },
      { threshold: 0.5, falseRefusals: ['a2'], passedUnanswerable: [] },
    ]);
  });

  it('uses the same rule as gate 1: a similarity equal to the threshold passes', () => {
    const [result] = sweepThresholds(rows, [0.4]);
    expect(result.falseRefusals).toEqual([]); // a2 = 0.4 is not refused
  });
});

describe('collectTopSimilarities', () => {
  it('takes the best vector score per question, 0 when nothing is found', async () => {
    const scores: Record<string, number[]> = { q1: [0.7], q2: [] };
    const vector: Retriever = {
      mode: 'vector',
      retrieve: (question) =>
        Promise.resolve(scores[question].map((s) => fakeHit('c', s))),
    };
    const question = (id: string, answerable: boolean): EvalQuestion => ({
      id,
      question: id,
      answerable,
      goldArticles: answerable ? ['Art. 1'] : [],
      wording: 'casual',
    });

    expect(
      await collectTopSimilarities(
        [question('q1', true), question('q2', false)],
        vector,
      ),
    ).toEqual([
      { id: 'q1', answerable: true, topSimilarity: 0.7 },
      { id: 'q2', answerable: false, topSimilarity: 0 },
    ]);
  });
});
