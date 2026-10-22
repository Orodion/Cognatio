import type { ReleaseNotes } from '../releases';

const notes: ReleaseNotes = {
  '1.1.0': {
    mcp: {
      title: 'KI-Assistenten (MCP)',
      text: 'KI-Assistenten wie Claude können deine Stammbäume über das Model Context Protocol nachschlagen, durchsuchen und – mit deiner Erlaubnis – ändern. Du legst je Bereich fest, was sie dürfen; jede Änderung erscheint unter „Vorgänge“.',
    },
    reports: {
      title: 'Berichte zum Drucken und als PDF',
      text: 'Personenblatt, Familienblatt, Ahnenliste (Kekulé) und Nachkommenliste (d’Aboville) – gedruckt oder als PDF, in der Desktop-App direkt in eine Datei.',
    },
    checks: {
      title: 'Mögliche Fehler',
      text: 'Eine neue Seite listet, was erlaubt, aber selten richtig ist – ein Mann als Mutter, eine Mutter mit 60, eine Hochzeit nach dem Tod, mögliche Dubletten und mehr – mit Links zu den Personen; was stimmt, lässt sich als richtig markieren. Eine Beziehung, die falsch aussieht, wird erst nach Rückfrage gespeichert.',
    },
    statistics: {
      title: 'Statistik zum Weiterforschen',
      text: 'Jede Zahl der Statistik führt zu den Personen dahinter – ein Klick auf einen Balken öffnet die Personenliste mit genau diesen Personen. Der Umfang lässt sich wählen: Vorfahren oder Nachkommen einer Person, ein Nachname, Geburtsjahre. Die Auswertungen sind auf Reiter verteilt. „Was fehlt noch?“ zeigt den Forschungsstand und führt zu den Lücken; „Ahnen“ zeigt je Generation, wie viele Vorfahren gefunden sind, den Ahnenschwund und die offenen Enden – ab der neuen Hauptperson des Stammbaums. Eine Zeitachse zeigt Geburten, Todesfälle und Hochzeiten je Jahrzehnt; „Lebensdaten im Wandel“ vergleicht Lebensdauer, Heiratsalter und Alter beim ersten Kind über die Jahrhunderte. Dazu Vornamen und Namensmode, die Wanderung der Familie von Ort zu Ort und Rekorde der Verstorbenen. Alles lässt sich als Bericht drucken, als PDF speichern oder als CSV kopieren.',
    },
    places: {
      title: 'Ortsvorschläge',
      text: 'Die Felder für Geburtsort, Sterbeort und den Ort eines Lebensereignisses schlagen die Orte vor, die im Stammbaum schon vorkommen, die häufigsten zuerst.',
    },
    dates: {
      title: 'Ausgeschriebene Daten',
      text: 'Datumsfelder nehmen auch ausgeschriebene Daten in jeder Sprache der App, etwa „2. Oktober 1951“ oder „Mai 1951“, und machen daraus „02.10.1951“ und „05.1951“.',
    },
    anniversaries: {
      title: 'Jahrestage auf der Startseite',
      text: 'Die Startseite zeigt Geburtstage, Todestage und Hochzeitstage der nächsten 30 Tage, mit dem Alter oder den vergangenen Jahren.',
    },
    sources: {
      title: 'Quellen und Belege',
      text: 'Eine Sammlung von Quellen und Archiven für alle Stammbäume: Ein Beleg hält Seite, Datum, Abschrift, Verlässlichkeit und Scans fest und stützt beliebig viele Fakten – Name, Geburt, Tod, Ereignisse und Beziehungen, auch mehrerer Personen. Die Seite einer Quelle zeigt nach Personen, was jeder Beleg stützt; GEDCOM übernimmt die Quellen anderer Programme.',
    },
    files: {
      title: 'Dateien ansehen',
      text: 'Bilder, PDF, Videos, Audio und Textdateien wie TXT, Markdown oder CSV öffnen sich in einem Fenster mit dem Dateinamen als Titel; andere Dateien werden gleich gespeichert. Medien haben keine Größengrenze je Datei mehr, auch lange Videos passen. Eine Datei, die nach ihrem Namen ein Bild oder PDF ist, aber keines ist, wird abgelehnt.',
    },
    activity: {
      title: 'Große Datenmengen und „Vorgänge“',
      text: 'Export, Import, Backup und Wiederherstellung schaffen 50 GB und mehr mit wenig Arbeitsspeicher und prüfen vorher den freien Platz. „Vorgänge“ in der Seitenleiste zeigt den Fortschritt jedes langen Vorgangs; Import und Wiederherstellung lassen sich abbrechen.',
    },
    search: {
      title: 'Kyrillische Namen',
      text: 'Die Suche behandelt kyrillisch geschriebene Namen wie ihre lateinische Schreibweise: „Иванов“ findet auch „Iwanow“ und „Ivanov“.',
    },
    'import-export': {
      title: 'Import in deiner Sprache',
      text: 'Ein GEDCOM-Import schreibt Ereignistitel, Bezeichnungen und ungefähre Daten in der Sprache der Oberfläche. Import und Wiederherstellung warnen, wenn jemand sein eigener Vorfahre wäre, und sehr lange Notizen werden geteilt, statt hängen zu bleiben. Der GEDCOM-Export schreibt Taufen, Berufe und Wohnorte mit den Standard-Tags, die andere Programme erkennen.',
    },
    relations: {
      title: 'Klarere abgeleitete Beziehungen',
      text: 'Der Partner eines Elternteils wird nur dann zweiter Elternteil, wenn der Elternteil genau einen Partner hat, und eine Eltern-Kind-Beziehung wird mit den abgeleiteten Beziehungen ganz oder gar nicht gespeichert. Geschwister, die nur über eine gelöschte Eltern-Kind-Beziehung entstanden sind, wandern mit ihr in den Papierkorb und kommen mit ihr zurück; der GEDCOM-Export lässt Beziehungen im Papierkorb weg.',
    },
    'desktop-app': {
      title: 'PostgreSQL 18',
      text: 'Die Desktop-App nutzt PostgreSQL 18; die Daten der Version 1.0.0 werden beim ersten Start automatisch umgewandelt, der alte Datenbankordner bleibt 30 Tage erhalten.',
    },
    settings: {
      title: 'Seitenleiste in Gruppen',
      text: 'Die Seitenleiste ordnet die Bereiche unter „Erfassen“, „Auswerten“ und „Verwalten“; „Import/Export“ steht jetzt unter „Verwalten“, und „Mögliche Fehler“ zeigt, wie viele offen sind. „Vorgänge“, „Papierkorb“, „Einstellungen“ und „Hilfe“ bleiben unten.',
    },
  },
  '1.0.0': {
    persons: {
      title: 'Personen mit Lebensereignissen und Medien',
      text: 'Personen mit flexiblen Daten (genau, Monat, Jahr, „um 1880“ oder Zeitraum), Lebensereignisse mit Orten, Notizen sowie Fotos und Dokumente.',
    },
    relations: {
      title: 'Beziehungen',
      text: 'Eltern, Kinder, Partner und Geschwister verknüpfen. Die Gegenrichtung entsteht automatisch; Zeiträume und Bezeichnungen wie „Adoptivkind“ sind möglich.',
    },
    tree: {
      title: 'Stammbaum-Ansichten',
      text: 'Stammbaum, Ahnentafel, Nachfahrentafel und Beziehungsnetz mit Zoom, Fokusperson und Export als PNG, SVG oder PDF.',
    },
    search: {
      title: 'Suche',
      text: 'Findet Namen auch bei ähnlicher Schreibweise sowie Orte, Berufe, Lebensereignisse und Notizen.',
    },
    statistics: {
      title: 'Statistik',
      text: 'Kennzahlen, Altersverteilung, häufigste Nachnamen und Geburtsorte sowie eine Übersicht der Generationen.',
    },
    'family-trees': {
      title: 'Mehrere Stammbäume',
      text: 'Getrennte Stammbäume führen, zum Beispiel für beide Seiten der Familie, und zwischen ihnen wechseln.',
    },
    'import-export': {
      title: 'Import und Export',
      text: 'Daten als ZIP (mit Medien) oder als GEDCOM 5.5.1 und 7.0 mit anderen Genealogieprogrammen austauschen; wiederholte Importe erzeugen keine Doubletten.',
    },
    backup: {
      title: 'Datensicherung',
      text: 'Automatische tägliche Sicherungen, Download aller Daten und eine geführte Wiederherstellung, die zuerst den aktuellen Stand sichert.',
    },
    trash: {
      title: 'Papierkorb',
      text: 'Gelöschte Personen und Stammbäume lassen sich wiederherstellen.',
    },
    settings: {
      title: 'Sprachen und Aussehen',
      text: 'Zehn Sprachen (die App startet in der Sprache des Betriebssystems), Farbschemata, Schriften und das Aussehen des Stammbaums.',
    },
    'desktop-app': {
      title: 'Desktop-App für Windows und Linux',
      text: 'Windows-Installer oder portable ZIP-Datei, Linux-AppImage oder Debian-Paket: mit eigener Datenbank, ohne Einrichtung, mit einem Klick gestartet, mit Datensicherung vor jedem Update und automatischen Updates (außer bei der portablen ZIP-Datei und dem Debian-Paket).',
    },
  },
};

export default notes;
