import { fakeHit } from '../../test/helpers/fake-retrieval.js';
import { validateCitations } from './validate-citations.js';

// Real wording from Art. 335c, incl. the typographic apostrophe used in the corpus.
const hits = [
  {
    ...fakeHit('co:art-335c:0'),
    article: 'Art. 335c',
    text:
      '1 The employment relationship may be terminated at one month’s notice during the first year of service,\n' +
      '2 These notice periods may be varied by written individual, standard or collective employment contract;',
  },
  { ...fakeHit('co:art-336c:0'), article: 'Art. 336c', text: 'Other text.' },
];

const check = (passage: number, quote: string) =>
  validateCitations([{ passage, quote }], hits)[0];

describe('validateCitations', () => {
  it('accepts an exact quote and maps the passage number to the chunk id', () => {
    expect(check(1, 'may be terminated at one month’s notice')).toEqual({
      passage: 1,
      chunkId: 'co:art-335c:0',
      article: 'Art. 335c',
      quote: 'may be terminated at one month’s notice',
      valid: true,
    });
  });

  it("treats a plain ' like the typographic ’ (same word, different character)", () => {
    expect(check(1, "at one month's notice during").valid).toBe(true);
  });

  it('ignores differences in whitespace, incl. a line break between paragraphs', () => {
    expect(
      check(1, 'during the first year of service, 2 These notice periods')
        .valid,
    ).toBe(true);
  });

  it('ignores a trailing full stop the model added', () => {
    expect(check(1, 'may be terminated at one month’s notice.').valid).toBe(
      true,
    );
  });

  it('rejects a paraphrase, even a close one', () => {
    expect(check(1, 'can be terminated with one month’s notice')).toMatchObject(
      {
        valid: false,
        invalidReason: 'not_found',
      },
    );
  });

  it('rejects a quote with different capitalisation', () => {
    expect(check(1, 'May be terminated at one month’s notice').valid).toBe(
      false,
    );
  });

  it('rejects a real quote attributed to the wrong passage', () => {
    expect(check(2, 'may be terminated at one month’s notice')).toMatchObject({
      valid: false,
      invalidReason: 'not_found',
      chunkId: 'co:art-336c:0',
    });
  });

  it('rejects passage numbers that were never shown (0, too high)', () => {
    for (const passage of [0, 3]) {
      expect(
        check(passage, 'may be terminated at one month’s notice'),
      ).toMatchObject({
        valid: false,
        invalidReason: 'unknown_passage',
        chunkId: null,
      });
    }
  });

  it('rejects quotes under 4 words, even if they are in the text', () => {
    expect(check(1, 'may be terminated')).toMatchObject({
      valid: false,
      invalidReason: 'too_short',
    });
  });

  it('validates each citation independently and keeps them all', () => {
    const result = validateCitations(
      [
        { passage: 1, quote: 'may be terminated at one month’s notice' },
        { passage: 1, quote: 'invented text that is not there' },
      ],
      hits,
    );
    expect(result.map((c) => c.valid)).toEqual([true, false]);
  });
});
