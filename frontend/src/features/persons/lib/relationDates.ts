import { displayToIso } from '@/lib/dateParsing';
import type { RelationType } from './relationTypes';

/**
 * Suggested start of a relation: parent-child relations start with the birth of the child.
 * Semantics as for the relation types: "the selected person is <type> of the current person" –
 * so for CHILD the selected person is the child, for MOTHER/FATHER the current one.
 * Only exact dates of birth are used ("um 1950" or "1950" give no day).
 */
export function suggestedStartDate(
  type: RelationType | string,
  currentBirthDate: string | null | undefined,
  otherBirthDate: string | null | undefined,
): string {
  const childBirth = type === 'CHILD' ? otherBirthDate : type === 'MOTHER' || type === 'FATHER' ? currentBirthDate : null;
  return childBirth ? displayToIso(childBirth) : '';
}
