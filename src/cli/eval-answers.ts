// `npm run eval:answers [-- --mode vector|keyword|hybrid] [--rescore]`
// Full run: all eval questions through the answering pipeline, every answered one
// judged -> eval/results/answers-<mode>.{json,md}. Needs Postgres AND Ollama; minutes.
// --rescore: recompute the scores of the saved run with the current labels (seconds).

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AnswerService } from '../answering/answer.service.js';
import {
  ANSWER_TOP_K,
  MIN_TOP_SIMILARITY,
} from '../answering/answering.config.js';
import { LLM_CLIENT, type LlmClient } from '../answering/llm-client.js';
import { runAnswerEval, type AnswerRow } from '../evaluation/answer-eval.js';
import { summarizeAnswers } from '../evaluation/answer-metrics.js';
import { RESULTS_DIR } from '../evaluation/evaluation.config.js';
import {
  formatAnswerReport,
  type AnswerRunSettings,
} from '../evaluation/format-answer-report.js';
import { FaithfulnessJudge } from '../evaluation/judge/faithfulness-judge.js';
import { loadEvalSet } from '../evaluation/load-eval-set.js';
import { relabelRows } from '../evaluation/relabel-rows.js';
import { writeResults } from '../evaluation/write-results.js';
import type { RetrievalMode } from '../retrieval/retriever.js';
import { EvalAnswersCliModule } from './eval-answers-cli.module.js';
import { parseEvalAnswersArgs } from './parse-eval-answers-args.js';

let args;
try {
  args = parseEvalAnswersArgs(process.argv.slice(2));
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}
const questions = await loadEvalSet();
const name = `answers-${args.mode}`;

try {
  const { settings, rows } = args.rescore
    ? await rescoreSavedRun()
    : await runWithModel(args.mode);
  const summary = summarizeAnswers(rows);
  const report = formatAnswerReport(summary, rows, settings);
  const files = await writeResults(name, { settings, summary, rows }, report);
  console.log(`\n${report}`);
  console.log(`Written: ${files.join(', ')}`);
} catch (error) {
  console.error('Answer eval failed:', error);
  process.exitCode = 1;
}

/** The saved answers with today's labels; no database, no model. */
async function rescoreSavedRun() {
  const saved = JSON.parse(
    await readFile(join(RESULTS_DIR, `${name}.json`), 'utf8'),
  ) as { settings: AnswerRunSettings; rows: AnswerRow[] };
  console.log(`Re-scoring ${name}.json with the current labels`);
  return { settings: saved.settings, rows: relabelRows(saved.rows, questions) };
}

async function runWithModel(mode: RetrievalMode) {
  const app = await NestFactory.createApplicationContext(EvalAnswersCliModule, {
    logger: ['warn', 'error'],
  });
  try {
    const llm = app.get<LlmClient>(LLM_CLIENT);
    const settings: AnswerRunSettings = {
      model: llm.model,
      mode,
      topK: ANSWER_TOP_K,
      minTopSimilarity: MIN_TOP_SIMILARITY,
    };
    console.log(
      `Answer eval: ${questions.length} questions, ${mode} retrieval, ${llm.model}`,
    );
    const rows = await runAnswerEval(
      questions,
      app.get(AnswerService),
      new FaithfulnessJudge(llm),
      mode,
      (row) =>
        console.log(
          `${row.id}  ${row.outcome.padEnd(8)} ${(row.refusalReason ?? row.judge?.verdict ?? row.error ?? '').padEnd(27)} ${row.seconds}s`,
        ),
    );
    return { settings, rows };
  } finally {
    await app.close();
  }
}
