import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { BarList } from './BarList';
import { ChartCard, Empty, HintLink } from './ChartCard';
import { filterLink, type StatisticsScope } from '../lib/scope';
import type { LifeCell, Lives } from '../lib/types';

const MEASURES = ['lifespan', 'adultLifespan', 'firstWedding', 'firstChild'] as const;
type Measure = (typeof MEASURES)[number];
const GENDERS = ['male', 'female', 'all'] as const;
/** The highest group of the children per couple ("10+") */
const MAX_CHILDREN = 10;

/** Mean age of a cell and the number of persons it is based on (a link to them) */
function Cell({ cell, scope }: { cell: LifeCell; scope: StatisticsScope }) {
  const { t, i18n } = useTranslation();
  const number = new Intl.NumberFormat(i18n.language);
  if (!cell.count) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="tabular-nums">{cell.mean === null ? '—' : t('statistics.years', { count: cell.mean })}</span>
      <HintLink to={filterLink(cell.filter, scope)}>
        <span className="text-xs text-muted-foreground" aria-hidden="true">
          ({number.format(cell.count)})
        </span>
        <span className="sr-only">{t('persons.count', { count: cell.count })}</span>
      </HintLink>
    </span>
  );
}

/** Lives through time: mean ages per century of birth and gender, children per couple, age gap of the partners */
export function LivesCard({ lives, scope }: { lives: Lives; scope: StatisticsScope }) {
  const { t, i18n } = useTranslation();
  const [measure, setMeasure] = useState<Measure>('lifespan');
  const table = lives.tables.find((x) => x.measure === measure);
  const decimal = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 });
  const gap = lives.meanAgeGap;

  return (
    <div className="space-y-6">
      <ChartCard
        title={t('statistics.lives.title')}
        description={t(`statistics.lives.hints.${measure}`)}
        footnote={t('statistics.lives.footnote')}
        csv={() => [
          [
            t('statistics.lives.measure'),
            t('statistics.lives.century'),
            ...GENDERS.flatMap((g) => [t(`statistics.lives.genders.${g}`), t('statistics.generations.persons')]),
          ],
          ...lives.tables.flatMap((tbl) =>
            tbl.rows.map((row) => [
              t(`statistics.lives.measures.${tbl.measure}`),
              row.century === null ? t('statistics.lives.allCenturies') : `${row.century}–${row.century + 99}`,
              ...GENDERS.flatMap((g) => [row[g].mean, row[g].count]),
            ]),
          ),
        ]}
      >
        <div className="flex flex-wrap gap-1" role="group" aria-label={t('statistics.lives.measure')}>
          {MEASURES.map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={measure === m}
              onClick={() => setMeasure(m)}
              className={cn(
                'rounded-md border px-3 py-1.5 text-sm transition-colors',
                measure === m ? 'border-primary bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              {t(`statistics.lives.measures.${m}`)}
            </button>
          ))}
        </div>
        {!table || table.rows.every((r) => !r.all.count) ? (
          <Empty />
        ) : (
          <table className="w-full text-sm" aria-label={t(`statistics.lives.measures.${measure}`)}>
            <thead className="text-left text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 pr-4 font-normal">{t('statistics.lives.century')}</th>
                {GENDERS.map((g) => (
                  <th key={g} className="py-2 pr-4 font-normal">
                    {t(`statistics.lives.genders.${g}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row) => (
                <tr key={row.century ?? 'all'} className={cn('border-b last:border-0', row.century === null && 'font-medium')}>
                  <td className="py-2 pr-4 tabular-nums">{row.century === null ? t('statistics.lives.allCenturies') : `${row.century}–${row.century + 99}`}</td>
                  {GENDERS.map((g) => (
                    <td key={g} className="py-2 pr-4">
                      <Cell cell={row[g]} scope={scope} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ChartCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title={t('statistics.lives.children.title')}
          description={lives.meanChildren === null ? undefined : t('statistics.lives.children.description', { mean: decimal.format(lives.meanChildren) })}
          csv={() => [[t('statistics.lives.children.title'), t('statistics.lives.couples')], ...lives.children.map((r) => [r.key, r.count])]}
        >
          {lives.children.length ? (
            <BarList
              items={lives.children.map((row) => ({
                key: row.key,
                label: Number(row.key) >= MAX_CHILDREN ? `${MAX_CHILDREN}+` : row.key,
                value: row.count,
                to: filterLink(row.filter, scope),
              }))}
              label={t('statistics.lives.children.title')}
              labelWidth="w-10"
            />
          ) : (
            <Empty />
          )}
        </ChartCard>
        <ChartCard
          title={t('statistics.lives.ageGap.title')}
          description={
            gap === null
              ? undefined
              : t(gap >= 0 ? 'statistics.lives.ageGap.manOlderMean' : 'statistics.lives.ageGap.womanOlderMean', { years: decimal.format(Math.abs(gap)) })
          }
          csv={() => [
            [t('statistics.lives.ageGap.title'), t('statistics.lives.couples')],
            ...lives.ageGaps.map((r) => [t(`statistics.lives.ageGap.${r.key}`), r.count]),
          ]}
        >
          {lives.ageGaps.length ? (
            <BarList
              items={lives.ageGaps.map((row) => ({
                key: row.key,
                label: t(`statistics.lives.ageGap.${row.key}`),
                value: row.count,
                to: filterLink(row.filter, scope),
              }))}
              label={t('statistics.lives.ageGap.title')}
              labelWidth="w-40"
            />
          ) : (
            <Empty />
          )}
        </ChartCard>
      </div>
    </div>
  );
}
