import { join } from 'node:path';
import { loadDocuments } from '../ingestion/load-documents.js';
import { parseCorpusText } from '../ingestion/parse-corpus-text.js';
import { loadEvalSet } from './load-eval-set.js';

// Checks the REAL eval set against the REAL corpus (files only: no database,
// no model), so a typo in a gold article fails CI instead of silently scoring 0.
const root = join(import.meta.dirname, '..', '..');

describe('eval/questions.jsonl', () => {
  it('is valid, with 30 answerable and 10 unanswerable questions', async () => {
    const set = await loadEvalSet(join(root, 'eval', 'questions.jsonl'));
    expect(set.filter((q) => q.answerable)).toHaveLength(30);
    expect(set.filter((q) => !q.answerable)).toHaveLength(10);
  });

  it('only uses gold articles that exist in the corpus', async () => {
    const set = await loadEvalSet(join(root, 'eval', 'questions.jsonl'));
    const docs = await loadDocuments(join(root, 'corpus'));
    const known = new Set(
      docs.flatMap((d) => parseCorpusText(d.text).map((a) => a.article)),
    );
    const unknown = set
      .flatMap((q) => q.goldArticles)
      .filter((a) => !known.has(a));
    expect(unknown).toEqual([]);
  });

  it('has the same number of casual and legal answerable questions', async () => {
    const answerable = (
      await loadEvalSet(join(root, 'eval', 'questions.jsonl'))
    ).filter((q) => q.answerable);
    const casual = answerable.filter((q) => q.wording === 'casual').length;
    expect(casual).toBe(answerable.length - casual);
  });
});
