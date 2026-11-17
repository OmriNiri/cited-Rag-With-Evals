import type { ValidatedCitation } from '../answering/answer.types.js';
import type { AnswerRow } from './answer-eval.js';
import { summarizeAnswers } from './answer-metrics.js';

const cite = (article: string, valid = true): ValidatedCitation => ({
  passage: 1,
  chunkId: 'c',
  article,
  quote: 'four words long quote',
  valid,
  ...(valid ? {} : { invalidReason: 'not_found' as const }),
});

const row = (overrides: Partial<AnswerRow>): AnswerRow => ({
  id: 'q',
  answerable: true,
  wording: 'casual',
  goldArticles: ['Art. 1'],
  outcome: 'answered',
  answer: 'A.',
  citations: [],
  seconds: 1,
  ...overrides,
});

const rows: AnswerRow[] = [
  // answerable, answered, cites the gold article, judged supported
  row({
    citations: [cite('Art. 1')],
    judge: { verdict: 'supported', reason: '' },
    seconds: 4,
  }),
  // answerable, answered, valid quote but from the WRONG article (the D26 failure type)
  row({
    citations: [cite('Art. 9'), cite('Art. 1', false)],
    judge: { verdict: 'unsupported', reason: '' },
    seconds: 10,
  }),
  // answerable, wrongly refused by gate 1
  row({
    outcome: 'refused',
    refusalReason: 'low_retrieval_score',
    answer: '',
    seconds: 1,
  }),
  // unanswerable, correctly refused by the model (gate 2)
  row({
    answerable: false,
    goldArticles: [],
    outcome: 'refused',
    refusalReason: 'model_insufficient_context',
    answer: '',
    seconds: 2,
  }),
  // unanswerable, wrongly answered
  row({
    answerable: false,
    goldArticles: [],
    citations: [cite('Art. 5')],
    judgeError: 'judge down',
    seconds: 3,
  }),
  // model failed after the retry: excluded from the rates
  row({ outcome: 'error', error: 'down', answer: '', seconds: 120 }),
];

describe('summarizeAnswers', () => {
  const s = summarizeAnswers(rows);

  it('fills the 2x2 refusal table and excludes errors from the accuracy', () => {
    expect(s).toMatchObject({
      questions: 6,
      errors: 1,
      answerableAnswered: 2,
      answerableRefused: 1,
      unanswerableRefused: 1,
      unanswerableAnswered: 1,
      refusalAccuracy: { count: 3, of: 5 },
    });
  });

  it('counts refusal reasons separately for answerable and unanswerable questions', () => {
    expect(s.refusedBy).toEqual({
      answerable: { low_retrieval_score: 1 },
      unanswerable: { model_insufficient_context: 1 },
    });
  });

  it('citation validity counts every returned citation', () => {
    expect(s.citationValidity).toEqual({ count: 3, of: 4 });
  });

  it('gold citation needs a VALID quote from a gold article (catches right-quote-wrong-article)', () => {
    expect(s.goldCitation).toEqual({ count: 1, of: 2 });
  });

  it('counts judge verdicts and judge failures for answered questions', () => {
    expect(s.faithfulness).toEqual({
      supported: 1,
      partial: 0,
      unsupported: 1,
      judgeErrors: 1,
    });
  });

  it('reports median and max seconds without the failed question', () => {
    expect(s.seconds).toEqual({ median: 3, max: 10 });
  });
});
