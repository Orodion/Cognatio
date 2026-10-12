import type { HelpSectionId } from './sections';

/** Building block of a help section: paragraph, steps, list or questions with answers */
export type HelpBlock = { p: string } | { steps: string[] } | { list: string[] } | { faq: Array<{ q: string; a: string }> };

export interface HelpSection {
  id: HelpSectionId;
  title: string;
  blocks: HelpBlock[];
  /** Page of the app the section belongs to (link "Go to …") */
  link?: { to: string; label: string };
}
