import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { summarizeRanks } from '../metrics.js';
import type { SimilarityRow } from '../threshold-sweep.js';
import { checkGate } from './check-gate.js';
import { formatGateReport } from './format-gate-report.js';
import { RETRIEVAL_GATE } from './gate.config.js';
import { readRetrievalResults } from './read-retrieval-results.js';

const gate = {
  answerableQuestions: 4,
  minHitsAt5: 3,
  minMrr: 0.5,
  maxFalseRefusals: 0,
};
const ks = [1, 3, 5, 10];
const similar = (id: string, topSimilarity: number): SimilarityRow => ({
  id,
  answerable: true,
  topSimilarity,
});
const allAbove = ['a', 'b', 'c', 'd'].map((id) => similar(id, 0.6));

const failedNames = (checks: ReturnType<typeof checkGate>) =>
  checks.filter((c) => !c.passed).map((c) => c.name);

describe('checkGate', () => {
  it('passes a run at the limits: 3/4 in the top 5, MRR exactly 0.5', () => {
    // MRR = (1 + 0.5 + 0.5 + 0) / 4 = 0.5
    const summary = summarizeRanks([1, 2, 2, null], ks);
    const checks = checkGate(summary, allAbove, 0.35, gate);
    expect(failedNames(checks)).toEqual([]);
    expect(checks.find((c) => c.name === 'hit@5')?.actual).toBe('3/4');
  });

  it('fails hit@5 and MRR when one more question is lost', () => {
    const summary = summarizeRanks([1, 2, null, null], ks);
    expect(failedNames(checkGate(summary, allAbove, 0.35, gate))).toEqual([
      'hit@5',
      'MRR@10',
    ]);
  });

  it('fails on any answerable question refused by gate 1, and names it', () => {
    const summary = summarizeRanks([1, 1, 1, 1], ks);
    const rows = [...allAbove.slice(0, 3), similar('d', 0.34)];
    const check = checkGate(summary, rows, 0.35, gate).find((c) => !c.passed);
    expect(check).toMatchObject({
      name: 'gate-1 false refusals at 0.35',
      actual: '1 (d)',
    });
  });

  it('fails when the eval set size changed without updating the gate', () => {
    const summary = summarizeRanks([1, 1, 1, 1, 1], ks);
    expect(failedNames(checkGate(summary, allAbove, 0.35, gate))).toEqual([
      'answerable questions',
    ]);
  });

  it('ignores unanswerable questions for false refusals', () => {
    const summary = summarizeRanks([1, 1, 1, 1], ks);
    const rows = [
      ...allAbove,
      { id: 'u', answerable: false, topSimilarity: 0.1 },
    ];
    expect(failedNames(checkGate(summary, rows, 0.35, gate))).toEqual([]);
  });

  it('the real gate passes the committed Phase 4 baseline', async () => {
    const { summary, similarities } = await readRetrievalResults();
    const checks = checkGate(summary.vector.all, similarities, 0.35);
    expect(failedNames(checks)).toEqual([]);
    expect(checks[0].actual).toBe(String(RETRIEVAL_GATE.answerableQuestions));
  });
});

describe('formatGateReport', () => {
  it('prints one line per check and a failure verdict', () => {
    const report = formatGateReport('vector', [
      { name: 'hit@5', actual: '27/30', required: '≥ 28/30', passed: false },
      { name: 'MRR@10', actual: '0.750', required: '≥ 0.72', passed: true },
    ]);
    expect(report).toContain('FAIL  hit@5: 27/30 (required ≥ 28/30)');
    expect(report).toContain('PASS  MRR@10');
    expect(report).toMatch(/FAILED: 1 check/);
  });
});

describe('readRetrievalResults', () => {
  it('reads the summary and similarities from the two result files', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'gate-'));
    try {
      await writeFile(join(dir, 'retrieval.json'), '{"summary":{"x":1}}');
      await writeFile(
        join(dir, 'threshold.json'),
        '{"similarities":[{"id":"q1"}]}',
      );
      expect(await readRetrievalResults(dir)).toEqual({
        summary: { x: 1 },
        similarities: [{ id: 'q1' }],
      });
    } finally {
      await rm(dir, { recursive: true });
    }
  });
});
