import { app, BrowserWindow, dialog, ipcMain, Menu, session, shell, type IpcMainInvokeEvent } from 'electron';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { autoUpdater } from 'electron-updater';
import { BackendStartError, newPort, startBackend, type BackendHandle } from './backend.js';
import { integrateAppImage } from './desktopEntry.js';
import { errorSummary, lastError, logSize } from './logs.js';
import { isSameOrigin } from './origin.js';
import { appPaths, dataDir as resolveDataDir } from './paths.js';
import { readSettings, writeSettings } from './settings.js';
import { splashPage, texts } from './texts.js';
import { updateFeeds } from './feeds.js';
import type { UpdateChannel } from './feeds.js';
import { UpdateManager } from './updater.js';
import { forkUtilityProcess } from './utilityBackend.js';

const packaged = app.isPackaged;
const t = texts(app.getLocale());

// Own folder name (not "Electron"); development uses its own data
app.setName('Cognatio');
// Portable variant: a file called `portable` next to the program keeps everything in `data/` next to it
const exeDir = path.dirname(process.execPath);
const portable = packaged && process.platform === 'win32' && fs.existsSync(path.join(exeDir, 'portable'));
const userData = portable ? path.join(exeDir, 'data', 'browser') : path.join(app.getPath('appData'), packaged ? 'Cognatio' : 'Cognatio-dev');
app.setPath('userData', userData);

const dataDir = resolveDataDir({ env: process.env, userData, portableDir: exeDir, hasPortableMarker: portable });
const paths = appPaths(packaged, process.resourcesPath, path.resolve(__dirname, '..', '..'));
const logFile = path.join(dataDir, 'logs', 'cognatio.log');

let window: BrowserWindow | null = null;
let backend: BackendHandle | null = null;
let quitting = false;

// COGNATIO_UPDATE_URL: another update feed (own server, tests); the portable variant is not updated
const feedUrl = process.env.COGNATIO_UPDATE_URL?.trim();
if (feedUrl) {
  autoUpdater.forceDevUpdateConfig = true;
}
const updates = new UpdateManager({
  updater: autoUpdater,
  dataDir,
  // On Linux only the AppImage can replace itself (APPIMAGE names the file); the portable variant exists on Windows only
  supported: (packaged && !portable && (process.platform !== 'linux' || !!process.env.APPIMAGE)) || !!feedUrl,
  feeds: updateFeeds(),
  onReady: (version) => void offerRestart(version),
});

// Only one instance: two programs on the same database folder would damage it
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (window) {
      if (window.isMinimized()) {
        window.restore();
      }
      window.focus();
    }
  });
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'Cognatio',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  win.once('ready-to-show', () => win.show());
  // Links to other websites open in the browser of the user, never inside the app window
  win.webContents.setWindowOpenHandler(({ url }) => {
    // A page of the app itself (e.g. the licence texts) opens in its own window: it needs the token cookie of the app
    if (backend && isSameOrigin(url, backend.origin)) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 900,
          height: 700,
          autoHideMenuBar: true,
          title: 'Cognatio',
          webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false },
        },
      };
    }
    if (/^https?:\/\//i.test(url)) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    const allowed = backend ? isSameOrigin(url, backend.origin) : url.startsWith('data:');
    if (!allowed) {
      event.preventDefault();
    }
  });
  win.on('closed', () => {
    window = null;
  });
  return win;
}

/** "Save as" dialog for files the app creates (backup, export); only from the page of the app itself */
function handleIpc() {
  // Only the page of the app itself may call the shell
  const fromApp = (event: IpcMainInvokeEvent) => {
    if (!backend || !isSameOrigin(event.senderFrame?.url, backend.origin) || !window) {
      throw new Error('Not allowed');
    }
  };
  ipcMain.handle('cognatio:updates-get', (event) => (fromApp(event), updates.view()));
  ipcMain.handle('cognatio:updates-set', (event, check: boolean) => (fromApp(event), updates.setCheck(check === true)));
  ipcMain.handle('cognatio:updates-channel', (event, channel: UpdateChannel) => (fromApp(event), updates.setChannel(channel === 'beta' ? 'beta' : 'stable')));
  ipcMain.handle('cognatio:updates-check', async (event) => (fromApp(event), updates.checkNow()));
  ipcMain.handle('cognatio:updates-install', async (event) => {
    fromApp(event);
    await installUpdate();
  });
  ipcMain.handle('cognatio:quit', (event) => {
    fromApp(event);
    void quit();
  });
  ipcMain.handle('cognatio:save-file', async (event: IpcMainInvokeEvent, data: ArrayBuffer, filename: string) => {
    fromApp(event);
    if (!window) {
      return false;
    }
    const result = await dialog.showSaveDialog(window, { defaultPath: path.basename(String(filename)) });
    if (result.canceled || !result.filePath) {
      return false;
    }
    await fs.promises.writeFile(result.filePath, Buffer.from(data));
    return true;
  });
}

function setupMenu() {
  // No menu bar at all: the window shows only the app (copy and paste still work in text fields)
  Menu.setApplicationMenu(null);
}

/** After a crash of the backend its database server may still be running: stop it so the data is closed cleanly */
function stopStrayDatabase(): Promise<void> {
  const pgCtl = path.join(paths.pgDir, 'bin', process.platform === 'win32' ? 'pg_ctl.exe' : 'pg_ctl');
  return new Promise((resolve) => {
    execFile(pgCtl, ['stop', '-D', path.join(dataDir, 'pgdata'), '-m', 'fast', '-w', '-t', '30'], { windowsHide: true }, () => resolve());
  });
}

async function showError(message: string, canRestart: boolean) {
  const buttons = canRestart ? [t.restart, t.openLogs, t.quit] : [t.openLogs, t.quit];
  const { response } = await dialog.showMessageBox({
    type: 'error',
    title: 'Cognatio',
    message: t.errorTitle,
    detail: message,
    buttons,
    defaultId: 0,
    cancelId: buttons.length - 1,
  });
  const choice = buttons[response];
  if (choice === t.openLogs) {
    await shell.openPath(path.dirname(logFile));
    return showError(message, canRestart);
  }
  return choice === t.restart ? 'restart' : 'quit';
}

async function launch(): Promise<void> {
  window = window ?? createWindow();
  void window.loadURL(splashPage(t.starting));
  // Log entries before this point belong to an earlier run and are no reason for a failure of this one
  const logStart = logSize(logFile);
  // Always the same port: the page keeps its settings in the local storage of its origin (address with port)
  const savedPort = readSettings(dataDir).port;
  try {
    backend = await startBackend({
      entry: paths.backendEntry,
      cwd: paths.backendDir,
      spawn: forkUtilityProcess,
      port: savedPort ?? newPort(),
      env: {
        COGNATIO_DATA_DIR: dataDir,
        COGNATIO_PG_DIR: paths.pgDir,
        COGNATIO_DEMO_FILE: paths.demoFile,
        FRONTEND_DIR: paths.frontendDir,
        MIGRATIONS_DIR: paths.migrationsDir,
      },
    });
  } catch (err) {
    backend = null;
    await stopStrayDatabase();
    // The log of the backend first; a crash before its logger exists is only in the error output
    const detail =
      lastError(logFile, undefined, logStart) ??
      errorSummary(err instanceof BackendStartError ? err.stderr : '') ??
      (err instanceof Error ? err.message : String(err));
    if ((await showError(detail, true)) === 'restart') {
      return launch();
    }
    return quit();
  }

  const current = backend;
  // First start, or the saved port was taken and the backend took another one: from now on this one
  if (current.port !== savedPort) {
    try {
      writeSettings(dataDir, { ...readSettings(dataDir), port: current.port });
    } catch {
      // Only the settings of the page are lost at the next start; the app works anyway
    }
  }
  // The token travels as a cookie only for this address (not in the URL, not readable by scripts of the page)
  await session.defaultSession.cookies.set({ url: current.origin, name: 'cognatio_token', value: current.token, httpOnly: true, sameSite: 'strict' });
  void current.exited.then(async () => {
    if (quitting || backend !== current) {
      return;
    }
    backend = null;
    await stopStrayDatabase();
    const detail = lastError(logFile, undefined, logStart) ?? errorSummary(current.stderr()) ?? t.backendEnded;
    if ((await showError(detail, true)) === 'restart') {
      await launch();
    } else {
      await quit();
    }
  });
  await window.loadURL(current.origin);
  updates.start();
  addToMenu();
}

/** AppImage: puts the program into the application menu of the user (COGNATIO_NO_DESKTOP_ENTRY=1 switches it off) */
function addToMenu() {
  const appImage = process.env.APPIMAGE;
  if (process.platform !== 'linux' || !packaged || !appImage || process.env.COGNATIO_NO_DESKTOP_ENTRY) {
    return;
  }
  try {
    const dataHome = process.env.XDG_DATA_HOME?.trim() || path.join(app.getPath('home'), '.local', 'share');
    integrateAppImage({ appImage, iconFile: path.join(process.resourcesPath, 'icon.png'), dataHome });
  } catch {
    // The menu entry is a convenience; the program works without it
  }
}

/** Stops the backend (and with it the database) in order; nothing may run from the program folder before an update */
async function stopBackend() {
  const running = backend;
  backend = null;
  if (running && (await running.stop()) !== 0) {
    // Killed or ended with an error: its database server may still run and would lock files of the program folder
    await stopStrayDatabase();
  }
}

async function quit() {
  quitting = true;
  updates.stop();
  await stopBackend();
  app.quit();
}

async function installUpdate() {
  quitting = true;
  updates.stop();
  await stopBackend();
  updates.installNow();
}

async function offerRestart(version: string) {
  const { response } = await dialog.showMessageBox({
    type: 'info',
    title: 'Cognatio',
    message: t.updateReady(version),
    detail: t.updateDetail,
    buttons: [t.restartNow, t.later],
    defaultId: 0,
    cancelId: 1,
  });
  if (response === 0) {
    await installUpdate();
  }
}

app.on('before-quit', (event) => {
  if (!quitting && backend) {
    // The database has to be stopped in order first
    event.preventDefault();
    void quit();
  }
});
app.on('window-all-closed', () => void quit());

if (gotLock) {
  void app.whenReady().then(() => {
    handleIpc();
    setupMenu();
    // Nothing is allowed that the app does not need (camera, location, notifications …)
    session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
    // Downloads (media under their original name) only from the backend of the app; Electron then asks where to save
    session.defaultSession.on('will-download', (event, item) => {
      if (!backend || !isSameOrigin(item.getURL(), backend.origin)) {
        event.preventDefault();
        return;
      }
      item.setSaveDialogOptions({ defaultPath: path.join(app.getPath('downloads'), path.basename(item.getFilename())) });
    });
    return launch();
  });
}
