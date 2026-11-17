// `npm run eval:retrieval` — everything that can be measured WITHOUT the LLM:
//   1. hit@k and MRR for vector / keyword / hybrid      -> eval/results/retrieval.*
//   2. gate-1 threshold sweep on the best vector score  -> eval/results/threshold.*
// Needs Postgres (ingested) and the embedding model.

import { NestFactory } from '@nestjs/core';
import { MIN_TOP_SIMILARITY } from '../answering/answering.config.js';
import {
  EVAL_DEPTH,
  EVAL_KS,
  SWEEP_THRESHOLDS,
} from '../evaluation/evaluation.config.js';
import { formatRetrievalReport } from '../evaluation/format-retrieval-report.js';
import { formatThresholdReport } from '../evaluation/format-threshold-report.js';
import { loadEvalSet } from '../evaluation/load-eval-set.js';
import {
  runRetrievalEval,
  summarizeRetrieval,
} from '../evaluation/retrieval-eval.js';
import {
  collectTopSimilarities,
  sweepThresholds,
} from '../evaluation/threshold-sweep.js';
import { writeResults } from '../evaluation/write-results.js';
import { RETRIEVERS, type Retrievers } from '../retrieval/retriever.js';
import { SearchCliModule } from './search-cli.module.js';

const questions = await loadEvalSet(); // invalid set -> throws before anything loads

// Same modules as `npm run search`: config + retrieval, no HTTP, no LLM.
const app = await NestFactory.createApplicationContext(SearchCliModule, {
  logger: ['warn', 'error'],
});

try {
  const retrievers = app.get<Retrievers>(RETRIEVERS);

  const rows = await runRetrievalEval(questions, retrievers, EVAL_DEPTH);
  const summary = summarizeRetrieval(rows, EVAL_KS);
  const report = formatRetrievalReport(summary, rows, EVAL_KS, EVAL_DEPTH);

  const similarities = await collectTopSimilarities(
    questions,
    retrievers.vector,
  );
  const sweep = sweepThresholds(similarities, SWEEP_THRESHOLDS);
  const thresholdReport = formatThresholdReport(
    similarities,
    sweep,
    MIN_TOP_SIMILARITY,
  );

  const files = [
    ...(await writeResults(
      'retrieval',
      { settings: { depth: EVAL_DEPTH, ks: EVAL_KS }, summary, rows },
      report,
    )),
    ...(await writeResults(
      'threshold',
      { settings: { current: MIN_TOP_SIMILARITY }, similarities, sweep },
      thresholdReport,
    )),
  ];
  console.log(report);
  console.log(thresholdReport);
  console.log(`Written: ${files.join(', ')}`);
} catch (error) {
  console.error('Retrieval eval failed:', error);
  process.exitCode = 1;
} finally {
  await app.close();
}
