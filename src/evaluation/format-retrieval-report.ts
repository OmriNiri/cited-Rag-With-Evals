import { RETRIEVAL_MODES } from '../retrieval/retriever.js';
import type {
  RetrievalGroup,
  RetrievalRow,
  RetrievalSummary,
} from './retrieval-eval.js';

const GROUPS: RetrievalGroup[] = ['all', 'casual', 'legal'];

/** Markdown report: summary table, then one line per question. Pure: returns text. */
export function formatRetrievalReport(
  summary: RetrievalSummary,
  rows: RetrievalRow[],
  ks: readonly number[],
  depth: number,
): string {
  const head = `| Retriever | Questions | ${ks.map((k) => `hit@${k}`).join(' | ')} | MRR@${depth} |`;
  const lines = [
    `## Retrieval — ${rows.length} answerable questions`,
    '',
    'hit@k = share of questions with a gold article in the top k. MRR = mean of 1/rank of the first gold hit (0 if not in the top ' +
      `${depth}).`,
    '',
    head,
    `|---|---|${ks.map(() => '---|').join('')}---|`,
  ];
  for (const mode of RETRIEVAL_MODES) {
    for (const group of GROUPS) {
      const s = summary[mode][group];
      const hits = ks.map(
        (k) => `${count(s.hitAt[k], s.questions)} (${pct(s.hitAt[k])})`,
      );
      lines.push(
        `| ${mode} | ${group} (${s.questions}) | ${hits.join(' | ')} | ${s.mrr.toFixed(3)} |`,
      );
    }
  }

  lines.push(
    '',
    '### Per question — rank of the first gold article (– = not in the top ' +
      `${depth})`,
    '',
    '| Id | Wording | Gold | vector | keyword | hybrid |',
    '|---|---|---|---|---|---|',
  );
  for (const r of rows) {
    const rank = (n: number | null) => (n === null ? '–' : String(n));
    lines.push(
      `| ${r.id} | ${r.wording} | ${r.goldArticles.join(', ')} | ${rank(r.ranks.vector)} | ${rank(r.ranks.keyword)} | ${rank(r.ranks.hybrid)} |`,
    );
  }
  return lines.join('\n') + '\n';
}

const pct = (share: number) => `${(share * 100).toFixed(0)}%`;
const count = (share: number, n: number) => `${Math.round(share * n)}/${n}`;
