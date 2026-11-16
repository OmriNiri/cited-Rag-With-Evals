import { parseCorpusText } from './parse-corpus-text.js';

const corpus = [
  '# Title line',
  '',
  '## A. Definition > I. Definition',
  '',
  '### Art. 319',
  '1 First paragraph.',
  '2 Second paragraph:',
  '  a. first item;',
  '  b. second item.',
  '',
  '### Art. 320',
  'Single unnumbered paragraph.',
  '',
  '## B. Obligations',
  '',
  '### Art. 321a',
  '1 Text.',
].join('\n');

describe('parseCorpusText', () => {
  const articles = parseCorpusText(corpus);

  it('finds every article in order', () => {
    expect(articles.map((a) => a.article)).toEqual([
      'Art. 319',
      'Art. 320',
      'Art. 321a',
    ]);
  });

  it('carries the current section to all articles below it', () => {
    expect(articles.map((a) => a.section)).toEqual([
      'A. Definition > I. Definition',
      'A. Definition > I. Definition',
      'B. Obligations',
    ]);
  });

  it('keeps list items attached to their paragraph', () => {
    expect(articles[0].paragraphs).toEqual([
      '1 First paragraph.',
      '2 Second paragraph:\n  a. first item;\n  b. second item.',
    ]);
  });

  it('ignores the title line and blank lines', () => {
    expect(articles[1].paragraphs).toEqual(['Single unnumbered paragraph.']);
  });
});
