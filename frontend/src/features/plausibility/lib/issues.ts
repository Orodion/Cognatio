import type { TFunction } from 'i18next';
import { apiErrorReason } from '@/lib/apiErrors';

/** A possible error as the backend reports it (lib/plausibility/checks.ts) */
export interface IssueValues {
  code: string;
  role?: string | null;
  gender?: string | null;
  kinship?: string | null;
  age?: number | null;
  /** The dates leave a range of ages: "at most" (PARENT_TOO_YOUNG) or "at least" `age` */
  inexact?: boolean | null;
  count?: number | null;
  event?: string | null;
}

/** Groups of the page, in this order */
export const ISSUE_GROUPS: Record<string, string[]> = {
  relations: [
    'ROLE_GENDER',
    'PARTNER_IS_RELATIVE',
    'TOO_MANY_PARENTS',
    'CHILD_BORN_BEFORE_PARENT',
    'PARENT_TOO_YOUNG',
    'MOTHER_TOO_OLD',
    'PARENT_DIED_BEFORE_BIRTH',
    'PARTNERSHIP_BEFORE_BIRTH',
    'PARTNERSHIP_AFTER_DEATH',
  ],
  dates: ['DEATH_BEFORE_BIRTH', 'LIFESPAN_TOO_LONG', 'LIVING_TOO_OLD', 'EVENT_BEFORE_BIRTH', 'EVENT_AFTER_DEATH'],
  duplicates: ['POSSIBLE_DUPLICATE', 'ANCESTOR_CYCLE'],
};

/** The issue as a sentence in the language of the interface; `names` are the persons concerned, the first one first */
export function issueText(issue: IssueValues, names: string[], t: TFunction): string {
  return t(`plausibility.issues.${issue.code}`, {
    context: issue.inexact ? 'inexact' : undefined,
    a: names[0],
    b: names[1],
    names: names.join(', '),
    age: issue.age ?? undefined,
    count: issue.count ?? undefined,
    event: issue.event ?? undefined,
    role: issue.role ? t(`plausibility.roles.${issue.role}`) : undefined,
    gender: issue.gender ? t(`plausibility.genders.${issue.gender}`) : undefined,
    kinship: issue.kinship ? t(`plausibility.kinship.${issue.kinship}`) : undefined,
  });
}

interface RefusedIssue extends IssueValues {
  personIds: string[];
}

/** The possible errors of a relation the backend refused as IMPLAUSIBLE; null for any other error */
export function implausibleIssues(err: unknown): RefusedIssue[] | null {
  if (apiErrorReason(err) !== 'IMPLAUSIBLE') {
    return null;
  }
  const issues = (err as { graphQLErrors?: Array<{ extensions?: { issues?: unknown } }> }).graphQLErrors?.[0]?.extensions?.issues;
  return Array.isArray(issues) ? (issues as RefusedIssue[]) : [];
}

/**
 * Saves a relation; if it looks wrong, lists why and asks whether to save it anyway. Returns false if the user
 * declined; other errors are thrown on.
 */
export async function saveWithConfirmation(save: (confirmed: boolean) => Promise<unknown>, nameOf: (id: string) => string, t: TFunction): Promise<boolean> {
  try {
    await save(false);
    return true;
  } catch (err) {
    const issues = implausibleIssues(err);
    if (!issues) {
      throw err;
    }
    const lines = issues.map((issue) => `• ${issueText(issue, issue.personIds.map(nameOf), t)}`).join('\n');
    if (!window.confirm(t('plausibility.confirmSave', { issues: lines }))) {
      return false;
    }
    await save(true);
    return true;
  }
}
