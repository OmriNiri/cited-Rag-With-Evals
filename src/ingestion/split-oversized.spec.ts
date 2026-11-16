import { splitOversized } from './split-oversized.js';
import { countWords, words } from '../../test/helpers/fake-tokenizer.js';

describe('splitOversized', () => {
  it('returns text that fits unchanged', () => {
    expect(splitOversized(words(5), 10, countWords)).toEqual([words(5)]);
  });

  it('splits on lines first', () => {
    const text = `${words(6, 'a')}\n${words(6, 'b')}`;
    expect(splitOversized(text, 10, countWords)).toEqual([
      words(6, 'a'),
      words(6, 'b'),
    ]);
  });

  it('then splits on sentence ends, keeping the punctuation', () => {
    const text = `${words(6, 'a')}. ${words(6, 'b')}; ${words(3, 'c')}`;
    expect(splitOversized(text, 10, countWords)).toEqual([
      `${words(6, 'a')}.`,
      `${words(6, 'b')};`,
      words(3, 'c'),
    ]);
  });

  it('keeps a single over-long sentence whole rather than cutting it', () => {
    expect(splitOversized(words(15), 10, countWords)).toEqual([words(15)]);
  });
});
