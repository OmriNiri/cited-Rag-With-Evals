import { BadRequestException } from '@nestjs/common';
import { MAX_QUESTION_CHARS } from './answering.config.js';

/**
 * Checks the POST /ask body and returns the trimmed question, or throws a 400
 * with a clear message. Hand-written instead of class-validator: one field.
 */
export function parseAskBody(body: unknown): string {
  const question =
    typeof body === 'object' && body !== null
      ? (body as Record<string, unknown>).question
      : undefined;

  if (typeof question !== 'string' || question.trim() === '') {
    throw new BadRequestException(
      'Body must be JSON like {"question": "..."} with a non-empty question',
    );
  }
  const trimmed = question.trim();
  if (trimmed.length > MAX_QUESTION_CHARS) {
    throw new BadRequestException(
      `Question is too long (${trimmed.length} characters, max ${MAX_QUESTION_CHARS})`,
    );
  }
  return trimmed;
}
