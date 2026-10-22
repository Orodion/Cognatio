import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { Landmark, Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { DELETE_REPOSITORY, GET_REPOSITORIES, GET_SOURCES, LIBRARY_CHANGED } from '@/features/sources/graphql/sourceQueries';
import { SOURCE_ICONS, sourceName } from '@/features/sources/lib/sourceText';
import { SOURCE_TYPES, type Repository, type Source } from '@/features/sources/types/source';
import { apiErrorMessage } from '@/lib/apiErrors';
import { matchesFilter } from '@/lib/textFilter';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { ClearableInput } from '@/components/ui/ClearableInput';
import { Highlight } from '@/components/ui/Highlight';
import { Select } from '@/components/ui/Select';
import { RepositoryFormDialog } from '../components/RepositoryFormDialog';
import { SourceFormDialog } from '../components/SourceFormDialog';

type Area = 'sources' | 'repositories';

/** The library of sources and archives – one for all family trees */
export function SourcesPage() {
  const { t } = useTranslation();
  const [area, setArea] = useState<Area>('sources');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('sources.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('sources.subtitle')}</p>
      </div>
      <nav className="flex gap-1 border-b" aria-label={t('sources.areas')}>
        {(['sources', 'repositories'] as const).map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => setArea(a)}
            aria-current={area === a ? 'true' : undefined}
            className={cn(
              '-mb-px whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors',
              area === a ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t(`sources.area.${a}`)}
          </button>
        ))}
      </nav>
      {area === 'sources' ? <SourceList /> : <RepositoryList />}
    </div>
  );
}

function SourceList() {
  const { t } = useTranslation();
  const [all, setAll] = useState(false);
  const [type, setType] = useState('');
  const [filter, setFilter] = useState('');
  const [creating, setCreating] = useState(false);
  const { data, loading, error } = useQuery<{ sources: Source[] }>(GET_SOURCES, {
    variables: { scope: all ? 'ALL' : 'TREE' },
    fetchPolicy: 'cache-and-network',
  });

  const sources = (data?.sources ?? []).filter(
    (s) => (!type || s.type === type) && matchesFilter([s.title, s.abbreviation, s.author, s.publication, s.repository?.name, s.callNumber, s.note], filter),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <ClearableInput
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            onClear={() => setFilter('')}
            placeholder={t('sources.list.filter')}
            aria-label={t('sources.list.filter')}
            className="h-9 pl-9 [&::-webkit-search-cancel-button]:hidden"
          />
        </div>
        <Select value={type} onChange={(e) => setType(e.target.value)} aria-label={t('sources.fields.type')} className="h-9 w-auto">
          <option value="">{t('sources.list.allTypes')}</option>
          {SOURCE_TYPES.map((value) => (
            <option key={value} value={value}>
              {t(`sources.types.${value}`)}
            </option>
          ))}
        </Select>
        <div className="flex gap-1" role="group" aria-label={t('sources.list.scope')}>
          <Button variant={!all ? 'default' : 'outline'} size="sm" aria-pressed={!all} onClick={() => setAll(false)}>
            {t('sources.list.thisTree')}
          </Button>
          <Button variant={all ? 'default' : 'outline'} size="sm" aria-pressed={all} onClick={() => setAll(true)}>
            {t('sources.list.allTrees')}
          </Button>
        </div>
        <Button variant="outline" onClick={() => setCreating(true)}>
          <Plus className="mr-1 h-4 w-4" />
          {t('sources.list.new')}
        </Button>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          {t('common.loading')}
        </div>
      ) : error ? (
        <div className="py-12 text-center text-destructive">{t('common.error')}</div>
      ) : sources.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {data?.sources.length ? t('sources.list.noMatches') : all ? t('sources.list.emptyAll') : t('sources.list.empty')}
          </CardContent>
        </Card>
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {sources.map((s) => {
            const Icon = SOURCE_ICONS[s.type] ?? SOURCE_ICONS.OTHER;
            return (
              <li key={s.id} className="flex items-start gap-3 p-3">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                <div className="min-w-0 flex-1">
                  <Link to={`/sources/${s.id}`} className="font-medium hover:underline">
                    <Highlight text={sourceName(s)} query={filter} />
                  </Link>
                  <p className="text-sm text-muted-foreground">{[t(`sources.types.${s.type}`), s.author, s.repository?.name].filter(Boolean).join(' · ')}</p>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-1">
                  <Badge variant="secondary">{t('sources.list.citations', { count: s.citationCount })}</Badge>
                  {s.linkCount === 0 ? (
                    <Badge variant="outline">{t('sources.list.unused')}</Badge>
                  ) : (
                    s.treeLinkCount < s.linkCount && <Badge variant="outline">{t('sources.list.otherTrees')}</Badge>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <SourceFormDialog open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

function RepositoryList() {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<Repository | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const { data, loading } = useQuery<{ repositories: Repository[] }>(GET_REPOSITORIES, { fetchPolicy: 'cache-and-network' });
  const [remove] = useMutation(DELETE_REPOSITORY, LIBRARY_CHANGED);
  const repositories = data?.repositories ?? [];

  const handleDelete = async (repository: Repository) => {
    if (!window.confirm(t('sources.repositories.deleteConfirm', { name: repository.name, count: repository.sourceCount ?? 0 }))) {
      return;
    }
    setError(null);
    try {
      await remove({ variables: { id: repository.id } });
    } catch (err) {
      setError(apiErrorMessage(err, t));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" onClick={() => setEditing(null)}>
          <Plus className="mr-1 h-4 w-4" />
          {t('sources.repositories.new')}
        </Button>
      </div>
      {error && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive" role="alert">
          {error}
        </div>
      )}
      {loading && !data ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          {t('common.loading')}
        </div>
      ) : repositories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">{t('sources.repositories.empty')}</CardContent>
        </Card>
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {repositories.map((r) => (
            <li key={r.id} className="flex items-start gap-3 p-3">
              <Landmark className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-medium">{r.name}</p>
                {r.address && <p className="whitespace-pre-line text-muted-foreground">{r.address}</p>}
                {r.url && (
                  <a href={r.url} target="_blank" rel="noreferrer" className="break-all text-primary hover:underline">
                    {r.url}
                  </a>
                )}
                {(r.email || r.phone) && <p className="text-muted-foreground">{[r.email, r.phone].filter(Boolean).join(' · ')}</p>}
                <p className="text-xs text-muted-foreground">{t('sources.repositories.sources', { count: r.sourceCount ?? 0 })}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditing(r)}
                aria-label={t('sources.repositories.edit', { name: r.name })}
                title={t('sources.repositories.edit', { name: r.name })}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(r)}
                aria-label={t('sources.repositories.delete', { name: r.name })}
                title={t('sources.repositories.delete', { name: r.name })}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <RepositoryFormDialog open={editing !== undefined} repository={editing} onClose={() => setEditing(undefined)} />
    </div>
  );
}
