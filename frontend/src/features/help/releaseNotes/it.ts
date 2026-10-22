import type { ReleaseNotes } from '../releases';

const notes: ReleaseNotes = {
  '1.1.0': {
    mcp: {
      title: 'Assistenti IA (MCP)',
      text: 'Gli assistenti IA come Claude possono consultare, cercare e, con il tuo permesso, modificare i tuoi alberi genealogici tramite il Model Context Protocol. Decidi per area cosa possono fare; ogni modifica compare in «Attività».',
    },
    reports: {
      title: 'Rapporti da stampare e in PDF',
      text: 'Scheda personale, scheda famiglia, elenco degli antenati (Kekulé) e dei discendenti (d’Aboville) – stampati o in PDF, nell’app desktop direttamente in un file.',
    },
    checks: {
      title: 'Possibili errori',
      text: 'Una nuova pagina elenca ciò che è consentito ma raramente vero – un uomo come madre, una madre di 60 anni, un matrimonio dopo la morte, possibili duplicati e altro – con link alle persone; ciò che è corretto si può segnare come tale. Una relazione che sembra errata viene salvata solo dopo una domanda.',
    },
    statistics: {
      title: 'Statistiche per continuare le ricerche',
      text: 'Ogni numero delle statistiche porta alle persone che rappresenta – un clic su una barra apre l’elenco delle persone con esattamente quelle persone. Si può scegliere l’ambito: antenati o discendenti di una persona, un cognome, anni di nascita. Le analisi sono suddivise in schede. «Che cosa manca ancora?» mostra lo stato della ricerca e porta alle lacune; «Antenati» mostra per generazione quanti antenati sono stati trovati, l’implesso e i rami aperti – a partire dalla nuova persona principale dell’albero. Una linea del tempo mostra nascite, decessi e matrimoni per decennio; «Le vite nel tempo» confronta durata della vita, età al matrimonio e al primo figlio nei secoli. Inoltre i nomi e la loro moda, le migrazioni della famiglia di luogo in luogo e i record dei defunti. Tutto si può stampare come report, salvare come PDF o copiare come CSV.',
    },
    places: {
      title: 'Suggerimenti di luoghi',
      text: 'I campi luogo di nascita, luogo di morte e luogo di un evento propongono i luoghi già presenti nell’albero genealogico, prima i più usati.',
    },
    dates: {
      title: 'Date scritte per esteso',
      text: 'I campi data accettano anche date scritte per esteso in ogni lingua dell’app, come «2 ottobre 1951» o «maggio 1951», e le trasformano in «02.10.1951» e «05.1951».',
    },
    anniversaries: {
      title: 'Ricorrenze nella pagina iniziale',
      text: 'La pagina iniziale elenca compleanni, anniversari di morte e di matrimonio dei prossimi 30 giorni, con l’età o gli anni trascorsi.',
    },
    sources: {
      title: 'Fonti e citazioni',
      text: 'Una raccolta di fonti e archivi per tutti gli alberi genealogici: una citazione registra pagina, data, trascrizione, affidabilità e scansioni e sostiene un numero qualsiasi di fatti – nome, nascita, morte, eventi e relazioni, anche di più persone. La pagina di una fonte mostra per persona ciò che sostiene ogni citazione; GEDCOM conserva le fonti degli altri programmi.',
    },
    files: {
      title: 'Visualizzare i file',
      text: 'Immagini, PDF, video, audio e file di testo come TXT, Markdown o CSV si aprono in una finestra con il nome del file come titolo; gli altri file vengono salvati subito. I media non hanno più un limite di dimensione per file, anche i video lunghi ci stanno. Un file che dal nome è un’immagine o un PDF ma non lo è viene rifiutato.',
    },
    activity: {
      title: 'Grandi quantità di dati e «Attività»',
      text: 'Esportazione, importazione, backup e ripristino gestiscono 50 GB e oltre con poca memoria e controllano prima lo spazio libero. «Attività» nella barra laterale mostra l’avanzamento di ogni operazione lunga; importazione e ripristino si possono annullare.',
    },
    search: {
      title: 'Nomi in cirillico',
      text: 'La ricerca tratta i nomi scritti in cirillico come la loro grafia latina: «Иванов» trova anche «Iwanow» e «Ivanov».',
    },
    'import-export': {
      title: 'Importazione nella tua lingua',
      text: 'Un’importazione GEDCOM scrive titoli degli eventi, etichette e date approssimative nella lingua dell’interfaccia. Importazione e ripristino avvisano quando qualcuno sarebbe antenato di sé stesso, e le note molto lunghe vengono suddivise invece di bloccarsi. L’esportazione GEDCOM scrive battesimi, professioni e residenze con i tag standard riconosciuti dagli altri programmi.',
    },
    relations: {
      title: 'Relazioni derivate più chiare',
      text: 'Il partner di un genitore diventa secondo genitore solo se il genitore ha esattamente un partner, e una relazione genitore-figlio viene salvata con le relazioni derivate per intero o per niente. I fratelli nati solo da una relazione genitore-figlio eliminata finiscono con essa nel cestino e tornano con essa; l’esportazione GEDCOM tralascia le relazioni nel cestino.',
    },
    'desktop-app': {
      title: 'PostgreSQL 18',
      text: 'L’app desktop usa PostgreSQL 18; i dati della versione 1.0.0 vengono convertiti automaticamente al primo avvio e la vecchia cartella del database resta per 30 giorni.',
    },
    settings: {
      title: 'Barra laterale a gruppi',
      text: 'La barra laterale raggruppa le aree sotto «Inserire», «Analizzare» e «Gestire»; «Importa/Esporta» ora si trova sotto «Gestire» e «Possibili errori» mostra quanti sono aperti. «Attività», «Cestino», «Impostazioni» e «Guida» restano in basso.',
    },
  },
  '1.0.0': {
    persons: {
      title: 'Persone con eventi di vita e file',
      text: 'Persone con date flessibili (esatta, mese, anno, «circa 1880» o intervallo), eventi di vita con luoghi, note, foto e documenti.',
    },
    relations: {
      title: 'Relazioni',
      text: 'Collega genitori, figli, partner e fratelli. La relazione inversa nasce da sola; sono possibili periodi ed etichette come «figlio adottivo».',
    },
    tree: {
      title: 'Viste dell’albero genealogico',
      text: 'Albero genealogico, albero degli antenati, albero dei discendenti e rete di relazioni, con zoom, persona al centro ed esportazione in PNG, SVG o PDF.',
    },
    search: {
      title: 'Ricerca',
      text: 'Trova i nomi anche con grafie simili, oltre a luoghi, professioni, eventi di vita e note.',
    },
    statistics: {
      title: 'Statistiche',
      text: 'Cifre chiave, distribuzione per età, cognomi e luoghi di nascita più frequenti e una panoramica delle generazioni.',
    },
    'family-trees': {
      title: 'Più alberi genealogici',
      text: 'Tieni alberi separati, per esempio per i due rami della famiglia, e passa dall’uno all’altro.',
    },
    'import-export': {
      title: 'Importazione ed esportazione',
      text: 'Scambia dati come ZIP (con i file) o come GEDCOM 5.5.1 e 7.0 con altri programmi di genealogia; importare di nuovo non crea duplicati.',
    },
    backup: {
      title: 'Backup',
      text: 'Backup automatici giornalieri, download di tutti i dati e ripristino guidato che salva prima lo stato attuale.',
    },
    trash: {
      title: 'Cestino',
      text: 'Le persone e gli alberi eliminati possono essere ripristinati.',
    },
    settings: {
      title: 'Lingue e aspetto',
      text: 'Dieci lingue (l’app si avvia nella lingua del sistema operativo), schemi di colori, caratteri e aspetto dell’albero.',
    },
    'desktop-app': {
      title: 'App desktop per Windows e Linux',
      text: 'Programma di installazione Windows o ZIP portatile, AppImage o pacchetto Debian per Linux: con database proprio, senza configurazione, si avvia con un clic, salva i dati prima di ogni aggiornamento e si aggiorna da sola (tranne lo ZIP portatile e il pacchetto Debian).',
    },
  },
};

export default notes;
