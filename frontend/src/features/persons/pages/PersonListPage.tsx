import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { LayoutGrid, List, Plus, Loader2, RotateCcw, X } from 'lucide-react';
import { GET_PERSONS, SEARCH, RESTORE_PERSON } from '@/features/persons/graphql/personQueries';
import type { Person, SearchResult } from '@/features/persons/types/person';
import { PersonCard } from '@/features/persons/components/PersonCard';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { useIncrementalList } from '@/features/persons/lib/useIncrementalList';
import { PersonFormDialog } from '@/features/persons/components/PersonFormDialog';

/** Navigation state after deleting a person (for "undo") */
export interface DeletedPersonState {
  deletedPerson?: { id: string; name: string };
}

export function PersonListPage() {
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q')?.trim() ?? '';
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const deletedPerson = (location.state as DeletedPersonState | null)?.deletedPerson;

  const [restorePerson, { loading: restoring }] = useMutation(RESTORE_PERSON, {
    refetchQueries: ['GetPersons', 'GetDeletedPersons', 'GetTreeData'],
  });

  // Hide the hint without creating a new history entry
  const dismissDeleted = () => navigate(location.pathname + location.search, { replace: true, state: null });

  const handleUndo = async () => {
    if (!deletedPerson) {
      return;
    }
    await restorePerson({ variables: { id: deletedPerson.id } });
    dismissDeleted();
  };

  const { data, loading, error, refetch } = useQuery<{ getPersons: Person[] } | { search: SearchResult[] }>(query ? SEARCH : GET_PERSONS, {
    // The server sorts equally relevant hits in the alphabet of the language of the app
    variables: query ? { query, language: i18n.language } : { includeDeleted: false },
  });

  const results = query ? (data as { search?: SearchResult[] })?.search : undefined;
  const persons: Person[] = useMemo(
    () => (query ? (results?.map((r) => r.person) ?? []) : ((data as { getPersons?: Person[] })?.getPersons ?? [])),
    [query, results, data],
  );
  // For a search: how the person was found (hint on the card)
  const matchedIn = useMemo(() => new Map(results?.map((r) => [r.person.id, r.matchedIn])), [results]);
  // Render large data step by step – all cards at once make the page sluggish from ~1000 persons
  const { visible, hasMore, showMore, sentinelRef, remaining } = useIncrementalList(persons, 60, query);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('persons.title')}</h1>
          {/* The status region stays in place so screen readers announce the new number of hits after a search */}
          <p className="min-h-5 text-sm text-muted-foreground" role="status">
            {!loading && t('persons.count', { count: persons.length })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              aria-label={t('persons.gridView')}
              className="rounded-r-none"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              aria-label={t('persons.listView')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button
            onClick={() => {
              setSelectedPerson(null);
              setIsFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            {t('persons.newPerson')}
          </Button>
        </div>
      </div>

      {deletedPerson && (
        <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-xs" role="status">
          <p className="flex-1 text-sm">{t('trash.movedToTrash', { name: deletedPerson.name })}</p>
          <Button variant="outline" size="sm" onClick={handleUndo} disabled={restoring}>
            <RotateCcw className="h-4 w-4" />
            {t('trash.undo')}
          </Button>
          <Button variant="ghost" size="sm" onClick={dismissDeleted} aria-label={t('common.close')}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          {t('persons.loading')}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-destructive">{t('persons.error')}</p>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>
            {t('common.retry')}
          </Button>
        </div>
      )}

      {!loading && !error && persons.length === 0 && (
        <div className="rounded-xl border bg-card p-12 text-center">
          <p className="text-muted-foreground">{query ? t('persons.emptySearch', { query }) : t('persons.empty')}</p>
        </div>
      )}

      {!loading && !error && persons.length > 0 && (
        <div className={cn(viewMode === 'grid' ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'flex flex-col gap-3')}>
          {visible.map((person) => (
            <PersonCard key={person.id} person={person} viewMode={viewMode} matchedIn={matchedIn.get(person.id)} />
          ))}
        </div>
      )}

      {!loading && !error && hasMore && (
        <div ref={sentinelRef} className="flex justify-center">
          <Button variant="outline" onClick={showMore}>
            {t('persons.showMore', { count: remaining })}
          </Button>
        </div>
      )}

      <PersonFormDialog open={isFormOpen} onClose={() => setIsFormOpen(false)} person={selectedPerson} onSuccess={() => refetch()} />
    </div>
  );
}
