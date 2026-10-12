import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { DEFAULT_LANGUAGE } from '@/i18n/locales';
import { RELEASES, releaseNote } from '../releases';

/** Version history inside the help section "versions": every release with its entries, newest first */
export function VersionHistory({ open }: { open: (id: string) => (e: React.MouseEvent) => void }) {
  const { t, i18n } = useTranslation();
  const [original, setOriginal] = useState(false);
  const translatable = i18n.language.split('-')[0] !== DEFAULT_LANGUAGE;
  const language = original ? DEFAULT_LANGUAGE : i18n.language;
  const formatDate = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString(i18n.language, { dateStyle: 'long' });

  return (
    <div className="space-y-4" lang={original ? DEFAULT_LANGUAGE : undefined}>
      {translatable && (
        <Button type="button" variant="outline" size="sm" onClick={() => setOriginal((value) => !value)}>
          {original ? t('help.showTranslation') : t('help.showOriginal')}
        </Button>
      )}
      {RELEASES.map((release) => (
        <div key={release.version} className="space-y-2">
          <h3 className="font-semibold">
            {t('help.version', { version: release.version })}
            {release.date && <span className="ml-2 font-normal text-muted-foreground">{formatDate(release.date)}</span>}
          </h3>
          <ul className="space-y-2">
            {release.changes.map(({ id, section }) => {
              const note = releaseNote(language, release.version, id);
              return (
                <li key={id}>
                  {section ? (
                    <a href={`#${section}`} onClick={open(section)} className="font-medium text-primary hover:underline">
                      {note.title}
                    </a>
                  ) : (
                    <span className="font-medium">{note.title}</span>
                  )}
                  <span className="text-muted-foreground"> – {note.text}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
