import type { HelpSection } from '../types';

const help: HelpSection[] = [
  {
    id: 'getting-started',
    title: 'Per iniziare',
    blocks: [
      {
        p: 'Cognatio gestisce il tuo albero genealogico: persone, relazioni, eventi di vita, foto e documenti. Scegli un’area a sinistra e cerca le persone in alto. Il pulsante ? in alto a destra apre la guida della pagina in cui ti trovi.',
      },
      {
        steps: [
          'In «Persone» fai clic su «Nuova persona», inserisci almeno il nome e salva.',
          'Nella pagina della persona aggiungi genitori, figli, partner o fratelli nella scheda «Relazioni» – scegli una persona esistente o creane una nuova sul posto.',
          'Guarda il risultato in «Albero genealogico». Con una persona centrale, l’albero mostra la famiglia dal punto di vista di quella persona.',
        ],
      },
      {
        p: 'La pagina iniziale mostra il numero di persone e la distribuzione per sesso, accessi rapidi alle aree principali, le persone aggiunte per ultime e alcuni suggerimenti. La guida ha un proprio campo di ricerca sopra i capitoli.',
      },
      {
        p: 'Albero di esempio: al primo avvio l’app desktop crea l’albero genealogico «Familie Kraft (Demo)»: dieci persone inventate in quattro generazioni con relazioni, eventi di vita, note e foto, così puoi provare subito ogni area. Il contenuto è in tedesco. Per iniziare con i tuoi dati, crea un nuovo albero genealogico in «Alberi genealogici» ed elimina l’esempio (finisce nel cestino e non ricompare). Il file Cognatio-Demo-Familie-Kraft.zip si trova nella cartella del programma (cartella «demo» in «resources») e nella cartella «demo» del progetto; in Importa/Esporta puoi importarlo di nuovo come nuovo albero genealogico.',
      },
    ],
    link: { to: '/persons', label: 'Vai alle persone' },
  },
  {
    id: 'persons',
    title: 'Persone',
    blocks: [
      {
        p: 'Solo il nome è obbligatorio. Se non è noto, spunta «Nome sconosciuto» – l’app mostrerà «(nome sconosciuto)». Inserisci le date per quanto le conosci: 04.01.1880 (esatta), 01.1880 (mese), 1880 (anno), «circa 1880», «prima del 1880», «dopo il 1880» oppure l’intervallo «1880-1885». L’app riconosce da sola la precisione.',
      },
      {
        p: 'Quando crei una persona, l’app segnala le persone esistenti con un nome simile e lo stesso anno di nascita – così non si creano duplicati.',
      },
      {
        list: [
          'Panoramica: dati personali, contatti e altri dati; «Modifica» li cambia.',
          'Cronologia: eventi come nascita, battesimo, matrimonio o trasloco, con data e luogo. Un evento può essere collegato a file – anche di altre persone, ad es. una foto di gruppo. Gli eventi si possono ordinare dal più vecchio al più recente o al contrario e mostrare come cronologia o come tabella; la scelta viene ricordata.',
          'Relazioni: vedi la sezione «Relazioni».',
          'Note: testo libero, ad es. racconti o fonti, fino a 10.000 caratteri ciascuna.',
          'Media: carica foto e documenti (fino a 50 MB per file); un’immagine può essere impostata come foto del profilo. L’icona di download salva un file con il suo nome originale.',
          'I media si possono mostrare come riquadri o come elenco (pulsanti sopra i file).',
          'Filtro: il campo accanto alle schede (tranne «Panoramica») filtra le voci della scheda aperta: percorso di vita, relazioni, note o file. Maiuscole e accenti non contano, con più parole devono comparire tutte e i risultati sono evidenziati. Si cerca in tutti i testi, ad es. titolo, categoria, data, luogo, descrizione e nomi dei file. Nelle relazioni anche il grafico mostra solo le persone rimaste. Il testo resta quando cambi scheda; Esc o la X lo cancella.',
        ],
      },
      { p: '«Elimina» sposta la persona nel cestino – da lì può essere ripristinata.' },
    ],
    link: { to: '/persons', label: 'Vai alle persone' },
  },
  {
    id: 'relations',
    title: 'Relazioni',
    blocks: [
      {
        p: 'Le relazioni si aggiungono nella pagina di una persona, nella scheda «Relazioni», oppure già durante la creazione della persona. Il tipo di relazione descrive la persona selezionata dal punto di vista della persona attuale: se sei nella pagina di Anna e scegli Max come «Padre», Max è il padre di Anna. La direzione opposta – Anna è figlia di Max – viene mostrata automaticamente.',
      },
      {
        list: [
          'Tipi: madre, padre, figlio/a, fratello/sorella, marito, moglie, compagno/a di vita, partner, altro.',
          'Etichetta (facoltativa), ad es. «figlio adottivo» o «patrigno».',
          'Periodo dal – al, ad es. per un matrimonio; per un figlio viene suggerita come inizio la data di nascita.',
          'Se la persona non esiste ancora, scegli «Nuova persona» e creala direttamente nella finestra.',
          'Grafico: accanto all’elenco (sopra sugli schermi stretti) le relazioni della persona vengono disegnate come diagramma: genitori in alto, partner accanto, figli in basso. Un clic su una persona la apre; il pulsante «Grafico» lo nasconde o lo mostra e la scelta viene ricordata.',
        ],
      },
      {
        p: 'Alcune relazioni vengono aggiunte automaticamente: quando si collegano un genitore e un figlio, anche il partner del genitore diventa genitore del figlio (finché il figlio ha meno di due genitori; la relazione inizia con la nascita del figlio se è nota con precisione) e gli altri figli del genitore diventano fratelli del figlio. Il pulsante di eliminazione accanto a una relazione rimuove solo la relazione: le persone restano.',
      },
    ],
  },
  {
    id: 'tree',
    title: 'Vista dell’albero genealogico',
    blocks: [
      {
        list: [
          'Albero genealogico: tutte le famiglie dell’albero.',
          'Albero degli ascendenti: genitori, nonni ecc. della persona centrale.',
          'Albero dei discendenti: figli, nipoti ecc. della persona centrale.',
          'Rete di relazioni: tutti i collegamenti sotto forma di rete.',
        ],
      },
      {
        p: 'La persona centrale determina da chi viene disegnato l’albero; «Generazioni» limita la profondità. Puoi ingrandire e ridurre con la rotellina del mouse o la barra dello zoom; un clic su una persona apre la sua pagina. Il colore del bordo indica il sesso. Gli alberi molto grandi (da 400 persone) non vengono disegnati automaticamente – scegli allora una persona centrale e meno generazioni.',
      },
      {
        p: '«Esporta» salva l’albero come PNG o SVG oppure lo stampa (anche come PDF), a scelta solo l’area visibile. L’app ricorda vista, generazioni e persona centrale; i valori predefiniti si impostano in «Impostazioni». Nella pagina di una persona, «Mostra albero» apre l’albero con quella persona al centro.',
      },
    ],
    link: { to: '/tree', label: 'Vai all’albero genealogico' },
  },
  {
    id: 'search',
    title: 'Ricerca',
    blocks: [
      {
        p: 'Il campo di ricerca in alto cerca nell’albero genealogico aperto: nomi – anche grafie simili, quindi «Meier» trova anche «Mayer» e «Maier» –, dati personali come luoghi e professioni, la cronologia e le note. Per ogni risultato è indicato come è stato trovato.',
      },
    ],
  },
  {
    id: 'statistics',
    title: 'Statistiche',
    blocks: [
      {
        p: 'Le statistiche analizzano l’albero genealogico aperto (cestino escluso): cifre chiave come numero di persone, sessi e durata media della vita, la distribuzione per età, i cognomi più frequenti, i luoghi di nascita più frequenti e una panoramica delle generazioni.',
      },
    ],
    link: { to: '/statistics', label: 'Vai alle statistiche' },
  },
  {
    id: 'family-trees',
    title: 'Più alberi genealogici',
    blocks: [
      {
        p: 'Puoi tenere più alberi genealogici separati, ad es. la famiglia paterna e quella materna. Ogni persona appartiene a un solo albero; tutte le pagine mostrano solo quello aperto. Si cambia con la selezione «Albero genealogico aperto» in alto nella barra laterale.',
      },
      {
        p: 'Nella pagina «Alberi genealogici» crei, rinomini, apri o elimini gli alberi. Un albero eliminato finisce nel cestino con tutti i suoi dati; anche l’ultimo si può eliminare: l’app propone allora di crearne uno nuovo, importare un file o recuperare un albero dal cestino.',
      },
    ],
    link: { to: '/family-trees', label: 'Vai agli alberi genealogici' },
  },
  {
    id: 'import-export',
    title: 'Importa/Esporta',
    blocks: [
      {
        p: 'Esportazione e importazione riguardano l’albero genealogico aperto. L’esportazione ZIP contiene tutti i dati e i media – per un backup o per un’altra installazione di Cognatio. GEDCOM (5.5.1 o 7.0) è il formato di scambio di altri programmi di genealogia come Ancestry, MyHeritage o Gramps, a richiesta con immagini e documenti. Per impostazione predefinita un file può arrivare a 2 GB (modificabile in «Impostazioni → Dati e backup»); se i media di un albero sono più grandi, esporta senza media.',
      },
      {
        steps: [
          'Scegli un file (ZIP di questa app o GEDCOM).',
          'Scegli la destinazione: l’albero aperto o uno nuovo. Per i file GEDCOM l’app propone un nuovo albero.',
          'L’anteprima mostra cosa cambierà. Per l’albero aperto scegli come procedere.',
          '«Avvia importazione».',
        ],
      },
      {
        list: [
          'Unisci – vince il più recente: le nuove persone vengono aggiunte; dove i dati differiscono vale la versione più recente.',
          'Unisci – decidi manualmente: come sopra, ma dove i dati differiscono decidi tu per ogni persona.',
          'Sovrascrivi: l’albero aperto viene sostituito completamente dal file; gli altri alberi restano invariati.',
        ],
      },
      {
        p: 'Quando un file GEDCOM viene importato di nuovo, l’app riconosce le persone esistenti e non le crea due volte. La cronologia delle importazioni mostra le importazioni precedenti.',
      },
    ],
    link: { to: '/import-export', label: 'Vai a Importa/Esporta' },
  },
  {
    id: 'backup',
    title: 'Backup',
    blocks: [
      {
        p: 'Il server esegue automaticamente il backup del database e dei file, di default ogni giorno. Le impostazioni mostrano l’ultimo backup e avvisano se ha più di tre giorni.',
      },
      {
        p: 'In «Impostazioni → Backup», «Scarica backup» scarica un file con tutti gli alberi genealogici, i media, il cestino e la cronologia delle importazioni. I singoli alberi si salvano tramite «Importa/Esporta». Un backup che supera il limite di dimensione viene salvato, ma questa app non può ripristinarlo: salva allora anche i singoli alberi tramite «Importa/Esporta».',
      },
      {
        steps: [
          'Scegli «Ripristina backup…» e seleziona il file di backup – viene prima verificato, per ora non cambia nulla.',
          'Controlla il confronto «Ora / Nel backup».',
          'Digita «ELIMINA» per confermare e scegli «Ripristina».',
        ],
      },
      {
        p: 'Tutti i dati attuali vengono sostituiti dal backup. Prima, il server salva lo stato attuale in un file «cognatio_before_restore_…zip» – con cui si può annullare il ripristino. Gli ultimi tre di questi file vengono conservati; il server elimina quelli più vecchi.',
      },
      {
        p: 'Limite di dimensione: esportazione, importazione, backup e ripristino elaborano un file in memoria, per impostazione predefinita fino a 2 GB. In «Impostazioni → Dati e backup → Limiti di dimensione» un computer con molta memoria può consentire file più grandi. Oltre i 4 GB serve almeno il doppio della dimensione del file come memoria (RAM) libera; altrimenti l’app può diventare molto lenta o chiudersi; le impostazioni avvisano di questo. Un’esportazione troppo grande viene rifiutata, un backup troppo grande viene creato con un avviso.',
      },
    ],
    link: { to: '/settings', label: 'Vai alle impostazioni' },
  },
  {
    id: 'trash',
    title: 'Cestino',
    blocks: [
      {
        p: 'Il cestino contiene le persone eliminate dell’albero genealogico aperto e gli alberi genealogici eliminati; il numero nella barra laterale indica quanti sono. «Ripristina» li riporta indietro. «Elimina definitivamente» rimuove anche relazioni, eventi, note e media e si può annullare solo con un backup.',
      },
    ],
    link: { to: '/trash', label: 'Vai al cestino' },
  },
  {
    id: 'settings',
    title: 'Impostazioni',
    blocks: [
      {
        p: 'La lingua (che si cambia solo qui), lo schema di colori e i valori predefiniti dell’albero genealogico (vista, generazioni, persona centrale per albero) valgono per questo browser. Backup e stato del sistema valgono per l’intera applicazione.',
      },
      {
        list: [
          'Aspetto (i blocchi «Carattere e colori» e «Albero: aspetto»): carattere e dimensione, colore di evidenza, stile, spessore e colore delle linee dell’albero, dimensione e angoli delle schede, foto, date e nastro nero di lutto delle persone decedute sulle schede e colori del bordo in base al sesso, con anteprima dal vivo e «Ripristina predefiniti».',
          'Albero: comportamento: la vista, il numero di generazioni e la persona centrale con cui si apre l’albero.',
          'Dati e backup: salvare e ripristinare (vedi «Backup»).',
          'Sistema (sempre visibile): lingua (anche «Come il sistema operativo»), schema di colori, versione e stato di server e database, numero di persone e media, livello di log, il log di server e browser con un’esportazione per l’analisi degli errori (non contiene dati dell’albero), le licenze e, nell’app desktop, gli aggiornamenti del programma (vedi «App desktop»).',
        ],
      },
      {
        p: 'I blocchi si aprono e si chiudono con un clic («Espandi tutto» / «Comprimi tutto»). Il campo di ricerca sopra di essi trova un’impostazione, apre il suo blocco e salta al campo. Aspetto, lingua e valori predefiniti dell’albero vengono salvati in questo browser o in questa finestra dell’app.',
      },
    ],
    link: { to: '/settings', label: 'Vai alle impostazioni' },
  },
  {
    id: 'desktop-app',
    title: 'App desktop (Windows, Linux)',
    blocks: [
      {
        p: 'L’app desktop mostra Cognatio in una finestra propria, senza browser, Node o database da installare. Avvia in background il proprio database e lo termina quando si chiude la finestra o si sceglie «Esci» in fondo alla barra laterale. Può essere in esecuzione una sola istanza alla volta.',
      },
      {
        list: [
          'Windows: installare con il file di installazione (per utente, senza diritti di amministratore) oppure decomprimere lo ZIP portatile, che tiene tutti i dati in una cartella «data» accanto al programma.',
          'Linux: l’AppImage è un unico file; renderlo eseguibile e avviarlo, si aggiunge da solo al menu delle applicazioni. Il pacchetto Debian si installa con «sudo apt install ./Cognatio-….deb». Se è stato installato con «dpkg -i», «sudo apt --fix-broken install» aggiunge le librerie mancanti e completa la configurazione; altrimenti Cognatio non si avvia.',
          'I tuoi dati si trovano in %APPDATA%\\Cognatio su Windows e in ~/.config/Cognatio su Linux, separati dal programma: un aggiornamento o una disinstallazione non li elimina mai. Il programma di disinstallazione di Windows chiede se eliminare anche i dati; scarica prima un backup.',
          'Fai ogni tanto un backup (Impostazioni → Backup) e conservalo altrove. L’app salva inoltre automaticamente il proprio database prima di ogni aggiornamento e una volta al giorno.',
        ],
      },
      {
        p: 'In Impostazioni → Sistema → Aggiornamenti del programma, Cognatio cerca una nuova versione circa una volta al giorno (lì c’è l’interruttore; «Controlla ora» cerca subito). Viene inviata solo la richiesta del file di versione. Una nuova versione viene scaricata in background e installata al riavvio; prima il database viene salvato. «Anche versioni di prova (beta)» offre versioni prima della pubblicazione; tornare alle versioni pubblicate non installa mai una versione più vecchia. Lo ZIP portatile e il pacchetto Debian non vengono aggiornati dall’app: installa tu la nuova versione.',
      },
    ],
    link: { to: '/settings', label: 'Vai alle impostazioni' },
  },
  {
    id: 'versions',
    title: 'Cronologia delle versioni',
    blocks: [{ p: 'Cosa è cambiato in ogni versione, la più recente per prima. Un clic su una funzione porta al capitolo della guida corrispondente.' }],
  },
  {
    id: 'faq',
    title: 'Domande frequenti',
    blocks: [
      {
        faq: [
          { q: 'Ho eliminato una persona per errore.', a: 'Apri il cestino e scegli «Ripristina» per la persona.' },
          { q: 'Conosco una data solo in modo approssimativo.', a: 'Inseriscila per quanto la conosci, ad es. «circa 1880», «prima del 1900» o «1880-1885».' },
          {
            q: 'Come porto il mio albero genealogico da Ancestry, MyHeritage o un altro programma?',
            a: 'Esportalo lì come file GEDCOM (.ged) e importalo in «Importa/Esporta» come nuovo albero genealogico.',
          },
          {
            q: 'Una persona esiste due volte.',
            a: 'Completa i dati e le relazioni mancanti su una delle due ed elimina l’altra.',
          },
          {
            q: 'Posso usare l’app senza mouse?',
            a: 'Sì: Tab e Maiusc+Tab si spostano tra gli elementi, Invio o barra spaziatrice li attivano, Esc chiude le finestre. Al primo Tab compare «Vai al contenuto».',
          },
          {
            q: 'Dove vengono salvati i miei dati?',
            a: 'Sul tuo computer. Nell’app desktop nella cartella %APPDATA%\\Cognatio (Windows) o ~/.config/Cognatio (Linux), nella variante portatile nella cartella «data» accanto al programma; se gestisci il server in proprio, nel suo database e nella sua cartella di upload. Solo lingua, schema di colori e impostazioni di visualizzazione restano nel browser o nella finestra dell’app.',
          },
          {
            q: 'Come sposto i miei dati su un altro computer?',
            a: 'In Impostazioni → Backup scegli «Scarica backup», copia il file sull’altro computer, installa lì Cognatio e scegli «Ripristina backup…». Un singolo albero genealogico si può spostare con l’esportazione e l’importazione ZIP in «Importa/Esporta».',
          },
          {
            q: 'Come aggiorno l’app?',
            a: 'L’app desktop cerca da sola gli aggiornamenti (Impostazioni → Sistema → Aggiornamenti del programma) e li installa al riavvio. Lo ZIP portatile e il pacchetto Debian si aggiornano installando la nuova versione; i tuoi dati restano.',
          },
        ],
      },
    ],
  },
];

export default help;
