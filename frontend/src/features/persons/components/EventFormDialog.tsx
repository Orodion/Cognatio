import { useState, useEffect } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { CREATE_EVENT, UPDATE_EVENT } from '@/features/persons/graphql/eventQueries';
import type { TimelineEvent } from '@/features/persons/types/event';
import type { Media } from '@/features/persons/types/media';
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { DateInput } from '@/components/ui/DateInput';
import { apiErrorMessage } from '@/lib/apiErrors';
import { uploadMedia, uploadTypeOf } from '@/features/persons/lib/uploadMedia';
import { EventMediaSection } from './EventMediaSection';
import { PlaceSuggestions, PLACE_LIST_ID } from './PlaceSuggestions';
import { dateKey, parseFlexibleDate, isoToDisplay } from '@/lib/dateParsing';

interface EventFormDialogProps {
  open: boolean;
  onClose: () => void;
  currentPersonId: string;
  event: TimelineEvent | null;
  onSuccess: () => void;
}

const EVENT_CATEGORIES = ['BIRTH', 'BAPTISM', 'SCHOOL_START', 'WEDDING', 'OCCUPATION', 'MOVE', 'DEATH', 'OTHER'];

export function EventFormDialog({ open, onClose, currentPersonId, event, onSuccess }: EventFormDialogProps) {
  const { t } = useTranslation();
  const client = useApolloClient();

  const isEditing = !!event;
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('OTHER');
  const [date, setDate] = useState('');
  const [dateError, setDateError] = useState<string | null>(null);
  const [place, setPlace] = useState('');
  const [description, setDescription] = useState('');
  const [linkedMedia, setLinkedMedia] = useState<Media[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open && event) {
      setTitle(event.title || '');
      setCategory(event.category || 'OTHER');
      // Older entries were stored as ISO dates (YYYY-MM-DD)
      setDate(isoToDisplay(event.date || ''));
      setPlace(event.place || '');
      setDescription(event.description || '');
      setLinkedMedia(event.media ?? []);
    } else if (open && !event) {
      setTitle('');
      setCategory('OTHER');
      setDate('');
      setPlace('');
      setDescription('');
      setLinkedMedia([]);
    }
    setPendingFiles([]);
    setDateError(null);
  }, [open, event]);

  const [createEvent, { loading: savingNew, error: errorNew }] = useMutation(CREATE_EVENT);
  const [updateEvent, { loading: savingEdit, error: errorEdit }] = useMutation(UPDATE_EVENT);

  const saving = savingNew || savingEdit || uploading;
  const error = errorNew || errorEdit;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Precision and sort key are derived from the free-text input
    const parsed = date.trim() ? parseFlexibleDate(date) : null;
    if (parsed && !parsed.ok) {
      setDateError(t(`form.errors.${parsed.error === 'INVALID' ? 'invalidDate' : parsed.error === 'FUTURE' ? 'futureDate' : 'rangeOrder'}`));
      return;
    }
    const parsedDate = parsed?.ok ? parsed.value : null;

    // The person of an event cannot be changed, so only a new event carries it. An empty field is sent as null:
    // the backend keeps a field that is not sent.
    const data = {
      title: title.trim(),
      category,
      date: date.trim() || null,
      datePrecision: parsedDate?.precision ?? null,
      sortOrder: parsedDate ? dateKey(parsedDate.start) : null,
      place: place.trim() || null,
      description: description.trim() || null,
      mediaIds: linkedMedia.map((m) => m.id),
    };

    let savedId: string;
    try {
      if (isEditing) {
        const result = await updateEvent({ variables: { id: event.id, data } });
        savedId = result.data.updateEvent.id;
      } else {
        const result = await createEvent({ variables: { data: { personId: currentPersonId, ...data } } });
        savedId = result.data.createEvent.id;
      }
    } catch {
      // The dialog shows errors via the state of the mutation
      return;
    }

    // New files belong to the person and are linked with the event right away
    const failed: string[] = [];
    if (pendingFiles.length) {
      setUploading(true);
      for (const file of pendingFiles) {
        const result = await uploadMedia(file, currentPersonId, uploadTypeOf(file), savedId);
        if (!result.ok) {
          failed.push(file.name);
        }
      }
      setUploading(false);
      await client.refetchQueries({ include: ['GetPersonMedia'] });
    }

    onSuccess();
    onClose();
    if (failed.length) {
      window.alert(t('timeline.media.uploadFailed', { names: failed.join(', ') }));
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col">
        <PlaceSuggestions />
        <DialogHeader>
          <DialogTitle>{isEditing ? t('timeline.form.editTitle') : t('timeline.form.createTitle')}</DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-2">
          {error && <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">{apiErrorMessage(error, t)}</div>}

          <div className="space-y-2">
            <Label htmlFor="title">{t('timeline.form.title')} *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">{t('timeline.form.category')} *</Label>
            <Select id="category" value={category} onChange={(e) => setCategory(e.target.value)} required>
              {EVENT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {t(`timeline.categories.${cat}`)}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">{t('timeline.form.date')}</Label>
            <DateInput
              id="date"
              value={date}
              onChange={(v) => {
                setDate(v);
                setDateError(null);
              }}
            />
            {dateError && <p className="text-xs text-destructive">{dateError}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="place">{t('timeline.form.location')}</Label>
            <Input id="place" value={place} onChange={(e) => setPlace(e.target.value)} list={PLACE_LIST_ID} autoComplete="off" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('timeline.form.description')}</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>

          <EventMediaSection
            personId={currentPersonId}
            linked={linkedMedia}
            onLinkedChange={setLinkedMedia}
            pending={pendingFiles}
            onPendingChange={setPendingFiles}
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={!title || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('common.save')}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
