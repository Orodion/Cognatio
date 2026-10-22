import { Groups } from '../groups.js';
import { firstWeddings, marriages } from '../marriages.js';
import { timeline } from '../timeline.js';
import { lives, MIN_SAMPLE } from '../lives.js';

const rel = (personAId: string, personBId: string, type: string, startDate?: string) => ({
  personAId,
  personBId,
  type,
  startDate: startDate ? new Date(startDate) : null,
});
const ids = (groups: Groups, key: string) => [...(groups.members.get(key) ?? [])].sort();

describe('weddings', () => {
  const everyone = new Set(['anna', 'paul', 'eva', 'otto', 'lisa']);

  it('takes the start of a partner relation, else a wedding event – once per couple and year', () => {
    const list = marriages(
      [rel('anna', 'paul', 'WIFE', '1920-05-01T00:00:00Z'), rel('paul', 'anna', 'HUSBAND', '1920-05-01T00:00:00Z'), rel('eva', 'otto', 'LIFE_PARTNER')],
      [
        { personId: 'anna', date: '01.05.1920' }, // the same wedding as the relation
        { personId: 'eva', date: '1931' },
        { personId: 'otto', date: 'um 1931' }, // the partner's event of the same year
        { personId: 'lisa', date: '1950' }, // partner unknown
        { personId: 'lisa', date: 'irgendwann' },
        { personId: 'stranger', date: '1950' },
      ],
      everyone,
    );
    expect(list).toEqual([
      { personIds: ['anna', 'paul'], year: 1920 },
      { personIds: ['eva', 'otto'], year: 1931 },
      { personIds: ['lisa'], year: 1950 },
    ]);
    expect(firstWeddings([...list, { personIds: ['anna', 'otto'], year: 1910 }]).get('anna')).toBe(1910);
  });

  it('does not take the start of a life partnership as a wedding', () => {
    const list = marriages(
      [rel('eva', 'otto', 'LIFE_PARTNER', '1931-01-01T00:00:00Z'), rel('lisa', 'paul', 'PARTNER', '1950-01-01T00:00:00Z')],
      [{ personId: 'lisa', date: '1952' }],
      everyone,
    );
    expect(list).toEqual([{ personIds: ['lisa', 'paul'], year: 1952 }]);
  });
});

describe('time axis', () => {
  it('counts births, deaths and weddings per decade, without gaps, and the persons without a year', () => {
    const groups = new Groups();
    const persons = [
      { id: 'a', birthDate: '1881', deathDate: '1950' },
      { id: 'b', birthDate: 'um 1885' },
      { id: 'c', birthDate: '1902', deathPlace: 'Halle' },
      { id: 'd' },
    ];
    const result = timeline(persons, [{ personIds: ['a', 'outside'], year: 1905 }], groups);
    expect(result.decades.map((d) => [d.decade, d.births, d.deaths, d.weddings])).toEqual([
      [1880, 2, 0, 0],
      [1890, 0, 0, 0],
      [1900, 1, 0, 1],
      [1910, 0, 0, 0],
      [1920, 0, 0, 0],
      [1930, 0, 0, 0],
      [1940, 0, 0, 0],
      [1950, 0, 1, 0],
    ]);
    expect(result).toMatchObject({ withoutBirthYear: 1, withoutDeathYear: 1 });
    expect(ids(groups, 'bornDecade:1880')).toEqual(['a', 'b']);
    expect(ids(groups, 'marriedDecade:1900')).toEqual(['a']);
    expect(ids(groups, 'noDeathYear')).toEqual(['c']);
    expect(timeline([{ id: 'x' }], [], new Groups()).decades).toEqual([]);
  });
});

describe('lives through time', () => {
  // Five men born in the 1800s who died at 60–68, one boy who died at 2, five women who died at 70–74
  const men = [60, 62, 64, 66, 68].map((age, i) => ({ id: `m${i}`, gender: 'MALE', birthDate: String(1800 + i), deathDate: String(1800 + i + age) }));
  const boy = { id: 'boy', gender: 'MALE', birthDate: '1810', deathDate: '1812' };
  const women = [70, 71, 72, 73, 74].map((age, i) => ({ id: `w${i}`, gender: 'FEMALE', birthDate: String(1820 + i), deathDate: String(1820 + i + age) }));
  // Five couples: m_i ∞ w_i in the year the man turned 25; each couple has i children, the first born when the woman was 22
  const couples = men.map((m, i) => rel(m.id, women[i].id, 'WIFE', `${1825 + i}-01-01T00:00:00Z`));
  const children = men.flatMap((m, i) => Array.from({ length: i }, (_, k) => ({ id: `c${i}${k}`, gender: 'UNKNOWN', birthDate: String(1842 + i + k) })));
  const parents = children.flatMap((c) => {
    const i = Number(c.id[1]);
    return [rel(c.id, men[i].id, 'FATHER'), rel(c.id, women[i].id, 'MOTHER')];
  });
  const everyone = [...men, boy, ...women, ...children];
  const relations = [...couples, ...parents];
  const weddings = marriages(relations, [], new Set(everyone.map((p) => p.id)));
  const groups = new Groups();
  const result = lives(everyone, everyone, relations, weddings, groups);
  const table = (measure: string) => result.tables.find((t) => t.measure === measure)!;
  const total = (measure: string) => table(measure).rows.find((r) => r.century === null)!;

  it('gives the mean lifespan per century and gender, also of those who reached 15', () => {
    expect(table('lifespan').rows.map((r) => r.century)).toEqual([1800, null]);
    expect(total('lifespan').male).toEqual({ mean: 54, count: 6, filter: 'lives:lifespan:all:male' });
    expect(total('adultLifespan').male).toMatchObject({ mean: 64, count: 5 });
    expect(total('lifespan').female).toMatchObject({ mean: 72, count: 5 });
    expect(total('lifespan').all).toMatchObject({ mean: 62, count: 11 });
    expect(ids(groups, 'lives:adultlifespan:all:male')).toEqual(['m0', 'm1', 'm2', 'm3', 'm4']);
  });

  it('gives the age at the first wedding and at the first child, and nothing below the minimum sample', () => {
    expect(total('firstWedding').male).toMatchObject({ mean: 25, count: 5 });
    expect(total('firstWedding').female.mean).toBe(5);
    // Four couples have children; the women were 22 + i – i at the first birth
    expect(total('firstChild').female).toEqual({ mean: null, count: MIN_SAMPLE - 1, filter: 'lives:firstChild:all:female' });
  });

  it('counts the children per couple and the age gap of the partners', () => {
    expect(result.children.slice(0, 5).map((r) => r.count)).toEqual([1, 1, 1, 1, 1]);
    // Up to the highest number of children (4), not up to 10+
    expect(result.children).toHaveLength(5);
    expect(result.meanChildren).toBe(2);
    expect(ids(groups, 'children:0')).toEqual(['m0', 'w0']);
    // The men are 20 years older
    expect(result.ageGaps.map((r) => [r.key, r.count])).toEqual([
      ['manOlder', 5],
      ['sameAge', 0],
      ['womanOlder', 0],
    ]);
    expect(result.meanAgeGap).toBe(20);
  });

  it('has nothing to say about persons without dates', () => {
    const empty = lives([{ id: 'x' }], [{ id: 'x' }], [], [], new Groups());
    expect(empty).toMatchObject({ children: [], ageGaps: [], meanChildren: null, meanAgeGap: null });
    expect(empty.tables.every((t) => t.rows.length === 1 && t.rows[0].all.count === 0)).toBe(true);
  });
});
