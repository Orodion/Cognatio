import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { SIMILAR_PERSONS } from '@/features/persons/graphql/personQueries';
import type { Person } from '@/features/persons/types/person';
import { formatLifeDates, formatPersonName } from '@/features/persons/lib/personUtils';
import { useDebouncedValue } from '@/lib/useDebouncedValue';

interface SimilarPersonsHintProps {
  firstName: string;
  lastName?: string | null;
  birthName?: string | null;
  birthDate?: string | null;
}

type SimilarPerson = Pick<Person, 'id' | 'title' | 'firstName' | 'middleName' | 'lastName' | 'birthName' | 'birthDate' | 'birthPlace' | 'deathDate'>;

/** Delay after the last keystroke before searching */
const DELAY_MS = 400;

/**
 * Hint when creating a person if there already is a person with a (phonetically) equal first and family name
 * and a matching birth year. Does not block – saving is still possible.
 */
export function SimilarPersonsHint({ firstName, lastName, birthName, birthDate }: SimilarPersonsHintProps) {
  const { t } = useTranslation();
  const input = useMemo(
    () => ({
      firstName: firstName.trim(),
      lastName: lastName?.trim() || null,
      birthName: birthName?.trim() || null,
      birthDate: birthDate?.trim() || null,
    }),
    [firstName, lastName, birthName, birthDate],
  );
  const variables = useDebouncedValue(input, DELAY_MS);
  // Without a family name every equal first name would be a hit
  const skip = !variables.firstName || !(variables.lastName || variables.birthName);
  const { data } = useQuery<{ similarPersons: SimilarPerson[] }>(SIMILAR_PERSONS, { variables, skip, fetchPolicy: 'network-only' });

  const similar = skip ? [] : (data?.similarPersons ?? []);
  // The status region stays in place so screen readers announce the hint when it appears
  return (
    <div role="status">
      {similar.length > 0 && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <p className="flex items-center gap-2 font-medium">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            {t('form.similar.title')}
          </p>
          <ul className="mt-2 space-y-1">
            {similar.map((p) => {
              const name = formatPersonName(p);
              const dates = formatLifeDates(p, { born: t('persons.born'), died: t('persons.died') });
              return (
                <li key={p.id}>
                  <Link
                    to={`/persons/${p.id}`}
                    target="_blank"
                    rel="noopener"
                    className="font-medium text-primary underline-offset-2 hover:underline"
                    aria-label={t('form.similar.open', { name })}
                  >
                    {name}
                  </Link>
                  {(dates || p.birthPlace) && <span className="text-muted-foreground"> – {[dates, p.birthPlace].filter(Boolean).join(', ')}</span>}
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">{t('form.similar.hint')}</p>
        </div>
      )}
    </div>
  );
}
