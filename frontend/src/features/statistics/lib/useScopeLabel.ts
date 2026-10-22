import { useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { GET_PERSON } from '@/features/persons/graphql/personQueries';
import { formatPersonName } from '@/features/persons/lib/personUtils';
import type { Person } from '@/features/persons/types/person';
import { scopeLabel, type StatisticsScope } from './scope';

/** The scope as text, with the name of its person (loaded when the scope starts from a person) */
export function useScopeLabel(scope: StatisticsScope) {
  const { t } = useTranslation();
  const { data } = useQuery<{ getPerson: Person | null }>(GET_PERSON, { variables: { id: scope.personId }, skip: !scope.personId });
  const person = scope.personId ? (data?.getPerson ?? null) : null;
  return { label: scopeLabel(scope, person ? formatPersonName(person) : undefined, t), person };
}
