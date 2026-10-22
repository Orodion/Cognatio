/**
 * Smallest and largest number of a list of any length. `Math.min(...values)` fails from about 125,000 values (too many
 * arguments for the stack), which a large family tree reaches; null for an empty list.
 */
export function lowest(values: Iterable<number>): number | null {
  let result: number | null = null;
  for (const value of values) {
    result = result === null || value < result ? value : result;
  }
  return result;
}

export function highest(values: Iterable<number>): number | null {
  let result: number | null = null;
  for (const value of values) {
    result = result === null || value > result ? value : result;
  }
  return result;
}
