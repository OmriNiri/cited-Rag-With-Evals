import { MAX_QUESTION_CHARS } from '../answering/answering.config.js';

export const ASK_USAGE = 'Usage: npm run ask -- "<question>"';

/** The question from the command line (all words joined), with the same limits as POST /ask. */
export function parseAskArgs(argv: string[]): string {
  const question = argv.join(' ').trim();
  if (question === '') throw new Error(`Missing question.\n${ASK_USAGE}`);
  if (question.length > MAX_QUESTION_CHARS) {
    throw new Error(
      `Question is too long (${question.length} characters, max ${MAX_QUESTION_CHARS}).`,
    );
  }
  return question;
}
