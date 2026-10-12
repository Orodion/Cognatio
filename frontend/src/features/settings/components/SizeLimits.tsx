import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { SET_SIZE_LIMITS, SIZE_LIMITS } from '@/features/settings/graphql/systemQueries';
import { MEMORY_WARNING_MB, gbToMb, mbToGb } from '@/features/settings/lib/sizeLimits';
import { apiErrorMessage } from '@/lib/apiErrors';

interface Limits {
  importMb: number;
  backupMb: number;
  defaultMb: number;
  minMb: number;
  maxMb: number;
}

/**
 * Largest file for export/import and for backup/restore. Both are processed in memory, so a computer with much
 * memory can allow more than the default; above 4 GB a warning names the memory that is needed.
 */
export function SizeLimits() {
  const { t } = useTranslation();
  const { data } = useQuery<{ sizeLimits: Limits }>(SIZE_LIMITS, { fetchPolicy: 'cache-and-network' });
  const [save, { loading, error }] = useMutation<{ setSizeLimits: Limits }>(SET_SIZE_LIMITS, { refetchQueries: ['SizeLimits'] });
  const limits = data?.sizeLimits;
  const [importGb, setImportGb] = useState('');
  const [backupGb, setBackupGb] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (limits) {
      setImportGb(mbToGb(limits.importMb));
      setBackupGb(mbToGb(limits.backupMb));
    }
  }, [limits]);

  if (!limits) {
    return null;
  }

  const importMb = gbToMb(importGb, limits);
  const backupMb = gbToMb(backupGb, limits);
  const valid = importMb !== null && backupMb !== null;
  const changed = importMb !== limits.importMb || backupMb !== limits.backupMb;
  const needsMemory = (importMb ?? 0) > MEMORY_WARNING_MB || (backupMb ?? 0) > MEMORY_WARNING_MB;
  const isDefault = importMb === limits.defaultMb && backupMb === limits.defaultMb;

  const submit = async () => {
    if (importMb === null || backupMb === null) {
      return;
    }
    setSaved(false);
    try {
      await save({ variables: { importMb, backupMb } });
      setSaved(true);
    } catch {
      // shown below
    }
  };

  const field = (id: string, label: string, value: string, set: (value: string) => void, mb: number | null) => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          min={limits.minMb / 1024}
          max={limits.maxMb / 1024}
          step={0.5}
          className="w-28"
          value={value}
          aria-invalid={mb === null}
          onChange={(e) => {
            setSaved(false);
            set(e.target.value);
          }}
        />
        <span className="text-muted-foreground">{t('settings.limits.unit')}</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-3 border-t pt-4" role="group" aria-labelledby="settings-limits-title">
      <h3 id="settings-limits-title" className="font-medium">
        {t('settings.limits.title')}
      </h3>
      <p className="text-muted-foreground">{t('settings.limits.hint')}</p>
      <div className="flex flex-wrap gap-4">
        {field('settings-limit-import', t('settings.limits.import'), importGb, setImportGb, importMb)}
        {field('settings-limit-backup', t('settings.limits.backup'), backupGb, setBackupGb, backupMb)}
      </div>
      {needsMemory && (
        <p className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3" role="alert">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden="true" />
          {t('settings.limits.memoryWarning')}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button id="settings-limits-save" size="sm" onClick={() => void submit()} disabled={loading || !valid || !changed}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {t('settings.limits.save')}
        </Button>
        <Button
          id="settings-limits-reset"
          size="sm"
          variant="outline"
          disabled={loading || isDefault}
          onClick={() => {
            setSaved(false);
            setImportGb(mbToGb(limits.defaultMb));
            setBackupGb(mbToGb(limits.defaultMb));
          }}
        >
          {t('settings.limits.reset')}
        </Button>
      </div>
      {saved && !error && (
        <p className="flex items-start gap-2" role="status">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          {t('settings.limits.saved')}
        </p>
      )}
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {apiErrorMessage(error, t)}
        </p>
      )}
    </div>
  );
}
