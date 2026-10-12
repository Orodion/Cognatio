import { DEFAULT_LANGUAGE } from '@/i18n/locales';
import type { HelpBlock, HelpSection } from './types';

export type { HelpBlock, HelpSection } from './types';

// Help texts per language, discovered from ./content/<code>.ts (loaded with the help page only)
const files = import.meta.glob<HelpSection[]>('./content/*.ts', { eager: true, import: 'default' });

export const HELP_CONTENT: Record<string, HelpSection[]> = Object.fromEntries(
  Object.entries(files).map(([path, sections]) => [path.match(/([\w-]+)\.ts$/)![1], sections]),
);

/** Help texts in the language of the app – in the default language if there is no translation yet */
export const helpContent = (language: string): HelpSection[] =>
  HELP_CONTENT[language] ?? HELP_CONTENT[language.split('-')[0]] ?? HELP_CONTENT[DEFAULT_LANGUAGE];

/** Whether the help is available in this language (otherwise the page shows a hint) */
export const hasHelpFor = (language: string) => !!(HELP_CONTENT[language] ?? HELP_CONTENT[language.split('-')[0]]);

const blockText = (block: HelpBlock): string[] => {
  if ('p' in block) {
    return [block.p];
  }
  if ('faq' in block) {
    return block.faq.flatMap((f) => [f.q, f.a]);
  }
  return 'steps' in block ? block.steps : block.list;
};

/** Lower case without accents – "losch" finds "Lösch", "е" also finds "ё" */
const normalize = (text: string) => text.toLocaleLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Sections whose title or text contains all search words */
export function filterHelp(sections: HelpSection[], query: string): HelpSection[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (!words.length) {
    return sections;
  }
  return sections.filter((section) => {
    const text = normalize([section.title, ...section.blocks.flatMap(blockText)].join(' '));
    return words.every((word) => text.includes(word));
  });
}
