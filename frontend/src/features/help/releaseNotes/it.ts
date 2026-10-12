import type { ReleaseNotes } from '../releases';

const notes: ReleaseNotes = {
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
