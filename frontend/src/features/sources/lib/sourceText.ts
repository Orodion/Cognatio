import { BookOpen, Church, FileText, Globe, Landmark, Mail, Mic, Newspaper, ScrollText, Users, type LucideIcon } from 'lucide-react';
import type { Citation, Source, SourceType } from '@/features/sources/types/source';

/** Symbol of a kind of source */
export const SOURCE_ICONS: Record<SourceType, LucideIcon> = {
  CHURCH_BOOK: Church,
  CIVIL_REGISTER: Landmark,
  CENSUS: Users,
  NEWSPAPER: Newspaper,
  BOOK: BookOpen,
  LETTER: Mail,
  GRAVESTONE: ScrollText,
  WEBSITE: Globe,
  INTERVIEW: Mic,
  DOCUMENT: FileText,
  OTHER: FileText,
};

/** Short name of a source in lists: the short title if there is one */
export const sourceName = (source: Pick<Source, 'title' | 'abbreviation'>) => source.abbreviation?.trim() || source.title;

/** One line about a citation: page and date of the entry, e.g. "S. 12 · 1880" */
export const citationSummary = (citation: Pick<Citation, 'page' | 'date'>) => [citation.page, citation.date].filter(Boolean).join(' · ');

/** The first words of a transcription, for lists */
export const excerpt = (text: string | null | undefined, length = 120) => {
  const plain = (text ?? '').replace(/\s+/g, ' ').trim();
  return plain.length > length ? `${plain.slice(0, length - 1)}…` : plain;
};
