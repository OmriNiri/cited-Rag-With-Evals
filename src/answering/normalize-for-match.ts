/**
 * Prepares text for the verbatim check. Only differences that do not change a
 * single word are removed (DECISIONS D24):
 *   - typographic vs plain characters: ’ ‘ -> '   “ ” -> "   – — -> -
 *   - any run of whitespace (incl. line breaks) -> one space
 *   - leading/trailing spaces and a trailing . , ; : (models often add or drop one)
 * Case is NOT changed: a different capital letter means it was not copied exactly.
 */
export function normalizeForMatch(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.,;:]+$/, '');
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}
