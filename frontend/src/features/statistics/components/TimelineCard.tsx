import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { ChartCard, Empty, HintLink } from './ChartCard';
import { filterLink, type StatisticsScope } from '../lib/scope';
import type { DecadeRow, Timeline } from '../lib/types';

const MEASURES = ['births', 'deaths', 'weddings'] as const;
type Measure = (typeof MEASURES)[number];
const FILTER: Record<Measure, string> = { births: 'bornDecade', deaths: 'diedDecade', weddings: 'marriedDecade' };
/** Height of the plot in pixels */
const PLOT_HEIGHT = 160;

/** Labels under the axis: every decade on a short axis, else every 50 or 100 years */
const labelled = (decades: DecadeRow[], decade: number) => decade % (decades.length <= 12 ? 10 : decades.length <= 30 ? 50 : 100) === 0;

/**
 * Births, deaths or weddings per decade – one measure at a time on one axis. Every bar leads to its persons; a bar of an
 * empty decade stays, so gaps in the research show.
 */
export function TimelineCard({ timeline, scope }: { timeline: Timeline; scope: StatisticsScope }) {
  const { t, i18n } = useTranslation();
  const [measure, setMeasure] = useState<Measure>('births');
  const [active, setActive] = useState<number | null>(null);
  const number = new Intl.NumberFormat(i18n.language);
  const max = Math.max(1, ...timeline.decades.map((d) => d[measure]));
  const range = (decade: number) => `${decade}–${decade + 9}`;
  const measureName = t(`statistics.timeline.measures.${measure}`);

  const without = (timeline.withoutBirthYear > 0 || timeline.withoutDeathYear > 0) && (
    <>
      {t('statistics.timeline.without')}{' '}
      {timeline.withoutBirthYear > 0 && (
        <HintLink to={filterLink('noBirthYear', scope)}>{t('statistics.timeline.withoutBirths', { count: timeline.withoutBirthYear })}</HintLink>
      )}
      {timeline.withoutBirthYear > 0 && timeline.withoutDeathYear > 0 && ', '}
      {timeline.withoutDeathYear > 0 && (
        <HintLink to={filterLink('noDeathYear', scope)}>{t('statistics.timeline.withoutDeaths', { count: timeline.withoutDeathYear })}</HintLink>
      )}
    </>
  );

  return (
    <ChartCard
      title={t('statistics.timeline.title')}
      description={t('statistics.timeline.description')}
      footnote={without}
      csv={() => [
        ['', ...MEASURES.map((m) => t(`statistics.timeline.measures.${m}`))],
        ...timeline.decades.map((d) => [range(d.decade), d.births, d.deaths, d.weddings]),
      ]}
    >
      <div className="flex gap-1" role="group" aria-label={t('statistics.timeline.measure')}>
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
            {t(`statistics.timeline.measures.${m}`)}
          </button>
        ))}
      </div>
      {timeline.decades.length === 0 ? (
        <Empty />
      ) : (
        <div className="overflow-x-auto pt-10">
          <ul
            className="flex items-end gap-0.5 border-b"
            style={{ height: PLOT_HEIGHT, minWidth: timeline.decades.length * 8 }}
            aria-label={t('statistics.timeline.chart', { measure: measureName })}
          >
            {timeline.decades.map((d) => {
              const value = d[measure];
              const label = t('statistics.timeline.bar', { decades: range(d.decade), measure: measureName, count: value });
              const bar = (
                <span
                  className={cn('block w-full rounded-t-[4px] bg-chart transition-opacity', active !== null && active !== d.decade && 'opacity-60')}
                  style={{ height: `${(value / max) * 100}%`, minHeight: value ? 2 : 0 }}
                  aria-hidden="true"
                />
              );
              const handlers = {
                onPointerEnter: () => setActive(d.decade),
                onPointerLeave: () => setActive((a) => (a === d.decade ? null : a)),
                onFocus: () => setActive(d.decade),
                onBlur: () => setActive((a) => (a === d.decade ? null : a)),
              };
              return (
                <li key={d.decade} className="relative flex h-full flex-1 items-end">
                  {value > 0 ? (
                    <Link
                      to={filterLink(`${FILTER[measure]}:${d.decade}`, scope)}
                      aria-label={label}
                      className="flex h-full w-full items-end outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                      {...handlers}
                    >
                      {bar}
                    </Link>
                  ) : (
                    <span className="flex h-full w-full items-end" {...handlers}>
                      {bar}
                      <span className="sr-only">{label}</span>
                    </span>
                  )}
                  {active === d.decade && (
                    <span
                      role="tooltip"
                      className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md"
                    >
                      <strong className="font-semibold">{number.format(value)}</strong>
                      <span className="text-muted-foreground"> · {range(d.decade)}</span>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="flex h-5 gap-0.5 pt-1 text-xs text-muted-foreground" aria-hidden="true" style={{ minWidth: timeline.decades.length * 8 }}>
            {timeline.decades.map((d) => (
              <span key={d.decade} className="relative flex-1">
                {labelled(timeline.decades, d.decade) && <span className="absolute left-0 whitespace-nowrap">{d.decade}</span>}
              </span>
            ))}
          </div>
        </div>
      )}
    </ChartCard>
  );
}
