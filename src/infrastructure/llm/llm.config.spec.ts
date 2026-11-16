import { readLlmConfig } from './llm.config.js';

describe('readLlmConfig', () => {
  const valid = {
    LLM_BASE_URL: 'http://localhost:11434/v1/',
    LLM_MODEL: 'some-model',
  };

  it('accepts a valid config, trims the trailing slash and applies defaults', () => {
    expect(readLlmConfig(valid)).toEqual({
      baseUrl: 'http://localhost:11434/v1',
      apiKey: undefined,
      model: 'some-model',
      timeoutMs: 60_000,
    });
  });

  it('treats an empty API key as "no key" (Ollama)', () => {
    expect(
      readLlmConfig({ ...valid, LLM_API_KEY: '  ' }).apiKey,
    ).toBeUndefined();
  });

  it('reports every problem at once', () => {
    expect(() =>
      readLlmConfig({ LLM_BASE_URL: 'localhost', LLM_TIMEOUT_MS: '-5' }),
    ).toThrow(/LLM_BASE_URL[\s\S]*LLM_MODEL[\s\S]*LLM_TIMEOUT_MS/);
  });
});
