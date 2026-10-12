import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import type { Person } from '@/features/persons/types/person';
import { RELATION_TYPES, type RelationType } from '@/features/persons/lib/relationTypes';
import { formatPersonName } from '@/features/persons/lib/personUtils';
import { suggestedStartDate } from '@/features/persons/lib/relationDates';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { PersonPicker } from './PersonPicker';
import { formatDay } from '@/lib/formatDate';

/** Relation that is only created when the person is saved. */
export interface PendingRelation {
  key: string;
  person: Person;
  type: RelationType;
  startDate?: string;
  endDate?: string;
}

interface PendingRelationsSectionProps {
  value: PendingRelation[];
  onChange: (value: PendingRelation[]) => void;
  /** Persons that cannot be selected (e.g. the edited person itself) */
  excludeIds?: string[];
  /** Date of birth of the person in the form – start of the relation to their parents */
  currentBirthDate?: string | null;
}

// startTouched: "start date" changed by the user – otherwise the suggestion applies (the child's date of birth)
const emptyDraft = { personId: '', person: null as Person | null, type: 'MOTHER' as RelationType, startDate: '', startTouched: false, endDate: '' };

export function PendingRelationsSection({ value, onChange, excludeIds = [], currentBirthDate }: PendingRelationsSectionProps) {
  const { t, i18n } = useTranslation();
  const [draft, setDraft] = useState<typeof emptyDraft | null>(null);
  const [error, setError] = useState<string | null>(null);

  const closeDraft = () => {
    setDraft(null);
    setError(null);
  };

  const suggestedStart = draft ? suggestedStartDate(draft.type, currentBirthDate, draft.person?.birthDate) : '';
  const draftStart = draft?.startTouched ? draft.startDate : suggestedStart;

  const addDraft = () => {
    if (!draft) {
      return;
    }
    if (!draft.person) {
      setError(t('relations.form.errors.personRequired'));
      return;
    }
    if (draftStart && draft.endDate && draft.endDate < draftStart) {
      setError(t('relations.form.dateOrderError'));
      return;
    }
    if (value.some((r) => r.person.id === draft.person!.id && r.type === draft.type)) {
      setError(t('relations.form.errors.duplicate'));
      return;
    }
    onChange([
      ...value,
      {
        key: `${draft.person.id}-${draft.type}-${Date.now()}`,
        person: draft.person,
        type: draft.type,
        startDate: draftStart || undefined,
        endDate: draft.endDate || undefined,
      },
    ]);
    closeDraft();
  };

  const formatOptionalDate = (iso?: string) => (iso ? formatDay(iso, i18n.language) : '');

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <ul className="space-y-2">
          {value.map((rel) => (
            <li key={rel.key} className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <span className="font-medium">{formatPersonName(rel.person)}</span>
                <span className="text-muted-foreground"> – {t(`relations.types.${rel.type}`)}</span>
                {(rel.startDate || rel.endDate) && (
                  <span className="text-xs text-muted-foreground">
                    {' '}
                    ({formatOptionalDate(rel.startDate) || '?'} – {formatOptionalDate(rel.endDate) || t('relations.ongoing')})
                  </span>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange(value.filter((r) => r.key !== rel.key))}
                aria-label={t('relations.form.removePending', { name: formatPersonName(rel.person) })}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {draft ? (
        // No <form>: the section is inside the person form. Enter must not submit it.
        <div
          className="space-y-3 rounded-lg border border-dashed p-3"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
              e.preventDefault();
            }
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="pending-relation-person" required>
              {t('relations.form.personSelect')}
            </Label>
            <PersonPicker
              id="pending-relation-person"
              value={draft.personId}
              onChange={(personId, person) => {
                setDraft({ ...draft, personId, person });
                setError(null);
              }}
              excludeIds={[...excludeIds, ...value.filter((r) => r.type === draft.type).map((r) => r.person.id)]}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="pending-relation-type">{t('relations.form.type')}</Label>
              <Select id="pending-relation-type" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as RelationType })}>
                {RELATION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(`relations.types.${type}`)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pending-relation-start">{t('relations.form.startDate')}</Label>
              <Input
                id="pending-relation-start"
                type="date"
                value={draftStart}
                onChange={(e) => setDraft({ ...draft, startDate: e.target.value, startTouched: true })}
                aria-describedby={!draft.startTouched && suggestedStart ? 'pending-relation-start-hint' : undefined}
              />
              {!draft.startTouched && suggestedStart && (
                <p id="pending-relation-start-hint" className="text-xs text-muted-foreground">
                  {t('relations.form.startFromBirth')}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pending-relation-end">{t('relations.form.endDate')}</Label>
              <Input id="pending-relation-end" type="date" value={draft.endDate} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{t('relations.form.typeHintNew')}</p>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={closeDraft}>
              {t('common.cancel')}
            </Button>
            <Button type="button" size="sm" onClick={addDraft}>
              {t('relations.form.addToList')}
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={() => setDraft({ ...emptyDraft })}>
          <Plus className="h-4 w-4" />
          {t('relations.form.createNew')}
        </Button>
      )}
    </div>
  );
}
