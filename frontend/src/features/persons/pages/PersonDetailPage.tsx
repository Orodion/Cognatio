import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Loader2, Search } from 'lucide-react';
import { ClearableInput } from '@/components/ui/ClearableInput';
import { GET_PERSON, DELETE_PERSON, RESTORE_PERSON, HARD_DELETE_PERSON } from '@/features/persons/graphql/personQueries';
import type { Person } from '@/features/persons/types/person';
import { PersonProfileHeader } from '@/features/persons/components/PersonProfileHeader';
import { PersonOverviewTab } from '@/features/persons/components/PersonOverviewTab';
import { PersonRelationsTab } from '@/features/persons/components/PersonRelationsTab';
import { PersonTimelineTab } from '@/features/persons/components/PersonTimelineTab';
import { PersonNotesTab } from '@/features/persons/components/PersonNotesTab';
import { PersonMediaTab } from '@/features/persons/components/PersonMediaTab';
import { cn } from '@/lib/utils';
import { formatPersonName } from '@/features/persons/lib/personUtils';
import { PersonFormDialog } from '@/features/persons/components/PersonFormDialog';
import { apiErrorMessage } from '@/lib/apiErrors';
import type { DeletedPersonState } from './PersonListPage';
import { LOCATE_PERSON } from '@/features/family-trees/graphql/familyTreeQueries';
import { useFamilyTrees, useSwitchTree } from '@/features/family-trees/lib/useFamilyTrees';

type DetailTab = 'overview' | 'timeline' | 'relations' | 'notes' | 'media';

export function PersonDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [filter, setFilter] = useState('');

  // Another person: start without a filter
  useEffect(() => {
    setFilter('');
  }, [id]);

  const { data, loading, error, refetch } = useQuery<{ getPerson: Person | null }>(GET_PERSON, {
    variables: { id },
    skip: !id,
  });

  // Lists, family tree and recycle bin show the person or not depending on its status
  const affectedQueries = ['GetPersons', 'GetDeletedPersons', 'GetTreeData', 'GetPersonRelations'];
  const [deletePerson] = useMutation(DELETE_PERSON, { refetchQueries: affectedQueries });
  const [restorePerson] = useMutation(RESTORE_PERSON, { refetchQueries: affectedQueries });
  const [hardDeletePerson] = useMutation(HARD_DELETE_PERSON, { refetchQueries: affectedQueries });

  const person = data?.getPerson;

  // Link to a person of another family tree (e.g. from another tab): switch there
  const { active } = useFamilyTrees();
  const switchTree = useSwitchTree();
  const { data: located } = useQuery<{ locatePerson: string | null }>(LOCATE_PERSON, {
    variables: { id },
    skip: !id || loading || !!error || !!person,
    fetchPolicy: 'network-only',
  });
  const otherTreeId = located?.locatePerson && located.locatePerson !== active?.id ? located.locatePerson : null;
  useEffect(() => {
    if (otherTreeId) {
      switchTree(otherTreeId, { stay: true });
    }
  }, [otherTreeId, switchTree]);

  const tabs: Array<{ id: DetailTab; label: string }> = [
    { id: 'overview', label: t('personDetail.tabs.overview') },
    { id: 'timeline', label: t('personDetail.tabs.timeline') },
    { id: 'relations', label: t('personDetail.tabs.relations') },
    { id: 'notes', label: t('personDetail.tabs.notes') },
    { id: 'media', label: t('personDetail.tabs.media') },
  ];

  const handleDelete = async () => {
    if (!person) {
      return;
    }
    const confirmed = window.confirm(t('personDetail.deleteConfirm', { name: formatPersonName(person) }));
    if (confirmed) {
      await deletePerson({ variables: { id: person.id } });
      // The list then offers "undo"
      const state: DeletedPersonState = { deletedPerson: { id: person.id, name: formatPersonName(person) } };
      navigate('/persons', { state });
    }
  };

  const handleRestore = async () => {
    if (!person) {
      return;
    }
    try {
      await restorePerson({ variables: { id: person.id } });
      await refetch();
    } catch (err) {
      window.alert(apiErrorMessage(err, t));
    }
  };

  const handleHardDelete = async () => {
    if (!person) {
      return;
    }
    if (!window.confirm(t('trash.deleteForeverConfirm', { name: formatPersonName(person) }))) {
      return;
    }
    try {
      await hardDeletePerson({ variables: { id: person.id } });
      navigate('/trash');
    } catch (err) {
      window.alert(apiErrorMessage(err, t));
    }
  };

  if (loading || otherTreeId) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t('personDetail.loading')}
      </div>
    );
  }

  if (error || !person) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-muted-foreground">{t('personDetail.notFound')}</p>
        <Link to="/persons" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          {t('common.back')}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        to="/persons"
        className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('common.back')}
      </Link>

      <PersonProfileHeader
        person={person}
        onDelete={handleDelete}
        onEdit={() => setIsFormOpen(true)}
        onRestore={handleRestore}
        onHardDelete={handleHardDelete}
        onProfilePictureChange={() => refetch()}
      />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b">
        <nav className="-mb-px flex min-w-0 flex-1 gap-1 overflow-x-auto" aria-label={t('personDetail.tabsLabel')}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              // Active area recognisable for screen readers
              aria-current={activeTab === tab.id ? 'true' : undefined}
              className={cn(
                'whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        {/* One filter for the lists of the active area; the text stays when switching between the areas */}
        {activeTab !== 'overview' && (
          <div className="relative order-first w-full sm:order-none sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <ClearableInput
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              onClear={() => setFilter('')}
              onKeyDown={(e) => {
                if (e.key === 'Escape' && filter) {
                  e.preventDefault();
                  setFilter('');
                }
              }}
              placeholder={t(`personDetail.filter.placeholder.${activeTab}`)}
              aria-label={t(`personDetail.filter.placeholder.${activeTab}`)}
              className="h-9 pl-9 [&::-webkit-search-cancel-button]:hidden"
            />
          </div>
        )}
      </div>

      {activeTab === 'overview' && <PersonOverviewTab person={person} />}
      {activeTab === 'relations' && <PersonRelationsTab person={person} filter={filter} />}
      {activeTab === 'timeline' && <PersonTimelineTab person={person} filter={filter} />}
      {activeTab === 'notes' && <PersonNotesTab person={person} filter={filter} />}
      {activeTab === 'media' && <PersonMediaTab person={person} filter={filter} />}

      <PersonFormDialog open={isFormOpen} onClose={() => setIsFormOpen(false)} person={person} onSuccess={() => refetch()} />
    </div>
  );
}
