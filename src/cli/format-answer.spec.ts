import { formatAnswer } from './format-answer.js';

describe('formatAnswer', () => {
  it('shows the answer and each citation with its chunk id', () => {
    const text = formatAnswer({
      refused: false,
      answer: 'One month.',
      citations: [
        {
          passage: 2,
          chunkId: 'co:art-335c:0',
          article: 'Art. 335c',
          quote: 'at one month’s notice',
          valid: true,
        },
      ],
    });
    expect(text).toContain('ANSWER\n  One month.');
    expect(text).toContain('✓  [2] Art. 335c  co:art-335c:0');
    expect(text).toContain('"at one month’s notice"');
  });

  it('explains a refusal in plain language and keeps rejected quotes visible', () => {
    const text = formatAnswer({
      refused: true,
      refusalReason: 'no_valid_citation',
      answer: '',
      citations: [
        {
          passage: 7,
          chunkId: null,
          article: null,
          quote: 'invented words here',
          valid: false,
          invalidReason: 'unknown_passage',
        },
      ],
    });
    expect(text).toContain('REFUSED: the model answered, but none');
    expect(text).toContain('✗ unknown_passage  [7] ?');
  });

  it('prints no citation block when there are none', () => {
    const text = formatAnswer({
      refused: true,
      refusalReason: 'low_retrieval_score',
      answer: '',
      citations: [],
    });
    expect(text).not.toContain('CITATIONS');
  });
});
