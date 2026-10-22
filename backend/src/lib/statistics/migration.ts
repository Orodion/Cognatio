/**
 * Where people lived: who died where they were born, the most frequent moves (place of birth → places of moves →
 * place of death, in the order of time) and every place with its persons and the years of the facts there. Places are
 * compared ignoring case and spaces; the most frequent spelling is shown.
 */
import type { Groups } from './groups.js';
import { highest, lowest } from './numbers.js';
import { normalized, yearOf } from './scope.js';

const TOP_MOVES = 10;
const TOP_PLACES = 20;

export interface PlacePerson {
  id: string;
  birthDate?: string | null;
  birthPlace?: string | null;
  deathDate?: string | null;
  deathPlace?: string | null;
}

export interface PlaceEvent {
  personId: string;
  category: string;
  date?: string | null;
  place?: string | null;
  sortOrder?: number | null;
}

export interface Move {
  from: string;
  to: string;
  /** Persons who made it */
  count: number;
  filter: string;
}

export interface PlaceRow {
  place: string;
  persons: number;
  firstYear: number | null;
  lastYear: number | null;
  filter: string;
}

export interface Migration {
  /** Deceased persons with both places: died where they were born, or elsewhere */
  stayed: number;
  moved: number;
  moves: Move[];
  places: PlaceRow[];
  /** Places beyond those listed */
  morePlaces: number;
}

/** Spellings of a place, the most frequent one first */
class Spellings {
  private readonly seen = new Map<string, Map<string, number>>();
  add(place: string) {
    const counts = this.seen.get(normalized(place)) ?? new Map<string, number>();
    counts.set(place, (counts.get(place) ?? 0) + 1);
    this.seen.set(normalized(place), counts);
  }
  label(key: string): string {
    return [...(this.seen.get(key)?.entries() ?? [])].sort((a, b) => b[1] - a[1])[0]?.[0] ?? key;
  }
}

const clean = (place: string | null | undefined) => place?.trim().replace(/\s+/g, ' ') || null;

/** Filters `stayed:yes|no`, `move:<from>|<to>`, `place:<place>` */
export function migration(persons: PlacePerson[], events: PlaceEvent[], groups: Groups, collator: Intl.Collator): Migration {
  const spellings = new Spellings();
  const eventsOf = new Map<string, PlaceEvent[]>();
  for (const event of events) {
    const list = eventsOf.get(event.personId) ?? [];
    list.push(event);
    eventsOf.set(event.personId, list);
  }
  let stayed = 0;
  let moved = 0;
  const moves = new Map<string, Set<string>>();
  const places = new Map<string, { ids: Set<string>; years: number[] }>();
  const at = (place: string, id: string, date?: string | null) => {
    spellings.add(place);
    const key = normalized(place);
    const entry = places.get(key) ?? { ids: new Set<string>(), years: [] };
    entry.ids.add(id);
    const year = yearOf(date);
    if (year !== null) {
      entry.years.push(year);
    }
    places.set(key, entry);
    groups.add(id, 'place', place);
  };

  for (const p of persons) {
    const born = clean(p.birthPlace);
    const died = clean(p.deathPlace);
    if (born && died) {
      const same = normalized(born) === normalized(died);
      stayed += same ? 1 : 0;
      moved += same ? 0 : 1;
      groups.add(p.id, 'stayed', same ? 'yes' : 'no');
    }
    const own = eventsOf.get(p.id) ?? [];
    own.forEach((e) => clean(e.place) && at(clean(e.place)!, p.id, e.date));
    if (born) {
      at(born, p.id, p.birthDate);
    }
    if (died) {
      at(died, p.id, p.deathDate);
    }
    // The places one after the other: birth, moves (by date, else as entered), death
    const order = (e: PlaceEvent) => yearOf(e.date) ?? Number.MAX_SAFE_INTEGER;
    const moveEvents = own
      .filter((e) => e.category === 'MOVE' && clean(e.place))
      .sort((a, b) => order(a) - order(b) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const stations = [born, ...moveEvents.map((e) => clean(e.place)), died].filter((s): s is string => !!s);
    for (let i = 1; i < stations.length; i++) {
      const [from, to] = [normalized(stations[i - 1]), normalized(stations[i])];
      if (from !== to) {
        const key = `${from}|${to}`;
        moves.set(key, (moves.get(key) ?? new Set()).add(p.id));
        groups.add(p.id, 'move', key);
      }
    }
  }

  const moveList = [...moves.entries()]
    .map(([key, ids]) => {
      const [from, to] = key.split('|').map((place) => spellings.label(place));
      return { from, to, count: ids.size, filter: `move:${from}|${to}` };
    })
    .sort((a, b) => b.count - a.count || collator.compare(a.from, b.from) || collator.compare(a.to, b.to));
  const placeList = [...places.entries()]
    .map(([key, { ids, years }]) => {
      const place = spellings.label(key);
      return {
        place,
        persons: ids.size,
        firstYear: lowest(years),
        lastYear: highest(years),
        filter: `place:${place}`,
      };
    })
    .sort((a, b) => b.persons - a.persons || collator.compare(a.place, b.place));
  return {
    stayed,
    moved,
    moves: moveList.slice(0, TOP_MOVES),
    places: placeList.slice(0, TOP_PLACES),
    morePlaces: Math.max(0, placeList.length - TOP_PLACES),
  };
}
