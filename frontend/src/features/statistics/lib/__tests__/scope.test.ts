import { describe, it, expect } from 'vitest';
import type { TFunction } from 'i18next';
import { filterLabel, filterLink, filterPersonId, isWholeTree, readScope, scopeLabel, scopeSearch, scopeVariables, statisticsLink } from '../scope';

// Shows the key with its values
const t = ((key: string, values?: Record<string, unknown>) => (values ? `${key}${JSON.stringify(values)}` : key)) as unknown as TFunction;
const read = (search: string) => readScope(new URLSearchParams(search));

describe('scope of the statistics', () => {
  it('reads a complete scope from the URL and anything else as the whole family tree', () => {
    expect(read('scope=ancestors&person=p1&from=1800&to=1900')).toEqual({ kind: 'ancestors', personId: 'p1', bornFrom: 1800, bornTo: 1900 });
    expect(read('scope=surname&surname=%20Kraft%20')).toEqual({ kind: 'surname', surname: 'Kraft', bornFrom: undefined, bornTo: undefined });
    expect(read('scope=descendants')).toEqual({ kind: 'all', bornFrom: undefined, bornTo: undefined });
    expect(read('scope=elsewhere&from=abc&to=19000')).toEqual({ kind: 'all', bornFrom: undefined, bornTo: undefined });
  });

  it('writes the scope back as URL parameters, the whole family tree as none', () => {
    const scope = { kind: 'descendants' as const, personId: 'p1', bornTo: 1900 };
    expect(scopeSearch(scope).toString()).toBe('scope=descendants&person=p1&to=1900');
    expect(read(scopeSearch(scope).toString())).toEqual({ ...scope, bornFrom: undefined });
    expect(scopeSearch({ kind: 'all' }).toString()).toBe('');
    expect(isWholeTree({ kind: 'all' })).toBe(true);
    expect(isWholeTree({ kind: 'all', bornFrom: 1800 })).toBe(false);
  });

  it('gives the API the scope in its own spelling, nothing for the whole family tree', () => {
    expect(scopeVariables({ kind: 'all' })).toBeNull();
    expect(scopeVariables({ kind: 'surname', surname: 'Kraft' })).toEqual({ kind: 'SURNAME', personId: null, surname: 'Kraft', bornFrom: null, bornTo: null });
  });

  it('links to the persons behind a figure and back to the statistics with the scope', () => {
    expect(filterLink('surname:Groß & Klein', { kind: 'all' })).toBe('/persons?filter=surname%3AGro%C3%9F+%26+Klein');
    expect(filterLink('all', { kind: 'ancestors', personId: 'p1' })).toBe('/persons?filter=all&scope=ancestors&person=p1');
    expect(statisticsLink({ kind: 'all' })).toBe('/statistics');
    expect(statisticsLink({ kind: 'surname', surname: 'Kraft' }, 'names')).toBe('/statistics?scope=surname&surname=Kraft&tab=names');
  });

  it('names a filter and a scope in words', () => {
    expect(filterLabel('surname:Kraft', t)).toBe('statistics.filter.surname{"value":"Kraft"}');
    expect(filterLabel('gender:MALE', t)).toBe('statistics.filter.gender{"gender":"gender.MALE"}');
    expect(filterLabel('deathAge:100', t)).toBe('statistics.filter.deathAge{"ages":"statistics.ages.plus{\\"from\\":100}"}');
    expect(filterLabel('unconnected', t)).toBe('statistics.filter.unconnected{"defaultValue":"unconnected"}');
    expect(filterLabel('missing:father', t)).toBe('statistics.filter.missing{"fact":"statistics.completeness.facts.father"}');
    expect(filterLabel('openEnds:p1:3', t, 'Anna Kraft')).toBe('statistics.filter.openEnds{"name":"Anna Kraft","generation":"3"}');
    expect(filterLabel('bornDecade:1880', t)).toBe('statistics.filter.bornDecade{"decades":"1880–1889"}');
    expect(filterLabel('lives:adultLifespan:1800:female', t)).toBe(
      'statistics.filter.lives{"measure":"statistics.lives.measures.adultLifespan","gender":"statistics.lives.genders.female","centuries":"1800–1899"}',
    );
    expect(filterLabel('children:10', t)).toBe('statistics.filter.children{"number":"10+"}');
    expect(filterLabel('ageGap:sameAge', t)).toBe('statistics.filter.ageGap{"gap":"statistics.lives.ageGap.sameAge"}');
    expect(filterLabel('firstName:male:1800:Johann', t)).toBe(
      'statistics.filter.firstName{"name":"Johann","gender":"statistics.lives.genders.male","centuries":", 1800–1899"}',
    );
    expect(filterLabel('move:Halle|Berlin', t)).toBe('statistics.filter.move{"from":"Halle","to":"Berlin"}');
    expect(filterLabel('stayed:no', t)).toBe('statistics.filter.stayed.no');
    expect(filterPersonId('ancestors:p1:12')).toBe('p1');
    expect(filterPersonId('surname:Kraft')).toBeUndefined();
    expect(scopeLabel({ kind: 'ancestors', personId: 'p1', bornFrom: 1800, bornTo: 1900 }, 'Anna Kraft', t)).toBe(
      'statistics.scope.of.ancestors{"name":"Anna Kraft"} · statistics.scope.born.range{"from":1800,"to":1900}',
    );
    expect(scopeLabel({ kind: 'all' }, undefined, t)).toBe('statistics.scope.of.all');
  });
});
