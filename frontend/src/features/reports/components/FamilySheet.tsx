import { useTranslation } from 'react-i18next';
import type { Person } from '@/features/persons/types/person';
import { formatPersonName } from '@/features/persons/lib/personUtils';
import type { ReportOptions } from '@/stores/settingsStore';
import type { Family, ReportRelation } from '../lib/family';
import { isLiving, type ReportPersonData } from '../lib/reportData';
import { relationDay, yearOfDate } from '../lib/dates';
import { datePlace, personWithYears } from '../lib/format';
import { Fields, Part, Sheet } from './ReportParts';

interface FamilySheetProps {
  /** The person the sheet was asked for */
  person: Person;
  /** Their partner – null for a sheet of a parent alone with their children */
  partner: Person | null;
  relation: ReportRelation | null;
  family: Family;
  data: Map<string, ReportPersonData>;
  options: ReportOptions;
}

/** A couple with their wedding, their parents and their children (family group sheet) */
export function FamilySheet({ person, partner, relation, family, data, options }: FamilySheetProps) {
  const { t, i18n } = useTranslation();
  const hidden = (p: Person) => options.hideLiving && isLiving(p);
  const shown = (p: Person) => (hidden(p) ? formatPersonName(p) : personWithYears(p));
  const children = partner ? family.childrenOf(person.id, partner.id) : family.children(person.id);
  // Place of the wedding: from a life event "Wedding" of one of the two
  const wedding = [person, partner].flatMap((p) => (p ? (data.get(p.id)?.events ?? []) : [])).find((event) => event.category === 'WEDDING');
  const title = partner ? `${formatPersonName(person)} & ${formatPersonName(partner)}` : formatPersonName(person);

  const spouse = (p: Person) => {
    const { father, mother } = family.fatherAndMother(p.id);
    const born = yearOfDate(p.birthDate);
    return (
      <div className="report-keep min-w-0 flex-1">
        <p className="font-semibold">{formatPersonName(p)}</p>
        {hidden(p) ? (
          <p className="text-neutral-600">{born !== null ? t('reports.bornIn', { year: born }) : t('reports.livingHidden')}</p>
        ) : (
          <Fields
            rows={[
              [t('reports.born'), datePlace(p.birthDate, p.birthPlace)],
              [t('reports.died'), datePlace(p.deathDate, p.deathPlace)],
              [t('personDetail.fields.occupation'), p.occupation],
              [t('reports.father'), father && shown(father)],
              [t('reports.mother'), mother && shown(mother)],
            ]}
          />
        )}
      </div>
    );
  };

  return (
    <Sheet title={title} subtitle={t('reports.types.family')}>
      <div className="flex gap-6">
        {spouse(person)}
        {partner && spouse(partner)}
      </div>

      {partner && (
        <Part title={t('reports.wedding')}>
          <p>
            {[relation?.startDate && relationDay(relation.startDate, i18n.language), !relation?.startDate && wedding?.date, wedding?.place]
              .filter(Boolean)
              .join(', ') || t('reports.unknown')}
            {relation?.endDate && ` · ${t('reports.until', { date: relationDay(relation.endDate, i18n.language) })}`}
          </p>
        </Part>
      )}

      <Part title={t('reports.children')}>
        {children.length === 0 ? (
          <p className="text-neutral-600">{t('reports.noChildren')}</p>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-neutral-300 text-[8.5pt] text-neutral-600">
                <th className="w-6 py-0.5 font-normal">#</th>
                <th className="py-0.5 pr-2 font-normal">{t('reports.name')}</th>
                <th className="py-0.5 pr-2 font-normal">{t('reports.born')}</th>
                <th className="py-0.5 pr-2 font-normal">{t('reports.died')}</th>
                <th className="py-0.5 font-normal">{t('reports.partner')}</th>
              </tr>
            </thead>
            <tbody>
              {children.map((child, i) => (
                <tr key={child.id} className="report-keep border-b border-neutral-100 align-top">
                  <td className="py-0.5 text-neutral-600">{i + 1}</td>
                  <td className="py-0.5 pr-2 font-medium">{formatPersonName(child)}</td>
                  <td className="py-0.5 pr-2">{hidden(child) ? (yearOfDate(child.birthDate) ?? '') : datePlace(child.birthDate, child.birthPlace)}</td>
                  <td className="py-0.5 pr-2">{hidden(child) ? '' : datePlace(child.deathDate, child.deathPlace)}</td>
                  <td className="py-0.5">
                    {family
                      .partners(child.id)
                      .map(({ person: p }) => formatPersonName(p))
                      .join('; ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Part>
    </Sheet>
  );
}
