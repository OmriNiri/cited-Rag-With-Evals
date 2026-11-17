// The exact shape we ask the model to reply with, as a TypeScript type and as
// the JSON Schema sent to the server (which can enforce it while generating).

export interface ModelCitation {
  passage: number; // the [n] number shown in the prompt — code maps it to a chunk id (D23)
  quote: string; // must be copied word for word from that passage (checked in code)
}

export interface ModelAnswer {
  answer: string;
  citations: ModelCitation[];
  refused: boolean; // true = "the passages do not contain the answer"
}

export const MODEL_ANSWER_SCHEMA = {
  type: 'object',
  properties: {
    answer: { type: 'string' },
    citations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          passage: { type: 'integer' },
          quote: { type: 'string' },
        },
        required: ['passage', 'quote'],
        additionalProperties: false,
      },
    },
    refused: { type: 'boolean' },
  },
  required: ['answer', 'citations', 'refused'],
  additionalProperties: false,
} as const;
