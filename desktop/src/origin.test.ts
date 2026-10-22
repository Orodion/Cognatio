import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isSameOrigin, permissionAllowed, viewerTitle } from './origin.js';

describe('isSameOrigin', () => {
  const origin = 'http://127.0.0.1:5123';

  it('accepts pages and files of the backend', () => {
    assert.equal(isSameOrigin('http://127.0.0.1:5123/', origin), true);
    assert.equal(isSameOrigin('http://127.0.0.1:5123/persons/1?x=1#y', origin), true);
    assert.equal(isSameOrigin('http://127.0.0.1:5123', origin), true);
  });

  it('refuses addresses that only start with the same text', () => {
    assert.equal(isSameOrigin('http://127.0.0.1:51234/', origin), false);
    assert.equal(isSameOrigin('http://127.0.0.1:5123@other.example/', origin), false);
    assert.equal(isSameOrigin('http://127.0.0.1:5123.other.example/', origin), false);
  });

  it('refuses other schemes, hosts and invalid values', () => {
    assert.equal(isSameOrigin('https://127.0.0.1:5123/', origin), false);
    assert.equal(isSameOrigin('http://localhost:5123/', origin), false);
    assert.equal(isSameOrigin('data:text/html,hi', origin), false);
    assert.equal(isSameOrigin('not a url', origin), false);
    assert.equal(isSameOrigin('', origin), false);
    assert.equal(isSameOrigin(undefined, origin), false);
  });
});

describe('viewerTitle', () => {
  const origin = 'http://127.0.0.1:5123';

  it('names a window with an uploaded file by its original name, else leaves it empty', () => {
    assert.equal(viewerTitle('http://127.0.0.1:5123/uploads/abc.pdf?name=Taufe%20M%C3%BCller.pdf', origin), 'Taufe Müller.pdf');
    assert.equal(viewerTitle('http://127.0.0.1:5123/uploads/abc.pdf', origin), '');
  });

  it('leaves other pages and other origins alone', () => {
    assert.equal(viewerTitle('http://127.0.0.1:5123/licenses?name=x', origin), undefined);
    assert.equal(viewerTitle('http://other.example/uploads/abc.pdf?name=x', origin), undefined);
  });
});

describe('permissionAllowed', () => {
  const origin = 'http://127.0.0.1:5123';

  it('lets only the page of the app write into the clipboard', () => {
    assert.equal(permissionAllowed('clipboard-sanitized-write', 'http://127.0.0.1:5123/settings', origin), true);
    assert.equal(permissionAllowed('clipboard-sanitized-write', 'https://fremd.example/', origin), false);
    assert.equal(permissionAllowed('clipboard-sanitized-write', 'http://127.0.0.1:5123/', null), false);
  });

  it('refuses everything else', () => {
    for (const permission of ['clipboard-read', 'media', 'geolocation', 'notifications', 'openExternal']) {
      assert.equal(permissionAllowed(permission, 'http://127.0.0.1:5123/', origin), false, permission);
    }
  });
});
