import type {
  CitedAnswer,
  RefusalReason,
  ValidatedCitation,
} from '../answering/answer.types.js';
import type { RetrievalMode } from '../retrieval/retriever.js';
import type { EvalQuestion, EvalWording } from './eval-question.js';
import type { EvidenceQuote } from './judge/judge-prompt.js';
import type { JudgeVerdict } from './judge/judge-verdict.js';

// Narrow views of AnswerService and FaithfulnessJudge: only what the runner calls,
// so unit tests pass small fakes.
export interface Asker {
  ask(question: string, mode: RetrievalMode): Promise<CitedAnswer>;
}
export interface Judge {
  judge(
    question: string,
    answer: string,
    evidence: EvidenceQuote[],
  ): Promise<JudgeVerdict>;
}

/** Everything that happened to one question — raw data; metrics are computed from it. */
export interface AnswerRow {
  id: string;
  answerable: boolean;
  wording: EvalWording;
  goldArticles: string[];
  outcome: 'answered' | 'refused' | 'error';
  refusalReason?: RefusalReason;
  answer: string;
  citations: ValidatedCitation[];
  seconds: number; // pipeline time for this question (judge not included)
  error?: string; // the model failed even after the retry
  judge?: JudgeVerdict; // answered questions only
  judgeError?: string;
}

/**
 * Runs the full answering pipeline on every question, then the judge on every
 * ANSWERED one (a refusal has no claims to check). Sequential: one local model
 * handles one request at a time anyway, and timings stay comparable.
 * A failing question is recorded as an error and the run continues.
 */
export async function runAnswerEval(
  questions: EvalQuestion[],
  asker: Asker,
  judge: Judge,
  mode: RetrievalMode,
  onRow: (row: AnswerRow) => void = () => {},
): Promise<AnswerRow[]> {
  const rows: AnswerRow[] = [];
  for (const q of questions) {
    const row = await evaluateOne(q, asker, judge, mode);
    rows.push(row);
    onRow(row);
  }
  return rows;
}

async function evaluateOne(
  q: EvalQuestion,
  asker: Asker,
  judge: Judge,
  mode: RetrievalMode,
): Promise<AnswerRow> {
  const base = {
    id: q.id,
    answerable: q.answerable,
    wording: q.wording,
    goldArticles: q.goldArticles,
  };
  const started = performance.now();
  let result: CitedAnswer;
  try {
    result = await asker.ask(q.question, mode);
  } catch (error) {
    return {
      ...base,
      outcome: 'error',
      answer: '',
      citations: [],
      seconds: elapsed(started),
      error: (error as Error).message,
    };
  }
  const row: AnswerRow = {
    ...base,
    outcome: result.refused ? 'refused' : 'answered',
    ...(result.refusalReason ? { refusalReason: result.refusalReason } : {}),
    answer: result.answer,
    citations: result.citations,
    seconds: elapsed(started),
  };
  if (row.outcome !== 'answered') return row;

  // Only valid citations count as evidence: invalid ones were rejected by code.
  const evidence = result.citations
    .filter((c) => c.valid)
    .map((c) => ({ article: c.article ?? '', quote: c.quote }));
  try {
    row.judge = await judge.judge(q.question, result.answer, evidence);
  } catch (error) {
    row.judgeError = (error as Error).message;
  }
  return row;
}

const elapsed = (started: number) =>
  Math.round((performance.now() - started) / 100) / 10; // seconds, 1 decimal
