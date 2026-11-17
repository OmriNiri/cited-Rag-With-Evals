import { completeWithRetry } from '../../answering/complete-with-retry.js';
import type { LlmClient } from '../../answering/llm-client.js';
import { buildJudgePrompt, type EvidenceQuote } from './judge-prompt.js';
import { JUDGE_VERDICT_SCHEMA, type JudgeVerdict } from './judge-verdict.js';
import { parseVerdict } from './parse-verdict.js';

/**
 * LLM-as-judge for faithfulness. Same client, retry policy and temperature 0 as
 * answering. Known limit: with the same model as the answerer it may be lenient
 * with its own answers — measured against Omri's hand labels (Phase 4, step 5).
 */
export class FaithfulnessJudge {
  constructor(private readonly client: LlmClient) {}

  get model(): string {
    return this.client.model;
  }

  judge(
    question: string,
    answer: string,
    evidence: EvidenceQuote[],
  ): Promise<JudgeVerdict> {
    return completeWithRetry(
      this.client,
      {
        messages: buildJudgePrompt(question, answer, evidence),
        jsonSchema: JUDGE_VERDICT_SCHEMA,
      },
      parseVerdict,
    );
  }
}
