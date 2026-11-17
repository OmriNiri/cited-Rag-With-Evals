// `npm run eval:retrieval` — hit@k and MRR for vector / keyword / hybrid on the
// eval set. Needs Postgres (ingested) and the embedding model; no LLM.

import { NestFactory } from '@nestjs/core';
import { EVAL_DEPTH, EVAL_KS } from '../evaluation/evaluation.config.js';
import { formatRetrievalReport } from '../evaluation/format-retrieval-report.js';
import { loadEvalSet } from '../evaluation/load-eval-set.js';
import {
  runRetrievalEval,
  summarizeRetrieval,
} from '../evaluation/retrieval-eval.js';
import { writeResults } from '../evaluation/write-results.js';
import { RETRIEVERS, type Retrievers } from '../retrieval/retriever.js';
import { SearchCliModule } from './search-cli.module.js';

const questions = await loadEvalSet(); // invalid set -> throws before anything loads

// Same modules as `npm run search`: config + retrieval, no HTTP, no LLM.
const app = await NestFactory.createApplicationContext(SearchCliModule, {
  logger: ['warn', 'error'],
});

try {
  const rows = await runRetrievalEval(
    questions,
    app.get<Retrievers>(RETRIEVERS),
    EVAL_DEPTH,
  );
  const summary = summarizeRetrieval(rows, EVAL_KS);
  const report = formatRetrievalReport(summary, rows, EVAL_KS, EVAL_DEPTH);

  const files = await writeResults(
    'retrieval',
    { settings: { depth: EVAL_DEPTH, ks: EVAL_KS }, summary, rows },
    report,
  );
  console.log(report);
  console.log(`Written: ${files.join(', ')}`);
} catch (error) {
  console.error('Retrieval eval failed:', error);
  process.exitCode = 1;
} finally {
  await app.close();
}
