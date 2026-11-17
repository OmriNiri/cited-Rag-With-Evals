import type { AnswerRow } from '../answer-eval.js';
import { VERDICTS, type Verdict } from '../judge/judge-verdict.js';

const VERDICT_LINE = /^Your verdict:[ \t]*(\S*)[ \t]*$/;

/**
 * The blind labelling sheet: for each sampled answer the SAME input the judge
 * saw (question, answer, valid quotes) and an empty "Your verdict:" line. The
 * judge's verdict, the retriever and the gold article are not shown.
 */
export function buildJudgeSheet(
  rows: AnswerRow[],
  questionText: Map<string, string>,
): string {
  const lines = [
    '# Judge check — blind human labels',
    '',
    'Label each answer with the same rubric the judge uses, using ONLY the quotes (not your own knowledge of the law):',
    '',
    '- `supported`: every statement in the answer, including a yes/no conclusion, is directly stated in the quotes.',
    '- `partial`: some statements are stated in the quotes, but at least one statement or the conclusion is not.',
    '- `unsupported`: the main statement or conclusion is not stated in the quotes, or contradicts them.',
    '',
    'Write one word after "Your verdict:". Do not look at eval/results/ before you are done.',
    '',
  ];
  for (const r of rows) {
    lines.push(
      `## ${r.id}`,
      '',
      `**Question:** ${questionText.get(r.id) ?? '?'}`,
      '',
      `**Answer:** ${r.answer}`,
      '',
      '**Quotes:**',
      '',
    );
    r.citations
      .filter((c) => c.valid)
      .forEach((c, i) =>
        lines.push(`${i + 1}. (${c.article ?? '?'}) "${c.quote}"`),
      );
    lines.push('', 'Your verdict: ', '');
  }
  return lines.join('\n');
}

/** Reads the labels back: id -> verdict, or null where the line is still empty. */
export function parseJudgeSheet(markdown: string): Map<string, Verdict | null> {
  const labels = new Map<string, Verdict | null>();
  let current: string | null = null;
  for (const line of markdown.split('\n')) {
    const heading = /^## (\S+)\s*$/.exec(line);
    if (heading) {
      current = heading[1];
      labels.set(current, null);
      continue;
    }
    const verdict = VERDICT_LINE.exec(line);
    if (verdict && current) {
      const word = verdict[1].toLowerCase();
      if (word === '') continue;
      if (!VERDICTS.includes(word as Verdict)) {
        throw new Error(
          `${current}: "${verdict[1]}" is not one of ${VERDICTS.join(', ')}`,
        );
      }
      labels.set(current, word as Verdict);
    }
  }
  return labels;
}
