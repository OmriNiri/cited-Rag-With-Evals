// `npm run eval:judge-sheet [-- --mode vector]`
// Writes eval/JUDGE-CHECK.md: a blind labelling sheet of answers sampled evenly
// from a saved answer-eval run. Refuses to overwrite existing labels.
// Files only: no database, no model.

import { access, writeFile } from 'node:fs/promises';
import {
  JUDGE_CHECK_PATH,
  JUDGE_CHECK_SIZE,
} from '../evaluation/evaluation.config.js';
import { buildJudgeSheet } from '../evaluation/judge-check/judge-sheet.js';
import { pickSpread } from '../evaluation/judge-check/pick-spread.js';
import {
  readAnswerRun,
  sourceLine,
} from '../evaluation/judge-check/read-answer-run.js';
import { loadEvalSet } from '../evaluation/load-eval-set.js';
import { parseEvalAnswersArgs } from './parse-eval-answers-args.js';

const exists = await access(JUDGE_CHECK_PATH).then(
  () => true,
  () => false,
);
if (exists) {
  console.error(
    `${JUDGE_CHECK_PATH} already exists; delete it first to draw a new sample.`,
  );
  process.exit(1);
}

const { mode } = parseEvalAnswersArgs(process.argv.slice(2));
const source = `answers-${mode}`;
const questions = await loadEvalSet();
const answered = (await readAnswerRun(source))
  .filter((r) => r.outcome === 'answered')
  .sort((a, b) => a.id.localeCompare(b.id));
const sample = pickSpread(answered, JUDGE_CHECK_SIZE);

const sheet = buildJudgeSheet(
  sample,
  new Map(questions.map((q) => [q.id, q.question])),
);
await writeFile(JUDGE_CHECK_PATH, `${sourceLine(source)}\n${sheet}`);
console.log(
  `Written ${JUDGE_CHECK_PATH}: ${sample.length} of ${answered.length} answered questions from ${source}.`,
);
