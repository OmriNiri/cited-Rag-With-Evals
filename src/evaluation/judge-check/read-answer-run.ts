import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { AnswerRow } from '../answer-eval.js';
import { RESULTS_DIR } from '../evaluation.config.js';

/** Rows of a saved answer-eval run, e.g. "answers-vector" -> eval/results/answers-vector.json. */
export async function readAnswerRun(name: string): Promise<AnswerRow[]> {
  const saved = JSON.parse(
    await readFile(join(RESULTS_DIR, `${name}.json`), 'utf8'),
  ) as { rows: AnswerRow[] };
  return saved.rows;
}

/** The sheet records which run it was sampled from, in its first line. */
export const sourceLine = (name: string) => `<!-- source: ${name} -->`;
export function readSourceLine(sheet: string): string {
  const match = /^<!-- source: (\S+) -->/.exec(sheet);
  if (!match)
    throw new Error('Judge sheet has no "<!-- source: ... -->" first line');
  return match[1];
}
