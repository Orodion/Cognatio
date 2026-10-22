import { useTranslation } from 'react-i18next';
import { ChartCard, HintLink } from './ChartCard';
import { filterLink, type StatisticsScope } from '../lib/scope';
import type { TreeStatistics } from '../lib/types';

/** "What is still missing?": the share of each fact, the persons without it a click away */
export function CompletenessCard({ completeness, scope }: { completeness: TreeStatistics['completeness']; scope: StatisticsScope }) {
  const { t, i18n } = useTranslation();
  const percent = new Intl.NumberFormat(i18n.language, { style: 'percent', maximumFractionDigits: 0 });
  const number = new Intl.NumberFormat(i18n.language);
  return (
    <ChartCard
      title={t('statistics.completeness.title')}
      description={t('statistics.completeness.description')}
      csv={() => [
        [t('statistics.completeness.fact'), t('statistics.generations.persons'), t('statistics.completeness.present'), t('statistics.completeness.missing')],
        ...completeness.rows.map((r) => [t(`statistics.completeness.facts.${r.fact}`), r.total, r.present, r.missing]),
      ]}
    >
      <p className="flex items-baseline gap-3">
        <span className="text-4xl font-semibold tabular-nums">{completeness.score === null ? '—' : percent.format(completeness.score)}</span>
        <span className="text-sm text-muted-foreground">{t('statistics.completeness.score')}</span>
      </p>
      <table className="w-full text-sm" aria-label={t('statistics.completeness.title')}>
        <thead className="text-left text-muted-foreground">
          <tr className="border-b">
            <th className="py-2 pr-4 font-normal">{t('statistics.completeness.fact')}</th>
            <th className="w-1/2 py-2 pr-4 font-normal">{t('statistics.completeness.present')}</th>
            <th className="py-2 font-normal">{t('statistics.completeness.missing')}</th>
          </tr>
        </thead>
        <tbody>
          {completeness.rows.map((row) => {
            const share = row.total ? row.present / row.total : null;
            return (
              <tr key={row.fact} className="border-b last:border-0">
                <td className="py-2 pr-4">{t(`statistics.completeness.facts.${row.fact}`)}</td>
                <td className="py-2 pr-4">
                  {share === null ? (
                    '—'
                  ) : (
                    <span className="flex items-center gap-2">
                      <span className="h-3 flex-1 rounded-r bg-muted" aria-hidden="true">
                        <span className="block h-3 rounded-r bg-chart" style={{ width: `${share * 100}%` }} />
                      </span>
                      <span className="w-12 shrink-0 text-right tabular-nums">{percent.format(share)}</span>
                    </span>
                  )}
                </td>
                <td className="py-2 tabular-nums">
                  {row.missing > 0 ? (
                    <HintLink to={filterLink(row.filter, scope)}>{t('statistics.completeness.missingCount', { count: row.missing })}</HintLink>
                  ) : (
                    number.format(0)
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </ChartCard>
  );
}
