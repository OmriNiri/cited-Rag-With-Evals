import type { AnswerRow } from '../answer-eval.js';
import { compareVerdicts } from './agreement.js';
import { buildJudgeSheet, parseJudgeSheet } from './judge-sheet.js';
import { pickSpread } from './pick-spread.js';

describe('pickSpread', () => {
  it('spreads evenly and includes first and last', () => {
    expect(pickSpread([1, 2, 3, 4, 5, 6, 7, 8, 9], 3)).toEqual([1, 5, 9]);
  });

  it('returns everything when asking for more than there is', () => {
    expect(pickSpread([1, 2], 5)).toEqual([1, 2]);
  });

  it('never repeats an item', () => {
    const picked = pickSpread(
      Array.from({ length: 29 }, (_, i) => i),
      15,
    );
    expect(new Set(picked).size).toBe(15);
  });
});

const row: AnswerRow = {
  id: 'q01',
  answerable: true,
  wording: 'legal',
  goldArticles: ['Art. 335c'],
  outcome: 'answered',
  answer: 'One month.',
  citations: [
    {
      passage: 1,
      chunkId: 'c',
      article: 'Art. 335c',
      quote: 'at one month’s notice',
      valid: true,
    },
    {
      passage: 2,
      chunkId: 'd',
      article: 'Art. 9',
      quote: 'made up',
      valid: false,
      invalidReason: 'not_found',
    },
  ],
  seconds: 1,
  judge: { verdict: 'supported', reason: 'SECRET-REASON' },
};

describe('buildJudgeSheet', () => {
  const sheet = buildJudgeSheet(
    [row],
    new Map([['q01', 'What is the notice?']]),
  );

  it('shows question, answer and valid quotes with an empty verdict line', () => {
    expect(sheet).toContain('## q01');
    expect(sheet).toContain('**Question:** What is the notice?');
    expect(sheet).toContain('1. (Art. 335c) "at one month’s notice"');
    expect(sheet).toContain('Your verdict: \n');
  });

  it('is blind: no judge verdict or reason, no invalid quote, no gold article label', () => {
    expect(sheet).not.toContain('SECRET-REASON');
    expect(sheet).not.toContain('made up');
    expect(sheet).not.toContain('gold');
  });

  it('round-trips: an untouched sheet parses to empty labels', () => {
    expect(parseJudgeSheet(sheet)).toEqual(new Map([['q01', null]]));
  });
});

describe('parseJudgeSheet', () => {
  it('reads one verdict per question, case-insensitive', () => {
    const labels = parseJudgeSheet(
      '## q01\nYour verdict: Partial\n## q02\nYour verdict: supported\n',
    );
    expect([...labels]).toEqual([
      ['q01', 'partial'],
      ['q02', 'supported'],
    ]);
  });

  it('rejects a typo instead of silently ignoring it', () => {
    expect(() => parseJudgeSheet('## q01\nYour verdict: suported\n')).toThrow(
      'q01: "suported"',
    );
  });
});

describe('compareVerdicts', () => {
  it('computes agreement and Cohen’s kappa (hand-worked example)', () => {
    // 4 items, 3 agree -> observed 0.75.
    // human: S S P U   judge: S S S U
    // expected = P(S)h*P(S)j + P(P)h*P(P)j + P(U)h*P(U)j = .5*.75 + .25*0 + .25*.25 = 0.4375
    // kappa = (0.75 - 0.4375) / (1 - 0.4375) = 0.5555...
    const result = compareVerdicts([
      { id: 'a', human: 'supported', judge: 'supported' },
      { id: 'b', human: 'supported', judge: 'supported' },
      { id: 'c', human: 'partial', judge: 'supported' },
      { id: 'd', human: 'unsupported', judge: 'unsupported' },
    ]);
    expect(result.agree).toBe(3);
    expect(result.kappa).toBeCloseTo(0.5556, 4);
    expect(result.lenient).toEqual(['c']);
    expect(result.strict).toEqual([]);
    expect(result.confusion.partial.supported).toBe(1);
  });

  it('marks a judge that is harsher than the human as strict', () => {
    const result = compareVerdicts([
      { id: 'x', human: 'supported', judge: 'unsupported' },
    ]);
    expect(result.strict).toEqual(['x']);
  });

  it('kappa is 1 for perfect agreement even when only one verdict is used', () => {
    expect(
      compareVerdicts([{ id: 'a', human: 'partial', judge: 'partial' }]).kappa,
    ).toBe(1);
  });
});
