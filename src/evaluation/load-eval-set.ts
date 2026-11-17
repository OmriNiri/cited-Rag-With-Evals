import { readFile } from 'node:fs/promises';
import type { EvalQuestion } from './eval-question.js';
import { parseEvalSet } from './parse-eval-set.js';

export const EVAL_SET_PATH = 'eval/questions.jsonl'; // relative to the project root, where npm scripts run

export async function loadEvalSet(
  path = EVAL_SET_PATH,
): Promise<EvalQuestion[]> {
  return parseEvalSet(await readFile(path, 'utf8'));
}
