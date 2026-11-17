import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { RESULTS_DIR } from './evaluation.config.js';

/**
 * Writes <name>.json (full data, for diffs and later analysis) and <name>.md
 * (readable report) to eval/results/. No timestamps inside: re-running on an
 * unchanged system produces identical files, so `git diff` shows real changes only.
 */
export async function writeResults(
  name: string,
  data: unknown,
  markdown: string,
  dir = RESULTS_DIR,
): Promise<string[]> {
  await mkdir(dir, { recursive: true });
  const files = [join(dir, `${name}.json`), join(dir, `${name}.md`)];
  await writeFile(files[0], JSON.stringify(data, null, 2) + '\n');
  await writeFile(files[1], markdown);
  return files;
}
