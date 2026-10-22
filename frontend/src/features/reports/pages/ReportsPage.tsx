import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApolloClient, useQuery } from '@apollo/client';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FileDown, Loader2, Printer } from 'lucide-react';
import type { Person } from '@/features/persons/types/person';
import { useHomePerson } from '@/features/family-trees/lib/useFamilyTrees';
import { comparePersonNames, formatPersonName, formatPersonOption } from '@/features/persons/lib/personUtils';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { savePdfBridge } from '@/lib/platform';
import { apiErrorMessage } from '@/lib/apiErrors';
import { DEFAULT_REPORT_OPTIONS, useSettingsStore, type ReportOptions, type ReportPaper } from '@/stores/settingsStore';
import { REPORT_PERSONS, REPORT_TREE } from '../graphql/reportQueries';
import { buildFamily, type ReportRelation } from '../lib/family';
import { MAX_GENERATIONS } from '../lib/numbering';
import { REPORT_TYPES, type ReportType } from '../lib/format';
import type { ReportPersonData } from '../lib/reportData';
import { paperSize, printReport } from '../lib/printReport';
import { PersonSheet } from '../components/PersonSheet';
import { FamilySheet } from '../components/FamilySheet';
import { AncestorList, DescendantList } from '../components/GenerationLists';
import { ReportFooter } from '../components/ReportParts';
import { StatisticsReport } from '../components/StatisticsReport';
import { ScopeBar } from '@/features/statistics/components/ScopeBar';
import { SCOPE_PARAMS, readScope, scopeSearch, type StatisticsScope } from '@/features/statistics/lib/scope';
import { useScopeLabel } from '@/features/statistics/lib/useScopeLabel';

/** "All persons" in the selection of the person sheet */
const ALL = 'ALL';
/** Persons per request of reportPersons (the backend takes at most 500) */
const CHUNK = 200;
const OPTION_KEYS = ['photos', 'notes', 'sources', 'contact', 'hideLiving'] as const;
const PAPERS: ReportPaper[] = ['AUTO', 'A4', 'LETTER'];

/** Life events, notes, media and citations of the persons on the sheets – in pieces for many persons */
function useReportPersons(ids: string[]) {
  const client = useApolloClient();
  const key = ids.join(',');
  const [state, setState] = useState<{ key: string; data: Map<string, ReportPersonData>; error?: unknown }>();
  useEffect(() => {
    const list = key ? key.split(',') : [];
    if (list.length === 0) {
      return;
    }
    let cancelled = false;
    (async () => {
      const data = new Map<string, ReportPersonData>();
      for (let i = 0; i < list.length; i += CHUNK) {
        const { data: result } = await client.query<{ reportPersons: ReportPersonData[] }>({
          query: REPORT_PERSONS,
          variables: { ids: list.slice(i, i + CHUNK) },
          fetchPolicy: 'network-only',
        });
        for (const entry of result.reportPersons) {
          data.set(entry.id, entry);
        }
      }
      if (!cancelled) {
        setState({ key, data });
      }
    })().catch((error: unknown) => !cancelled && setState({ key, data: new Map(), error }));
    return () => {
      cancelled = true;
    };
  }, [client, key]);
  const ready = !key || state?.key === key;
  return { data: ready ? (state?.data ?? new Map<string, ReportPersonData>()) : undefined, error: ready ? state?.error : undefined };
}

/** Reports for printing and as PDF: person sheet, family sheet, ancestor list, descendant list */
export function ReportsPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const stored = useSettingsStore((s) => s.reportOptions);
  const setReportOptions = useSettingsStore((s) => s.setReportOptions);
  const options: ReportOptions = { ...DEFAULT_REPORT_OPTIONS, ...stored };
  const reportRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);

  const type: ReportType = REPORT_TYPES.find((value) => value === params.get('type')) ?? 'person';
  // Without a person in the address the home person of the family tree
  const { homePerson } = useHomePerson();
  const personId = params.get('person') ?? homePerson?.id ?? '';
  // The statistics report: a scope like on the page "Statistics" (its person is in `person` as well)
  const isStatistics = type === 'statistics';
  const scope = readScope(params);
  const { label: scopeText, person: scopePerson } = useScopeLabel(isStatistics ? scope : { kind: 'all' });
  const [statisticsReady, setStatisticsReady] = useState(false);
  const onStatisticsReady = useCallback((value: boolean) => setStatisticsReady(value), []);
  const changeScope = (next: StatisticsScope) =>
    setParams(
      (current) => {
        const search = new URLSearchParams(current);
        SCOPE_PARAMS.forEach((name) => search.delete(name));
        scopeSearch(next).forEach((value, name) => search.set(name, value));
        return search;
      },
      { replace: true },
    );
  const generations = Math.min(Math.max(Number(params.get('generations')) || MAX_GENERATIONS, 2), MAX_GENERATIONS);
  const update = (changes: Record<string, string>) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const [name, value] of Object.entries(changes)) {
          next.set(name, value);
        }
        return next;
      },
      { replace: true },
    );

  const { data: tree, loading, error } = useQuery<{ getPersons: Person[]; getRelations: ReportRelation[] }>(REPORT_TREE, { fetchPolicy: 'cache-and-network' });
  const persons = useMemo(() => [...(tree?.getPersons ?? [])].sort(comparePersonNames), [tree]);
  const family = useMemo(() => buildFamily(tree?.getPersons ?? [], tree?.getRelations ?? []), [tree]);
  const all = type === 'person' && personId === ALL;
  const root = family.persons.get(personId) ?? null;

  // Persons whose events, notes, media and citations the sheets need
  const neededIds = useMemo(() => {
    if (type === 'person') {
      return all ? persons.map((p) => p.id) : root ? [root.id] : [];
    }
    if (type === 'family' && root) {
      return [root.id, ...family.partners(root.id).map((link) => link.person.id)];
    }
    return [];
  }, [type, all, root, persons, family]);
  const details = useReportPersons(neededIds);

  const title = `${t(`reports.types.${type}`)} – ${isStatistics ? scopeText : all ? t('reports.allPersons') : root ? formatPersonName(root) : ''}`;

  const print = async (pdf: boolean) => {
    if (!reportRef.current) {
      return;
    }
    setBusy(true);
    setPrintError(null);
    try {
      await printReport(reportRef.current, { title, paper: paperSize(options.paper), pdf });
    } catch {
      setPrintError(t('reports.printFailed'));
    } finally {
      setBusy(false);
    }
  };

  const ready = isStatistics ? statisticsReady : (all || root) && details.data;
  const sheets = () => {
    if (!details.data) {
      return null;
    }
    if (type === 'person') {
      const list = all ? persons : root ? [root] : [];
      return list.map((person) => <PersonSheet key={person.id} person={person} family={family} data={details.data!.get(person.id)} options={options} />);
    }
    if (!root) {
      return null;
    }
    if (type === 'family') {
      const partners = family.partners(root.id);
      return partners.length === 0 ? (
        <FamilySheet person={root} partner={null} relation={null} family={family} data={details.data} options={options} />
      ) : (
        partners.map(({ person, relation }) => (
          <FamilySheet key={person.id} person={root} partner={person} relation={relation} family={family} data={details.data!} options={options} />
        ))
      );
    }
    const List = type === 'ancestors' ? AncestorList : DescendantList;
    return <List root={root} family={family} generations={generations} options={options} />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('reports.title')}</h1>
        <p className="text-muted-foreground">{t('reports.intro')}</p>
      </div>

      <div className="space-y-4 rounded-xl border bg-card p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <Label htmlFor="report-type">{t('reports.report')}</Label>
            <Select id="report-type" value={type} onChange={(e) => update({ type: e.target.value, ...(personId === ALL ? { person: '' } : {}) })}>
              {REPORT_TYPES.map((value) => (
                <option key={value} value={value}>
                  {t(`reports.types.${value}`)}
                </option>
              ))}
            </Select>
          </div>
          {!isStatistics && (
            <div className="space-y-1 lg:col-span-2">
              <Label htmlFor="report-person">{t('reports.start')}</Label>
              <Select id="report-person" value={personId} onChange={(e) => update({ person: e.target.value })}>
                <option value="">{t('reports.choosePerson')}</option>
                {type === 'person' && <option value={ALL}>{t('reports.allPersons')}</option>}
                {persons.map((person) => (
                  <option key={person.id} value={person.id}>
                    {formatPersonOption(person)}
                  </option>
                ))}
              </Select>
            </div>
          )}
          {(type === 'ancestors' || type === 'descendants') && (
            <div className="space-y-1">
              <Label htmlFor="report-generations">{t('reports.generations')}</Label>
              <Select id="report-generations" value={String(generations)} onChange={(e) => update({ generations: e.target.value })}>
                {Array.from({ length: MAX_GENERATIONS - 1 }, (_, i) => i + 2).map((value) => (
                  <option key={value} value={value}>
                    {value === MAX_GENERATIONS ? t('reports.allGenerations', { max: value }) : value}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>

        {isStatistics && <ScopeBar key={scopeSearch(scope).toString()} scope={scope} person={scopePerson} onChange={changeScope} />}

        <fieldset className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <legend className="sr-only">{t('reports.contents')}</legend>
          {!isStatistics &&
            OPTION_KEYS.map((key) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={options[key]}
                  onChange={(e) => setReportOptions({ [key]: e.target.checked })}
                />
                {t(`reports.options.${key}`)}
              </label>
            ))}
          <label className="flex items-center gap-2 text-sm">
            {t('reports.paper')}
            <Select
              aria-label={t('reports.paper')}
              className="h-8 w-auto"
              value={options.paper}
              onChange={(e) => setReportOptions({ paper: e.target.value as ReportPaper })}
            >
              {PAPERS.map((paper) => (
                <option key={paper} value={paper}>
                  {t(`reports.papers.${paper}`)}
                </option>
              ))}
            </Select>
          </label>
        </fieldset>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => print(false)} disabled={!ready || busy}>
            <Printer className="h-4 w-4" />
            {t('reports.print')}
          </Button>
          <Button variant="outline" onClick={() => print(true)} disabled={!ready || busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            {t('reports.savePdf')}
          </Button>
          {!savePdfBridge() && <p className="text-xs text-muted-foreground">{t('reports.pdfHint')}</p>}
        </div>
        {printError && (
          <p role="alert" className="text-sm text-destructive">
            {printError}
          </p>
        )}
      </div>

      {error || details.error ? (
        <p role="alert" className="text-destructive">
          {apiErrorMessage(error ?? details.error, t)}
        </p>
      ) : loading && !tree ? (
        <p className="text-muted-foreground">{t('common.loading')}</p>
      ) : isStatistics ? (
        <div className="overflow-x-auto rounded-xl bg-muted/40 p-4 sm:p-6">
          <div ref={reportRef} className="report-document" data-testid="report">
            <StatisticsReport scope={scope} scopeText={scopeText} onReady={onStatisticsReady} />
            <ReportFooter />
          </div>
        </div>
      ) : persons.length === 0 ? (
        <p className="text-muted-foreground">{t('reports.empty')}</p>
      ) : !all && !root ? (
        <p className="text-muted-foreground">{t('reports.choosePersonHint')}</p>
      ) : !details.data ? (
        <p className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('common.loading')}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-muted/40 p-4 sm:p-6">
          <div ref={reportRef} className="report-document" data-testid="report">
            {sheets()}
            <ReportFooter />
          </div>
        </div>
      )}
    </div>
  );
}
