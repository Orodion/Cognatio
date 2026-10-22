import { Link } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { SEARCH_SOURCES } from '@/features/sources/graphql/sourceQueries';
import { SOURCE_ICONS, sourceName } from '@/features/sources/lib/sourceText';
import type { Source } from '@/features/sources/types/source';

/** Sources that contain the words of the search (fields, archive, citations) – shown above the persons found */
export function SourceSearchHits({ query }: { query: string }) {
  const { t } = useTranslation();
  const { data } = useQuery<{ searchSources: Source[] }>(SEARCH_SOURCES, { variables: { query }, skip: !query.trim() });
  const sources = data?.searchSources ?? [];
  if (!sources.length) {
    return null;
  }
  return (
    <section className="rounded-xl border bg-card p-4 shadow-xs" aria-labelledby="source-hits">
      <h2 id="source-hits" className="mb-2 text-sm font-medium">
        {t('sources.search.title', { count: sources.length })}
      </h2>
      <ul className="flex flex-wrap gap-2">
        {sources.map((s) => {
          const Icon = SOURCE_ICONS[s.type] ?? SOURCE_ICONS.OTHER;
          return (
            <li key={s.id}>
              <Link to={`/sources/${s.id}`} className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-sm hover:bg-accent">
                <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
                {sourceName(s)}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
