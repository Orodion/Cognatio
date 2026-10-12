import type { ReleaseNotes } from '../releases';

const notes: ReleaseNotes = {
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
