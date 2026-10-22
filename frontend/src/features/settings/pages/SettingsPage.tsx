import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  DatabaseBackup,
  Download,
  GitBranch,
  Loader2,
  RotateCcw,
  ScrollText,
  Trash2,
  Server,
  SlidersHorizontal,
  Type,
  XCircle,
} from 'lucide-react';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { RestoreBackupDialog } from '@/features/settings/components/RestoreBackupDialog';
import { SizeLimits } from '@/features/settings/components/SizeLimits';
import { LogViewerDialog } from '@/features/settings/components/LogViewerDialog';
import { SettingsSearch } from '@/features/settings/components/SettingsSearch';
import { UpdatesPanel } from '@/features/settings/components/UpdatesPanel';
import { McpSection } from '@/features/settings/components/McpSection';
import { useMcpSummary } from '@/features/settings/lib/mcpSummary';
import { clearLogs, exportLogs } from '@/features/settings/lib/logs';
import { SettingsSection } from '@/features/settings/components/SettingsSection';
import { FontAndColorsSection, TreeAppearanceSection } from '@/features/settings/components/AppearanceSections';
import { useAppearanceSummary } from '@/features/settings/lib/appearanceSummary';
import { create } from 'zustand';
import { ErrorBox } from '@/features/transfer/components/ErrorBox';
import { TransferProgressBar } from '@/features/transfer/components/TransferProgressBar';
import { formatMb, toError, type ErrorState } from '@/features/transfer/lib/transfer';
import { downloadBackupTracked } from '@/features/settings/lib/restoreSession';
import { cancelActivity, runningProgress } from '@/lib/activity';
import { useActivityStore } from '@/stores/activityStore';
import { SET_LOG_LEVEL, SYSTEM_INFO } from '@/features/settings/graphql/systemQueries';
import { apiErrorMessage } from '@/lib/apiErrors';
import { GET_PERSONS } from '@/features/persons/graphql/personQueries';
import type { Person } from '@/features/persons/types/person';
import { comparePersonNames, formatPersonOption } from '@/features/persons/lib/personUtils';
import { APP_LANGUAGES, SYSTEM_LANGUAGE, languagePreference, nativeLanguageName, setLanguage } from '@/i18n';
import { formatDateTime } from '@/lib/formatDate';
import { DEPTH_OPTIONS, TREE_VIEWS, type TreeView } from '@/features/tree/lib/treeUtils';
import { focusIdOf, useSettingsStore } from '@/stores/settingsStore';
import { useActiveTreeStore } from '@/stores/activeTreeStore';
import { useThemeStore, type Theme } from '@/stores/themeStore';

interface SystemInfo {
  /** Family trees without the recycle bin; the other numbers apply to all family trees */
  trees: number;
  version: string;
  database: 'ok' | 'unreachable';
  persons: number;
  deletedPersons: number;
  media: number;
  mediaBytes: number;
  lastImportAt: string | null;
  lastBackupAt: string | null;
  backupCount: number;
  backupDir: string;
  logLevel: string;
}

const THEMES: Theme[] = ['system', 'light', 'dark'];
const LOG_LEVELS = ['debug', 'info', 'warn', 'error'];
const ALL = 'all';
/** Older automatic backups indicate that the service "backup" is not running (default: daily) */
const BACKUP_WARN_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

/** The collapsible blocks in display order (the id is also the anchor, e.g. `/settings#data`) */
const SECTIONS = ['fontColors', 'treeAppearance', 'treeBehaviour', 'data', 'mcp'] as const;

/** "2 days ago" in the language of the app */
function relativeTime(iso: string, locale: string) {
  const days = Math.round((Date.now() - new Date(iso).getTime()) / DAY_MS);
  const hours = Math.round((Date.now() - new Date(iso).getTime()) / (60 * 60 * 1000));
  const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  return Math.abs(days) >= 1 ? format.format(-days, 'day') : format.format(-hours, 'hour');
}

interface SystemState {
  info: SystemInfo | undefined;
  loading: boolean;
  failed: boolean;
}

/** Settings of this device plus state of the backup and the server */
export function SettingsPage() {
  const { t } = useTranslation();
  const { hash } = useLocation();
  const setSectionOpen = useSettingsStore((s) => s.setSectionOpen);
  const setSectionsOpen = useSettingsStore((s) => s.setSectionsOpen);
  const { data, loading, error } = useQuery<{ systemInfo: SystemInfo }>(SYSTEM_INFO, { fetchPolicy: 'network-only' });
  const system: SystemState = { info: data?.systemInfo, loading, failed: !!error || (!loading && !data?.systemInfo) };

  // A link with an anchor (/settings#data) opens that block
  useEffect(() => {
    const id = hash.replace('#', '');
    if ((SECTIONS as readonly string[]).includes(id)) {
      setSectionOpen(id, true);
      requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView?.({ block: 'start' }));
    }
  }, [hash, setSectionOpen]);

  const appSummary = useAppearanceSummary('app');
  const treeSummary = useAppearanceSummary('tree');
  const behaviour = useBehaviourSummary();
  const dataSummary = useDataSummary(system);
  const mcpSummary = useMcpSummary();

  return (
    <div className="max-w-5xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t('nav.settings')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('settings.subtitle')}</p>
      </div>

      {/* Search as wide as possible on the left, the buttons for all blocks end at the right edge of the blocks */}
      <div className="flex flex-wrap items-center gap-2">
        <SettingsSearch />
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSectionsOpen([...SECTIONS], true)}>
            {t('settings.sections.expandAll')}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSectionsOpen([...SECTIONS], false)}>
            {t('settings.sections.collapseAll')}
          </Button>
        </div>
      </div>

      <SystemBlock system={system} />

      <SettingsSection id="fontColors" icon={Type} title={t('settings.sections.fontColors')} summary={appSummary}>
        <FontAndColorsSection />
      </SettingsSection>
      <SettingsSection id="treeAppearance" icon={GitBranch} title={t('settings.sections.treeAppearance')} summary={treeSummary}>
        <TreeAppearanceSection />
      </SettingsSection>
      <SettingsSection id="treeBehaviour" icon={SlidersHorizontal} title={t('settings.sections.treeBehaviour')} summary={behaviour}>
        <TreeBehaviourSection />
      </SettingsSection>
      <SettingsSection id="data" icon={DatabaseBackup} title={t('settings.sections.data')} summary={dataSummary}>
        <DataSection system={system} />
      </SettingsSection>
      <SettingsSection id="mcp" icon={Bot} title={t('settings.sections.mcp')} summary={mcpSummary}>
        <McpSection />
      </SettingsSection>
    </div>
  );
}

/** Always visible: language and colour scheme, state of backend and database with the versions, the data in the database and the log level */
function SystemBlock({ system }: { system: SystemState }) {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useThemeStore();
  const [languageChoice, setLanguageChoice] = useState(languagePreference);
  const { info, loading, failed } = system;
  const [setLogLevel, { loading: changing, error: changeError }] = useMutation(SET_LOG_LEVEL, { refetchQueries: ['SystemInfo'] });
  const number = (n: number) => n.toLocaleString(i18n.language);
  const megabytes = (bytes: number) => (bytes / 1024 / 1024).toLocaleString(i18n.language, { maximumFractionDigits: 1 });
  const backupOutdated = !!info && (!info.lastBackupAt || Date.now() - new Date(info.lastBackupAt).getTime() > BACKUP_WARN_DAYS * DAY_MS);

  const status = (ok: boolean, label: string, value: string) => (
    <li className="flex items-center gap-2 text-sm">
      {ok ? (
        <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
      ) : (
        <XCircle className="h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
      )}
      <span className="font-medium">{label}:</span> <span className={ok ? undefined : 'text-destructive'}>{value}</span>
    </li>
  );
  const reachable = t('settings.system.reachable');
  const unreachable = t('settings.system.unreachable');
  const levels = info && !LOG_LEVELS.includes(info.logLevel) ? [...LOG_LEVELS, info.logLevel] : LOG_LEVELS;

  return (
    <section id="system" aria-labelledby="system-title" className="rounded-xl border bg-card shadow-xs">
      <h2 id="system-title" className="flex items-center gap-3 px-4 py-3 text-base font-semibold">
        <Server className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        {t('settings.system.title')}
      </h2>
      <div className="space-y-4 border-t p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="settings-language">{t('header.language')}</Label>
            <Select
              id="settings-language"
              value={languageChoice}
              onChange={(e) => {
                setLanguage(e.target.value);
                setLanguageChoice(e.target.value);
              }}
            >
              <option value={SYSTEM_LANGUAGE}>{t('settings.system.languageSystem')}</option>
              {APP_LANGUAGES.map((code) => (
                <option key={code} value={code} lang={code}>
                  {nativeLanguageName(code)}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settings-theme">{t('settings.display.theme')}</Label>
            <Select id="settings-theme" value={theme} onChange={(e) => setTheme(e.target.value as Theme)}>
              {THEMES.map((option) => (
                <option key={option} value={option}>
                  {t(`settings.display.themes.${option}`)}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{t('settings.deviceHint')}</p>
        {loading && <p className="text-sm text-muted-foreground">{t('common.loading')}</p>}
        {failed && (
          <p className="flex items-center gap-2 text-sm text-destructive" role="alert">
            <XCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {t('settings.system.serverUnreachable')}
          </p>
        )}
        {info && (
          <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <div role="group" aria-labelledby="system-status-title" className="space-y-3 rounded-lg border p-4">
              <h3 id="system-status-title" className="text-sm font-semibold">
                {t('settings.system.status')}
              </h3>
              <ul className="space-y-2" aria-labelledby="system-status-title">
                {status(true, t('settings.system.backend'), reachable)}
                {status(info.database === 'ok', t('settings.system.database'), info.database === 'ok' ? reachable : unreachable)}
              </ul>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-t pt-3 text-sm">
                <dt className="text-muted-foreground">{t('settings.system.backend')}</dt>
                <dd className="tabular-nums" data-testid="backend-version">
                  {info.version}
                </dd>
                <dt className="text-muted-foreground">{t('settings.system.frontend')}</dt>
                <dd className="tabular-nums" data-testid="frontend-version">
                  {__APP_VERSION__}
                </dd>
              </dl>
            </div>

            <div role="group" aria-labelledby="system-data-title" className="space-y-3 rounded-lg border p-4">
              <h3 id="system-data-title" className="text-sm font-semibold">
                {t('settings.system.data')}
              </h3>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                <dt className="text-muted-foreground">{t('settings.system.trees')}</dt>
                <dd className="tabular-nums">{number(info.trees)}</dd>
                <dt className="text-muted-foreground">{t('settings.system.persons')}</dt>
                <dd>{t('settings.system.personsValue', { count: info.persons, deleted: number(info.deletedPersons) })}</dd>
                <dt className="text-muted-foreground">{t('settings.system.media')}</dt>
                <dd>{t('settings.system.mediaValue', { count: info.media, size: megabytes(info.mediaBytes) })}</dd>
              </dl>
              <div className="space-y-1.5 border-t pt-3">
                <div className="flex items-center gap-3">
                  <Label htmlFor="settings-log-level">{t('settings.system.logLevel')}</Label>
                  <Select
                    id="settings-log-level"
                    className="w-40"
                    value={info.logLevel}
                    disabled={changing}
                    onChange={(e) => void setLogLevel({ variables: { level: e.target.value } }).catch(() => undefined)}
                  >
                    {levels.map((level) => (
                      <option key={level} value={level} disabled={!LOG_LEVELS.includes(level)}>
                        {level.toUpperCase()}
                      </option>
                    ))}
                  </Select>
                </div>
                <LogButtons />
                {changeError && (
                  <p className="text-xs text-destructive" role="alert">
                    {apiErrorMessage(changeError, t)}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        <UpdatesPanel />
        <p className="text-xs text-muted-foreground">
          {t('settings.system.licenceNote')}{' '}
          <a href="/third-party-notices.txt" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">
            {t('settings.system.licenceLink')}
          </a>
        </p>
        {backupOutdated && info && (
          <p className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm" role="status">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden="true" />
            {t(info.lastBackupAt ? 'settings.backup.outdated' : 'settings.backup.missing', { days: BACKUP_WARN_DAYS })}
          </p>
        )}
      </div>
    </section>
  );
}

/** Opens the log viewer, exports the logs of server and browser for the error analysis and deletes them */
function LogButtons() {
  const { t } = useTranslation();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<ErrorState | null>(null);

  const run = async (action: () => Promise<string>) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      setMessage(await action());
    } catch (err) {
      setError(toError(err));
    } finally {
      setBusy(false);
    }
  };

  const runExport = () =>
    run(async () => {
      const { filename, backendIncluded } = await exportLogs();
      return `${t('settings.backup.downloaded', { file: filename })}${backendIncluded ? '' : ` ${t('settings.logs.exportPartial')}`}`;
    });

  const runClear = () => {
    // Deleting cannot be undone – ask first
    if (!window.confirm(t('settings.logs.confirmClear'))) {
      return;
    }
    void run(async () => {
      await clearLogs();
      return t('settings.logs.cleared');
    });
  };

  return (
    <div className="space-y-2 pt-1">
      <div className="flex flex-wrap gap-2">
        <Button id="settings-logs-view" size="sm" variant="outline" className="whitespace-nowrap px-2.5" onClick={() => setViewerOpen(true)}>
          <ScrollText className="h-4 w-4" />
          {t('settings.logs.view')}
        </Button>
        <Button id="settings-logs-export" size="sm" variant="outline" className="whitespace-nowrap px-2.5" onClick={() => void runExport()} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {t('settings.logs.export')}
        </Button>
        <Button id="settings-logs-clear" size="sm" variant="outline" className="whitespace-nowrap px-2.5" onClick={runClear} disabled={busy}>
          <Trash2 className="h-4 w-4" />
          {t('settings.logs.clear')}
        </Button>
      </div>
      {message && (
        <p className="flex items-start gap-2 text-xs" role="status">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
          <span className="break-all">{message}</span>
        </p>
      )}
      {error && <ErrorBox error={error} />}
      <LogViewerDialog open={viewerOpen} onClose={() => setViewerOpen(false)} />
    </div>
  );
}

/** Settings of the family tree view when it opens (also used for the summary of the closed block) */
function useTreeBehaviour() {
  const { treeView, treeDepth, treeFocusIds } = useSettingsStore();
  const activeTreeId = useActiveTreeStore((s) => s.treeId) ?? '';
  const treeFocusId = focusIdOf(treeFocusIds, activeTreeId);
  // Without a family tree there is no focus person to choose
  const { data } = useQuery<{ getPersons: Person[] }>(GET_PERSONS, { variables: { includeDeleted: false }, skip: !activeTreeId });
  const persons = [...(data?.getPersons ?? [])].sort(comparePersonNames);
  // A deleted or no longer existing focus person counts as "none"
  const focus = persons.find((p) => p.id === treeFocusId);
  return { treeView, treeDepth, activeTreeId, persons, focus };
}

function useBehaviourSummary() {
  const { t } = useTranslation();
  const { treeView, treeDepth, focus } = useTreeBehaviour();
  return [t(`tree.views.${treeView}`), treeDepth ?? t('tree.depth.all'), focus ? formatPersonOption(focus) : t('tree.focus.none')].join(' · ');
}

function TreeBehaviourSection() {
  const { t } = useTranslation();
  const { setTreeView, setTreeDepth, setTreeFocusId } = useSettingsStore();
  const { treeView, treeDepth, activeTreeId, persons, focus } = useTreeBehaviour();
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="settings-tree-view">{t('settings.tree.view')}</Label>
          <Select id="settings-tree-view" value={treeView} onChange={(e) => setTreeView(e.target.value as TreeView)}>
            {TREE_VIEWS.map((v) => (
              <option key={v} value={v}>
                {t(`tree.views.${v}`)}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="settings-tree-depth">{t('settings.tree.depth')}</Label>
          <Select id="settings-tree-depth" value={treeDepth ?? ALL} onChange={(e) => setTreeDepth(e.target.value === ALL ? null : Number(e.target.value))}>
            {DEPTH_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
            <option value={ALL}>{t('tree.depth.all')}</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="settings-tree-focus">{t('settings.tree.focus')}</Label>
          <Select
            id="settings-tree-focus"
            value={focus?.id ?? ''}
            disabled={!activeTreeId}
            onChange={(e) => setTreeFocusId(activeTreeId, e.target.value || null)}
          >
            <option value="">{t('tree.focus.none')}</option>
            {persons.map((p) => (
              <option key={p.id} value={p.id}>
                {formatPersonOption(p)}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{t('settings.tree.hint')}</p>
    </div>
  );
}

function useDataSummary({ info }: SystemState) {
  const { t, i18n } = useTranslation();
  if (!info) {
    return undefined;
  }
  const last = info.lastBackupAt ? relativeTime(info.lastBackupAt, i18n.language) : t('settings.backup.none');
  return `${t('settings.backup.last')}: ${last} · ${t('settings.backup.count')}: ${info.backupCount.toLocaleString(i18n.language)}`;
}

/** Automatic backups of the server and the manual backup of all family trees */
function DataSection({ system }: { system: SystemState }) {
  const { t, i18n } = useTranslation();
  const { info } = system;
  return (
    <div className="space-y-4 text-sm">
      {info && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
          <dt className="text-muted-foreground">{t('settings.backup.last')}</dt>
          <dd>
            {info.lastBackupAt
              ? `${formatDateTime(info.lastBackupAt, i18n.language)} (${relativeTime(info.lastBackupAt, i18n.language)})`
              : t('settings.backup.none')}
          </dd>
          <dt className="text-muted-foreground">{t('settings.backup.count')}</dt>
          <dd>{info.backupCount.toLocaleString(i18n.language)}</dd>
          <dt className="text-muted-foreground">{t('settings.backup.folder')}</dt>
          <dd className="break-all font-mono text-xs">{info.backupDir}</dd>
          <dt className="text-muted-foreground">{t('settings.backup.lastImport')}</dt>
          <dd>{info.lastImportAt ? formatDateTime(info.lastImportAt, i18n.language) : '—'}</dd>
        </dl>
      )}
      <ManualBackup />
      <SizeLimits />
    </div>
  );
}

/**
 * Download or restore the backup of all family trees. Unlike the export under Import/Export
 * it covers all data and replaces it completely on restore.
 */
/** The backup download started here last – its progress and result also after leaving the page */
const useBackupCard = create<{ activityId: string | null }>()(() => ({ activityId: null }));

function ManualBackup() {
  const { t } = useTranslation();
  const [restoreOpen, setRestoreOpen] = useState(false);
  const activityId = useBackupCard((state) => state.activityId);
  const activity = useActivityStore((state) => state.activities.find((a) => a.id === activityId));
  const progress = runningProgress(activity);
  const busy = progress !== null;
  const saved = activity?.state === 'done' ? activity.result : undefined;
  const error = activity?.error ?? null;

  // The result and an error are shown from the activity
  const download = () => void downloadBackupTracked((id) => useBackupCard.setState({ activityId: id })).catch(() => undefined);

  return (
    <div className="space-y-3 border-t pt-4">
      <h3 className="font-medium">{t('settings.backup.manualTitle')}</h3>
      <p className="text-muted-foreground">{t('settings.backup.manualHint')}</p>
      <div className="flex flex-wrap gap-2">
        <Button id="settings-backup-download" size="sm" onClick={download} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {t('settings.backup.download')}
        </Button>
        <Button id="settings-backup-restore" size="sm" variant="outline" onClick={() => setRestoreOpen(true)} disabled={busy}>
          <RotateCcw className="h-4 w-4" />
          {t('settings.backup.restoreButton')}
        </Button>
      </div>
      {progress && activity && (
        <TransferProgressBar progress={progress} onCancel={activity.cancel ? () => cancelActivity(activity.id) : undefined} cancelling={activity.cancelling} />
      )}
      {saved && (
        <p className="flex items-start gap-2" role="status">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span className="break-all">
            {t('settings.backup.downloaded', { file: saved.file })}
            {Number(saved.missing) > 0 && ` ${t('settings.backup.missingMedia', { count: Number(saved.missing) })}`}
          </span>
        </p>
      )}
      {saved?.overLimitSizeMb !== undefined && (
        <p className="flex items-start gap-2 text-amber-700 dark:text-amber-400" role="alert">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            {t('settings.backup.overLimit', {
              size: formatMb(Number(saved.overLimitSizeMb)),
              limit: formatMb(Number(saved.overLimitLimitMb)),
            })}
          </span>
        </p>
      )}
      {error && <ErrorBox error={error} />}
      <p className="text-xs text-muted-foreground">
        {t('settings.backup.singleTreeHint')}{' '}
        <Link to="/import-export" className="font-medium text-primary hover:underline">
          {t('nav.importExport')}
        </Link>
      </p>
      {/* After a restore the session reloads all data itself (also when the dialog was closed before the end) */}
      <RestoreBackupDialog open={restoreOpen} onClose={() => setRestoreOpen(false)} />
    </div>
  );
}
