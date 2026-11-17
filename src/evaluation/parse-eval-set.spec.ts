import { parseEvalSet } from './parse-eval-set.js';

const line = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    id: 'q01',
    question: 'What is the notice period?',
    answerable: true,
    goldArticles: ['Art. 335c'],
    wording: 'legal',
    ...overrides,
  });

describe('parseEvalSet', () => {
  it('parses valid lines and skips blank ones', () => {
    const set = parseEvalSet(
      `${line()}\n\n${line({ id: 'q02', answerable: false, goldArticles: [], note: 'out of domain' })}\n`,
    );
    expect(set).toHaveLength(2);
    expect(set[0]).toEqual({
      id: 'q01',
      question: 'What is the notice period?',
      answerable: true,
      goldArticles: ['Art. 335c'],
      wording: 'legal',
    });
    expect(set[1].note).toBe('out of domain');
  });

  it('accepts article numbers with letter suffixes like 329gbis', () => {
    expect(
      parseEvalSet(line({ goldArticles: ['Art. 329gbis'] }))[0].goldArticles,
    ).toEqual(['Art. 329gbis']);
  });

  it.each([
    ['broken JSON', '{"id":', 'not valid JSON'],
    ['duplicate id', `${line()}\n${line()}`, 'duplicate id "q01"'],
    ['empty question', line({ question: ' ' }), '"question" must be'],
    ['gold article typo', line({ goldArticles: ['335c'] }), '"goldArticles"'],
    [
      'answerable without gold',
      line({ goldArticles: [] }),
      'answerable questions need gold articles',
    ],
    [
      'unanswerable with gold',
      line({ answerable: false }),
      'answerable questions need gold articles',
    ],
    ['unknown wording', line({ wording: 'formal' }), '"wording" must be'],
  ])('rejects %s', (_, text, message) => {
    expect(() => parseEvalSet(text)).toThrow(message);
  });

  it('reports every problem with its line number, not just the first', () => {
    expect(() =>
      parseEvalSet(
        `${line({ wording: 'x' })}\n${line({ id: 'q02', question: '' })}`,
      ),
    ).toThrow(/line 1: q01: "wording"[\s\S]*line 2: q02: "question"/);
  });
});
