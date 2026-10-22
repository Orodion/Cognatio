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
        p: 'La pagina iniziale mostra il numero di persone e la distribuzione per sesso, accessi rapidi alle aree principali, le persone aggiunte per ultime e alcuni suggerimenti. La guida ha un proprio campo di ricerca sopra i capitoli. La scheda «Ricorrenze» elenca compleanni, anniversari di morte e di matrimonio dei prossimi 30 giorni – per date con giorno, mese e anno; un anniversario di matrimonio è l’inizio di una relazione marito/moglie.',
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
        p: 'Solo il nome è obbligatorio. Se non è noto, spunta «Nome sconosciuto» – l’app mostrerà «(nome sconosciuto)». Inserisci le date per quanto le conosci: 04.01.1880 (esatta), 01.1880 (mese), 1880 (anno), «circa 1880», «prima del 1880», «dopo il 1880» oppure l’intervallo «1880-1885». L’app riconosce da sola la precisione. Una data scritta per esteso, come «2 ottobre 1880», diventa «02.10.1880».',
      },
      {
        p: 'Quando crei una persona, l’app segnala le persone esistenti con un nome simile e lo stesso anno di nascita – così non si creano duplicati. I campi luogo – nascita, morte ed eventi – propongono durante la digitazione i luoghi già presenti nell’albero genealogico; resta possibile inserire qualsiasi altro luogo.',
      },
      {
        list: [
          'Panoramica: dati personali, contatti e altri dati; «Modifica» li cambia.',
          'Cronologia: eventi come nascita, battesimo, matrimonio o trasloco, con data e luogo. Un evento può essere collegato a file – anche di altre persone, ad es. una foto di gruppo. Gli eventi si possono ordinare dal più vecchio al più recente o al contrario e mostrare come cronologia o come tabella; la scelta viene ricordata.',
          'Relazioni: vedi la sezione «Relazioni».',
          'Note: testo libero, ad es. racconti o appunti di ricerca, fino a 10.000 caratteri ciascuna.',
          'Media: carica foto e documenti (anche video, senza limite di dimensione per file); un’immagine può essere impostata come foto del profilo. L’icona di download salva un file con il suo nome originale. Un clic su un file lo mostra in una finestra propria con il suo nome come titolo: immagini, PDF, video, audio e file di testo (ad es. TXT, Markdown, CSV); gli altri file, come gli ZIP, vengono salvati subito.',
          'I media si possono mostrare come riquadri o come elenco (pulsanti sopra i file).',
          'Fonti: le citazioni della persona, dei suoi eventi e delle sue relazioni – vedi la sezione «Fonti e citazioni».',
          'Filtro: il campo accanto alle schede (tranne «Panoramica») filtra le voci della scheda aperta: percorso di vita, relazioni, note, file o fonti. Maiuscole e accenti non contano, con più parole devono comparire tutte e i risultati sono evidenziati. Si cerca in tutti i testi, ad es. titolo, categoria, data, luogo, descrizione e nomi dei file. Nelle relazioni anche il grafico mostra solo le persone rimaste. Il testo resta quando cambi scheda; Esc o la X lo cancella.',
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
        p: 'Alcune relazioni vengono aggiunte automaticamente: quando si collegano un genitore e un figlio, anche il partner del genitore diventa genitore del figlio (se il genitore ha esattamente un partner e il figlio non ha ancora un secondo genitore; con più partner il secondo genitore va aggiunto a mano; la relazione inizia con la nascita del figlio se è nota con precisione) e gli altri figli del genitore diventano fratelli del figlio. Il pulsante di eliminazione accanto a una relazione rimuove solo la relazione: le persone restano.',
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
    id: 'sources',
    title: 'Fonti e citazioni',
    blocks: [
      {
        p: 'Una fonte è un documento o un’opera da cui provengono i dati – un registro parrocchiale, un registro di stato civile, un censimento, una lettera, una lapide, un sito web o un’intervista. Una citazione è un atto al suo interno: pagina o numero dell’atto, data, l’atto parola per parola, quanto è affidabile e scansioni. Una citazione può documentare un numero qualsiasi di fatti, ad es. un atto di matrimonio lo sposo, la sposa, i loro genitori, i testimoni, le nozze e il matrimonio.',
      },
      {
        p: 'Fonti, archivi e citazioni formano una raccolta per tutti gli alberi: un ufficio di stato civile o un registro parrocchiale si crea una volta sola, e una citazione può documentare fatti di persone in più alberi. Una modifica a una fonte vale ovunque.',
      },
      {
        list: [
          'Nella pagina di una persona, la scheda «Fonti» elenca le citazioni della persona, dei suoi eventi e delle sue relazioni, raggruppate per fatto. «Cita fonte» sceglie il fatto, una fonte (o ne crea una) e una sua citazione già esistente o una nuova. Un piccolo libro accanto al nome, alla nascita, alla morte, a un evento o a una relazione mostra quante citazioni ha; un clic apre la scheda.',
          '«Fonti» nella barra laterale elenca le fonti usate dall’albero aperto e quelle non usate da nessuna parte; «Tutti gli alberi» mostra l’intera raccolta. La pagina di una fonte mostra i suoi campi, le scansioni e le citazioni con i fatti documentati da ciascuna, ordinati per persona e con gli anni di vita; la × di un fatto toglie il collegamento; «Collega fatti» collega una citazione con altre persone, una dopo l’altra.',
          'Gli archivi (ufficio di stato civile, archivio parrocchiale, biblioteca, sito web) si gestiscono nella seconda scheda e si scelgono per ogni fonte; se ne può anche creare uno nuovo direttamente nel modulo di una fonte.',
          'L’affidabilità segue i livelli di GEDCOM: fonte primaria (l’atto originale), fonte secondaria (scritta in seguito), dubbia (ad es. tradizione orale), inaffidabile o stimata.',
          'Le scansioni appartengono all’intera fonte (frontespizio, lapide) o a una citazione (la singola pagina).',
          'La ricerca in alto trova anche le fonti – per titolo, autore, archivio, segnatura e le trascrizioni delle loro citazioni; sono elencate sopra le persone trovate. Le statistiche mostrano quante persone hanno una citazione e quali fonti sono le più citate.',
          'GEDCOM: l’esportazione scrive archivi e fonti come record REPO e SOUR e ogni citazione presso i fatti che documenta (pagina, data, trascrizione, affidabilità, scansioni nel GEDZIP); l’importazione riprende anche le fonti di altri programmi – anche sotto nomi, eventi e famiglie – e riunisce in una le citazioni uguali.',
        ],
      },
      {
        p: 'Eliminando una fonte, questa finisce nel cestino insieme alle sue citazioni: scompaiono da tutti i fatti e tornano con il ripristino. Un archivio nel cestino lascia le sue fonti senza archivio finché non viene ripristinato. L’eliminazione definitiva di una persona, un evento, una relazione o un albero toglie solo i loro collegamenti; le fonti restano.',
      },
      {
        p: 'L’esportazione di un albero contiene le fonti, gli archivi e le citazioni usati dalle sue persone, con le scansioni; un’importazione riutilizza una fonte già presente invece di copiarla. La trascrizione di una citazione può nominare persone di un altro albero – viene esportata insieme. Un file di esportazione con fonti può essere letto solo da questa versione di Cognatio o da una più recente.',
      },
    ],
    link: { to: '/sources', label: 'Vai alle fonti' },
  },
  {
    id: 'search',
    title: 'Ricerca',
    blocks: [
      {
        p: 'Il campo di ricerca in alto cerca nell’albero genealogico aperto: nomi – anche grafie simili, quindi «Meier» trova anche «Mayer» e «Maier» –, dati personali come luoghi e professioni, la cronologia e le note. Per ogni risultato è indicato come è stato trovato. I nomi scritti in cirillico valgono come la loro grafia latina: «Иванов» trova anche «Iwanow» e «Ivanov». Trova anche le fonti, elencate sopra le persone trovate (vedi «Fonti e citazioni»).',
      },
    ],
  },
  {
    id: 'statistics',
    title: 'Statistiche',
    blocks: [
      {
        p: 'Le statistiche analizzano l’albero genealogico aperto (cestino escluso), suddivise in schede: «Panoramica» con cifre chiave come numero di persone, sessi e durata media della vita, «Vite» con la distribuzione per età, «Nomi e luoghi» con i cognomi e i luoghi di nascita più frequenti, «Antenati» con il quadro delle generazioni e «Fonti» con le fonti usate, le persone con almeno una citazione e le fonti più citate.',
      },
      {
        p: 'Ogni numero che conta persone è un link: un clic su una cifra chiave, una barra o una generazione apre l’elenco delle persone con esattamente quelle persone. Sopra l’elenco è indicata la selezione da cui provengono; la × mostra di nuovo tutte le persone, «Torna alle statistiche» riporta indietro. Una ricerca in alto cerca allora solo tra queste persone.',
      },
      {
        p: 'Sopra le schede si sceglie l’ambito: tutto l’albero, gli antenati o i discendenti di una persona (lei compresa) o tutte le persone di un cognome (anche come cognome di nascita) – se si vuole, solo quelle nate in certi anni. Tutti i numeri e gli elenchi lo seguono; solo le fonti riguardano sempre tutto l’albero. L’ultimo ambito scelto resta per ciascun albero.',
      },
      {
        p: '«Che cosa manca ancora?» nella panoramica mostra per data e luogo di nascita, data e luogo di morte (dei deceduti), padre, madre, partner (dei deceduti dai 18 anni), foto e fonte per quante persone il dato è registrato; lo stato della ricerca è la media di queste quote. Un clic su quelli mancanti apre l’elenco delle persone per cui resta qualcosa da fare.',
      },
      {
        p: '«Antenati» mostra per generazione quanti degli antenati possibili (2 genitori, 4 nonni, 8 bisnonni …) sono stati trovati, chi compare più volte (implesso) e i rami aperti – antenati a cui manca ancora il padre o la madre. L’analisi parte dalla persona principale dell’albero, impostata con «Persona principale» nella pagina di una persona; anche report e albero partono da lei.',
      },
      {
        p: 'La linea del tempo nella panoramica mostra nascite, decessi o matrimoni per decennio; i decenni vuoti restano, così le lacune della ricerca saltano all’occhio. I matrimoni sono l’inizio di un matrimonio (relazione marito/moglie) o l’evento «matrimonio», una volta per coppia e anno; conviventi e partner contano solo con questo evento.',
      },
      {
        p: '«Le vite nel tempo», sotto «Vite», mostra per secolo di nascita, separatamente per uomini e donne, la durata media della vita – anche solo di chi ha compiuto 15 anni –, l’età al primo matrimonio e alla nascita del primo figlio; tra parentesi su quante persone si basa il valore, una media di meno di 5 persone non viene mostrata. Inoltre il numero di figli per coppia e la differenza d’età tra partner.',
      },
      {
        p: '«Nomi e luoghi» mostra anche i nomi più frequenti di uomini e donne – ogni nome conta, quindi «Johann Georg» per Johann e per Georg – e la moda dei nomi per secolo. «Migrazioni» mostra chi è morto nel luogo di nascita, i percorsi più frequenti dal luogo di nascita, attraverso i traslochi, al luogo di morte, e i luoghi con le loro persone e il periodo dei dati che vi si svolgono.',
      },
      {
        p: '«Record», sotto «Vite», indica la vita più lunga, il matrimonio più lungo, il maggior numero di figli, partner e discendenti, i genitori più giovani e più anziani a una nascita e la maggiore differenza d’età di una coppia – solo di persone decedute. Se un record è anche un possibile errore, come una madre di 61 anni, accanto c’è un avviso con link.',
      },
      {
        p: '«Stampa o salva come PDF» apre il report «Statistiche» con tutti i numeri dell’ambito scelto in tabelle. «Copia come CSV» su ogni scheda mette i suoi numeri negli appunti, da incollare in un foglio di calcolo. Gli assistenti IA ottengono gli stessi numeri con lo strumento «get_statistics», anche per un ambito.',
      },
    ],
    link: { to: '/statistics', label: 'Vai alle statistiche' },
  },
  {
    id: 'checks',
    title: 'Possibili errori',
    blocks: [
      {
        p: '«Possibili errori» elenca i dati dell’albero aperto che sono consentiti ma raramente veri, spesso un errore di battitura: un uomo inserito come madre o una donna come marito, partner che sono anche genitore e figlio o fratelli, un figlio con più di due genitori, un genitore con meno di 12 anni o una madre con più di 55 alla nascita, un genitore morto prima della nascita, un’unione che inizia prima della nascita o dopo la morte di un partner, una morte prima della nascita, una vita di più di 110 anni o una persona di oltre 110 anni senza data di morte, eventi prima della nascita o dopo la morte, possibili duplicati e persone che sono antenati di sé stesse. Una data approssimativa come «circa 1880» conta cinque anni in ogni direzione: viene segnalato solo ciò che sicuramente non torna.',
      },
      {
        p: 'Ogni voce nomina le persone con un link. Correggi l’errore lì – la voce scompare da sola – oppure fai clic su «È corretto» se il dato è giusto: la voce viene nascosta, anche dopo un backup e un ripristino. «Mostra anche quelli segnati come corretti» li mostra di nuovo.',
      },
      {
        p: 'Se salvi una relazione che sembra errata, l’app indica il motivo e chiede se vuoi salvarla comunque. Anche gli assistenti IA devono chiederti conferma prima di salvare una relazione simile.',
      },
    ],
    link: { to: '/checks', label: 'Vai ai possibili errori' },
  },
  {
    id: 'reports',
    title: 'Rapporti',
    blocks: [
      {
        p: 'In «Rapporti» i dati dell’albero genealogico aperto si possono stampare o salvare come PDF: la scheda personale (tutti i dati di una persona con parenti, eventi, note, foto e le fonti come note a piè di pagina – anche per tutte le persone insieme), la scheda famiglia (una coppia con matrimonio, genitori e figli), l’elenco degli antenati con numeri Kekulé (padre di n = 2n, madre = 2n + 1; un antenato presente due volte rimanda al primo numero) e l’elenco dei discendenti con numeri d’Aboville (1, 1.1, 1.1.2 …). Il pulsante «Rapporto» nella pagina di una persona apre i rapporti con questa persona come inizio.',
      },
      {
        p: 'Sopra l’anteprima scegli foto, note, fonti, contatti e se le persone viventi compaiono solo con nome e anno di nascita; la scelta viene ricordata. «Stampa» apre la finestra di stampa. «Salva come PDF» nell’app desktop chiede il nome del file e scrive il PDF da sé; in un browser scegli «Salva come PDF» come stampante nella finestra di stampa. Ogni scheda inizia su una nuova pagina e le pagine sono numerate.',
      },
    ],
    link: { to: '/reports', label: 'Vai ai rapporti' },
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
        p: 'Esportazione e importazione riguardano l’albero genealogico aperto. L’esportazione ZIP contiene tutti i dati e i media – per un backup o per un’altra installazione di Cognatio. GEDCOM (5.5.1 o 7.0) è il formato di scambio di altri programmi di genealogia come Ancestry, MyHeritage o Gramps, a richiesta con immagini e documenti. I file possono avere qualsiasi dimensione, anche oltre 4 GB; in «Impostazioni → Dati e backup» si può impostare un limite massimo.',
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
        p: 'Quando un file GEDCOM viene importato di nuovo, l’app riconosce le persone esistenti e non le crea due volte. La cronologia delle importazioni mostra le importazioni precedenti. Se dopo l’importazione qualcuno fosse il proprio antenato (un ciclo nelle relazioni genitore-figlio), l’anteprima indica le persone; l’importazione viene eseguita comunque e poi correggi le relazioni a mano.',
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
        p: 'In «Impostazioni → Backup», «Scarica backup» scarica un file con tutti gli alberi genealogici, i media, il cestino e la cronologia delle importazioni. I singoli alberi si salvano tramite «Importa/Esporta». Se in «Limiti di dimensione» è impostato un limite massimo, un backup più grande viene comunque salvato, ma si può ripristinare solo dopo aver alzato il limite.',
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
        p: 'Dimensione: esportazione, importazione, backup e ripristino leggono e scrivono i file un pezzo alla volta – anche quelli molto grandi (50 GB e oltre) richiedono pochissima memoria. Prima l’app controlla che sull’unità ci sia abbastanza spazio libero; un ripristino richiede circa lo spazio del backup più quello dei dati attuali, perché prima salva completamente lo stato attuale. «Attività» nella barra laterale mostra il progresso di queste operazioni e dei caricamenti di media, anche se nel frattempo hai aperto un’altra pagina, ed elenca quelle concluse finché l’app non viene chiusa; lì importazione e ripristino si possono annullare finché i dati non vengono sostituiti. In «Impostazioni → Dati e backup → Limiti di dimensione» si può impostare un limite massimo (nessuno per impostazione predefinita). Le chiavette USB con FAT32 accettano al massimo 4 GB per file – per backup grandi scegli un’unità con exFAT o NTFS.',
      },
    ],
    link: { to: '/settings', label: 'Vai alle impostazioni' },
  },
  {
    id: 'trash',
    title: 'Cestino',
    blocks: [
      {
        p: 'Il cestino contiene le persone eliminate dell’albero genealogico aperto e gli alberi genealogici eliminati; il numero nella barra laterale indica quanti sono. «Ripristina» li riporta indietro. «Elimina definitivamente» rimuove anche relazioni, eventi, note e media e si può annullare solo con un backup. Sotto, «Fonti e archivi» elenca le fonti e gli archivi eliminati; appartengono a tutti gli alberi genealogici, e una fonte porta con sé le sue citazioni: ripristinandola tornano a tutti i fatti.',
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
          'Assistenti IA (MCP): se e cosa possono fare gli assistenti IA (vedi «Assistenti IA (MCP)»).',
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
    id: 'ai-assistants',
    title: 'Assistenti IA (MCP)',
    blocks: [
      {
        p: 'Gli assistenti IA come Claude (Claude Desktop, Claude Code) e altri programmi che parlano il Model Context Protocol (MCP) possono lavorare con i tuoi alberi genealogici: cercare persone, rispondere a domande come «Quali antenati venivano dalla Pomerania?», indicare lacune e, se lo permetti, inserire ciò che detti o ciò che dice un atto parrocchiale scansionato.',
      },
      {
        p: 'Si attiva in Impostazioni → «Assistenti IA (MCP)». L’app mostra allora l’indirizzo e un token – il token una sola volta – con un comando pronto per Claude Code e un blocco di configurazione per altri programmi. Gli assistenti si collegano solo a questo computer; ciò che leggono arriva al fornitore del modello di IA che usi.',
      },
      {
        steps: [
          'Impostazioni → «Assistenti IA (MCP)»: spunta «Consenti gli assistenti IA». Compaiono indirizzo e token – il token solo ora.',
          'Copia «Comando per Claude Code» ed eseguilo una volta in un terminale (claude mcp add --transport http cognatio …). Con «--scope user» dopo «--transport http» vale in ogni cartella.',
          'Avvia Claude Code: «/mcp» mostra «cognatio» come collegato, con i suoi strumenti.',
          'Chiedi con parole tue. Per le modifiche spunta il livello dell’area (ad es. «Scrivere» per le persone).',
        ],
      },
      {
        p: 'Per esempio puoi chiedere:',
      },
      {
        list: [
          'Chi sono gli antenati di Anna Kraft fino ai bisnonni, e quali venivano dalla Pomerania?',
          'Quali persone sono nate tra il 1850 e il 1900 a Lipsia? Ci sono possibili duplicati?',
          'Con «scrivere»: «Aggiungi un battesimo di Anna Kraft il 2 ottobre 1951 a Lipsia.» oppure «Inserisci questo atto parrocchiale con la sua fonte.»',
          'Con i permessi per i file: «Esporta l’albero come GEDCOM nella mia cartella Documenti.» oppure «Aggiungi la scansione …\\taufschein.jpg al battesimo di Anna.»',
        ],
      },
      {
        list: [
          'Permessi per area: disattivato, leggere, scrivere (creare, modificare, spostare nel cestino – annullabile nell’app) ed eliminare (non annullabile, ad es. ripristinare un backup). Dopo l’attivazione ogni area è su «leggere»; prima di «scrivere» o «eliminare» l’app chiede conferma.',
          'Alberi genealogici: un assistente vede solo gli alberi spuntati; i nuovi alberi sono visibili.',
          'I file non passano mai per MCP: un assistente indica un file di questo computer (nella cartella utente, dati o backup), ad es. una scansione da aggiungere, un file da importare o una cartella per un’esportazione.',
          'Ogni modifica di un assistente compare in «Attività»; il log ha il filtro «Solo assistenti IA (MCP)».',
          'Token perso? «Nuovo token» lo sostituisce e quello vecchio smette di funzionare. Disattivando, il token non vale più subito.',
          'L’indirizzo contiene la porta dell’app, che resta uguale tra un avvio e l’altro. Se l’app desktop ha dovuto prenderne un’altra, la sezione lo dice: l’assistente ha allora bisogno del nuovo indirizzo.',
          'Un assistente non può mai modificare da solo le impostazioni degli assistenti IA.',
        ],
      },
      {
        faq: [
          { q: 'L’assistente riceve «404» o «MCP è disattivato».', a: 'Spunta «Consenti gli assistenti IA» nelle impostazioni.' },
          {
            q: 'L’assistente riceve «401» o «token mancante o errato».',
            a: 'Il token è stato sostituito o MCP è stato disattivato nel frattempo. Crea un nuovo token e aggiungi di nuovo il server («claude mcp remove cognatio», poi il nuovo comando).',
          },
          {
            q: 'Manca uno strumento o risponde «NOT_ALLOWED».',
            a: 'Il permesso della sua area è troppo basso: alzalo nelle impostazioni; in Claude Code «/mcp» rilegge gli strumenti.',
          },
          {
            q: 'L’assistente non riesce proprio a collegarsi.',
            a: 'Cognatio deve essere in esecuzione. Se le impostazioni dicono che la porta è cambiata, aggiungi di nuovo il server con il nuovo indirizzo.',
          },
        ],
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
