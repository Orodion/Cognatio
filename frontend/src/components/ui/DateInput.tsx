import * as React from 'react';
import { CalendarDays } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { parseFlexibleDate, isoToDisplay, displayToIso } from '@/lib/dateParsing';
import { ClearableInput } from './ClearableInput';

interface DateInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Show the detected precision below the field */
  showPrecision?: boolean;
}

/**
 * Free-text date field (e.g. "04.01.1980", "um 1980", "1980-1985") with an optional calendar popup.
 */
export function DateInput({ id, value, onChange, placeholder, showPrecision = true }: DateInputProps) {
  const { t } = useTranslation();
  const pickerRef = React.useRef<HTMLInputElement>(null);

  const openPicker = () => {
    const picker = pickerRef.current;
    if (!picker) {
      return;
    }
    picker.value = displayToIso(value);
    if (typeof picker.showPicker === 'function') {
      try {
        picker.showPicker();
        return;
      } catch {
        // e.g. in browsers without a user gesture – fallback below
      }
    }
    picker.focus();
    picker.click();
  };

  const parsed = value.trim() ? parseFlexibleDate(value) : null;

  return (
    <div className="space-y-1">
      <div className="relative">
        <ClearableInput
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onClear={() => onChange('')}
          placeholder={placeholder ?? t('form.datePlaceholder')}
          autoComplete="off"
          trailing={
            <button
              type="button"
              onClick={openPicker}
              aria-label={t('form.openCalendar')}
              title={t('form.openCalendar')}
              className="rounded-sm p-1 text-muted-foreground hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
            >
              <CalendarDays className="h-4 w-4" />
            </button>
          }
        />
        <input
          ref={pickerRef}
          type="date"
          tabIndex={-1}
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 right-0 h-0 w-0 opacity-0"
          onChange={(e) => e.target.value && onChange(isoToDisplay(e.target.value))}
        />
      </div>
      {showPrecision && parsed?.ok && (
        <p className="text-xs text-muted-foreground">{t('form.detectedPrecision', { precision: t(`precision.${parsed.value.precision}`) })}</p>
      )}
    </div>
  );
}
