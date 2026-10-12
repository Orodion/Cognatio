import type { ReleaseNotes } from '../releases';

const notes: ReleaseNotes = {
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
