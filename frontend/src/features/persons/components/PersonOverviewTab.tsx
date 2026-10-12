import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { Person } from '@/features/persons/types/person';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatFieldValue } from '@/features/persons/lib/personUtils';
import { languageName } from '@/features/persons/lib/languages';

interface PersonOverviewTabProps {
  person: Person;
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-border/60 py-3 last:border-0 sm:grid-cols-3">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm sm:col-span-2">{value}</dd>
    </div>
  );
}

function FieldSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl>{children}</dl>
      </CardContent>
    </Card>
  );
}

export function PersonOverviewTab({ person }: PersonOverviewTabProps) {
  const { t, i18n } = useTranslation();

  const genderLabel = t(`gender.${person.gender}`, person.gender);
  const maritalStatusLabel = person.maritalStatus ? t(`maritalStatus.${person.maritalStatus}`, person.maritalStatus) : '—';

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <FieldSection title={t('personDetail.sections.personal')}>
        <FieldRow label={t('personDetail.fields.firstName')} value={formatFieldValue(person.firstName)} />
        <FieldRow label={t('personDetail.fields.lastName')} value={formatFieldValue(person.lastName)} />
        <FieldRow label={t('personDetail.fields.middleName')} value={formatFieldValue(person.middleName)} />
        <FieldRow label={t('personDetail.fields.birthName')} value={formatFieldValue(person.birthName)} />
        <FieldRow label={t('personDetail.fields.title')} value={formatFieldValue(person.title)} />
        <FieldRow label={t('personDetail.fields.nickname')} value={formatFieldValue(person.nickname)} />
        <FieldRow label={t('personDetail.fields.birthDate')} value={formatFieldValue(person.birthDate)} />
        <FieldRow label={t('personDetail.fields.birthPlace')} value={formatFieldValue(person.birthPlace)} />
        <FieldRow label={t('personDetail.fields.deathDate')} value={formatFieldValue(person.deathDate)} />
        <FieldRow label={t('personDetail.fields.deathPlace')} value={formatFieldValue(person.deathPlace)} />
        <FieldRow label={t('personDetail.fields.gender')} value={genderLabel} />
      </FieldSection>

      <div className="space-y-6">
        <FieldSection title={t('personDetail.sections.contact')}>
          <FieldRow label={t('personDetail.fields.address')} value={formatFieldValue(person.address)} />
          <FieldRow label={t('personDetail.fields.phone')} value={formatFieldValue(person.phone)} />
          <FieldRow label={t('personDetail.fields.email')} value={formatFieldValue(person.email)} />
        </FieldSection>

        <FieldSection title={t('personDetail.sections.other')}>
          <FieldRow label={t('personDetail.fields.occupation')} value={formatFieldValue(person.occupation)} />
          <FieldRow label={t('personDetail.fields.hobbies')} value={formatFieldValue(person.hobbies)} />
          <FieldRow label={t('personDetail.fields.maritalStatus')} value={maritalStatusLabel} />
          <FieldRow label={t('personDetail.fields.nationality')} value={formatFieldValue(person.nationality)} />
          <FieldRow label={t('personDetail.fields.languages')} value={formatFieldValue(person.languages.map((lang) => languageName(lang, i18n.language)))} />
        </FieldSection>
      </div>
    </div>
  );
}
