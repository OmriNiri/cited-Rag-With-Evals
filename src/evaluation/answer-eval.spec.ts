import type { CitedAnswer } from '../answering/answer.types.js';
import { LlmError } from '../answering/llm-error.js';
import type { EvalQuestion } from './eval-question.js';
import { runAnswerEval, type Asker, type Judge } from './answer-eval.js';

const q = (id: string, answerable = true): EvalQuestion => ({
  id,
  question: `question ${id}`,
  answerable,
  goldArticles: answerable ? ['Art. 1'] : [],
  wording: 'casual',
});

const answered: CitedAnswer = {
  refused: false,
  answer: 'Yes.',
  citations: [
    {
      passage: 1,
      chunkId: 'c1',
      article: 'Art. 1',
      quote: 'valid quote of words',
      valid: true,
    },
    {
      passage: 2,
      chunkId: 'c2',
      article: 'Art. 2',
      quote: 'invented',
      valid: false,
      invalidReason: 'not_found',
    },
  ],
};

describe('runAnswerEval', () => {
  it('records each outcome, judges only answered questions, with valid quotes only', async () => {
    const results: Record<string, CitedAnswer | Error> = {
      'question q1': answered,
      'question q2': {
        refused: true,
        refusalReason: 'low_retrieval_score',
        answer: '',
        citations: [],
      },
      'question q3': new LlmError('down', true),
    };
    const asker: Asker = {
      ask: (question) => {
        const r = results[question];
        return r instanceof Error ? Promise.reject(r) : Promise.resolve(r);
      },
    };
    const judged: unknown[] = [];
    const judge: Judge = {
      judge: (question, answer, evidence) => {
        judged.push({ question, answer, evidence });
        return Promise.resolve({ verdict: 'supported', reason: 'ok' });
      },
    };

    const rows = await runAnswerEval(
      [q('q1'), q('q2', false), q('q3')],
      asker,
      judge,
      'vector',
    );

    expect(rows.map((r) => r.outcome)).toEqual([
      'answered',
      'refused',
      'error',
    ]);
    expect(rows[0].judge).toEqual({ verdict: 'supported', reason: 'ok' });
    expect(rows[1]).toMatchObject({ refusalReason: 'low_retrieval_score' });
    expect(rows[1].judge).toBeUndefined();
    expect(rows[2].error).toBe('down');
    // Judge saw only the valid quote, never the rejected one.
    expect(judged).toEqual([
      {
        question: 'question q1',
        answer: 'Yes.',
        evidence: [{ article: 'Art. 1', quote: 'valid quote of words' }],
      },
    ]);
  });

  it('passes the retrieval mode on and keeps going when the judge fails', async () => {
    const modes: string[] = [];
    const asker: Asker = {
      ask: (_, mode) => {
        modes.push(mode);
        return Promise.resolve(answered);
      },
    };
    const judge: Judge = {
      judge: () => Promise.reject(new Error('judge down')),
    };

    const rows = await runAnswerEval(
      [q('q1'), q('q2')],
      asker,
      judge,
      'hybrid',
    );

    expect(modes).toEqual(['hybrid', 'hybrid']);
    expect(rows.map((r) => r.judgeError)).toEqual(['judge down', 'judge down']);
  });
});
