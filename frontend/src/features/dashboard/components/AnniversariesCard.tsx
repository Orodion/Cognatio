import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { CalendarHeart, Cake, Flower2, Heart, type LucideIcon } from 'lucide-react';
import type { Person } from '@/features/persons/types/person';
import { formatPersonName } from '@/features/persons/lib/personUtils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { ANNIVERSARY_RELATIONS } from '../graphql/dashboardQueries';
import { upcomingAnniversaries, ANNIVERSARY_DAYS, type AnniversaryKind, type AnniversaryRelation } from '../lib/anniversaries';

/** At most this many anniversaries are listed; the rest is counted */
const SHOWN = 8;

const ICONS: Record<AnniversaryKind, LucideIcon> = { BIRTHDAY: Cake, BIRTH: Cake, DEATH: Flower2, WEDDING: Heart };

interface AnniversariesCardProps {
  persons: Person[];
  loading: boolean;
}

/** Birthdays, days of death and wedding days of the coming days on the start page */
export function AnniversariesCard({ persons, loading }: AnniversariesCardProps) {
  const { t, i18n } = useTranslation();
  const { data, loading: relationsLoading } = useQuery<{ getRelations: AnniversaryRelation[] }>(ANNIVERSARY_RELATIONS, { fetchPolicy: 'cache-and-network' });
  const anniversaries = upcomingAnniversaries(persons, data?.getRelations ?? []);
  const shown = anniversaries.slice(0, SHOWN);
  const day = new Intl.DateTimeFormat(i18n.language, { weekday: 'short', day: 'numeric', month: 'long' });
  const when = (inDays: number) =>
    inDays === 0
      ? t('dashboard.anniversaries.today')
      : inDays === 1
        ? t('dashboard.anniversaries.tomorrow')
        : t('dashboard.anniversaries.inDays', { count: inDays });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarHeart className="h-5 w-5 text-muted-foreground" />
          {t('dashboard.anniversaries.title')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t('dashboard.anniversaries.hint', { count: ANNIVERSARY_DAYS })}</p>
      </CardHeader>
      <CardContent>
        {loading || (relationsLoading && !data) ? (
          <div className="py-6 text-center text-muted-foreground">{t('common.loading')}</div>
        ) : shown.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground">{t('dashboard.anniversaries.none', { count: ANNIVERSARY_DAYS })}</div>
        ) : (
          <ul className="divide-y">
            {shown.map((anniversary) => {
              const Icon = ICONS[anniversary.kind];
              const today = anniversary.inDays === 0;
              return (
                <li key={`${anniversary.kind}-${anniversary.persons.map((p) => p.id).join('-')}`} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', today ? 'text-primary' : 'text-muted-foreground')} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {anniversary.persons.map((person, i) => (
                        <Fragment key={person.id}>
                          {i > 0 && ' & '}
                          <Link
                            to={`/persons/${person.id}`}
                            className="hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                          >
                            {formatPersonName(person)}
                          </Link>
                        </Fragment>
                      ))}
                    </p>
                    <p className="text-xs text-muted-foreground">{t(`dashboard.anniversaries.${anniversary.kind}`, { count: anniversary.years })}</p>
                  </div>
                  <div className={cn('shrink-0 text-right text-xs', today ? 'font-semibold text-primary' : 'text-muted-foreground')}>
                    <p>{when(anniversary.inDays)}</p>
                    <p>{day.format(anniversary.date)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {anniversaries.length > SHOWN && (
          <p className="pt-3 text-xs text-muted-foreground">{t('dashboard.anniversaries.more', { count: anniversaries.length - SHOWN })}</p>
        )}
      </CardContent>
    </Card>
  );
}
