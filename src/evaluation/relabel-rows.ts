import type { AnswerRow } from './answer-eval.js';
import type { EvalQuestion } from './eval-question.js';

/**
 * Re-applies the CURRENT labels (answerable, gold articles, wording) to saved
 * answer rows. The model's answers do not depend on the labels — only the
 * scoring does — so a corrected label needs a re-score, not a 20-minute re-run.
 * Throws if the saved run and the eval set no longer contain the same questions.
 */
export function relabelRows(
  rows: AnswerRow[],
  questions: EvalQuestion[],
): AnswerRow[] {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const rowIds = new Set(rows.map((r) => r.id));
  const missing = [
    ...rows.filter((r) => !byId.has(r.id)).map((r) => r.id),
    ...questions.filter((q) => !rowIds.has(q.id)).map((q) => q.id),
  ];
  if (missing.length > 0) {
    throw new Error(
      `Saved run and eval set differ (${missing.join(', ')}): run the eval again instead of re-scoring`,
    );
  }
  return rows.map((r) => {
    const q = byId.get(r.id)!;
    return {
      ...r,
      answerable: q.answerable,
      goldArticles: q.goldArticles,
      wording: q.wording,
    };
  });
}
