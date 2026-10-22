import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { Check, Loader2, RotateCcw } from 'lucide-react';
import type { Person } from '@/features/persons/types/person';
import { formatPersonName } from '@/features/persons/lib/personUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { apiErrorMessage } from '@/lib/apiErrors';
import { CHECK_PLAUSIBILITY_ISSUE, GET_PLAUSIBILITY_ISSUES } from '@/features/plausibility/graphql/plausibilityQueries';
import { ISSUE_GROUPS, issueText, type IssueValues } from '@/features/plausibility/lib/issues';

type IssuePerson = Pick<Person, 'id' | 'title' | 'firstName' | 'middleName' | 'lastName' | 'birthName'>;

interface PlausibilityIssue extends IssueValues {
  key: string;
  checked: boolean;
  persons: IssuePerson[];
}

function IssueRow({ issue, onCheck, busy }: { issue: PlausibilityIssue; onCheck: (checked: boolean) => void; busy: boolean }) {
  const { t } = useTranslation();
  const names = issue.persons.map(formatPersonName);
  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <p className={issue.checked ? 'text-muted-foreground' : undefined}>{issueText(issue, names, t)}</p>
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
          {issue.persons.map((person, index) => (
            <Link key={person.id} to={`/persons/${person.id}`} className="text-primary hover:underline">
              {names[index]}
            </Link>
          ))}
        </p>
      </div>
      <Button variant="outline" size="sm" className="shrink-0" disabled={busy} onClick={() => onCheck(!issue.checked)}>
        {issue.checked ? <RotateCcw className="mr-1 h-4 w-4" /> : <Check className="mr-1 h-4 w-4" />}
        {issue.checked ? t('plausibility.showAgain') : t('plausibility.markRight')}
      </Button>
    </li>
  );
}

/** Possible errors of the active family tree, by group; each can be marked as right */
export function PlausibilityPage() {
  const { t } = useTranslation();
  const [showChecked, setShowChecked] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const { data, loading, error } = useQuery<{ plausibilityIssues: PlausibilityIssue[] }>(GET_PLAUSIBILITY_ISSUES, { fetchPolicy: 'cache-and-network' });
  const [checkIssue, { error: checkError }] = useMutation(CHECK_PLAUSIBILITY_ISSUE, {
    refetchQueries: ['GetPlausibilityIssues', 'GetOpenPlausibilityIssues'],
    awaitRefetchQueries: true,
  });

  const issues = data?.plausibilityIssues ?? [];
  const checkedCount = issues.filter((i) => i.checked).length;
  const shown = issues.filter((i) => showChecked || !i.checked);

  const check = async (issue: PlausibilityIssue, checked: boolean) => {
    setBusyKey(issue.key);
    try {
      await checkIssue({ variables: { key: issue.key, checked } });
    } catch {
      // shown via checkError
    } finally {
      setBusyKey(null);
    }
  };

  let content;
  if (loading && !data) {
    content = (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t('common.loading')}
      </div>
    );
  } else if (error) {
    content = (
      <p role="alert" className="text-destructive">
        {apiErrorMessage(error, t)}
      </p>
    );
  } else if (!shown.length) {
    content = <p className="py-10 text-center text-muted-foreground">{issues.length ? t('plausibility.allChecked') : t('plausibility.none')}</p>;
  } else {
    content = Object.entries(ISSUE_GROUPS).map(([group, codes]) => {
      const inGroup = shown.filter((issue) => codes.includes(issue.code));
      if (!inGroup.length) {
        return null;
      }
      return (
        <Card key={group}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {t(`plausibility.groups.${group}`)} <span className="font-normal text-muted-foreground">({inGroup.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {inGroup.map((issue) => (
                <IssueRow key={issue.key} issue={issue} busy={busyKey === issue.key} onCheck={(checked) => check(issue, checked)} />
              ))}
            </ul>
          </CardContent>
        </Card>
      );
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{t('plausibility.title')}</h1>
        <p className="max-w-3xl text-muted-foreground">{t('plausibility.intro')}</p>
        {checkedCount > 0 && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-primary" checked={showChecked} onChange={(e) => setShowChecked(e.target.checked)} />
            {t('plausibility.showChecked', { count: checkedCount })}
          </label>
        )}
        {checkError && (
          <p role="alert" className="text-sm text-destructive">
            {apiErrorMessage(checkError, t)}
          </p>
        )}
      </div>
      {content}
    </div>
  );
}
