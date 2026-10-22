import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Loader2, Plus, Trash2, Users, Heart, Baby, UserPlus, Network } from 'lucide-react';
import type { Person } from '@/features/persons/types/person';
import type { PersonRelationDetail } from '@/features/persons/types/relation';
import { GET_PERSON_RELATIONS, DELETE_RELATION } from '@/features/persons/graphql/relationQueries';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { getInitials, formatLifeDates, formatShortName, formatPersonName } from '@/features/persons/lib/personUtils';
import { Highlight } from '@/components/ui/Highlight';
import { matchesFilter } from '@/lib/textFilter';
import { RelationFormDialog } from './RelationFormDialog';
import { PersonRelationGraph } from './PersonRelationGraph';
import { useSettingsStore } from '@/stores/settingsStore';
import { formatDay } from '@/lib/formatDate';
import { CitationMark } from '@/features/sources/components/CitationMark';
import { usePersonCitations } from '@/features/sources/lib/personFacts';

interface PersonRelationsTabProps {
  person: Person;
  /** Words from the filter field of the page; list and graph show only matching relations */
  filter?: string;
  /** Opens the sources of the person (the mark at a relation with citations) */
  onShowSources?: () => void;
}

const ROLE_ICONS: Record<string, typeof Users> = {
  PARENT: Users,
  CHILD: Baby,
  PARTNER: Heart,
  SIBLING: UserPlus,
  OTHER: Users,
};

const ROLE_GROUPS = ['PARENT', 'CHILD', 'PARTNER', 'SIBLING', 'OTHER'] as const;

// Concrete role (from the backend) -> group in the display
const ROLE_TO_GROUP: Record<string, (typeof ROLE_GROUPS)[number]> = {
  MOTHER: 'PARENT',
  FATHER: 'PARENT',
  PARENT: 'PARENT',
  CHILD: 'CHILD',
  HUSBAND: 'PARTNER',
  WIFE: 'PARTNER',
  SPOUSE: 'PARTNER',
  LIFE_PARTNER: 'PARTNER',
  PARTNER: 'PARTNER',
  SIBLING: 'SIBLING',
};

export function PersonRelationsTab({ person, filter = '', onShowSources }: PersonRelationsTabProps) {
  const { t, i18n } = useTranslation();
  const { countFor } = usePersonCitations(person.id);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const showGraph = useSettingsStore((s) => s.showRelationGraph);
  const setShowGraph = useSettingsStore((s) => s.setShowRelationGraph);

  const { data, loading, error, refetch } = useQuery<{
    getPersonRelations: PersonRelationDetail[];
  }>(GET_PERSON_RELATIONS, {
    variables: { personId: person.id },
  });

  const [deleteRelation] = useMutation(DELETE_RELATION, {
    refetchQueries: ['GetTreeData'],
    onCompleted: () => refetch(),
  });

  const handleDelete = async (relationId: string, otherPersonName: string) => {
    const confirmed = window.confirm(t('relations.deleteConfirm', { name: otherPersonName }));
    if (confirmed) {
      await deleteRelation({ variables: { id: relationId } });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t('relations.loading')}
      </div>
    );
  }

  if (error) {
    return <div className="py-12 text-center text-destructive">{t('relations.error')}</div>;
  }

  const allRelations = data?.getPersonRelations ?? [];
  const filtering = filter.trim() !== '';
  const relations = allRelations.filter((r) =>
    matchesFilter(
      [
        formatPersonName(r.otherPerson),
        formatShortName(r.otherPerson),
        t(`relations.types.${r.role}`, r.role),
        t(`relations.roles.${ROLE_TO_GROUP[r.role] ?? 'OTHER'}`),
        r.label,
        r.note,
        formatLifeDates(r.otherPerson, { born: t('persons.born'), died: t('persons.died') }),
        r.startDate ? formatDay(r.startDate, i18n.language) : null,
        r.endDate ? formatDay(r.endDate, i18n.language) : null,
      ],
      filter,
    ),
  );
  // The graph shows the persons that are left (and the person itself)
  const graphIds = filtering ? new Set(relations.map((r) => r.otherPerson.id)) : undefined;

  // Group by role
  const grouped = ROLE_GROUPS.reduce(
    (acc, role) => {
      acc[role] = relations.filter((r) => (ROLE_TO_GROUP[r.role] ?? 'OTHER') === role);
      return acc;
    },
    {} as Record<string, PersonRelationDetail[]>,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">
          {t('relations.title')} ({relations.length})
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {/* The graph is shown above the list, not instead of it */}
          <Button variant={showGraph ? 'default' : 'outline'} size="sm" aria-pressed={showGraph} onClick={() => setShowGraph(!showGraph)}>
            <Network className="h-4 w-4" />
            {t('relations.graph.button')}
          </Button>
          <Button variant="outline" onClick={() => setIsFormOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            {t('relations.add')}
          </Button>
        </div>
      </div>

      {/* Wide screens: the list on the left, the graph on the right; narrow screens: the graph above the list */}
      <div className={allRelations.length > 0 && showGraph ? 'grid gap-6 xl:grid-cols-2 xl:items-start' : undefined}>
        {allRelations.length > 0 && showGraph && (
          <div className="order-first min-w-0 xl:sticky xl:top-4 xl:order-none xl:col-start-2 xl:row-start-1">
            <PersonRelationGraph person={person} onlyIds={graphIds} />
          </div>
        )}
        <div className="min-w-0 space-y-6 xl:col-start-1 xl:row-start-1">
          {relations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {allRelations.length > 0 && filtering ? t('personDetail.filter.noMatches', { query: filter.trim() }) : t('relations.empty')}
              </CardContent>
            </Card>
          ) : (
            ROLE_GROUPS.filter((role) => grouped[role].length > 0).map((role) => {
              const Icon = ROLE_ICONS[role] || Users;
              return (
                <Card key={role} role="region" aria-label={t(`relations.roles.${role}`)}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      {t(`relations.roles.${role}`)}
                      <Badge variant="secondary" className="ml-1">
                        {grouped[role].length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {grouped[role].map((rel) => {
                        const other = rel.otherPerson;
                        const lifeDates = formatLifeDates(other, {
                          born: t('persons.born'),
                          died: t('persons.died'),
                        });
                        const otherName = formatShortName(other);

                        return (
                          <div key={rel.id} className="flex items-center gap-4 rounded-lg border bg-background p-3 transition-colors hover:bg-accent/50">
                            {/* Same target as the name link – offer it only once for keyboard and screen readers */}
                            <Link to={`/persons/${other.id}`} tabIndex={-1} aria-hidden="true">
                              <Avatar initials={getInitials(other)} imageUrl={other.profilePictureUrl} size="sm" />
                            </Link>
                            <div className="min-w-0 flex-1">
                              <Link to={`/persons/${other.id}`} className="font-medium hover:underline">
                                <Highlight text={otherName} query={filter} />
                              </Link>
                              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                <Badge variant="secondary" className="text-xs">
                                  {t(`relations.types.${rel.role}`, rel.role)}
                                </Badge>
                                <CitationMark
                                  count={countFor({ relationId: rel.id })}
                                  fact={t(`relations.types.${rel.role}`, rel.role)}
                                  onClick={onShowSources}
                                />
                                {lifeDates && <span>{lifeDates}</span>}
                                {(rel.startDate || rel.endDate) && (
                                  <span>
                                    {rel.startDate ? formatDay(rel.startDate, i18n.language) : '?'}
                                    {' – '}
                                    {rel.endDate ? formatDay(rel.endDate, i18n.language) : t('relations.ongoing')}
                                  </span>
                                )}
                                {rel.label && (
                                  <Badge variant="outline" className="text-xs">
                                    <Highlight text={rel.label} query={filter} />
                                  </Badge>
                                )}
                              </div>
                              {rel.note && (
                                <p className="mt-1 text-xs text-muted-foreground italic">
                                  <Highlight text={rel.note} query={filter} />
                                </p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(rel.id, otherName)}
                              aria-label={t('relations.deleteLabel', { name: otherName })}
                              title={t('relations.deleteLabel', { name: otherName })}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      <RelationFormDialog open={isFormOpen} onClose={() => setIsFormOpen(false)} currentPersonId={person.id} onSuccess={() => refetch()} />
    </div>
  );
}
