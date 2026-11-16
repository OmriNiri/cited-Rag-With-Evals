import type { Chunk, CountTokens, ParsedArticle } from './chunk.types.js';
import { chunkId } from './chunk-id.js';
import { buildEmbeddingText } from './embedding-text.js';
import { splitOversized } from './split-oversized.js';

export interface ChunkerOptions {
  maxTokens: number; // limit for the full embedding input (heading + article + text)
  maxOverlapTokens: number;
  countTokens: CountTokens;
}

/**
 * Turns a document's articles into chunks.
 * Structure first: one article = one chunk whenever it fits.
 * Size second: a long article is split at paragraph boundaries, and each new
 * piece starts with the previous paragraph if it is short (overlap).
 * Pure function: same input -> same chunks, no I/O.
 */
export function chunkDocument(
  document: string,
  articles: ParsedArticle[],
  options: ChunkerOptions,
): Chunk[] {
  const chunks: Chunk[] = [];

  for (const article of articles) {
    for (const [part, text] of chunkArticle(article, options).entries()) {
      chunks.push({
        id: chunkId(document, article.article, part),
        document,
        section: article.section,
        article: article.article,
        position: chunks.length,
        text,
      });
    }
  }

  return chunks;
}

/** Returns the text of each chunk for one article. */
function chunkArticle(
  article: ParsedArticle,
  options: ChunkerOptions,
): string[] {
  const { countTokens, maxOverlapTokens } = options;

  // Tokens left for law text once the heading and article number are added.
  const textBudget =
    options.maxTokens -
    countTokens(buildEmbeddingText({ ...article, text: '' }));

  const whole = article.paragraphs.join('\n');
  if (countTokens(whole) <= textBudget) return [whole];

  const units = article.paragraphs.flatMap((p) =>
    splitOversized(p, textBudget, countTokens),
  );

  const result: string[] = [];
  let current: string[] = [];

  for (const unit of units) {
    if (
      current.length > 0 &&
      countTokens([...current, unit].join('\n')) > textBudget
    ) {
      result.push(current.join('\n'));
      const previous = current[current.length - 1];
      const withOverlap = [previous, unit].join('\n');
      // Overlap only if the previous unit is short AND both still fit together.
      current =
        countTokens(previous) <= maxOverlapTokens &&
        countTokens(withOverlap) <= textBudget
          ? [previous, unit]
          : [unit];
    } else {
      current.push(unit);
    }
  }
  if (current.length > 0) result.push(current.join('\n'));

  return result;
}
