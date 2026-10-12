import type { HelpSection } from '../types';

const help: HelpSection[] = [
  {
    id: 'getting-started',
    title: 'Erste Schritte',
    blocks: [
      {
        p: 'Mit Cognatio verwaltest du deinen Familienstammbaum: Personen, ihre Beziehungen, Lebensläufe, Fotos und Dokumente. Links wählst du den Bereich, oben suchst du Personen. Der ?-Knopf oben rechts öffnet die Hilfe zur Seite, auf der du gerade bist.',
      },
      {
        steps: [
          'Unter „Personen“ auf „Neue Person“ klicken, mindestens den Vornamen eingeben und speichern.',
          'Auf der Seite der Person im Reiter „Beziehungen“ Eltern, Kinder, Partner oder Geschwister hinzufügen – eine vorhandene Person auswählen oder direkt neu anlegen.',
          'Unter „Stammbaum“ das Ergebnis ansehen. Mit einer Fokusperson zeigt der Baum die Familie von ihr aus.',
        ],
      },
      {
        p: 'Die Startseite zeigt die Zahl der Personen und die Geschlechterverteilung, Schnellzugriffe auf die wichtigsten Bereiche, die zuletzt hinzugefügten Personen und ein paar Tipps. Die Hilfe hat über den Kapiteln ein eigenes Suchfeld.',
      },
      {
        p: 'Beispiel-Stammbaum: Beim ersten Start legt die Desktop-App den Stammbaum „Familie Kraft (Demo)“ an – zehn erfundene Personen in vier Generationen mit Beziehungen, Lebensereignissen, Notizen und Fotos, damit du jeden Bereich gleich ausprobieren kannst. Um mit eigenen Daten zu beginnen, legst du unter „Stammbäume“ einen neuen Stammbaum an und löschst das Beispiel (es landet im Papierkorb und kommt nicht wieder). Die Datei Cognatio-Demo-Familie-Kraft.zip liegt im Programmordner (Ordner „demo“ in „resources“) und im Ordner „demo“ des Projekts; unter Import/Export kannst du sie als neuen Stammbaum erneut importieren.',
      },
    ],
    link: { to: '/persons', label: 'Zu den Personen' },
  },
  {
    id: 'persons',
    title: 'Personen',
    blocks: [
      {
        p: 'Pflicht ist nur der Vorname. Ist er unbekannt, setze den Haken „Vorname unbekannt“ – die App zeigt dann „(Vorname unbekannt)“. Daten gibst du so ein, wie du sie kennst: 04.01.1880 (exakt), 01.1880 (Monat), 1880 (Jahr), „um 1880“, „vor 1880“, „nach 1880“ oder den Zeitraum „1880-1885“. Die Genauigkeit erkennt die App selbst.',
      },
      {
        p: 'Beim Anlegen weist die App auf schon vorhandene Personen mit ähnlichem Namen und gleichem Geburtsjahr hin – so entstehen keine Doppelten.',
      },
      {
        list: [
          'Übersicht: persönliche Daten, Kontakt und weitere Angaben; „Bearbeiten“ ändert sie.',
          'Lebenslauf: Ereignisse wie Geburt, Taufe, Hochzeit oder Umzug mit Datum und Ort. Ein Ereignis kann mit Dateien verknüpft werden – auch mit Dateien anderer Personen, z. B. einem Gruppenfoto. Die Ereignisse lassen sich von den ältesten zu den neuesten oder umgekehrt sortieren und als Zeitleiste oder als Tabelle anzeigen; die Auswahl wird gemerkt.',
          'Beziehungen: siehe Abschnitt „Beziehungen“.',
          'Notizen: freie Texte, z. B. Erzählungen oder Quellen, je bis zu 10.000 Zeichen.',
          'Medien: Fotos und Dokumente hochladen (bis 50 MB je Datei); ein Bild lässt sich als Profilbild festlegen. Mit dem Download-Symbol speicherst du eine Datei unter ihrem ursprünglichen Namen.',
          'Medien lassen sich als Kacheln oder als Liste anzeigen (Schaltflächen über den Dateien).',
          'Filter: Das Feld rechts neben den Reitern (außer „Übersicht“) filtert die Einträge des gerade offenen Reiters – Lebenslauf, Beziehungen, Notizen oder Medien. Groß- und Kleinschreibung sowie Akzente spielen keine Rolle, bei mehreren Wörtern müssen alle vorkommen, und die Treffer werden markiert. Gesucht wird in allen Texten, z. B. Titel, Kategorie, Datum, Ort, Beschreibung und Dateinamen; „Geburt“ findet also auch „Geburtstag“. Bei den Beziehungen zeigt auch die Grafik nur die übrigen Personen. Der Text bleibt beim Wechsel des Reiters erhalten; mit Esc oder dem X wird er geleert.',
        ],
      },
      { p: '„Löschen“ legt die Person in den Papierkorb – dort lässt sie sich wiederherstellen.' },
    ],
    link: { to: '/persons', label: 'Zu den Personen' },
  },
  {
    id: 'relations',
    title: 'Beziehungen',
    blocks: [
      {
        p: 'Beziehungen legst du auf der Seite einer Person im Reiter „Beziehungen“ an oder schon beim Anlegen der Person. Die Beziehungsart beschreibt die ausgewählte Person aus Sicht der aktuellen: Bist du bei Anna und wählst Max mit „Vater“, dann ist Max Annas Vater. Die Gegenrichtung – Anna ist Max’ Kind – zeigt die App automatisch.',
      },
      {
        list: [
          'Arten: Mutter, Vater, Kind, Geschwister, Ehemann, Ehefrau, Lebenspartner, Partner, Sonstige.',
          'Bezeichnung (optional), z. B. „Adoptivkind“ oder „Stiefvater“.',
          'Zeitraum von – bis, z. B. für eine Ehe; bei einem Kind wird das Geburtsdatum als Beginn vorgeschlagen.',
          'Gibt es die Person noch nicht, wähle „Neue Person“ und lege sie direkt im Dialog an.',
          'Grafik: Neben der Liste (auf schmalen Bildschirmen darüber) werden die Beziehungen der Person als Diagramm gezeichnet – Eltern oben, Partner daneben, Kinder darunter. Ein Klick auf eine Person öffnet sie; mit der Schaltfläche „Grafik“ lässt sie sich aus- und einblenden, die Auswahl wird gemerkt.',
        ],
      },
      {
        p: 'Manche Beziehungen werden automatisch ergänzt: Wird ein Elternteil mit einem Kind verknüpft, wird auch dessen Partner Elternteil des Kindes (solange das Kind weniger als zwei Eltern hat; die Beziehung beginnt mit der Geburt des Kindes, wenn sie genau bekannt ist), und die übrigen Kinder des Elternteils werden Geschwister des Kindes. Mit der Löschen-Schaltfläche neben einer Beziehung wird nur die Beziehung entfernt – die Personen bleiben.',
      },
    ],
  },
  {
    id: 'tree',
    title: 'Stammbaum-Ansicht',
    blocks: [
      {
        list: [
          'Stammbaum: alle Familien des Stammbaums.',
          'Vorfahrentafel: Eltern, Großeltern usw. der Fokusperson.',
          'Nachfahrentafel: Kinder, Enkel usw. der Fokusperson.',
          'Verwandtschaftsnetzwerk: alle Verbindungen als Netz.',
        ],
      },
      {
        p: 'Die Fokusperson legt fest, von wem aus der Baum gezeichnet wird, „Generationen“ begrenzt die Tiefe. Vergrößern und verkleinern kannst du mit dem Mausrad oder der Zoom-Leiste; ein Klick auf eine Person öffnet ihre Seite. Die Rahmenfarbe zeigt das Geschlecht. Sehr große Bäume (ab 400 Personen) werden nicht automatisch gezeichnet – wähle dann eine Fokusperson und weniger Generationen.',
      },
      {
        p: '„Exportieren“ speichert den Baum als PNG oder SVG oder druckt ihn (auch als PDF), wahlweise nur den sichtbaren Ausschnitt. Ansicht, Generationen und Fokusperson merkt sich die App; die Standardwerte stellst du unter „Einstellungen“ ein. Auf der Seite einer Person öffnet „Stammbaum anzeigen“ den Baum mit ihr als Fokusperson.',
      },
    ],
    link: { to: '/tree', label: 'Zum Stammbaum' },
  },
  {
    id: 'search',
    title: 'Suche',
    blocks: [
      {
        p: 'Das Suchfeld oben durchsucht den geöffneten Stammbaum: Namen – auch ähnliche Schreibweisen, „Meier“ findet also „Mayer“ und „Maier“ –, Personendaten wie Orte und Berufe, den Lebenslauf und die Notizen. Bei jedem Treffer steht, worüber er gefunden wurde.',
      },
    ],
  },
  {
    id: 'statistics',
    title: 'Statistiken',
    blocks: [
      {
        p: 'Die Statistiken werten den geöffneten Stammbaum aus (ohne Papierkorb): Kennzahlen wie Anzahl, Geschlechter und durchschnittliche Lebensdauer, die Altersverteilung, die häufigsten Nachnamen, die häufigsten Geburtsorte und eine Übersicht der Generationen.',
      },
    ],
    link: { to: '/statistics', label: 'Zu den Statistiken' },
  },
  {
    id: 'family-trees',
    title: 'Mehrere Stammbäume',
    blocks: [
      {
        p: 'Du kannst mehrere Stammbäume getrennt voneinander führen, z. B. die Familie väterlicher- und mütterlicherseits. Jede Person gehört zu genau einem Stammbaum; alle Seiten zeigen nur den geöffneten. Gewechselt wird über die Auswahl „Geöffneter Stammbaum“ oben in der Seitenleiste.',
      },
      {
        p: 'Auf der Seite „Stammbäume“ legst du neue an, benennst sie um, öffnest oder löschst sie. Ein gelöschter Stammbaum kommt mit allen Daten in den Papierkorb; auch der letzte lässt sich löschen – die App bietet dann an, einen neuen anzulegen, eine Datei zu importieren oder einen Stammbaum aus dem Papierkorb zurückzuholen.',
      },
    ],
    link: { to: '/family-trees', label: 'Zu den Stammbäumen' },
  },
  {
    id: 'import-export',
    title: 'Import/Export',
    blocks: [
      {
        p: 'Export und Import gelten für den geöffneten Stammbaum. Der ZIP-Export enthält alle Daten und Medien – zum Sichern oder für eine andere Cognatio-Installation. GEDCOM (5.5.1 oder 7.0) ist das Austauschformat anderer Genealogie-Programme wie Ancestry, MyHeritage oder Gramps, auf Wunsch mit Bildern und Dokumenten. Eine Datei darf standardmäßig bis zu 2 GB groß sein (änderbar unter „Einstellungen → Daten und Backup“); sind die Medien eines Stammbaums größer, exportierst du ohne Medien.',
      },
      {
        steps: [
          'Datei auswählen (ZIP dieser App oder GEDCOM).',
          'Ziel wählen: den geöffneten oder einen neuen Stammbaum. GEDCOM-Dateien schlägt die App als neuen Stammbaum vor.',
          'Die Vorschau zeigt, was sich ändert. Beim geöffneten Stammbaum das Vorgehen wählen.',
          '„Import ausführen“.',
        ],
      },
      {
        list: [
          'Zusammenführen – neuere gewinnen: neue Personen kommen dazu, bei Abweichungen gilt der neuere Stand.',
          'Zusammenführen – manuell entscheiden: wie oben, bei Abweichungen entscheidest du je Person.',
          'Überschreiben: der geöffnete Stammbaum wird vollständig durch die Datei ersetzt; andere Stammbäume bleiben unverändert.',
        ],
      },
      {
        p: 'Wird eine GEDCOM-Datei erneut eingelesen, erkennt die App vorhandene Personen wieder und legt sie nicht doppelt an. Die Import-Historie zeigt frühere Importe.',
      },
    ],
    link: { to: '/import-export', label: 'Zu Import/Export' },
  },
  {
    id: 'backup',
    title: 'Datensicherung',
    blocks: [
      {
        p: 'Der Server sichert Datenbank und Dateien automatisch, standardmäßig täglich. Die Einstellungen zeigen die letzte Sicherung und warnen, wenn sie älter als drei Tage ist.',
      },
      {
        p: 'Unter „Einstellungen → Datensicherung“ lädt „Backup herunterladen“ eine Datei mit allen Stammbäumen, Medien, dem Papierkorb und der Import-Historie herunter. Einzelne Stammbäume sicherst du über „Import/Export“. Ein Backup über der Größengrenze wird zwar gespeichert, lässt sich mit dieser App aber nicht wiederherstellen – sichere dann zusätzlich einzelne Stammbäume über „Import/Export“.',
      },
      {
        steps: [
          '„Backup wiederherstellen…“ wählen und die Sicherungsdatei auswählen – sie wird zuerst geprüft, dabei ändert sich nichts.',
          'Die Gegenüberstellung „Jetzt / In der Sicherung“ kontrollieren.',
          'Zum Bestätigen „LÖSCHEN“ eintippen und „Wiederherstellen“ wählen.',
        ],
      },
      {
        p: 'Alle aktuellen Daten werden dabei durch die Sicherung ersetzt. Vorher legt der Server den aktuellen Stand als Datei „cognatio_before_restore_…zip“ ab – mit ihr lässt sich die Wiederherstellung rückgängig machen. Die letzten drei dieser Dateien bleiben erhalten, ältere löscht der Server.',
      },
      {
        p: 'Größengrenze: Export, Import, Backup und Wiederherstellung verarbeiten eine Datei im Arbeitsspeicher, standardmäßig bis zu 2 GB. Unter „Einstellungen → Daten und Backup → Größengrenzen“ kann ein Rechner mit viel Arbeitsspeicher größere Dateien erlauben. Ab 4 GB muss mindestens das Doppelte der Dateigröße als Arbeitsspeicher (RAM) frei sein, sonst kann die App sehr langsam werden oder abstürzen; die Einstellungen warnen davor. Ein zu großer Export wird abgelehnt, ein zu großes Backup wird mit einer Warnung erstellt.',
      },
    ],
    link: { to: '/settings', label: 'Zu den Einstellungen' },
  },
  {
    id: 'trash',
    title: 'Papierkorb',
    blocks: [
      {
        p: 'Im Papierkorb liegen gelöschte Personen des geöffneten Stammbaums und gelöschte Stammbäume; die Zahl in der Seitenleiste zeigt, wie viele es sind. „Wiederherstellen“ holt sie zurück. „Endgültig löschen“ entfernt auch Beziehungen, Lebenslauf, Notizen und Medien und lässt sich nur über eine Datensicherung rückgängig machen.',
      },
    ],
    link: { to: '/trash', label: 'Zum Papierkorb' },
  },
  {
    id: 'settings',
    title: 'Einstellungen',
    blocks: [
      {
        p: 'Die Sprache (die nur hier umgestellt wird), das Farbschema und die Standardwerte des Stammbaums (Ansicht, Generationen, Fokusperson je Stammbaum) gelten für diesen Browser. Datensicherung und Systemstatus gelten für die ganze Anwendung.',
      },
      {
        list: [
          'Aussehen (die Blöcke „Schrift und Farben“ und „Stammbaum: Darstellung“): Schrift und Schriftgröße, Akzentfarbe, Linienart, -breite und -farbe im Stammbaum, Größe und Ecken der Personenkarten, Foto, Daten und die schwarze Trauerschleife bei Verstorbenen auf den Karten sowie Rahmenfarben nach Geschlecht – mit Live-Vorschau und „Auf Standard zurücksetzen“.',
          'Stammbaum: Verhalten: Ansicht, Zahl der Generationen und Fokusperson, mit denen sich der Stammbaum öffnet.',
          'Daten und Backup: Sichern und Wiederherstellen (siehe „Datensicherung“).',
          'System (immer sichtbar): Sprache (auch „Wie das Betriebssystem“), Farbschema, Version und Status von Server und Datenbank, Zahl der Personen und Medien, Log-Level, das Protokoll von Server und Browser mit einem Export für die Fehleranalyse (er enthält keine Stammbaumdaten), die Lizenzen und in der Desktop-App die Programm-Updates (siehe „Desktop-App“).',
        ],
      },
      {
        p: 'Die Blöcke lassen sich per Klick öffnen und schließen („Alle aufklappen“ / „Alle zuklappen“). Das Suchfeld darüber findet eine Einstellung, öffnet ihren Block und springt zum Feld. Aussehen, Sprache und die Standardwerte des Stammbaums werden in diesem Browser bzw. App-Fenster gespeichert.',
      },
    ],
    link: { to: '/settings', label: 'Zu den Einstellungen' },
  },
  {
    id: 'desktop-app',
    title: 'Desktop-App (Windows, Linux)',
    blocks: [
      {
        p: 'Die Desktop-App zeigt Cognatio in einem eigenen Fenster – ohne Browser, Node oder eine zu installierende Datenbank. Sie startet ihre eigene Datenbank im Hintergrund und beendet sie, wenn du das Fenster schließt oder am Ende der Seitenleiste „Beenden“ wählst. Es läuft immer nur eine Instanz.',
      },
      {
        list: [
          'Windows: mit der Setup-Datei installieren (pro Benutzer, ohne Administratorrechte) oder die portable ZIP-Datei entpacken, die alle Daten in einem Ordner „data“ neben dem Programm ablegt.',
          'Linux: Das AppImage ist eine einzelne Datei – ausführbar machen und starten, es trägt sich selbst ins Anwendungsmenü ein. Das Debian-Paket wird mit „sudo apt install ./Cognatio-….deb“ installiert. Wurde es mit „dpkg -i“ installiert, holt „sudo apt --fix-broken install“ die fehlenden Bibliotheken nach und schließt die Einrichtung ab – sonst startet Cognatio nicht.',
          'Deine Daten liegen unter Windows in %APPDATA%\\Cognatio und unter Linux in ~/.config/Cognatio, getrennt vom Programm: Ein Update oder eine Deinstallation löscht sie nie. Das Deinstallationsprogramm unter Windows fragt, ob die Daten auch gelöscht werden sollen – lade vorher ein Backup herunter.',
          'Mache ab und zu ein Backup (Einstellungen → Datensicherung) und bewahre es an einem anderen Ort auf. Die App sichert ihre Datenbank außerdem automatisch vor jedem Update und einmal täglich.',
        ],
      },
      {
        p: 'Unter Einstellungen → System → Programm-Updates sucht Cognatio etwa einmal am Tag nach einer neuen Version (dort steht auch der Schalter, „Jetzt prüfen“ sucht sofort). Gesendet wird nur die Anfrage nach der Versionsdatei. Eine neue Version wird im Hintergrund geladen und beim Neustart installiert; vorher wird die Datenbank gesichert. „Auch Testversionen (Beta)“ bietet Versionen vor ihrer Veröffentlichung an; der Wechsel zurück zu veröffentlichten Versionen installiert nie eine ältere. Die portable ZIP-Datei und das Debian-Paket werden von der App nicht aktualisiert – installiere die neue Version selbst.',
      },
    ],
    link: { to: '/settings', label: 'Zu den Einstellungen' },
  },
  {
    id: 'versions',
    title: 'Versionsverlauf',
    blocks: [{ p: 'Was sich in welcher Version geändert hat, die neueste zuerst. Ein Klick auf eine Funktion springt zum passenden Hilfekapitel.' }],
  },
  {
    id: 'faq',
    title: 'Häufige Fragen',
    blocks: [
      {
        faq: [
          { q: 'Ich habe eine Person versehentlich gelöscht.', a: 'Öffne den Papierkorb und wähle bei der Person „Wiederherstellen“.' },
          { q: 'Ich kenne ein Datum nur ungefähr.', a: 'Gib es so ein, wie du es weißt, z. B. „um 1880“, „vor 1900“ oder „1880-1885“.' },
          {
            q: 'Wie übernehme ich meinen Stammbaum aus Ancestry, MyHeritage oder einem anderen Programm?',
            a: 'Exportiere ihn dort als GEDCOM-Datei (.ged) und lies sie unter „Import/Export“ als neuen Stammbaum ein.',
          },
          {
            q: 'Eine Person ist doppelt vorhanden.',
            a: 'Ergänze fehlende Angaben und Beziehungen bei einer der beiden und lösche die andere.',
          },
          {
            q: 'Kann ich die App ohne Maus bedienen?',
            a: 'Ja: Tab und Umschalt+Tab wechseln zwischen den Elementen, Eingabe bzw. Leertaste lösen sie aus, Escape schließt Dialoge. Beim ersten Tab erscheint „Zum Inhalt springen“.',
          },
          {
            q: 'Wo werden meine Daten gespeichert?',
            a: 'Auf deinem eigenen Rechner. In der Desktop-App im Ordner %APPDATA%\\Cognatio (Windows) bzw. ~/.config/Cognatio (Linux), in der portablen Variante im Ordner „data“ neben dem Programm; wenn du den Server selbst betreibst, in dessen Datenbank und Upload-Ordner. Nur Sprache, Farbschema und Ansichtseinstellungen liegen im Browser bzw. App-Fenster.',
          },
          {
            q: 'Wie ziehe ich mit meinen Daten auf einen anderen Rechner um?',
            a: 'Wähle unter Einstellungen → Datensicherung „Backup herunterladen“, kopiere die Datei auf den anderen Rechner, installiere dort Cognatio und wähle „Backup wiederherstellen…“. Ein einzelner Stammbaum lässt sich mit dem ZIP-Export und -Import unter „Import/Export“ übertragen.',
          },
          {
            q: 'Wie aktualisiere ich die App?',
            a: 'Die Desktop-App sucht selbst nach Updates (Einstellungen → System → Programm-Updates) und installiert sie beim Neustart. Die portable ZIP-Datei und das Debian-Paket werden aktualisiert, indem du die neue Version installierst; deine Daten bleiben erhalten.',
          },
        ],
      },
    ],
  },
];

export default help;
