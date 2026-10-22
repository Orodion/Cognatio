import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ClipboardCopy } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toCsv, type CsvCell } from '../lib/csv';

/** How long "copied" stays */
const CONFIRM_MS = 2000;

/** Copies the figures of a card as CSV, to be pasted into a spreadsheet */
export function CopyCsvButton({ rows }: { rows: () => CsvCell[][] }) {
  const { t, i18n } = useTranslation();
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(toCsv(rows(), i18n.language));
      setState('copied');
    } catch {
      setState('failed');
    }
    setTimeout(() => setState('idle'), CONFIRM_MS);
  };
  return (
    <Button type="button" size="sm" variant="ghost" onClick={() => void copy()} className="text-muted-foreground print:hidden">
      {state === 'copied' ? <Check className="h-4 w-4" /> : <ClipboardCopy className="h-4 w-4" />}
      <span role="status">{t(state === 'copied' ? 'statistics.csv.copied' : state === 'failed' ? 'statistics.csv.failed' : 'statistics.csv.copy')}</span>
    </Button>
  );
}
