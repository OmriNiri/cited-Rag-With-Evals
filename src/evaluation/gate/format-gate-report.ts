import type { GateCheck } from './check-gate.js';

/** Plain-text report for the CI log: one line per check, then the verdict. */
export function formatGateReport(mode: string, checks: GateCheck[]): string {
  const lines = checks.map(
    (c) =>
      `${c.passed ? 'PASS' : 'FAIL'}  ${c.name}: ${c.actual} (required ${c.required})`,
  );
  const failed = checks.filter((c) => !c.passed).length;
  const verdict =
    failed === 0
      ? 'Retrieval gate passed.'
      : `Retrieval gate FAILED: ${failed} check(s) below the limit (see DECISIONS D33).`;
  return [`Retrieval gate — ${mode} retriever`, ...lines, verdict].join('\n');
}
