import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatPersonName, MAX_PLAUSIBLE_AGE } from '@/features/persons/lib/personUtils';
import { BarList, type BarListItem } from './BarList';
import { ChartCard, Empty, HintLink, StatTile } from './ChartCard';
import { CompletenessCard } from './CompletenessCard';
import { AncestorCoverageCard } from './AncestorCoverageCard';
import { TimelineCard } from './TimelineCard';
import { LivesCard } from './LivesCard';
import { FirstNamesCard, MigrationCard } from './NamesPlacesCards';
import { RecordsCard } from './RecordsCard';
import { filterLink, isWholeTree, type StatisticsScope } from '../lib/scope';
import type { Bucket, SourceStatistics, TreeStatistics } from '../lib/types';

interface TabProps {
  stats: TreeStatistics;
  scope: StatisticsScope;
}

const useNumbers = () => {
  const { i18n } = useTranslation();
  return {
    number: new Intl.NumberFormat(i18n.language),
    percent: new Intl.NumberFormat(i18n.language, { style: 'percent', maximumFractionDigits: 0 }),
  };
};

/** Key figures; each number leads to its persons */
export function OverviewTab({ stats, scope }: TabProps) {
  const { t } = useTranslation();
  const { number } = useNumbers();
  const to = (filter: string) => filterLink(filter, scope);
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <StatTile
          label={t('statistics.kpi.persons')}
          value={number.format(stats.total)}
          to={to('all')}
          hint={
            <>
              <HintLink to={to('gender:MALE')}>{t('statistics.kpi.male', { count: stats.male })}</HintLink>
              {' · '}
              <HintLink to={to('gender:FEMALE')}>{t('statistics.kpi.female', { count: stats.female })}</HintLink>
              {' · '}
              <HintLink to={to('gender:UNKNOWN')}>{t('statistics.kpi.unknownGender', { count: stats.unknownGender })}</HintLink>
            </>
          }
        />
        <StatTile
          label={t('statistics.kpi.deceasedLabel')}
          value={number.format(stats.deceased)}
          to={to('deceased')}
          hint={<HintLink to={to('living')}>{t('statistics.kpi.withoutDeath', { count: stats.living })}</HintLink>}
        />
        <StatTile label={t('statistics.kpi.relations')} value={number.format(stats.relations)} />
        <StatTile
          label={t('statistics.kpi.families')}
          value={number.format(stats.families)}
          to={to('family')}
          hint={<HintLink to={to('unconnected')}>{t('statistics.kpi.unconnected', { count: stats.unconnected })}</HintLink>}
        />
        <StatTile
          label={t('statistics.kpi.lifespan')}
          value={stats.averageLifespan === null ? '—' : t('statistics.years', { count: stats.averageLifespan })}
          to={stats.averageLifespan === null ? undefined : to('lifespan')}
          hint={t('statistics.kpi.lifespanHint')}
        />
        <StatTile
          label={t('statistics.kpi.oldest')}
          value={stats.oldestBirth ? stats.oldestBirth.year : '—'}
          hint={
            stats.oldestBirth && (
              <Link to={`/persons/${stats.oldestBirth.person.id}`} className="hover:underline">
                {formatPersonName(stats.oldestBirth.person)}
              </Link>
            )
          }
        />
      </div>
      <TimelineCard timeline={stats.timeline} scope={scope} />
      <CompletenessCard completeness={stats.completeness} scope={scope} />
    </div>
  );
}

/** Age distribution of the living and the deceased */
export function LivesTab({ stats, scope }: TabProps) {
  const { t } = useTranslation();
  const ageItemLabel = (from: number) => (from >= 100 ? t('statistics.ages.plus', { from }) : t('statistics.ages.range', { from, to: from + 9 }));
  const ageItems = (buckets: Bucket[]): BarListItem[] =>
    buckets.map((b) => ({
      key: String(b.from),
      label: ageItemLabel(b.from),
      value: b.count,
      to: filterLink(b.filter, scope),
    }));
  const footnote = (stats.withoutAge > 0 || stats.probablyDeceased > 0) && (
    <>
      {stats.withoutAge > 0 && <HintLink to={filterLink('withoutAge', scope)}>{t('statistics.ages.withoutAge', { count: stats.withoutAge })}</HintLink>}
      {stats.withoutAge > 0 && stats.probablyDeceased > 0 && ' '}
      {stats.probablyDeceased > 0 && (
        <HintLink to={filterLink('probablyDeceased', scope)}>
          {t('statistics.ages.probablyDeceased', { count: stats.probablyDeceased, max: MAX_PLAUSIBLE_AGE })}
        </HintLink>
      )}
    </>
  );
  return (
    <div className="space-y-6">
      <ChartCard
        title={t('statistics.ages.title')}
        description={t('statistics.ages.description')}
        footnote={footnote}
        csv={() => {
          const from = [...new Set([...stats.livingAges, ...stats.deathAges].map((b) => b.from))].sort((a, b) => a - b);
          const count = (list: Bucket[], value: number) => list.find((b) => b.from === value)?.count ?? 0;
          return [
            [t('statistics.ages.title'), t('statistics.ages.living'), t('statistics.ages.deceased')],
            ...from.map((value) => [ageItemLabel(value), count(stats.livingAges, value), count(stats.deathAges, value)]),
          ];
        }}
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="space-y-2">
            <h3 className="text-sm font-medium">{t('statistics.ages.living')}</h3>
            {stats.livingAges.length ? <BarList items={ageItems(stats.livingAges)} label={t('statistics.ages.living')} labelWidth="w-20" /> : <Empty />}
          </section>
          <section className="space-y-2">
            <h3 className="text-sm font-medium">{t('statistics.ages.deceased')}</h3>
            {stats.deathAges.length ? <BarList items={ageItems(stats.deathAges)} label={t('statistics.ages.deceased')} labelWidth="w-20" /> : <Empty />}
          </section>
        </div>
      </ChartCard>
      <LivesCard lives={stats.lives} scope={scope} />
      <RecordsCard records={stats.records} />
    </div>
  );
}

/** Last names and places of birth */
export function NamesTab({ stats, scope }: TabProps) {
  const { t } = useTranslation();
  const items = (ranked: TreeStatistics['surnames']): BarListItem[] =>
    ranked.map((r) => ({ key: r.label, label: r.label, value: r.count, to: filterLink(r.filter, scope) }));
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title={t('statistics.surnames.title')}
          description={t('statistics.surnames.description', { count: stats.distinctSurnames })}
          csv={() => [[t('statistics.surnames.title'), t('statistics.generations.persons')], ...stats.surnames.map((r) => [r.label, r.count])]}
        >
          {stats.surnames.length ? <BarList items={items(stats.surnames)} label={t('statistics.surnames.title')} total={stats.total} /> : <Empty />}
        </ChartCard>
        <ChartCard
          title={t('statistics.places.title')}
          description={t('statistics.places.description', { count: stats.withBirthplace, places: stats.distinctBirthplaces })}
          csv={() => [[t('statistics.places.title'), t('statistics.generations.persons')], ...stats.birthplaces.map((r) => [r.label, r.count])]}
        >
          {stats.birthplaces.length ? (
            <BarList items={items(stats.birthplaces)} label={t('statistics.places.title')} total={stats.withBirthplace} />
          ) : (
            <Empty />
          )}
        </ChartCard>
      </div>
      <FirstNamesCard names={stats.firstNames} scope={scope} />
      <MigrationCard migration={stats.migration} scope={scope} />
    </div>
  );
}

/** Ancestors of a person and the generations per family group */
export function AncestorsTab({ stats, scope, startChosen, onChooseStart }: TabProps & { startChosen: boolean; onChooseStart: (personId: string) => void }) {
  const { t } = useTranslation();
  const { number } = useNumbers();
  const maxGeneration = Math.max(1, ...stats.generations.map((g) => g.count));
  return (
    <div className="space-y-6">
      {stats.ancestors && <AncestorCoverageCard ancestors={stats.ancestors} chosen={startChosen} onChooseStart={onChooseStart} />}
      <ChartCard
        title={t('statistics.generations.title')}
        description={t('statistics.generations.description')}
        footnote={t('statistics.generations.footnote', { families: stats.families, unconnected: stats.unconnected })}
        csv={() => [
          [t('statistics.generations.generation'), t('statistics.generations.persons'), t('statistics.generations.births'), ''],
          ...stats.generations.map((g) => [g.generation, g.count, g.earliestBirth, g.latestBirth]),
        ]}
      >
        <table className="w-full text-sm" aria-label={t('statistics.generations.title')}>
          <thead className="text-left text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 pr-4 font-normal">{t('statistics.generations.generation')}</th>
              <th className="w-1/2 py-2 pr-4 font-normal">{t('statistics.generations.persons')}</th>
              <th className="py-2 font-normal">{t('statistics.generations.births')}</th>
            </tr>
          </thead>
          <tbody>
            {stats.generations.map((g) => (
              <tr key={g.generation} className="border-b last:border-0">
                <td className="py-2 pr-4">{g.generation}</td>
                <td className="py-2 pr-4">
                  <Link to={filterLink(g.filter, scope)} className="group flex items-center gap-2">
                    <span
                      className="h-3 rounded-r bg-chart group-hover:opacity-80"
                      style={{ width: `${(g.count / maxGeneration) * 100}%` }}
                      aria-hidden="true"
                    />
                    <span className="tabular-nums group-hover:underline">{number.format(g.count)}</span>
                  </Link>
                </td>
                <td className="py-2 tabular-nums">
                  {g.earliestBirth === null ? '—' : g.earliestBirth === g.latestBirth ? g.earliestBirth : `${g.earliestBirth}–${g.latestBirth}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ChartCard>
    </div>
  );
}

/** Sources and citations – always of the whole family tree */
export function SourcesTab({ sources, scope }: { sources: SourceStatistics | undefined; scope: StatisticsScope }) {
  const { t } = useTranslation();
  const { number, percent } = useNumbers();
  if (!sources) {
    return <Empty />;
  }
  return (
    <ChartCard
      title={t('statistics.sources.title')}
      description={t('statistics.sources.description', {
        sources: number.format(sources.sources),
        citations: number.format(sources.citations),
        cited: number.format(sources.citedPersons),
        persons: number.format(sources.persons),
        share: percent.format(sources.persons ? sources.citedPersons / sources.persons : 0),
      })}
      footnote={isWholeTree(scope) ? undefined : t('statistics.sources.wholeTree')}
      csv={() => [[t('statistics.sources.mostCited'), t('statistics.sources.title')], ...sources.topSources.map((s) => [s.abbreviation || s.title, s.links])]}
    >
      {sources.topSources.length ? (
        <>
          <h3 className="text-sm font-medium">{t('statistics.sources.mostCited')}</h3>
          <BarList
            items={sources.topSources.map((s) => ({ key: s.id, label: s.abbreviation || s.title, value: s.links, to: `/sources/${s.id}` }))}
            label={t('statistics.sources.mostCited')}
            labelWidth="w-48"
          />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">{t('statistics.sources.empty')}</p>
      )}
    </ChartCard>
  );
}
