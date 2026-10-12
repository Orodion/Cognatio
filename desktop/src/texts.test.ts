import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { TEXTS, texts } from './texts.js';

describe('texts', () => {
  it('has every text in the ten languages of the app', () => {
    assert.deepEqual(Object.keys(TEXTS).sort(), ['de', 'en', 'es', 'fr', 'it', 'nl', 'pl', 'pt', 'ru', 'uk']);
    const keys = Object.keys(TEXTS.en).sort();
    for (const [language, values] of Object.entries(TEXTS)) {
      assert.deepEqual(Object.keys(values).sort(), keys, language);
      assert.match(values.updateReady('1.2.3'), /1\.2\.3/, language);
      for (const value of Object.values(values)) {
        assert.ok(typeof value === 'function' || value.trim(), language);
      }
    }
  });

  it('follows the language of the operating system and falls back to English', () => {
    assert.equal(texts('de-DE').quit, 'Beenden');
    assert.equal(texts('pt-BR').quit, 'Sair');
    assert.equal(texts('uk').quit, 'Вийти');
    assert.equal(texts('ja').quit, 'Quit');
    assert.equal(texts('').quit, 'Quit');
  });
});
