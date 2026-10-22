import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { BookMarked, Landmark, Library, Loader2, RotateCcw, Trash2 } from 'lucide-react';
import { GET_DELETED_PERSONS, RESTORE_PERSON, HARD_DELETE_PERSON } from '@/features/persons/graphql/personQueries';
import { GET_DELETED_FAMILY_TREES, HARD_DELETE_FAMILY_TREE, RESTORE_FAMILY_TREE } from '@/features/family-trees/graphql/familyTreeQueries';
import type { FamilyTree } from '@/features/family-trees/types/familyTree';
import { useFamilyTrees } from '@/features/family-trees/lib/useFamilyTrees';
import type { Person } from '@/features/persons/types/person';
import {
  GET_DELETED_REPOSITORIES,
  GET_DELETED_SOURCES,
  HARD_DELETE_REPOSITORY,
  HARD_DELETE_SOURCE,
  RESTORE_REPOSITORY,
  RESTORE_SOURCE,
  LIBRARY_CHANGED,
} from '@/features/sources/graphql/sourceQueries';
import type { Repository, Source } from '@/features/sources/types/source';
import { formatPersonName, formatLifeDates, getInitials } from '@/features/persons/lib/personUtils';
import { formatDate } from '@/lib/formatDate';
import { apiErrorMessage } from '@/lib/apiErrors';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

const AFFECTED_QUERIES = ['GetPersons', 'GetDeletedPersons', 'GetTreeData', 'GetPersonRelations'];
const TREE_QUERIES = ['GetFamilyTrees', 'GetDeletedFamilyTrees'];

/** Recycle bin: restore or permanently delete deleted persons of the active family tree and deleted family trees. */
export function TrashPage() {
  const { t, i18n } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { active } = useFamilyTrees();
  // Without a family tree (all in the recycle bin) there are only deleted family trees
  const { data, loading } = useQuery<{ getDeletedPersons: Person[] }>(GET_DELETED_PERSONS, {
    fetchPolicy: 'cache-and-network',
    skip: !active,
  });
  const [restorePerson] = useMutation(RESTORE_PERSON, { refetchQueries: AFFECTED_QUERIES });
  const [hardDeletePerson] = useMutation(HARD_DELETE_PERSON, { refetchQueries: AFFECTED_QUERIES });

  const run = async (id: string, action: () => Promise<unknown>) => {
    setError(null);
    setBusyId(id);
    try {
      await action();
    } catch (err) {
      setError(apiErrorMessage(err, t));
    } finally {
      setBusyId(null);
    }
  };

  const handleHardDelete = (person: Person) => {
    if (!window.confirm(t('trash.deleteForeverConfirm', { name: formatPersonName(person) }))) {
      return;
    }
    run(person.id, () => hardDeletePerson({ variables: { id: person.id } }));
  };

  const persons = data?.getDeletedPersons ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('trash.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('trash.description')}</p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive" role="alert">
          {error}
        </div>
      )}

      {active && (
        <section className="space-y-3" aria-labelledby="deleted-persons">
          <h2 id="deleted-persons" className="text-lg font-semibold">
            {t('trash.personsTitle', { name: active?.name ?? '' })}
          </h2>
          {loading && !data ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              {t('common.loading')}
            </div>
          ) : persons.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">{t('trash.emptyPersons')}</CardContent>
            </Card>
          ) : (
            <ul className="space-y-3">
              {persons.map((person) => {
                const lifeDates = formatLifeDates(person, { born: t('persons.born'), died: t('persons.died') });
                const busy = busyId === person.id;
                return (
                  <li key={person.id} className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-xs sm:flex-row sm:items-center">
                    <Avatar initials={getInitials(person)} imageUrl={person.profilePictureUrl} size="sm" />
                    <div className="min-w-0 flex-1">
                      <Link to={`/persons/${person.id}`} className="font-medium hover:underline">
                        {formatPersonName(person)}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {[
                          lifeDates,
                          person.deletedAt &&
                            t('trash.deletedAt', {
                              date: formatDate(person.deletedAt, i18n.language),
                            }),
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" disabled={busy} onClick={() => run(person.id, () => restorePerson({ variables: { id: person.id } }))}>
                        <RotateCcw className="h-4 w-4" />
                        {t('trash.restore')}
                      </Button>
                      <Button variant="destructive" size="sm" disabled={busy} onClick={() => handleHardDelete(person)}>
                        <Trash2 className="h-4 w-4" />
                        {t('trash.deleteForever')}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {active && <DeletedLibrary />}
      <DeletedTrees />
    </div>
  );
}

/** Sources and archives in the recycle bin – they belong to all family trees; only shown if there are any */
function DeletedLibrary() {
  const { t, i18n } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { data: sources } = useQuery<{ deletedSources: Source[] }>(GET_DELETED_SOURCES, { fetchPolicy: 'cache-and-network' });
  const { data: repositories } = useQuery<{ deletedRepositories: Repository[] }>(GET_DELETED_REPOSITORIES, { fetchPolicy: 'cache-and-network' });
  const [restoreSource] = useMutation(RESTORE_SOURCE, LIBRARY_CHANGED);
  const [hardDeleteSource] = useMutation(HARD_DELETE_SOURCE, LIBRARY_CHANGED);
  const [restoreRepository] = useMutation(RESTORE_REPOSITORY, LIBRARY_CHANGED);
  const [hardDeleteRepository] = useMutation(HARD_DELETE_REPOSITORY, LIBRARY_CHANGED);
  const deletedSources = sources?.deletedSources ?? [];
  const deletedRepositories = repositories?.deletedRepositories ?? [];
  if (!deletedSources.length && !deletedRepositories.length) {
    return null;
  }

  const run = async (id: string, action: () => Promise<unknown>) => {
    setError(null);
    setBusyId(id);
    try {
      await action();
    } catch (err) {
      setError(apiErrorMessage(err, t));
    } finally {
      setBusyId(null);
    }
  };

  const entries = [
    ...deletedSources.map((s) => ({
      id: s.id,
      icon: BookMarked,
      name: s.title,
      details: t('trash.library.sourceDetails', { citations: s.citationCount, links: s.linkCount }),
      deletedAt: s.deletedAt,
      restore: () => restoreSource({ variables: { id: s.id } }),
      confirm: t('trash.library.deleteSourceConfirm', { name: s.title, citations: s.citationCount, links: s.linkCount }),
      remove: () => hardDeleteSource({ variables: { id: s.id } }),
    })),
    ...deletedRepositories.map((r) => ({
      id: r.id,
      icon: Landmark,
      name: r.name,
      details: t('trash.library.repositoryDetails', { count: r.sourceCount ?? 0 }),
      deletedAt: r.deletedAt,
      restore: () => restoreRepository({ variables: { id: r.id } }),
      confirm: t('trash.library.deleteRepositoryConfirm', { name: r.name }),
      remove: () => hardDeleteRepository({ variables: { id: r.id } }),
    })),
  ];

  return (
    <section className="space-y-3" aria-labelledby="deleted-library">
      <h2 id="deleted-library" className="text-lg font-semibold">
        {t('trash.library.title')}
      </h2>
      <p className="text-sm text-muted-foreground">{t('trash.library.description')}</p>
      {error && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive" role="alert">
          {error}
        </div>
      )}
      <ul className="space-y-3">
        {entries.map((entry) => {
          const busy = busyId === entry.id;
          const Icon = entry.icon;
          return (
            <li key={entry.id} className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-xs sm:flex-row sm:items-center">
              <Icon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{entry.name}</p>
                <p className="text-sm text-muted-foreground">
                  {[entry.details, entry.deletedAt && t('trash.deletedAt', { date: formatDate(entry.deletedAt, i18n.language) })].filter(Boolean).join(' · ')}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  aria-label={t('trash.library.restoreLabel', { name: entry.name })}
                  onClick={() => run(entry.id, entry.restore)}
                >
                  <RotateCcw className="h-4 w-4" />
                  {t('trash.restore')}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={busy}
                  aria-label={t('trash.library.deleteForeverLabel', { name: entry.name })}
                  onClick={() => {
                    if (window.confirm(entry.confirm)) {
                      void run(entry.id, entry.remove);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  {t('trash.deleteForever')}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Deleted family trees – only shown if there are any */
function DeletedTrees() {
  const { t, i18n } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { data } = useQuery<{ deletedFamilyTrees: FamilyTree[] }>(GET_DELETED_FAMILY_TREES, { fetchPolicy: 'cache-and-network' });
  const [restoreTree] = useMutation(RESTORE_FAMILY_TREE, { refetchQueries: TREE_QUERIES });
  const [hardDeleteTree] = useMutation(HARD_DELETE_FAMILY_TREE, { refetchQueries: TREE_QUERIES });
  const trees = data?.deletedFamilyTrees ?? [];
  if (!trees.length) {
    return null;
  }

  const run = async (id: string, action: () => Promise<unknown>) => {
    setError(null);
    setBusyId(id);
    try {
      await action();
    } catch (err) {
      setError(apiErrorMessage(err, t));
    } finally {
      setBusyId(null);
    }
  };

  const handleHardDelete = (tree: FamilyTree) => {
    if (!window.confirm(t('familyTrees.trash.deleteForeverConfirm', { name: tree.name, count: tree.personCount }))) {
      return;
    }
    run(tree.id, () => hardDeleteTree({ variables: { id: tree.id } }));
  };

  return (
    <section className="space-y-3" aria-labelledby="deleted-trees">
      <h2 id="deleted-trees" className="text-lg font-semibold">
        {t('familyTrees.trash.title')}
      </h2>
      {error && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive" role="alert">
          {error}
        </div>
      )}
      <ul className="space-y-3">
        {trees.map((tree) => {
          const busy = busyId === tree.id;
          return (
            <li key={tree.id} className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-xs sm:flex-row sm:items-center">
              <Library className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{tree.name}</p>
                <p className="text-sm text-muted-foreground">
                  {[
                    t('familyTrees.persons', { count: tree.personCount }),
                    tree.deletedAt && t('trash.deletedAt', { date: formatDate(tree.deletedAt, i18n.language) }),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  aria-label={t('familyTrees.trash.restoreLabel', { name: tree.name })}
                  onClick={() => run(tree.id, () => restoreTree({ variables: { id: tree.id } }))}
                >
                  <RotateCcw className="h-4 w-4" />
                  {t('trash.restore')}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={busy}
                  aria-label={t('familyTrees.trash.deleteForeverLabel', { name: tree.name })}
                  onClick={() => handleHardDelete(tree)}
                >
                  <Trash2 className="h-4 w-4" />
                  {t('trash.deleteForever')}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
