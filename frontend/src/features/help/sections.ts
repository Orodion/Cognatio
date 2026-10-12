/**
 * Sections of the help page (in page order) and which section belongs to which page of the app.
 * Deliberately without the texts: the ? button in the header only needs the mapping, the texts are loaded
 * with the help page.
 */
export const HELP_SECTIONS = [
  'getting-started',
  'persons',
  'relations',
  'tree',
  'search',
  'statistics',
  'family-trees',
  'import-export',
  'backup',
  'trash',
  'settings',
  'desktop-app',
  'versions',
  'faq',
] as const;

export type HelpSectionId = (typeof HELP_SECTIONS)[number];

/** Section for the current page (path of the app); null on the help page itself */
export function helpSectionFor(pathname: string): HelpSectionId | null {
  if (pathname.startsWith('/help')) {
    return null;
  }
  const segment = pathname.split('/')[1];
  const pageSections: HelpSectionId[] = ['persons', 'tree', 'statistics', 'import-export', 'family-trees', 'trash', 'settings'];
  return pageSections.find((id) => id === segment) ?? 'getting-started';
}
