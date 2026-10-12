import { describe, expect, it } from 'vitest';
import { sortEvents } from '../eventOrder';

const titles = (events: Array<{ title: string }>) => events.map((e) => e.title);

describe('sortEvents', () => {
  it('orders by the saved sort order', () => {
    const events = [
      { title: 'B', date: '1990', sortOrder: 19900101 },
      { title: 'A', date: '1980', sortOrder: 19800101 },
    ];
    expect(titles(sortEvents(events))).toEqual(['A', 'B']);
  });

  it('places events without a sort order by their date, whatever format it has', () => {
    const events = [
      { title: 'Tod', date: '03.11.2025', sortOrder: null },
      { title: 'Umzug', date: '2016' },
      { title: 'Geburt', date: '14.09.1951', sortOrder: null },
      { title: 'Taufe', date: '07.1952', sortOrder: null },
      { title: 'Klassenfahrt', date: 'um 1966' },
      { title: 'Zivildienst', date: '1969-1970' },
      { title: 'Treffen', date: '2019' },
    ];
    expect(titles(sortEvents(events))).toEqual(['Geburt', 'Taufe', 'Klassenfahrt', 'Zivildienst', 'Umzug', 'Treffen', 'Tod']);
  });

  it('mixes events with and without a sort order, puts those without a readable date last and keeps the order of equal ones', () => {
    const events = [
      { title: 'ohne Datum', date: null },
      { title: 'Unlesbar', date: 'irgendwann' },
      { title: 'zweite 1985', date: '1985', sortOrder: null },
      { title: 'spät', date: '2000', sortOrder: 20000101 },
      { title: 'erste 1985', date: '1985', sortOrder: 19850101 },
      { title: 'früh', date: '1950' },
    ];
    expect(titles(sortEvents(events))).toEqual(['früh', 'zweite 1985', 'erste 1985', 'spät', 'ohne Datum', 'Unlesbar']);
  });

  it('lists the newest first on request and keeps the events without a date at the end', () => {
    const events = [
      { title: 'ohne Datum', date: null },
      { title: 'Geburt', date: '14.09.1951' },
      { title: 'Abitur', date: '1969' },
      { title: 'Zivildienst', date: '1969-1970' },
      { title: 'Tod', date: '03.11.2025' },
    ];
    expect(titles(sortEvents(events, 'desc'))).toEqual(['Tod', 'Zivildienst', 'Abitur', 'Geburt', 'ohne Datum']);
    expect(titles(sortEvents(events, 'asc'))).toEqual(['Geburt', 'Abitur', 'Zivildienst', 'Tod', 'ohne Datum']);
  });

  it('does not change the list it is given', () => {
    const events = [
      { title: 'B', date: '1990' },
      { title: 'A', date: '1980' },
    ];
    sortEvents(events);
    expect(titles(events)).toEqual(['B', 'A']);
  });
});
