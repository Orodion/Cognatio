import type { HelpSection } from '../types';

const help: HelpSection[] = [
  {
    id: 'getting-started',
    title: 'Getting started',
    blocks: [
      {
        p: 'Cognatio manages your family tree: persons, their relations, life events, photos and documents. Choose an area on the left and search for persons at the top. The ? button at the top right opens the help for the page you are on.',
      },
      {
        steps: [
          'Under “Persons”, click “New person”, enter at least the first name and save.',
          'On the person’s page, add parents, children, partners or siblings in the “Relations” tab – pick an existing person or create a new one right there.',
          'Look at the result under “Family Tree”. With a focus person, the tree shows the family from that person’s point of view.',
        ],
      },
      {
        p: 'The start page shows the number of persons and the gender distribution, quick access to the main areas, the most recently added persons and a few tips. The help page has its own search field above the chapters. The card “Anniversaries” lists the birthdays, days of death and wedding days of the next 30 days – for dates with day, month and year; a wedding day is the start of a relation husband/wife.',
      },
      {
        p: 'Example family tree: on the first start the desktop app creates the family tree “Familie Kraft (Demo)” – ten fictional persons in four generations with relations, life events, notes and photos, so you can try every area right away. Its content is in German. To begin with your own data, create a new family tree under “Family trees” and delete the example (it goes to the recycle bin and does not come back). The file Cognatio-Demo-Familie-Kraft.zip is in the program folder (folder “demo” in “resources”) and in the folder “demo” of the project; under Import/Export you can import it again as a new family tree.',
      },
    ],
    link: { to: '/persons', label: 'Go to persons' },
  },
  {
    id: 'persons',
    title: 'Persons',
    blocks: [
      {
        p: 'Only the first name is required. If it is unknown, tick “First name unknown” – the app then shows “(first name unknown)”. Enter dates as far as you know them: 04.01.1880 (exact), 01.1880 (month), 1880 (year), “about 1880”, “before 1880”, “after 1880” or the range “1880-1885”. The app detects the precision itself. A date written out, such as “October 2, 1880”, becomes “02.10.1880”.',
      },
      {
        p: 'When you create a person, the app points out existing persons with a similar name and the same year of birth – so no duplicates are created. The place fields – birth, death and life events – suggest the places already used in the family tree while you type; any other place can still be entered.',
      },
      {
        list: [
          'Overview: personal data, contact and further details; “Edit” changes them.',
          'Life events: events such as birth, baptism, wedding or moving house, with date and place. An event can be linked with files – including files of other persons, e.g. a group photo. The events can be listed from oldest to newest or the other way round, and shown as a timeline or as a table; the choice is remembered.',
          'Relations: see the section “Relations”.',
          'Notes: free text, e.g. stories or research notes, up to 10,000 characters each.',
          'Media: upload photos and documents (also videos, without a size limit per file); an image can be set as profile picture. The download icon saves a file under its original name. Clicking a file shows it in a window of its own, titled with its name – images, PDF, videos, audio and text files (e.g. TXT, Markdown, CSV); other files such as ZIP are saved right away.',
          'Media can be shown as tiles or as a list (buttons above the files).',
          'Sources: the citations of the person, of their life events and of their relations – see the section “Sources and citations”.',
          'Filter: the field next to the tabs (except “Overview”) filters the entries of the open tab – timeline, relations, notes, media or sources. Case and accents do not matter, with several words all of them have to occur, and the hits are highlighted. All texts are searched, e.g. title, category, date, place, description and file names, so “birth” also finds “birthday”. In the relations the graph shows only the remaining persons as well. The text stays when you switch tabs; Esc or the X clears it.',
        ],
      },
      { p: '“Delete” moves the person to the recycle bin – it can be restored from there.' },
    ],
    link: { to: '/persons', label: 'Go to persons' },
  },
  {
    id: 'relations',
    title: 'Relations',
    blocks: [
      {
        p: 'You add relations on a person’s page in the “Relations” tab, or already while creating the person. The relation type describes the selected person from the current person’s point of view: if you are on Anna’s page and choose Max as “Father”, Max is Anna’s father. The other direction – Anna is Max’s child – is shown automatically.',
      },
      {
        list: [
          'Types: mother, father, child, sibling, husband, wife, life partner, partner, other.',
          'Label (optional), e.g. “adopted child” or “stepfather”.',
          'Period from – to, e.g. for a marriage; for a child, the date of birth is suggested as the start.',
          'If the person does not exist yet, choose “New person” and create it right in the dialog.',
          'Graph: beside the list (above it on narrow screens) the relations of the person are drawn as a diagram – parents above, partners beside, children below. A click on a person opens them; the button “Graph” hides or shows it, and the choice is remembered.',
        ],
      },
      {
        p: 'Some relations are added automatically: when a parent and a child are linked, the parent’s partner also becomes a parent of the child (if the parent has exactly one partner and the child has no second parent yet; with several partners you add the second parent yourself; the relation starts with the child’s birth if it is known exactly), and the parent’s other children become the child’s siblings. The delete button next to a relation removes only the relation – the persons stay.',
      },
    ],
  },
  {
    id: 'tree',
    title: 'Family tree view',
    blocks: [
      {
        list: [
          'Family tree: all families of the family tree.',
          'Ancestor chart: parents, grandparents etc. of the focus person.',
          'Descendant chart: children, grandchildren etc. of the focus person.',
          'Relationship network: all connections as a network.',
        ],
      },
      {
        p: 'The focus person determines from whom the tree is drawn; “Generations” limits the depth. Zoom with the mouse wheel or the zoom bar; clicking a person opens their page. The border colour shows the gender. Very large trees (400 persons or more) are not drawn automatically – choose a focus person and fewer generations.',
      },
      {
        p: '“Export” saves the tree as PNG or SVG or prints it (also as PDF), optionally only the visible area. The app remembers view, generations and focus person; set the defaults under “Settings”. On a person’s page, “Show tree” opens the tree with that person in focus.',
      },
    ],
    link: { to: '/tree', label: 'Go to family tree' },
  },
  {
    id: 'sources',
    title: 'Sources and citations',
    blocks: [
      {
        p: 'A source is a document or work the facts come from – a church book, a civil register, a census, a letter, a gravestone, a website or an interview. A citation is one entry in it: page or entry number, date, the entry word for word, how reliable it is, and scans. One citation can support any number of facts, e.g. a marriage entry the groom, the bride, their parents, the witnesses, the wedding and the marriage.',
      },
      {
        p: 'Sources, archives and citations form one library for all family trees: a registry office or a church book is entered once, and a citation can support facts of persons in several family trees. A change to a source applies everywhere.',
      },
      {
        list: [
          'On the page of a person, the tab “Sources” lists the citations of the person, of their life events and of their relations, grouped by fact. “Cite source” chooses the fact, a source (or creates one) and a citation of it that exists already or a new one. A small book next to the name, birth, death, an event or a relation shows how many citations it has; a click opens the tab.',
          '“Sources” in the sidebar lists the sources the open family tree uses and those used nowhere; “All family trees” shows the whole library. The page of a source shows its fields, scans and citations with the facts each one supports – by person, with the years of life; the × at a fact removes the link; “Link facts” links a citation with further persons, one after the other.',
          'Archives (registry office, church records office, library, website) are managed in the second tab and chosen for every source; a new one can also be created right in the form of a source.',
          'The reliability follows the levels of GEDCOM: primary source (the original entry), secondary source (written down later), questionable (e.g. oral tradition), unreliable or estimated.',
          'Scans belong to the whole source (title page, gravestone) or to a citation (the single page).',
          'The search at the top also finds sources – by title, author, archive, call number and the transcriptions of their citations; they are listed above the persons found. The statistics show how many persons have a citation and which sources are cited most.',
          'GEDCOM: the export writes archives and sources as REPO and SOUR records and every citation at the facts it supports (page, date, transcription, reliability, scans in GEDZIP); the import takes over the sources of other programs as well – also below names, events and families – and makes equal citations one again.',
        ],
      },
      {
        p: 'Deleting a source moves it into the recycle bin together with its citations: they disappear from all facts and come back with the restore. An archive in the recycle bin leaves its sources without archive until it is restored. Deleting a person, an event, a relation or a family tree for good removes only their links; the sources stay.',
      },
      {
        p: 'The export of a family tree contains the sources, archives and citations its persons use, with their scans; an import reuses a source that is there already instead of copying it. The transcription of a citation may name persons of another family tree – it goes along with the export. An export file with sources can only be read by this version of Cognatio or a newer one.',
      },
    ],
    link: { to: '/sources', label: 'Go to sources' },
  },
  {
    id: 'search',
    title: 'Search',
    blocks: [
      {
        p: 'The search field at the top searches the open family tree: names – including similar spellings, so “Meier” also finds “Mayer” and “Maier” –, personal data such as places and occupations, life events and notes. Each result shows what it was found by. Names written in Cyrillic count like their Latin spelling: “Иванов” also finds “Iwanow” and “Ivanov”. It also finds sources; they are listed above the persons found (see “Sources and citations”).',
      },
    ],
  },
  {
    id: 'statistics',
    title: 'Statistics',
    blocks: [
      {
        p: 'The statistics evaluate the open family tree (without the recycle bin), spread over tabs: “Overview” with key figures such as count, genders and average lifespan, “Lives” with the age distribution, “Names & places” with the most common last names and places of birth, “Ancestors” with the overview of the generations and “Sources” with the sources used, the persons with at least one citation and the sources cited most.',
      },
      {
        p: 'Every number that counts persons is a link: a click on a key figure, a bar or a generation opens the person list with exactly these persons. Above the list it says which selection they come from; the × shows all persons again, “Back to the statistics” returns. A search at the top then searches only among these persons.',
      },
      {
        p: 'Above the tabs the scope is chosen: the whole family tree, the ancestors or the descendants of a person (each including the person) or all persons of a last name (also as birth name) – if wanted, only those born in certain years. All numbers and lists follow it; only the sources always refer to the whole family tree. The scope chosen last is kept per family tree.',
      },
      {
        p: '“What is still missing?” in the overview shows for date and place of birth, date and place of death (of the deceased), father, mother, partner (of the deceased from 18), photo and source how many persons have the fact recorded; the research status is the mean of these shares. A click on the missing ones opens the list of persons where something is left to do.',
      },
      {
        p: '“Ancestors” shows per generation how many of the possible ancestors (2 parents, 4 grandparents, 8 great-grandparents …) are found, who appears more than once (pedigree collapse) and the open ends – ancestors whose father or mother is still missing. It starts with the home person of the family tree, set with “Home person” on the page of a person; reports and the family tree start with it as well.',
      },
      {
        p: 'The time axis in the overview shows births, deaths or weddings per decade; empty decades stay, so gaps in the research stand out. Weddings are the start of a marriage (relation husband/wife) or the life event “wedding”, once per couple and year; life partners and partners only count with that event.',
      },
      {
        p: '“Lives through time” under “Lives” shows per century of birth, for men and women apart, the mean lifespan – also of those who reached 15 –, the age at the first wedding and at the birth of the first child; in brackets the number of persons the value is based on, a mean of fewer than 5 persons is not shown. Then the number of children per couple and the age gap of the partners.',
      },
      {
        p: '“Names & places” also shows the most common first names of men and women – every given name counts, so “Johann Georg” for Johann and for Georg – and the fashion of names per century. “Migration” shows who died at the place of birth, the most common paths from the place of birth through moves to the place of death, and the places with their persons and the period of the facts there.',
      },
      {
        p: '“Records” under “Lives” names the longest life, the longest marriage, the most children, partners and descendants, the youngest and oldest parents at a birth and the largest age gap of a couple – of deceased persons only. If a record is also a possible error, such as a mother of 61, a hint with a link stands next to it.',
      },
      {
        p: '“Print or save as PDF” opens the report “Statistics” with all figures of the chosen scope as tables. “Copy as CSV” on every card puts its figures on the clipboard, to be pasted into a spreadsheet. AI assistants get the same figures with the tool “get_statistics”, also for a scope.',
      },
    ],
    link: { to: '/statistics', label: 'Go to statistics' },
  },
  {
    id: 'checks',
    title: 'Possible errors',
    blocks: [
      {
        p: '“Possible errors” lists facts of the open family tree that are allowed but rarely true – often a typing error: a man entered as mother or a woman as husband, partners who are also parent and child or siblings, a child with more than two parents, a parent younger than 12 or a mother older than 55 at the birth, a parent who died before the birth, a partnership that begins before the birth or after the death of a partner, a death before the birth, a life of more than 110 years or a person older than 110 without a date of death, life events before the birth or after the death, possible duplicates and persons who are their own ancestors. An approximate date such as “about 1880” counts as five years either way, so only what is certain is reported.',
      },
      {
        p: 'Every entry names the persons with a link to them. Correct the error there – the entry disappears by itself – or click “Is right” if it is correct: it is then hidden, also after a backup and restore. “Also show those marked as right” shows them again.',
      },
      {
        p: 'When you save a relation that looks wrong, the app lists why and asks whether to save it anyway. AI assistants have to ask you as well before they save such a relation.',
      },
    ],
    link: { to: '/checks', label: 'Go to possible errors' },
  },
  {
    id: 'reports',
    title: 'Reports',
    blocks: [
      {
        p: 'Under “Reports” the data of the open family tree can be printed or saved as a PDF: the person sheet (all data of a person with relatives, life events, notes, photos and the sources as footnotes – also for all persons at once), the family sheet (a couple with wedding, parents and children), the ancestor list with Kekulé numbers (father of n = 2n, mother = 2n + 1; an ancestor appearing twice refers to the first number) and the descendant list with d’Aboville numbers (1, 1.1, 1.1.2 …). The button “Report” on a person’s page opens the reports with this person as the start.',
      },
      {
        p: 'Above the preview you choose photos, notes, sources, contact data and whether living persons appear only with name and year of birth; the choice is remembered. “Print” opens the print dialog. “Save as PDF” in the desktop app asks for the file name and writes the PDF itself; in a browser choose “Save as PDF” as the printer in the print dialog. Every sheet starts on a new page, and the pages are numbered.',
      },
    ],
    link: { to: '/reports', label: 'Go to reports' },
  },
  {
    id: 'family-trees',
    title: 'Several family trees',
    blocks: [
      {
        p: 'You can keep several separate family trees, e.g. your father’s and your mother’s side. Each person belongs to exactly one family tree; all pages show only the open one. Switch with the “Open family tree” selection at the top of the sidebar.',
      },
      {
        p: 'On the “Family trees” page you create, rename, open or delete family trees. A deleted family tree goes to the recycle bin with all its data; the last one can be deleted, too – the app then offers to create a new one, import a file or get a family tree back from the recycle bin.',
      },
    ],
    link: { to: '/family-trees', label: 'Go to family trees' },
  },
  {
    id: 'import-export',
    title: 'Import/Export',
    blocks: [
      {
        p: 'Export and import apply to the open family tree. The ZIP export contains all data and media – for a backup or for another Cognatio installation. GEDCOM (5.5.1 or 7.0) is the exchange format of other genealogy programs such as Ancestry, MyHeritage or Gramps, optionally with images and documents. The files may be of any size, also above 4 GB; an upper limit can be set under “Settings → Data and backup”.',
      },
      {
        steps: [
          'Choose a file (ZIP of this app or GEDCOM).',
          'Choose the target: the open or a new family tree. For GEDCOM files the app suggests a new family tree.',
          'The preview shows what will change. For the open family tree, choose how to proceed.',
          '“Run import”.',
        ],
      },
      {
        list: [
          'Merge – newer wins: new persons are added; where data differs, the newer version wins.',
          'Merge – decide manually: as above, but you decide for each person where data differs.',
          'Overwrite: the open family tree is completely replaced by the file; other family trees remain unchanged.',
        ],
      },
      {
        p: 'When a GEDCOM file is imported again, the app recognises existing persons and does not create them twice. The import history shows earlier imports. If someone would be their own ancestor after the import (a cycle in the parent-child relations), the preview names the persons; the import still runs and you correct the relations by hand afterwards.',
      },
    ],
    link: { to: '/import-export', label: 'Go to Import/Export' },
  },
  {
    id: 'backup',
    title: 'Backup',
    blocks: [
      {
        p: 'The server backs up the database and files automatically, daily by default. The settings show the last backup and warn if it is older than three days.',
      },
      {
        p: 'Under “Settings → Backup”, “Download backup” downloads one file with all family trees, media, the recycle bin and the import history. Single family trees are saved via “Import/Export”. If an upper limit is set under “Size limits”, a larger backup is still saved, but can only be restored after raising the limit.',
      },
      {
        steps: [
          'Choose “Restore backup…” and select the backup file – it is checked first, nothing changes yet.',
          'Check the comparison “Now / In backup”.',
          'Type “DELETE” to confirm and choose “Restore”.',
        ],
      },
      {
        p: 'All current data is replaced by the backup. Before that, the server saves the current state as a file “cognatio_before_restore_…zip” – it can be used to undo the restore. The last three of these files are kept; the server deletes older ones.',
      },
      {
        p: 'Size: export, import, backup and restore read and write files piece by piece – even very large ones (50 GB and more) need hardly any memory. Beforehand the app checks that the drive has enough free space; a restore needs about the space of the backup plus that of the current data, because it first saves the current state completely. “Activity” in the sidebar shows the progress of these operations and of media uploads, also when you have opened another page meanwhile, and lists the finished ones until the app is closed; import and restore can be cancelled there until the data is replaced. Under “Settings → Data and backup → Size limits” an upper limit can be set (none by default). USB sticks with FAT32 take at most 4 GB per file – for large backups choose a drive with exFAT or NTFS.',
      },
    ],
    link: { to: '/settings', label: 'Go to settings' },
  },
  {
    id: 'trash',
    title: 'Recycle bin',
    blocks: [
      {
        p: 'The recycle bin holds deleted persons of the open family tree and deleted family trees; the number in the sidebar shows how many. “Restore” brings them back. “Delete permanently” also removes relations, life events, notes and media and can only be undone with a backup. Below them, “Sources and archives” lists deleted sources and archives; they belong to all family trees, and a source takes its citations along – restoring it puts them back at every fact.',
      },
    ],
    link: { to: '/trash', label: 'Go to recycle bin' },
  },
  {
    id: 'settings',
    title: 'Settings',
    blocks: [
      {
        p: 'The language (which is only changed here), colour scheme and the family tree defaults (view, generations, focus person per family tree) apply to this browser. Backup and system status apply to the whole application.',
      },
      {
        list: [
          'Appearance (the blocks “Font and colours” and “Family tree: appearance”): font and font size, accent colour, line style, width and colour in the family tree, size and corners of the person cards, photo, dates and the black mourning ribbon of deceased persons on the cards and border colours by gender – with a live preview and “Reset to defaults”.',
          'Family tree: behaviour: the view, the number of generations and the focus person with which the family tree opens.',
          'Data and backup: backup and restore (see “Backup”).',
          'AI assistants (MCP): whether and what AI assistants may do (see “AI assistants (MCP)”).',
          'System (always visible): language (also “Same as the operating system”), colour scheme, version and status of server and database, number of persons and media, log level, the log of server and browser with an export for error analysis (it contains no family tree data), the licences and, in the desktop app, the program updates (see “Desktop app”).',
        ],
      },
      {
        p: 'The blocks open and close with a click (“Expand all” / “Collapse all”). The search field above them finds a setting, opens its block and jumps to the field. Appearance, language and the family tree defaults are saved in this browser or app window.',
      },
    ],
    link: { to: '/settings', label: 'Go to settings' },
  },
  {
    id: 'ai-assistants',
    title: 'AI assistants (MCP)',
    blocks: [
      {
        p: 'AI assistants such as Claude (Claude Desktop, Claude Code) and other programs that speak the Model Context Protocol (MCP) can work with your family trees: look persons up, answer questions such as “Which ancestors came from Pomerania?”, point out gaps and – if you allow it – enter what you dictate or what a scanned church book entry says.',
      },
      {
        p: 'Switch it on under Settings → “AI assistants (MCP)”. The app then shows the address and a token – the token only once – with a ready command for Claude Code and a configuration block for other programs. Assistants connect to this computer only; what they read goes to the provider of the AI model you use.',
      },
      {
        steps: [
          'Settings → “AI assistants (MCP)”: tick “Allow AI assistants”. Address and token appear – the token only now.',
          'Copy “Command for Claude Code” and run it once in a terminal (claude mcp add --transport http cognatio …). With “--scope user” after “--transport http” it works in every folder.',
          'Start Claude Code: “/mcp” shows “cognatio” as connected, with its tools.',
          'Ask in your own words. For changes tick the level of the area (e.g. “Write” for persons).',
        ],
      },
      {
        p: 'For example, you can ask:',
      },
      {
        list: [
          'Who are the ancestors of Anna Kraft up to the great-grandparents, and which of them came from Pomerania?',
          'Which persons were born between 1850 and 1900 in Leipzig? Are there possible duplicates?',
          'With “write”: “Add a baptism for Anna Kraft on 2 October 1951 in Leipzig.” or “Enter this church book entry with its source.”',
          'With the permissions for files: “Export the family tree as GEDCOM into my Documents folder.” or “Add the scan …\\taufschein.jpg to Anna’s baptism.”',
        ],
      },
      {
        list: [
          'Permissions per area: off, read, write (create, change, move into the recycle bin – can be undone in the app) and delete (cannot be undone, e.g. restoring a backup). After switching on, every area is “read”; raising an area to write or delete asks first.',
          'Family trees: an assistant sees only the ticked family trees; new family trees are visible.',
          'Files never travel through MCP: an assistant names a file on this computer (in your home, data or backup folder), e.g. a scan to add, a file to import or a folder for an export.',
          'Every change of an assistant appears under “Activity”; the log has the filter “Only AI assistants (MCP)”.',
          'Lost the token? “New token” replaces it and the old one stops working. Switching off makes the token invalid at once.',
          'The address contains the port of the app, which stays the same between starts. If the desktop app had to take another one, the section says so – the assistant then needs the new address.',
          'An assistant can never change the settings for AI assistants itself.',
        ],
      },
      {
        faq: [
          { q: 'The assistant gets “404” or “MCP is switched off”.', a: 'Tick “Allow AI assistants” in the settings.' },
          {
            q: 'The assistant gets “401” or “token missing or wrong”.',
            a: 'The token was replaced or MCP was switched off in between. Create a new token and add the server again (“claude mcp remove cognatio”, then the new command).',
          },
          {
            q: 'A tool is missing or answers “NOT_ALLOWED”.',
            a: 'The permission of its area is too low – raise it in the settings; in Claude Code “/mcp” lists the tools anew.',
          },
          {
            q: 'The assistant cannot connect at all.',
            a: 'Cognatio must be running. If the settings say the port changed, add the server again with the new address.',
          },
        ],
      },
    ],
    link: { to: '/settings', label: 'Go to settings' },
  },
  {
    id: 'desktop-app',
    title: 'Desktop app (Windows, Linux)',
    blocks: [
      {
        p: 'The desktop app runs Cognatio in a window of its own – without a browser, Node or a database to install. It starts its own database in the background and stops it when you close the window or choose “Quit” at the end of the sidebar. Only one instance runs at a time.',
      },
      {
        list: [
          'Windows: install with the setup file (per user, no administrator rights needed), or unpack the portable ZIP, which keeps all data in a folder “data” next to the program.',
          'Linux: the AppImage is a single file – make it executable and start it, it adds itself to the application menu. The Debian package is installed with “sudo apt install ./Cognatio-….deb”. If it was installed with “dpkg -i”, “sudo apt --fix-broken install” adds the missing libraries and finishes the set-up – otherwise Cognatio does not start.',
          'Your data is in %APPDATA%\\Cognatio on Windows and in ~/.config/Cognatio on Linux, separate from the program: updating or uninstalling never deletes it. The Windows uninstaller asks whether the data should be deleted too – download a backup first.',
          'Make a backup now and then (Settings → Backup) and keep it somewhere else. The app also saves its database automatically before every update and once a day.',
        ],
      },
      {
        p: 'Under Settings → System → Program updates, Cognatio looks for a new version about once a day (the switch is there, “Check now” looks at once). Only the request for the version file is sent. A new version is downloaded in the background and installed when you restart; the database is saved before. “Also test versions (beta)” offers versions before their release; going back to released versions never installs an older one. The portable ZIP and the Debian package are not updated by the app – install the new version yourself.',
      },
    ],
    link: { to: '/settings', label: 'Go to settings' },
  },
  {
    id: 'versions',
    title: 'Version history',
    blocks: [{ p: 'What changed in which version, newest first. Click a feature to jump to its help chapter.' }],
  },
  {
    id: 'faq',
    title: 'Frequently asked questions',
    blocks: [
      {
        faq: [
          { q: 'I deleted a person by mistake.', a: 'Open the recycle bin and choose “Restore” for the person.' },
          { q: 'I only know a date approximately.', a: 'Enter it as far as you know it, e.g. “about 1880”, “before 1900” or “1880-1885”.' },
          {
            q: 'How do I bring over my family tree from Ancestry, MyHeritage or another program?',
            a: 'Export it there as a GEDCOM file (.ged) and import it under “Import/Export” as a new family tree.',
          },
          {
            q: 'A person exists twice.',
            a: 'Add the missing details and relations to one of them and delete the other.',
          },
          {
            q: 'Can I use the app without a mouse?',
            a: 'Yes: Tab and Shift+Tab move between elements, Enter or Space activates them, Escape closes dialogs. The first Tab shows “Skip to content”.',
          },
          {
            q: 'Where is my data stored?',
            a: 'On your own computer. In the desktop app in the folder %APPDATA%\\Cognatio (Windows) or ~/.config/Cognatio (Linux), in the portable variant in the folder “data” next to the program; when you run the server yourself, in its database and upload folder. Only language, colour scheme and view settings are kept in the browser or app window.',
          },
          {
            q: 'How do I move my data to another computer?',
            a: 'Under Settings → Backup choose “Download backup”, copy the file to the other computer, install Cognatio there and choose “Restore backup…”. A single family tree can be moved with the ZIP export and import under “Import/Export”.',
          },
          {
            q: 'How do I update the app?',
            a: 'The desktop app looks for updates by itself (Settings → System → Program updates) and installs them when you restart. The portable ZIP and the Debian package are updated by installing the new version; your data stays.',
          },
        ],
      },
    ],
  },
];

export default help;
