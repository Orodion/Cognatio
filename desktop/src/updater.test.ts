import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { readSettings, writeSettings } from './settings.js';
import { UpdateManager, type UpdaterLike } from './updater.js';

/** Stand-in for electron-updater: records calls and lets the test fire its events */
class FakeUpdater extends EventEmitter {
  autoDownload = false;
  autoInstallOnAppQuit = false;
  channel: string | null = null;
  allowDowngrade = true;
  feeds: string[] = [];
  checks = 0;
  installed: Array<[boolean | undefined, boolean | undefined]> = [];
  onCheck: () => void | Promise<void> = () => undefined;
  setFeedURL(options: { provider: 'generic'; url: string }) {
    this.feeds.push(options.url);
  }
  async checkForUpdates() {
    this.checks++;
    await this.onCheck();
  }
  quitAndInstall(silent?: boolean, forceRun?: boolean) {
    this.installed.push([silent, forceRun]);
  }
}

let dir: string;
let updater: FakeUpdater;
let managers: UpdateManager[];

const FEEDS = { stable: 'https://example.test/stable', beta: 'https://example.test/beta' };

const manager = (options: { supported?: boolean; onReady?: (v: string) => void; startDelayMs?: number; intervalMs?: number; feeds?: typeof FEEDS } = {}) => {
  const m = new UpdateManager({ updater: updater as unknown as UpdaterLike, dataDir: dir, supported: options.supported ?? true, ...options });
  managers.push(m);
  return m;
};

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cognatio-updater-'));
  updater = new FakeUpdater();
  managers = [];
});
afterEach(() => {
  managers.forEach((m) => m.stop());
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('settings', () => {
  it('defaults to checking for updates and survives a damaged file', () => {
    assert.deepEqual(readSettings(dir), { updates: { check: true, channel: 'stable' } });
    fs.writeFileSync(path.join(dir, 'desktop.json'), '{ broken');
    assert.deepEqual(readSettings(dir), { updates: { check: true, channel: 'stable' } });
  });

  it('keeps the port of the backend and ignores an invalid one', () => {
    writeSettings(dir, { updates: { check: true, channel: 'stable' }, port: 23456 });
    assert.equal(readSettings(dir).port, 23456);
    // Switching the updates off keeps the port
    manager().setCheck(false);
    assert.deepEqual(readSettings(dir), { updates: { check: false, channel: 'stable' }, port: 23456 });
    for (const port of [80, 70000, 1.5, '23456']) {
      fs.writeFileSync(path.join(dir, 'desktop.json'), JSON.stringify({ port }));
      assert.equal(readSettings(dir).port, undefined);
    }
  });
});

describe('UpdateManager', () => {
  it('downloads in the background and installs when the app is closed', () => {
    manager();
    assert.equal(updater.autoDownload, true);
    assert.equal(updater.autoInstallOnAppQuit, true);
  });

  it('follows the events of the updater', async () => {
    const m = manager();
    updater.onCheck = () => {
      updater.emit('checking-for-update');
      updater.emit('update-not-available');
    };
    assert.deepEqual(await m.checkNow(), { state: 'up-to-date' });

    updater.onCheck = () => updater.emit('update-available', { version: '1.2.0' });
    assert.deepEqual(await m.checkNow(), { state: 'downloading', version: '1.2.0' });
    // while it downloads there is no second check
    const before = updater.checks;
    await m.checkNow();
    assert.equal(updater.checks, before);
  });

  it('reports the ready update once and installs on request', () => {
    const ready: string[] = [];
    const m = manager({ onReady: (v) => ready.push(v) });
    updater.emit('update-downloaded', { version: '1.2.0' });
    updater.emit('update-downloaded', { version: '1.2.0' });
    assert.deepEqual(ready, ['1.2.0']);
    assert.deepEqual(m.view().status, { state: 'ready', version: '1.2.0' });
    m.installNow();
    assert.deepEqual(updater.installed, [[true, true]]);
  });

  it('shows errors from the updater and from a failing check', async () => {
    const m = manager();
    updater.onCheck = () => updater.emit('error', new Error('feed not found'));
    assert.deepEqual(await m.checkNow(), { state: 'error', message: 'feed not found' });
    updater.onCheck = () => Promise.reject(new Error('offline'));
    updater.emit('checking-for-update');
    assert.deepEqual(await m.checkNow(), { state: 'error', message: 'offline' });
  });

  it('shortens what the server answered instead of showing a page of HTML', async () => {
    const m = manager();
    updater.onCheck = () =>
      updater.emit(
        'error',
        new Error('403 "method: GET url: https://gitlab.com/users/sign_in Data: <!DOCTYPE html><html><title>Just a moment...</title></html>"'),
      );
    assert.deepEqual(await m.checkNow(), {
      state: 'error',
      message: 'The update server answered with HTTP 403. Is the project public and does it have a release?',
    });
    updater.emit('checking-for-update');
    updater.onCheck = () => Promise.reject(new Error('<p>Something   went</p> <b>wrong</b> ' + 'x'.repeat(300)));
    const { message } = await m.checkNow();
    assert.match(message, /^Something went wrong x+ …$/);
    assert.ok(message.length < 215);
  });

  it('reads the stable channel from the stable feed, never downgrades', () => {
    manager({ feeds: FEEDS });
    assert.equal(updater.channel, 'latest');
    assert.equal(updater.allowDowngrade, false);
    assert.deepEqual(updater.feeds, [FEEDS.stable]);
  });

  it('switches to the beta channel and back: stored, feed and file name follow', () => {
    const m = manager({ feeds: FEEDS });
    const beta = m.setChannel('beta');
    assert.equal(beta.channel, 'beta');
    assert.equal(readSettings(dir).updates.channel, 'beta');
    assert.equal(updater.channel, 'beta');
    assert.equal(updater.feeds.at(-1), FEEDS.beta);
    assert.equal(m.setChannel('stable').channel, 'stable');
    assert.equal(updater.channel, 'latest');
    assert.equal(updater.feeds.at(-1), FEEDS.stable);
    // the switch for the regular check is untouched
    assert.equal(readSettings(dir).updates.check, true);
  });

  it('starts on the beta channel when the user chose it before', () => {
    fs.writeFileSync(path.join(dir, 'desktop.json'), JSON.stringify({ updates: { check: true, channel: 'beta' } }));
    const m = manager({ feeds: FEEDS });
    assert.equal(m.view().channel, 'beta');
    assert.equal(updater.channel, 'beta');
    assert.deepEqual(updater.feeds, [FEEDS.beta]);
  });

  it('ignores unknown channel names in the file', () => {
    fs.writeFileSync(path.join(dir, 'desktop.json'), JSON.stringify({ updates: { channel: 'nightly' } }));
    assert.equal(readSettings(dir).updates.channel, 'stable');
  });

  it('does nothing where there is nothing to update (portable, development)', async () => {
    const m = manager({ supported: false });
    assert.equal(m.view().supported, false);
    assert.equal(m.view().status.state, 'off');
    await m.checkNow();
    assert.equal(updater.checks, 0);
  });

  it('stores the switch; "off" stops the regular checks but "check now" still works', async () => {
    const m = manager({ startDelayMs: 5, intervalMs: 20 });
    m.start();
    await new Promise((r) => setTimeout(r, 60));
    assert.ok(updater.checks >= 2, 'regular checks run');

    const off = m.setCheck(false);
    assert.equal(off.check, false);
    assert.equal(off.status.state, 'off');
    assert.equal(readSettings(dir).updates.check, false);
    const count = updater.checks;
    await new Promise((r) => setTimeout(r, 60));
    assert.equal(updater.checks, count, 'no check while off');

    await m.checkNow();
    assert.equal(updater.checks, count + 1);

    assert.equal(m.setCheck(true).check, true);
    assert.equal(readSettings(dir).updates.check, true);
  });

  it('does not start the regular checks when the user switched them off before', async () => {
    fs.writeFileSync(path.join(dir, 'desktop.json'), JSON.stringify({ updates: { check: false } }));
    const m = manager({ startDelayMs: 5 });
    assert.equal(m.view().status.state, 'off');
    m.start();
    await new Promise((r) => setTimeout(r, 40));
    assert.equal(updater.checks, 0);
  });
});
