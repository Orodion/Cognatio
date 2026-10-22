/** The few texts of the shell (everything else is the web app itself), in the ten languages of the app */
const en = {
  starting: 'Starting Cognatio …',
  errorTitle: 'Cognatio could not be started or ended unexpectedly.',
  backendEnded: 'The background service ended.',
  restart: 'Restart',
  openLogs: 'Open log folder',
  quit: 'Quit',
  updateReady: (version: string) => `Cognatio ${version} is ready.`,
  updateDetail: 'The update is installed on restart. Your data stays as it is.',
  restartNow: 'Restart now',
  later: 'Later',
};

export type Texts = typeof en;

export const TEXTS: Record<string, Texts> = {
  en,
  de: {
    starting: 'Cognatio wird gestartet …',
    errorTitle: 'Cognatio konnte nicht gestartet werden oder wurde unerwartet beendet.',
    backendEnded: 'Der Hintergrunddienst wurde beendet.',
    restart: 'Neu starten',
    openLogs: 'Protokoll öffnen',
    quit: 'Beenden',
    updateReady: (version) => `Cognatio ${version} ist bereit.`,
    updateDetail: 'Das Update wird beim Neustart installiert. Deine Daten bleiben erhalten.',
    restartNow: 'Jetzt neu starten',
    later: 'Später',
  },
  es: {
    starting: 'Iniciando Cognatio …',
    errorTitle: 'Cognatio no se pudo iniciar o se cerró de forma inesperada.',
    backendEnded: 'El servicio en segundo plano se detuvo.',
    restart: 'Reiniciar',
    openLogs: 'Abrir la carpeta de registros',
    quit: 'Salir',
    updateReady: (version) => `Cognatio ${version} está listo.`,
    updateDetail: 'La actualización se instalará al reiniciar. Sus datos se conservan.',
    restartNow: 'Reiniciar ahora',
    later: 'Más tarde',
  },
  fr: {
    starting: 'Démarrage de Cognatio …',
    errorTitle: 'Cognatio n’a pas pu démarrer ou s’est arrêté de manière inattendue.',
    backendEnded: 'Le service d’arrière-plan s’est arrêté.',
    restart: 'Redémarrer',
    openLogs: 'Ouvrir le dossier des journaux',
    quit: 'Quitter',
    updateReady: (version) => `Cognatio ${version} est prêt.`,
    updateDetail: 'La mise à jour sera installée au redémarrage. Vos données sont conservées.',
    restartNow: 'Redémarrer maintenant',
    later: 'Plus tard',
  },
  it: {
    starting: 'Avvio di Cognatio …',
    errorTitle: 'Impossibile avviare Cognatio, oppure è stato chiuso in modo imprevisto.',
    backendEnded: 'Il servizio in background è terminato.',
    restart: 'Riavvia',
    openLogs: 'Apri la cartella dei log',
    quit: 'Esci',
    updateReady: (version) => `Cognatio ${version} è pronto.`,
    updateDetail: 'L’aggiornamento verrà installato al riavvio. I tuoi dati restano invariati.',
    restartNow: 'Riavvia ora',
    later: 'Più tardi',
  },
  nl: {
    starting: 'Cognatio wordt gestart …',
    errorTitle: 'Cognatio kon niet worden gestart of is onverwacht afgesloten.',
    backendEnded: 'De achtergronddienst is gestopt.',
    restart: 'Opnieuw starten',
    openLogs: 'Logmap openen',
    quit: 'Afsluiten',
    updateReady: (version) => `Cognatio ${version} is klaar.`,
    updateDetail: 'De update wordt bij het opnieuw starten geïnstalleerd. Uw gegevens blijven behouden.',
    restartNow: 'Nu opnieuw starten',
    later: 'Later',
  },
  pl: {
    starting: 'Uruchamianie Cognatio …',
    errorTitle: 'Nie udało się uruchomić Cognatio lub program został nieoczekiwanie zamknięty.',
    backendEnded: 'Usługa w tle została zatrzymana.',
    restart: 'Uruchom ponownie',
    openLogs: 'Otwórz folder dziennika',
    quit: 'Zakończ',
    updateReady: (version) => `Wersja Cognatio ${version} jest gotowa.`,
    updateDetail: 'Aktualizacja zostanie zainstalowana przy ponownym uruchomieniu. Twoje dane pozostaną bez zmian.',
    restartNow: 'Uruchom ponownie teraz',
    later: 'Później',
  },
  pt: {
    starting: 'A iniciar o Cognatio …',
    errorTitle: 'Não foi possível iniciar o Cognatio, ou este terminou inesperadamente.',
    backendEnded: 'O serviço em segundo plano terminou.',
    restart: 'Reiniciar',
    openLogs: 'Abrir a pasta de registos',
    quit: 'Sair',
    updateReady: (version) => `O Cognatio ${version} está pronto.`,
    updateDetail: 'A atualização é instalada ao reiniciar. Os seus dados mantêm-se.',
    restartNow: 'Reiniciar agora',
    later: 'Mais tarde',
  },
  ru: {
    starting: 'Запуск Cognatio …',
    errorTitle: 'Не удалось запустить Cognatio, или программа неожиданно завершилась.',
    backendEnded: 'Фоновая служба остановилась.',
    restart: 'Перезапустить',
    openLogs: 'Открыть папку журнала',
    quit: 'Выйти',
    updateReady: (version) => `Версия Cognatio ${version} готова.`,
    updateDetail: 'Обновление будет установлено при перезапуске. Ваши данные сохранятся.',
    restartNow: 'Перезапустить сейчас',
    later: 'Позже',
  },
  uk: {
    starting: 'Запуск Cognatio …',
    errorTitle: 'Не вдалося запустити Cognatio, або програма несподівано завершилася.',
    backendEnded: 'Фонова служба зупинилася.',
    restart: 'Перезапустити',
    openLogs: 'Відкрити теку журналу',
    quit: 'Вийти',
    updateReady: (version) => `Версія Cognatio ${version} готова.`,
    updateDetail: 'Оновлення буде встановлено під час перезапуску. Ваші дані збережуться.',
    restartNow: 'Перезапустити зараз',
    later: 'Пізніше',
  },
};

/** Texts for the language of the operating system ("pt-BR" → pt); English for all others */
export const texts = (locale: string): Texts => TEXTS[locale.toLowerCase().split(/[-_]/)[0]] ?? en;

const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);

/** Page shown while the backend and the database start (a data: URL, no file needed) */
export function splashPage(message: string): string {
  const html = `<!doctype html><meta charset="utf-8"><title>Cognatio</title>
<style>html,body{height:100%;margin:0}body{display:flex;align-items:center;justify-content:center;font:18px system-ui,sans-serif;background:#f1ebe0;color:#2b2218}@media(prefers-color-scheme:dark){body{background:#13131f;color:#e4d6bd}}</style>
<body>${escapeHtml(message)}</body>`;
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}
