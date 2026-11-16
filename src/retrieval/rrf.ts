// Reciprocal Rank Fusion (Cormack, Clarke & Büttcher, 2009).
// Merges several ranked lists into one by looking only at *positions*:
//
//   score(doc) = Σ over lists that contain doc of  1 / (k + rank)
//
// Why ranks and not the retrievers' own scores: cosine similarity (0..1) and
// ts_rank (arbitrary scale) are not comparable, and "normalising" them is guesswork.
// A rank means the same thing in every list, so no normalisation is needed.

/** Standard constant from the paper. Larger k = agreement between lists counts more than being #1 in one. */
export const RRF_K = 60;

export interface FusedResult {
  id: string;
  score: number;
}

/**
 * @param rankings each list holds ids, best first, without duplicates
 * @returns every id that appears in any list, highest fused score first
 */
export function reciprocalRankFusion(
  rankings: string[][],
  k: number = RRF_K,
): FusedResult[] {
  const scores = new Map<string, number>();

  for (const ranking of rankings) {
    ranking.forEach((id, index) => {
      const rank = index + 1; // ranks start at 1, so the best item adds 1/(k+1)
      scores.set(id, (scores.get(id) ?? 0) + 1 / (k + rank));
    });
  }

  return (
    [...scores.entries()]
      .map(([id, score]) => ({ id, score }))
      // Ties are broken by id, so the same input always gives the same order.
      .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
  );
}
