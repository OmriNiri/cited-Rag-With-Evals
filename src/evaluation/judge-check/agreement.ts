import { VERDICTS, type Verdict } from '../judge/judge-verdict.js';

export interface LabelPair {
  id: string;
  human: Verdict;
  judge: Verdict;
}

export interface Agreement {
  labelled: number;
  agree: number; // same verdict
  kappa: number; // agreement corrected for chance (1 = perfect, 0 = chance level)
  lenient: string[]; // judge gave a BETTER verdict than the human (too kind)
  strict: string[]; // judge gave a WORSE verdict than the human (too harsh)
  confusion: Record<Verdict, Record<Verdict, number>>; // [human][judge] -> count
}

// Order used to call a disagreement lenient or strict.
const RANK: Record<Verdict, number> = {
  unsupported: 0,
  partial: 1,
  supported: 2,
};

/**
 * How well the judge matches the human labels. Cohen's kappa corrects raw
 * agreement for chance: if both mostly say "supported", they agree often even
 * at random. kappa = (observed - expected) / (1 - expected).
 */
export function compareVerdicts(pairs: LabelPair[]): Agreement {
  const n = pairs.length;
  const confusion = Object.fromEntries(
    VERDICTS.map((h) => [h, Object.fromEntries(VERDICTS.map((j) => [j, 0]))]),
  ) as Record<Verdict, Record<Verdict, number>>;
  for (const p of pairs) confusion[p.human][p.judge]++;

  const agree = pairs.filter((p) => p.human === p.judge).length;
  const observed = n === 0 ? 0 : agree / n;
  const expected =
    n === 0
      ? 0
      : VERDICTS.reduce(
          (sum, v) =>
            sum +
            (pairs.filter((p) => p.human === v).length / n) *
              (pairs.filter((p) => p.judge === v).length / n),
          0,
        );
  const kappa =
    expected === 1
      ? observed === 1
        ? 1
        : 0
      : (observed - expected) / (1 - expected);

  return {
    labelled: n,
    agree,
    kappa,
    lenient: pairs
      .filter((p) => RANK[p.judge] > RANK[p.human])
      .map((p) => p.id),
    strict: pairs.filter((p) => RANK[p.judge] < RANK[p.human]).map((p) => p.id),
    confusion,
  };
}
