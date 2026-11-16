/**
 * Deterministic, readable chunk id: "<document>:<article slug>:<part>".
 * e.g. ("co-individual-employment-contract", "Art. 335c", 0)
 *   -> "co-individual-employment-contract:art-335c:0"
 * Same input always gives the same id, so re-ingestion and eval gold
 * references stay stable.
 */
export function chunkId(
  document: string,
  article: string,
  part: number,
): string {
  const slug = article
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // "art. 335c" -> "art-335c"
    .replace(/^-+|-+$/g, '');
  return `${document}:${slug}:${part}`;
}
