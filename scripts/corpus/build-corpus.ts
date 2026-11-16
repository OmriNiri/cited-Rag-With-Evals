// Entry point: download -> parse -> render -> write.
// Run with: npm run corpus:build
// Each step lives in its own file; this file only connects them.

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import {
  DOCUMENT_TITLE,
  OUTPUT_PATH,
  SECTION_ID,
  SOURCE_URL,
  VERSION_DATE,
} from './config.ts';
import { downloadHtml } from './download.ts';
import { parseArticles } from './parse-articles.ts';
import { renderCorpus } from './render-text.ts';

console.log(`Downloading Code of Obligations (version ${VERSION_DATE})...`);
const html = await downloadHtml(SOURCE_URL);

const articles = parseArticles(html, SECTION_ID);
const text = renderCorpus(DOCUMENT_TITLE, articles);

await mkdir(dirname(OUTPUT_PATH), { recursive: true });
await writeFile(OUTPUT_PATH, text, 'utf8');

const words = text.split(/\s+/).length;
console.log(
  `Wrote ${OUTPUT_PATH}: ${articles.length} articles, ${words} words ` +
    `(${articles[0]?.number} – ${articles.at(-1)?.number})`,
);
