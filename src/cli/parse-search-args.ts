import { parseArgs } from 'node:util';
import { DEFAULT_TOP_K } from '../retrieval/retrieval.config.js';
import { RETRIEVAL_MODES, type RetrievalMode } from '../retrieval/retriever.js';

export interface SearchArgs {
  question: string;
  modes: RetrievalMode[]; // one mode, or all three for a side-by-side comparison
  k: number;
  document?: string;
}

export const SEARCH_USAGE =
  'Usage: npm run search -- "<question>" [--mode vector|keyword|hybrid|all] [--k 5] [--document <name>]';

/**
 * Turns command-line arguments into validated search settings.
 * Uses Node's built-in parseArgs (no CLI library). Throws with a readable message on bad input.
 */
export function parseSearchArgs(argv: string[]): SearchArgs {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      mode: { type: 'string', default: 'hybrid' },
      k: { type: 'string', default: String(DEFAULT_TOP_K) },
      document: { type: 'string' },
    },
  });

  const question = positionals.join(' ').trim();
  if (question === '') throw new Error(`Missing question.\n${SEARCH_USAGE}`);

  const mode = values.mode;
  const modes =
    mode === 'all'
      ? [...RETRIEVAL_MODES]
      : RETRIEVAL_MODES.filter((m) => m === mode);
  if (modes.length === 0) {
    throw new Error(`Unknown --mode "${mode}".\n${SEARCH_USAGE}`);
  }

  const k = Number(values.k);
  if (!Number.isInteger(k) || k < 1) {
    throw new Error(`--k must be a positive integer, got "${values.k}".`);
  }

  return { question, modes, k, document: values.document };
}
