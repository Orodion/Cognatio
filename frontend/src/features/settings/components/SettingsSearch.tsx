import { useEffect, useId, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/stores/settingsStore';
import { SETTING_ENTRIES, matchSettings } from '@/features/settings/lib/settingsSearch';

const MAX_RESULTS = 8;

/** Search field for the settings: opens the block of a found setting and focuses it */
export function SettingsSearch() {
  const { t } = useTranslation();
  const setSectionOpen = useSettingsStore((s) => s.setSectionOpen);
  const listId = useId();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [target, setTarget] = useState<string | null>(null);

  const entries = SETTING_ENTRIES.map((entry) => ({
    ...entry,
    label: t(entry.label),
    blockTitle: entry.section === 'system' ? t('settings.system.title') : t(`settings.sections.${entry.section}`),
  }));
  const results = matchSettings(entries, query).slice(0, MAX_RESULTS);
  const searching = query.trim() !== '';

  // The block opens first; only then the field exists and can be focused
  useEffect(() => {
    if (!target) {
      return;
    }
    const element = document.getElementById(target);
    element?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
    element?.focus();
    element?.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
    // Highlight for a moment (not tied to this effect, which runs again right after `setTarget`)
    window.setTimeout(() => element?.classList.remove('ring-2', 'ring-primary', 'ring-offset-2'), 2000);
    setTarget(null);
  }, [target]);

  const go = (entry: (typeof entries)[number]) => {
    if (entry.section !== 'system') {
      setSectionOpen(entry.section, true);
    }
    setQuery('');
    setActive(0);
    setTarget(entry.id);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && results.length) {
      event.preventDefault();
      setActive((active + 1) % results.length);
    } else if (event.key === 'ArrowUp' && results.length) {
      event.preventDefault();
      setActive((active - 1 + results.length) % results.length);
    } else if (event.key === 'Enter' && results[active]) {
      event.preventDefault();
      go(results[active]);
    } else if (event.key === 'Escape') {
      setQuery('');
    }
  };

  return (
    <div className="relative min-w-56 flex-1">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input
        type="search"
        role="combobox"
        aria-label={t('settings.search.label')}
        aria-expanded={searching}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={searching && results[active] ? `${listId}-${active}` : undefined}
        placeholder={t('settings.search.placeholder')}
        className="h-9 pl-8"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
        }}
        onKeyDown={onKeyDown}
      />
      {searching && (
        <ul
          id={listId}
          role="listbox"
          aria-label={t('settings.search.label')}
          className="absolute left-0 z-20 mt-1 w-full overflow-hidden rounded-md border bg-popover p-1 text-sm shadow-md"
        >
          {results.length === 0 ? (
            <li role="status" className="px-2 py-1.5 text-muted-foreground">
              {t('settings.search.none')}
            </li>
          ) : (
            results.map((entry, index) => (
              <li
                key={entry.id}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                className={cn('cursor-pointer rounded-sm px-2 py-1.5', index === active && 'bg-accent text-accent-foreground')}
                // Keeps the focus in the field until the choice is made
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(entry)}
                onMouseEnter={() => setActive(index)}
              >
                <span className="block">{entry.label}</span>
                <span className="block text-xs text-muted-foreground">{entry.blockTitle}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
