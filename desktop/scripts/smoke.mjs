// Starts the real app (Electron + backend + bundled PostgreSQL) and checks the shell. Not part of the pipeline:
// it needs Windows or Linux with a display (xvfb-run is enough), the Electron binary and tools/postgres (npm run postgres:fetch).
//   npm run build -w backend -w frontend -w desktop && node desktop/scripts/smoke.mjs [--packaged <path to Cognatio.exe or the unpacked linux app>]
// Development build: Playwright drives the Electron of node_modules, also its main process (dialogs, menu). The installed
// app has --inspect switched off (fuses, see electron-builder.yml): it is started with --remote-debugging-port and only its
// page is driven – the checks that need the main process are reported as "skipped".
import { _electron as electron, chromium } from 'playwright-core';
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const desktopDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packagedIndex = process.argv.indexOf('--packaged');
const packagedExe = packagedIndex >= 0 ? path.resolve(process.argv[packagedIndex + 1]) : null;
// Folder names with umlaut and space: the usual Windows pitfall
const base = path.join(os.tmpdir(), 'Jürgen Müller Smoke');
const results = {};
const SKIPPED = 'skipped (installed app)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const APP_URL = /^http:\/\/127\.0\.0\.1:\d+\//;

const windows = process.platform === 'win32';
const postgresProcesses = () => {
  if (windows) {
    return execFileSync('tasklist', ['/FI', 'IMAGENAME eq postgres.exe', '/NH'], { encoding: 'utf8' })
      .split('\n')
      .filter((l) => l.includes('postgres.exe')).length;
  }
  try {
    return Number(execFileSync('pgrep', ['-c', '-x', 'postgres'], { encoding: 'utf8' }).trim());
  } catch {
    return 0; // pgrep exits with 1 when nothing matches
  }
};
/** Kills the backend: the Node utility process the main process of the app started */
const killBackend = (mainPid) =>
  windows
    ? execFileSync('powershell', [
        '-NoProfile',
        '-Command',
        `Get-CimInstance Win32_Process -Filter "ParentProcessId=${mainPid}" | Where-Object { $_.CommandLine -match 'node.mojom.NodeService' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }`,
      ])
    : execFileSync('pkill', ['-9', '-P', String(mainPid), '-f', 'node.mojom.NodeService']);

const freePort = () =>
  new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });

/** Development build through Playwright's Electron support (main process included) */
async function launchDevelopment(env) {
  const app = await electron.launch({ executablePath: (await import('electron')).default, args: ['.'], cwd: desktopDir, env, timeout: 180_000 });
  const closed = new Promise((resolve) => app.once('close', resolve));
  return {
    firstWindow: async () => {
      const page = await app.firstWindow({ timeout: 180_000 });
      await page.waitForURL(APP_URL, { timeout: 180_000 });
      return page;
    },
    main: (fn, arg) => app.evaluate(fn, arg),
    mainPid: () => app.evaluate(() => process.pid),
    closed,
    close: () => app.close().catch(() => undefined),
  };
}

/** Installed app: Chromium's DevTools protocol drives the page; the main process cannot be reached (fuses) */
async function launchPackaged(env) {
  const port = await freePort();
  const child = spawn(packagedExe, [`--remote-debugging-port=${port}`], { env, stdio: 'ignore' });
  const closed = new Promise((resolve) => child.once('exit', resolve));
  let browser = null;
  const connect = async () => {
    for (let i = 0; i < 360 && !browser; i++) {
      browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`).catch(() => null);
      if (!browser) {
        await sleep(500);
      }
    }
    if (!browser) {
      throw new Error('The app did not open its DevTools port');
    }
    return browser;
  };
  return {
    firstWindow: async () => {
      const connected = await connect();
      for (let i = 0; i < 360; i++) {
        const page = connected
          .contexts()
          .flatMap((context) => context.pages())
          .find((p) => APP_URL.test(p.url()));
        if (page) {
          return page;
        }
        await sleep(500);
      }
      throw new Error('The window of the app did not show the app');
    },
    main: null,
    mainPid: async () => child.pid,
    closed,
    close: async () => {
      // Like the Quit button: the app stops the database in order (a killed app would leave it running)
      const page = browser
        ?.contexts()
        .flatMap((context) => context.pages())
        .find((p) => APP_URL.test(p.url()));
      if (page && child.exitCode === null) {
        void page.evaluate(() => window.cognatioPlatform.quit()).catch(() => undefined);
        await Promise.race([closed, sleep(60_000)]);
      }
      await browser?.close().catch(() => undefined);
      if (child.exitCode === null) {
        if (windows) {
          execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
        } else {
          child.kill('SIGKILL');
        }
        await closed;
      }
    },
  };
}

const launch = (dataDir) => (packagedExe ? launchPackaged : launchDevelopment)({ ...process.env, COGNATIO_DATA_DIR: dataDir });

/** Replaces the message box: records what it shows and waits until `globalThis.__release()` is called */
const stubMessageBox = (app) =>
  app.main(({ dialog }) => {
    globalThis.__dialogs = [];
    dialog.showMessageBox = (options) =>
      new Promise((resolve) => {
        globalThis.__dialogs.push({ detail: options.detail, buttons: options.buttons });
        globalThis.__release = () => resolve({ response: options.buttons.length - 1 });
      });
  });
const waitForDialog = async (app) => {
  for (let i = 0; i < 120; i++) {
    const dialogs = await app.main(() => globalThis.__dialogs ?? []).catch(() => []);
    if (dialogs.length) {
      return dialogs[0];
    }
    await sleep(500);
  }
  throw new Error('No error dialog appeared');
};
const waitFor = async (check, timeoutMs) => {
  for (let i = 0; i < timeoutMs / 500; i++) {
    if (await check()) {
      return true;
    }
    await sleep(500);
  }
  return false;
};

// --- 1. Normal run
let firstOrigin = null;
{
  const dataDir = path.join(base, 'Cognatio Daten');
  fs.rmSync(base, { recursive: true, force: true });
  fs.mkdirSync(base, { recursive: true });
  const saved = path.join(base, 'gespeichert.txt');
  const app = await launch(dataDir);
  try {
    const page = await app.firstWindow();
    await page.waitForSelector('#root *', { timeout: 60_000 });
    results.url = page.url().replace(/:\d+/, ':PORT');
    results.title = await page.title();

    // Page and API work with the cookie; without it the backend refuses
    results.apiWithCookie = await page.evaluate(async () => (await fetch('/api/v1/health')).status);
    results.graphqlWithCookie = await page.evaluate(
      async () =>
        (
          await fetch('/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: '{ systemInfo { version } }' }),
          })
        ).status,
    );
    results.uploadsWithoutToken = await fetch(page.url() + 'uploads/x.jpg').then((r) => r.status);
    results.cookieHttpOnly = (await page.context().cookies()).find((c) => c.name === 'cognatio_token')?.httpOnly;
    results.scriptCannotReadToken = await page.evaluate(() => !document.cookie.includes('cognatio_token'));
    results.noNodeInPage = await page.evaluate(() => typeof require === 'undefined' && typeof process === 'undefined');

    if (app.main) {
      // Platform layer: "Save as" with a stubbed dialog; a Blob crosses the bridge
      await app.main(({ dialog }, file) => {
        dialog.showSaveDialog = async () => ({ canceled: false, filePath: file });
      }, saved);
      results.saveReported = await page.evaluate(() => window.cognatioPlatform.saveFile(new Blob(['Äpfel und Birnen']), 'test.txt'));
      results.savedContent = fs.existsSync(saved) ? fs.readFileSync(saved, 'utf8') : null;
      // A cancelled dialog is reported as such (the restore then does not start)
      await app.main(({ dialog }) => {
        dialog.showSaveDialog = async () => ({ canceled: true });
      });
      results.cancelReported = await page.evaluate(() => window.cognatioPlatform.saveFile(new Blob(['x']), 'test.txt'));
      results.noMenuBar = await app.main(({ Menu }) => Menu.getApplicationMenu() === null);
    } else {
      results.savedContent = results.noMenuBar = SKIPPED;
    }
    results.postgresRunning = postgresProcesses() > 0;
    // The app starts in the language of the operating system (first start, nothing stored)
    results.systemLanguages = await page.evaluate(() => navigator.languages.slice());
    results.appLanguage = await page.evaluate(() => document.documentElement.lang);
    // The Quit button of the sidebar is there (it only exists in the desktop app)
    results.quitButtons = await page.locator('aside button', { has: page.locator('svg.lucide-power') }).count();
    results.dataFolders = fs.readdirSync(dataDir).sort();
    // Kept for the next start (3b): same port, same origin, so the settings of the page survive
    firstOrigin = new URL(page.url()).origin;
    await page.evaluate(() => localStorage.setItem('cognatio-smoke', 'kept'));

    // --- 2. The backend is killed from outside (crash): error dialog, database is stopped
    if (app.main) {
      await stubMessageBox(app);
    }
    killBackend(await app.mainPid());
    if (app.main) {
      results.crashDialogButtons = (await waitForDialog(app)).buttons;
      results.postgresStoppedAfterCrash = postgresProcesses() === 0;
      await app.main(() => globalThis.__release());
      await app.closed;
    } else {
      // The shell stops the database before it shows its (native) error dialog
      results.crashDialogButtons = SKIPPED;
      results.postgresStoppedAfterCrash = await waitFor(() => postgresProcesses() === 0, 60_000);
    }
  } finally {
    await app.close();
  }
  await sleep(2000);
  results.postgresAfterClose = postgresProcesses();
  results.pidFileAfterClose = fs.existsSync(path.join(dataDir, 'pgdata', 'postmaster.pid'));
}

// --- 3. Start failure: the data folder is a file → error dialog names the problem
if (packagedExe) {
  results.startFailureDialog = SKIPPED;
} else {
  const blocker = path.join(base, 'ist-eine-datei');
  fs.writeFileSync(blocker, 'x');
  const app = await launch(blocker);
  try {
    await stubMessageBox(app);
    const dialog = await waitForDialog(app);
    results.startFailureDialog = { buttons: dialog.buttons, detail: String(dialog.detail).slice(0, 120) };
    await app.main(() => globalThis.__release());
    await app.closed;
  } finally {
    await app.close();
  }
}

// --- 3b. The Quit button of the app closes it and stops the database
{
  const dataDir = path.join(base, 'Cognatio Daten');
  const app = await launch(dataDir);
  try {
    const page = await app.firstWindow();
    results.sameOriginAfterRestart = new URL(page.url()).origin === firstOrigin;
    results.localStorageKept = await page.evaluate(() => {
      const value = localStorage.getItem('cognatio-smoke');
      localStorage.removeItem('cognatio-smoke');
      return value === 'kept';
    });
    await page.locator('aside button', { has: page.locator('svg.lucide-power') }).click();
    results.quitButtonClosesApp = await Promise.race([app.closed.then(() => true), sleep(60_000).then(() => false)]);
    await sleep(2000);
    results.postgresAfterQuitButton = postgresProcesses();
  } finally {
    await app.close();
  }
}

// --- 4. Second instance does not start a second app (single instance lock)
{
  const dataDir = path.join(base, 'Cognatio Daten');
  const first = await launch(dataDir);
  try {
    await first.firstWindow();
    if (packagedExe) {
      // The second process hands over to the first one and ends at once
      const second = spawn(packagedExe, [], { env: { ...process.env, COGNATIO_DATA_DIR: dataDir }, stdio: 'ignore' });
      const ended = await Promise.race([new Promise((resolve) => second.once('exit', () => resolve(true))), sleep(30_000).then(() => false)]);
      results.secondInstance = ended ? 'second process ended' : 'second process still running';
      if (!ended) {
        second.kill();
      }
    } else {
      const second = await launch(dataDir)
        .then((app) => app.firstWindow().then(() => app))
        .catch((err) => ({ error: String(err).split('\n')[0] }));
      results.secondInstance = second.error ?? 'second window opened';
      if (!second.error) {
        await second.close();
      }
    }
  } finally {
    await first.close();
  }
}

await sleep(2000);
results.postgresAtEnd = postgresProcesses();
console.log(JSON.stringify(results, null, 2));
fs.rmSync(base, { recursive: true, force: true });
