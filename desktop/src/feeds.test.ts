import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PROJECT_URL, updateFeeds } from './feeds.js';

describe('updateFeeds', () => {
  it('GitLab: stable reads the newest release, beta the channel package of the project', () => {
    const feeds = updateFeeds({}, 'https://gitlab.com/some-group/Cognatio');
    assert.equal(feeds.stable, 'https://gitlab.com/some-group/Cognatio/-/releases/permalink/latest/downloads');
    assert.equal(feeds.beta, 'https://gitlab.com/api/v4/projects/some-group%2FCognatio/packages/generic/cognatio-channel/beta');
  });

  it('GitHub: stable reads the newest release, beta the release "beta-channel"', () => {
    const feeds = updateFeeds({}, 'https://github.com/someone/Cognatio');
    assert.equal(feeds.stable, 'https://github.com/someone/Cognatio/releases/latest/download');
    assert.equal(feeds.beta, 'https://github.com/someone/Cognatio/releases/download/beta-channel');
  });

  it('keeps the project address in one place (the public snapshot replaces it there)', () => {
    assert.match(PROJECT_URL, /^https:\/\/(gitlab|github)\.com\/[\w.-]+\/[\w.-]+$/);
    assert.deepEqual(updateFeeds({}), updateFeeds({}, PROJECT_URL));
  });

  it('COGNATIO_UPDATE_URL replaces both feeds, COGNATIO_BETA_UPDATE_URL only the beta one', () => {
    assert.deepEqual(updateFeeds({ COGNATIO_UPDATE_URL: ' http://127.0.0.1:1 ' }), { stable: 'http://127.0.0.1:1', beta: 'http://127.0.0.1:1' });
    const both = updateFeeds({ COGNATIO_UPDATE_URL: 'http://127.0.0.1:1', COGNATIO_BETA_UPDATE_URL: 'http://127.0.0.1:2' });
    assert.deepEqual(both, { stable: 'http://127.0.0.1:1', beta: 'http://127.0.0.1:2' });
  });
});
