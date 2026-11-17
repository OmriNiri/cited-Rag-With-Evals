import type { SearchHit } from '../retrieval/search.types.js';
import type { ChatMessage } from './llm-client.js';
import { SYSTEM_PROMPT } from './system-prompt.js';

/**
 * Builds the chat messages for one question:
 *   system: the fixed rules
 *   user:   numbered passages [1]..[n], then the question last
 * Passage i in the prompt is hits[i - 1]; the same order is used to map the
 * model's passage numbers back to chunk ids.
 */
export function buildPrompt(
  question: string,
  hits: SearchHit[],
): ChatMessage[] {
  const passages = hits
    .map(
      (hit, i) =>
        // Heading context helps the model understand the passage; the quote must
        // still come from the law text below it (that is what gets validated).
        `[${i + 1}] ${hit.article} — ${hit.section}\n${hit.text}`,
    )
    .join('\n\n');

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      // The question comes after the passages and is clearly labelled, so it
      // cannot be mistaken for passage text.
      content: `Passages:\n\n${passages}\n\nQuestion: ${question.trim()}`,
    },
  ];
}
