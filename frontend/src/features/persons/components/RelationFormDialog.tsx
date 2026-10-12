import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { CREATE_RELATION } from '@/features/persons/graphql/relationQueries';
import { CREATE_PERSON, GET_PERSONS } from '@/features/persons/graphql/personQueries';
import type { Person } from '@/features/persons/types/person';
import { RELATION_TYPES } from '@/features/persons/lib/relationTypes';
import { suggestedStartDate } from '@/features/persons/lib/relationDates';
import { apiErrorMessage } from '@/lib/apiErrors';
import { emptyPersonForm, formToInput } from '@/features/persons/lib/personForm';
import { validatePersonForm, type PersonFormErrors } from '@/features/persons/lib/personValidation';
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { DateInput } from '@/components/ui/DateInput';
import { UNKNOWN_GIVEN_NAME } from '@/features/persons/lib/personUtils';
import { FirstNameUnknownCheckbox } from './FirstNameUnknownCheckbox';
import { PersonPicker } from './PersonPicker';
import { SimilarPersonsHint } from './SimilarPersonsHint';
import { GENDER_OPTIONS } from '@/features/persons/lib/personForm';

interface RelationFormDialogProps {
  open: boolean;
  onClose: () => void;
  currentPersonId: string;
  onSuccess: () => void;
}

/** New person directly in the dialog: only the essentials, everything else later on their page */
interface NewPerson {
  firstName: string;
  lastName: string;
  gender: string;
  birthDate: string;
}

const EMPTY_NEW_PERSON: NewPerson = { firstName: '', lastName: '', gender: 'UNKNOWN', birthDate: '' };

/** Gender suggested by the relation type (mother → female …) */
const GENDER_BY_TYPE: Partial<Record<string, string>> = {
  MOTHER: 'FEMALE',
  WIFE: 'FEMALE',
  FATHER: 'MALE',
  HUSBAND: 'MALE',
};

export function RelationFormDialog({ open, onClose, currentPersonId, onSuccess }: RelationFormDialogProps) {
  const { t } = useTranslation();

  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [personBId, setPersonBId] = useState('');
  const [personB, setPersonB] = useState<Person | null>(null);
  const [newPerson, setNewPerson] = useState<NewPerson>(EMPTY_NEW_PERSON);
  // Box "First name unknown" of the new person
  const [newFirstNameUnknown, setNewFirstNameUnknown] = useState(false);
  // Gender chosen by the user? Otherwise it follows the relation type
  const [genderTouched, setGenderTouched] = useState(false);
  const [personErrors, setPersonErrors] = useState<PersonFormErrors>({});
  const [personError, setPersonError] = useState<string | null>(null);
  const [type, setType] = useState('PARTNER');
  const [label, setLabel] = useState('');
  const [note, setNote] = useState('');
  const [startDate, setStartDate] = useState('');
  // As long as the start date was not changed by the user, the suggestion applies (e.g. the child's date of birth)
  const [startTouched, setStartTouched] = useState(false);
  const [endDate, setEndDate] = useState('');

  // Date of birth of the current person (from the cache of the person picker)
  const { data: personsData } = useQuery<{ getPersons: Person[] }>(GET_PERSONS, { variables: { includeDeleted: false }, skip: !open });
  const currentPerson = personsData?.getPersons.find((p) => p.id === currentPersonId);
  const otherBirthDate = mode === 'new' ? newPerson.birthDate : personB?.birthDate;
  const suggestedStart = suggestedStartDate(type, currentPerson?.birthDate, otherBirthDate);
  const effectiveStart = startTouched ? startDate : suggestedStart;

  const [createPerson, { loading: creatingPerson }] = useMutation<{ createPerson: Person }>(CREATE_PERSON, {
    refetchQueries: ['GetPersons'],
  });
  const [createRelation, { loading: saving, error }] = useMutation(CREATE_RELATION, {
    // Derived relations (e.g. a second parent) affect further persons and the family tree
    refetchQueries: ['GetPersonRelations', 'GetTreeData'],
    onCompleted: () => {
      onSuccess();
      handleClose();
    },
  });

  const handleClose = () => {
    setMode('existing');
    setPersonBId('');
    setPersonB(null);
    setNewPerson(EMPTY_NEW_PERSON);
    setNewFirstNameUnknown(false);
    setGenderTouched(false);
    setPersonErrors({});
    setPersonError(null);
    setType('PARTNER');
    setLabel('');
    setNote('');
    setStartDate('');
    setStartTouched(false);
    setEndDate('');
    onClose();
  };

  const changeType = (value: string) => {
    setType(value);
    if (!genderTouched) {
      setNewPerson((p) => ({ ...p, gender: GENDER_BY_TYPE[value] ?? 'UNKNOWN' }));
    }
  };
  const updateNewPerson = (key: keyof NewPerson, value: string) => {
    setNewPerson((p) => ({ ...p, [key]: value }));
    if (key === 'gender') {
      setGenderTouched(true);
    }
    setPersonErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const dateError = effectiveStart && endDate && endDate < effectiveStart ? t('relations.form.dateOrderError') : null;
  const personChosen = mode === 'existing' ? !!personBId : !!newPerson.firstName.trim() || newFirstNameUnknown;

  /** Creates the new person; returns their id or null on errors */
  const saveNewPerson = async (): Promise<string | null> => {
    const form = { ...emptyPersonForm, ...newPerson };
    const { errors, birth } = validatePersonForm(form, { firstNameUnknown: newFirstNameUnknown });
    setPersonErrors(errors);
    if (Object.keys(errors).length > 0) {
      return null;
    }
    try {
      const result = await createPerson({
        variables: {
          data: formToInput({ ...form, firstName: newFirstNameUnknown ? UNKNOWN_GIVEN_NAME : form.firstName, birthDatePrecision: birth?.precision ?? '' }),
        },
      });
      return result.data?.createPerson.id ?? null;
    } catch (err) {
      setPersonError(apiErrorMessage(err, t));
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personChosen || dateError) {
      return;
    }
    setPersonError(null);

    let targetId = personBId;
    if (mode === 'new') {
      const created = await saveNewPerson();
      if (!created) {
        return;
      }
      // If the relation fails afterwards, the person already exists – keep them selected instead of creating them twice
      targetId = created;
      setPersonBId(created);
      setPersonB({ id: created, birthDate: newPerson.birthDate } as Person);
      setMode('existing');
    }

    await createRelation({
      variables: {
        data: {
          personAId: currentPersonId,
          personBId: targetId,
          type,
          label: label.trim() || undefined,
          note: note.trim() || undefined,
          startDate: effectiveStart.trim() || undefined,
          endDate: endDate.trim() || undefined,
        },
      },
    }).catch(() => undefined); // the error is shown via `error`
  };

  const fieldError = (key: keyof NewPerson) => (personErrors[key] ? t(`form.errors.${personErrors[key]}`) : null);

  return (
    <Dialog open={open} onClose={handleClose}>
      <form onSubmit={handleSubmit} className="flex flex-col" noValidate>
        <DialogHeader>
          <DialogTitle>{t('relations.form.title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {(error || personError) && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive" role="alert">
              {personError ?? apiErrorMessage(error, t)}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label htmlFor={mode === 'existing' ? 'relation-person' : 'new-person-firstName'}>{t('relations.form.personSelect')} *</Label>
              <div className="flex gap-1" role="group" aria-label={t('relations.form.personSource')}>
                <Button
                  type="button"
                  size="sm"
                  variant={mode === 'existing' ? 'default' : 'outline'}
                  aria-pressed={mode === 'existing'}
                  onClick={() => setMode('existing')}
                >
                  {t('relations.form.existingPerson')}
                </Button>
                <Button type="button" size="sm" variant={mode === 'new' ? 'default' : 'outline'} aria-pressed={mode === 'new'} onClick={() => setMode('new')}>
                  {t('relations.form.newPerson')}
                </Button>
              </div>
            </div>

            {open && mode === 'existing' && (
              <PersonPicker
                id="relation-person"
                value={personBId}
                onChange={(id, person) => {
                  setPersonBId(id);
                  setPersonB(person);
                }}
                excludeIds={[currentPersonId]}
              />
            )}

            {mode === 'new' && (
              <div className="space-y-3 rounded-md border bg-muted/30 p-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="new-person-firstName" required={!newFirstNameUnknown}>
                      {t('personDetail.fields.firstName')}
                    </Label>
                    <Input
                      id="new-person-firstName"
                      value={newPerson.firstName}
                      onChange={(e) => updateNewPerson('firstName', e.target.value)}
                      aria-invalid={!!personErrors.firstName}
                      disabled={newFirstNameUnknown}
                      placeholder={newFirstNameUnknown ? t('persons.unknownGivenName') : undefined}
                      autoFocus
                    />
                    {fieldError('firstName') && <p className="text-xs text-destructive">{fieldError('firstName')}</p>}
                    <FirstNameUnknownCheckbox
                      id="new-person-firstNameUnknown"
                      checked={newFirstNameUnknown}
                      onChange={(checked) => {
                        setNewFirstNameUnknown(checked);
                        if (checked) {
                          updateNewPerson('firstName', '');
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="new-person-lastName">{t('personDetail.fields.lastName')}</Label>
                    <Input
                      id="new-person-lastName"
                      value={newPerson.lastName}
                      onChange={(e) => updateNewPerson('lastName', e.target.value)}
                      aria-invalid={!!personErrors.lastName}
                    />
                    {fieldError('lastName') && <p className="text-xs text-destructive">{fieldError('lastName')}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="new-person-gender">{t('personDetail.fields.gender')}</Label>
                    <Select id="new-person-gender" value={newPerson.gender} onChange={(e) => updateNewPerson('gender', e.target.value)}>
                      {GENDER_OPTIONS.map((g) => (
                        <option key={g} value={g}>
                          {t(`gender.${g}`)}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="new-person-birthDate">{t('personDetail.fields.birthDate')}</Label>
                    <DateInput
                      id="new-person-birthDate"
                      value={newPerson.birthDate}
                      onChange={(value) => updateNewPerson('birthDate', value)}
                      showPrecision={false}
                    />
                    {fieldError('birthDate') && <p className="text-xs text-destructive">{fieldError('birthDate')}</p>}
                  </div>
                </div>
                <SimilarPersonsHint firstName={newPerson.firstName} lastName={newPerson.lastName} birthDate={newPerson.birthDate} />
                <p className="text-xs text-muted-foreground">{t('relations.form.newPersonHint')}</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">{t('relations.form.type')} *</Label>
              <Select id="type" value={type} onChange={(e) => changeType(e.target.value)} required>
                {RELATION_TYPES.map((tType) => (
                  <option key={tType} value={tType}>
                    {t(`relations.types.${tType}`)}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-muted-foreground">{t('relations.form.typeHint')}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="label">{t('relations.form.label')}</Label>
              <Input id="label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t('relations.form.labelPlaceholder')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">{t('relations.form.note')}</Label>
            <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">{t('relations.form.startDate')}</Label>
              <Input
                id="startDate"
                type="date"
                value={effectiveStart}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setStartTouched(true);
                }}
                aria-describedby={!startTouched && suggestedStart ? 'startDate-hint' : undefined}
              />
              {!startTouched && suggestedStart && (
                <p id="startDate-hint" className="text-xs text-muted-foreground">
                  {t('relations.form.startFromBirth')}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">{t('relations.form.endDate')}</Label>
              <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          {dateError && (
            <p className="text-sm text-destructive" role="alert">
              {dateError}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={!personChosen || !!dateError || saving || creatingPerson}>
            {(saving || creatingPerson) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t(mode === 'new' ? 'relations.form.createAndSave' : 'common.save')}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
