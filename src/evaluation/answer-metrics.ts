import type { RefusalReason } from '../answering/answer.types.js';
import type { AnswerRow } from './answer-eval.js';
import type { Verdict } from './judge/judge-verdict.js';

export interface Ratio {
  count: number;
  of: number;
}

export interface AnswerSummary {
  questions: number;
  errors: number; // model failed after the retry (excluded from the rates below)
  // Refusal behaviour as a 2x2 table: what should happen vs what happened.
  answerableAnswered: number;
  answerableRefused: number;
  unanswerableRefused: number;
  unanswerableAnswered: number;
  refusalAccuracy: Ratio; // right decision (answer / refuse) out of all non-error questions
  refusedBy: Record<
    'answerable' | 'unanswerable',
    Partial<Record<RefusalReason, number>>
  >;
  citationValidity: Ratio; // citations passing the verbatim check, out of all citations returned
  goldCitation: Ratio; // answered answerable questions with a VALID citation from a gold article
  faithfulness: Record<Verdict, number> & { judgeErrors: number };
  seconds: { median: number; max: number };
}

/** All answer metrics from the raw rows. Pure, so every number can be re-derived from the JSON. */
export function summarizeAnswers(rows: AnswerRow[]): AnswerSummary {
  const ok = rows.filter((r) => r.outcome !== 'error');
  const is = (answerable: boolean, outcome: AnswerRow['outcome']) =>
    ok.filter((r) => r.answerable === answerable && r.outcome === outcome);

  const answerableAnswered = is(true, 'answered');
  const unanswerableRefused = is(false, 'refused');
  const citations = rows.flatMap((r) => r.citations);
  const answered = ok.filter((r) => r.outcome === 'answered');

  return {
    questions: rows.length,
    errors: rows.length - ok.length,
    answerableAnswered: answerableAnswered.length,
    answerableRefused: is(true, 'refused').length,
    unanswerableRefused: unanswerableRefused.length,
    unanswerableAnswered: is(false, 'answered').length,
    refusalAccuracy: {
      count: answerableAnswered.length + unanswerableRefused.length,
      of: ok.length,
    },
    refusedBy: {
      answerable: countReasons(is(true, 'refused')),
      unanswerable: countReasons(unanswerableRefused),
    },
    citationValidity: {
      count: citations.filter((c) => c.valid).length,
      of: citations.length,
    },
    goldCitation: {
      count: answerableAnswered.filter((r) =>
        r.citations.some(
          (c) =>
            c.valid && c.article !== null && r.goldArticles.includes(c.article),
        ),
      ).length,
      of: answerableAnswered.length,
    },
    faithfulness: {
      supported: answered.filter((r) => r.judge?.verdict === 'supported')
        .length,
      partial: answered.filter((r) => r.judge?.verdict === 'partial').length,
      unsupported: answered.filter((r) => r.judge?.verdict === 'unsupported')
        .length,
      judgeErrors: answered.filter((r) => r.judgeError !== undefined).length,
    },
    seconds: {
      median: median(ok.map((r) => r.seconds)),
      max: Math.max(0, ...ok.map((r) => r.seconds)),
    },
  };
}

function countReasons(
  rows: AnswerRow[],
): Partial<Record<RefusalReason, number>> {
  const counts: Partial<Record<RefusalReason, number>> = {};
  for (const r of rows) {
    if (r.refusalReason)
      counts[r.refusalReason] = (counts[r.refusalReason] ?? 0) + 1;
  }
  return counts;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
