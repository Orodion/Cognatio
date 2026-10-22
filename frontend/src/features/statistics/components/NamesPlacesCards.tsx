import { useTranslation } from 'react-i18next';
import { BarList } from './BarList';
import { ChartCard, Empty, HintLink } from './ChartCard';
import { filterLink, type StatisticsScope } from '../lib/scope';
import type { FirstNames, Migration, RankedName } from '../lib/types';

function NameLinks({ names, scope }: { names: RankedName[]; scope: StatisticsScope }) {
  const { i18n } = useTranslation();
  const number = new Intl.NumberFormat(i18n.language);
  if (!names.length) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <span>
      {names.map((n, i) => (
        <span key={n.label}>
          {i > 0 && ', '}
          <HintLink to={filterLink(n.filter, scope)}>{n.label}</HintLink> <span className="text-xs text-muted-foreground">({number.format(n.count)})</span>
        </span>
      ))}
    </span>
  );
}

/** The most frequent first names per gender and the fashion of names per century of birth */
export function FirstNamesCard({ names, scope }: { names: FirstNames; scope: StatisticsScope }) {
  const { t } = useTranslation();
  const items = (list: RankedName[]) => list.map((n) => ({ key: n.label, label: n.label, value: n.count, to: filterLink(n.filter, scope) }));
  return (
    <ChartCard
      title={t('statistics.firstNames.title')}
      description={t('statistics.firstNames.description')}
      csv={() => [
        [t('statistics.lives.century'), t('statistics.lives.genders.all'), t('statistics.firstNames.title'), t('statistics.generations.persons')],
        ...(['male', 'female'] as const).flatMap((g) =>
          names[g].map((n) => [t('statistics.lives.allCenturies'), t(`statistics.lives.genders.${g}`), n.label, n.count]),
        ),
        ...names.fashion.flatMap((f) =>
          (['male', 'female'] as const).flatMap((g) =>
            f[g].map((n) => [`${f.century}–${f.century + 99}`, t(`statistics.lives.genders.${g}`), n.label, n.count]),
          ),
        ),
      ]}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {(['male', 'female'] as const).map((gender) => (
          <section key={gender} className="space-y-2">
            <h3 className="text-sm font-medium">{t(`statistics.lives.genders.${gender}`)}</h3>
            {names[gender].length ? <BarList items={items(names[gender])} label={t(`statistics.firstNames.${gender}`)} /> : <Empty />}
          </section>
        ))}
      </div>
      {names.fashion.length > 0 && (
        <table className="w-full text-sm" aria-label={t('statistics.firstNames.fashion')}>
          <caption className="pb-2 pt-4 text-left text-sm font-medium">{t('statistics.firstNames.fashion')}</caption>
          <thead className="text-left text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 pr-4 font-normal">{t('statistics.lives.century')}</th>
              <th className="py-2 pr-4 font-normal">{t('statistics.lives.genders.male')}</th>
              <th className="py-2 font-normal">{t('statistics.lives.genders.female')}</th>
            </tr>
          </thead>
          <tbody>
            {names.fashion.map((row) => (
              <tr key={row.century} className="border-b last:border-0">
                <td className="py-2 pr-4 tabular-nums">{`${row.century}–${row.century + 99}`}</td>
                <td className="py-2 pr-4">
                  <NameLinks names={row.male} scope={scope} />
                </td>
                <td className="py-2">
                  <NameLinks names={row.female} scope={scope} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </ChartCard>
  );
}

/** Who stayed, the most frequent moves and the places with their persons and years */
export function MigrationCard({ migration, scope }: { migration: Migration; scope: StatisticsScope }) {
  const { t, i18n } = useTranslation();
  const number = new Intl.NumberFormat(i18n.language);
  const percent = new Intl.NumberFormat(i18n.language, { style: 'percent', maximumFractionDigits: 0 });
  const both = migration.stayed + migration.moved;
  return (
    <ChartCard
      title={t('statistics.migration.title')}
      description={t('statistics.migration.description')}
      footnote={migration.morePlaces > 0 ? t('statistics.migration.morePlaces', { count: migration.morePlaces }) : undefined}
      csv={() => [
        [t('statistics.migration.place'), t('statistics.generations.persons'), t('statistics.migration.years'), ''],
        ...migration.places.map((p) => [p.place, p.persons, p.firstYear, p.lastYear]),
        [],
        [t('statistics.migration.moves'), '', t('statistics.generations.persons')],
        ...migration.moves.map((m) => [m.from, m.to, m.count]),
      ]}
    >
      {both > 0 && (
        <p className="text-sm">
          {t('statistics.migration.stayedIntro', { share: percent.format(migration.stayed / both) })}{' '}
          <HintLink to={filterLink('stayed:yes', scope)}>{t('statistics.migration.stayed', { count: migration.stayed })}</HintLink>
          {' · '}
          <HintLink to={filterLink('stayed:no', scope)}>{t('statistics.migration.moved', { count: migration.moved })}</HintLink>
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-2">
          <h3 className="text-sm font-medium">{t('statistics.migration.moves')}</h3>
          {migration.moves.length ? (
            <BarList
              items={migration.moves.map((m) => ({ key: m.filter, label: `${m.from} → ${m.to}`, value: m.count, to: filterLink(m.filter, scope) }))}
              label={t('statistics.migration.moves')}
              labelWidth="w-48"
            />
          ) : (
            <Empty />
          )}
        </section>
        <section className="space-y-2">
          <h3 className="text-sm font-medium">{t('statistics.migration.places')}</h3>
          {migration.places.length ? (
            <table className="w-full text-sm" aria-label={t('statistics.migration.places')}>
              <thead className="text-left text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pr-4 font-normal">{t('statistics.migration.place')}</th>
                  <th className="py-2 pr-4 text-right font-normal">{t('statistics.generations.persons')}</th>
                  <th className="py-2 font-normal">{t('statistics.migration.years')}</th>
                </tr>
              </thead>
              <tbody>
                {migration.places.map((p) => (
                  <tr key={p.filter} className="border-b last:border-0">
                    <td className="py-1.5 pr-4">{p.place}</td>
                    <td className="py-1.5 pr-4 text-right tabular-nums">
                      <HintLink to={filterLink(p.filter, scope)}>{number.format(p.persons)}</HintLink>
                    </td>
                    <td className="py-1.5 tabular-nums">
                      {p.firstYear === null ? '—' : p.firstYear === p.lastYear ? p.firstYear : `${p.firstYear}–${p.lastYear}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty />
          )}
        </section>
      </div>
    </ChartCard>
  );
}
