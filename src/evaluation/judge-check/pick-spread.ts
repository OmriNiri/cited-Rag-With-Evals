/**
 * Picks `count` items spread evenly over the list (first and last included),
 * e.g. 15 of 29 answered questions. Deterministic and not chosen by a person, so
 * the sample is not biased towards cases someone found interesting.
 */
export function pickSpread<T>(items: T[], count: number): T[] {
  if (count >= items.length) return [...items];
  if (count <= 0) return [];
  if (count === 1) return [items[0]];
  return Array.from(
    { length: count },
    (_, i) => items[Math.round((i * (items.length - 1)) / (count - 1))],
  );
}
