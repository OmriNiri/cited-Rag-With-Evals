import type { SimilarityRow, ThresholdResult } from './threshold-sweep.js';

/** Markdown report for the gate-1 threshold sweep. Pure: returns text. */
export function formatThresholdReport(
  similarities: SimilarityRow[],
  results: ThresholdResult[],
  current: number,
): string {
  const answerable = similarities.filter((r) => r.answerable).length;
  const unanswerable = similarities.length - answerable;
  const lines = [
    `## Gate 1 threshold sweep — ${answerable} answerable, ${unanswerable} unanswerable questions`,
    '',
    'Gate 1 refuses when the best vector similarity is below the threshold, without calling the model.',
    `False refusal = an answerable question refused there (final). Passed = an unanswerable question that reaches the model (gates 2–3 can still refuse it). Current value: ${current}.`,
    '',
    '| Threshold | False refusals | Unanswerable passed to the model |',
    '|---|---|---|',
  ];
  for (const r of results) {
    const mark = r.threshold === current ? ' ← current' : '';
    lines.push(
      `| ${r.threshold.toFixed(2)}${mark} | ${r.falseRefusals.length}/${answerable} ${list(r.falseRefusals)} | ${r.passedUnanswerable.length}/${unanswerable} ${list(r.passedUnanswerable)} |`,
    );
  }

  lines.push(
    '',
    '### Best vector similarity per question (sorted)',
    '',
    '| Id | Answerable | Similarity |',
    '|---|---|---|',
  );
  for (const r of [...similarities].sort(
    (a, b) => a.topSimilarity - b.topSimilarity,
  )) {
    lines.push(
      `| ${r.id} | ${r.answerable ? 'yes' : 'no'} | ${r.topSimilarity.toFixed(3)} |`,
    );
  }
  return lines.join('\n') + '\n';
}

const list = (ids: string[]) => (ids.length ? `(${ids.join(', ')})` : '');
