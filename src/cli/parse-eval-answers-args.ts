import { parseArgs } from 'node:util';
import { ANSWER_RETRIEVAL_MODE } from '../answering/answering.config.js';
import { RETRIEVAL_MODES, type RetrievalMode } from '../retrieval/retriever.js';

export const EVAL_ANSWERS_USAGE =
  'Usage: npm run eval:answers [-- --mode vector|keyword|hybrid] [--rescore]';

export interface EvalAnswersArgs {
  mode: RetrievalMode; // retriever for this run; default = what the API uses
  rescore: boolean; // re-score the saved run with the current labels, no model calls
}

export function parseEvalAnswersArgs(argv: string[]): EvalAnswersArgs {
  const { values } = parseArgs({
    args: argv,
    options: {
      mode: { type: 'string', default: ANSWER_RETRIEVAL_MODE },
      rescore: { type: 'boolean', default: false },
    },
  });
  const mode = RETRIEVAL_MODES.find((m) => m === values.mode);
  if (!mode) {
    throw new Error(`Unknown --mode "${values.mode}".\n${EVAL_ANSWERS_USAGE}`);
  }
  return { mode, rescore: values.rescore };
}
