import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { RESULTS_DIR } from '../evaluation.config.js';
import type { RetrievalSummary } from '../retrieval-eval.js';
import type { SimilarityRow } from '../threshold-sweep.js';

/** The parts of retrieval.json and threshold.json that the gate needs. */
export interface RetrievalResults {
  summary: RetrievalSummary;
  similarities: SimilarityRow[];
}

/** Reads the files written by `npm run eval:retrieval` (missing file -> throws). */
export async function readRetrievalResults(
  dir = RESULTS_DIR,
): Promise<RetrievalResults> {
  const read = async <T>(name: string) =>
    JSON.parse(await readFile(join(dir, `${name}.json`), 'utf8')) as T;
  const { summary } = await read<{ summary: RetrievalSummary }>('retrieval');
  const { similarities } = await read<{ similarities: SimilarityRow[] }>(
    'threshold',
  );
  return { summary, similarities };
}
