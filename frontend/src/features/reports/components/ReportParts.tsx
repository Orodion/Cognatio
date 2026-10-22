import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { Footnotes } from '../lib/reportData';

/** One sheet of paper: in the preview a white page with a shadow, on paper only its content (margins from @page) */
export function Sheet({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="report-sheet mx-auto mb-6 w-full max-w-[210mm] bg-white p-[14mm] text-[10pt] leading-snug text-neutral-900 shadow-md ring-1 ring-black/5 print:mb-0 print:max-w-none print:p-0 print:shadow-none print:ring-0">
      <header className="mb-4 border-b border-neutral-300 pb-2">
        <p className="text-[8pt] uppercase tracking-wide text-neutral-500">{subtitle}</p>
        <h2 className="text-[16pt] font-semibold leading-tight">{title}</h2>
      </header>
      {children}
    </section>
  );
}

/** Heading of a part of a sheet */
export function Part({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('report-keep mt-4', className)}>
      <h3 className="mb-1 border-b border-neutral-200 text-[11pt] font-semibold">{title}</h3>
      {children}
    </div>
  );
}

/** Footnote numbers at a fact */
export function Marks({ numbers }: { numbers: number[] }) {
  if (numbers.length === 0) {
    return null;
  }
  return <sup className="ml-0.5 text-[7pt] text-neutral-600">{numbers.join(',')}</sup>;
}

/** Label – value rows */
export function Fields({ rows }: { rows: Array<[string, ReactNode]> }) {
  const shown = rows.filter(([, value]) => value !== null && value !== undefined && value !== '');
  if (shown.length === 0) {
    return null;
  }
  return (
    <dl className="grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-4 gap-y-0.5">
      {shown.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-neutral-600">{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The numbered sources of a sheet */
export function FootnoteList({ notes }: { notes: Footnotes }) {
  const { t } = useTranslation();
  if (notes.list.length === 0) {
    return null;
  }
  return (
    <Part title={t('reports.sources')}>
      <ol className="list-none space-y-0.5 text-[8.5pt]">
        {notes.list.map((citation, i) => (
          <li key={citation.id} className="flex gap-2">
            <span className="w-5 shrink-0 text-right text-neutral-600">{i + 1}.</span>
            <span>
              {[
                citation.source.author,
                citation.source.title,
                citation.source.repository?.name,
                citation.page && t('reports.citationPage', { page: citation.page }),
                citation.date,
              ]
                .filter(Boolean)
                .join(', ')}
              {citation.text && <span className="block whitespace-pre-line italic text-neutral-700">{citation.text}</span>}
            </span>
          </li>
        ))}
      </ol>
    </Part>
  );
}

/** Line at the end of a report */
export function ReportFooter() {
  const { t, i18n } = useTranslation();
  return <p className="mt-6 text-[8pt] text-neutral-500">{t('reports.footer', { date: new Date().toLocaleDateString(i18n.language) })}</p>;
}
