import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { formatPersonName } from '@/features/persons/lib/personUtils';
import { ChartCard, Empty } from './ChartCard';
import type { FamilyRecord } from '../lib/types';

/** Records counted in persons; the others are years */
const COUNTED = new Set(['mostChildren', 'mostCommonChildren', 'mostPartners', 'mostDescendants']);

/** Records of deceased persons, each with its holders; a record that is also a possible error says so */
export function RecordsCard({ records }: { records: FamilyRecord[] }) {
  const { t, i18n } = useTranslation();
  const number = new Intl.NumberFormat(i18n.language);
  return (
    <ChartCard
      title={t('statistics.records.title')}
      description={t('statistics.records.description')}
      csv={() => records.map((r) => [t(`statistics.records.kinds.${r.kind}`), r.value, r.persons.map(formatPersonName).join(', ')])}
    >
      {records.length === 0 ? (
        <Empty />
      ) : (
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[auto_1fr]">
          {records.map((record) => (
            <Fragment key={record.kind}>
              <dt className="text-muted-foreground">{t(`statistics.records.kinds.${record.kind}`)}</dt>
              <dd className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-semibold tabular-nums">
                  {COUNTED.has(record.kind) ? number.format(record.value) : t('statistics.years', { count: record.value })}
                </span>
                <span>
                  {record.persons.map((person, i) => (
                    <Fragment key={person.id}>
                      {i > 0 && ', '}
                      <Link to={`/persons/${person.id}`} className="hover:underline">
                        {formatPersonName(person)}
                      </Link>
                    </Fragment>
                  ))}
                  {record.ties > 0 && <span className="text-muted-foreground"> {t('statistics.records.ties', { count: record.ties })}</span>}
                </span>
                {record.possibleError && (
                  <Link to="/checks" className="inline-flex items-center gap-1 text-xs text-destructive hover:underline">
                    <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('statistics.records.possibleError')}
                  </Link>
                )}
              </dd>
            </Fragment>
          ))}
        </dl>
      )}
    </ChartCard>
  );
}
