import { useTranslation } from 'react-i18next';
import { Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatBytes } from '@/lib/formatSize';
import type { StepProgress } from '@/lib/activity';

interface TransferProgressBarProps {
  progress: StepProgress | null;
  /** Shown as long as the backend can still stop (before the database is changed) */
  onCancel?: () => void;
  cancelling?: boolean;
}

/**
 * Progress of a long import or restore: the step (upload, check, backup before the restore, media, database) with the
 * bytes done. The database step has no bytes – it shows only the spinner.
 */
export function TransferProgressBar({ progress, onCancel, cancelling = false }: TransferProgressBarProps) {
  const { t } = useTranslation();
  const phase = progress?.phase ?? 'check';
  const percent = progress && progress.total > 0 ? Math.min(100, Math.round((progress.done / progress.total) * 100)) : null;
  const label = t(`transferProgress.phases.${phase}`);

  return (
    <div className="space-y-2" data-testid="transfer-progress">
      <p className="flex items-center gap-2 text-muted-foreground" role="status">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        <span>
          {label}
          {percent !== null && progress && ` – ${t('transferProgress.bytes', { done: formatBytes(progress.done), total: formatBytes(progress.total) })}`}
        </span>
      </p>
      {percent !== null && (
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div className="h-full bg-primary transition-[width]" style={{ width: `${percent}%` }} />
        </div>
      )}
      {onCancel && phase !== 'database' && (
        <Button type="button" size="sm" variant="outline" onClick={onCancel} disabled={cancelling}>
          <X className="h-4 w-4" aria-hidden="true" />
          {t(cancelling ? 'transferProgress.cancelling' : 'transferProgress.cancel')}
        </Button>
      )}
    </div>
  );
}
