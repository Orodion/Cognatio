import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { GET_TREE_DATA } from '@/features/tree/graphql/treeQueries';
import type { Person } from '@/features/persons/types/person';
import type { TreeRelation } from '@/features/tree/lib/treeUtils';
import { computeStatistics, MAX_PLAUSIBLE_AGE, type Bucket } from '@/features/statistics/lib/statistics';
import { formatPersonName } from '@/features/persons/lib/personUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { BarList, type BarListItem } from '@/features/statistics/components/BarList';

function StatTile({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <Card role="group" aria-label={label}>
      <CardContent className="space-y-1 p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-3xl font-semibold">{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, description, children, footnote }: { title: string; description?: string; children: ReactNode; footnote?: ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent className="space-y-3">
        {children}
        {footnote && <p className="text-xs text-muted-foreground">{footnote}</p>}
      </CardContent>
    </Card>
  );
}

function Empty() {
  const { t } = useTranslation();
  return <p className="py-6 text-center text-sm text-muted-foreground">{t('statistics.noData')}</p>;
}

/** Statistics page: key figures, age distribution, last names, places of origin, generations */
export function StatisticsPage() {
  const { t, i18n } = useTranslation();
  const { data, loading, error } = useQuery<{ getPersons: Person[]; getRelations: TreeRelation[] }>(GET_TREE_DATA, {
    fetchPolicy: 'cache-and-network',
  });
  const stats = useMemo(() => (data ? computeStatistics(data.getPersons, data.getRelations, undefined, i18n.language) : null), [data, i18n.language]);
  const number = new Intl.NumberFormat(i18n.language);

  const ageItems = (buckets: Bucket[]): BarListItem[] =>
    buckets.map((b) => ({
      key: String(b.from),
      label: b.from >= 100 ? t('statistics.ages.plus', { from: b.from }) : t('statistics.ages.range', { from: b.from, to: b.from + 9 }),
      value: b.count,
    }));

  let content: ReactNode;
  if (loading && !data) {
    content = (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t('common.loading')}
      </div>
    );
  } else if (error || !stats) {
    content = <p className="text-destructive">{t('persons.error')}</p>;
  } else if (stats.total === 0) {
    content = (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">{t('statistics.empty')}</CardContent>
      </Card>
    );
  } else {
    const maxGeneration = Math.max(...stats.generations.map((g) => g.count));
    content = (
      <>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          <StatTile
            label={t('statistics.kpi.persons')}
            value={number.format(stats.total)}
            hint={t('statistics.kpi.gender', { male: stats.male, female: stats.female, unknown: stats.unknownGender })}
          />
          <StatTile
            label={t('statistics.kpi.deceasedLabel')}
            value={number.format(stats.deceased)}
            hint={t('statistics.kpi.withoutDeath', { count: stats.living })}
          />
          <StatTile label={t('statistics.kpi.relations')} value={number.format(stats.relations)} />
          <StatTile
            label={t('statistics.kpi.families')}
            value={number.format(stats.families)}
            hint={t('statistics.kpi.unconnected', { count: stats.unconnected })}
          />
          <StatTile
            label={t('statistics.kpi.lifespan')}
            value={stats.averageLifespan === null ? '—' : t('statistics.years', { count: stats.averageLifespan })}
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

        <ChartCard
          title={t('statistics.ages.title')}
          description={t('statistics.ages.description')}
          footnote={[
            stats.withoutAge ? t('statistics.ages.withoutAge', { count: stats.withoutAge }) : null,
            stats.probablyDeceased ? t('statistics.ages.probablyDeceased', { count: stats.probablyDeceased, max: MAX_PLAUSIBLE_AGE }) : null,
          ]
            .filter(Boolean)
            .join(' ')}
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

        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard title={t('statistics.surnames.title')} description={t('statistics.surnames.description', { count: stats.distinctSurnames })}>
            {stats.surnames.length ? (
              <BarList
                items={stats.surnames.map((s) => ({ key: s.label, label: s.label, value: s.count }))}
                label={t('statistics.surnames.title')}
                total={stats.total}
              />
            ) : (
              <Empty />
            )}
          </ChartCard>
          <ChartCard
            title={t('statistics.places.title')}
            description={t('statistics.places.description', { count: stats.withBirthplace, places: stats.distinctBirthplaces })}
          >
            {stats.birthplaces.length ? (
              <BarList
                items={stats.birthplaces.map((s) => ({ key: s.label, label: s.label, value: s.count }))}
                label={t('statistics.places.title')}
                total={stats.withBirthplace}
              />
            ) : (
              <Empty />
            )}
          </ChartCard>
        </div>

        <ChartCard
          title={t('statistics.generations.title')}
          description={t('statistics.generations.description')}
          footnote={t('statistics.generations.footnote', { families: stats.families, unconnected: stats.unconnected })}
        >
          <table className="w-full text-sm">
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
                    <span className="flex items-center gap-2">
                      <span className="h-3 rounded-r bg-chart" style={{ width: `${(g.count / maxGeneration) * 100}%` }} aria-hidden="true" />
                      <span className="tabular-nums">{number.format(g.count)}</span>
                    </span>
                  </td>
                  <td className="py-2 tabular-nums">
                    {g.earliestBirth === null ? '—' : g.earliestBirth === g.latestBirth ? g.earliestBirth : `${g.earliestBirth}–${g.latestBirth}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ChartCard>
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('nav.statistics')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('statistics.subtitle')}</p>
      </div>
      {content}
    </div>
  );
}
