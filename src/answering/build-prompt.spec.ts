import { fakeHit } from '../../test/helpers/fake-retrieval.js';
import { buildPrompt } from './build-prompt.js';
import { SYSTEM_PROMPT } from './system-prompt.js';

describe('buildPrompt', () => {
  const hits = [
    {
      ...fakeHit('c1'),
      article: 'Art. 335c',
      section: 'Notice periods',
      text: 'Law text one.',
    },
    {
      ...fakeHit('c2'),
      article: 'Art. 336c',
      section: 'Inopportune time',
      text: 'Law text two.',
    },
  ];
  const [system, user] = buildPrompt('  How long is the notice?  ', hits);

  it('sends the fixed rules as the system message', () => {
    expect(system).toEqual({ role: 'system', content: SYSTEM_PROMPT });
  });

  it('numbers the passages from 1 in retrieval order, with article and heading', () => {
    expect(user.content).toContain(
      '[1] Art. 335c — Notice periods\nLaw text one.',
    );
    expect(user.content).toContain(
      '[2] Art. 336c — Inopportune time\nLaw text two.',
    );
    expect(user.content.indexOf('[1]')).toBeLessThan(
      user.content.indexOf('[2]'),
    );
  });

  it('puts the trimmed question last, after all passages', () => {
    expect(user.content.endsWith('Question: How long is the notice?')).toBe(
      true,
    );
  });

  it('states the rules the code relies on', () => {
    expect(SYSTEM_PROMPT).toMatch(/ONLY the numbered passages/);
    expect(SYSTEM_PROMPT).toMatch(/word for word/);
    expect(SYSTEM_PROMPT).toMatch(/"refused" to true/);
  });
});
