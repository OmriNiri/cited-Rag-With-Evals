import type { Retriever } from '../retrieval/retriever.js';
import type { EvalQuestion } from './eval-question.js';

/** The number gate 1 looks at, for one question. */
export interface SimilarityRow {
  id: string;
  answerable: boolean;
  topSimilarity: number; // best vector cosine similarity; 0 if nothing is indexed
}

/** What gate 1 would do to the eval set at one threshold. */
export interface ThresholdResult {
  threshold: number;
  falseRefusals: string[]; // ANSWERABLE questions refused before the model sees them
  passedUnanswerable: string[]; // UNANSWERABLE questions let through to the model
}

/** Best vector similarity for every question (answerable and not), as gate 1 computes it. */
export async function collectTopSimilarities(
  questions: EvalQuestion[],
  vector: Retriever,
): Promise<SimilarityRow[]> {
  const rows: SimilarityRow[] = [];
  for (const q of questions) {
    const [best] = await vector.retrieve(q.question, { limit: 1 });
    rows.push({
      id: q.id,
      answerable: q.answerable,
      topSimilarity: best?.score ?? 0,
    });
  }
  return rows;
}

/**
 * For each threshold: which answerable questions gate 1 would wrongly refuse, and
 * which unanswerable ones it would let through (same rule as refuseOnLowRetrieval:
 * refuse when similarity < threshold). Ids are listed, not just counted, so every
 * number in the report can be traced to questions.
 *
 * The two errors are not equally bad: a false refusal is final (the model never
 * sees the question), while a passed unanswerable question still meets gates 2-3.
 */
export function sweepThresholds(
  rows: SimilarityRow[],
  thresholds: readonly number[],
): ThresholdResult[] {
  return thresholds.map((threshold) => ({
    threshold,
    falseRefusals: rows
      .filter((r) => r.answerable && r.topSimilarity < threshold)
      .map((r) => r.id),
    passedUnanswerable: rows
      .filter((r) => !r.answerable && r.topSimilarity >= threshold)
      .map((r) => r.id),
  }));
}
