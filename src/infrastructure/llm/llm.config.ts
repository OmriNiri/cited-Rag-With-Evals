// LLM settings, validated only when the answering module starts (DECISIONS D22),
// so `npm run ingest` and `npm run search` work without a model server configured.

export interface LlmConfig {
  baseUrl: string; // OpenAI-compatible endpoint, e.g. http://localhost:11434/v1 (Ollama)
  apiKey?: string; // empty for Ollama; required by hosted providers
  model: string;
  timeoutMs: number;
}

const DEFAULT_TIMEOUT_MS = 60_000; // a local 7-8B model can need several seconds per answer

export function readLlmConfig(
  env: Record<string, string | undefined>,
): LlmConfig {
  const errors: string[] = [];

  const baseUrl = env.LLM_BASE_URL?.trim() ?? '';
  if (!/^https?:\/\//.test(baseUrl)) {
    errors.push('LLM_BASE_URL must be an http(s) URL (see .env.example)');
  }

  const model = env.LLM_MODEL?.trim() ?? '';
  if (model === '') errors.push('LLM_MODEL is required (see .env.example)');

  const timeoutMs = Number(env.LLM_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    errors.push(
      `LLM_TIMEOUT_MS must be a positive integer, got ${JSON.stringify(env.LLM_TIMEOUT_MS)}`,
    );
  }

  if (errors.length > 0) {
    throw new Error(`Invalid LLM configuration:\n- ${errors.join('\n- ')}`);
  }

  return {
    baseUrl: baseUrl.replace(/\/+$/, ''), // tolerate a trailing slash
    apiKey: env.LLM_API_KEY?.trim() || undefined,
    model,
    timeoutMs,
  };
}
