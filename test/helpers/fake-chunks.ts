import type { EmbeddedChunk } from '../../src/ingestion/chunk.types.js';

/**
 * A minimal valid chunk for repository tests. Override only what a test cares
 * about (e.g. text or embedding); everything else gets a harmless default.
 */
export function fakeChunk(
  document: string,
  position: number,
  overrides: Partial<EmbeddedChunk> = {},
): EmbeddedChunk {
  return {
    id: `${document}:art-${position}:0`,
    document,
    section: 'S',
    article: `Art. ${position}`,
    position,
    text: `text ${position}`,
    embedding: Array.from({ length: 384 }, () => 0.1),
    ...overrides,
  };
}

/**
 * A 384-dim vector pointing mostly along one axis, so tests know exactly
 * which vectors are close: axis(0) is near axis(0) and orthogonal to axis(1).
 */
export function axis(index: number, weight = 1): number[] {
  return Array.from({ length: 384 }, (_, i) => (i === index ? weight : 0));
}
