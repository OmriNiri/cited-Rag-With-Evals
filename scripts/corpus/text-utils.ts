// Small text helpers shared by the parser.

/** Collapses all whitespace (incl. non-breaking spaces and newlines) to single spaces. */
export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * A paragraph that was repealed appears in the source as just "..." (its
 * history lives in a footnote). Such paragraphs carry no content.
 */
export function isRepealedPlaceholder(text: string): boolean {
  return /^[.…\s]*$/.test(text);
}
