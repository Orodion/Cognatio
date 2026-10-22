import type { ReleaseNotes } from '../releases';

const notes: ReleaseNotes = {
  '1.1.0': {
    mcp: {
      title: 'AI assistants (MCP)',
      text: 'AI assistants such as Claude can look up, search and – with your permission – change your family trees through the Model Context Protocol. You decide per area what they may do; every change appears under “Activity”.',
    },
    reports: {
      title: 'Reports for printing and as PDF',
      text: 'Person sheet, family sheet, ancestor list (Kekulé) and descendant list (d’Aboville) – printed or saved as a PDF, in the desktop app straight into a file.',
    },
    checks: {
      title: 'Possible errors',
      text: 'A new page lists what is allowed but rarely true – a man as mother, a mother of 60, a wedding after the death, possible duplicates and more – with links to the persons; whatever is right can be marked as such. A relation that looks wrong is saved only after asking.',
    },
    statistics: {
      title: 'Statistics for further research',
      text: 'Every number of the statistics leads to the persons behind it – a click on a bar opens the person list with exactly these persons. The scope can be chosen: ancestors or descendants of a person, a last name, years of birth. The analyses are spread over tabs. “What is still missing?” shows the research status and leads to the gaps; “Ancestors” shows per generation how many ancestors are found, the pedigree collapse and the open ends – from the new home person of the family tree. A time axis shows births, deaths and weddings per decade; “Lives through time” compares lifespan, age at the wedding and at the first child across the centuries. Also first names and their fashion, the migration of the family from place to place and records of the deceased. Everything can be printed as a report, saved as PDF or copied as CSV.',
    },
    places: {
      title: 'Place suggestions',
      text: 'The fields for birth place, death place and the place of a life event suggest the places already used in the family tree, the most used first.',
    },
    dates: {
      title: 'Written-out dates',
      text: 'Date fields also take dates written out in any language of the app, such as “October 2, 1951” or “May 1951”, and turn them into “02.10.1951” and “05.1951”.',
    },
    anniversaries: {
      title: 'Anniversaries on the start page',
      text: 'The start page lists the birthdays, days of death and wedding days of the next 30 days, with the age or the years since.',
    },
    sources: {
      title: 'Sources and citations',
      text: 'One library of sources and archives for all family trees: a citation records page, date, transcription, reliability and scans and supports any number of facts – name, birth, death, events and relations, also of several persons. A source’s page shows by person what each citation supports; GEDCOM keeps the sources of other programs.',
    },
    files: {
      title: 'Viewing files',
      text: 'Images, PDF, videos, audio and text files such as TXT, Markdown or CSV open in a window titled with the file name; other files are saved right away. Media have no size limit per file any more, so long videos fit too. A file named as a picture or PDF that is none is refused.',
    },
    activity: {
      title: 'Large data and “Activity”',
      text: 'Export, import, backup and restore handle 50 GB and more without much memory and check the free disk space first. “Activity” in the sidebar shows the progress of every long operation; import and restore can be cancelled.',
    },
    search: {
      title: 'Cyrillic names',
      text: 'The search treats names written in Cyrillic like their Latin spelling: “Иванов” also finds “Iwanow” and “Ivanov”.',
    },
    'import-export': {
      title: 'Import in your language',
      text: 'A GEDCOM import writes event titles, labels and approximate dates in the language of the interface. Import and restore warn when a person would be their own ancestor, and very long notes are split instead of getting stuck. The GEDCOM export writes baptisms, occupations and residences with the standard tags other programs recognise.',
    },
    relations: {
      title: 'Clearer derived relations',
      text: 'The partner of a parent only becomes the second parent if the parent has exactly one partner, and a parent-child relation with its derived relations is saved all or nothing. Siblings that came only through a deleted parent-child relation go into the recycle bin with it and come back with it; the GEDCOM export leaves out relations in the recycle bin.',
    },
    'desktop-app': {
      title: 'PostgreSQL 18',
      text: 'The desktop app uses PostgreSQL 18; the data of version 1.0.0 is converted automatically at the first start, and the old database folder is kept for 30 days.',
    },
    settings: {
      title: 'Sidebar in groups',
      text: 'The sidebar groups the areas under “Record”, “Analyse” and “Manage”; “Import/Export” is now under “Manage”, and “Possible errors” shows how many are open. “Activity”, “Recycle bin”, “Settings” and “Help” stay at the bottom.',
    },
  },
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
