// Shared by unit tests: a predictable stand-in for the real tokenizer.
// 1 word = 1 token, so expected chunk sizes can be worked out by hand.
export const countWords = (text: string): number =>
  text.split(/\s+/).filter(Boolean).length;

/** "w1 w2 ... wn" — a text of exactly n words. */
export const words = (n: number, prefix = 'w'): string =>
  Array.from({ length: n }, (_, i) => `${prefix}${i + 1}`).join(' ');
