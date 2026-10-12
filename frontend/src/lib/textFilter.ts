/**
 * Full-text filter of the lists in the person page: case and accent insensitive, every word of the query has to occur
 * (in any of the given texts).
 */

interface Folded {
  text: string;
  /** For every character of `text` where it starts and ends in the original string */
  starts: number[];
  ends: number[];
}

/** Lower case without accents; "ß" becomes "ss" so that "strasse" finds "Straße" */
function foldChar(char: string): string {
  return char.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/ß/g, 'ss');
}

function fold(text: string): Folded {
  let folded = '';
  const starts: number[] = [];
  const ends: number[] = [];
  let index = 0;
  for (const char of text) {
    const part = foldChar(char);
    for (let i = 0; i < part.length; i++) {
      starts.push(index);
      ends.push(index + char.length);
    }
    folded += part;
    index += char.length;
  }
  return { text: folded, starts, ends };
}

/** The words of a query in their folded form */
export function filterTerms(query: string): string[] {
  return foldChar(query).split(/\s+/).filter(Boolean);
}

/** True if every word of the query occurs in the texts; an empty query matches everything */
export function matchesFilter(parts: ReadonlyArray<string | null | undefined>, query: string): boolean {
  const terms = filterTerms(query);
  if (terms.length === 0) {
    return true;
  }
  const haystack = fold(parts.filter((part): part is string => !!part).join('\n')).text;
  return terms.every((term) => haystack.includes(term));
}

/** Where the words of the query occur in the text, as merged [start, end) ranges of the original text */
export function highlightRanges(text: string, query: string): Array<[number, number]> {
  const terms = filterTerms(query);
  if (!text || terms.length === 0) {
    return [];
  }
  const folded = fold(text);
  const found: Array<[number, number]> = [];
  for (const term of terms) {
    for (let at = folded.text.indexOf(term); at !== -1; at = folded.text.indexOf(term, at + 1)) {
      found.push([folded.starts[at], folded.ends[at + term.length - 1]]);
    }
  }
  found.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const range of found) {
    const last = merged[merged.length - 1];
    if (last && range[0] <= last[1]) {
      last[1] = Math.max(last[1], range[1]);
    } else {
      merged.push([range[0], range[1]]);
    }
  }
  return merged;
}
