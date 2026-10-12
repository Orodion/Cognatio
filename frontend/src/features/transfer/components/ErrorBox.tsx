import { useTranslation } from 'react-i18next';
import { formatMb, type ErrorState } from '@/features/transfer/lib/transfer';

/** Errors of import/export and backup: message (importExport.errors.<reason>) with technical details */
export function ErrorBox({ error }: { error: ErrorState }) {
  const { t } = useTranslation();
  // Limit and size of a file that is too large are written into the message
  const { limitMb, sizeMb } = error.params ?? {};
  const values = { limit: limitMb ? formatMb(limitMb) : '', size: sizeMb ? formatMb(sizeMb) : '' };
  return (
    <div className="space-y-2 rounded-md bg-destructive/15 p-3 text-sm text-destructive" role="alert">
      <p>{t(`importExport.errors.${error.reason}`, { ...values, defaultValue: t('importExport.errors.UNKNOWN') })}</p>
      {error.details.length > 0 && (
        <details>
          <summary className="cursor-pointer">{t('importExport.errors.details')}</summary>
          <ul className="mt-1 list-disc pl-5 font-mono text-xs">
            {error.details.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
