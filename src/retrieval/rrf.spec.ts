import { reciprocalRankFusion, RRF_K } from './rrf.js';

const ids = (results: { id: string }[]) => results.map((r) => r.id);

describe('reciprocalRankFusion', () => {
  it('computes 1/(k + rank) per list and adds them up', () => {
    const [top, second] = reciprocalRankFusion([['a', 'b']]);

    expect(top).toEqual({ id: 'a', score: 1 / (RRF_K + 1) });
    expect(second).toEqual({ id: 'b', score: 1 / (RRF_K + 2) });
  });

  it('keeps the order of a single list', () => {
    expect(ids(reciprocalRankFusion([['c', 'a', 'b']]))).toEqual([
      'c',
      'a',
      'b',
    ]);
  });

  it('ranks an item found by both lists above items found by only one', () => {
    // "y" is only 2nd in each list, but both retrievers agree on it.
    const vector = ['x', 'y'];
    const keyword = ['z', 'y'];

    const fused = reciprocalRankFusion([vector, keyword]);

    expect(fused[0]).toEqual({ id: 'y', score: 2 / (RRF_K + 2) });
    expect(ids(fused)).toEqual(['y', 'x', 'z']);
  });

  it('includes items that appear in only one list (union, not intersection)', () => {
    expect(ids(reciprocalRankFusion([['a'], ['b']])).sort()).toEqual([
      'a',
      'b',
    ]);
  });

  it('lets k control how much agreement outweighs a single #1', () => {
    // "solo" is #1 in one list only; "both" is #4 in two lists.
    const lists = [
      ['solo', 'p', 'q', 'both'],
      ['r', 's', 't', 'both'],
    ];

    const position = (k: number, id: string) =>
      ids(reciprocalRankFusion(lists, k)).indexOf(id);

    // Small k: being #1 dominates (1/2 = 0.5 vs 2/5 = 0.4).
    expect(position(1, 'solo')).toBeLessThan(position(1, 'both'));
    // Standard k=60: agreement wins (2/64 ≈ 0.031 vs 1/61 ≈ 0.016).
    expect(position(60, 'both')).toBeLessThan(position(60, 'solo'));
  });

  it('breaks ties deterministically by id', () => {
    // a and b are both #1 in one list each -> equal scores.
    expect(ids(reciprocalRankFusion([['b'], ['a']]))).toEqual(['a', 'b']);
  });

  it('returns an empty list when there is nothing to fuse', () => {
    expect(reciprocalRankFusion([])).toEqual([]);
    expect(reciprocalRankFusion([[], []])).toEqual([]);
  });
});
