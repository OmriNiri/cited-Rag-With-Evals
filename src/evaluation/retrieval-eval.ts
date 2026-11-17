import {
  RETRIEVAL_MODES,
  type RetrievalMode,
  type Retrievers,
} from '../retrieval/retriever.js';
import type { EvalQuestion, EvalWording } from './eval-question.js';
import {
  firstGoldRank,
  summarizeRanks,
  type MetricSummary,
} from './metrics.js';

/** One answerable question: where each retriever first found a gold article. */
export interface RetrievalRow {
  id: string;
  wording: EvalWording;
  goldArticles: string[];
  ranks: Record<RetrievalMode, number | null>;
}

export type RetrievalGroup = 'all' | EvalWording;
export type RetrievalSummary = Record<
  RetrievalMode,
  Record<RetrievalGroup, MetricSummary>
>;

/**
 * Runs every retriever on every ANSWERABLE question (unanswerable ones have no
 * gold article to find; they are used for the refusal threshold instead).
 * Sequential on purpose: the numbers do not depend on timing, and the order of
 * the output is stable.
 */
export async function runRetrievalEval(
  questions: EvalQuestion[],
  retrievers: Retrievers,
  depth: number,
): Promise<RetrievalRow[]> {
  const rows: RetrievalRow[] = [];
  for (const q of questions.filter((q) => q.answerable)) {
    const ranks = {} as Record<RetrievalMode, number | null>;
    for (const mode of RETRIEVAL_MODES) {
      const hits = await retrievers[mode].retrieve(q.question, {
        limit: depth,
      });
      ranks[mode] = firstGoldRank(
        hits.map((h) => h.article),
        q.goldArticles,
      );
    }
    rows.push({
      id: q.id,
      wording: q.wording,
      goldArticles: q.goldArticles,
      ranks,
    });
  }
  return rows;
}

/** hit@k and MRR per retriever, for all questions and split by wording (D18 hypothesis). */
export function summarizeRetrieval(
  rows: RetrievalRow[],
  ks: readonly number[],
): RetrievalSummary {
  const groups: Record<RetrievalGroup, RetrievalRow[]> = {
    all: rows,
    casual: rows.filter((r) => r.wording === 'casual'),
    legal: rows.filter((r) => r.wording === 'legal'),
  };
  const summary = {} as RetrievalSummary;
  for (const mode of RETRIEVAL_MODES) {
    summary[mode] = {} as Record<RetrievalGroup, MetricSummary>;
    for (const [group, groupRows] of Object.entries(groups)) {
      summary[mode][group as RetrievalGroup] = summarizeRanks(
        groupRows.map((r) => r.ranks[mode]),
        ks,
      );
    }
  }
  return summary;
}
