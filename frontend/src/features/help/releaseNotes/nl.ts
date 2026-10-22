import type { ReleaseNotes } from '../releases';

const notes: ReleaseNotes = {
  '1.1.0': {
    mcp: {
      title: 'AI-assistenten (MCP)',
      text: 'AI-assistenten zoals Claude kunnen je stambomen via het Model Context Protocol opzoeken, doorzoeken en – met jouw toestemming – wijzigen. Jij bepaalt per onderdeel wat ze mogen; elke wijziging verschijnt onder ‘Activiteit’.',
    },
    reports: {
      title: 'Rapporten om af te drukken en als pdf',
      text: 'Persoonsblad, gezinsblad, kwartierstaat (Kekulé) en parenteel (d’Aboville) – afgedrukt of als pdf, in de desktop-app direct in een bestand.',
    },
    checks: {
      title: 'Mogelijke fouten',
      text: 'Een nieuwe pagina toont wat toegestaan maar zelden juist is – een man als moeder, een moeder van 60, een huwelijk na het overlijden, mogelijke dubbelen en meer – met links naar de personen; wat klopt, kan als juist worden gemarkeerd. Een relatie die niet lijkt te kloppen, wordt pas na een vraag opgeslagen.',
    },
    statistics: {
      title: 'Statistieken om verder te zoeken',
      text: 'Elk getal in de statistieken leidt naar de personen erachter – een klik op een balk opent de personenlijst met precies die personen. De omvang is te kiezen: voorouders of nakomelingen van een persoon, een achternaam, geboortejaren. De analyses zijn over tabbladen verdeeld. ‘Wat ontbreekt er nog?’ toont de stand van het onderzoek en leidt naar de gaten; ‘Voorouders’ toont per generatie hoeveel voorouders gevonden zijn, het kwartierverlies en de open einden – vanaf de nieuwe hoofdpersoon van de stamboom. Een tijdlijn toont geboorten, overlijdens en huwelijken per decennium; ‘Levens door de tijd’ vergelijkt levensduur, huwelijksleeftijd en leeftijd bij het eerste kind door de eeuwen heen. Daarbij voornamen en naammode, de migratie van de familie van plaats naar plaats en records van de overledenen. Alles kan als rapport worden afgedrukt, als pdf opgeslagen of als CSV gekopieerd.',
    },
    places: {
      title: 'Plaatsvoorstellen',
      text: 'De velden geboorteplaats, overlijdensplaats en plaats van een gebeurtenis stellen de plaatsen voor die al in de stamboom voorkomen, de meest gebruikte eerst.',
    },
    dates: {
      title: 'Uitgeschreven datums',
      text: 'Datumvelden nemen ook uitgeschreven datums in elke taal van de app aan, zoals ‘2 oktober 1951’ of ‘mei 1951’, en maken er ‘02.10.1951’ en ‘05.1951’ van.',
    },
    anniversaries: {
      title: 'Gedenkdagen op de startpagina',
      text: 'De startpagina toont verjaardagen, sterfdagen en trouwdagen van de komende 30 dagen, met de leeftijd of het aantal jaren.',
    },
    sources: {
      title: 'Bronnen en bronvermeldingen',
      text: 'Eén verzameling bronnen en archieven voor alle stambomen: een bronvermelding legt pagina, datum, transcriptie, betrouwbaarheid en scans vast en onderbouwt willekeurig veel feiten – naam, geboorte, overlijden, gebeurtenissen en relaties, ook van meerdere personen. De pagina van een bron toont per persoon wat elke bronvermelding onderbouwt; GEDCOM behoudt de bronnen van andere programma’s.',
    },
    files: {
      title: 'Bestanden bekijken',
      text: 'Afbeeldingen, PDF, video’s, audio en tekstbestanden zoals TXT, Markdown of CSV openen in een venster met de bestandsnaam als titel; andere bestanden worden meteen opgeslagen. Media hebben geen limiet per bestand meer, ook lange video’s passen. Een bestand dat volgens de naam een afbeelding of pdf is maar dat niet is, wordt geweigerd.',
    },
    activity: {
      title: 'Grote hoeveelheden gegevens en “Activiteit”',
      text: 'Exporteren, importeren, back-up en herstel kunnen 50 GB en meer aan met weinig geheugen en controleren eerst de vrije ruimte. “Activiteit” in de zijbalk toont de voortgang van elke lange bewerking; importeren en herstellen zijn te annuleren.',
    },
    search: {
      title: 'Cyrillische namen',
      text: 'De zoekfunctie behandelt Cyrillisch geschreven namen als hun Latijnse spelling: “Иванов” vindt ook “Iwanow” en “Ivanov”.',
    },
    'import-export': {
      title: 'Importeren in je eigen taal',
      text: 'Een GEDCOM-import schrijft titels van gebeurtenissen, aanduidingen en geschatte datums in de taal van de interface. Importeren en herstellen waarschuwen als iemand zijn eigen voorouder zou zijn, en heel lange notities worden opgesplitst in plaats van vast te lopen. De GEDCOM-export schrijft dopen, beroepen en woonplaatsen met de standaardtags die andere programma’s herkennen.',
    },
    relations: {
      title: 'Duidelijkere afgeleide relaties',
      text: 'De partner van een ouder wordt alleen tweede ouder als die ouder precies één partner heeft, en een ouder-kindrelatie wordt samen met de afgeleide relaties helemaal of helemaal niet opgeslagen. Broers en zussen die alleen via een verwijderde ouder-kindrelatie ontstonden, gaan mee naar de prullenbak en komen mee terug; de GEDCOM-export laat relaties in de prullenbak weg.',
    },
    'desktop-app': {
      title: 'PostgreSQL 18',
      text: 'De desktopapp gebruikt PostgreSQL 18; de gegevens van versie 1.0.0 worden bij de eerste start automatisch omgezet, de oude databasemap blijft 30 dagen bewaard.',
    },
    settings: {
      title: 'Zijbalk in groepen',
      text: 'De zijbalk deelt de onderdelen in onder ‘Vastleggen’, ‘Analyseren’ en ‘Beheren’; ‘Importeren/Exporteren’ staat nu onder ‘Beheren’ en ‘Mogelijke fouten’ toont hoeveel er openstaan. ‘Activiteit’, ‘Prullenbak’, ‘Instellingen’ en ‘Help’ blijven onderaan.',
    },
  },
  '1.0.0': {
    persons: {
      title: 'Personen met levensgebeurtenissen en bestanden',
      text: 'Personen met flexibele data (exact, maand, jaar, “rond 1880” of periode), levensgebeurtenissen met plaatsen, notities, foto’s en documenten.',
    },
    relations: {
      title: 'Relaties',
      text: 'Koppel ouders, kinderen, partners en broers en zussen. De omgekeerde relatie ontstaat vanzelf; periodes en benamingen zoals “adoptiekind” zijn mogelijk.',
    },
    tree: {
      title: 'Stamboomweergaven',
      text: 'Stamboom, voorouderoverzicht, nakomelingenoverzicht en relatienetwerk, met zoomen, focuspersoon en export naar PNG, SVG of PDF.',
    },
    search: {
      title: 'Zoeken',
      text: 'Vindt namen ook bij een vergelijkbare spelling, plus plaatsen, beroepen, levensgebeurtenissen en notities.',
    },
    statistics: {
      title: 'Statistieken',
      text: 'Kerncijfers, leeftijdsverdeling, meest voorkomende achternamen en geboorteplaatsen en een overzicht van de generaties.',
    },
    'family-trees': {
      title: 'Meerdere stambomen',
      text: 'Beheer aparte stambomen, bijvoorbeeld voor beide kanten van de familie, en schakel ertussen.',
    },
    'import-export': {
      title: 'Importeren en exporteren',
      text: 'Wissel gegevens uit als ZIP (met bestanden) of als GEDCOM 5.5.1 en 7.0 met andere genealogieprogramma’s; opnieuw importeren maakt geen dubbelen aan.',
    },
    backup: {
      title: 'Back-ups',
      text: 'Automatische dagelijkse back-ups, download van alle gegevens en een begeleid herstel dat eerst de huidige toestand bewaart.',
    },
    trash: {
      title: 'Prullenbak',
      text: 'Verwijderde personen en stambomen kunnen worden hersteld.',
    },
    settings: {
      title: 'Talen en uiterlijk',
      text: 'Tien talen (de app start in de taal van het besturingssysteem), kleurenschema’s, lettertypen en het uiterlijk van de stamboom.',
    },
    'desktop-app': {
      title: 'Desktop-app voor Windows en Linux',
      text: 'Windows-installatieprogramma of draagbare ZIP, Linux-AppImage of Debian-pakket: met een eigen database, zonder configuratie, met één klik gestart, met een back-up van de gegevens vóór elke update en automatische updates (behalve bij de draagbare ZIP en het Debian-pakket).',
    },
  },
};

export default notes;
