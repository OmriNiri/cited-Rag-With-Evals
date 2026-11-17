import type { MetricSummary } from '../metrics.js';
import type { SimilarityRow } from '../threshold-sweep.js';
import { sweepThresholds } from '../threshold-sweep.js';
import { RETRIEVAL_GATE } from './gate.config.js';

export type RetrievalGate = typeof RETRIEVAL_GATE;

/** One line of the gate report. */
export interface GateCheck {
  name: string;
  actual: string;
  required: string;
  passed: boolean;
}

/**
 * Pure: compares one retrieval run with the gate. Returns EVERY check, passed or
 * not, so the CI log shows how close each number is to its limit.
 *
 * @param summary   hit@k / MRR of the retriever /ask uses, all answerable questions
 * @param similarities best vector similarity per question (gate 1's input)
 * @param threshold the gate-1 threshold /ask uses (MIN_TOP_SIMILARITY)
 */
export function checkGate(
  summary: MetricSummary,
  similarities: SimilarityRow[],
  threshold: number,
  gate: RetrievalGate = RETRIEVAL_GATE,
): GateCheck[] {
  const n = summary.questions;
  // hitAt holds shares (0..1); round back to a whole count of questions.
  const hitsAt5 = Math.round((summary.hitAt[5] ?? 0) * n);
  const [atThreshold] = sweepThresholds(similarities, [threshold]);
  const falseRefusals = atThreshold.falseRefusals;

  return [
    {
      name: 'answerable questions',
      actual: String(n),
      required: `= ${gate.answerableQuestions}`,
      passed: n === gate.answerableQuestions,
    },
    {
      name: 'hit@5',
      actual: `${hitsAt5}/${n}`,
      required: `≥ ${gate.minHitsAt5}/${gate.answerableQuestions}`,
      passed: hitsAt5 >= gate.minHitsAt5,
    },
    {
      name: 'MRR@10',
      actual: summary.mrr.toFixed(3),
      required: `≥ ${gate.minMrr}`,
      passed: summary.mrr >= gate.minMrr,
    },
    {
      name: `gate-1 false refusals at ${threshold}`,
      actual:
        falseRefusals.length === 0
          ? '0'
          : `${falseRefusals.length} (${falseRefusals.join(', ')})`,
      required: `≤ ${gate.maxFalseRefusals}`,
      passed: falseRefusals.length <= gate.maxFalseRefusals,
    },
  ];
}
