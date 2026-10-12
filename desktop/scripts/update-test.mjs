// Tests the update of the installed app: installs the old version, starts it with an update feed on this machine,
// lets it download and install the new version and checks that the new version runs with the old data.
// Not part of the pipeline (Windows, installers of two versions needed) – step of the release checklist.
//   node desktop/scripts/update-test.mjs --old <Cognatio-Setup-old.exe> --feed <folder with the new installer and latest.yml>
// Test version: add --beta, the folder then holds beta.yml (electron-builder writes it for a version like 1.0.1-beta.1)
// and the app is put on the beta channel first (the old installer must already know the channel).
// The installed app has --inspect switched off (fuses): it is started with --remote-debugging-port and driven through
// its page – the platform layer (window.cognatioPlatform) offers everything the test needs.
import { chromium } from 'playwright-core';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? path.resolve(process.argv[i + 1]) : null;
};
const oldInstaller = arg('--old');
const feedDir = arg('--feed');
const beta = process.argv.includes('--beta');
if (!oldInstaller || !feedDir) {
  console.error('Usage: node desktop/scripts/update-test.mjs --old <installer> --feed <folder>');
  process.exit(2);
}

const base = path.join(os.tmpdir(), 'Cognatio Update Test');
const installDir = path.join(base, 'Programm');
const dataDir = path.join(base, 'Daten');
const exe = path.join(installDir, 'Cognatio.exe');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const APP_URL = /^http:\/\/127\.0\.0\.1:\d+\//;
const results = {};
const processes = (image) =>
  execFileSync('tasklist', ['/FI', `IMAGENAME eq ${image}`, '/NH'], { encoding: 'utf8' })
    .split('\n')
    .filter((l) => l.includes(image)).length;
const freePort = () =>
  new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });

// The installed app keeps its browser profile in %APPDATA%\Cognatio whatever the data folder is – the folder of a real
// installation (with its family trees) must not be touched, so the test only runs where there is none (clean machine or VM)
const profileDir = path.join(process.env.APPDATA ?? '', 'Cognatio');
if (fs.existsSync(profileDir)) {
  console.error(`${profileDir} exists (an installed Cognatio with its data?) – run the test on a clean machine or VM, or move the folder away first.`);
  process.exit(2);
}

fs.rmSync(base, { recursive: true, force: true });
fs.mkdirSync(base, { recursive: true });
if (beta) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, 'desktop.json'), JSON.stringify({ updates: { check: true, channel: 'beta' } }));
}

// Update feed on this machine: the folder of the new version (latest.yml, installer, blockmap)
const server = http.createServer((req, res) => {
  const file = path.join(feedDir, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!file.startsWith(feedDir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { 'Content-Length': fs.statSync(file).size });
  fs.createReadStream(file).pipe(res);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const feedUrl = `http://127.0.0.1:${server.address().port}`;

const install = (installer) => spawnSync('cmd', ['/c', `"${installer}" /S /D=${installDir}`], { windowsVerbatimArguments: true, stdio: 'ignore' });

/** Starts the installed app and returns its page (the app itself, not the start page) */
async function launch() {
  const port = await freePort();
  const child = spawn(exe, [`--remote-debugging-port=${port}`], {
    env: { ...process.env, COGNATIO_DATA_DIR: dataDir, COGNATIO_UPDATE_URL: feedUrl },
    stdio: 'ignore',
  });
  const closed = new Promise((resolve) => child.once('exit', resolve));
  let browser = null;
  for (let i = 0; i < 360 && !browser; i++) {
    browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`).catch(() => null);
    if (!browser) {
      await sleep(500);
    }
  }
  if (!browser) {
    throw new Error('The app did not open its DevTools port');
  }
  for (let i = 0; i < 360; i++) {
    const page = browser
      .contexts()
      .flatMap((context) => context.pages())
      .find((p) => APP_URL.test(p.url()));
    if (page) {
      await page.waitForSelector('#root *', { timeout: 60_000 });
      return { page, browser, closed };
    }
    await sleep(500);
  }
  throw new Error('The window of the app did not show the app');
}
const gql = (page, query) =>
  page.evaluate(
    async (q) =>
      await (await fetch('/graphql', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q }) })).json(),
    query,
  );
/**
 * Version of the running program: Electron names it in the user agent ("Cognatio/1.0.1"). A test build with
 * -c.extraMetadata.version changes only that one, not the version of the backend, which is the fallback.
 */
const version = async (page) =>
  (await page.evaluate(() => navigator.userAgent.match(/Cognatio\/(\d\S*)/)?.[1])) ?? (await gql(page, '{ systemInfo { version } }')).data.systemInfo.version;

try {
  install(oldInstaller);
  await sleep(5000);
  let app = await launch();
  results.versionBefore = await version(app.page);
  results.channelBefore = await app.page.evaluate(async () => (await window.cognatioPlatform.updates.getSettings()).channel);
  await gql(app.page, 'mutation { createFamilyTree(data: { name: "Müller – vor dem Update" }) { id } }');

  // Look for the update and wait until it is downloaded; then "Restart now" (the same as the button in the dialog)
  await app.page.evaluate(() => window.cognatioPlatform.updates.checkNow());
  let state = null;
  for (let i = 0; i < 240 && state !== 'ready' && state !== 'error'; i++) {
    state = await app.page.evaluate(async () => (await window.cognatioPlatform.updates.getSettings()).status.state);
    if (state !== 'ready') {
      await sleep(1000);
    }
  }
  results.downloadState = state;
  if (state !== 'ready') {
    throw new Error(`The update was not downloaded (state ${state})`);
  }
  void app.page.evaluate(() => window.cognatioPlatform.updates.installNow()).catch(() => undefined);
  results.appClosedForUpdate = await Promise.race([app.closed.then(() => true), sleep(120_000).then(() => false)]);
  if (!results.appClosedForUpdate) {
    throw new Error('The app did not restart for the update');
  }

  // The installer runs and starts the new version; wait for it, then close that instance gracefully
  for (let i = 0; i < 120 && processes('Cognatio.exe') === 0; i++) {
    await sleep(1000);
  }
  results.relaunchedByInstaller = processes('Cognatio.exe') > 0;
  await sleep(15_000);
  spawnSync('taskkill', ['/IM', 'Cognatio.exe']);
  for (let i = 0; i < 60 && (processes('Cognatio.exe') > 0 || processes('postgres.exe') > 0); i++) {
    await sleep(1000);
  }

  app = await launch();
  results.versionAfter = await version(app.page);
  results.channelAfter = await app.page.evaluate(async () => (await window.cognatioPlatform.updates.getSettings()).channel);
  const trees = await gql(app.page, '{ familyTrees { name } }');
  results.dataKept = trees.data.familyTrees.map((t) => t.name);
  // The Quit button of the app: stops the database in order
  void app.page.evaluate(() => window.cognatioPlatform.quit()).catch(() => undefined);
  await Promise.race([app.closed, sleep(60_000)]);
  await sleep(3000);
  results.processesLeft = { cognatio: processes('Cognatio.exe'), postgres: processes('postgres.exe') };
} finally {
  server.close();
  spawnSync('taskkill', ['/F', '/IM', 'Cognatio.exe'], { stdio: 'ignore' });
  spawnSync('taskkill', ['/F', '/IM', 'postgres.exe'], { stdio: 'ignore' });
  const uninstaller = path.join(installDir, 'Uninstall Cognatio.exe');
  if (fs.existsSync(uninstaller)) {
    spawnSync(uninstaller, ['/S'], { stdio: 'ignore' });
    await sleep(8000);
  }
  // Only what this test created (it did not exist before, see above)
  fs.rmSync(profileDir, { recursive: true, force: true });
}
console.log(JSON.stringify(results, null, 2));
fs.rmSync(base, { recursive: true, force: true });
