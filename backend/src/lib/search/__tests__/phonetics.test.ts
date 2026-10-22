import { colognePhonetics, personPhonetics, phoneticCodes } from '../phonetics.js';

describe('colognePhonetics', () => {
  it.each([
    ['Müller-Lüdenscheidt', '65752682'],
    ['Wikipedia', '3412'],
    ['Breschnew', '17863'],
    ['Meier', '67'],
    ['Mayer', '67'],
    ['Maier', '67'],
    ['Meyer', '67'],
    ['Schmidt', '862'],
    ['Schmitt', '862'],
    ['Schmid', '862'],
    ['Anna', '06'],
    ['Christoph', '47823'],
    ['Cäsar', '487'],
    ['Xaver', '4837'],
    ['Faßbender', '381627'],
  ])('%s → %s', (word, code) => {
    expect(colognePhonetics(word)).toBe(code);
  });

  it('transliterates Cyrillic names, so they match their Latin spellings', () => {
    expect(colognePhonetics('Иванов')).toBe(colognePhonetics('Iwanow'));
    expect(colognePhonetics('Иванов')).toBe(colognePhonetics('Ivanov'));
    expect(colognePhonetics('Шевченко')).toBe(colognePhonetics('Schewtschenko'));
    expect(colognePhonetics('Хрущёв')).toBe(colognePhonetics('Chruschtschow'));
    expect(colognePhonetics('Олена')).toBe(colognePhonetics('Olena'));
    expect(colognePhonetics('Петров')).not.toBe('');
    // Other scripts give no code
    expect(colognePhonetics('Παπαδόπουλος')).toBe('');
  });

  it('groups common spelling variants', () => {
    expect(colognePhonetics('Müller')).toBe(colognePhonetics('Mueller'));
    expect(colognePhonetics('Schulz')).toBe(colognePhonetics('Schultz'));
    expect(colognePhonetics('Philipp')).toBe(colognePhonetics('Filip'));
    expect(colognePhonetics('Hoffmann')).toBe(colognePhonetics('Hofmann'));
  });

  it('ignores case, accents and non-letters and yields nothing for other scripts', () => {
    expect(colognePhonetics('meier')).toBe('67');
    expect(colognePhonetics('René')).toBe(colognePhonetics('Rene'));
    expect(colognePhonetics('Иван')).toBe(colognePhonetics('Iwan'));
    expect(colognePhonetics('李')).toBe('');
    expect(colognePhonetics('')).toBe('');
  });
});

describe('phoneticCodes / personPhonetics', () => {
  it('codes every word once', () => {
    expect(phoneticCodes('Müller-Lüdenscheidt', null, 'Meier Mayer')).toEqual(['657', '52682', '67']);
  });

  it('uses all name fields of a person', () => {
    expect(personPhonetics({ firstName: 'Hans Peter', middleName: null, lastName: 'Schmidt', birthName: 'Meier', nickname: 'Hansi' })).toEqual([
      '068',
      '127',
      '862',
      '67',
    ]);
  });
});
