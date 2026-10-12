import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X } from 'lucide-react';
import { LANGUAGE_CODES, languageName } from '@/features/persons/lib/languages';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';

interface LanguagePickerProps {
  id: string;
  value: string[];
  onChange: (value: string[]) => void;
}

/** Languages as removable chips; a new language via "+" and a selection list. */
export function LanguagePicker({ id, value, onChange }: LanguagePickerProps) {
  const { t, i18n } = useTranslation();
  const [adding, setAdding] = useState(false);

  const options = useMemo(
    () =>
      LANGUAGE_CODES.filter((code) => !value.includes(code))
        .map((code) => ({ code, name: languageName(code, i18n.language) }))
        .sort((a, b) => a.name.localeCompare(b.name, i18n.language)),
    [value, i18n.language],
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {value.map((lang) => {
        const name = languageName(lang, i18n.language);
        return (
          <span
            key={lang}
            className="inline-flex items-center gap-1 rounded-full border bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
          >
            {name}
            <button
              type="button"
              onClick={() => onChange(value.filter((l) => l !== lang))}
              aria-label={t('form.removeLanguage', { language: name })}
              className="rounded-full p-0.5 hover:bg-background/60 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        );
      })}

      {adding ? (
        <Select
          id={id}
          autoFocus
          className="h-8 w-48"
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) {
              onChange([...value, e.target.value]);
            }
            setAdding(false);
          }}
          onBlur={() => setAdding(false)}
          onKeyDown={(e) => e.key === 'Escape' && (e.stopPropagation(), setAdding(false))}
        >
          <option value="" disabled>
            {t('form.selectLanguage')}
          </option>
          {options.map(({ code, name }) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </Select>
      ) : (
        <Button id={id} type="button" variant="outline" size="sm" onClick={() => setAdding(true)} disabled={options.length === 0}>
          <Plus className="h-4 w-4" />
          {t('form.addLanguage')}
        </Button>
      )}
    </div>
  );
}
