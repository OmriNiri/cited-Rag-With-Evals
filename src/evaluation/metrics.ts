// Retrieval metrics as small pure functions. A "rank" is 1-based: rank 1 = top hit.

/**
 * Position of the first hit that belongs to a gold article, or null if none
 * does. Article level: any chunk of a gold article counts.
 */
export function firstGoldRank(
  hitArticles: string[],
  goldArticles: string[],
): number | null {
  const index = hitArticles.findIndex((a) => goldArticles.includes(a));
  return index === -1 ? null : index + 1;
}

export interface MetricSummary {
  questions: number;
  hitAt: Record<number, number>; // k -> share of questions with a gold hit in the top k (0..1)
  mrr: number; // mean reciprocal rank (0..1)
}

/**
 * hit@k: share of questions whose first gold hit is at rank <= k.
 * MRR: mean of 1/rank (0 when not found): rewards finding it EARLY, not just at all.
 * Example: ranks [1, 2, null] -> hit@1 = 1/3, hit@3 = 2/3, MRR = (1 + 0.5 + 0) / 3 = 0.5.
 */
export function summarizeRanks(
  ranks: (number | null)[],
  ks: readonly number[],
): MetricSummary {
  const n = ranks.length;
  const share = (count: number) => (n === 0 ? 0 : count / n);

  const hitAt: Record<number, number> = {};
  for (const k of ks) {
    hitAt[k] = share(ranks.filter((r) => r !== null && r <= k).length);
  }
  const mrr = share(ranks.reduce<number>((sum, r) => sum + (r ? 1 / r : 0), 0));

  return { questions: n, hitAt, mrr };
}
