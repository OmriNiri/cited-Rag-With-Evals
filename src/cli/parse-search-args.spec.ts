import { parseSearchArgs } from './parse-search-args.js';

describe('parseSearchArgs', () => {
  it('uses hybrid and the default k when only a question is given', () => {
    expect(parseSearchArgs(['notice period?'])).toEqual({
      question: 'notice period?',
      modes: ['hybrid'],
      k: 5,
      document: undefined,
    });
  });

  it('reads mode, k and document', () => {
    expect(
      parseSearchArgs([
        'q',
        '--mode',
        'keyword',
        '--k',
        '3',
        '--document',
        'law',
      ]),
    ).toEqual({ question: 'q', modes: ['keyword'], k: 3, document: 'law' });
  });

  it('expands --mode all into the three modes', () => {
    expect(parseSearchArgs(['q', '--mode', 'all']).modes).toEqual([
      'vector',
      'keyword',
      'hybrid',
    ]);
  });

  it('joins an unquoted multi-word question', () => {
    expect(parseSearchArgs(['notice', 'period']).question).toBe(
      'notice period',
    );
  });

  it('rejects a missing question, an unknown mode and a bad k', () => {
    expect(() => parseSearchArgs([])).toThrow('Missing question');
    expect(() => parseSearchArgs(['q', '--mode', 'magic'])).toThrow(
      'Unknown --mode',
    );
    expect(() => parseSearchArgs(['q', '--k', '0'])).toThrow(
      'positive integer',
    );
  });
});
