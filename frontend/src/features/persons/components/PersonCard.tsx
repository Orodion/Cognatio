import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Person, SearchMatch } from '@/features/persons/types/person';
import { Card, CardContent } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { MourningRibbon } from '@/features/persons/components/MourningRibbon';
import { formatPersonName, getInitials, calculateAge, formatLifeDates } from '@/features/persons/lib/personUtils';

interface PersonCardProps {
  person: Person;
  viewMode?: 'grid' | 'list';
  /** Search result: where the person was found (hits in the name need no hint) */
  matchedIn?: SearchMatch[];
}

export function PersonCard({ person, viewMode = 'grid', matchedIn }: PersonCardProps) {
  const { t } = useTranslation();
  const hints = (matchedIn ?? []).filter((m) => m !== 'NAME').map((m) => t(`search.match.${m}`));
  const foundVia = hints.length > 0 && <p className="text-xs italic text-muted-foreground">{t('search.foundVia', { list: hints.join(', ') })}</p>;
  const name = formatPersonName(person);
  const age = calculateAge(person.birthDate, person.deathDate);
  const lifeDates = formatLifeDates(person, {
    born: t('persons.born'),
    died: t('persons.died'),
  });

  if (viewMode === 'list') {
    return (
      <Link to={`/persons/${person.id}`} className="block">
        <Card className="transition-shadow hover:shadow-md">
          <CardContent className="flex items-center gap-4 p-4">
            <Avatar initials={getInitials(person)} imageUrl={person.profilePictureUrl} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="flex min-w-0 items-center gap-1.5 font-semibold">
                <MourningRibbon person={person} className="h-4 w-4" />
                <span className="truncate">{name}</span>
              </p>
              <p className="truncate text-sm text-muted-foreground">{lifeDates || person.occupation || '—'}</p>
              {foundVia}
            </div>
            {age !== null && <Badge variant="outline">{person.deathDate ? t('persons.deceased') : t('persons.years', { count: age })}</Badge>}
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <Link to={`/persons/${person.id}`} className="block h-full">
      <Card className="relative h-full transition-shadow hover:shadow-md">
        <MourningRibbon person={person} className="absolute left-3 top-3 h-6 w-6" />
        <CardContent className="flex h-full flex-col items-center p-6 text-center">
          <Avatar initials={getInitials(person)} imageUrl={person.profilePictureUrl} className="mb-4" />
          <h3 className="mb-1 line-clamp-2 font-semibold">{name}</h3>
          {lifeDates && <p className="mb-2 text-sm text-muted-foreground">{lifeDates}</p>}
          {person.occupation && <p className="mb-3 line-clamp-1 text-sm text-muted-foreground">{person.occupation}</p>}
          {foundVia && <div className="mb-3">{foundVia}</div>}
          <div className="mt-auto flex flex-wrap justify-center gap-2">
            {age !== null && <Badge variant="outline">{person.deathDate ? t('persons.deceased') : t('persons.years', { count: age })}</Badge>}
            {person.gender !== 'UNKNOWN' && <Badge>{t(`gender.${person.gender}`, person.gender)}</Badge>}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
