// Turns parsed articles into the plain-text corpus file.
// Format is Markdown-like on purpose: "##" = heading path, "###" = article.
// The Phase 1 chunker splits on "### Art." and keeps the "##" line as the section.

import type { Article } from './types.ts';

export function renderCorpus(title: string, articles: Article[]): string {
  const lines: string[] = [`# ${title}`, ''];
  let previousPath = '';

  for (const article of articles) {
    const path = article.headingPath.join(' > ');
    // Only print the heading when it changes, so consecutive articles share it.
    if (path !== previousPath) {
      lines.push(`## ${path}`, '');
      previousPath = path;
    }

    lines.push(`### ${article.number}`);
    for (const paragraph of article.paragraphs) {
      const prefix = paragraph.number ? `${paragraph.number} ` : '';
      lines.push(`${prefix}${paragraph.text}`);
      for (const item of paragraph.items) {
        lines.push(`  ${item.label} ${item.text}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}
