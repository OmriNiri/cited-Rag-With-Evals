// What the faithfulness judge must return.

export const VERDICTS = ['supported', 'partial', 'unsupported'] as const;
export type Verdict = (typeof VERDICTS)[number];

export interface JudgeVerdict {
  verdict: Verdict;
  reason: string; // one sentence, so a human can check the verdict quickly
}

/** Sent as `response_format`, so the server constrains the reply to this shape. */
export const JUDGE_VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: [...VERDICTS] },
    reason: { type: 'string' },
  },
  required: ['verdict', 'reason'],
  additionalProperties: false,
} as const;
