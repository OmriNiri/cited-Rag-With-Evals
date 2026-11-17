// `npm run eval:judge-agreement`
// Compares the human labels in eval/JUDGE-CHECK.md with the judge's verdicts in
// the run the sheet was sampled from -> eval/results/judge-agreement.{json,md}.
// Files only: no database, no model.

import { readFile } from 'node:fs/promises';
import { JUDGE_CHECK_PATH } from '../evaluation/evaluation.config.js';
import {
  compareVerdicts,
  type LabelPair,
} from '../evaluation/judge-check/agreement.js';
import { formatAgreementReport } from '../evaluation/judge-check/format-agreement-report.js';
import { parseJudgeSheet } from '../evaluation/judge-check/judge-sheet.js';
import {
  readAnswerRun,
  readSourceLine,
} from '../evaluation/judge-check/read-answer-run.js';
import { writeResults } from '../evaluation/write-results.js';

const sheet = await readFile(JUDGE_CHECK_PATH, 'utf8');
const source = readSourceLine(sheet);
const labels = parseJudgeSheet(sheet);
const rowsById = new Map((await readAnswerRun(source)).map((r) => [r.id, r]));

const missing = [...labels].filter(([, v]) => v === null).map(([id]) => id);
if (missing.length > 0) {
  console.error(`Not labelled yet: ${missing.join(', ')}`);
  process.exit(1);
}

const pairs: LabelPair[] = [];
for (const [id, human] of labels) {
  const judge = rowsById.get(id)?.judge?.verdict;
  if (!judge) throw new Error(`${id}: no judge verdict in ${source}.json`);
  pairs.push({ id, human: human!, judge });
}

const agreement = compareVerdicts(pairs);
const report = formatAgreementReport(agreement, pairs, rowsById, source);
const files = await writeResults(
  'judge-agreement',
  { source, agreement, pairs },
  report,
);
console.log(report);
console.log(`Written: ${files.join(', ')}`);
