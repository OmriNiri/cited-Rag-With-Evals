import type { ParsedArticle } from './chunk.types.js';

/**
 * Splits corpus text into articles, using the structure written by the corpus script:
 *   "## <heading path>"  sets the section for all following articles
 *   "### Art. <n>"       starts a new article
 *   unindented line      starts a new paragraph
 *   indented line        list item, belongs to the paragraph above
 * The "# " title line and blank lines carry no content and are skipped.
 */
export function parseCorpusText(text: string): ParsedArticle[] {
  const articles: ParsedArticle[] = [];
  let section = '';
  let current: ParsedArticle | null = null;

  for (const line of text.split('\n')) {
    if (line.startsWith('### ')) {
      current = { section, article: line.slice(4).trim(), paragraphs: [] };
      articles.push(current);
    } else if (line.startsWith('## ')) {
      section = line.slice(3).trim();
      current = null; // a new heading always comes before a new article
    } else if (current && line.trim() !== '') {
      const isListItem = /^\s/.test(line);
      if (isListItem && current.paragraphs.length > 0) {
        current.paragraphs[current.paragraphs.length - 1] += `\n${line}`;
      } else {
        current.paragraphs.push(line);
      }
    }
  }

  return articles.filter((a) => a.paragraphs.length > 0);
}
