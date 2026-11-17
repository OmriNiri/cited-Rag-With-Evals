import { LlmError } from '../../answering/llm-error.js';
import { VERDICTS, type JudgeVerdict, type Verdict } from './judge-verdict.js';

/** Raw judge reply -> checked verdict, or a retryable LlmError (same policy as answers). */
export function parseVerdict(raw: string): JudgeVerdict {
  let data: unknown;
  try {
    data = JSON.parse(raw.trim());
  } catch (error) {
    throw new LlmError('Judge reply is not valid JSON', true, { cause: error });
  }
  const v = (data ?? {}) as Record<string, unknown>;
  if (!VERDICTS.includes(v.verdict as Verdict)) {
    throw new LlmError(
      `Judge verdict must be one of ${VERDICTS.join(', ')}`,
      true,
    );
  }
  if (typeof v.reason !== 'string') {
    throw new LlmError('Judge reply needs a string "reason"', true);
  }
  return { verdict: v.verdict as Verdict, reason: v.reason.trim() };
}
