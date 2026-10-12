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
        p: 'The start page shows the number of persons and the gender distribution, quick access to the main areas, the most recently added persons and a few tips. The help page has its own search field above the chapters.',
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
        p: 'Only the first name is required. If it is unknown, tick “First name unknown” – the app then shows “(first name unknown)”. Enter dates as far as you know them: 04.01.1880 (exact), 01.1880 (month), 1880 (year), “about 1880”, “before 1880”, “after 1880” or the range “1880-1885”. The app detects the precision itself.',
      },
      {
        p: 'When you create a person, the app points out existing persons with a similar name and the same year of birth – so no duplicates are created.',
      },
      {
        list: [
          'Overview: personal data, contact and further details; “Edit” changes them.',
          'Life events: events such as birth, baptism, wedding or moving house, with date and place. An event can be linked with files – including files of other persons, e.g. a group photo. The events can be listed from oldest to newest or the other way round, and shown as a timeline or as a table; the choice is remembered.',
          'Relations: see the section “Relations”.',
          'Notes: free text, e.g. stories or sources, up to 10,000 characters each.',
          'Media: upload photos and documents (up to 50 MB per file); an image can be set as profile picture. The download icon saves a file under its original name.',
          'Media can be shown as tiles or as a list (buttons above the files).',
          'Filter: the field next to the tabs (except “Overview”) filters the entries of the open tab – timeline, relations, notes or media. Case and accents do not matter, with several words all of them have to occur, and the hits are highlighted. All texts are searched, e.g. title, category, date, place, description and file names, so “birth” also finds “birthday”. In the relations the graph shows only the remaining persons as well. The text stays when you switch tabs; Esc or the X clears it.',
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
        p: 'Some relations are added automatically: when a parent and a child are linked, the parent’s partner also becomes a parent of the child (as long as the child has fewer than two parents; the relation starts with the child’s birth if it is known exactly), and the parent’s other children become the child’s siblings. The delete button next to a relation removes only the relation – the persons stay.',
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
    id: 'search',
    title: 'Search',
    blocks: [
      {
        p: 'The search field at the top searches the open family tree: names – including similar spellings, so “Meier” also finds “Mayer” and “Maier” –, personal data such as places and occupations, life events and notes. Each result shows what it was found by.',
      },
    ],
  },
  {
    id: 'statistics',
    title: 'Statistics',
    blocks: [
      {
        p: 'The statistics evaluate the open family tree (without the recycle bin): key figures such as count, genders and average lifespan, the age distribution, the most common surnames, the most common places of birth and an overview of the generations.',
      },
    ],
    link: { to: '/statistics', label: 'Go to statistics' },
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
        p: 'Export and import apply to the open family tree. The ZIP export contains all data and media – for a backup or for another Cognatio installation. GEDCOM (5.5.1 or 7.0) is the exchange format of other genealogy programs such as Ancestry, MyHeritage or Gramps, optionally with images and documents. By default one file may be up to 2 GB (changeable under “Settings → Data and backup”); if the media of a family tree are larger, export without media.',
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
        p: 'When a GEDCOM file is imported again, the app recognises existing persons and does not create them twice. The import history shows earlier imports.',
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
        p: 'Under “Settings → Backup”, “Download backup” downloads one file with all family trees, media, the recycle bin and the import history. Single family trees are saved via “Import/Export”. A backup larger than the size limit is still saved, but cannot be restored with this app – also save single family trees via “Import/Export” then.',
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
        p: 'Size limit: export, import, backup and restore handle a file in memory, by default up to 2 GB. Under “Settings → Data and backup → Size limits” a computer with plenty of memory can allow larger files. Above 4 GB, at least twice the file size must be free as memory (RAM), otherwise the app may become very slow or stop; the settings warn about this. A larger export is refused, a larger backup is created with a warning.',
      },
    ],
    link: { to: '/settings', label: 'Go to settings' },
  },
  {
    id: 'trash',
    title: 'Recycle bin',
    blocks: [
      {
        p: 'The recycle bin holds deleted persons of the open family tree and deleted family trees; the number in the sidebar shows how many. “Restore” brings them back. “Delete permanently” also removes relations, life events, notes and media and can only be undone with a backup.',
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
