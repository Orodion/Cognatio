import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { backendLockfile } from './backend-lock.mjs';

const read = (file) => JSON.parse(fs.readFileSync(new URL(file, import.meta.url), 'utf8'));
const pkg = (name, extra = {}) => ({ name, version: '1.0.0', ...extra });

test('takes versions and integrity hashes from the repository lock file', () => {
  const lock = read('../../package-lock.json');
  const { scripts: _scripts, devDependencies: _dev, ...backend } = read('../../backend/package.json');
  const staged = backendLockfile(lock, backend);
  const names = Object.keys(staged.packages).filter(Boolean);
  assert.ok(names.length > 50);
  for (const key of names) {
    assert.deepEqual(staged.packages[key].version, lock.packages[key].version, key);
    assert.ok(staged.packages[key].integrity, `${key} has no integrity hash`);
    assert.equal(staged.packages[key].dev, undefined, `${key} is a development dependency`);
  }
  for (const name of Object.keys(backend.dependencies)) assert.ok(staged.packages[`node_modules/${name}`], name);
  // Development tools stay out
  for (const name of ['jest', 'typescript', 'eslint', 'prisma']) assert.equal(staged.packages[`node_modules/${name}`], undefined, name);
  assert.deepEqual(staged.packages[''].dependencies, backend.dependencies);
});

test('resolves nested versions like npm and drops what nothing needs', () => {
  const lock = {
    lockfileVersion: 3,
    packages: {
      '': {},
      'node_modules/a': { version: '1.0.0', dependencies: { b: '^1' } },
      'node_modules/b': { version: '1.0.0' },
      'node_modules/a/node_modules/b': { version: '2.0.0' },
      'node_modules/unused': { version: '1.0.0' },
    },
  };
  const staged = backendLockfile(lock, pkg('stage', { dependencies: { a: '^1', b: '^1' } }));
  assert.deepEqual(Object.keys(staged.packages).sort(), ['', 'node_modules/a', 'node_modules/a/node_modules/b', 'node_modules/b']);
  assert.equal(staged.packages['node_modules/a/node_modules/b'].version, '2.0.0');
});

test('moves versions that only the backend uses to the top of the stage and refuses clashes', () => {
  const lock = {
    lockfileVersion: 3,
    packages: {
      '': {},
      'backend/node_modules/x': { version: '2.0.0' },
      'node_modules/x': { version: '1.0.0' },
      'node_modules/y': { version: '1.0.0', dependencies: { x: '^1' } },
    },
  };
  const solo = backendLockfile(lock, pkg('stage', { dependencies: { x: '^2' } }));
  assert.equal(solo.packages['node_modules/x'].version, '2.0.0');
  assert.throws(() => backendLockfile(lock, pkg('stage', { dependencies: { x: '^2', y: '^1' } })), /same place/);
});

test('skips optional packages missing from the lock file but not required ones', () => {
  const lock = { lockfileVersion: 3, packages: { '': {}, 'node_modules/a': { version: '1.0.0', optionalDependencies: { gone: '^1' } } } };
  assert.ok(backendLockfile(lock, pkg('stage', { dependencies: { a: '^1' } })));
  assert.throws(() => backendLockfile(lock, pkg('stage', { dependencies: { a: '^1', gone: '^1' } })), /not in package-lock/);
});
