import type { HelpSection } from '../types';

const help: HelpSection[] = [
  {
    id: 'getting-started',
    title: 'Aan de slag',
    blocks: [
      {
        p: 'Cognatio beheert je stamboom: personen, hun relaties, levensgebeurtenissen, foto’s en documenten. Kies links een onderdeel en zoek bovenaan naar personen. De knop ? rechtsboven opent de help voor de pagina waarop je bent.',
      },
      {
        steps: [
          'Klik onder “Personen” op “Nieuwe persoon”, voer minstens de voornaam in en sla op.',
          'Voeg op de pagina van de persoon ouders, kinderen, partners of broers en zussen toe op het tabblad “Relaties” – kies een bestaande persoon of maak daar meteen een nieuwe aan.',
          'Bekijk het resultaat onder “Stamboom”. Met een hoofdpersoon toont de stamboom de familie vanuit het perspectief van die persoon.',
        ],
      },
      {
        p: 'De startpagina toont het aantal personen en de verdeling naar geslacht, snelkoppelingen naar de belangrijkste onderdelen, de laatst toegevoegde personen en een paar tips. De hulp heeft boven de hoofdstukken een eigen zoekveld. De kaart “Gedenkdagen” toont verjaardagen, sterfdagen en trouwdagen van de komende 30 dagen – voor datums met dag, maand en jaar; een trouwdag is het begin van een relatie echtgenoot/echtgenote.',
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
        p: 'Alleen de voornaam is verplicht. Is die onbekend, vink dan “Voornaam onbekend” aan – de app toont dan “(voornaam onbekend)”. Voer data in zover je ze kent: 04.01.1880 (exact), 01.1880 (maand), 1880 (jaar), “circa 1880”, “voor 1880”, “na 1880” of de periode “1880-1885”. De app herkent zelf de nauwkeurigheid. Een uitgeschreven datum zoals ‘2 oktober 1880’ wordt ‘02.10.1880’.',
      },
      {
        p: 'Wanneer je een persoon aanmaakt, wijst de app op bestaande personen met een vergelijkbare naam en hetzelfde geboortejaar – zodat er geen dubbelen ontstaan. De plaatsvelden – geboorte, overlijden en gebeurtenissen – stellen tijdens het typen de plaatsen voor die al in de stamboom voorkomen; elke andere plaats kan nog steeds worden ingevoerd.',
      },
      {
        list: [
          'Overzicht: persoonsgegevens, contact en overige gegevens; met “Bewerken” wijzig je ze.',
          'Tijdlijn: gebeurtenissen zoals geboorte, doop, huwelijk of verhuizing, met datum en plaats. Een gebeurtenis kan worden gekoppeld aan bestanden – ook aan bestanden van andere personen, bijv. een groepsfoto. De gebeurtenissen kunnen van oud naar nieuw of omgekeerd worden gesorteerd en als tijdlijn of als tabel worden getoond; de keuze wordt onthouden.',
          'Relaties: zie het onderdeel “Relaties”.',
          'Notities: vrije tekst, bijv. verhalen of onderzoeksaantekeningen, elk tot 10.000 tekens.',
          'Bestanden: upload foto’s en documenten (ook video’s, zonder maximale grootte per bestand); een afbeelding kan als profielfoto worden ingesteld. Met het downloadpictogram sla je een bestand op onder de oorspronkelijke naam. Een klik op een bestand toont het in een eigen venster met de naam als titel – afbeeldingen, PDF, video’s, audio en tekstbestanden (bijv. TXT, Markdown, CSV); andere bestanden zoals ZIP worden meteen opgeslagen.',
          'Bestanden kunnen als tegels of als lijst worden getoond (knoppen boven de bestanden).',
          'Bronnen: de bronvermeldingen van de persoon, van de gebeurtenissen en van de relaties – zie het onderdeel “Bronnen en bronvermeldingen”.',
          'Filter: het veld naast de tabbladen (behalve „Overzicht”) filtert de items van het geopende tabblad – levensloop, relaties, notities, bestanden of bronnen. Hoofdletters en accenten maken niet uit, bij meerdere woorden moeten ze allemaal voorkomen en de treffers worden gemarkeerd. Er wordt in alle teksten gezocht, bijv. titel, categorie, datum, plaats, beschrijving en bestandsnamen. Bij de relaties toont ook de grafiek alleen de overgebleven personen. De tekst blijft behouden bij het wisselen van tabblad; Esc of het kruisje wist hem.',
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
        p: 'Relaties voeg je toe op de pagina van een persoon, op het tabblad “Relaties”, of al bij het aanmaken van de persoon. Het soort relatie beschrijft de geselecteerde persoon vanuit het perspectief van de huidige persoon: sta je op de pagina van Anna en kies je Max als “Vader”, dan is Max de vader van Anna. De omgekeerde richting – Anna is het kind van Max – wordt automatisch getoond.',
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
        p: 'Sommige relaties worden automatisch toegevoegd: als een ouder en een kind worden gekoppeld, wordt de partner van de ouder ook ouder van het kind (als de ouder precies één partner heeft en het kind nog geen tweede ouder; bij meerdere partners voeg je de tweede ouder zelf toe; de relatie begint bij de geboorte van het kind als die precies bekend is), en de andere kinderen van de ouder worden broers en zussen van het kind. De verwijderknop naast een relatie verwijdert alleen de relatie – de personen blijven.',
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
        p: '“Exporteren” slaat de boom op als PNG of SVG of drukt hem af (ook als PDF), desgewenst alleen het zichtbare gedeelte. De app onthoudt weergave, generaties en hoofdpersoon; de standaardwaarden stel je in onder “Instellingen”. Op de pagina van een persoon opent “Stamboom tonen” de boom met die persoon als hoofdpersoon.',
      },
    ],
    link: { to: '/tree', label: 'Naar de stamboom' },
  },
  {
    id: 'sources',
    title: 'Bronnen en bronvermeldingen',
    blocks: [
      {
        p: 'Een bron is een document of werk waar gegevens vandaan komen – een kerkboek, een register van de burgerlijke stand, een volkstelling, een brief, een grafsteen, een website of een interview. Een bronvermelding is een akte daarin: pagina of aktenummer, datum, de akte woord voor woord, hoe betrouwbaar ze is, en scans. Eén bronvermelding kan willekeurig veel feiten onderbouwen, bijv. een huwelijksakte de bruidegom, de bruid, hun ouders, de getuigen, de bruiloft en het huwelijk.',
      },
      {
        p: 'Bronnen, archieven en bronvermeldingen vormen één verzameling voor alle stambomen: een gemeentearchief of kerkboek wordt één keer aangemaakt, en een bronvermelding kan feiten van personen in meerdere stambomen onderbouwen. Een wijziging aan een bron geldt overal.',
      },
      {
        list: [
          'Op de pagina van een persoon toont het tabblad “Bronnen” de bronvermeldingen van de persoon, van diens gebeurtenissen en van diens relaties, gegroepeerd per feit. “Bron vermelden” kiest het feit, een bron (of maakt er een aan) en een bestaande bronvermelding daaruit of een nieuwe. Een klein boek naast de naam, de geboorte, het overlijden, een gebeurtenis of een relatie laat zien hoeveel bronvermeldingen er zijn; een klik opent het tabblad.',
          '“Bronnen” in de zijbalk toont de bronnen die de geopende stamboom gebruikt en die nergens worden gebruikt; “Alle stambomen” toont de hele verzameling. De pagina van een bron toont haar velden, scans en bronvermeldingen met de feiten die elk onderbouwt, per persoon en met levensjaren; het × bij een feit verwijdert de koppeling; “Feiten koppelen” koppelt een bronvermelding na elkaar met meer personen.',
          'Archieven (burgerlijke stand, kerkarchief, bibliotheek, website) worden in het tweede tabblad beheerd en bij elke bron gekozen; een nieuw archief kan ook direct in het formulier van een bron worden aangemaakt.',
          'De betrouwbaarheid volgt de niveaus van GEDCOM: primaire bron (de oorspronkelijke akte), secundaire bron (later opgeschreven), twijfelachtig (bijv. mondelinge overlevering), onbetrouwbaar of geschat.',
          'Scans horen bij de hele bron (titelpagina, grafsteen) of bij een bronvermelding (de afzonderlijke pagina).',
          'De zoekfunctie bovenaan vindt ook bronnen – op titel, auteur, archief, inventarisnummer en de transcripties van hun bronvermeldingen; ze staan boven de gevonden personen. De statistieken tonen hoeveel personen een bronvermelding hebben en welke bronnen het vaakst worden vermeld.',
          'GEDCOM: de export schrijft archieven en bronnen als REPO- en SOUR-records en elke bronvermelding bij de feiten die ze onderbouwt (pagina, datum, transcriptie, betrouwbaarheid, scans in GEDZIP); de import neemt ook de bronnen van andere programma’s over – ook onder namen, gebeurtenissen en gezinnen – en maakt van gelijke bronvermeldingen weer één.',
        ],
      },
      {
        p: 'Wie een bron verwijdert, verplaatst haar met haar bronvermeldingen naar de prullenbak: ze verdwijnen bij alle feiten en keren terug bij het herstellen. Een archief in de prullenbak laat zijn bronnen tot het herstel zonder archief. Wordt een persoon, gebeurtenis, relatie of stamboom definitief verwijderd, dan verdwijnen alleen hun koppelingen; de bronnen blijven.',
      },
      {
        p: 'De export van een stamboom bevat de bronnen, archieven en bronvermeldingen die zijn personen gebruiken, met hun scans; een import gebruikt een bron die er al is, in plaats van haar te kopiëren. De transcriptie van een bronvermelding kan personen van een andere stamboom noemen – ze gaat mee met de export. Een exportbestand met bronnen kan alleen door deze of een nieuwere versie van Cognatio worden gelezen.',
      },
    ],
    link: { to: '/sources', label: 'Naar de bronnen' },
  },
  {
    id: 'search',
    title: 'Zoeken',
    blocks: [
      {
        p: 'Het zoekveld bovenaan doorzoekt de geopende stamboom: namen – ook vergelijkbare spellingen, dus “Meier” vindt ook “Mayer” en “Maier” –, persoonsgegevens zoals plaatsen en beroepen, de tijdlijn en de notities. Bij elk resultaat staat waarop het is gevonden. Namen in het Cyrillisch tellen als hun Latijnse spelling: ‘Иванов’ vindt ook ‘Iwanow’ en ‘Ivanov’. Ook bronnen worden gevonden; ze staan boven de gevonden personen (zie “Bronnen en bronvermeldingen”).',
      },
    ],
  },
  {
    id: 'statistics',
    title: 'Statistieken',
    blocks: [
      {
        p: 'De statistieken analyseren de geopende stamboom (zonder prullenbak), verdeeld over tabbladen: ‘Overzicht’ met kerncijfers zoals aantal personen, geslachten en gemiddelde levensduur, ‘Levens’ met de leeftijdsverdeling, ‘Namen en plaatsen’ met de meest voorkomende achternamen en geboorteplaatsen, ‘Voorouders’ met het overzicht van de generaties en ‘Bronnen’ met de gebruikte bronnen, de personen met minstens één bronvermelding en de meest geciteerde bronnen.',
      },
      {
        p: 'Elk getal dat personen telt, is een link: een klik op een kerncijfer, een balk of een generatie opent de personenlijst met precies die personen. Boven de lijst staat uit welke selectie ze komen; het × toont weer alle personen, ‘Terug naar de statistieken’ gaat terug. Een zoekopdracht bovenaan zoekt dan alleen onder deze personen.',
      },
      {
        p: 'Boven de tabbladen kies je de omvang: de hele stamboom, de voorouders of de nakomelingen van een persoon (telkens inclusief die persoon) of alle personen met een achternaam (ook als geboortenaam) – desgewenst alleen wie in bepaalde jaren geboren is. Alle getallen en lijsten volgen die keuze; alleen de bronnen gelden altijd voor de hele stamboom. De laatst gekozen omvang blijft per stamboom bewaard.',
      },
      {
        p: '‘Wat ontbreekt er nog?’ in het overzicht toont voor geboortedatum en -plaats, overlijdensdatum en -plaats (bij overledenen), vader, moeder, partner (bij overledenen vanaf 18), foto en bron bij hoeveel personen het gegeven is vastgelegd; de stand van het onderzoek is het gemiddelde van die aandelen. Een klik op de ontbrekende opent de lijst van personen bij wie nog iets te doen is.',
      },
      {
        p: '‘Voorouders’ toont per generatie hoeveel van de mogelijke voorouders (2 ouders, 4 grootouders, 8 overgrootouders …) gevonden zijn, wie meer dan eens voorkomt (kwartierverlies) en de open einden – voorouders bij wie vader of moeder nog ontbreekt. De analyse begint bij de hoofdpersoon van de stamboom, die je op de pagina van een persoon met ‘Hoofdpersoon’ instelt; ook rapporten en stamboom beginnen bij die persoon.',
      },
      {
        p: 'De tijdlijn in het overzicht toont geboorten, overlijdens of huwelijken per decennium; lege decennia blijven staan, zodat gaten in het onderzoek opvallen. Huwelijken zijn het begin van een huwelijk (relatie echtgenoot/echtgenote) of de gebeurtenis ‘huwelijk’, één keer per paar en jaar; levenspartners en partners tellen alleen mee met die gebeurtenis.',
      },
      {
        p: '‘Levens door de tijd’ onder ‘Levens’ toont per eeuw van geboorte, apart voor mannen en vrouwen, de gemiddelde levensduur – ook alleen van wie 15 werd –, de leeftijd bij het eerste huwelijk en bij de geboorte van het eerste kind; tussen haakjes op hoeveel personen de waarde berust, een gemiddelde van minder dan 5 personen wordt niet getoond. Daarbij het aantal kinderen per paar en het leeftijdsverschil van de partners.',
      },
      {
        p: '‘Namen en plaatsen’ toont ook de meest voorkomende voornamen van mannen en vrouwen – elke voornaam telt, ‘Johann Georg’ dus voor Johann en voor Georg – en de naammode per eeuw. ‘Migratie’ toont wie in de geboorteplaats overleed, de meest voorkomende wegen van geboorteplaats via verhuizingen naar overlijdensplaats en de plaatsen met hun personen en de periode van de gegevens daar.',
      },
      {
        p: '‘Records’ onder ‘Levens’ noemt het langste leven, het langste huwelijk, de meeste kinderen, partners en nakomelingen, de jongste en oudste ouders bij een geboorte en het grootste leeftijdsverschil van een paar – alleen van overledenen. Is een record ook een mogelijke fout, zoals een moeder van 61, dan staat er een hint met link bij.',
      },
      {
        p: '‘Afdrukken of als pdf opslaan’ opent het rapport ‘Statistieken’ met alle getallen van de gekozen omvang als tabellen. ‘Kopiëren als CSV’ op elke kaart zet de getallen op het klembord, om in een spreadsheet te plakken. AI-assistenten krijgen dezelfde getallen met het hulpmiddel ‘get_statistics’, ook voor een omvang.',
      },
    ],
    link: { to: '/statistics', label: 'Naar de statistieken' },
  },
  {
    id: 'checks',
    title: 'Mogelijke fouten',
    blocks: [
      {
        p: '‘Mogelijke fouten’ toont gegevens van de geopende stamboom die toegestaan zijn maar zelden kloppen – vaak een tikfout: een man als moeder of een vrouw als echtgenoot, partners die ook ouder en kind of broer en zus zijn, een kind met meer dan twee ouders, een ouder jonger dan 12 of een moeder ouder dan 55 bij de geboorte, een ouder die vóór de geboorte overleed, een partnerschap dat vóór de geboorte of na het overlijden van een partner begint, een overlijden vóór de geboorte, een leven van meer dan 110 jaar of iemand ouder dan 110 zonder overlijdensdatum, gebeurtenissen vóór de geboorte of na het overlijden, mogelijke dubbelen en personen die hun eigen voorouders zijn. Een geschatte datum zoals ‘rond 1880’ telt vijf jaar naar elke kant – alleen wat zeker niet klopt, wordt gemeld.',
      },
      {
        p: 'Elke regel noemt de personen met een link. Corrigeer de fout daar – de regel verdwijnt dan vanzelf – of klik op ‘Klopt’ als het gegeven juist is: de regel wordt dan verborgen, ook na een back-up en herstel. ‘Ook de als juist gemarkeerde tonen’ toont ze weer.',
      },
      {
        p: 'Sla je een relatie op die niet lijkt te kloppen, dan noemt de app de reden en vraagt of je haar toch wilt opslaan. Ook AI-assistenten moeten het je eerst vragen voordat ze zo’n relatie opslaan.',
      },
    ],
    link: { to: '/checks', label: 'Naar de mogelijke fouten' },
  },
  {
    id: 'reports',
    title: 'Rapporten',
    blocks: [
      {
        p: 'Onder “Rapporten” kunnen de gegevens van de geopende stamboom worden afgedrukt of als pdf opgeslagen: het persoonsblad (alle gegevens van een persoon met familieleden, gebeurtenissen, notities, foto’s en de bronnen als voetnoten – ook voor alle personen tegelijk), het gezinsblad (een paar met huwelijk, ouders en kinderen), de kwartierstaat met Kekulé-nummers (vader van n = 2n, moeder = 2n + 1; een voorouder die twee keer voorkomt verwijst naar het eerste nummer) en de parenteel met d’Aboville-nummers (1, 1.1, 1.1.2 …). De knop “Rapport” op de pagina van een persoon opent de rapporten met deze persoon als start.',
      },
      {
        p: 'Boven de voorbeeldweergave kies je foto’s, notities, bronnen, contactgegevens en of levende personen alleen met naam en geboortejaar verschijnen; de keuze wordt onthouden. “Afdrukken” opent het afdrukvenster. “Opslaan als pdf” vraagt in de desktop-app om de bestandsnaam en schrijft de pdf zelf; kies in een browser in het afdrukvenster “Opslaan als pdf” als printer. Elk blad begint op een nieuwe pagina en de pagina’s zijn genummerd.',
      },
    ],
    link: { to: '/reports', label: 'Naar rapporten' },
  },
  {
    id: 'family-trees',
    title: 'Meerdere stambomen',
    blocks: [
      {
        p: 'Je kunt meerdere stambomen gescheiden van elkaar bijhouden, bijv. de familie van vaders en van moeders kant. Elke persoon hoort bij precies één stamboom; alle pagina’s tonen alleen de geopende. Wisselen doe je met de keuze “Geopende stamboom” bovenaan in de zijbalk.',
      },
      {
        p: 'Op de pagina “Stambomen” maak je stambomen aan, hernoem, open of verwijder je ze. Een verwijderde stamboom gaat met alle gegevens naar de prullenbak; ook de laatste kan worden verwijderd – de app biedt dan aan een nieuwe aan te maken, een bestand te importeren of een stamboom terug te halen uit de prullenbak.',
      },
    ],
    link: { to: '/family-trees', label: 'Naar de stambomen' },
  },
  {
    id: 'import-export',
    title: 'Importeren/Exporteren',
    blocks: [
      {
        p: 'Exporteren en importeren gelden voor de geopende stamboom. De ZIP-export bevat alle gegevens en bestanden – voor een back-up of voor een andere Cognatio-installatie. GEDCOM (5.5.1 of 7.0) is het uitwisselingsformaat van andere genealogieprogramma’s zoals Ancestry, MyHeritage of Gramps, desgewenst met afbeeldingen en documenten. De bestanden mogen elke grootte hebben, ook boven 4 GB; onder “Instellingen → Gegevens en back-up” kun je een bovengrens instellen.',
      },
      {
        steps: [
          'Kies een bestand (ZIP van deze app of GEDCOM).',
          'Kies het doel: de geopende of een nieuwe stamboom. Bij GEDCOM-bestanden stelt de app een nieuwe stamboom voor.',
          'Het voorbeeld toont wat er verandert. Kies bij de geopende stamboom hoe je verdergaat.',
          '“Import uitvoeren”.',
        ],
      },
      {
        list: [
          'Samenvoegen – nieuwste wint: nieuwe personen worden toegevoegd; waar gegevens verschillen, geldt de nieuwste versie.',
          'Samenvoegen – handmatig beslissen: als hierboven, maar waar gegevens verschillen beslis je per persoon.',
          'Overschrijven: de geopende stamboom wordt volledig vervangen door het bestand; andere stambomen blijven ongewijzigd.',
        ],
      },
      {
        p: 'Wordt een GEDCOM-bestand opnieuw geïmporteerd, dan herkent de app bestaande personen en maakt ze niet dubbel aan. De importgeschiedenis toont eerdere imports. Zou iemand na de import zijn eigen voorouder zijn (een kringloop in de ouder-kindrelaties), dan noemt het voorbeeld de personen; de import wordt toch uitgevoerd en je corrigeert de relaties daarna met de hand.',
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
        p: 'Onder “Instellingen → Back-up” downloadt “Back-up downloaden” één bestand met alle stambomen, bestanden, de prullenbak en de importgeschiedenis. Afzonderlijke stambomen bewaar je via “Importeren/Exporteren”. Is onder “Maximale grootte” een bovengrens ingesteld, dan wordt een grotere back-up toch opgeslagen, maar die kan pas na het verhogen van de grens worden hersteld.',
      },
      {
        steps: [
          'Kies “Back-up herstellen…” en selecteer het back-upbestand – het wordt eerst gecontroleerd, er verandert nog niets.',
          'Controleer de vergelijking “Nu / In back-up”.',
          'Typ “VERWIJDEREN” ter bevestiging en kies “Herstellen”.',
        ],
      },
      {
        p: 'Alle huidige gegevens worden vervangen door de back-up. Daarvoor slaat de server de huidige staat op als bestand “cognatio_before_restore_…zip” – daarmee kun je het herstel ongedaan maken. De laatste drie van deze bestanden blijven bewaard; oudere verwijdert de server.',
      },
      {
        p: 'Grootte: exporteren, importeren, back-up en herstel lezen en schrijven bestanden stuk voor stuk – ook heel grote (50 GB en meer) hebben nauwelijks geheugen nodig. Vooraf controleert de app of er genoeg vrije ruimte op het station is; een herstel heeft ongeveer de ruimte van de back-up nodig plus die van de huidige gegevens, omdat het eerst de huidige stand volledig opslaat. “Activiteit” in de zijbalk toont de voortgang van deze bewerkingen en van het uploaden van bestanden, ook als je intussen een andere pagina hebt geopend, en somt de afgeronde op tot de app wordt gesloten; importeren en herstellen kunnen daar worden afgebroken tot de gegevens worden vervangen. Onder “Instellingen → Gegevens en back-up → Maximale grootte” kun je een bovengrens instellen (standaard geen). USB-sticks met FAT32 nemen hooguit 4 GB per bestand op – kies voor grote back-ups een station met exFAT of NTFS.',
      },
    ],
    link: { to: '/settings', label: 'Naar de instellingen' },
  },
  {
    id: 'trash',
    title: 'Prullenbak',
    blocks: [
      {
        p: 'In de prullenbak staan verwijderde personen van de geopende stamboom en verwijderde stambomen; het getal in de zijbalk toont hoeveel het er zijn. “Herstellen” haalt ze terug. “Definitief verwijderen” wist ook relaties, gebeurtenissen, notities en bestanden en kan alleen met een back-up ongedaan worden gemaakt. Daaronder staan bij “Bronnen en archieven” verwijderde bronnen en archieven; ze horen bij alle stambomen, en een bron neemt haar bronvermeldingen mee – bij het herstellen keren die terug bij alle feiten.',
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
          'AI-assistenten (MCP): of en wat AI-assistenten mogen (zie ‘AI-assistenten (MCP)’).',
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
    id: 'ai-assistants',
    title: 'AI-assistenten (MCP)',
    blocks: [
      {
        p: 'AI-assistenten zoals Claude (Claude Desktop, Claude Code) en andere programma’s die het Model Context Protocol (MCP) spreken, kunnen met je stambomen werken: personen opzoeken, vragen beantwoorden zoals ‘Welke voorouders kwamen uit Pommeren?’, hiaten aanwijzen en – als je dat toestaat – invoeren wat je dicteert of wat een gescande doopakte zegt.',
      },
      {
        p: 'Je schakelt het in onder Instellingen → ‘AI-assistenten (MCP)’. De app toont dan het adres en een token – het token maar één keer – met een kant-en-klare opdracht voor Claude Code en een configuratieblok voor andere programma’s. Assistenten verbinden alleen met deze computer; wat ze lezen, gaat naar de aanbieder van het AI-model dat je gebruikt.',
      },
      {
        steps: [
          'Instellingen → ‘AI-assistenten (MCP)’: vink ‘AI-assistenten toestaan’ aan. Adres en token verschijnen – het token alleen nu.',
          'Kopieer ‘Opdracht voor Claude Code’ en voer die één keer uit in een terminal (claude mcp add --transport http cognatio …). Met ‘--scope user’ na ‘--transport http’ geldt hij in elke map.',
          'Start Claude Code: ‘/mcp’ toont ‘cognatio’ als verbonden, met zijn tools.',
          'Vraag in je eigen woorden. Vink voor wijzigingen het niveau van het onderdeel aan (bijv. ‘Schrijven’ bij personen).',
        ],
      },
      {
        p: 'Je kunt bijvoorbeeld vragen:',
      },
      {
        list: [
          'Wie zijn de voorouders van Anna Kraft tot de overgrootouders, en wie van hen kwamen uit Pommeren?',
          'Welke personen zijn tussen 1850 en 1900 in Leipzig geboren? Zijn er mogelijke dubbelingen?',
          'Met ‘schrijven’: ‘Voeg een doop toe voor Anna Kraft op 2 oktober 1951 in Leipzig.’ of ‘Voer deze doopakte in met de bron.’',
          'Met de rechten voor bestanden: ‘Exporteer de stamboom als GEDCOM naar mijn map Documenten.’ of ‘Voeg de scan …\\taufschein.jpg toe aan de doop van Anna.’',
        ],
      },
      {
        list: [
          'Rechten per onderdeel: uit, lezen, schrijven (aanmaken, wijzigen, naar de prullenbak verplaatsen – in de app ongedaan te maken) en verwijderen (niet ongedaan te maken, bijv. een back-up terugzetten). Na het inschakelen staat elk onderdeel op ‘lezen’; voor ‘schrijven’ of ‘verwijderen’ vraagt de app eerst.',
          'Stambomen: een assistent ziet alleen de aangevinkte stambomen; nieuwe stambomen zijn zichtbaar.',
          'Bestanden gaan nooit via MCP: een assistent noemt een bestand op deze computer (in je gebruikers-, gegevens- of back-upmap), bijv. een scan om toe te voegen, een bestand om te importeren of een map voor een export.',
          'Elke wijziging van een assistent verschijnt onder ‘Activiteit’; het log heeft het filter ‘Alleen AI-assistenten (MCP)’.',
          'Token kwijt? ‘Nieuw token’ vervangt het en het oude werkt dan niet meer. Uitschakelen maakt het token meteen ongeldig.',
          'Het adres bevat de poort van de app, die tussen het starten gelijk blijft. Moest de desktop-app een andere nemen, dan zegt het onderdeel dat – de assistent heeft dan het nieuwe adres nodig.',
          'Een assistent kan de instellingen voor AI-assistenten nooit zelf wijzigen.',
        ],
      },
      {
        faq: [
          { q: 'De assistent krijgt ‘404’ of ‘MCP is uitgeschakeld’.', a: 'Vink in de instellingen ‘AI-assistenten toestaan’ aan.' },
          {
            q: 'De assistent krijgt ‘401’ of ‘token ontbreekt of is onjuist’.',
            a: 'Het token is vervangen of MCP is tussendoor uitgeschakeld. Maak een nieuw token en voeg de server opnieuw toe (‘claude mcp remove cognatio’, dan de nieuwe opdracht).',
          },
          {
            q: 'Een tool ontbreekt of antwoordt ‘NOT_ALLOWED’.',
            a: 'Het recht van zijn onderdeel is te laag – verhoog het in de instellingen; in Claude Code toont ‘/mcp’ de tools opnieuw.',
          },
          {
            q: 'De assistent kan helemaal geen verbinding maken.',
            a: 'Cognatio moet draaien. Zeggen de instellingen dat de poort is gewijzigd, voeg de server dan opnieuw toe met het nieuwe adres.',
          },
        ],
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
          { q: 'Ik ken een datum maar bij benadering.', a: 'Voer hem in zover je hem kent, bijv. “circa 1880”, “voor 1900” of “1880-1885”.' },
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
