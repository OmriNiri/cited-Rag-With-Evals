// `npm run eval:gate` — the CI quality gate (DECISIONS D33).
// Reads eval/results/retrieval.json + threshold.json (run `npm run eval:retrieval`
// first) and exits 1 if the retriever /ask uses is below the limits in
// src/evaluation/gate/gate.config.ts. Files only: no database, no model.

import {
  ANSWER_RETRIEVAL_MODE,
  MIN_TOP_SIMILARITY,
} from '../answering/answering.config.js';
import { checkGate } from '../evaluation/gate/check-gate.js';
import { formatGateReport } from '../evaluation/gate/format-gate-report.js';
import { readRetrievalResults } from '../evaluation/gate/read-retrieval-results.js';

const { summary, similarities } = await readRetrievalResults();
const checks = checkGate(
  summary[ANSWER_RETRIEVAL_MODE].all,
  similarities,
  MIN_TOP_SIMILARITY,
);
console.log(formatGateReport(ANSWER_RETRIEVAL_MODE, checks));
if (checks.some((c) => !c.passed)) process.exitCode = 1;
