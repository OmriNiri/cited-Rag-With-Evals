import { fakeHit } from '../../test/helpers/fake-retrieval.js';
import type { Retriever, Retrievers } from '../retrieval/retriever.js';
import type { SearchOptions } from '../retrieval/search.types.js';
import type { EvalQuestion } from './eval-question.js';
import { runRetrievalEval, summarizeRetrieval } from './retrieval-eval.js';

/** A retriever that returns a fixed list of ARTICLES per question text. */
function stub(byQuestion: Record<string, string[]>): Retriever & {
  limits: number[];
} {
  const limits: number[] = [];
  return {
    mode: 'vector',
    limits,
    retrieve: (question: string, options: SearchOptions) => {
      limits.push(options.limit);
      const articles = byQuestion[question] ?? [];
      return Promise.resolve(
        articles.map((article, i) => ({ ...fakeHit(`c${i}`), article })),
      );
    },
  };
}

const question = (
  id: string,
  wording: 'casual' | 'legal',
  gold: string[],
): EvalQuestion => ({
  id,
  question: id,
  answerable: gold.length > 0,
  goldArticles: gold,
  wording,
});

const questions = [
  question('q1', 'legal', ['Art. 2']),
  question('q2', 'casual', ['Art. 9']),
  question('q3', 'casual', []), // unanswerable: must be skipped
];

describe('runRetrievalEval', () => {
  it('records each retriever’s first gold rank and skips unanswerable questions', async () => {
    const vector = stub({ q1: ['Art. 2'], q2: ['Art. 1', 'Art. 9'] });
    const retrievers = {
      vector,
      keyword: stub({ q1: ['Art. 1', 'Art. 2'], q2: [] }),
      hybrid: stub({ q1: ['Art. 2'], q2: ['Art. 9'] }),
    } as Retrievers;

    const rows = await runRetrievalEval(questions, retrievers, 10);

    expect(rows).toEqual([
      {
        id: 'q1',
        wording: 'legal',
        goldArticles: ['Art. 2'],
        ranks: { vector: 1, keyword: 2, hybrid: 1 },
      },
      {
        id: 'q2',
        wording: 'casual',
        goldArticles: ['Art. 9'],
        ranks: { vector: 2, keyword: null, hybrid: 1 },
      },
    ]);
    expect(vector.limits).toEqual([10, 10]); // asked for the full eval depth
  });
});

describe('summarizeRetrieval', () => {
  it('summarizes per retriever, overall and per wording', () => {
    const summary = summarizeRetrieval(
      [
        {
          id: 'q1',
          wording: 'legal',
          goldArticles: [],
          ranks: { vector: 1, keyword: 2, hybrid: 1 },
        },
        {
          id: 'q2',
          wording: 'casual',
          goldArticles: [],
          ranks: { vector: 2, keyword: null, hybrid: 1 },
        },
      ],
      [1],
    );
    expect(summary.vector.all).toEqual({
      questions: 2,
      hitAt: { 1: 0.5 },
      mrr: 0.75,
    });
    expect(summary.keyword.casual).toEqual({
      questions: 1,
      hitAt: { 1: 0 },
      mrr: 0,
    });
    expect(summary.hybrid.legal.hitAt[1]).toBe(1);
  });
});
