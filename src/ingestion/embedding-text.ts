// What the embedding model actually sees for a chunk (DECISIONS D13).
// The heading path and article number are added as context so that, e.g., a chunk
// under "Notice periods > c. After the probation period" is found by a question
// about probation even if its text never says "probation".
// The stored chunk text stays the bare law text, because citations are checked against it.

export function buildEmbeddingText(chunk: {
  section: string;
  article: string;
  text: string;
}): string {
  return `${chunk.section}\n${chunk.article}\n${chunk.text}`;
}
