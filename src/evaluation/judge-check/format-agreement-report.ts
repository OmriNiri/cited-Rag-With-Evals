import type { AnswerRow } from '../answer-eval.js';
import { VERDICTS } from '../judge/judge-verdict.js';
import type { Agreement, LabelPair } from './agreement.js';

/** Markdown report: agreement numbers, 3x3 table, every disagreement with the judge's reason. */
export function formatAgreementReport(
  a: Agreement,
  pairs: LabelPair[],
  rowsById: Map<string, AnswerRow>,
  source: string,
): string {
  const pct = a.labelled === 0 ? 0 : Math.round((100 * a.agree) / a.labelled);
  const lines = [
    `## Judge vs human — ${a.labelled} blind-labelled answers (${source})`,
    '',
    '| Measure | Result |',
    '|---|---|',
    `| Same verdict | ${a.agree}/${a.labelled} (${pct}%) |`,
    `| Cohen's kappa (chance-corrected; 1 = perfect, 0 = chance) | ${a.kappa.toFixed(2)} |`,
    `| Judge kinder than the human (lenient) | ${a.lenient.length} ${list(a.lenient)} |`,
    `| Judge harsher than the human (strict) | ${a.strict.length} ${list(a.strict)} |`,
    '',
    '### Human (rows) vs judge (columns)',
    '',
    `| Human \\ Judge | ${VERDICTS.join(' | ')} |`,
    `|---|${VERDICTS.map(() => '---|').join('')}`,
    ...VERDICTS.map(
      (h) => `| ${h} | ${VERDICTS.map((j) => a.confusion[h][j]).join(' | ')} |`,
    ),
    '',
    '### Disagreements',
    '',
    '| Id | Human | Judge | Judge’s reason |',
    '|---|---|---|---|',
  ];
  for (const p of pairs.filter((p) => p.human !== p.judge)) {
    const reason = (rowsById.get(p.id)?.judge?.reason ?? '').replace(
      /\|/g,
      '/',
    );
    lines.push(`| ${p.id} | ${p.human} | ${p.judge} | ${reason} |`);
  }
  return lines.join('\n') + '\n';
}

const list = (ids: string[]) => (ids.length ? `(${ids.join(', ')})` : '');
