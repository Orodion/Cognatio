import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Download, Loader2, RefreshCw } from 'lucide-react';
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { ErrorBox } from '@/features/transfer/components/ErrorBox';
import { toError, type ErrorState } from '@/features/transfer/lib/transfer';
import { browserLog, exportLogs, fetchServerLog, filterLog, type LogEntry, type LogLevelFilter } from '@/features/settings/lib/logs';
import { cn } from '@/lib/utils';

interface LogViewerDialogProps {
  open: boolean;
  onClose: () => void;
}

type Source = 'backend' | 'frontend';

const LEVEL_STYLE: Record<string, string> = {
  error: 'text-destructive',
  warn: 'text-amber-700 dark:text-amber-400',
};

/** Log of the server and of this browser with a level filter and the export for the error analysis */
export function LogViewerDialog({ open, onClose }: LogViewerDialogProps) {
  const { t, i18n } = useTranslation();
  const [source, setSource] = useState<Source>('backend');
  const [filter, setFilter] = useState<LogLevelFilter>('all');
  const [server, setServer] = useState<{ file: string | null; entries: LogEntry[] } | null>(null);
  const [browser, setBrowser] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ErrorState | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState<{ filename: string; backendIncluded: boolean } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setBrowser(browserLog());
    setLoading(true);
    setError(null);
    try {
      const { file, entries } = await fetchServerLog();
      setServer({ file, entries });
    } catch (err) {
      setError(toError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setExported(null);
      void load();
    }
  }, [open, load]);

  // Newest entries are at the bottom – show them first
  const entries = filterLog(source === 'backend' ? (server?.entries ?? []) : browser, filter);
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [entries.length, source, open]);

  const runExport = async () => {
    setExporting(true);
    setError(null);
    setExported(null);
    try {
      setExported(await exportLogs());
    } catch (err) {
      setError(toError(err));
    } finally {
      setExporting(false);
    }
  };

  const time = (iso: string | null) => (iso ? new Date(iso).toLocaleString(i18n.language, { dateStyle: 'short', timeStyle: 'medium' }) : '');
  const noFile = source === 'backend' && server !== null && server.file === null;

  return (
    <Dialog open={open} onClose={onClose} className="max-w-5xl">
      <DialogHeader>
        <DialogTitle>{t('settings.logs.title')}</DialogTitle>
      </DialogHeader>

      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div className="flex gap-1" role="group" aria-label={t('settings.logs.title')}>
          {(['backend', 'frontend'] as const).map((s) => (
            <Button key={s} size="sm" variant={source === s ? 'default' : 'outline'} aria-pressed={source === s} onClick={() => setSource(s)}>
              {t(`settings.system.${s}`)}
            </Button>
          ))}
        </div>
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="log-filter" className="text-xs">
              {t('settings.logs.filter')}
            </Label>
            <Select id="log-filter" className="h-8 w-52 text-xs" value={filter} onChange={(e) => setFilter(e.target.value as LogLevelFilter)}>
              <option value="all">{t('settings.logs.allLevels')}</option>
              <option value="warn">{t('settings.logs.warnUp')}</option>
              <option value="error">{t('settings.logs.errorsOnly')}</option>
              <option value="mcp">{t('settings.logs.mcpOnly')}</option>
            </Select>
          </div>
          <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {t('settings.logs.refresh')}
          </Button>
        </div>
      </div>

      <div
        ref={listRef}
        role="log"
        tabIndex={0}
        aria-label={`${t('settings.logs.title')}: ${t(`settings.system.${source}`)}`}
        className="h-[50vh] overflow-auto rounded-md border bg-muted/30 p-2 font-mono text-xs"
      >
        {noFile ? (
          <p className="p-2 text-muted-foreground">{t('settings.logs.noFile')}</p>
        ) : entries.length === 0 ? (
          <p className="p-2 text-muted-foreground">{loading ? t('common.loading') : t('settings.logs.empty')}</p>
        ) : (
          <ol>
            {entries.map((entry, index) => (
              <li key={index} className="flex gap-2 border-b border-border/50 py-1 last:border-b-0">
                <time className="shrink-0 text-muted-foreground" dateTime={entry.time ?? undefined}>
                  {time(entry.time)}
                </time>
                <span className={cn('w-12 shrink-0 font-semibold uppercase', LEVEL_STYLE[entry.level])}>{entry.level}</span>
                <span className="min-w-0 wrap-break-word">
                  {entry.component && <span className="text-muted-foreground">[{entry.component}] </span>}
                  {entry.msg}
                  {entry.details && <span className="block text-muted-foreground">{entry.details}</span>}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">{t('settings.logs.hint')}</p>
      {error && (
        <div className="mt-3">
          <ErrorBox error={error} />
        </div>
      )}
      {exported && (
        <p className="mt-3 flex items-start gap-2 text-sm" role="status">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span className="break-all">
            {t('settings.backup.downloaded', { file: exported.filename })}
            {!exported.backendIncluded && ` ${t('settings.logs.exportPartial')}`}
          </span>
        </p>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={() => void runExport()} disabled={exporting}>
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {t('settings.logs.export')}
        </Button>
        <Button onClick={onClose}>{t('common.close')}</Button>
      </DialogFooter>
    </Dialog>
  );
}
