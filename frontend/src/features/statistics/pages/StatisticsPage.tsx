import { useEffect, useRef, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { Loader2, Printer, RotateCcw } from 'lucide-react';
import { buttonVariants } from '@/components/ui/buttonVariants';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { apiErrorReason } from '@/lib/apiErrors';
import { cn } from '@/lib/utils';
import { useActiveTreeStore } from '@/stores/activeTreeStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { GET_SOURCE_STATISTICS } from '@/features/sources/graphql/sourceQueries';
import { GET_TREE_STATISTICS } from '../graphql/statisticsQueries';
import { SCOPE_PARAMS, WHOLE_TREE, isWholeTree, readScope, scopeSearch, scopeVariables, type StatisticsScope } from '../lib/scope';
import type { SourceStatistics, TreeStatistics } from '../lib/types';
import { useScopeLabel } from '../lib/useScopeLabel';
import { ScopeBar } from '../components/ScopeBar';
import { AncestorsTab, LivesTab, NamesTab, OverviewTab, SourcesTab } from '../components/StatisticsTabs';

const STATISTICS_TABS = ['overview', 'lives', 'names', 'ancestors', 'sources'] as const;
type Tab = (typeof STATISTICS_TABS)[number];

/**
 * Statistics of the open family tree in tabs, for a scope chosen above them (whole tree, ancestors or descendants of a
 * person, a last name, years of birth). Tab and scope live in the URL; the last scope is remembered per family tree.
 * Every figure that counts persons leads to the person list with exactly those persons.
 */
export function StatisticsPage() {
  const { t, i18n } = useTranslation();
  const [params, setParams] = useSearchParams();
  const treeId = useActiveTreeStore((s) => s.treeId);
  const remembered = useSettingsStore((s) => (treeId ? s.statisticsScopes[treeId] : undefined));
  const rememberScope = useSettingsStore((s) => s.setStatisticsScope);
  const scope = readScope(params);
  const requestedTab = params.get('tab') as Tab | null;
  const tab: Tab = requestedTab && STATISTICS_TABS.includes(requestedTab) ? requestedTab : 'overview';
  const { label: scopeText, person } = useScopeLabel(scope);
  // Start of the ancestor figures chosen on the page (else the backend takes the scope person or the home person)
  const start = params.get('start');

  // Opened without a scope in the URL: the scope used last in this family tree
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current || !treeId) {
      return;
    }
    restored.current = true;
    if (remembered && !SCOPE_PARAMS.some((p) => params.has(p))) {
      const next = new URLSearchParams(remembered);
      if (params.has('tab')) {
        next.set('tab', params.get('tab')!);
      }
      setParams(next, { replace: true });
    }
  }, [treeId, remembered, params, setParams]);

  const changeScope = (next: StatisticsScope) => {
    const search = scopeSearch(next);
    if (treeId) {
      rememberScope(treeId, search.toString());
    }
    if (tab !== 'overview') {
      search.set('tab', tab);
    }
    setParams(search);
  };
  const changeTab = (next: Tab) => {
    const search = scopeSearch(scope);
    if (next !== 'overview') {
      search.set('tab', next);
    }
    if (start) {
      search.set('start', start);
    }
    setParams(search);
  };
  const chooseStart = (personId: string) => {
    const search = new URLSearchParams(params);
    search.set('start', personId);
    setParams(search);
  };

  const { data, loading, error } = useQuery<{ treeStatistics: TreeStatistics }>(GET_TREE_STATISTICS, {
    variables: { scope: scopeVariables(scope), language: i18n.language, ancestorsOf: start },
    fetchPolicy: 'cache-and-network',
  });
  const { data: sourceData } = useQuery<{ sourceStatistics: SourceStatistics }>(GET_SOURCE_STATISTICS, {
    fetchPolicy: 'cache-and-network',
    skip: tab !== 'sources',
  });
  const stats = data?.treeStatistics;
  const badScope = ['BAD_SCOPE', 'PERSON_NOT_FOUND'].includes(apiErrorReason(error) ?? '');

  let content: ReactNode;
  if (loading && !stats) {
    content = (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t('common.loading')}
      </div>
    );
  } else if (badScope) {
    content = (
      <Card>
        <CardContent className="space-y-4 py-10 text-center">
          <p className="text-destructive">{t('statistics.scope.invalid')}</p>
          <Button variant="outline" onClick={() => changeScope(WHOLE_TREE)}>
            <RotateCcw className="h-4 w-4" />
            {t('statistics.scope.reset')}
          </Button>
        </CardContent>
      </Card>
    );
  } else if (error || !stats) {
    content = <p className="text-destructive">{t('persons.error')}</p>;
  } else if (stats.total === 0 && tab !== 'sources') {
    content = (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          {isWholeTree(scope) ? t('statistics.empty') : t('statistics.scope.empty')}
        </CardContent>
      </Card>
    );
  } else {
    content = {
      overview: <OverviewTab stats={stats} scope={scope} />,
      lives: <LivesTab stats={stats} scope={scope} />,
      names: <NamesTab stats={stats} scope={scope} />,
      ancestors: (
        <AncestorsTab
          stats={stats}
          scope={scope}
          startChosen={!!start || scope.kind === 'ancestors' || scope.kind === 'descendants'}
          onChooseStart={chooseStart}
        />
      ),
      sources: <SourcesTab sources={sourceData?.sourceStatistics} scope={scope} />,
    }[tab];
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('nav.statistics')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('statistics.subtitle')}</p>
        </div>
        {/* The report "Statistics" with the same scope: for printing and as PDF */}
        <Link to={`/reports?${new URLSearchParams([['type', 'statistics'], ...scopeSearch(scope)])}`} className={buttonVariants({ variant: 'outline' })}>
          <Printer className="h-4 w-4" />
          {t('statistics.print')}
        </Link>
      </div>
      <ScopeBar key={scopeSearch(scope).toString()} scope={scope} person={person} onChange={changeScope} />
      <p className="text-sm text-muted-foreground" role="status">
        {stats && !badScope ? t('statistics.scope.summary', { scope: scopeText, count: stats.total }) : scopeText}
      </p>
      <nav className="flex gap-1 overflow-x-auto border-b" aria-label={t('statistics.tabs.label')}>
        {STATISTICS_TABS.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => changeTab(name)}
            aria-current={tab === name ? 'page' : undefined}
            className={cn(
              '-mb-px whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors',
              tab === name ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t(`statistics.tabs.${name}`)}
          </button>
        ))}
      </nav>
      {content}
    </div>
  );
}
