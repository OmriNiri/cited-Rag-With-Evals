import type { Chunk, EmbeddedChunk } from './chunk.types.js';
import type { Embedder } from './embedder.js';
import { buildEmbeddingText } from './embedding-text.js';

// Texts per model call. Batching is much faster than one text at a time, while
// keeping memory bounded no matter how big the corpus gets.
const BATCH_SIZE = 32;

/** Attaches an embedding to every chunk, computed from its contextual text. */
export async function embedChunks(
  chunks: Chunk[],
  embedder: Embedder,
): Promise<EmbeddedChunk[]> {
  const result: EmbeddedChunk[] = [];

  for (let start = 0; start < chunks.length; start += BATCH_SIZE) {
    const batch = chunks.slice(start, start + BATCH_SIZE);
    const vectors = await embedder.embed(batch.map(buildEmbeddingText));
    batch.forEach((chunk, i) =>
      result.push({ ...chunk, embedding: vectors[i] }),
    );
  }

  return result;
}
