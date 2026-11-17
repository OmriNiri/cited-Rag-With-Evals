import type { AnswerRow } from './answer-eval.js';
import type { AnswerSummary, Ratio } from './answer-metrics.js';

export interface AnswerRunSettings {
  model: string;
  mode: string;
  topK: number;
  minTopSimilarity: number;
}

/** Markdown report for one answer-eval run. Pure: returns text. */
export function formatAnswerReport(
  s: AnswerSummary,
  rows: AnswerRow[],
  settings: AnswerRunSettings,
): string {
  const f = s.faithfulness;
  const judged = f.supported + f.partial + f.unsupported;
  const lines = [
    `## Answers — ${settings.mode} retrieval, ${settings.model}`,
    '',
    `Settings: top-k ${settings.topK}, gate-1 threshold ${settings.minTopSimilarity}. ${s.questions} questions, ${s.errors} model errors (excluded below).`,
    '',
    '| Metric | Result |',
    '|---|---|',
    `| Refusal accuracy (right answer/refuse decision) | ${ratio(s.refusalAccuracy)} |`,
    `| Answerable → answered | ${s.answerableAnswered} |`,
    `| Answerable → refused | ${s.answerableRefused} ${reasons(s.refusedBy.answerable)} |`,
    `| Unanswerable → refused | ${s.unanswerableRefused} ${reasons(s.refusedBy.unanswerable)} |`,
    `| Unanswerable → answered | ${s.unanswerableAnswered} |`,
    `| Citation validity (quotes passing the verbatim check) | ${ratio(s.citationValidity)} |`,
    `| Gold citation (answered answerable questions citing a gold article) | ${ratio(s.goldCitation)} |`,
    `| Faithfulness (judge): supported / partial / unsupported | ${f.supported} / ${f.partial} / ${f.unsupported} of ${judged}${f.judgeErrors ? `, ${f.judgeErrors} judge errors` : ''} |`,
    `| Seconds per question: median / max | ${s.seconds.median.toFixed(1)} / ${s.seconds.max.toFixed(1)} |`,
    '',
    '### Per question',
    '',
    '| Id | Answerable | Outcome | Cited articles (✓ valid, ✗ invalid) | Gold cited | Judge | s |',
    '|---|---|---|---|---|---|---|',
  ];
  for (const r of rows) {
    const outcome =
      r.outcome === 'refused'
        ? `refused: ${r.refusalReason}`
        : r.outcome === 'error'
          ? `error: ${r.error}`
          : 'answered';
    const cited = r.citations
      .map((c) => `${c.valid ? '✓' : '✗'} ${c.article ?? '?'}`)
      .join(', ');
    const gold =
      r.outcome !== 'answered' || !r.answerable
        ? ''
        : r.citations.some(
              (c) =>
                c.valid &&
                c.article !== null &&
                r.goldArticles.includes(c.article),
            )
          ? 'yes'
          : '**no**';
    const judge = r.judge?.verdict ?? (r.judgeError ? 'judge error' : '');
    lines.push(
      `| ${r.id} | ${r.answerable ? 'yes' : 'no'} | ${outcome} | ${cited} | ${gold} | ${judge} | ${r.seconds} |`,
    );
  }
  return lines.join('\n') + '\n';
}

const ratio = (r: Ratio) =>
  r.of === 0
    ? '–'
    : `${r.count}/${r.of} (${Math.round((100 * r.count) / r.of)}%)`;
const reasons = (byReason: Record<string, number | undefined>) => {
  const parts = Object.entries(byReason).map(([k, v]) => `${k} ${v}`);
  return parts.length ? `(${parts.join(', ')})` : '';
};
