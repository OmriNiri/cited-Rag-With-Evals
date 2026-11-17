import { Inject, Injectable } from '@nestjs/common';
import {
  RETRIEVERS,
  type RetrievalMode,
  type Retrievers,
} from '../retrieval/retriever.js';
import { ANSWER_RETRIEVAL_MODE, ANSWER_TOP_K } from './answering.config.js';
import type { CitedAnswer } from './answer.types.js';
import { buildPrompt } from './build-prompt.js';
import { completeWithRetry } from './complete-with-retry.js';
import { LLM_CLIENT, type LlmClient } from './llm-client.js';
import { MODEL_ANSWER_SCHEMA } from './model-answer.js';
import { parseModelAnswer } from './parse-model-answer.js';
import { decideAnswer, refuseOnLowRetrieval } from './refusal-policy.js';
import { validateCitations } from './validate-citations.js';

/**
 * The answering pipeline. Only connects the pieces, each of which is tested alone:
 *   1. gate 1: best cosine similarity too low -> refuse, no model call
 *   2. retrieval (hybrid by default) -> numbered passages -> model (one retry)
 *   3. verbatim check of every citation
 *   4. gates 2-3 decide: cited answer or refusal
 * Model errors that survive the retry are thrown (LlmError) for the caller.
 */
@Injectable()
export class AnswerService {
  constructor(
    @Inject(RETRIEVERS) private readonly retrievers: Retrievers,
    @Inject(LLM_CLIENT) private readonly llm: LlmClient,
  ) {}

  /**
   * @param mode which retriever supplies the passages. The API always uses the
   *   default; the eval passes it explicitly to compare retrievers end to end.
   */
  async ask(
    question: string,
    mode: RetrievalMode = ANSWER_RETRIEVAL_MODE,
  ): Promise<CitedAnswer> {
    // Gate 1 uses the VECTOR score: it is a cosine similarity with a fixed
    // meaning. The hybrid (RRF) score only says "rank", not "how relevant".
    // Run first, so an unrelated question never costs a model call.
    const [best] = await this.retrievers.vector.retrieve(question, {
      limit: 1,
    });
    const lowRetrieval = refuseOnLowRetrieval(best?.score ?? 0); // empty table -> refuse
    if (lowRetrieval) return lowRetrieval;

    const hits = await this.retrievers[mode].retrieve(question, {
      limit: ANSWER_TOP_K,
    });
    const model = await completeWithRetry(
      this.llm,
      {
        messages: buildPrompt(question, hits),
        jsonSchema: MODEL_ANSWER_SCHEMA,
      },
      parseModelAnswer,
    );
    const citations = validateCitations(model.citations, hits);
    return decideAnswer(model, citations);
  }
}
