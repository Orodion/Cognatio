import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { CopyCsvButton } from './CopyCsvButton';
import type { CsvCell } from '../lib/csv';

/** A key figure; with `to` the number is a link to the persons it counts */
export function StatTile({ label, value, hint, to }: { label: string; value: ReactNode; hint?: ReactNode; to?: string }) {
  return (
    <Card role="group" aria-label={label}>
      <CardContent className="space-y-1 p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        {to ? (
          <Link to={to} className="block w-fit text-3xl font-semibold underline-offset-4 hover:text-primary hover:underline">
            {value}
          </Link>
        ) : (
          <p className="text-3xl font-semibold">{value}</p>
        )}
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

interface ChartCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  footnote?: ReactNode;
  /** The figures of the card as rows (header first) – offers "Copy as CSV" */
  csv?: () => CsvCell[][];
}

export function ChartCard({ title, description, children, footnote, csv }: ChartCardProps) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{title}</CardTitle>
          {csv && <CopyCsvButton rows={csv} />}
        </div>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent className="space-y-3">
        {children}
        {footnote && <p className="text-xs text-muted-foreground">{footnote}</p>}
      </CardContent>
    </Card>
  );
}

export function Empty() {
  const { t } = useTranslation();
  return <p className="py-6 text-center text-sm text-muted-foreground">{t('statistics.noData')}</p>;
}

/** A link inside a hint text, e.g. "3 persons without relations" */
export function HintLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="underline-offset-2 hover:text-foreground hover:underline">
      {children}
    </Link>
  );
}
