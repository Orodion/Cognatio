import { useRef, useState } from 'react';
import { useApolloClient, useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, Download, FileUp, History, Info, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { formatDateTime } from '@/lib/formatDate';
import { IMPORT_HISTORY } from '@/features/transfer/graphql/importQueries';
import { cn } from '@/lib/utils';
import { useFamilyTrees, useSwitchTree } from '@/features/family-trees/lib/useFamilyTrees';
import {
  IMPORT_STRATEGIES,
  downloadExport,
  executeImport,
  manualSummary,
  previewImport,
  toError,
  type ErrorState,
  type ImportConflict,
  type ImportDecision,
  type ImportPreview,
  type ImportResult,
  type ImportStrategy,
  type ImportSummary,
  type ImportTarget,
} from '@/features/transfer/lib/transfer';
import { ErrorBox } from '@/features/transfer/components/ErrorBox';

/** GEDCOM files mostly come from other programs – by default they go into a new family tree */
const defaultTarget = (file: File): ImportTarget => (/\.(ged|gdz)$/i.test(file.name) ? 'NEW' : 'CURRENT');

/** Import/export: ZIP (data + media) and GEDCOM */
export function ImportExportPage() {
  const { t } = useTranslation();
  // Without a family tree: nothing to export, an import goes into a new one
  const { none } = useFamilyTrees();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('nav.importExport')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('importExport.subtitle')}</p>
      </div>
      {none ? (
        <div className="max-w-3xl">
          <ImportCard />
        </div>
      ) : (
        <>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <ExportCard />
            <ImportCard />
          </div>
          <ImportHistoryCard />
        </>
      )}
    </div>
  );
}

function ExportCard() {
  const { t } = useTranslation();
  const { active } = useFamilyTrees();
  const [withMedia, setWithMedia] = useState(true);
  const [gedcomMedia, setGedcomMedia] = useState(false);
  const [version, setVersion] = useState<'5.5.1' | '7.0'>('5.5.1');
  const [busy, setBusy] = useState<'zip' | 'gedcom' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<ErrorState | null>(null);

  const run = async (kind: 'zip' | 'gedcom') => {
    setBusy(kind);
    setError(null);
    setMessage(null);
    try {
      const { filename, missingMedia, saved } = await downloadExport(kind, { media: kind === 'zip' ? withMedia : gedcomMedia, version });
      if (!saved) {
        return;
      }
      setMessage(
        [t('importExport.export.done', { filename }), missingMedia ? t('importExport.export.missingMedia', { count: missingMedia }) : null]
          .filter(Boolean)
          .join(' '),
      );
    } catch (err) {
      setError(toError(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('importExport.export.title')}</CardTitle>
        <p className="text-sm text-muted-foreground">{t('importExport.export.description')}</p>
        {active && <p className="text-sm font-medium">{t('importExport.export.tree', { name: active.name })}</p>}
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="space-y-3">
          <h3 className="font-medium">{t('importExport.export.zipTitle')}</h3>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-primary" checked={withMedia} onChange={(e) => setWithMedia(e.target.checked)} />
            {t('importExport.export.withMedia')}
          </label>
          <Button onClick={() => run('zip')} disabled={busy !== null}>
            {busy === 'zip' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {t('importExport.export.zipButton')}
          </Button>
        </section>

        <section className="space-y-3">
          <h3 className="font-medium">{t('importExport.export.gedcomTitle')}</h3>
          <p className="text-sm text-muted-foreground">{t('importExport.export.gedcomHint')}</p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-primary" checked={gedcomMedia} onChange={(e) => setGedcomMedia(e.target.checked)} />
            {t('importExport.export.gedcomWithMedia')}
          </label>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="gedcom-version">{t('importExport.export.gedcomVersion')}</Label>
              <Select id="gedcom-version" className="w-32" value={version} onChange={(e) => setVersion(e.target.value as '5.5.1' | '7.0')}>
                <option value="5.5.1">5.5.1</option>
                <option value="7.0">7.0</option>
              </Select>
            </div>
            <Button variant="outline" onClick={() => run('gedcom')} disabled={busy !== null}>
              {busy === 'gedcom' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {t('importExport.export.gedcomButton')}
            </Button>
          </div>
        </section>

        <p className="text-xs text-muted-foreground">{t('importExport.export.saveLocation')}</p>
        {message && (
          <p className="flex items-center gap-2 text-sm text-primary" role="status">
            <CheckCircle2 className="h-4 w-4" />
            {message}
          </p>
        )}
        {error && <ErrorBox error={error} />}
      </CardContent>
    </Card>
  );
}

function ImportCard() {
  const { t, i18n } = useTranslation();
  const client = useApolloClient();
  const { active, none } = useFamilyTrees();
  const switchTree = useSwitchTree();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  // Target: active or new family tree; suggested by file type as long as the user has not chosen
  const [chosenTarget, setTarget] = useState<ImportTarget>('CURRENT');
  // Without a family tree only a new one can take the data
  const target = none ? 'NEW' : chosenTarget;
  const [targetTouched, setTargetTouched] = useState(false);
  const [treeName, setTreeName] = useState('');
  const [treeNameTouched, setTreeNameTouched] = useState(false);
  const [newTreeName, setNewTreeName] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [strategy, setStrategy] = useState<ImportStrategy>('MERGE_NEWER');
  const [decisions, setDecisions] = useState<Record<string, ImportDecision>>({});
  const [busy, setBusy] = useState<'preview' | 'import' | 'backup' | null>(null);
  const [error, setError] = useState<ErrorState | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [backupDone, setBackupDone] = useState(false);

  const reset = () => {
    setFile(null);
    setPreview(null);
    setDecisions({});
    setBackupDone(false);
    setTargetTouched(false);
    setTreeName('');
    setTreeNameTouched(false);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  // The preview compares with the target – check again when the target changes
  const loadPreview = async (selected: File, into: ImportTarget) => {
    setError(null);
    setPreview(null);
    setDecisions({});
    setBusy('preview');
    try {
      const p = await previewImport(selected, into);
      setPreview(p);
      // Empty data: nothing to merge – overwriting is equivalent and the simplest
      setStrategy(p.existingPersons === 0 ? 'OVERWRITE' : 'MERGE_NEWER');
      if (!treeNameTouched) {
        setTreeName(p.suggestedTreeName);
      }
    } catch (err) {
      setError(toError(err));
    } finally {
      setBusy(null);
    }
  };

  const handleFile = async (selected: File | undefined) => {
    setResult(null);
    setNewTreeName(null);
    setBackupDone(false);
    setFile(selected ?? null);
    if (!selected) {
      setPreview(null);
      return;
    }
    const into = none ? 'NEW' : targetTouched ? target : defaultTarget(selected);
    setTarget(into);
    await loadPreview(selected, into);
  };

  const changeTarget = (into: ImportTarget) => {
    setTarget(into);
    setTargetTouched(true);
    if (file) {
      loadPreview(file, into);
    }
  };

  const backup = async () => {
    setBusy('backup');
    setError(null);
    try {
      // Only a saved file counts as backup (the "Save as" dialog of the app can be cancelled)
      setBackupDone((await downloadExport('zip', { media: true })).saved);
    } catch (err) {
      setError(toError(err));
    } finally {
      setBusy(null);
    }
  };

  const summary: ImportSummary | null = preview ? (strategy === 'MERGE_MANUAL' ? manualSummary(preview, decisions) : preview.summaries[strategy]) : null;

  const toNewTree = preview?.target === 'NEW';

  const runImport = async () => {
    if (!file || !preview || !summary) {
      return;
    }
    if (toNewTree && !treeName.trim()) {
      setError({ reason: 'TREE_NAME_REQUIRED', details: [] });
      return;
    }
    if (strategy === 'OVERWRITE' && preview.existingPersons > 0) {
      if (!window.confirm(t('importExport.import.overwriteConfirm', { count: preview.existingPersons, tree: active?.name }))) {
        return;
      }
    }
    setBusy('import');
    setError(null);
    try {
      const name = treeName.trim();
      const res = await executeImport(file, strategy, decisions, toNewTree ? { target: 'NEW', treeName: name } : { target: 'CURRENT' });
      setResult(res);
      setNewTreeName(toNewTree ? name : null);
      reset();
      // Reload all views with the imported data – a new family tree is opened right away
      if (toNewTree) {
        await switchTree(res.familyTreeId, { stay: true });
      } else {
        await client.resetStore();
      }
    } catch (err) {
      setError(toError(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('importExport.import.title')}</CardTitle>
        <p className="text-sm text-muted-foreground">{t('importExport.import.description')}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-medium">{t('importExport.import.target')}</legend>
          {(none ? (['NEW'] as const) : (['CURRENT', 'NEW'] as const)).map((value) => (
            <label key={value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="import-target"
                value={value}
                checked={target === value}
                onChange={() => changeTarget(value)}
                disabled={busy !== null}
                className="accent-primary"
              />
              {value === 'CURRENT' ? t('importExport.import.targetCurrent', { name: active?.name ?? '' }) : t('importExport.import.targetNew')}
            </label>
          ))}
        </fieldset>

        {target === 'NEW' && (
          <div className="space-y-1.5">
            <Label htmlFor="import-tree-name">{t('importExport.import.treeName')}</Label>
            <Input
              id="import-tree-name"
              value={treeName}
              maxLength={100}
              onChange={(e) => {
                setTreeName(e.target.value);
                setTreeNameTouched(true);
              }}
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="import-file">{t('importExport.import.file')}</Label>
          <input
            ref={inputRef}
            id="import-file"
            type="file"
            accept=".zip,.gdz,.ged,application/zip"
            onChange={(e) => handleFile(e.target.files?.[0])}
            className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-card file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-accent"
          />
        </div>

        {busy === 'preview' && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('importExport.import.checking')}
          </p>
        )}
        {error && <ErrorBox error={error} />}
        {result && (
          <div className="flex items-start gap-2 rounded-md bg-primary/10 p-3 text-sm" role="status">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <p className="font-medium">{newTreeName ? t('importExport.import.successNewTree', { name: newTreeName }) : t('importExport.import.success')}</p>
              <SummaryList summary={result.summary} />
              {result.missingFiles.length > 0 && (
                <p className="mt-1 text-muted-foreground">{t('importExport.import.missingFiles', { count: result.missingFiles.length })}</p>
              )}
            </div>
          </div>
        )}

        {preview && summary && (
          <>
            <div className="rounded-md border p-3 text-sm">
              <p>
                {t(preview.kind === 'ZIP' ? 'importExport.import.fileZip' : 'importExport.import.fileGedcom', {
                  source: preview.source ?? '—',
                  date: formatDateTime(preview.exportedAt, i18n.language),
                })}
              </p>
              <p className="text-muted-foreground">
                {t('importExport.import.counts', { imported: preview.importedPersons, existing: preview.existingPersons })}
              </p>
              {preview.missingFiles.length > 0 && (
                <p className="mt-1 flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  {t('importExport.import.missingFiles', { count: preview.missingFiles.length })}
                </p>
              )}
              {preview.recognized && preview.recognized.byId + preview.recognized.byName > 0 && (
                <p className="mt-1 flex items-center gap-1.5">
                  <Info className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  {t('importExport.import.recognized', {
                    count: preview.recognized.byId + preview.recognized.byName,
                    byName: preview.recognized.byName,
                  })}
                </p>
              )}
            </div>

            {preview.previousImports.length > 0 && (
              <p className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm" role="status">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden="true" />
                {t('importExport.import.previousImport', {
                  date: formatDateTime(preview.previousImports[0].importedAt, i18n.language),
                  strategy: t(`importExport.strategies.${preview.previousImports[0].strategy}.label`),
                })}
              </p>
            )}

            {!toNewTree && preview.existingPersons > 0 && (
              <div className="flex flex-wrap items-center gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                <ShieldCheck className="h-5 w-5 shrink-0" />
                <p className="min-w-0 flex-1">{t('importExport.import.backupHint')}</p>
                <Button variant="outline" size="sm" onClick={backup} disabled={busy !== null}>
                  {busy === 'backup' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  {backupDone ? t('importExport.import.backupDone') : t('importExport.import.backupButton')}
                </Button>
              </div>
            )}

            {/* Everything is created anew in a new family tree – there is nothing to merge */}
            {!toNewTree && (
              <fieldset className="space-y-2">
                <legend className="mb-1 text-sm font-medium">{t('importExport.import.strategy')}</legend>
                {IMPORT_STRATEGIES.map((s) => (
                  <label
                    key={s}
                    className={cn(
                      'flex cursor-pointer gap-3 rounded-md border p-3 text-sm',
                      strategy === s ? 'border-primary bg-primary/5' : 'hover:bg-accent',
                    )}
                  >
                    <input type="radio" name="strategy" value={s} checked={strategy === s} onChange={() => setStrategy(s)} className="mt-0.5 accent-primary" />
                    <span>
                      <span className="font-medium">{t(`importExport.strategies.${s}.label`)}</span>
                      <span className="block text-muted-foreground">{t(`importExport.strategies.${s}.description`)}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
            )}

            {!toNewTree && strategy === 'MERGE_MANUAL' && preview.conflicts.length > 0 && (
              <ConflictList conflicts={preview.conflicts} decisions={decisions} onChange={setDecisions} />
            )}

            <div className="space-y-2 rounded-md border p-3">
              <h3 className="text-sm font-medium">{t('importExport.import.summaryTitle')}</h3>
              <SummaryList summary={summary} />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={runImport}
                disabled={busy !== null}
                variant={strategy === 'OVERWRITE' && preview.existingPersons > 0 ? 'destructive' : 'default'}
              >
                {busy === 'import' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                {t('importExport.import.run')}
              </Button>
              <Button variant="outline" onClick={reset} disabled={busy !== null}>
                {t('common.cancel')}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface ImportRecord {
  id: string;
  importedAt: string;
  fileName: string;
  kind: string;
  source: string | null;
  exportedAt: string | null;
  strategy: ImportStrategy;
  createdPersons: number;
  updatedPersons: number;
  removedPersons: number;
  recognizedPersons: number;
  createdRelations: number;
  createdEvents: number;
  createdNotes: number;
  createdMedia: number;
  missingFiles: number;
}

/** Version history: which file was imported when, with which result */
function ImportHistoryCard() {
  const { t, i18n } = useTranslation();
  const { data, loading } = useQuery<{ importHistory: ImportRecord[] }>(IMPORT_HISTORY, { variables: { limit: 20 } });
  const records = data?.importHistory ?? [];
  const result = (r: ImportRecord) =>
    [
      t('importExport.history.created', { count: r.createdPersons }),
      r.updatedPersons > 0 && t('importExport.history.updated', { count: r.updatedPersons }),
      r.removedPersons > 0 && t('importExport.history.removed', { count: r.removedPersons }),
      r.createdMedia > 0 && t('importExport.history.media', { count: r.createdMedia }),
    ]
      .filter(Boolean)
      .join(', ');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" aria-hidden="true" />
          {t('importExport.history.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        ) : records.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('importExport.history.empty')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4 font-normal">{t('importExport.history.date')}</th>
                  <th className="py-2 pr-4 font-normal">{t('importExport.history.file')}</th>
                  <th className="py-2 pr-4 font-normal">{t('importExport.history.fileDate')}</th>
                  <th className="py-2 pr-4 font-normal">{t('importExport.history.strategy')}</th>
                  <th className="py-2 font-normal">{t('importExport.history.result')}</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-t align-top">
                    <td className="whitespace-nowrap py-2 pr-4 tabular-nums">{formatDateTime(r.importedAt, i18n.language)}</td>
                    <td className="py-2 pr-4">
                      <span className="break-all">{r.fileName}</span>
                      <span className="block text-xs text-muted-foreground">{r.source ?? r.kind}</span>
                    </td>
                    <td className="whitespace-nowrap py-2 pr-4 tabular-nums">{r.exportedAt ? formatDateTime(r.exportedAt, i18n.language) : '—'}</td>
                    <td className="py-2 pr-4">{t(`importExport.strategies.${r.strategy}.label`)}</td>
                    <td className="py-2">{result(r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SummaryList({ summary }: { summary: ImportSummary }) {
  const { t } = useTranslation();
  const rows: Array<[keyof ImportSummary, number]> = (
    [
      'newPersons',
      'updatedPersons',
      'keptPersons',
      'unchangedPersons',
      'removedPersons',
      'conflicts',
      'newRelations',
      'newEvents',
      'newNotes',
      'newMedia',
    ] as const
  )
    .map((key): [keyof ImportSummary, number] => [key, summary[key]])
    .filter(([key, value]) => value > 0 || key === 'newPersons');
  return (
    <ul className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2" data-testid="import-summary">
      {rows.map(([key, value]) => (
        <li key={key} className={cn('flex justify-between gap-4', key === 'removedPersons' && 'text-destructive')}>
          <span>{t(`importExport.summary.${key}`)}</span>
          <span className="font-medium tabular-nums">{value}</span>
        </li>
      ))}
    </ul>
  );
}

function ConflictList({
  conflicts,
  decisions,
  onChange,
}: {
  conflicts: ImportConflict[];
  decisions: Record<string, ImportDecision>;
  onChange: (d: Record<string, ImportDecision>) => void;
}) {
  const { t, i18n } = useTranslation();
  const setAll = (decision: ImportDecision) => onChange(Object.fromEntries(conflicts.map((c) => [c.personId, decision])));

  const fieldLabel = (field: string, label?: string) => {
    const area = { event: 'timeline.title', note: 'notes.title', media: 'media.title', relation: 'relations.title' }[field];
    if (area) {
      return `${t(area)}${label ? `: ${label}` : ''}`;
    }
    return t(`personDetail.fields.${field}`, { defaultValue: field });
  };
  const show = (value: unknown) => {
    if (value === null || value === undefined || value === '') {
      return '—';
    }
    if (Array.isArray(value)) {
      return value.join(', ') || '—';
    }
    if (typeof value === 'object') {
      return Object.entries(value as Record<string, unknown>)
        .map(([k, v]) => `${t(`personDetail.fields.${k}`, { defaultValue: k })}: ${v ?? '—'}`)
        .join(', ');
    }
    return String(value);
  };

  return (
    <section className="space-y-3" aria-label={t('importExport.conflicts.title', { count: conflicts.length })}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium">{t('importExport.conflicts.title', { count: conflicts.length })}</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setAll('IMPORT')}>
            {t('importExport.conflicts.allImport')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAll('KEEP')}>
            {t('importExport.conflicts.allKeep')}
          </Button>
        </div>
      </div>
      <ul className="space-y-3">
        {conflicts.map((c) => {
          const decision = decisions[c.personId] ?? 'KEEP';
          return (
            <li key={c.personId} className="rounded-md border p-3 text-sm" aria-label={c.name}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium">{c.name}</span>
                <span className="text-xs text-muted-foreground">
                  {t(c.importedNewer ? 'importExport.conflicts.importNewer' : 'importExport.conflicts.existingNewer')}
                </span>
              </div>
              <table className="mt-2 w-full text-left text-xs">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="py-1 pr-2 font-normal">{t('importExport.conflicts.field')}</th>
                    <th className="py-1 pr-2 font-normal">
                      {t('importExport.conflicts.existing')} ({formatDateTime(c.existingUpdatedAt, i18n.language)})
                    </th>
                    <th className="py-1 font-normal">
                      {t('importExport.conflicts.imported')} ({formatDateTime(c.importedUpdatedAt, i18n.language)})
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {c.changes.map((change, i) => (
                    <tr key={i} className="border-t align-top">
                      <td className="py-1 pr-2">{fieldLabel(change.field, change.label)}</td>
                      <td className="py-1 pr-2">{show(change.existing)}</td>
                      <td className="py-1">{show(change.imported)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-2 flex flex-wrap gap-4" role="radiogroup" aria-label={t('importExport.conflicts.decision', { name: c.name })}>
                {(['KEEP', 'IMPORT'] as const).map((d) => (
                  <label key={d} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`decision-${c.personId}`}
                      checked={decision === d}
                      onChange={() => onChange({ ...decisions, [c.personId]: d })}
                      className="accent-primary"
                    />
                    {t(`importExport.conflicts.${d === 'KEEP' ? 'keep' : 'take'}`)}
                  </label>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
