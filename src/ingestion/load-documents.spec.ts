import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadDocuments } from './load-documents.js';

describe('loadDocuments', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'corpus-'));
    await writeFile(join(dir, 'b-doc.txt'), 'B text');
    await writeFile(join(dir, 'a-doc.txt'), 'A text');
    await writeFile(join(dir, 'SOURCES.md'), 'not corpus text');
  });

  afterEach(async () => {
    await rm(dir, { recursive: true });
  });

  it('reads only .txt files, sorted by name, without the extension', async () => {
    expect(await loadDocuments(dir)).toEqual([
      { name: 'a-doc', text: 'A text' },
      { name: 'b-doc', text: 'B text' },
    ]);
  });
});
