/**
 * Cologne phonetics: maps German names to digit sequences so that spellings that sound alike
 * get the same code ("Meier", "Mayer", "Maier" → 67; "Schmidt", "Schmitt" → 862).
 * Better suited for historical names with changing spellings than Soundex (English pronunciation).
 * Cyrillic names (Russian, Ukrainian) are transliterated first, the German way, so "Иванов", "Iwanow" and "Ivanov" get
 * the same code. Other scripts get no code; the search still finds them by their spelling.
 */

const VOWELS = new Set('AEIJOUY');

/** Cyrillic capital letters → Latin as German transliteration writes them (fits the German rules below) */
const CYRILLIC: Record<string, string> = {
  А: 'A',
  Б: 'B',
  В: 'W',
  Г: 'G',
  Ґ: 'G',
  Д: 'D',
  Е: 'E',
  Ё: 'JO',
  Є: 'JE',
  Ж: 'SCH',
  З: 'S',
  И: 'I',
  І: 'I',
  Ї: 'JI',
  Й: 'J',
  К: 'K',
  Л: 'L',
  М: 'M',
  Н: 'N',
  О: 'O',
  П: 'P',
  Р: 'R',
  С: 'S',
  Т: 'T',
  У: 'U',
  Ф: 'F',
  Х: 'CH',
  Ц: 'Z',
  Ч: 'TSCH',
  Ш: 'SCH',
  Щ: 'SCHTSCH',
  Ъ: '',
  Ы: 'Y',
  Ь: '',
  Э: 'E',
  Ю: 'JU',
  Я: 'JA',
};

/** Upper-case letters A–Z; Cyrillic is transliterated, umlauts count as vowels, ß as S, accents are removed */
function normalize(word: string) {
  return word
    .toUpperCase()
    .replace(/[\u0400-\u04FF]/g, (letter) => CYRILLIC[letter] ?? '')
    .replace(/[ÄÖÜ]/g, 'A')
    .replace(/ß/g, 'S')
    .normalize('NFD')
    .replace(/[^A-Z]/g, '');
}

function codeFor(letter: string, prev: string, next: string, first: boolean): string {
  if (VOWELS.has(letter)) {
    return '0';
  }
  switch (letter) {
    case 'H':
      return '';
    case 'B':
      return '1';
    case 'P':
      return next === 'H' ? '3' : '1';
    case 'D':
    case 'T':
      return 'CSZ'.includes(next) && next ? '8' : '2';
    case 'F':
    case 'V':
    case 'W':
      return '3';
    case 'G':
    case 'K':
    case 'Q':
      return '4';
    case 'C':
      if (first) {
        return next && 'AHKLOQRUX'.includes(next) ? '4' : '8';
      }
      if (prev && 'SZ'.includes(prev)) {
        return '8';
      }
      return next && 'AHKOQUX'.includes(next) ? '4' : '8';
    case 'X':
      return prev && 'CKQ'.includes(prev) ? '8' : '48';
    case 'L':
      return '5';
    case 'M':
    case 'N':
      return '6';
    case 'R':
      return '7';
    case 'S':
    case 'Z':
      return '8';
    default:
      return '';
  }
}

/** Code of a single word; empty if the word contains no Latin or Cyrillic letters */
export function colognePhonetics(word: string) {
  const letters = normalize(word);
  let raw = '';
  for (let i = 0; i < letters.length; i++) {
    raw += codeFor(letters[i], letters[i - 1] ?? '', letters[i + 1] ?? '', i === 0);
  }
  // Merge identical consecutive digits, then remove zeros (except at the start)
  const collapsed = raw.replace(/(\d)\1+/g, '$1');
  return collapsed.charAt(0) + collapsed.slice(1).replace(/0/g, '');
}

/** Codes of all words of a text ("Müller-Lüdenscheidt" → two codes); without duplicates */
export function phoneticCodes(...texts: Array<string | null | undefined>) {
  const codes = new Set<string>();
  for (const text of texts) {
    for (const word of (text ?? '').split(/[^\p{L}]+/u)) {
      const code = colognePhonetics(word);
      if (code) {
        codes.add(code);
      }
    }
  }
  return [...codes];
}

export interface NameFields {
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  birthName?: string | null;
  nickname?: string | null;
}

/** Phonetic codes of all name parts of a person – content of the column `Person.phonetics` */
export function personPhonetics(p: NameFields) {
  return phoneticCodes(p.firstName, p.middleName, p.lastName, p.birthName, p.nickname);
}
