import { firstGoldRank, summarizeRanks } from './metrics.js';

describe('firstGoldRank', () => {
  it('returns the 1-based position of the first gold article', () => {
    expect(firstGoldRank(['Art. 1', 'Art. 2', 'Art. 3'], ['Art. 2'])).toBe(2);
  });

  it('counts any of several gold articles, whichever comes first', () => {
    expect(
      firstGoldRank(['Art. 1', 'Art. 3', 'Art. 2'], ['Art. 2', 'Art. 3']),
    ).toBe(2);
  });

  it('counts a second chunk of the same article as a hit (article level)', () => {
    expect(firstGoldRank(['Art. 1', 'Art. 2', 'Art. 2'], ['Art. 2'])).toBe(2);
  });

  it('returns null when no gold article was retrieved', () => {
    expect(firstGoldRank(['Art. 1'], ['Art. 2'])).toBeNull();
    expect(firstGoldRank([], ['Art. 2'])).toBeNull();
  });
});

describe('summarizeRanks', () => {
  it('computes hit@k and MRR (worked example from the doc comment)', () => {
    const s = summarizeRanks([1, 2, null], [1, 3]);
    expect(s.questions).toBe(3);
    expect(s.hitAt[1]).toBeCloseTo(1 / 3);
    expect(s.hitAt[3]).toBeCloseTo(2 / 3);
    expect(s.mrr).toBeCloseTo(0.5);
  });

  it('counts rank == k as a hit (top k includes position k)', () => {
    expect(summarizeRanks([5], [5]).hitAt[5]).toBe(1);
    expect(summarizeRanks([6], [5]).hitAt[5]).toBe(0);
  });

  it('MRR rewards finding the answer earlier', () => {
    expect(summarizeRanks([1], [5]).mrr).toBeGreaterThan(
      summarizeRanks([4], [5]).mrr,
    );
  });

  it('returns zeros (not NaN) for an empty group', () => {
    expect(summarizeRanks([], [1])).toEqual({
      questions: 0,
      hitAt: { 1: 0 },
      mrr: 0,
    });
  });
});
