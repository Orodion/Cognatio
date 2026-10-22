import { useEffect, type ReactNode } from 'react';
import { useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { formatPersonName } from '@/features/persons/lib/personUtils';
import { GET_SOURCE_STATISTICS } from '@/features/sources/graphql/sourceQueries';
import { GET_TREE_STATISTICS } from '@/features/statistics/graphql/statisticsQueries';
import { scopeVariables, type StatisticsScope } from '@/features/statistics/lib/scope';
import type { LifeCell, SourceStatistics, TreeStatistics } from '@/features/statistics/lib/types';
import { Fields, Part, Sheet } from './ReportParts';

const COUNTED_RECORDS = new Set(['mostChildren', 'mostCommonChildren', 'mostPartners', 'mostDescendants']);
const LIFE_GENDERS = ['male', 'female', 'all'] as const;

/** A plain table for paper */
function ReportTable({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <table className="w-full border-collapse text-[9pt]">
      <thead>
        <tr className="border-b border-neutral-300 text-left text-neutral-600">
          {head.map((cell, i) => (
            <th key={i} className="py-0.5 pr-3 font-normal">
              {cell}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="report-keep border-b border-neutral-100">
            {row.map((cell, j) => (
              <td key={j} className="py-0.5 pr-3 align-top tabular-nums">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface StatisticsReportProps {
  scope: StatisticsScope;
  /** What the scope covers, for the heading */
  scopeText: string;
  /** Called once the figures are there (printing waits for them) */
  onReady: (ready: boolean) => void;
}

/** All figures of the statistics for a scope on paper: tables instead of charts, no links */
export function StatisticsReport({ scope, scopeText, onReady }: StatisticsReportProps) {
  const { t, i18n } = useTranslation();
  const { data, error } = useQuery<{ treeStatistics: TreeStatistics }>(GET_TREE_STATISTICS, {
    variables: { scope: scopeVariables(scope), language: i18n.language, ancestorsOf: null },
    fetchPolicy: 'cache-and-network',
  });
  const { data: sourceData } = useQuery<{ sourceStatistics: SourceStatistics }>(GET_SOURCE_STATISTICS, { fetchPolicy: 'cache-and-network' });
  const stats = data?.treeStatistics;
  const sources = sourceData?.sourceStatistics;
  useEffect(() => onReady(!!stats && !!sources), [stats, sources, onReady]);

  if (error) {
    return <p className="text-destructive">{t('persons.error')}</p>;
  }
  if (!stats || !sources) {
    return <p className="text-muted-foreground">{t('common.loading')}</p>;
  }
  const number = new Intl.NumberFormat(i18n.language);
  const percent = new Intl.NumberFormat(i18n.language, { style: 'percent', maximumFractionDigits: 0 });
  const decimal = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 });
  const years = (value: number | null) => (value === null ? '—' : t('statistics.years', { count: value }));
  const span = (from: number | null, to: number | null) => (from === null ? '—' : from === to ? String(from) : `${from}–${to}`);
  const ageLabel = (from: number) => (from >= 100 ? t('statistics.ages.plus', { from }) : t('statistics.ages.range', { from, to: from + 9 }));
  const cell = (c: LifeCell) => (c.count ? `${c.mean === null ? '—' : years(c.mean)} (${number.format(c.count)})` : '—');
  const names = (list: Array<{ label: string; count: number }>) => list.map((n) => `${n.label} (${number.format(n.count)})`).join(', ') || '—';
  const subtitle = `${t('reports.types.statistics')} · ${scopeText}`;

  return (
    <>
      <Sheet title={t('nav.statistics')} subtitle={subtitle}>
        <Part title={t('statistics.tabs.overview')}>
          <Fields
            rows={[
              [t('statistics.kpi.persons'), number.format(stats.total)],
              [t('statistics.lives.genders.male'), number.format(stats.male)],
              [t('statistics.lives.genders.female'), number.format(stats.female)],
              [t('gender.UNKNOWN'), number.format(stats.unknownGender)],
              [t('statistics.kpi.deceasedLabel'), number.format(stats.deceased)],
              [t('statistics.filter.living'), number.format(stats.living)],
              [t('statistics.kpi.relations'), number.format(stats.relations)],
              [t('statistics.kpi.families'), number.format(stats.families)],
              [t('statistics.filter.unconnected'), number.format(stats.unconnected)],
              [t('statistics.kpi.lifespan'), years(stats.averageLifespan)],
              [t('statistics.kpi.oldest'), stats.oldestBirth ? `${stats.oldestBirth.year} (${formatPersonName(stats.oldestBirth.person)})` : '—'],
            ]}
          />
        </Part>
        <Part title={t('statistics.completeness.title')}>
          <p className="mb-1">
            {t('statistics.completeness.score')}: {stats.completeness.score === null ? '—' : percent.format(stats.completeness.score)}
          </p>
          <ReportTable
            head={[t('statistics.completeness.fact'), t('statistics.completeness.present'), t('statistics.completeness.missing')]}
            rows={stats.completeness.rows.map((r) => [
              t(`statistics.completeness.facts.${r.fact}`),
              r.total ? percent.format(r.present / r.total) : '—',
              number.format(r.missing),
            ])}
          />
        </Part>
        <Part title={t('statistics.timeline.title')}>
          <ReportTable
            head={['', t('statistics.timeline.measures.births'), t('statistics.timeline.measures.deaths'), t('statistics.timeline.measures.weddings')]}
            rows={stats.timeline.decades
              .filter((d) => d.births || d.deaths || d.weddings)
              .map((d) => [`${d.decade}–${d.decade + 9}`, number.format(d.births), number.format(d.deaths), number.format(d.weddings)])}
          />
        </Part>
      </Sheet>

      <Sheet title={t('statistics.tabs.lives')} subtitle={subtitle}>
        <Part title={t('statistics.ages.title')}>
          <div className="grid grid-cols-2 gap-6">
            {(['livingAges', 'deathAges'] as const).map((key) => (
              <ReportTable
                key={key}
                head={[t(key === 'livingAges' ? 'statistics.ages.living' : 'statistics.ages.deceased'), '']}
                rows={stats[key].map((b) => [ageLabel(b.from), number.format(b.count)])}
              />
            ))}
          </div>
        </Part>
        {stats.lives.tables.map((table) => (
          <Part key={table.measure} title={`${t('statistics.lives.title')}: ${t(`statistics.lives.measures.${table.measure}`)}`}>
            <ReportTable
              head={[t('statistics.lives.century'), ...LIFE_GENDERS.map((g) => t(`statistics.lives.genders.${g}`))]}
              rows={table.rows.map((row) => [
                row.century === null ? t('statistics.lives.allCenturies') : `${row.century}–${row.century + 99}`,
                ...LIFE_GENDERS.map((g) => cell(row[g])),
              ])}
            />
          </Part>
        ))}
        <p className="mt-1 text-[8pt] text-neutral-600">{t('statistics.lives.footnote')}</p>
        <div className="grid grid-cols-2 gap-6">
          <Part title={t('statistics.lives.children.title')}>
            {stats.lives.meanChildren !== null && (
              <p className="mb-1">{t('statistics.lives.children.description', { mean: decimal.format(stats.lives.meanChildren) })}</p>
            )}
            <ReportTable head={['', '']} rows={stats.lives.children.map((r) => [Number(r.key) >= 10 ? '10+' : r.key, number.format(r.count)])} />
          </Part>
          <Part title={t('statistics.lives.ageGap.title')}>
            <ReportTable head={['', '']} rows={stats.lives.ageGaps.map((r) => [t(`statistics.lives.ageGap.${r.key}`), number.format(r.count)])} />
          </Part>
        </div>
        <Part title={t('statistics.records.title')}>
          <p className="mb-1 text-[8pt] text-neutral-600">{t('statistics.records.description')}</p>
          <ReportTable
            head={['', '', '']}
            rows={stats.records.map((r) => [
              t(`statistics.records.kinds.${r.kind}`),
              COUNTED_RECORDS.has(r.kind) ? number.format(r.value) : years(r.value),
              `${r.persons.map(formatPersonName).join(', ')}${r.ties ? ` ${t('statistics.records.ties', { count: r.ties })}` : ''}${r.possibleError ? ` (${t('statistics.records.possibleError')})` : ''}`,
            ])}
          />
        </Part>
      </Sheet>

      <Sheet title={t('statistics.tabs.names')} subtitle={subtitle}>
        <div className="grid grid-cols-2 gap-6">
          <Part title={t('statistics.surnames.title')}>
            <ReportTable head={['', '']} rows={stats.surnames.map((r) => [r.label, number.format(r.count)])} />
          </Part>
          <Part title={t('statistics.places.title')}>
            <ReportTable head={['', '']} rows={stats.birthplaces.map((r) => [r.label, number.format(r.count)])} />
          </Part>
          {(['male', 'female'] as const).map((g) => (
            <Part key={g} title={t(`statistics.firstNames.${g}`)}>
              <ReportTable head={['', '']} rows={stats.firstNames[g].map((r) => [r.label, number.format(r.count)])} />
            </Part>
          ))}
        </div>
        <Part title={t('statistics.firstNames.fashion')}>
          <ReportTable
            head={[t('statistics.lives.century'), t('statistics.lives.genders.male'), t('statistics.lives.genders.female')]}
            rows={stats.firstNames.fashion.map((f) => [`${f.century}–${f.century + 99}`, names(f.male), names(f.female)])}
          />
        </Part>
        <Part title={t('statistics.migration.title')}>
          {stats.migration.stayed + stats.migration.moved > 0 && (
            <p className="mb-1">
              {t('statistics.migration.stayedIntro', { share: percent.format(stats.migration.stayed / (stats.migration.stayed + stats.migration.moved)) })}{' '}
              {t('statistics.migration.stayed', { count: stats.migration.stayed })}, {t('statistics.migration.moved', { count: stats.migration.moved })}
            </p>
          )}
          <div className="grid grid-cols-2 gap-6">
            <ReportTable
              head={[t('statistics.migration.moves'), '']}
              rows={stats.migration.moves.map((m) => [`${m.from} → ${m.to}`, number.format(m.count)])}
            />
            <ReportTable
              head={[t('statistics.migration.place'), t('statistics.generations.persons'), t('statistics.migration.years')]}
              rows={stats.migration.places.map((p) => [p.place, number.format(p.persons), span(p.firstYear, p.lastYear)])}
            />
          </div>
          {stats.migration.morePlaces > 0 && (
            <p className="mt-1 text-[8pt] text-neutral-600">{t('statistics.migration.morePlaces', { count: stats.migration.morePlaces })}</p>
          )}
        </Part>
      </Sheet>

      <Sheet title={t('statistics.tabs.ancestors')} subtitle={subtitle}>
        {stats.ancestors && (
          <Part title={`${t('statistics.ancestors.of')} ${formatPersonName(stats.ancestors.person)}`}>
            <ReportTable
              head={[
                t('statistics.generations.generation'),
                t('statistics.ancestors.possible'),
                t('statistics.ancestors.found'),
                t('statistics.ancestors.repeated'),
                t('statistics.ancestors.openEnds'),
                t('statistics.generations.births'),
              ]}
              rows={stats.ancestors.generations.map((g) => [
                g.generation <= 5 ? `${g.generation} · ${t(`statistics.ancestors.names.${g.generation}`)}` : g.generation,
                number.format(g.possible),
                `${number.format(g.found)} (${percent.format(g.found / g.possible)})`,
                g.found > g.distinct ? number.format(g.found - g.distinct) : '—',
                number.format(g.openEnds),
                span(g.earliestBirth, g.latestBirth),
              ])}
            />
          </Part>
        )}
        <Part title={t('statistics.generations.title')}>
          <ReportTable
            head={[t('statistics.generations.generation'), t('statistics.generations.persons'), t('statistics.generations.births')]}
            rows={stats.generations.map((g) => [g.generation, number.format(g.count), span(g.earliestBirth, g.latestBirth)])}
          />
        </Part>
        <Part title={t('statistics.sources.title')}>
          <p className="mb-1">
            {t('statistics.sources.description', {
              sources: number.format(sources.sources),
              citations: number.format(sources.citations),
              cited: number.format(sources.citedPersons),
              persons: number.format(sources.persons),
              share: percent.format(sources.persons ? sources.citedPersons / sources.persons : 0),
            })}
          </p>
          <ReportTable
            head={[t('statistics.sources.mostCited'), '']}
            rows={sources.topSources.map((s) => [s.abbreviation || s.title, number.format(s.links)])}
          />
        </Part>
      </Sheet>
    </>
  );
}
