import { useTranslation } from 'react-i18next';
import type { Person } from '@/features/persons/types/person';
import { formatPersonName } from '@/features/persons/lib/personUtils';
import type { ReportOptions } from '@/stores/settingsStore';
import type { Family } from '../lib/family';
import { ancestorList, descendantList, roman } from '../lib/numbering';
import { isLiving } from '../lib/reportData';
import { relationDay, yearOfDate } from '../lib/dates';
import { datePlace } from '../lib/format';
import { Sheet } from './ReportParts';

interface ListProps {
  root: Person;
  family: Family;
  generations: number;
  options: ReportOptions;
}

/** Birth and death of a person in one line, e.g. "* 04.01.1880, Köln † 1950, Bonn" */
function lifeLineOf(options: ReportOptions) {
  return (person: Person) => {
    if (options.hideLiving && isLiving(person)) {
      const born = yearOfDate(person.birthDate);
      return born !== null ? `* ${born}` : '';
    }
    const birth = datePlace(person.birthDate, person.birthPlace);
    const death = datePlace(person.deathDate, person.deathPlace);
    return [birth && `* ${birth}`, death && `† ${death}`].filter(Boolean).join(' · ');
  };
}

/** Name of a generation of ancestors: "Parents", "Grandparents" … further back "Generation VII" */
function generationName(generation: number, t: (key: string, options?: Record<string, unknown>) => string) {
  return generation <= 5 ? t(`reports.generationNames.${generation}`) : t('reports.generation', { number: roman(generation) });
}

/** Ancestors with Kekulé numbers, generation by generation */
export function AncestorList({ root, family, generations, options }: ListProps) {
  const { t, i18n } = useTranslation();
  const lifeLine = lifeLineOf(options);
  const list = ancestorList(family, root.id, generations);
  const byNumber = new Map(list.flatMap((g) => g.entries.map((entry) => [entry.number, entry.person] as const)));

  // Wedding of the parents of number n (2n and 2n + 1): shown with the father
  const wedding = (number: number) => {
    const partner = byNumber.get(number + 1);
    const person = byNumber.get(number);
    const relation = partner && person ? family.partners(person.id).find((link) => link.person.id === partner.id)?.relation : undefined;
    return relation?.startDate ? t('reports.marriedOn', { date: relationDay(relation.startDate, i18n.language) }) : '';
  };

  return (
    <Sheet title={formatPersonName(root)} subtitle={t('reports.types.ancestors')}>
      {list.length <= 1 && <p className="text-neutral-600">{t('reports.noAncestors')}</p>}
      {list.map(({ generation, entries }) => (
        <div key={generation} className="mt-3">
          <h3 className="report-keep mb-1 border-b border-neutral-200 text-[11pt] font-semibold">
            {roman(generation)} · {generationName(generation, t)}
          </h3>
          <table className="w-full border-collapse text-left">
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.number} className="report-keep align-top">
                  <td className="w-14 py-0.5 pr-2 text-right font-mono text-[9pt] text-neutral-600">{entry.number}</td>
                  <td className="py-0.5">
                    <span className="font-medium">{formatPersonName(entry.person)}</span>
                    {entry.seeNumber !== undefined ? (
                      <span className="text-neutral-600"> – {t('reports.see', { number: entry.seeNumber })}</span>
                    ) : (
                      <span className="block text-[9pt] text-neutral-700">
                        {[lifeLine(entry.person), entry.number % 2 === 0 && wedding(entry.number)].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </Sheet>
  );
}

/** Descendants with d'Aboville numbers, indented by generation, with their partners */
export function DescendantList({ root, family, generations, options }: ListProps) {
  const { t, i18n } = useTranslation();
  const lifeLine = lifeLineOf(options);
  const list = descendantList(family, root.id, generations);

  return (
    <Sheet title={formatPersonName(root)} subtitle={t('reports.types.descendants')}>
      {list.length <= 1 && <p className="text-neutral-600">{t('reports.noDescendants')}</p>}
      <div className="space-y-1">
        {list.map((entry) => (
          <div key={entry.number} className="report-keep" style={{ paddingLeft: `${Math.min(entry.depth, 10) * 1.1}em` }}>
            <p>
              <span className="mr-2 font-mono text-[9pt] text-neutral-600">{entry.number}</span>
              <span className="font-medium">{formatPersonName(entry.person)}</span>
              {entry.seeNumber !== undefined ? (
                <span className="text-neutral-600"> – {t('reports.see', { number: entry.seeNumber })}</span>
              ) : (
                lifeLine(entry.person) && <span className="ml-2 text-[9pt] text-neutral-700">{lifeLine(entry.person)}</span>
              )}
            </p>
            {entry.partners.map(({ person, relation }) => (
              <p key={person.id} className="ml-[4.5em] text-[9pt] text-neutral-700">
                {t('reports.partner')}: <span className="font-medium text-neutral-900">{formatPersonName(person)}</span>
                {[lifeLine(person), relation.startDate && t('reports.marriedOn', { date: relationDay(relation.startDate, i18n.language) })]
                  .filter(Boolean)
                  .map((text) => ` · ${text}`)
                  .join('')}
              </p>
            ))}
          </div>
        ))}
      </div>
    </Sheet>
  );
}
