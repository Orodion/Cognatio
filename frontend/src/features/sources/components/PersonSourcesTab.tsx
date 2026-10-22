import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { Loader2, Plus, Unlink } from 'lucide-react';
import { useActiveTreeStore } from '@/stores/activeTreeStore';
import { GET_EVENTS } from '@/features/persons/graphql/eventQueries';
import { GET_PERSON_RELATIONS } from '@/features/persons/graphql/relationQueries';
import type { TimelineEvent } from '@/features/persons/types/event';
import type { Person } from '@/features/persons/types/person';
import type { PersonRelationDetail } from '@/features/persons/types/relation';
import { LIBRARY_CHANGED, UNLINK_CITATION } from '@/features/sources/graphql/sourceQueries';
import { factKeyOf, personFacts, usePersonCitations } from '@/features/sources/lib/personFacts';
import { citationSummary, excerpt, sourceName, SOURCE_ICONS } from '@/features/sources/lib/sourceText';
import { targetOf, type FactCitation } from '@/features/sources/types/source';
import { apiErrorMessage } from '@/lib/apiErrors';
import { matchesFilter } from '@/lib/textFilter';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Highlight } from '@/components/ui/Highlight';
import { SupportedFactsToggle } from './CitationLinkGroups';
import { CiteDialog } from './CiteDialog';
import { MediaThumbnailLink } from './MediaThumbnailLink';

interface PersonSourcesTabProps {
  person: Person;
  /** Words from the filter field of the page */
  filter?: string;
}

/** Sources of a person: the citations of the person, of its events and relations, grouped by fact */
export function PersonSourcesTab({ person, filter = '' }: PersonSourcesTabProps) {
  const { t } = useTranslation();
  const [citing, setCiting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { citations, loading, error: loadError } = usePersonCitations(person.id);
  const { data: events } = useQuery<{ getEvents: TimelineEvent[] }>(GET_EVENTS, { variables: { personId: person.id } });
  const { data: relations } = useQuery<{ getPersonRelations: PersonRelationDetail[] }>(GET_PERSON_RELATIONS, { variables: { personId: person.id } });
  const [unlink] = useMutation(UNLINK_CITATION, LIBRARY_CHANGED);
  const activeTreeId = useActiveTreeStore((state) => state.treeId);

  const facts = personFacts(person, events?.getEvents ?? [], relations?.getPersonRelations ?? [], t);
  const labelOf = (key: string) => facts.find((f) => f.key === key)?.label ?? t('sources.facts.GENERAL');

  if (loading && !citations.length) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t('common.loading')}
      </div>
    );
  }
  if (loadError) {
    return <div className="py-12 text-center text-destructive">{t('common.error')}</div>;
  }

  const visible = citations.filter((c) =>
    matchesFilter(
      [
        labelOf(factKeyOf(c)),
        c.citation.source?.title,
        c.citation.source?.abbreviation,
        c.citation.source?.repository?.name,
        c.citation.page,
        c.citation.date,
        c.citation.text,
        c.citation.note,
      ],
      filter,
    ),
  );
  // In the order of the facts (person, name, birth, death, events, relations)
  const order = new Map(facts.map((f, i) => [f.key, i]));
  const groups = [...new Set(visible.map(factKeyOf))].sort((a, b) => (order.get(a) ?? 999) - (order.get(b) ?? 999));

  const remove = async (c: FactCitation) => {
    const name = c.citation.source ? sourceName(c.citation.source) : '';
    if (!window.confirm(t('sources.person.unlinkConfirm', { source: name, fact: labelOf(factKeyOf(c)) }))) {
      return;
    }
    setError(null);
    try {
      await unlink({ variables: { citationId: c.citation.id, target: targetOf(person.id, c) } });
    } catch (err) {
      setError(apiErrorMessage(err, t));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">
          {t('sources.person.title')} ({visible.length})
        </h2>
        <Button variant="outline" onClick={() => setCiting('PERSON:GENERAL')}>
          <Plus className="mr-1 h-4 w-4" />
          {t('sources.person.cite')}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">{t('sources.person.intro')}</p>
      {error && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive" role="alert">
          {error}
        </div>
      )}

      {groups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {citations.length > 0 && filter.trim() ? t('personDetail.filter.noMatches', { query: filter.trim() }) : t('sources.person.empty')}
          </CardContent>
        </Card>
      ) : (
        groups.map((key) => (
          <Card key={key} role="region" aria-label={labelOf(key)}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-base">{labelOf(key)}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setCiting(key)} aria-label={t('sources.person.citeFor', { fact: labelOf(key) })}>
                <Plus className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {visible
                  .filter((c) => factKeyOf(c) === key)
                  .map((c) => {
                    const source = c.citation.source;
                    const Icon = source ? SOURCE_ICONS[source.type] : SOURCE_ICONS.OTHER;
                    return (
                      <li key={`${key}-${c.citation.id}`} className="flex gap-3 rounded-lg border bg-background p-3">
                        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                        <div className="min-w-0 flex-1 space-y-1 text-sm">
                          <div className="flex flex-wrap items-center gap-2">
                            {source && (
                              <Link to={`/sources/${source.id}`} className="font-medium hover:underline">
                                <Highlight text={sourceName(source)} query={filter} />
                              </Link>
                            )}
                            {citationSummary(c.citation) && (
                              <span className="text-muted-foreground">
                                <Highlight text={citationSummary(c.citation)} query={filter} />
                              </span>
                            )}
                            {c.citation.quality !== null && c.citation.quality !== undefined && (
                              <Badge variant="secondary" className="text-[10px]">
                                {t(`sources.quality.short.${c.citation.quality}`)}
                              </Badge>
                            )}
                          </div>
                          {source?.repository && <p className="text-xs text-muted-foreground">{source.repository.name}</p>}
                          {c.citation.text && (
                            <p className="text-muted-foreground">
                              <Highlight text={excerpt(c.citation.text, 240)} query={filter} />
                            </p>
                          )}
                          {(c.citation.media?.length ?? 0) > 0 && (
                            <ul className="flex flex-wrap gap-2 pt-1" aria-label={t('sources.scans.title')}>
                              {c.citation.media!.map((m) => (
                                <li key={m.id}>
                                  <MediaThumbnailLink media={m} size="h-12 w-12" />
                                </li>
                              ))}
                            </ul>
                          )}
                          {c.citation.linkCount > 1 && (
                            <SupportedFactsToggle links={c.citation.links ?? []} count={c.citation.linkCount} activeTreeId={activeTreeId ?? undefined} />
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(c)}
                          aria-label={t('sources.person.unlink', { source: source ? sourceName(source) : '' })}
                          title={t('sources.person.unlink', { source: source ? sourceName(source) : '' })}
                        >
                          <Unlink className="h-4 w-4" />
                        </Button>
                      </li>
                    );
                  })}
              </ul>
            </CardContent>
          </Card>
        ))
      )}

      <CiteDialog open={citing !== null} onClose={() => setCiting(null)} facts={facts} factKey={citing ?? 'PERSON:GENERAL'} />
    </div>
  );
}
