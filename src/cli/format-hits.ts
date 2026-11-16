import type { SearchHit } from '../retrieval/search.types.js';

const SNIPPET_LENGTH = 110;

/** Readable terminal output for one retriever's results. Pure: returns text, prints nothing. */
export function formatHits(mode: string, hits: SearchHit[]): string {
  const lines = [`\n=== ${mode.toUpperCase()} (${hits.length} hits) ===`];

  hits.forEach((hit, i) => {
    // Show only the last heading level: the full path is long and the article identifies the place.
    const heading = hit.section.split(' > ').at(-1);
    const text = hit.text.replace(/\s+/g, ' ');
    const snippet =
      text.length > SNIPPET_LENGTH ? `${text.slice(0, SNIPPET_LENGTH)}…` : text;

    lines.push(
      `${String(i + 1).padStart(2)}. ${hit.score.toFixed(4)}  ${hit.article}  [${hit.id}]`,
      `      ${heading}`,
      `      ${snippet}`,
    );
  });

  return lines.join('\n');
}
