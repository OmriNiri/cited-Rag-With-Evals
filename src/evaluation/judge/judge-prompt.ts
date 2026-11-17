import type { ChatMessage } from '../../answering/llm-client.js';

/**
 * Fixed rubric. The judge sees ONLY the quotes shown as evidence, not the full
 * passages and not the gold article: faithfulness here means "does the cited
 * evidence say what the answer says", which is what a user can check too.
 */
export const JUDGE_SYSTEM_PROMPT = `You check whether an answer is supported by the quotes given as its evidence.

Use ONLY the quotes. Do not use your own knowledge of the law; an answer that is true but not stated in the quotes is NOT supported.

Verdicts:
- "supported": every statement in the answer, including a yes/no conclusion, is directly stated in the quotes.
- "partial": some statements are stated in the quotes, but at least one statement or the conclusion is not.
- "unsupported": the main statement or conclusion is not stated in the quotes, or contradicts them.

Give a one-sentence reason naming the statement that is or is not supported.
Reply with JSON only: {"verdict": "...", "reason": "..."}`;

export interface EvidenceQuote {
  article: string;
  quote: string;
}

export function buildJudgePrompt(
  question: string,
  answer: string,
  evidence: EvidenceQuote[],
): ChatMessage[] {
  const quotes = evidence
    .map((e, i) => `[${i + 1}] (${e.article}) "${e.quote}"`)
    .join('\n');
  return [
    { role: 'system', content: JUDGE_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Question: ${question}\n\nAnswer: ${answer}\n\nQuotes:\n${quotes}`,
    },
  ];
}
