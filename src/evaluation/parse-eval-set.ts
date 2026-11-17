import type { EvalQuestion } from './eval-question.js';

const ARTICLE = /^Art\. \d+[a-z]*$/; // "Art. 335c", "Art. 329gbis"

/**
 * Parses eval/questions.jsonl (one JSON object per line) and checks every rule.
 * Collects ALL problems with their line numbers before throwing, so a bad edit
 * to the set is fixed in one go. Hand-written checks: the shape is small.
 */
export function parseEvalSet(text: string): EvalQuestion[] {
  const questions: EvalQuestion[] = [];
  const errors: string[] = [];
  const seenIds = new Set<string>();

  text.split('\n').forEach((line, index) => {
    if (line.trim() === '') return; // allow blank lines, e.g. at the end
    const problems = checkLine(line, seenIds);
    if (typeof problems === 'string') {
      errors.push(`line ${index + 1}: ${problems}`);
    } else {
      questions.push(problems);
    }
  });

  if (errors.length > 0) {
    throw new Error(`Invalid eval set:\n- ${errors.join('\n- ')}`);
  }
  return questions;
}

/** The parsed question, or a description of what is wrong with the line. */
function checkLine(line: string, seenIds: Set<string>): EvalQuestion | string {
  let data: unknown;
  try {
    data = JSON.parse(line);
  } catch {
    return 'not valid JSON';
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return 'not a JSON object';
  }
  const q = data as Record<string, unknown>;

  if (typeof q.id !== 'string' || q.id === '') return '"id" must be a string';
  if (seenIds.has(q.id)) return `duplicate id "${q.id}"`;
  seenIds.add(q.id);

  if (typeof q.question !== 'string' || q.question.trim() === '') {
    return `${q.id}: "question" must be a non-empty string`;
  }
  if (typeof q.answerable !== 'boolean') {
    return `${q.id}: "answerable" must be true or false`;
  }
  if (
    !Array.isArray(q.goldArticles) ||
    !q.goldArticles.every((a) => typeof a === 'string' && ARTICLE.test(a))
  ) {
    return `${q.id}: "goldArticles" must be a list like ["Art. 335c"]`;
  }
  // The two fields must agree: answerable <=> at least one gold article.
  if (q.answerable !== q.goldArticles.length > 0) {
    return `${q.id}: answerable questions need gold articles, unanswerable ones none`;
  }
  if (q.wording !== 'casual' && q.wording !== 'legal') {
    return `${q.id}: "wording" must be "casual" or "legal"`;
  }
  if (q.note !== undefined && typeof q.note !== 'string') {
    return `${q.id}: "note" must be a string`;
  }

  return {
    id: q.id,
    question: q.question,
    answerable: q.answerable,
    goldArticles: q.goldArticles as string[],
    wording: q.wording,
    ...(q.note === undefined ? {} : { note: q.note }),
  };
}
