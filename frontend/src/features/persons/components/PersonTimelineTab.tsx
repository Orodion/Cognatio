import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { Loader2, Plus, Trash2, Pencil, MapPin, Calendar, ArrowDownWideNarrow, ArrowUpNarrowWide, GitCommitVertical, Table } from 'lucide-react';
import type { Person } from '@/features/persons/types/person';
import type { TimelineEvent } from '@/features/persons/types/event';
import { GET_EVENTS, DELETE_EVENT } from '@/features/persons/graphql/eventQueries';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { MediaThumbnail } from '@/features/persons/components/MediaThumbnail';
import { MediaDownloadLink } from '@/features/persons/components/MediaDownloadLink';
import { mediaUrl, type Media } from '@/features/persons/types/media';
import { formatShortName } from '@/features/persons/lib/personUtils';
import { sortEvents } from '@/features/persons/lib/eventOrder';
import { useSettingsStore } from '@/stores/settingsStore';
import { Highlight } from '@/components/ui/Highlight';
import { matchesFilter } from '@/lib/textFilter';
import { EventFormDialog } from './EventFormDialog';

interface PersonTimelineTabProps {
  person: Person;
  /** Words from the filter field of the page; only matching events are shown */
  filter?: string;
}

type Translate = (key: string, options?: Record<string, unknown>) => string;

/** File name, for media of other persons with the owner ("group-photo.jpg (from Max Muster)") */
function mediaLabel(media: Media, personId: string, t: Translate) {
  if (!media.person || media.personId === personId) {
    return media.originalFileName;
  }
  const owner = formatShortName(media.person);
  return `${media.originalFileName} (${t('timeline.media.from', { name: owner })})`;
}

/** Thumbnails of the files linked with an event; each opens the file, the badge on its corner saves it */
function EventMedia({
  event,
  personId,
  className,
  thumbnail,
  t,
}: {
  event: TimelineEvent;
  personId: string;
  className: string;
  thumbnail: string;
  t: Translate;
}) {
  if (!event.media?.length) {
    return null;
  }
  return (
    <ul className={className} aria-label={t('timeline.media.title')}>
      {event.media.map((media) => {
        const label = mediaLabel(media, personId, t);
        return (
          <li key={media.id} className="relative">
            <a
              href={mediaUrl(media)}
              target="_blank"
              rel="noreferrer"
              title={label}
              aria-label={label}
              className="block rounded focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
            >
              <MediaThumbnail media={media} className={thumbnail} />
            </a>
            <MediaDownloadLink media={media} compact />
          </li>
        );
      })}
    </ul>
  );
}

export function PersonTimelineTab({ person, filter = '' }: PersonTimelineTabProps) {
  const { t } = useTranslation();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);
  const view = useSettingsStore((s) => s.timelineView);
  const setView = useSettingsStore((s) => s.setTimelineView);
  const order = useSettingsStore((s) => s.timelineOrder);
  const setOrder = useSettingsStore((s) => s.setTimelineOrder);

  const { data, loading, error, refetch } = useQuery<{ getEvents: TimelineEvent[] }>(GET_EVENTS, {
    variables: { personId: person.id },
  });

  const [deleteEvent] = useMutation(DELETE_EVENT, {
    onCompleted: () => refetch(),
  });

  const handleDelete = async (eventId: string, title: string) => {
    const confirmed = window.confirm(t('timeline.deleteConfirm', { title }));
    if (confirmed) {
      await deleteEvent({ variables: { id: eventId } });
    }
  };

  const openForm = (event?: TimelineEvent) => {
    setEditingEvent(event || null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setEditingEvent(null);
    setIsFormOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t('timeline.loading')}
      </div>
    );
  }

  if (error) {
    return <div className="py-12 text-center text-destructive">{t('timeline.error')}</div>;
  }

  const allEvents = data?.getEvents ?? [];
  const events = sortEvents(allEvents, order).filter((event) =>
    matchesFilter(
      [
        event.title,
        t(`timeline.categories.${event.category}`),
        event.date,
        event.place,
        event.description,
        ...(event.media ?? []).map((media) => media.originalFileName),
      ],
      filter,
    ),
  );

  /** Edit and delete – in the timeline visible on hover and with keyboard focus, in the table always */
  const actions = (event: TimelineEvent, className: string) => (
    <div className={className}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => openForm(event)}
        aria-label={t('timeline.editLabel', { title: event.title })}
        title={t('timeline.editLabel', { title: event.title })}
      >
        <Pencil className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => handleDelete(event.id, event.title)}
        aria-label={t('timeline.deleteLabel', { title: event.title })}
        title={t('timeline.deleteLabel', { title: event.title })}
      >
        <Trash2 className="w-4 h-4 text-destructive" />
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">
          {t('timeline.title')} ({events.length})
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1" role="group" aria-label={t('timeline.order.label')}>
            <Button variant={order === 'asc' ? 'default' : 'outline'} size="sm" aria-pressed={order === 'asc'} onClick={() => setOrder('asc')}>
              <ArrowUpNarrowWide className="h-4 w-4" />
              {t('timeline.order.oldest')}
            </Button>
            <Button variant={order === 'desc' ? 'default' : 'outline'} size="sm" aria-pressed={order === 'desc'} onClick={() => setOrder('desc')}>
              <ArrowDownWideNarrow className="h-4 w-4" />
              {t('timeline.order.newest')}
            </Button>
          </div>
          <div className="flex gap-1" role="group" aria-label={t('timeline.view.label')}>
            <Button variant={view === 'timeline' ? 'default' : 'outline'} size="sm" aria-pressed={view === 'timeline'} onClick={() => setView('timeline')}>
              <GitCommitVertical className="h-4 w-4" />
              {t('timeline.view.timeline')}
            </Button>
            <Button variant={view === 'table' ? 'default' : 'outline'} size="sm" aria-pressed={view === 'table'} onClick={() => setView('table')}>
              <Table className="h-4 w-4" />
              {t('timeline.view.table')}
            </Button>
          </div>
          <Button variant="outline" onClick={() => openForm()}>
            <Plus className="mr-1 h-4 w-4" />
            {t('timeline.add')}
          </Button>
        </div>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {allEvents.length > 0 && filter.trim() ? t('personDetail.filter.noMatches', { query: filter.trim() }) : t('timeline.empty')}
          </CardContent>
        </Card>
      ) : view === 'table' ? (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[40rem] text-sm">
            <caption className="sr-only">{t('timeline.title')}</caption>
            <thead className="bg-muted/50 text-left">
              <tr>
                <th scope="col" className="whitespace-nowrap px-3 py-2 font-medium">
                  {t('timeline.table.date')}
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  {t('timeline.table.event')}
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  {t('timeline.table.category')}
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  {t('timeline.table.place')}
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  {t('timeline.table.description')}
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  {t('timeline.table.files')}
                </th>
                <th scope="col" className="px-3 py-2">
                  <span className="sr-only">{t('timeline.table.actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {events.map((event) => (
                <tr key={event.id} className="align-top">
                  <td className="whitespace-nowrap px-3 py-2">
                    <Highlight text={event.date ?? ''} query={filter} />
                  </td>
                  <th scope="row" className="px-3 py-2 text-left font-semibold">
                    <Highlight text={event.title} query={filter} />
                  </th>
                  <td className="px-3 py-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {t(`timeline.categories.${event.category}`)}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    <Highlight text={event.place ?? ''} query={filter} />
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    <Highlight text={event.description ?? ''} query={filter} />
                  </td>
                  <td className="px-3 py-2">
                    <EventMedia event={event} personId={person.id} className="flex flex-wrap gap-1" thumbnail="h-10 w-10 border" t={t} />
                  </td>
                  <td className="px-3 py-2">{actions(event, 'flex items-center justify-end gap-1')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-linear-to-b before:from-transparent before:via-border before:to-transparent">
          {events.map((event) => (
            <div key={event.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-muted-foreground text-primary-foreground shadow-sm shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-card border rounded-lg shadow-xs p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-lg">
                        <Highlight text={event.title} query={filter} />
                      </span>
                      <Badge variant="secondary" className="text-[10px]">
                        {t(`timeline.categories.${event.category}`)}
                      </Badge>
                    </div>
                    {(event.date || event.place) && (
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-2">
                        {event.date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <Highlight text={event.date} query={filter} />
                          </span>
                        )}
                        {event.place && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <Highlight text={event.place} query={filter} />
                          </span>
                        )}
                      </div>
                    )}
                    {event.description && (
                      <p className="text-sm text-muted-foreground mt-2">
                        <Highlight text={event.description} query={filter} />
                      </p>
                    )}
                    <EventMedia event={event} personId={person.id} className="mt-3 flex flex-wrap gap-2" thumbnail="h-14 w-14 border" t={t} />
                  </div>
                  {/* Visible with keyboard focus just like on mouse hover */}
                  {actions(event, 'flex items-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <EventFormDialog open={isFormOpen} onClose={closeForm} currentPersonId={person.id} event={editingEvent} onSuccess={() => refetch()} />
    </div>
  );
}
