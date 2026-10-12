import { useState, useEffect, useRef } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { CREATE_PERSON, UPDATE_PERSON, GET_PERSONS } from '@/features/persons/graphql/personQueries';
import { CREATE_RELATION } from '@/features/persons/graphql/relationQueries';
import type { Person, PersonInput } from '@/features/persons/types/person';
import { validatePersonForm, type PersonFormErrors } from '@/features/persons/lib/personValidation';
import { GENDER_OPTIONS, emptyPersonForm as emptyForm, formToInput } from '@/features/persons/lib/personForm';
import { UNKNOWN_GIVEN_NAME, formatPersonName, getInitials, isUnknownGivenName } from '@/features/persons/lib/personUtils';
import { MAX_UPLOAD_BYTES, uploadMedia } from '@/features/persons/lib/uploadMedia';
import { apiErrorMessage, apiErrorReason } from '@/lib/apiErrors';
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { ClearableInput } from '@/components/ui/ClearableInput';
import { DateInput } from '@/components/ui/DateInput';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/Label';
import { Avatar } from '@/components/ui/Avatar';
import { FirstNameUnknownCheckbox } from './FirstNameUnknownCheckbox';
import { LanguagePicker } from './LanguagePicker';
import { PendingRelationsSection, type PendingRelation } from './PendingRelationsSection';
import { SimilarPersonsHint } from './SimilarPersonsHint';

interface PersonFormDialogProps {
  open: boolean;
  onClose: () => void;
  /** When provided, the dialog enters edit-mode with pre-filled fields */
  person?: Person | null;
  /** Called after a successful create or update */
  onSuccess?: (person: Person) => void;
}

const MARITAL_STATUS_OPTIONS = ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'CIVIL_PARTNERSHIP'] as const;

function personToForm(person: Person): PersonInput {
  return {
    // The placeholder of an unknown first name is not shown as text: the box "First name unknown" is ticked instead
    firstName: isUnknownGivenName(person.firstName) ? '' : person.firstName,
    lastName: person.lastName ?? '',
    middleName: person.middleName ?? '',
    birthName: person.birthName ?? '',
    title: person.title ?? '',
    nickname: person.nickname ?? '',
    birthDate: person.birthDate ?? '',
    birthPlace: person.birthPlace ?? '',
    gender: person.gender,
    deathDate: person.deathDate ?? '',
    deathPlace: person.deathPlace ?? '',
    address: person.address ?? '',
    phone: person.phone ?? '',
    email: person.email ?? '',
    occupation: person.occupation ?? '',
    hobbies: person.hobbies ?? '',
    maritalStatus: person.maritalStatus ?? 'SINGLE',
    nationality: person.nationality ?? '',
    languages: person.languages ?? [],
  };
}

interface FormFieldProps {
  label: string;
  id: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}

function FormField({ label, id, required, error, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function PersonFormDialog({ open, onClose, person, onSuccess }: PersonFormDialogProps) {
  const { t } = useTranslation();
  const isEditMode = !!person;

  const client = useApolloClient();
  const [form, setForm] = useState<PersonInput>(emptyForm);
  const [firstNameUnknown, setFirstNameUnknown] = useState(false);
  const [errors, setErrors] = useState<PersonFormErrors>({});
  const [pendingRelations, setPendingRelations] = useState<PendingRelation[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [savingRelations, setSavingRelations] = useState(false);
  // The profile picture is uploaded only after saving (when creating, the person does not exist before)
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);

  // Reset form when dialog opens or person changes
  useEffect(() => {
    if (open) {
      setForm(person ? personToForm(person) : emptyForm);
      setFirstNameUnknown(!!person && isUnknownGivenName(person.firstName));
      setErrors({});
      setPendingRelations([]);
      setSubmitError(null);
      setProfileFile(null);
      setProfileError(null);
    }
  }, [open, person]);

  // Preview of the chosen image; the object URL is released again when it changes
  useEffect(() => {
    if (!profileFile || typeof URL.createObjectURL !== 'function') {
      setProfilePreview(null);
      return;
    }
    const url = URL.createObjectURL(profileFile);
    setProfilePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [profileFile]);

  const handleProfileFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      setProfileError(t('media.imageRequired'));
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setProfileError(t('media.fileTooLarge'));
      return;
    }
    setProfileError(null);
    setProfileFile(file);
  };

  const [createPerson, { loading: creating }] = useMutation(CREATE_PERSON, {
    refetchQueries: [{ query: GET_PERSONS, variables: { includeDeleted: false } }],
  });

  const [updatePerson, { loading: updating }] = useMutation(UPDATE_PERSON);
  const [createRelation] = useMutation(CREATE_RELATION);

  const loading = creating || updating || savingRelations;

  const updateField = <K extends keyof PersonInput>(key: K, value: PersonInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    // Clear error on change
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  /** Props for a text field with an X button to clear it */
  const textField = (key: keyof PersonInput) => ({
    id: key,
    value: (form[key] as string | undefined) ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => updateField(key, e.target.value),
    onClear: () => updateField(key, ''),
    'aria-invalid': !!errors[key],
  });

  const errorText = (key: keyof PersonInput) => (errors[key] ? t(`form.errors.${errors[key]}`) : undefined);

  /** Creates the relations collected in the dialog; returns the names of failed entries. */
  const saveRelations = async (personId: string): Promise<string[]> => {
    const failed: string[] = [];
    for (const rel of pendingRelations) {
      try {
        await createRelation({
          variables: {
            data: {
              personAId: personId,
              personBId: rel.person.id,
              type: rel.type,
              startDate: rel.startDate,
              endDate: rel.endDate,
            },
          },
        });
      } catch (err) {
        // Relations that already exist (e.g. derived automatically) are not an error
        if (apiErrorReason(err) !== 'DUPLICATE') {
          failed.push(formatPersonName(rel.person));
        }
      }
    }
    if (pendingRelations.length > 0) {
      await client.refetchQueries({ include: ['GetPersonRelations', 'GetTreeData'] });
    }
    return failed;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const { errors: newErrors, birth, death } = validatePersonForm(form, { firstNameUnknown });
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      setSubmitError(t('form.errors.checkInput'));
      return;
    }

    const input = formToInput({
      ...form,
      firstName: firstNameUnknown ? UNKNOWN_GIVEN_NAME : form.firstName,
      // Precision is derived from the input
      birthDatePrecision: birth?.precision ?? '',
      deathDatePrecision: death?.precision ?? '',
    });

    let saved: Person;
    try {
      if (isEditMode && person) {
        const result = await updatePerson({
          variables: { id: person.id, data: input },
        });
        saved = result.data.updatePerson;
      } else {
        const result = await createPerson({
          variables: { data: input },
        });
        saved = result.data.createPerson;
      }
    } catch (err) {
      setSubmitError(apiErrorMessage(err, t));
      return;
    }

    setSavingRelations(true);
    const failedRelations = await saveRelations(saved.id);
    // The profile picture goes into the person's media and is set as profile picture right away
    let profileFailure: string | null = null;
    if (profileFile) {
      const result = await uploadMedia(profileFile, saved.id, 'PROFILE_PICTURE');
      if (result.ok) {
        await client.refetchQueries({ include: ['GetPerson', 'GetPersons', 'GetTreeData', 'GetPersonRelations', 'GetPersonMedia'] });
      } else {
        profileFailure = t(`apiErrors.${result.reason}`, { defaultValue: t('media.uploadError') });
      }
    }
    setSavingRelations(false);

    onSuccess?.(saved);
    onClose();
    if (failedRelations.length > 0) {
      window.alert(t('form.errors.relationsFailed', { names: failedRelations.join(', ') }));
    }
    if (profileFailure) {
      window.alert(t('form.errors.profilePictureFailed', { reason: profileFailure }));
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        <DialogHeader>
          <DialogTitle>{isEditMode ? t('form.editTitle') : t('form.createTitle')}</DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-6 overflow-y-auto pr-2">
          {/* ── Personal data ── */}
          <fieldset className="space-y-4">
            <legend className="mb-2 text-sm font-semibold text-muted-foreground">{t('personDetail.sections.personal')}</legend>

            {/* Profile picture: uploaded when saving and stored with the person's media */}
            <div className="flex items-center gap-4">
              <Avatar
                initials={getInitials({ firstName: form.firstName || '?', lastName: form.lastName })}
                imageUrl={profilePreview ?? person?.profilePictureUrl}
                size="lg"
              />
              <div className="space-y-2">
                <p className="text-sm font-medium" id="profile-picture-label">
                  {t('form.profilePicture')}
                </p>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    ref={profileInputRef}
                    onChange={handleProfileFile}
                    className="hidden"
                    data-testid="profile-picture-input"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => profileInputRef.current?.click()} aria-describedby="profile-picture-label">
                    <ImagePlus className="h-4 w-4" />
                    {profileFile || person?.profilePictureUrl ? t('form.changeProfilePicture') : t('form.chooseProfilePicture')}
                  </Button>
                  {profileFile && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setProfileFile(null)}>
                      <X className="h-4 w-4" />
                      {t('form.discardProfilePicture')}
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {profileFile ? t('form.profilePictureSelected', { name: profileFile.name }) : t('form.profilePictureHint')}
                </p>
                {profileError && (
                  <p className="text-xs text-destructive" role="alert">
                    {profileError}
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={t('personDetail.fields.firstName')} id="firstName" required={!firstNameUnknown} error={errorText('firstName')}>
                <ClearableInput
                  {...textField('firstName')}
                  autoFocus
                  maxLength={100}
                  disabled={firstNameUnknown}
                  placeholder={firstNameUnknown ? t('persons.unknownGivenName') : undefined}
                />
                <FirstNameUnknownCheckbox
                  id="firstNameUnknown"
                  checked={firstNameUnknown}
                  onChange={(checked) => {
                    setFirstNameUnknown(checked);
                    if (checked) {
                      updateField('firstName', '');
                    }
                  }}
                />
              </FormField>

              <FormField label={t('personDetail.fields.lastName')} id="lastName" error={errorText('lastName')}>
                <ClearableInput {...textField('lastName')} maxLength={100} />
              </FormField>

              <FormField label={t('personDetail.fields.middleName')} id="middleName" error={errorText('middleName')}>
                <ClearableInput {...textField('middleName')} maxLength={100} />
              </FormField>

              <FormField label={t('personDetail.fields.birthName')} id="birthName" error={errorText('birthName')}>
                <ClearableInput {...textField('birthName')} maxLength={100} />
              </FormField>

              <FormField label={t('personDetail.fields.title')} id="title">
                <ClearableInput {...textField('title')} placeholder={t('form.titlePlaceholder')} maxLength={50} />
              </FormField>

              <FormField label={t('personDetail.fields.nickname')} id="nickname">
                <ClearableInput {...textField('nickname')} maxLength={100} />
              </FormField>
            </div>

            {/* Only when creating: hint about possible duplicates */}
            {!isEditMode && <SimilarPersonsHint firstName={form.firstName} lastName={form.lastName} birthName={form.birthName} birthDate={form.birthDate} />}

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={t('personDetail.fields.gender')} id="gender">
                <Select id="gender" value={form.gender} onChange={(e) => updateField('gender', e.target.value)}>
                  {GENDER_OPTIONS.map((g) => (
                    <option key={g} value={g}>
                      {t(`gender.${g}`)}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label={t('personDetail.fields.maritalStatus')} id="maritalStatus">
                <Select id="maritalStatus" value={form.maritalStatus ?? ''} onChange={(e) => updateField('maritalStatus', e.target.value)}>
                  <option value="">{t('form.noSelection')}</option>
                  {MARITAL_STATUS_OPTIONS.map((f) => (
                    <option key={f} value={f}>
                      {t(`maritalStatus.${f}`)}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={t('personDetail.fields.birthDate')} id="birthDate" error={errorText('birthDate')}>
                <DateInput id="birthDate" value={form.birthDate ?? ''} onChange={(v) => updateField('birthDate', v)} />
              </FormField>

              <FormField label={t('personDetail.fields.birthPlace')} id="birthPlace">
                <ClearableInput {...textField('birthPlace')} />
              </FormField>

              <FormField label={t('personDetail.fields.deathDate')} id="deathDate" error={errorText('deathDate')}>
                <DateInput id="deathDate" value={form.deathDate ?? ''} onChange={(v) => updateField('deathDate', v)} />
              </FormField>

              <FormField label={t('personDetail.fields.deathPlace')} id="deathPlace">
                <ClearableInput {...textField('deathPlace')} />
              </FormField>
            </div>
            <p className="text-xs text-muted-foreground">{t('form.dateHelp')}</p>
          </fieldset>

          {/* ── Kontakt ── */}
          <fieldset className="space-y-4">
            <legend className="mb-2 text-sm font-semibold text-muted-foreground">{t('personDetail.sections.contact')}</legend>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={t('personDetail.fields.address')} id="address">
                <ClearableInput {...textField('address')} />
              </FormField>

              <FormField label={t('personDetail.fields.phone')} id="phone" error={errorText('phone')}>
                <ClearableInput {...textField('phone')} type="tel" placeholder="+49 30 123456" />
              </FormField>

              <FormField label={t('personDetail.fields.email')} id="email" error={errorText('email')}>
                <ClearableInput {...textField('email')} type="email" placeholder="name@example.com" />
              </FormField>
            </div>
          </fieldset>

          {/* ── Weitere Angaben ── */}
          <fieldset className="space-y-4">
            <legend className="mb-2 text-sm font-semibold text-muted-foreground">{t('personDetail.sections.other')}</legend>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={t('personDetail.fields.occupation')} id="occupation">
                <ClearableInput {...textField('occupation')} />
              </FormField>

              <FormField label={t('personDetail.fields.nationality')} id="nationality">
                <ClearableInput {...textField('nationality')} />
              </FormField>
            </div>

            <FormField label={t('personDetail.fields.languages')} id="languages">
              <LanguagePicker id="languages" value={form.languages ?? []} onChange={(languages) => updateField('languages', languages)} />
            </FormField>

            <FormField label={t('personDetail.fields.hobbies')} id="hobbies">
              <Textarea id="hobbies" value={form.hobbies ?? ''} onChange={(e) => updateField('hobbies', e.target.value)} rows={2} />
            </FormField>
          </fieldset>

          {/* ── Relations ── */}
          <fieldset className="space-y-3">
            <legend className="mb-2 text-sm font-semibold text-muted-foreground">{t('relations.title')}</legend>
            {isEditMode && <p className="text-xs text-muted-foreground">{t('form.relationsEditHint')}</p>}
            <PendingRelationsSection
              value={pendingRelations}
              onChange={setPendingRelations}
              excludeIds={person ? [person.id] : []}
              currentBirthDate={form.birthDate}
            />
          </fieldset>
        </div>

        {submitError && (
          <p className="mt-4 rounded-md bg-destructive/15 p-3 text-sm text-destructive" role="alert">
            {submitError}
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEditMode ? t('common.save') : t('form.create')}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
