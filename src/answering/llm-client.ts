// What answering needs from a language model — nothing about Ollama, HTTP or vendors.
// Implemented in src/infrastructure/llm/ (DECISIONS D4, D10). Unit tests use fakes.

export interface ChatMessage {
  role: 'system' | 'user';
  content: string;
}

export interface LlmRequest {
  messages: ChatMessage[];
  /** JSON Schema the reply must follow; servers that support it enforce it while generating. */
  jsonSchema: Record<string, unknown>;
}

export interface LlmClient {
  /** Model name, reported in responses and eval results. */
  readonly model: string;
  /** Returns the model's raw reply text (expected to be JSON). Parsing happens elsewhere. */
  complete(request: LlmRequest): Promise<string>;
}

export const LLM_CLIENT = Symbol('LLM_CLIENT');
