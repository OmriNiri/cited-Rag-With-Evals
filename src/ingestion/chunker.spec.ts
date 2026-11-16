import type { ParsedArticle } from './chunk.types.js';
import { chunkDocument, type ChunkerOptions } from './chunker.js';
import { buildEmbeddingText } from './embedding-text.js';
import { countWords, words } from '../../test/helpers/fake-tokenizer.js';

// Section "S" + article "Art. 1" = 3 words of heading, so the text budget is maxTokens - 3.
const article = (paragraphs: string[], name = 'Art. 1'): ParsedArticle => ({
  section: 'S',
  article: name,
  paragraphs,
});

const options: ChunkerOptions = {
  maxTokens: 23, // -> 20 words of law text per chunk
  maxOverlapTokens: 5,
  countTokens: countWords,
};

describe('chunkDocument', () => {
  it('keeps a short article as exactly one chunk, with its metadata', () => {
    const chunks = chunkDocument('doc', [article(['1 short text'])], options);

    expect(chunks).toEqual([
      {
        id: 'doc:art-1:0',
        document: 'doc',
        section: 'S',
        article: 'Art. 1',
        position: 0,
        text: '1 short text',
      },
    ]);
  });

  it('never merges two articles into one chunk (structure first)', () => {
    const chunks = chunkDocument(
      'doc',
      [article([words(3)], 'Art. 1'), article([words(3)], 'Art. 2')],
      options,
    );
    expect(chunks.map((c) => c.id)).toEqual(['doc:art-1:0', 'doc:art-2:0']);
  });

  it('numbers positions across the whole document', () => {
    const chunks = chunkDocument(
      'doc',
      [
        article([words(12, 'a'), words(12, 'b')], 'Art. 1'),
        article([words(2)], 'Art. 2'),
      ],
      options,
    );
    expect(chunks.map((c) => c.position)).toEqual([0, 1, 2]);
  });

  it('splits a long article at paragraph boundaries, every chunk within the limit', () => {
    const paragraphs = [words(12, 'a'), words(12, 'b'), words(12, 'c')];
    const chunks = chunkDocument('doc', [article(paragraphs)], options);

    expect(chunks.map((c) => c.text)).toEqual(paragraphs);
    expect(chunks.map((c) => c.id)).toEqual([
      'doc:art-1:0',
      'doc:art-1:1',
      'doc:art-1:2',
    ]);
    for (const chunk of chunks) {
      expect(countWords(buildEmbeddingText(chunk))).toBeLessThanOrEqual(
        options.maxTokens,
      );
    }
  });

  it('repeats a short previous paragraph at the start of the next chunk (overlap)', () => {
    const intro = words(4, 'intro'); // short enough to be overlap (<= 5)
    const chunks = chunkDocument(
      'doc',
      [article([words(14, 'a'), intro, words(14, 'b')])],
      options,
    );

    expect(chunks.map((c) => c.text)).toEqual([
      `${words(14, 'a')}\n${intro}`,
      `${intro}\n${words(14, 'b')}`,
    ]);
  });

  it('does not overlap when the previous paragraph is too long', () => {
    const chunks = chunkDocument(
      'doc',
      [article([words(12, 'a'), words(12, 'b')])],
      options,
    );
    expect(chunks[1].text).toBe(words(12, 'b'));
  });

  it('loses no text: every paragraph appears in some chunk', () => {
    const paragraphs = [
      words(15, 'a'),
      words(30, 'b'),
      words(3, 'c'),
      words(18, 'd'),
    ];
    const allText = chunkDocument('doc', [article(paragraphs)], options)
      .map((c) => c.text)
      .join('\n');

    for (const w of paragraphs.join(' ').split(' ')) {
      expect(allText).toContain(w);
    }
  });

  it('is deterministic', () => {
    const input = [article([words(12, 'a'), words(12, 'b')])];
    expect(chunkDocument('doc', input, options)).toEqual(
      chunkDocument('doc', input, options),
    );
  });
});
