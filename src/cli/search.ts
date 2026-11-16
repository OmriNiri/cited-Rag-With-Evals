// `npm run search -- "<question>" [--mode vector|keyword|hybrid|all] [--k 5] [--document <name>]`
// Shows what each retriever returns for a question. For looking, not for measuring:
// retrieval quality is measured on the eval set (Phase 4).

import { NestFactory } from '@nestjs/core';
import { RETRIEVERS, type Retrievers } from '../retrieval/retriever.js';
import { formatHits } from './format-hits.js';
import { parseSearchArgs } from './parse-search-args.js';
import { SearchCliModule } from './search-cli.module.js';

let args;
try {
  args = parseSearchArgs(process.argv.slice(2));
} catch (error) {
  console.error((error as Error).message);
  process.exit(1); // bad input: stop before loading the model
}

const app = await NestFactory.createApplicationContext(SearchCliModule, {
  logger: ['warn', 'error'], // keep the output to the results
});

try {
  const retrievers = app.get<Retrievers>(RETRIEVERS);
  console.log(`Question: ${args.question}`);

  for (const mode of args.modes) {
    const hits = await retrievers[mode].retrieve(args.question, {
      limit: args.k,
      document: args.document,
    });
    console.log(formatHits(mode, hits));
  }
} catch (error) {
  console.error('Search failed:', error);
  process.exitCode = 1;
} finally {
  await app.close(); // closes the database pool
}
