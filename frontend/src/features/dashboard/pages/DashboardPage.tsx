import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { Users, GitFork, Plus, ArrowRight, Clock, Sparkles } from 'lucide-react';
import { GET_PERSONS } from '@/features/persons/graphql/personQueries';
import type { Person } from '@/features/persons/types/person';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { buttonVariants } from '@/components/ui/buttonVariants';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { getInitials, formatPersonName, formatLifeDates } from '@/features/persons/lib/personUtils';
import { PersonFormDialog } from '@/features/persons/components/PersonFormDialog';

export function DashboardPage() {
  const { t } = useTranslation();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { data, loading, refetch } = useQuery<{ getPersons: Person[] }>(GET_PERSONS, {
    variables: { includeDeleted: false },
  });

  const persons = data?.getPersons ?? [];
  const totalCount = persons.length;

  // Calculate statistics
  const maleCount = persons.filter((p) => p.gender === 'MALE').length;
  const femaleCount = persons.filter((p) => p.gender === 'FEMALE').length;

  // Recently added: the API returns times as milliseconds (text), older data possibly as ISO dates
  const createdAt = (p: Person) => new Date(p.createdAt).getTime() || 0;
  const lastAdded = [...persons].sort((a, b) => createdAt(b) - createdAt(a)).slice(0, 4);

  return (
    <div className="space-y-8">
      {/* Welcome Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-primary/10 via-primary/5 to-transparent p-8 border">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            {t('app.name')}
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('app.name')}</h1>
          <p className="text-muted-foreground text-lg">{t('dashboard.intro')}</p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('persons.newPerson')}
            </Button>
            <Link to="/tree" className={buttonVariants({ variant: 'outline' })}>
              <GitFork className="mr-2 h-4 w-4" />
              {t('nav.tree')}
            </Link>
          </div>
        </div>
        <div className="absolute right-0 top-0 -z-10 h-full w-1/3 opacity-10 bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-primary via-primary/20 to-transparent" />
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard.totalPersons')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{loading ? '...' : totalCount}</div>
            <p className="text-xs text-muted-foreground mt-1">{t('dashboard.totalPersonsHint')}</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard.genderDistribution')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>
                {t('gender.MALE')}: {maleCount}
              </span>
              <span>
                {t('gender.FEMALE')}: {femaleCount}
              </span>
            </div>
            <div className="h-2 w-full bg-accent rounded-full overflow-hidden flex">
              <div className="bg-blue-500 h-full" style={{ width: `${totalCount ? (maleCount / totalCount) * 100 : 0}%` }} />
              <div className="bg-pink-500 h-full" style={{ width: `${totalCount ? (femaleCount / totalCount) * 100 : 0}%` }} />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard.quickAccess')}</CardTitle>
            <GitFork className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Link
              to="/persons"
              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'justify-between px-2 text-muted-foreground hover:text-foreground')}
            >
              <span>{t('dashboard.openPersonList')}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/import-export"
              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'justify-between px-2 text-muted-foreground hover:text-foreground')}
            >
              <span>{t('nav.importExport')}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Main Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recently Added */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              {t('dashboard.recentlyAdded')}
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {loading ? (
              <div className="py-6 text-center text-muted-foreground">{t('common.loading')}</div>
            ) : lastAdded.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground">{t('dashboard.noPersons')}</div>
            ) : (
              lastAdded.map((person) => (
                // Link instead of a clickable block: also reachable by keyboard and screen reader
                <Link
                  key={person.id}
                  to={`/persons/${person.id}`}
                  className="flex items-center gap-3 rounded-lg px-2 py-3 transition-colors first:pt-0 last:pb-0 hover:bg-accent/30 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Avatar initials={getInitials(person)} imageUrl={person.profilePictureUrl} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{formatPersonName(person)}</p>
                    <p className="text-xs text-muted-foreground truncate">{formatLifeDates(person) || person.occupation || t('dashboard.noLifeDates')}</p>
                  </div>
                  {person.gender !== 'UNKNOWN' && <Badge variant="outline">{t(`gender.${person.gender}`)}</Badge>}
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Quick Tips */}
        <Card className="bg-muted/30 border-dashed">
          <CardHeader>
            <CardTitle className="text-lg">{t('dashboard.tips.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              💡 <strong>{t('dashboard.tips.treeTitle')}</strong> {t('dashboard.tips.treeText')}
            </p>
            <p>
              💡 <strong>{t('dashboard.tips.searchTitle')}</strong> {t('dashboard.tips.searchText')}
            </p>
            <p>
              💡 <strong>{t('dashboard.tips.datesTitle')}</strong> {t('dashboard.tips.datesText')}
            </p>
          </CardContent>
        </Card>
      </div>

      <PersonFormDialog open={isFormOpen} onClose={() => setIsFormOpen(false)} onSuccess={() => refetch()} />
    </div>
  );
}
