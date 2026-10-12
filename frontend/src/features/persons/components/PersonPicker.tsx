import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { GET_PERSONS } from '@/features/persons/graphql/personQueries';
import type { Person } from '@/features/persons/types/person';
import { comparePersonNames, formatPersonName, formatLifeDates } from '@/features/persons/lib/personUtils';
import { ClearableInput } from '@/components/ui/ClearableInput';
import { cn } from '@/lib/utils';

/** Maximum number of hits shown at once – with thousands of persons the list would otherwise become sluggish */
export const PICKER_LIMIT = 50;

interface PersonPickerProps {
  id: string;
  value: string;
  onChange: (personId: string, person: Person) => void;
  /** Persons that cannot be selected (e.g. the current person) */
  excludeIds?: string[];
}

/** Search field + result list to select an existing person from the database. */
export function PersonPicker({ id, value, onChange, excludeIds = [] }: PersonPickerProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const { data, loading } = useQuery<{ getPersons: Person[] }>(GET_PERSONS, {
    variables: { includeDeleted: false },
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data?.getPersons ?? [])
      .filter((p) => {
        if (excludeIds.includes(p.id)) {
          return false;
        }
        return !term || formatPersonName(p).toLowerCase().includes(term);
      })
      .sort(comparePersonNames);
  }, [data, excludeIds, search]);

  return (
    <div className="space-y-2">
      <ClearableInput
        id={id}
        placeholder={t('relations.form.searchPlaceholder')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onClear={() => setSearch('')}
        autoComplete="off"
      />
      <div className="h-40 overflow-y-auto rounded-md border p-1" role="listbox" aria-labelledby={id}>
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-full items-center justify-center p-4 text-center text-sm text-muted-foreground">
            {search ? t('persons.emptySearch', { query: search }) : t('relations.form.noPersons')}
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.slice(0, PICKER_LIMIT).map((p) => {
              const selected = value === p.id;
              const lifeDates = formatLifeDates(p);
              return (
                <button
                  key={p.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => onChange(p.id, p)}
                  className={cn(
                    'flex w-full flex-col items-start rounded-sm px-3 py-2 text-sm transition-colors',
                    selected ? 'bg-primary text-primary-foreground' : 'hover:bg-accent hover:text-accent-foreground',
                  )}
                >
                  <span className="font-medium">{formatPersonName(p)}</span>
                  {lifeDates && <span className={cn('text-xs', selected ? 'text-primary-foreground' : 'text-muted-foreground')}>{lifeDates}</span>}
                </button>
              );
            })}
            {filtered.length > PICKER_LIMIT && (
              <p className="px-3 py-2 text-xs text-muted-foreground">{t('relations.form.moreResults', { count: filtered.length - PICKER_LIMIT })}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
