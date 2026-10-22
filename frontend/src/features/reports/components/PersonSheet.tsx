import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { Person } from '@/features/persons/types/person';
import { isImage, mediaUrl } from '@/features/persons/types/media';
import { calculateAge, formatPersonName, isDeceased } from '@/features/persons/lib/personUtils';
import { languageName } from '@/features/persons/lib/languages';
import { apiUrl } from '@/lib/platform';
import type { ReportOptions } from '@/stores/settingsStore';
import type { Family } from '../lib/family';
import { footnotes, isLiving, type ReportPersonData } from '../lib/reportData';
import { relationDay, yearOfDate } from '../lib/dates';
import { datePlace, personWithYears } from '../lib/format';
import { Fields, FootnoteList, Marks, Part, Sheet } from './ReportParts';

interface PersonSheetProps {
  person: Person;
  family: Family;
  data?: ReportPersonData;
  options: ReportOptions;
}

/** All data of one person on one or more pages */
export function PersonSheet({ person, family, data, options }: PersonSheetProps) {
  const { t, i18n } = useTranslation();
  const name = formatPersonName(person);

  if (options.hideLiving && isLiving(person)) {
    const born = yearOfDate(person.birthDate);
    return (
      <Sheet title={name} subtitle={t('reports.types.person')}>
        {born !== null && <p>{t('reports.bornIn', { year: born })}</p>}
        <p className="mt-2 text-neutral-600">{t('reports.livingHidden')}</p>
      </Sheet>
    );
  }

  const notes = footnotes(options.sources ? (data?.citations ?? []) : []);
  const { father, mother } = family.fatherAndMother(person.id);
  const partners = family.partners(person.id);
  const children = family.children(person.id);
  const siblings = family.siblings(person.id);
  const age = calculateAge(person.birthDate, person.deathDate);
  const shown = (other: Person) => (options.hideLiving && isLiving(other) ? formatPersonName(other) : personWithYears(other));
  const photos = options.photos ? (data?.media ?? []).filter((media) => isImage(media)) : [];

  return (
    <Sheet title={name} subtitle={t('reports.types.person')}>
      <div className="flex gap-4">
        <div className="min-w-0 flex-1">
          <Fields
            rows={[
              [t('personDetail.fields.nickname'), person.nickname],
              [
                t('reports.born'),
                datePlace(person.birthDate, person.birthPlace) && (
                  <>
                    {datePlace(person.birthDate, person.birthPlace)}
                    <Marks numbers={notes.marks({ kind: 'PERSON', fact: 'BIRTH' })} />
                  </>
                ),
              ],
              [
                t('reports.died'),
                datePlace(person.deathDate, person.deathPlace) && (
                  <>
                    {datePlace(person.deathDate, person.deathPlace)}
                    <Marks numbers={notes.marks({ kind: 'PERSON', fact: 'DEATH' })} />
                  </>
                ),
              ],
              [isDeceased(person) ? t('reports.ageAtDeath') : t('reports.age'), age !== null && t('reports.years', { count: age })],
              [t('personDetail.fields.gender'), person.gender !== 'UNKNOWN' && t(`gender.${person.gender}`)],
              [t('personDetail.fields.occupation'), person.occupation],
              [t('personDetail.fields.nationality'), person.nationality],
              [t('personDetail.fields.languages'), person.languages.map((code) => languageName(code, i18n.language)).join(', ')],
              [t('personDetail.fields.maritalStatus'), person.maritalStatus && t(`maritalStatus.${person.maritalStatus}`, person.maritalStatus)],
              [t('personDetail.fields.hobbies'), person.hobbies],
              ...(options.contact
                ? ([
                    [t('personDetail.fields.address'), person.address],
                    [t('personDetail.fields.phone'), person.phone],
                    [t('personDetail.fields.email'), person.email],
                  ] as Array<[string, string | null | undefined]>)
                : []),
            ]}
          />
          {(notes.marks({ kind: 'PERSON', fact: 'NAME' }).length > 0 || notes.marks({ kind: 'PERSON', fact: 'GENERAL' }).length > 0) && (
            <p className="mt-1 text-[8.5pt] text-neutral-600">
              {t('reports.nameAndPerson')}
              <Marks numbers={[...notes.marks({ kind: 'PERSON', fact: 'NAME' }), ...notes.marks({ kind: 'PERSON', fact: 'GENERAL' })]} />
            </p>
          )}
        </div>
        {options.photos && person.profilePictureUrl && (
          <img src={apiUrl(person.profilePictureUrl)} alt="" className="h-32 w-28 shrink-0 rounded-sm object-cover" />
        )}
      </div>

      <Part title={t('reports.family')}>
        <Fields
          rows={[
            [t('reports.father'), father && shown(father)],
            [t('reports.mother'), mother && shown(mother)],
            ...partners.map(
              ({ person: partner, relation }) =>
                [
                  t('reports.partner'),
                  <>
                    {shown(partner)}
                    {relation.startDate && ` · ${t('reports.marriedOn', { date: relationDay(relation.startDate, i18n.language) })}`}
                    <Marks numbers={notes.marks({ kind: 'RELATION', relationId: relation.id })} />
                  </>,
                ] as [string, ReactNode],
            ),
            [t('reports.children'), children.length > 0 && children.map(shown).join('; ')],
            [t('reports.siblings'), siblings.length > 0 && siblings.map(shown).join('; ')],
          ]}
        />
      </Part>

      {(data?.events.length ?? 0) > 0 && (
        <Part title={t('reports.events')}>
          <table className="w-full border-collapse text-left">
            <tbody>
              {data!.events.map((event) => (
                <tr key={event.id} className="report-keep border-b border-neutral-100 align-top">
                  <td className="w-28 py-0.5 pr-2 text-neutral-700">{event.date}</td>
                  <td className="py-0.5 pr-2">
                    <span className="font-medium">{event.title}</span>
                    <Marks numbers={notes.marks({ kind: 'EVENT', eventId: event.id })} />
                    {event.place && <span className="text-neutral-700">, {event.place}</span>}
                    {event.description && <span className="block whitespace-pre-line text-[9pt] text-neutral-700">{event.description}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Part>
      )}

      {options.notes && (data?.notes.length ?? 0) > 0 && (
        <Part title={t('reports.notes')}>
          {data!.notes.map((note) => (
            <p key={note.id} className="mb-2 whitespace-pre-line">
              {note.text}
            </p>
          ))}
        </Part>
      )}

      {photos.length > 0 && (
        <Part title={t('reports.photos')}>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((media) => (
              <figure key={media.id} className="report-keep">
                <img src={mediaUrl(media)} alt="" className="h-32 w-full object-contain" />
                <figcaption className="truncate text-[7.5pt] text-neutral-600">{media.originalFileName}</figcaption>
              </figure>
            ))}
          </div>
        </Part>
      )}

      <FootnoteList notes={notes} />
    </Sheet>
  );
}
