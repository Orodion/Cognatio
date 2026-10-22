export type CsvCell = string | number | null | undefined;

/** A text a spreadsheet would read as a formula */
const FORMULA = /^[=+\-@]/;

/**
 * Rows for the clipboard, to be pasted into a spreadsheet: cells separated by tabs, as Excel, Google Sheets and
 * LibreOffice split pasted text at tabs (not at commas or semicolons); numbers in the notation of the language. A tab or
 * line break in a cell becomes a space, and a text that starts like a formula (e.g. a name from an imported file) gets
 * an apostrophe, so it stays text.
 */
export function toCsv(rows: CsvCell[][], language: string): string {
  const number = new Intl.NumberFormat(language, { useGrouping: false, maximumFractionDigits: 2 });
  const cell = (value: CsvCell) => {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'number') {
      return number.format(value);
    }
    const text = value.replace(/[\t\r\n]+/g, ' ');
    return FORMULA.test(text) ? `'${text}` : text;
  };
  return rows.map((row) => row.map(cell).join('\t')).join('\r\n');
}
