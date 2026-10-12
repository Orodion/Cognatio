import { describe, it, expect } from 'vitest';
import { SETTING_ENTRIES, matchSettings, normalize } from '../settingsSearch';

const entries = [
  { id: 'a', label: 'Schriftgröße', blockTitle: 'Schrift und Farben' },
  { id: 'b', label: 'Linienstärke', blockTitle: 'Stammbaum: Darstellung' },
  { id: 'c', label: 'Ansicht beim Öffnen', blockTitle: 'Stammbaum: Verhalten' },
];

describe('matchSettings', () => {
  it('finds settings by a part of the label, ignoring case and accents', () => {
    expect(matchSettings(entries, 'linien').map((e) => e.id)).toEqual(['b']);
    expect(matchSettings(entries, 'GROSSE'.replace('SS', 'ß')).map((e) => e.id)).toEqual(['a']);
    expect(matchSettings(entries, 'groe')).toEqual([]);
    expect(normalize('Café Größe')).toBe('cafe große');
  });

  it('finds settings by the name of their block and needs every word', () => {
    expect(matchSettings(entries, 'stammbaum').map((e) => e.id)).toEqual(['b', 'c']);
    expect(matchSettings(entries, 'stammbaum verhalten').map((e) => e.id)).toEqual(['c']);
    expect(matchSettings(entries, 'stammbaum farben')).toEqual([]);
  });

  it('finds nothing for an empty query', () => {
    expect(matchSettings(entries, '')).toEqual([]);
    expect(matchSettings(entries, '   ')).toEqual([]);
  });
});

describe('SETTING_ENTRIES', () => {
  it('has a unique field for every entry and only known blocks', () => {
    const ids = SETTING_ENTRIES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(SETTING_ENTRIES.map((e) => e.section))).toEqual(new Set(['system', 'fontColors', 'treeAppearance', 'treeBehaviour', 'data']));
  });
});
