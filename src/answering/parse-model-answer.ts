import { LlmError } from './llm-error.js';
import type { ModelAnswer, ModelCitation } from './model-answer.js';

/**
 * Turns the model's raw reply into a checked ModelAnswer, or throws a retryable
 * LlmError ("malformed reply" is worth one more try). Hand-written checks instead
 * of a validation library: the shape is small and every rule is visible here.
 */
export function parseModelAnswer(raw: string): ModelAnswer {
  let data: unknown;
  try {
    data = JSON.parse(stripWrapping(raw));
  } catch (error) {
    throw new LlmError('Model reply is not valid JSON', true, { cause: error });
  }

  if (!isObject(data)) throw malformed('reply is not a JSON object');
  if (typeof data.answer !== 'string')
    throw malformed('"answer" must be a string');
  if (typeof data.refused !== 'boolean')
    throw malformed('"refused" must be a boolean');
  if (!Array.isArray(data.citations))
    throw malformed('"citations" must be an array');

  const citations: ModelCitation[] = data.citations.map(
    (c: unknown, i: number) => {
      if (
        !isObject(c) ||
        !Number.isInteger(c.passage) ||
        typeof c.quote !== 'string'
      ) {
        throw malformed(
          `citation ${i} needs an integer "passage" and a string "quote"`,
        );
      }
      return { passage: c.passage as number, quote: c.quote };
    },
  );

  return { answer: data.answer.trim(), refused: data.refused, citations };
}

/**
 * Small models sometimes wrap JSON in a ```json code fence, and "thinking" models
 * may put a <think>...</think> block first. Both are removed; anything else must
 * already be plain JSON.
 */
function stripWrapping(raw: string): string {
  return raw
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function malformed(reason: string): LlmError {
  return new LlmError(`Model reply has the wrong shape: ${reason}`, true);
}
