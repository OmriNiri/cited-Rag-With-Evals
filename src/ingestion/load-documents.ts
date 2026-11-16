import { readdir, readFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import type { SourceDocument } from './chunk.types.js';

/**
 * Reads every .txt file in the corpus folder.
 * Only .txt: corpus/SOURCES.md is documentation about the corpus, not corpus text.
 * Sorted by name so the order (and therefore chunk positions) is always the same.
 */
export async function loadDocuments(dir: string): Promise<SourceDocument[]> {
  const files = (await readdir(dir))
    .filter((f) => extname(f) === '.txt')
    .sort();

  return Promise.all(
    files.map(async (file) => ({
      name: basename(file, '.txt'),
      text: await readFile(join(dir, file), 'utf8'),
    })),
  );
}
