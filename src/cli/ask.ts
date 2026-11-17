// `npm run ask -- "<question>"`
// Runs the same pipeline as POST /ask, without starting the HTTP server.

import { NestFactory } from '@nestjs/core';
import { AnswerService } from '../answering/answer.service.js';
import { LLM_CLIENT, type LlmClient } from '../answering/llm-client.js';
import { AskCliModule } from './ask-cli.module.js';
import { formatAnswer } from './format-answer.js';
import { parseAskArgs } from './parse-ask-args.js';

let question;
try {
  question = parseAskArgs(process.argv.slice(2));
} catch (error) {
  console.error((error as Error).message);
  process.exit(1); // bad input: stop before loading any model
}

const app = await NestFactory.createApplicationContext(AskCliModule, {
  logger: ['warn', 'error'],
});

try {
  const model = app.get<LlmClient>(LLM_CLIENT).model;
  console.log(`Question: ${question}\n`);

  const started = performance.now();
  const result = await app.get(AnswerService).ask(question);
  const seconds = ((performance.now() - started) / 1000).toFixed(1);

  console.log(formatAnswer(result));
  console.log(`\n(${model}, ${seconds}s)`);
} catch (error) {
  console.error('Ask failed:', error);
  process.exitCode = 1;
} finally {
  await app.close(); // closes the database pool
}
