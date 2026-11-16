// Turns fedlex HTML into a list of Article objects.
// Source structure (simplified):
//   <section id="part_2/tit_10/chap_1">           <- headings come from nested sections
//     <div class="heading"><a>F. Termination</a></div>
//     <article id="art_335_c">
//       <h6><b>Art. 335</b><i>c</i><sup>footnote</sup></h6>
//       <p class="absatz"><sup>1</sup> text</p>
//       <dl><dt>a.</dt><dd>text</dd></dl>         <- lettered list belongs to the paragraph above
//       <div class="footnotes">...</div>          <- legislative history, not law text: skipped

import { load, type CheerioAPI } from 'cheerio';
import type { Article, Paragraph } from './types.ts';
import { isRepealedPlaceholder, normalizeWhitespace } from './text-utils.ts';

export function parseArticles(html: string, sectionId: string): Article[] {
  const $ = load(html);

  // Footnote reference numbers (<sup><a href="#fn-...">) would pollute the text.
  $('sup:has(a[href^="#fn-"])').remove();
  $('div.footnotes').remove();

  // The id contains "/", so it is matched as an attribute instead of a #selector.
  const section = $(`section[id="${sectionId}"]`);
  if (section.length === 0) {
    throw new Error(`Section "${sectionId}" not found in the source HTML`);
  }

  return section
    .find('article')
    .toArray()
    .map((el) => parseArticle($, $(el)))
    .filter((article) => article.paragraphs.length > 0); // drop fully repealed articles
}

function parseArticle($: CheerioAPI, article: ReturnType<CheerioAPI>): Article {
  // "Art. 335" + "c" -> "Art. 335c"
  const number = normalizeWhitespace(article.find('h6').first().text()).replace(
    /(\d) ([a-z])$/,
    '$1$2',
  );

  const headingPath = article
    .parents('section')
    .toArray()
    .reverse() // parents() lists the closest section first; we want top-down
    .map((s) => normalizeWhitespace($(s).children('div.heading').text()))
    // Part/Title/Section levels use <h3>/<h4> instead of div.heading, so they
    // come out empty and drop here. What remains is "A. ..." > "I. ..." > "1. ...".
    .filter((heading) => heading.length > 0);

  return { number, headingPath, paragraphs: parseParagraphs($, article) };
}

function parseParagraphs(
  $: CheerioAPI,
  article: ReturnType<CheerioAPI>,
): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  article.find('div.collapseable > p, div.collapseable > dl').each((_, el) => {
    const node = $(el);

    if (el.tagName === 'dl') {
      // A list continues the paragraph right above it.
      const target = paragraphs.at(-1);
      if (!target) return;
      node.children('dt').each((i, dt) => {
        target.items.push({
          label: normalizeWhitespace($(dt).text()),
          text: normalizeWhitespace(node.children('dd').eq(i).text()),
        });
      });
      return;
    }

    const paragraphNumber = node.children('sup').first().text().trim() || null;
    node.children('sup').first().remove();
    const text = normalizeWhitespace(node.text());

    if (!isRepealedPlaceholder(text)) {
      paragraphs.push({ number: paragraphNumber, text, items: [] });
    }
  });

  return paragraphs;
}
