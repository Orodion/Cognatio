import { DEFAULT_LANGUAGE } from '@/i18n/locales';
import type { HelpSectionId } from './sections';

/** One entry of a release; its texts are in releaseNotes/<language>.ts under the same id */
export interface ReleaseChange {
  id: string;
  /** Help section the entry links to */
  section?: HelpSectionId;
}

export interface Release {
  version: string;
  /** Day of the release (YYYY-MM-DD), shown if known */
  date?: string;
  changes: ReleaseChange[];
}

export interface ReleaseNote {
  title: string;
  text: string;
}

/** Texts per version and entry id */
export type ReleaseNotes = Record<string, Record<string, ReleaseNote>>;

/**
 * Version history of the help page, newest first. Add a release here (and its texts in every
 * releaseNotes/<language>.ts, English is the original) before running `npm run release`.
 */
export const RELEASES: Release[] = [
  {
    version: '1.0.0',
    date: '2026-10-12',
    changes: [
      { id: 'persons', section: 'persons' },
      { id: 'relations', section: 'relations' },
      { id: 'tree', section: 'tree' },
      { id: 'search', section: 'search' },
      { id: 'statistics', section: 'statistics' },
      { id: 'family-trees', section: 'family-trees' },
      { id: 'import-export', section: 'import-export' },
      { id: 'backup', section: 'backup' },
      { id: 'trash', section: 'trash' },
      { id: 'settings', section: 'settings' },
      { id: 'desktop-app', section: 'desktop-app' },
    ],
  },
];

// Texts per language, discovered from ./releaseNotes/<code>.ts
const files = import.meta.glob<ReleaseNotes>('./releaseNotes/*.ts', { eager: true, import: 'default' });

export const RELEASE_NOTES: Record<string, ReleaseNotes> = Object.fromEntries(
  Object.entries(files).map(([path, notes]) => [path.match(/([\w-]+)\.ts$/)![1], notes]),
);

const notesFor = (language: string): ReleaseNotes | undefined => RELEASE_NOTES[language] ?? RELEASE_NOTES[language.split('-')[0]];

/** Text of an entry in the language – in the original (English) if it is not translated yet */
export function releaseNote(language: string, version: string, id: string): ReleaseNote {
  return notesFor(language)?.[version]?.[id] ?? RELEASE_NOTES[DEFAULT_LANGUAGE][version][id];
}
