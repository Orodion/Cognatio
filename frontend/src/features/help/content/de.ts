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
        p: 'Die Startseite zeigt die Zahl der Personen und die Geschlechterverteilung, Schnellzugriffe auf die wichtigsten Bereiche, die zuletzt hinzugefügten Personen und ein paar Tipps. Die Hilfe hat über den Kapiteln ein eigenes Suchfeld. Die Karte „Jahrestage“ zeigt Geburtstage, Todestage und Hochzeitstage der nächsten 30 Tage – bei Daten mit Tag, Monat und Jahr; ein Hochzeitstag ist der Beginn einer Beziehung Ehemann/Ehefrau.',
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
        p: 'Pflicht ist nur der Vorname. Ist er unbekannt, setze den Haken „Vorname unbekannt“ – die App zeigt dann „(Vorname unbekannt)“. Daten gibst du so ein, wie du sie kennst: 04.01.1880 (exakt), 01.1880 (Monat), 1880 (Jahr), „um 1880“, „vor 1880“, „nach 1880“ oder den Zeitraum „1880-1885“. Die Genauigkeit erkennt die App selbst. Ein ausgeschriebenes Datum wie „2. Oktober 1880“ wird zu „02.10.1880“.',
      },
      {
        p: 'Beim Anlegen weist die App auf schon vorhandene Personen mit ähnlichem Namen und gleichem Geburtsjahr hin – so entstehen keine Doppelten. Die Ortsfelder – Geburt, Tod und Lebensereignisse – schlagen beim Tippen die Orte vor, die im Stammbaum schon vorkommen; jeder andere Ort lässt sich weiterhin eintragen.',
      },
      {
        list: [
          'Übersicht: persönliche Daten, Kontakt und weitere Angaben; „Bearbeiten“ ändert sie.',
          'Lebenslauf: Ereignisse wie Geburt, Taufe, Hochzeit oder Umzug mit Datum und Ort. Ein Ereignis kann mit Dateien verknüpft werden – auch mit Dateien anderer Personen, z. B. einem Gruppenfoto. Die Ereignisse lassen sich von den ältesten zu den neuesten oder umgekehrt sortieren und als Zeitleiste oder als Tabelle anzeigen; die Auswahl wird gemerkt.',
          'Beziehungen: siehe Abschnitt „Beziehungen“.',
          'Notizen: freie Texte, z. B. Erzählungen oder Forschungsnotizen, je bis zu 10.000 Zeichen.',
          'Medien: Fotos und Dokumente hochladen (auch Videos, ohne Größengrenze je Datei); ein Bild lässt sich als Profilbild festlegen. Mit dem Download-Symbol speicherst du eine Datei unter ihrem ursprünglichen Namen. Ein Klick auf eine Datei zeigt sie in einem eigenen Fenster mit ihrem Namen als Titel – Bilder, PDF, Videos, Audio und Textdateien (z. B. TXT, Markdown, CSV); andere Dateien wie ZIP werden gleich gespeichert.',
          'Medien lassen sich als Kacheln oder als Liste anzeigen (Schaltflächen über den Dateien).',
          'Quellen: die Belege der Person, ihrer Lebensereignisse und ihrer Beziehungen – siehe Abschnitt „Quellen und Belege“.',
          'Filter: Das Feld rechts neben den Reitern (außer „Übersicht“) filtert die Einträge des gerade offenen Reiters – Lebenslauf, Beziehungen, Notizen, Medien oder Quellen. Groß- und Kleinschreibung sowie Akzente spielen keine Rolle, bei mehreren Wörtern müssen alle vorkommen, und die Treffer werden markiert. Gesucht wird in allen Texten, z. B. Titel, Kategorie, Datum, Ort, Beschreibung und Dateinamen; „Geburt“ findet also auch „Geburtstag“. Bei den Beziehungen zeigt auch die Grafik nur die übrigen Personen. Der Text bleibt beim Wechsel des Reiters erhalten; mit Esc oder dem X wird er geleert.',
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
        p: 'Manche Beziehungen werden automatisch ergänzt: Wird ein Elternteil mit einem Kind verknüpft, wird auch dessen Partner Elternteil des Kindes (wenn der Elternteil genau einen Partner hat und das Kind noch keinen zweiten Elternteil; bei mehreren Partnern legst du den zweiten Elternteil selbst an; die Beziehung beginnt mit der Geburt des Kindes, wenn sie genau bekannt ist), und die übrigen Kinder des Elternteils werden Geschwister des Kindes. Mit der Löschen-Schaltfläche neben einer Beziehung wird nur die Beziehung entfernt – die Personen bleiben.',
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
    id: 'sources',
    title: 'Quellen und Belege',
    blocks: [
      {
        p: 'Eine Quelle ist ein Dokument oder Werk, aus dem Angaben stammen – ein Kirchenbuch, ein Standesamtsregister, eine Volkszählung, ein Brief, ein Grabstein, eine Website oder ein Interview. Ein Beleg ist ein Eintrag darin: Seite oder Eintragsnummer, Datum, der Eintrag im Wortlaut, wie verlässlich er ist, und Scans. Ein Beleg kann beliebig viele Fakten stützen, z. B. ein Traueintrag Bräutigam, Braut, deren Eltern, die Trauzeugen, die Hochzeit und die Ehe.',
      },
      {
        p: 'Quellen, Archive und Belege bilden eine Sammlung für alle Stammbäume: Ein Standesamt oder Kirchenbuch wird einmal angelegt, und ein Beleg kann Fakten von Personen in mehreren Stammbäumen stützen. Eine Änderung an einer Quelle gilt überall.',
      },
      {
        list: [
          'Auf der Seite einer Person listet der Reiter „Quellen“ die Belege der Person, ihrer Lebensereignisse und ihrer Beziehungen, nach Fakt gruppiert. „Quelle zitieren“ wählt den Fakt, eine Quelle (oder legt eine an) und einen schon vorhandenen Beleg daraus oder einen neuen. Ein kleines Buch neben Name, Geburt, Tod, einem Ereignis oder einer Beziehung zeigt, wie viele Belege es gibt; ein Klick öffnet den Reiter.',
          '„Quellen“ in der Seitenleiste listet die Quellen, die der offene Stammbaum nutzt, und die nirgends genutzten; „Alle Stammbäume“ zeigt die ganze Sammlung. Die Seite einer Quelle zeigt ihre Felder, Scans und Belege mit den Fakten, die jeder stützt – nach Personen geordnet, mit Lebensjahren; das × an einem Fakt löst die Verknüpfung; „Fakten verknüpfen“ verknüpft einen Beleg nacheinander mit weiteren Personen.',
          'Archive (Standesamt, Kirchenbuchamt, Bibliothek, Website) werden im zweiten Reiter verwaltet und bei jeder Quelle ausgewählt; ein neues lässt sich auch direkt im Formular einer Quelle anlegen.',
          'Die Verlässlichkeit folgt den Stufen von GEDCOM: Primärquelle (der Originaleintrag), Sekundärquelle (später aufgeschrieben), fraglich (z. B. mündliche Überlieferung), unzuverlässig oder geschätzt.',
          'Scans gehören zur ganzen Quelle (Titelblatt, Grabstein) oder zu einem Beleg (die einzelne Seite).',
          'Die Suche oben findet auch Quellen – nach Titel, Autor, Archiv, Signatur und den Abschriften ihrer Belege; sie stehen über den gefundenen Personen. Die Statistik zeigt, wie viele Personen einen Beleg haben und welche Quellen am häufigsten zitiert sind.',
          'GEDCOM: Der Export schreibt Archive und Quellen als REPO- und SOUR-Datensätze und jeden Beleg an die Fakten, die er stützt (Seite, Datum, Abschrift, Verlässlichkeit, Scans im GEDZIP); der Import übernimmt auch die Quellen anderer Programme – auch unter Namen, Ereignissen und Familien – und fasst gleiche Belege wieder zu einem zusammen.',
        ],
      },
      {
        p: 'Wer eine Quelle löscht, verschiebt sie samt ihren Belegen in den Papierkorb: Sie verschwinden von allen Fakten und kehren beim Wiederherstellen zurück. Ein Archiv im Papierkorb lässt seine Quellen bis zur Wiederherstellung ohne Archiv. Wird eine Person, ein Ereignis, eine Beziehung oder ein Stammbaum endgültig gelöscht, fallen nur deren Verknüpfungen weg; die Quellen bleiben.',
      },
      {
        p: 'Der Export eines Stammbaums enthält die Quellen, Archive und Belege, die seine Personen nutzen, mit ihren Scans; ein Import nutzt eine schon vorhandene Quelle, statt sie zu kopieren. Die Abschrift eines Belegs kann Personen eines anderen Stammbaums nennen – sie geht mit dem Export mit. Eine Exportdatei mit Quellen kann nur diese oder eine neuere Version von Cognatio lesen.',
      },
    ],
    link: { to: '/sources', label: 'Zu den Quellen' },
  },
  {
    id: 'search',
    title: 'Suche',
    blocks: [
      {
        p: 'Das Suchfeld oben durchsucht den geöffneten Stammbaum: Namen – auch ähnliche Schreibweisen, „Meier“ findet also „Mayer“ und „Maier“ –, Personendaten wie Orte und Berufe, den Lebenslauf und die Notizen. Bei jedem Treffer steht, worüber er gefunden wurde. Kyrillisch geschriebene Namen werden dabei wie ihre lateinische Schreibweise behandelt: „Иванов“ findet auch „Iwanow“ und „Ivanov“. Außerdem findet sie Quellen; sie stehen über den gefundenen Personen (siehe „Quellen und Belege“).',
      },
    ],
  },
  {
    id: 'statistics',
    title: 'Statistiken',
    blocks: [
      {
        p: 'Die Statistiken werten den geöffneten Stammbaum aus (ohne Papierkorb), verteilt auf Reiter: „Überblick“ mit Kennzahlen wie Anzahl, Geschlechter und durchschnittlicher Lebensdauer, „Leben“ mit der Altersverteilung, „Namen & Orte“ mit den häufigsten Nachnamen und Geburtsorten, „Ahnen“ mit der Übersicht der Generationen und „Quellen“ mit den genutzten Quellen, den Personen mit mindestens einem Beleg und den meistzitierten Quellen.',
      },
      {
        p: 'Jede Zahl, die Personen zählt, ist ein Link: Ein Klick auf eine Kennzahl, einen Balken oder eine Generation öffnet die Personenliste mit genau diesen Personen. Über der Liste steht, aus welcher Auswahl sie stammen; das × zeigt wieder alle Personen, „Zur Statistik“ führt zurück. Eine Suche oben sucht dann nur unter diesen Personen.',
      },
      {
        p: 'Über den Reitern wird der Umfang gewählt: der ganze Stammbaum, die Vorfahren oder die Nachkommen einer Person (jeweils mit ihr selbst) oder alle Personen eines Nachnamens (auch als Geburtsname) – auf Wunsch nur die in bestimmten Jahren Geborenen. Alle Zahlen und Listen richten sich danach, nur die Quellen gelten immer für den ganzen Stammbaum. Der zuletzt gewählte Umfang bleibt je Stammbaum erhalten.',
      },
      {
        p: '„Was fehlt noch?“ im Überblick zeigt für Geburtsdatum und -ort, Sterbedatum und -ort (bei Verstorbenen), Vater, Mutter, Partner (bei Verstorbenen ab 18), Foto und Quelle, bei wie vielen Personen die Angabe erfasst ist; der Forschungsstand ist das Mittel dieser Anteile. Ein Klick auf die fehlenden öffnet die Liste der Personen, bei denen noch etwas zu tun ist.',
      },
      {
        p: '„Ahnen“ zeigt je Generation, wie viele der möglichen Vorfahren (2 Eltern, 4 Großeltern, 8 Urgroßeltern …) gefunden sind, wer mehrfach vorkommt (Ahnenschwund) und die offenen Enden – Vorfahren, bei denen Vater oder Mutter noch fehlt. Die Auswertung beginnt bei der Hauptperson des Stammbaums; sie wird auf der Seite einer Person mit „Hauptperson“ festgelegt, und auch Berichte und Stammbaum beginnen bei ihr.',
      },
      {
        p: 'Die Zeitachse im Überblick zeigt Geburten, Todesfälle oder Hochzeiten je Jahrzehnt; leere Jahrzehnte bleiben stehen, damit Lücken in der Forschung auffallen. Hochzeiten sind der Beginn einer Ehe (Beziehung Ehemann/Ehefrau) oder das Lebensereignis „Hochzeit“, je Paar und Jahr einmal; Lebenspartner und Partner zählen nur mit diesem Ereignis.',
      },
      {
        p: '„Lebensdaten im Wandel“ unter „Leben“ zeigt je Jahrhundert der Geburt, getrennt nach Männern und Frauen, die durchschnittliche Lebensdauer – auch nur derer, die 15 wurden –, das Alter bei der ersten Heirat und bei der Geburt des ersten Kindes; in Klammern steht, auf wie vielen Personen der Wert beruht, ein Mittel aus weniger als 5 Personen wird nicht gezeigt. Dazu die Zahl der Kinder je Paar und der Altersabstand der Partner.',
      },
      {
        p: '„Namen & Orte“ zeigt auch die häufigsten Vornamen von Männern und Frauen – jeder Vorname zählt, „Johann Georg“ also für Johann und für Georg – und die Namensmode je Jahrhundert. „Wanderung“ zeigt, wer am Geburtsort gestorben ist, die häufigsten Wege vom Geburtsort über Umzüge zum Sterbeort und die Orte mit ihren Personen und dem Zeitraum der Angaben dort.',
      },
      {
        p: '„Rekorde“ unter „Leben“ nennt längstes Leben, längste Ehe, die meisten Kinder, Partner und Nachkommen, die jüngsten und ältesten Eltern bei einer Geburt und den größten Altersabstand eines Paares – nur von Verstorbenen. Ist ein Rekord zugleich ein möglicher Fehler, etwa eine Mutter mit 61, steht ein Hinweis mit Link dabei.',
      },
      {
        p: '„Drucken oder als PDF“ öffnet den Bericht „Statistik“ mit allen Zahlen des gewählten Umfangs als Tabellen. „Als CSV kopieren“ an jeder Karte legt deren Zahlen in die Zwischenablage, zum Einfügen in eine Tabellenkalkulation. KI-Assistenten erhalten dieselben Zahlen über das Werkzeug „get_statistics“, auch für einen Umfang.',
      },
    ],
    link: { to: '/statistics', label: 'Zu den Statistiken' },
  },
  {
    id: 'checks',
    title: 'Mögliche Fehler',
    blocks: [
      {
        p: '„Mögliche Fehler“ listet Angaben des geöffneten Stammbaums, die erlaubt, aber selten richtig sind – oft ein Tippfehler: ein Mann als Mutter oder eine Frau als Ehemann, Partner, die zugleich Elternteil und Kind oder Geschwister sind, ein Kind mit mehr als zwei Elternteilen, ein Elternteil unter 12 oder eine Mutter über 55 bei der Geburt, ein Elternteil, der vor der Geburt gestorben ist, eine Partnerschaft, die vor der Geburt oder nach dem Tod eines Partners beginnt, ein Tod vor der Geburt, ein Leben von mehr als 110 Jahren oder eine Person über 110 ohne Sterbedatum, Lebensereignisse vor der Geburt oder nach dem Tod, mögliche Dubletten und Personen, die ihre eigenen Vorfahren sind. Ein ungefähres Datum wie „um 1880“ zählt fünf Jahre in jede Richtung – gemeldet wird nur, was sicher nicht passt.',
      },
      {
        p: 'Jeder Eintrag nennt die Personen mit einem Link zu ihnen. Korrigiere den Fehler dort – der Eintrag verschwindet dann von selbst – oder klicke auf „Ist richtig“, wenn die Angabe stimmt: Der Eintrag wird dann ausgeblendet, auch nach einer Sicherung und Wiederherstellung. „Auch die als richtig markierten zeigen“ blendet sie wieder ein.',
      },
      {
        p: 'Speicherst du eine Beziehung, die falsch aussieht, nennt die App den Grund und fragt, ob du sie trotzdem speichern willst. Auch KI-Assistenten müssen dich fragen, bevor sie eine solche Beziehung speichern.',
      },
    ],
    link: { to: '/checks', label: 'Zu den möglichen Fehlern' },
  },
  {
    id: 'reports',
    title: 'Berichte',
    blocks: [
      {
        p: 'Unter „Berichte“ lassen sich die Daten des geöffneten Stammbaums drucken oder als PDF speichern: das Personenblatt (alle Daten einer Person mit Angehörigen, Lebensereignissen, Notizen, Fotos und den Quellen als Fußnoten – auch für alle Personen auf einmal), das Familienblatt (ein Paar mit Hochzeit, Eltern und Kindern), die Ahnenliste mit Kekulé-Nummern (Vater von n = 2n, Mutter = 2n + 1; ein doppelt vorkommender Vorfahre verweist auf die erste Nummer) und die Nachkommenliste mit d’Aboville-Nummern (1, 1.1, 1.1.2 …). Der Knopf „Bericht“ auf der Seite einer Person öffnet die Berichte mit dieser Person als Start.',
      },
      {
        p: 'Über der Vorschau wählst du Fotos, Notizen, Quellen, Kontaktdaten und ob Lebende nur mit Name und Geburtsjahr erscheinen; die Auswahl wird gemerkt. „Drucken“ öffnet den Druckdialog. „Als PDF speichern“ fragt in der Desktop-App nach dem Dateinamen und schreibt das PDF selbst; im Browser wählst du im Druckdialog „Als PDF speichern“ als Drucker. Jedes Blatt beginnt auf einer neuen Seite, und die Seiten sind nummeriert.',
      },
    ],
    link: { to: '/reports', label: 'Zu den Berichten' },
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
        p: 'Export und Import gelten für den geöffneten Stammbaum. Der ZIP-Export enthält alle Daten und Medien – zum Sichern oder für eine andere Cognatio-Installation. GEDCOM (5.5.1 oder 7.0) ist das Austauschformat anderer Genealogie-Programme wie Ancestry, MyHeritage oder Gramps, auf Wunsch mit Bildern und Dokumenten. Die Dateien dürfen beliebig groß sein, auch über 4 GB; eine Obergrenze lässt sich unter „Einstellungen → Daten und Backup“ festlegen.',
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
        p: 'Wird eine GEDCOM-Datei erneut eingelesen, erkennt die App vorhandene Personen wieder und legt sie nicht doppelt an. Die Import-Historie zeigt frühere Importe. Wäre nach dem Import jemand sein eigener Vorfahre (Kreis in den Eltern-Kind-Beziehungen), nennt die Vorschau die Personen; der Import läuft trotzdem, und du korrigierst die Beziehungen danach von Hand.',
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
        p: 'Unter „Einstellungen → Datensicherung“ lädt „Backup herunterladen“ eine Datei mit allen Stammbäumen, Medien, dem Papierkorb und der Import-Historie herunter. Einzelne Stammbäume sicherst du über „Import/Export“. Ist unter „Größengrenzen“ eine Obergrenze gesetzt, wird ein größeres Backup trotzdem gespeichert, lässt sich aber erst nach dem Anheben der Grenze wiederherstellen.',
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
        p: 'Größe: Export, Import, Backup und Wiederherstellung lesen und schreiben Dateien Stück für Stück – auch sehr große (50 GB und mehr) brauchen kaum Arbeitsspeicher. Vorher prüft die App, ob auf dem Laufwerk genug Platz frei ist; eine Wiederherstellung braucht etwa den Platz des Backups und zusätzlich den der aktuellen Daten, weil sie den aktuellen Stand zuerst vollständig sichert. „Vorgänge“ in der Seitenleiste zeigt den Fortschritt dieser Vorgänge und von Medien-Uploads, auch wenn du inzwischen eine andere Seite geöffnet hast, und listet die abgeschlossenen, bis die App geschlossen wird; Import und Wiederherstellung lassen sich dort abbrechen, bis die Daten ersetzt werden. Unter „Einstellungen → Daten und Backup → Größengrenzen“ lässt sich eine Obergrenze festlegen (standardmäßig keine). USB-Sticks mit FAT32 nehmen höchstens 4 GB je Datei auf – wähle für große Backups ein Laufwerk mit exFAT oder NTFS.',
      },
    ],
    link: { to: '/settings', label: 'Zu den Einstellungen' },
  },
  {
    id: 'trash',
    title: 'Papierkorb',
    blocks: [
      {
        p: 'Im Papierkorb liegen gelöschte Personen des geöffneten Stammbaums und gelöschte Stammbäume; die Zahl in der Seitenleiste zeigt, wie viele es sind. „Wiederherstellen“ holt sie zurück. „Endgültig löschen“ entfernt auch Beziehungen, Lebenslauf, Notizen und Medien und lässt sich nur über eine Datensicherung rückgängig machen. Darunter listet „Quellen und Archive“ gelöschte Quellen und Archive; sie gehören zu allen Stammbäumen, und eine Quelle nimmt ihre Belege mit – beim Wiederherstellen kehren sie an alle Fakten zurück.',
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
          'KI-Assistenten (MCP): ob und was KI-Assistenten dürfen (siehe „KI-Assistenten (MCP)“).',
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
    id: 'ai-assistants',
    title: 'KI-Assistenten (MCP)',
    blocks: [
      {
        p: 'KI-Assistenten wie Claude (Claude Desktop, Claude Code) und andere Programme, die das Model Context Protocol (MCP) sprechen, können mit deinen Stammbäumen arbeiten: Personen nachschlagen, Fragen wie „Welche Vorfahren stammen aus Pommern?“ beantworten, Lücken aufzeigen und – wenn du es erlaubst – eintragen, was du diktierst oder was ein gescannter Kirchenbucheintrag sagt.',
      },
      {
        p: 'Eingeschaltet wird es unter Einstellungen → „KI-Assistenten (MCP)“. Die App zeigt dann die Adresse und ein Token – das Token nur einmal – mit einem fertigen Befehl für Claude Code und einem Konfigurationsblock für andere Programme. Assistenten verbinden sich nur mit diesem Computer; was sie lesen, geht an den Anbieter des KI-Modells, das du nutzt.',
      },
      {
        steps: [
          'Einstellungen → „KI-Assistenten (MCP)“: „KI-Assistenten erlauben“ anhaken. Adresse und Token erscheinen – das Token nur jetzt.',
          '„Befehl für Claude Code“ kopieren und einmal in einem Terminal ausführen (claude mcp add --transport http cognatio …). Mit „--scope user“ nach „--transport http“ gilt er in jedem Ordner.',
          'Claude Code starten: „/mcp“ zeigt „cognatio“ als verbunden, mit seinen Werkzeugen.',
          'In eigenen Worten fragen. Für Änderungen die Stufe des Bereichs anhaken (z. B. „Schreiben“ bei Personen).',
        ],
      },
      {
        p: 'Zum Beispiel kannst du fragen:',
      },
      {
        list: [
          'Wer sind die Vorfahren von Anna Kraft bis zu den Urgroßeltern, und welche stammen aus Pommern?',
          'Welche Personen wurden zwischen 1850 und 1900 in Leipzig geboren? Gibt es mögliche Dubletten?',
          'Mit „schreiben“: „Trage eine Taufe für Anna Kraft am 2. Oktober 1951 in Leipzig ein.“ oder „Trage diesen Kirchenbucheintrag mit Quelle ein.“',
          'Mit den Berechtigungen für Dateien: „Exportiere den Stammbaum als GEDCOM in meinen Ordner Dokumente.“ oder „Füge den Scan …\\taufschein.jpg der Taufe von Anna hinzu.“',
        ],
      },
      {
        list: [
          'Berechtigungen je Bereich: aus, lesen, schreiben (anlegen, ändern, in den Papierkorb legen – in der App rückgängig zu machen) und löschen (nicht rückgängig zu machen, z. B. ein Backup wiederherstellen). Nach dem Einschalten steht jeder Bereich auf „lesen“; vor „schreiben“ oder „löschen“ fragt die App nach.',
          'Stammbäume: Ein Assistent sieht nur die angehakten Stammbäume; neue Stammbäume sind sichtbar.',
          'Dateien gehen nie über MCP: Ein Assistent nennt eine Datei auf diesem Computer (im Benutzer-, Daten- oder Backup-Ordner), z. B. einen Scan zum Hinzufügen, eine Datei zum Importieren oder einen Ordner für einen Export.',
          'Jede Änderung eines Assistenten erscheint unter „Vorgänge“; das Log hat den Filter „Nur KI-Assistenten (MCP)“.',
          'Token verloren? „Neues Token“ ersetzt es, das alte gilt dann nicht mehr. Ausschalten macht das Token sofort ungültig.',
          'Die Adresse enthält den Port der App, der zwischen den Starts gleich bleibt. Musste die Desktop-App einen anderen nehmen, sagt der Abschnitt es – der Assistent braucht dann die neue Adresse.',
          'Die Einstellungen für KI-Assistenten kann ein Assistent nie selbst ändern.',
        ],
      },
      {
        faq: [
          { q: 'Der Assistent bekommt „404“ oder „MCP ist ausgeschaltet“.', a: 'In den Einstellungen „KI-Assistenten erlauben“ anhaken.' },
          {
            q: 'Der Assistent bekommt „401“ oder „Token fehlt oder ist falsch“.',
            a: 'Das Token wurde ersetzt oder MCP zwischendurch ausgeschaltet. Ein neues Token erstellen und den Server neu eintragen („claude mcp remove cognatio“, dann den neuen Befehl).',
          },
          {
            q: 'Ein Werkzeug fehlt oder antwortet „NOT_ALLOWED“.',
            a: 'Die Berechtigung seines Bereichs ist zu niedrig – in den Einstellungen erhöhen; in Claude Code listet „/mcp“ die Werkzeuge neu.',
          },
          {
            q: 'Der Assistent kann sich gar nicht verbinden.',
            a: 'Cognatio muss laufen. Sagen die Einstellungen, dass sich der Port geändert hat, den Server mit der neuen Adresse neu eintragen.',
          },
        ],
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
