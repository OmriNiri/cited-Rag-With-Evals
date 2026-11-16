import type { EmbeddedChunk } from '../../src/ingestion/chunk.types.js';

/** A minimal valid chunk for repository tests; the vector content does not matter there. */
export function fakeChunk(document: string, position: number): EmbeddedChunk {
  return {
    id: `${document}:art-${position}:0`,
    document,
    section: 'S',
    article: `Art. ${position}`,
    position,
    text: `text ${position}`,
    embedding: Array.from({ length: 384 }, () => 0.1),
  };
}
