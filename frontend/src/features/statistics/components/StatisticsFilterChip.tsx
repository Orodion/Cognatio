import { Link } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { BarChart3, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { GET_PERSON } from '@/features/persons/graphql/personQueries';
import { formatPersonName } from '@/features/persons/lib/personUtils';
import type { Person } from '@/features/persons/types/person';
import { filterLabel, filterPersonId, isWholeTree, statisticsLink, type StatisticsScope } from '../lib/scope';
import { useScopeLabel } from '../lib/useScopeLabel';

interface StatisticsFilterChipProps {
  filter: string;
  scope: StatisticsScope;
  onClear: () => void;
}

/** Above the person list when it shows the persons behind a figure of the statistics */
export function StatisticsFilterChip({ filter, scope, onClear }: StatisticsFilterChipProps) {
  const { t } = useTranslation();
  const { label: scopeText } = useScopeLabel(scope);
  // Ancestor figures name the person they start from
  const personId = filterPersonId(filter);
  const { data } = useQuery<{ getPerson: Person | null }>(GET_PERSON, { variables: { id: personId }, skip: !personId });
  const label = filterLabel(filter, t, data?.getPerson ? formatPersonName(data.getPerson) : undefined);
  const text = isWholeTree(scope) ? label : `${label} · ${scopeText}`;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card px-4 py-2 text-sm">
      <BarChart3 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      <span className="text-muted-foreground">{t('statistics.filter.from')}</span>
      <span className="font-medium">{text}</span>
      <span className="flex-1" />
      <Link to={statisticsLink(scope)} className="text-primary underline-offset-4 hover:underline">
        {t('statistics.filter.back')}
      </Link>
      <Button variant="ghost" size="sm" onClick={onClear} aria-label={t('statistics.filter.clear')}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
