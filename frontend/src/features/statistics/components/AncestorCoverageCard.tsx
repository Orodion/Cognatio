import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { apiErrorMessage } from '@/lib/apiErrors';
import { formatPersonName } from '@/features/persons/lib/personUtils';
import { useHomePerson } from '@/features/family-trees/lib/useFamilyTrees';
import { ChartCard, HintLink } from './ChartCard';
import { PersonChooser } from './PersonChooser';
import { WHOLE_TREE, filterLink } from '../lib/scope';
import type { Ancestors } from '../lib/types';

/** Generations with a name of their own (1 = the person, 2 = parents … 5 = great-great-grandparents) */
const NAMED_GENERATIONS = 5;

/**
 * How far the ancestors of a person are known, generation by generation. The ancestors come from the whole family tree;
 * their lists are therefore opened without the scope of the page.
 */
interface AncestorCoverageCardProps {
  ancestors: Ancestors;
  /** The start person was chosen on the page (not the home person or the one with the most ancestors) */
  chosen: boolean;
  onChooseStart: (personId: string) => void;
}

export function AncestorCoverageCard({ ancestors, chosen, onChooseStart }: AncestorCoverageCardProps) {
  const { t, i18n } = useTranslation();
  const [choosing, setChoosing] = useState(false);
  const { setHomePerson, saving, error } = useHomePerson();
  const number = new Intl.NumberFormat(i18n.language);
  const percent = new Intl.NumberFormat(i18n.language, { style: 'percent', maximumFractionDigits: 0 });
  const name = formatPersonName(ancestors.person);
  const collapse = ancestors.found ? 1 - ancestors.distinct / ancestors.found : 0;

  return (
    <ChartCard
      title={t('statistics.ancestors.title')}
      description={t('statistics.ancestors.description')}
      csv={() => [
        [
          t('statistics.generations.generation'),
          t('statistics.ancestors.possible'),
          t('statistics.ancestors.found'),
          t('statistics.ancestors.repeated'),
          t('statistics.ancestors.openEnds'),
          t('statistics.generations.births'),
          '',
        ],
        ...ancestors.generations.map((g) => [g.generation, g.possible, g.found, g.found - g.distinct, g.openEnds, g.earliestBirth, g.latestBirth]),
      ]}
      footnote={
        ancestors.found > ancestors.distinct
          ? t('statistics.ancestors.collapse', { share: percent.format(collapse), repeated: ancestors.found - ancestors.distinct, found: ancestors.found })
          : undefined
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm">
          {t('statistics.ancestors.of')}{' '}
          <Link to={`/persons/${ancestors.person.id}`} className="font-medium hover:underline">
            {name}
          </Link>
          {ancestors.isHomePerson && <span className="text-muted-foreground"> · {t('statistics.ancestors.homePerson')}</span>}
        </span>
        <span className="flex-1" />
        <Button size="sm" variant="outline" onClick={() => setChoosing(true)}>
          <UserRound className="h-4 w-4" />
          {t('statistics.ancestors.otherPerson')}
        </Button>
        {!ancestors.isHomePerson && (
          <Button size="sm" variant="outline" disabled={saving} onClick={() => void setHomePerson(ancestors.person.id)}>
            <Home className="h-4 w-4" />
            {t('statistics.ancestors.makeHome')}
          </Button>
        )}
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {apiErrorMessage(error, t)}
        </p>
      )}
      {!ancestors.hasHomePerson && !chosen && <p className="text-xs text-muted-foreground">{t('statistics.ancestors.noHome')}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm" aria-label={t('statistics.ancestors.title')}>
          <thead className="text-left text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 pr-4 font-normal">{t('statistics.generations.generation')}</th>
              <th className="py-2 pr-4 text-right font-normal">{t('statistics.ancestors.possible')}</th>
              <th className="w-1/3 py-2 pr-4 font-normal">{t('statistics.ancestors.found')}</th>
              <th className="py-2 pr-4 text-right font-normal">{t('statistics.ancestors.repeated')}</th>
              <th className="py-2 pr-4 text-right font-normal">{t('statistics.ancestors.openEnds')}</th>
              <th className="py-2 font-normal">{t('statistics.generations.births')}</th>
            </tr>
          </thead>
          <tbody>
            {ancestors.generations.map((g) => (
              <tr key={g.generation} className="border-b last:border-0">
                <td className="py-2 pr-4">
                  {g.generation}
                  {g.generation <= NAMED_GENERATIONS && <span className="text-muted-foreground"> · {t(`statistics.ancestors.names.${g.generation}`)}</span>}
                </td>
                <td className="py-2 pr-4 text-right tabular-nums">{number.format(g.possible)}</td>
                <td className="py-2 pr-4">
                  <Link to={filterLink(g.filter, WHOLE_TREE)} className="group flex items-center gap-2">
                    <span className="h-3 flex-1 rounded-r bg-muted" aria-hidden="true">
                      <span className="block h-3 rounded-r bg-chart group-hover:opacity-80" style={{ width: `${Math.min(1, g.found / g.possible) * 100}%` }} />
                    </span>
                    <span className="shrink-0 tabular-nums group-hover:underline">
                      {number.format(g.found)} ({percent.format(g.found / g.possible)})
                    </span>
                  </Link>
                </td>
                <td className="py-2 pr-4 text-right tabular-nums">{g.found > g.distinct ? number.format(g.found - g.distinct) : '—'}</td>
                <td className="py-2 pr-4 text-right tabular-nums">
                  {g.openEnds > 0 ? <HintLink to={filterLink(g.openEndsFilter, WHOLE_TREE)}>{number.format(g.openEnds)}</HintLink> : '—'}
                </td>
                <td className="py-2 tabular-nums">
                  {g.earliestBirth === null ? '—' : g.earliestBirth === g.latestBirth ? g.earliestBirth : `${g.earliestBirth}–${g.latestBirth}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PersonChooser
        id="statistics-ancestors-person"
        open={choosing}
        value={ancestors.person.id}
        onClose={() => setChoosing(false)}
        onChoose={(personId) => {
          setChoosing(false);
          onChooseStart(personId);
        }}
      />
    </ChartCard>
  );
}
