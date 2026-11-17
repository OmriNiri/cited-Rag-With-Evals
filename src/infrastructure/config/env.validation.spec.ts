import { validateEnv } from './env.validation.js';

describe('validateEnv', () => {
  const valid = { DATABASE_URL: 'postgres://u:p@localhost:5432/db' };

  it('accepts a valid config and defaults PORT to 3000', () => {
    expect(validateEnv(valid)).toEqual({
      DATABASE_URL: valid.DATABASE_URL,
      PORT: 3000,
    });
  });

  it('passes other variables through unchanged (validated where they are used)', () => {
    expect(validateEnv({ ...valid, LLM_MODEL: 'm' }).LLM_MODEL).toBe('m');
  });

  it('converts PORT from string to number', () => {
    expect(validateEnv({ ...valid, PORT: '8080' }).PORT).toBe(8080);
  });

  it('rejects a missing DATABASE_URL', () => {
    expect(() => validateEnv({})).toThrow('DATABASE_URL is required');
  });

  it('rejects an invalid PORT', () => {
    expect(() => validateEnv({ ...valid, PORT: 'abc' })).toThrow(
      'PORT must be an integer',
    );
  });

  it('reports every problem at once, not just the first', () => {
    expect(() => validateEnv({ PORT: '0' })).toThrow(
      /DATABASE_URL is required[\s\S]*PORT must be an integer/,
    );
  });
});
