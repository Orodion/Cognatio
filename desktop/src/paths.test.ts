import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';
import { appPaths, dataDir } from './paths.js';

describe('appPaths', () => {
  it('finds the parts in the resources folder when installed', () => {
    const p = appPaths(true, path.join('C:', 'App', 'resources'), 'unused');
    assert.equal(p.backendEntry, path.join('C:', 'App', 'resources', 'backend', 'dist', 'index.js'));
    assert.equal(p.migrationsDir, path.join('C:', 'App', 'resources', 'backend', 'prisma', 'migrations'));
    assert.equal(p.frontendDir, path.join('C:', 'App', 'resources', 'frontend'));
    assert.equal(p.pgDir, path.join('C:', 'App', 'resources', 'postgres'));
    assert.equal(p.demoFile, path.join('C:', 'App', 'resources', 'demo', 'Cognatio-Demo-Familie-Kraft.zip'));
  });

  it('finds the parts in the repository during development', () => {
    const p = appPaths(false, 'unused', path.join('D:', 'repo'));
    assert.equal(p.backendDir, path.join('D:', 'repo', 'backend'));
    assert.equal(p.frontendDir, path.join('D:', 'repo', 'frontend', 'dist'));
    assert.equal(p.pgDir, path.join('D:', 'repo', 'tools', 'postgres'));
    assert.equal(p.demoFile, path.join('D:', 'repo', 'demo', 'Cognatio-Demo-Familie-Kraft.zip'));
  });
});

describe('dataDir', () => {
  const userData = path.join('C:', 'Users', 'Jürgen Müller', 'AppData', 'Roaming', 'Cognatio');

  it('is the app-data folder of the user by default', () => {
    assert.equal(dataDir({ env: {}, userData }), userData);
  });

  it('is `data` next to the program for the portable variant', () => {
    const portableDir = path.join('E:', 'Stick');
    assert.equal(dataDir({ env: {}, userData, portableDir, hasPortableMarker: true }), path.join(portableDir, 'data'));
    assert.equal(dataDir({ env: {}, userData, portableDir, hasPortableMarker: false }), userData);
  });

  it('can be set with COGNATIO_DATA_DIR, which wins over everything', () => {
    const result = dataDir({ env: { COGNATIO_DATA_DIR: 'data' }, userData, portableDir: 'E:\\Stick', hasPortableMarker: true });
    assert.equal(result, path.resolve('data'));
    assert.equal(dataDir({ env: { COGNATIO_DATA_DIR: '  ' }, userData }), userData);
  });
});
