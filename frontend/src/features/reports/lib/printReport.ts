import type { ReportPaper } from '@/stores/settingsStore';
import { savePdfBridge } from '@/lib/platform';

export type PaperSize = 'A4' | 'LETTER';

/** Countries that use Letter paper; all others A4 */
const LETTER_REGIONS = new Set(['US', 'CA', 'MX', 'PH', 'CL', 'CO', 'VE', 'GT', 'CR', 'PA', 'DO', 'SV', 'PR']);

/** Paper size of a report: the chosen one, or by the region of the browser language ("en-US" → Letter) */
export function paperSize(choice: ReportPaper, locale = typeof navigator === 'undefined' ? '' : navigator.language): PaperSize {
  if (choice !== 'AUTO') {
    return choice;
  }
  let region: string | undefined;
  try {
    region = new Intl.Locale(locale).maximize().region;
  } catch {
    region = undefined;
  }
  return region && LETTER_REGIONS.has(region) ? 'LETTER' : 'A4';
}

/** Page rules: paper, margins and the page number at the bottom ("2 / 5") */
export const pageCss = (paper: PaperSize) =>
  `@page { size: ${paper === 'LETTER' ? 'letter' : 'A4'}; margin: 16mm 15mm 18mm; ` +
  '@bottom-center { content: counter(page) " / " counter(pages); font: 9pt sans-serif; color: #555; } }';

function imagesLoaded(root: HTMLElement): Promise<unknown> {
  const pending = [...root.querySelectorAll('img')].filter((img) => !img.complete);
  return Promise.all(
    pending.map(
      (img) =>
        new Promise((resolve) => {
          img.addEventListener('load', resolve, { once: true });
          img.addEventListener('error', resolve, { once: true });
        }),
    ),
  );
}

/**
 * Prints a report: a copy of `report` is put directly into the body and only it is printed (see #report-print-root in
 * index.css). `pdf` in the desktop app writes a PDF file through its "Save as" dialog; otherwise, and always in the
 * browser, the print dialog opens, where "Save as PDF" can be chosen. The title names the file of the PDF.
 * Resolves with false if the user cancelled the "Save as" dialog of the app.
 */
export async function printReport(report: HTMLElement, { title, paper, pdf }: { title: string; paper: PaperSize; pdf: boolean }): Promise<boolean> {
  const root = document.createElement('div');
  root.id = 'report-print-root';
  const style = document.createElement('style');
  style.textContent = pageCss(paper);
  root.append(style, report.cloneNode(true));
  document.body.appendChild(root);
  const html = document.documentElement;
  const previousTitle = document.title;
  html.classList.add('report-printing');
  document.title = title;
  try {
    await imagesLoaded(root);
    const savePdf = pdf ? savePdfBridge() : undefined;
    if (savePdf) {
      return await savePdf(title);
    }
    window.print();
    return true;
  } finally {
    html.classList.remove('report-printing');
    document.title = previousTitle;
    root.remove();
  }
}
