import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Link2, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useFamilyTrees } from '@/features/family-trees/lib/useFamilyTrees';
import {
  DELETE_CITATION,
  DELETE_SOURCE,
  GET_SOURCE,
  LIBRARY_CHANGED,
  UNLINK_CITATION,
  UPDATE_CITATION,
  UPDATE_SOURCE,
} from '@/features/sources/graphql/sourceQueries';
import { citationTitle, groupLinks } from '@/features/sources/lib/citationLinks';
import { citationInputOf, sourceInputOf } from '@/features/sources/lib/inputs';
import { SOURCE_ICONS } from '@/features/sources/lib/sourceText';
import { targetOfLink, type Citation, type CitationLink, type Source } from '@/features/sources/types/source';
import { apiErrorMessage } from '@/lib/apiErrors';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { CitationFormDialog } from '../components/CitationFormDialog';
import { CitationLinkGroups } from '../components/CitationLinkGroups';
import { LinkFactsDialog } from '../components/LinkFactsDialog';
import { ScanList } from '../components/ScanList';
import { SourceFormDialog } from '../components/SourceFormDialog';

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) {
    return null;
  }
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-border/60 py-2 last:border-0 sm:grid-cols-3">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="whitespace-pre-line break-words text-sm sm:col-span-2">{value}</dd>
    </div>
  );
}

/** A source with its fields, scans and entries (citations), each with the facts it supports */
export function SourceDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [citation, setCitation] = useState<Citation | null | undefined>(undefined);
  const [linking, setLinking] = useState<Citation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { data, loading, refetch } = useQuery<{ source: Source | null }>(GET_SOURCE, { variables: { id }, skip: !id });
  const [deleteSource] = useMutation(DELETE_SOURCE, LIBRARY_CHANGED);
  const [updateSource] = useMutation(UPDATE_SOURCE, LIBRARY_CHANGED);
  const [deleteCitation] = useMutation(DELETE_CITATION, LIBRARY_CHANGED);
  const [updateCitation] = useMutation(UPDATE_CITATION, LIBRARY_CHANGED);
  const [unlinkCitation] = useMutation(UNLINK_CITATION, LIBRARY_CHANGED);

  const source = data?.source;

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t('common.loading')}
      </div>
    );
  }
  if (!source) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-muted-foreground">{t('sources.detail.notFound')}</p>
        <Link to="/sources" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          {t('common.back')}
        </Link>
      </div>
    );
  }

  const run = async (action: () => Promise<unknown>) => {
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(apiErrorMessage(err, t));
    }
  };

  const removeSource = () => {
    if (!window.confirm(t('sources.detail.deleteConfirm', { title: source.title, citations: source.citationCount, links: source.linkCount }))) {
      return;
    }
    void run(async () => {
      await deleteSource({ variables: { id: source.id } });
      navigate('/sources');
    });
  };

  const Icon = SOURCE_ICONS[source.type] ?? SOURCE_ICONS.OTHER;
  const citations = source.citations ?? [];

  return (
    <div className="space-y-6">
      <Link
        to="/sources"
        className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('common.back')}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Icon className="mt-1 h-6 w-6 shrink-0 text-muted-foreground" aria-hidden />
          <div>
            <h1 className="text-2xl font-bold">{source.title}</h1>
            <p className="text-sm text-muted-foreground">{t(`sources.types.${source.type}`)}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" />
            {t('sources.detail.edit')}
          </Button>
          <Button variant="outline" onClick={removeSource}>
            <Trash2 className="h-4 w-4 text-destructive" />
            {t('common.delete')}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive" role="alert">
          {error}
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          <dl>
            <Field label={t('sources.fields.author')} value={source.author} />
            <Field label={t('sources.fields.publication')} value={source.publication} />
            <Field label={t('sources.fields.abbreviation')} value={source.abbreviation} />
            <Field label={t('sources.fields.repository')} value={source.repository?.name} />
            <Field label={t('sources.fields.callNumber')} value={source.callNumber} />
            <Field label={t('sources.fields.text')} value={source.text} />
            <Field label={t('sources.fields.note')} value={source.note} />
          </dl>
          <div className="mt-4 space-y-2">
            <h2 className="text-sm font-medium">{t('sources.scans.ofSource')}</h2>
            <ScanList
              media={source.media ?? []}
              target={{ sourceId: source.id }}
              link={`/sources/${source.id}`}
              label={t('sources.scans.ofSource')}
              onRemove={(m) =>
                run(() =>
                  updateSource({
                    variables: {
                      id: source.id,
                      data: sourceInputOf(
                        source,
                        (source.media ?? []).filter((x) => x.id !== m.id).map((x) => x.id),
                      ),
                    },
                  }),
                )
              }
              onChanged={() => refetch()}
              onError={setError}
            />
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3" aria-labelledby="source-citations">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="source-citations" className="text-lg font-semibold">
            {t('sources.detail.citations')} ({citations.length})
          </h2>
          <Button variant="outline" onClick={() => setCitation(null)}>
            <Plus className="mr-1 h-4 w-4" />
            {t('sources.detail.newCitation')}
          </Button>
        </div>
        {citations.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">{t('sources.detail.noCitations')}</CardContent>
          </Card>
        ) : (
          citations.map((c) => (
            <CitationCard
              key={c.id}
              citation={c}
              onEdit={() => setCitation(c)}
              onLink={() => setLinking(c)}
              onDelete={() => {
                if (window.confirm(t('sources.detail.deleteCitationConfirm', { count: c.linkCount }))) {
                  void run(() => deleteCitation({ variables: { id: c.id } }));
                }
              }}
              onRemoveScan={(mediaId) =>
                run(() =>
                  updateCitation({
                    variables: {
                      id: c.id,
                      data: citationInputOf(
                        c,
                        (c.media ?? []).filter((x) => x.id !== mediaId).map((x) => x.id),
                      ),
                    },
                  }),
                )
              }
              onUnlink={(link, fact, name) => {
                if (window.confirm(t('sources.detail.unlinkConfirm', { fact, name }))) {
                  void run(() => unlinkCitation({ variables: { citationId: c.id, target: targetOfLink(link) } }));
                }
              }}
              onChanged={() => refetch()}
              onError={setError}
            />
          ))
        )}
      </section>

      <SourceFormDialog open={editing} source={source} onClose={() => setEditing(false)} />
      <CitationFormDialog open={citation !== undefined} sourceId={source.id} citation={citation} onClose={() => setCitation(undefined)} />
      {linking && <LinkFactsDialog open citationId={linking.id} linked={linking.links ?? []} onClose={() => setLinking(null)} />}
    </div>
  );
}

interface CitationCardProps {
  citation: Citation;
  onEdit: () => void;
  onLink: () => void;
  onDelete: () => void;
  onRemoveScan: (mediaId: string) => Promise<unknown>;
  onUnlink: (link: CitationLink, fact: string, name: string) => void;
  onChanged: () => unknown;
  onError: (message: string) => void;
}

function CitationCard({ citation, onEdit, onLink, onDelete, onRemoveScan, onUnlink, onChanged, onError }: CitationCardProps) {
  const { t } = useTranslation();
  const { active } = useFamilyTrees();
  const title = citationTitle(citation, t);
  const links = citation.links ?? [];
  const persons = groupLinks(links, t).length;

  return (
    <Card role="region" aria-label={title}>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base">{title}</CardTitle>
          {citation.quality !== null && citation.quality !== undefined && <Badge variant="secondary">{t(`sources.quality.${citation.quality}`)}</Badge>}
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onLink}
            aria-label={t('sources.detail.linkFacts', { entry: title })}
            title={t('sources.detail.linkFacts', { entry: title })}
          >
            <Link2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onEdit}
            aria-label={t('sources.detail.editCitation', { entry: title })}
            title={t('sources.detail.editCitation', { entry: title })}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            aria-label={t('sources.detail.deleteCitation', { entry: title })}
            title={t('sources.detail.deleteCitation', { entry: title })}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardHeader>
      {/* The entry itself on the left, what it supports on the right (one below the other on narrow windows) */}
      <CardContent className="grid gap-6 text-sm md:grid-cols-2">
        <div className="space-y-4">
          {citation.text && (
            <div className="space-y-1">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('sources.citation.text')}</h3>
              <p className="whitespace-pre-line">{citation.text}</p>
            </div>
          )}
          {citation.note && (
            <div className="space-y-1">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('sources.citation.note')}</h3>
              <p className="whitespace-pre-line">{citation.note}</p>
            </div>
          )}
          <div className="space-y-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('sources.scans.title')}</h3>
            <ScanList
              media={citation.media ?? []}
              target={{ citationId: citation.id }}
              link={`/sources/${citation.sourceId}`}
              label={t('sources.scans.ofCitation', { entry: title })}
              onRemove={(m) => onRemoveScan(m.id)}
              onChanged={onChanged}
              onError={onError}
            />
          </div>
        </div>
        <div className="space-y-3 md:border-l md:pl-6">
          <div className="flex flex-wrap items-baseline justify-between gap-x-2">
            <h3 className="font-medium">{t('sources.detail.supports')}</h3>
            {links.length > 0 && <span className="text-xs text-muted-foreground">{t('sources.detail.supportsCount', { facts: links.length, persons })}</span>}
          </div>
          {links.length === 0 ? (
            <p className="text-muted-foreground">{t('sources.detail.unused')}</p>
          ) : (
            <CitationLinkGroups links={links} activeTreeId={active?.id} onUnlink={onUnlink} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
