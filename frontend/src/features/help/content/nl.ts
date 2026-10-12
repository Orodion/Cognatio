import type { HelpSection } from '../types';

const help: HelpSection[] = [
  {
    id: 'getting-started',
    title: 'Aan de slag',
    blocks: [
      {
        p: 'Cognatio beheert uw stamboom: personen, hun relaties, levensgebeurtenissen, foto’s en documenten. Kies links een onderdeel en zoek bovenaan naar personen. De knop ? rechtsboven opent de help voor de pagina waarop u zich bevindt.',
      },
      {
        steps: [
          'Klik onder “Personen” op “Nieuwe persoon”, voer minstens de voornaam in en sla op.',
          'Voeg op de pagina van de persoon ouders, kinderen, partners of broers en zussen toe op het tabblad “Relaties” – kies een bestaande persoon of maak daar meteen een nieuwe aan.',
          'Bekijk het resultaat onder “Stamboom”. Met een hoofdpersoon toont de stamboom de familie vanuit het perspectief van die persoon.',
        ],
      },
      {
        p: 'De startpagina toont het aantal personen en de verdeling naar geslacht, snelkoppelingen naar de belangrijkste onderdelen, de laatst toegevoegde personen en een paar tips. De hulp heeft boven de hoofdstukken een eigen zoekveld.',
      },
      {
        p: 'Voorbeeldstamboom: bij de eerste start maakt de desktop-app de stamboom “Familie Kraft (Demo)” aan – tien verzonnen personen in vier generaties met relaties, levensgebeurtenissen, notities en foto’s, zodat je elk onderdeel meteen kunt uitproberen. De inhoud is in het Duits. Om met je eigen gegevens te beginnen maak je onder “Stambomen” een nieuwe stamboom aan en verwijder je het voorbeeld (het gaat naar de prullenbak en komt niet terug). Het bestand Cognatio-Demo-Familie-Kraft.zip staat in de programmamap (map “demo” in “resources”) en in de map “demo” van het project; onder Importeren/Exporteren kun je het opnieuw als nieuwe stamboom importeren.',
      },
    ],
    link: { to: '/persons', label: 'Naar personen' },
  },
  {
    id: 'persons',
    title: 'Personen',
    blocks: [
      {
        p: 'Alleen de voornaam is verplicht. Is die onbekend, vink dan “Voornaam onbekend” aan – de app toont dan “(voornaam onbekend)”. Voer data in zover u ze kent: 04.01.1880 (exact), 01.1880 (maand), 1880 (jaar), “circa 1880”, “voor 1880”, “na 1880” of de periode “1880-1885”. De app herkent zelf de nauwkeurigheid.',
      },
      {
        p: 'Wanneer u een persoon aanmaakt, wijst de app op bestaande personen met een vergelijkbare naam en hetzelfde geboortejaar – zodat er geen dubbelen ontstaan.',
      },
      {
        list: [
          'Overzicht: persoonsgegevens, contact en overige gegevens; met “Bewerken” wijzigt u ze.',
          'Tijdlijn: gebeurtenissen zoals geboorte, doop, huwelijk of verhuizing, met datum en plaats. Een gebeurtenis kan worden gekoppeld aan bestanden – ook aan bestanden van andere personen, bijv. een groepsfoto. De gebeurtenissen kunnen van oud naar nieuw of omgekeerd worden gesorteerd en als tijdlijn of als tabel worden getoond; de keuze wordt onthouden.',
          'Relaties: zie het onderdeel “Relaties”.',
          'Notities: vrije tekst, bijv. verhalen of bronnen, elk tot 10.000 tekens.',
          'Bestanden: upload foto’s en documenten (tot 50 MB per bestand); een afbeelding kan als profielfoto worden ingesteld. Met het downloadpictogram sla je een bestand op onder de oorspronkelijke naam.',
          'Bestanden kunnen als tegels of als lijst worden getoond (knoppen boven de bestanden).',
          'Filter: het veld naast de tabbladen (behalve „Overzicht”) filtert de items van het geopende tabblad – levensloop, relaties, notities of bestanden. Hoofdletters en accenten maken niet uit, bij meerdere woorden moeten ze allemaal voorkomen en de treffers worden gemarkeerd. Er wordt in alle teksten gezocht, bijv. titel, categorie, datum, plaats, beschrijving en bestandsnamen. Bij de relaties toont ook de grafiek alleen de overgebleven personen. De tekst blijft behouden bij het wisselen van tabblad; Esc of het kruisje wist hem.',
        ],
      },
      { p: '“Verwijderen” verplaatst de persoon naar de prullenbak – vandaar kan hij worden hersteld.' },
    ],
    link: { to: '/persons', label: 'Naar personen' },
  },
  {
    id: 'relations',
    title: 'Relaties',
    blocks: [
      {
        p: 'Relaties voegt u toe op de pagina van een persoon, op het tabblad “Relaties”, of al bij het aanmaken van de persoon. Het soort relatie beschrijft de geselecteerde persoon vanuit het perspectief van de huidige persoon: staat u op de pagina van Anna en kiest u Max als “Vader”, dan is Max de vader van Anna. De omgekeerde richting – Anna is het kind van Max – wordt automatisch getoond.',
      },
      {
        list: [
          'Soorten: moeder, vader, kind, broer/zus, echtgenoot, echtgenote, levenspartner, partner, overig.',
          'Label (optioneel), bijv. “adoptiekind” of “stiefvader”.',
          'Periode van – tot, bijv. voor een huwelijk; voor een kind wordt de geboortedatum als begin voorgesteld.',
          'Bestaat de persoon nog niet, kies dan “Nieuwe persoon” en maak hem direct in het dialoogvenster aan.',
          'Grafiek: naast de lijst (op smalle schermen erboven) worden de relaties van de persoon als diagram getekend – ouders boven, partners ernaast, kinderen eronder. Een klik op een persoon opent die; met de knop “Grafiek” verberg of toon je het diagram, de keuze wordt onthouden.',
        ],
      },
      {
        p: 'Sommige relaties worden automatisch toegevoegd: als een ouder en een kind worden gekoppeld, wordt de partner van de ouder ook ouder van het kind (zolang het kind minder dan twee ouders heeft; de relatie begint bij de geboorte van het kind als die precies bekend is), en de andere kinderen van de ouder worden broers en zussen van het kind. De verwijderknop naast een relatie verwijdert alleen de relatie – de personen blijven.',
      },
    ],
  },
  {
    id: 'tree',
    title: 'Weergave van de stamboom',
    blocks: [
      {
        list: [
          'Stamboom: alle families van de stamboom.',
          'Voorouderoverzicht: ouders, grootouders enz. van de hoofdpersoon.',
          'Nakomelingenoverzicht: kinderen, kleinkinderen enz. van de hoofdpersoon.',
          'Relatienetwerk: alle verbindingen als netwerk.',
        ],
      },
      {
        p: 'De hoofdpersoon bepaalt van wie uit de boom wordt getekend; “Generaties” beperkt de diepte. In- en uitzoomen kan met het muiswiel of de zoombalk; een klik op een persoon opent zijn pagina. De randkleur toont het geslacht. Zeer grote bomen (vanaf 400 personen) worden niet automatisch getekend – kies dan een hoofdpersoon en minder generaties.',
      },
      {
        p: '“Exporteren” slaat de boom op als PNG of SVG of drukt hem af (ook als PDF), desgewenst alleen het zichtbare gedeelte. De app onthoudt weergave, generaties en hoofdpersoon; de standaardwaarden stelt u in onder “Instellingen”. Op de pagina van een persoon opent “Stamboom tonen” de boom met die persoon als hoofdpersoon.',
      },
    ],
    link: { to: '/tree', label: 'Naar de stamboom' },
  },
  {
    id: 'search',
    title: 'Zoeken',
    blocks: [
      {
        p: 'Het zoekveld bovenaan doorzoekt de geopende stamboom: namen – ook vergelijkbare spellingen, dus “Meier” vindt ook “Mayer” en “Maier” –, persoonsgegevens zoals plaatsen en beroepen, de tijdlijn en de notities. Bij elk resultaat staat waarop het is gevonden.',
      },
    ],
  },
  {
    id: 'statistics',
    title: 'Statistieken',
    blocks: [
      {
        p: 'De statistieken analyseren de geopende stamboom (zonder prullenbak): kerncijfers zoals aantal personen, geslachten en gemiddelde levensduur, de leeftijdsverdeling, de meest voorkomende achternamen, de meest voorkomende geboorteplaatsen en een overzicht van de generaties.',
      },
    ],
    link: { to: '/statistics', label: 'Naar de statistieken' },
  },
  {
    id: 'family-trees',
    title: 'Meerdere stambomen',
    blocks: [
      {
        p: 'U kunt meerdere stambomen gescheiden van elkaar bijhouden, bijv. de familie van vaders en van moeders kant. Elke persoon hoort bij precies één stamboom; alle pagina’s tonen alleen de geopende. Wisselen doet u met de keuze “Geopende stamboom” bovenaan in de zijbalk.',
      },
      {
        p: 'Op de pagina “Stambomen” maakt u stambomen aan, hernoemt, opent of verwijdert u ze. Een verwijderde stamboom gaat met alle gegevens naar de prullenbak; ook de laatste kan worden verwijderd – de app biedt dan aan een nieuwe aan te maken, een bestand te importeren of een stamboom terug te halen uit de prullenbak.',
      },
    ],
    link: { to: '/family-trees', label: 'Naar de stambomen' },
  },
  {
    id: 'import-export',
    title: 'Importeren/Exporteren',
    blocks: [
      {
        p: 'Exporteren en importeren gelden voor de geopende stamboom. De ZIP-export bevat alle gegevens en bestanden – voor een back-up of voor een andere Cognatio-installatie. GEDCOM (5.5.1 of 7.0) is het uitwisselingsformaat van andere genealogieprogramma’s zoals Ancestry, MyHeritage of Gramps, desgewenst met afbeeldingen en documenten. Standaard mag een bestand maximaal 2 GB groot zijn (te wijzigen onder “Instellingen → Gegevens en back-up”); zijn de bestanden van een stamboom groter, exporteer dan zonder bestanden.',
      },
      {
        steps: [
          'Kies een bestand (ZIP van deze app of GEDCOM).',
          'Kies het doel: de geopende of een nieuwe stamboom. Bij GEDCOM-bestanden stelt de app een nieuwe stamboom voor.',
          'Het voorbeeld toont wat er verandert. Kies bij de geopende stamboom hoe u verdergaat.',
          '“Import uitvoeren”.',
        ],
      },
      {
        list: [
          'Samenvoegen – nieuwste wint: nieuwe personen worden toegevoegd; waar gegevens verschillen, geldt de nieuwste versie.',
          'Samenvoegen – handmatig beslissen: als hierboven, maar waar gegevens verschillen beslist u per persoon.',
          'Overschrijven: de geopende stamboom wordt volledig vervangen door het bestand; andere stambomen blijven ongewijzigd.',
        ],
      },
      {
        p: 'Wordt een GEDCOM-bestand opnieuw geïmporteerd, dan herkent de app bestaande personen en maakt ze niet dubbel aan. De importgeschiedenis toont eerdere imports.',
      },
    ],
    link: { to: '/import-export', label: 'Naar Importeren/Exporteren' },
  },
  {
    id: 'backup',
    title: 'Back-up',
    blocks: [
      {
        p: 'De server maakt automatisch een back-up van de database en de bestanden, standaard dagelijks. De instellingen tonen de laatste back-up en waarschuwen als die ouder is dan drie dagen.',
      },
      {
        p: 'Onder “Instellingen → Back-up” downloadt “Back-up downloaden” één bestand met alle stambomen, bestanden, de prullenbak en de importgeschiedenis. Afzonderlijke stambomen bewaart u via “Importeren/Exporteren”. Een back-up die groter is dan de maximale grootte wordt wel opgeslagen, maar kan niet met deze app worden hersteld – bewaar dan ook afzonderlijke stambomen via “Importeren/Exporteren”.',
      },
      {
        steps: [
          'Kies “Back-up herstellen…” en selecteer het back-upbestand – het wordt eerst gecontroleerd, er verandert nog niets.',
          'Controleer de vergelijking “Nu / In back-up”.',
          'Typ “VERWIJDEREN” ter bevestiging en kies “Herstellen”.',
        ],
      },
      {
        p: 'Alle huidige gegevens worden vervangen door de back-up. Daarvoor slaat de server de huidige staat op als bestand “cognatio_before_restore_…zip” – daarmee kunt u het herstel ongedaan maken. De laatste drie van deze bestanden blijven bewaard; oudere verwijdert de server.',
      },
      {
        p: 'Maximale grootte: exporteren, importeren, back-up en herstel verwerken een bestand in het geheugen, standaard tot 2 GB. Onder “Instellingen → Gegevens en back-up → Maximale grootte” kan een computer met veel geheugen grotere bestanden toestaan. Boven 4 GB moet minstens twee keer de bestandsgrootte aan werkgeheugen (RAM) vrij zijn; anders kan de app erg traag worden of stoppen; de instellingen waarschuwen hiervoor. Een te grote export wordt geweigerd, een te grote back-up wordt met een waarschuwing gemaakt.',
      },
    ],
    link: { to: '/settings', label: 'Naar de instellingen' },
  },
  {
    id: 'trash',
    title: 'Prullenbak',
    blocks: [
      {
        p: 'In de prullenbak staan verwijderde personen van de geopende stamboom en verwijderde stambomen; het getal in de zijbalk toont hoeveel het er zijn. “Herstellen” haalt ze terug. “Definitief verwijderen” wist ook relaties, gebeurtenissen, notities en bestanden en kan alleen met een back-up ongedaan worden gemaakt.',
      },
    ],
    link: { to: '/trash', label: 'Naar de prullenbak' },
  },
  {
    id: 'settings',
    title: 'Instellingen',
    blocks: [
      {
        p: 'De taal (die alleen hier wordt gewijzigd), het kleurenschema en de standaardwaarden van de stamboom (weergave, generaties, hoofdpersoon per stamboom) gelden voor deze browser. Back-up en systeemstatus gelden voor de hele applicatie.',
      },
      {
        list: [
          'Uiterlijk (de blokken “Lettertype en kleuren” en “Stamboom: uiterlijk”): lettertype en lettergrootte, accentkleur, lijnstijl, -dikte en -kleur in de stamboom, grootte en hoeken van de personenkaarten, foto, data en het zwarte rouwlint van overleden personen op de kaarten en randkleuren naar geslacht – met livevoorbeeld en “Standaardwaarden herstellen”.',
          'Stamboom: gedrag: de weergave, het aantal generaties en de hoofdpersoon waarmee de stamboom opent.',
          'Gegevens en back-up: back-up maken en herstellen (zie “Back-up”).',
          'Systeem (altijd zichtbaar): taal (ook “Zoals het besturingssysteem”), kleurenschema, versie en status van server en database, aantal personen en bestanden, logniveau, het logboek van server en browser met een export voor foutanalyse (zonder stamboomgegevens), de licenties en, in de desktop-app, de programma-updates (zie “Desktop-app”).',
        ],
      },
      {
        p: 'De blokken openen en sluiten met een klik (“Alles uitklappen” / “Alles inklappen”). Het zoekveld erboven vindt een instelling, opent het blok en springt naar het veld. Uiterlijk, taal en de standaardwaarden van de stamboom worden in deze browser of dit appvenster opgeslagen.',
      },
    ],
    link: { to: '/settings', label: 'Naar de instellingen' },
  },
  {
    id: 'desktop-app',
    title: 'Desktop-app (Windows, Linux)',
    blocks: [
      {
        p: 'De desktop-app toont Cognatio in een eigen venster – zonder browser, Node of een database om te installeren. Ze start op de achtergrond haar eigen database en stopt die als je het venster sluit of onderaan de zijbalk “Afsluiten” kiest. Er draait steeds maar één instantie.',
      },
      {
        list: [
          'Windows: installeren met het setupbestand (per gebruiker, zonder beheerdersrechten) of de draagbare ZIP uitpakken, die alle gegevens in een map “data” naast het programma bewaart.',
          'Linux: de AppImage is één bestand – uitvoerbaar maken en starten, ze zet zichzelf in het toepassingenmenu. Het Debian-pakket wordt geïnstalleerd met “sudo apt install ./Cognatio-….deb”. Is het met “dpkg -i” geïnstalleerd, dan haalt “sudo apt --fix-broken install” de ontbrekende bibliotheken op en rondt de installatie af – anders start Cognatio niet.',
          'Je gegevens staan onder Windows in %APPDATA%\\Cognatio en onder Linux in ~/.config/Cognatio, los van het programma: een update of verwijdering wist ze nooit. Het verwijderprogramma van Windows vraagt of de gegevens ook gewist moeten worden – download eerst een back-up.',
          'Maak af en toe een back-up (Instellingen → Back-up) en bewaar die ergens anders. De app bewaart haar database ook automatisch vóór elke update en één keer per dag.',
        ],
      },
      {
        p: 'Onder Instellingen → Systeem → Programma-updates zoekt Cognatio ongeveer één keer per dag een nieuwe versie (de schakelaar staat daar; “Nu controleren” zoekt meteen). Alleen het verzoek om het versiebestand wordt verstuurd. Een nieuwe versie wordt op de achtergrond gedownload en bij het herstarten geïnstalleerd; daarvoor wordt de database bewaard. “Ook testversies (bèta)” biedt versies aan vóór hun uitgifte; terug naar uitgegeven versies installeert nooit een oudere. De draagbare ZIP en het Debian-pakket worden niet door de app bijgewerkt – installeer de nieuwe versie zelf.',
      },
    ],
    link: { to: '/settings', label: 'Naar de instellingen' },
  },
  {
    id: 'versions',
    title: 'Versiegeschiedenis',
    blocks: [{ p: 'Wat er in welke versie is veranderd, de nieuwste eerst. Een klik op een functie springt naar het bijbehorende hulphoofdstuk.' }],
  },
  {
    id: 'faq',
    title: 'Veelgestelde vragen',
    blocks: [
      {
        faq: [
          { q: 'Ik heb per ongeluk een persoon verwijderd.', a: 'Open de prullenbak en kies bij de persoon “Herstellen”.' },
          { q: 'Ik ken een datum maar bij benadering.', a: 'Voer hem in zover u hem kent, bijv. “circa 1880”, “voor 1900” of “1880-1885”.' },
          {
            q: 'Hoe neem ik mijn stamboom over uit Ancestry, MyHeritage of een ander programma?',
            a: 'Exporteer hem daar als GEDCOM-bestand (.ged) en importeer hem onder “Importeren/Exporteren” als nieuwe stamboom.',
          },
          {
            q: 'Een persoon komt dubbel voor.',
            a: 'Vul ontbrekende gegevens en relaties aan bij een van de twee en verwijder de andere.',
          },
          {
            q: 'Kan ik de app zonder muis bedienen?',
            a: 'Ja: Tab en Shift+Tab wisselen tussen elementen, Enter of spatiebalk activeert ze, Escape sluit dialoogvensters. Bij de eerste Tab verschijnt “Naar de inhoud”.',
          },
          {
            q: 'Waar worden mijn gegevens opgeslagen?',
            a: 'Op je eigen computer. In de desktop-app in de map %APPDATA%\\Cognatio (Windows) of ~/.config/Cognatio (Linux), in de draagbare variant in de map “data” naast het programma; als je de server zelf draait, in diens database en uploadmap. Alleen taal, kleurenschema en weergave-instellingen staan in de browser of het appvenster.',
          },
          {
            q: 'Hoe verhuis ik mijn gegevens naar een andere computer?',
            a: 'Kies onder Instellingen → Back-up “Back-up downloaden”, kopieer het bestand naar de andere computer, installeer daar Cognatio en kies “Back-up herstellen…”. Een enkele stamboom kan worden overgezet met de ZIP-export en -import onder “Importeren/Exporteren”.',
          },
          {
            q: 'Hoe werk ik de app bij?',
            a: 'De desktop-app zoekt zelf naar updates (Instellingen → Systeem → Programma-updates) en installeert ze bij het herstarten. De draagbare ZIP en het Debian-pakket werk je bij door de nieuwe versie te installeren; je gegevens blijven behouden.',
          },
        ],
      },
    ],
  },
];

export default help;
