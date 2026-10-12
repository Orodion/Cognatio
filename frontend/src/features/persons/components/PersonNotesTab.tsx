import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { Loader2, Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import type { Person } from '@/features/persons/types/person';
import type { PersonNote } from '@/features/persons/types/note';
import { GET_NOTES, CREATE_NOTE, UPDATE_NOTE, DELETE_NOTE } from '@/features/persons/graphql/noteQueries';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatDateTime } from '@/lib/formatDate';
import { Textarea } from '@/components/ui/Textarea';
import { Highlight } from '@/components/ui/Highlight';
import { matchesFilter } from '@/lib/textFilter';

/** Upper limit of a note in characters – the same as in the backend (noteResolvers.ts) */
export const MAX_NOTE_LENGTH = 10_000;

/** Number of characters below a note field; red above the limit (an imported note can be longer) */
function NoteLength({ id, text }: { id: string; text: string }) {
  const { t, i18n } = useTranslation();
  const tooLong = text.length > MAX_NOTE_LENGTH;
  return (
    <p id={id} className={tooLong ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}>
      {t('notes.length', { used: text.length.toLocaleString(i18n.language), max: MAX_NOTE_LENGTH.toLocaleString(i18n.language) })}
    </p>
  );
}

interface PersonNotesTabProps {
  person: Person;
  /** Words from the filter field of the page; only matching notes are listed (the box for a new note stays) */
  filter?: string;
}

export function PersonNotesTab({ person, filter = '' }: PersonNotesTabProps) {
  const { t, i18n } = useTranslation();

  const [newNoteText, setNewNoteText] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const { data, loading, error, refetch } = useQuery<{ getNotes: PersonNote[] }>(GET_NOTES, {
    variables: { personId: person.id },
  });

  const [createNote, { loading: creating }] = useMutation(CREATE_NOTE, {
    onCompleted: () => {
      setNewNoteText('');
      refetch();
    },
  });

  const [updateNote, { loading: updating }] = useMutation(UPDATE_NOTE, {
    onCompleted: () => {
      setEditingNoteId(null);
      refetch();
    },
  });

  const [deleteNote] = useMutation(DELETE_NOTE, {
    onCompleted: () => refetch(),
  });

  const handleCreate = async () => {
    if (!newNoteText.trim()) {
      return;
    }
    await createNote({
      variables: {
        data: {
          personId: person.id,
          text: newNoteText.trim(),
        },
      },
    });
  };

  const startEditing = (note: PersonNote) => {
    setEditingNoteId(note.id);
    setEditingText(note.text);
  };

  const cancelEditing = () => {
    setEditingNoteId(null);
    setEditingText('');
  };

  const handleUpdate = async (id: string) => {
    if (!editingText.trim()) {
      return;
    }
    await updateNote({
      variables: {
        id,
        data: {
          text: editingText.trim(),
        },
      },
    });
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(t('notes.deleteConfirm'));
    if (confirmed) {
      await deleteNote({ variables: { id } });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t('notes.loading')}
      </div>
    );
  }

  if (error) {
    return <div className="py-12 text-center text-destructive">{t('notes.error')}</div>;
  }

  const allNotes = data?.getNotes ?? [];
  const notes = allNotes.filter((note) => matchesFilter([note.text, formatDateTime(note.createdAt, i18n.language)], filter));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('notes.add')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <Textarea
              placeholder={t('notes.placeholder')}
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              rows={3}
              maxLength={MAX_NOTE_LENGTH}
              aria-describedby="new-note-length"
            />
            <div className="flex items-center justify-between gap-3">
              <NoteLength id="new-note-length" text={newNoteText} />
              <Button onClick={handleCreate} disabled={!newNoteText.trim() || newNoteText.length > MAX_NOTE_LENGTH || creating}>
                {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                {t('notes.save')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {notes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {allNotes.length > 0 && filter.trim() ? t('personDetail.filter.noMatches', { query: filter.trim() }) : t('notes.empty')}
            </CardContent>
          </Card>
        ) : (
          notes.map((note) => (
            <Card key={note.id}>
              <CardContent className="pt-6">
                {editingNoteId === note.id ? (
                  <div className="flex flex-col gap-3">
                    <Textarea
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      rows={4}
                      maxLength={MAX_NOTE_LENGTH}
                      aria-describedby={`note-length-${note.id}`}
                    />
                    <NoteLength id={`note-length-${note.id}`} text={editingText} />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={cancelEditing}>
                        <X className="mr-2 h-4 w-4" />
                        {t('common.cancel')}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleUpdate(note.id)}
                        disabled={!editingText.trim() || editingText.length > MAX_NOTE_LENGTH || updating}
                      >
                        {updating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                        {t('common.save')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 whitespace-pre-wrap text-sm">
                      <Highlight text={note.text} query={filter} />
                      <div className="mt-4 text-xs text-muted-foreground">{formatDateTime(note.createdAt, i18n.language)}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => startEditing(note)} aria-label={t('notes.editLabel')} title={t('notes.editLabel')}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(note.id)}
                        aria-label={t('notes.deleteLabel')}
                        title={t('notes.deleteLabel')}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
