import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isSameOrigin } from './origin.js';

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
