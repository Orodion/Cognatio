import type { ReleaseNotes } from '../releases';

const notes: ReleaseNotes = {
  '1.0.0': {
    persons: {
      title: 'Persons with life events and media',
      text: 'Persons with flexible dates (exact, month, year, “about 1880” or a range), life events with places, notes, and photos and documents.',
    },
    relations: {
      title: 'Relations',
      text: 'Link parents, children, partners and siblings. The opposite direction is created automatically; periods and labels such as “adopted child” are possible.',
    },
    tree: {
      title: 'Family tree views',
      text: 'Family tree, ancestor chart, descendant chart and relationship network with zoom, focus person and export as PNG, SVG or PDF.',
    },
    search: {
      title: 'Search',
      text: 'Finds names even with similar spellings, as well as places, occupations, life events and notes.',
    },
    statistics: {
      title: 'Statistics',
      text: 'Key figures, age distribution, most common surnames and places of birth, and an overview of the generations.',
    },
    'family-trees': {
      title: 'Several family trees',
      text: 'Keep separate family trees, for example for both sides of the family, and switch between them.',
    },
    'import-export': {
      title: 'Import and export',
      text: 'Exchange data as ZIP (with media) or as GEDCOM 5.5.1 and 7.0 with other genealogy programs; importing again does not create duplicates.',
    },
    backup: {
      title: 'Backups',
      text: 'Automatic daily backups, a download of all data and a guided restore that saves the current state first.',
    },
    trash: {
      title: 'Recycle bin',
      text: 'Deleted persons and family trees can be restored.',
    },
    settings: {
      title: 'Languages and appearance',
      text: 'Ten languages (the app starts in the language of the operating system), colour schemes, fonts and the look of the family tree.',
    },
    'desktop-app': {
      title: 'Desktop app for Windows and Linux',
      text: 'Windows installer or portable ZIP, Linux AppImage or Debian package: with its own database, no setup, one click to start, a backup of the data before every update and automatic updates (except for the portable ZIP and the Debian package).',
    },
  },
};

export default notes;
