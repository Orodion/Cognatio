import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import type { Person } from '@/features/persons/types/person';
import { GET_TREE_DATA } from '@/features/tree/graphql/treeQueries';
import { FamilyTree } from '@/features/tree/components/FamilyTree';
import type { TreeRelation } from '@/features/tree/lib/treeUtils';
import { relationGraphIds } from '@/features/persons/lib/relationGraph';
import { formatShortName } from '@/features/persons/lib/personUtils';

/** The relations of a person as a graph: parents above, partners beside, children below – like the family tree around the person */
export function PersonRelationGraph({ person, onlyIds }: { person: Person; onlyIds?: ReadonlySet<string> }) {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<{ getPersons: Person[]; getRelations: TreeRelation[] }>(GET_TREE_DATA, {
    fetchPolicy: 'cache-and-network',
  });
  const persons = useMemo(() => data?.getPersons ?? [], [data]);
  const relations = useMemo(() => data?.getRelations ?? [], [data]);
  // A new set on every render must not lay out the graph again: compare by content
  const onlyKey = onlyIds ? [...onlyIds].sort().join(',') : null;
  const visibleIds = useMemo(() => {
    const ids = relationGraphIds(
      person.id,
      persons.map((p) => p.id),
      relations,
    );
    // With a filter only the persons of the remaining relations (and the person itself)
    const only = onlyKey === null ? null : new Set(onlyKey.split(','));
    return only ? new Set([...ids].filter((id) => id === person.id || only.has(id))) : ids;
  }, [person.id, persons, relations, onlyKey]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t('relations.loading')}
      </div>
    );
  }
  if (error && !data) {
    return <div className="py-12 text-center text-destructive">{t('relations.error')}</div>;
  }

  return (
    <div className="space-y-2">
      <div
        className="flex h-[32rem] flex-col"
        role="region"
        aria-label={t('relations.graph.label', { name: formatShortName(person) })}
        data-testid="relation-graph"
      >
        <FamilyTree persons={persons} relations={relations} view="tree" focusId={person.id} visibleIds={visibleIds} fit="all" />
      </div>
      <p className="text-xs text-muted-foreground">{t('relations.graph.hint')}</p>
    </div>
  );
}
