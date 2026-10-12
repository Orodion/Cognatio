import { analyze, buildPlan, summarize } from '../plan.js';
import { validateTransfer, TransferError } from '../format.js';
import { person, relation, transfer, T1, T2 } from '../../../test/transferFixtures.js';

describe('validateTransfer', () => {
  it('accepts a valid export', () => {
    const data = transfer([person('a'), person('b')], [relation('r1', 'a', 'b', 'CHILD')]);
    expect(validateTransfer(JSON.parse(JSON.stringify(data))).persons).toHaveLength(2);
  });

  it('reports schema errors with their path', () => {
    const broken = { ...transfer([person('a')]), persons: [{ id: 'a' }] };
    try {
      validateTransfer(broken);
      throw new Error('expected error');
    } catch (err) {
      expect(err).toBeInstanceOf(TransferError);
      expect((err as TransferError).reason).toBe('INVALID_SCHEMA');
      expect((err as TransferError).details.join()).toContain('persons.0.firstName');
    }
  });

  it('rejects newer format versions', () => {
    expect(() => validateTransfer({ ...transfer([]), version: 99 })).toThrow('UNSUPPORTED_VERSION');
  });

  it('checks references between records', () => {
    const data = transfer([person('a', { profilePictureId: 'fehlt', media: [] }), person('a')], [relation('r1', 'a', 'unbekannt', 'CHILD')]);
    try {
      validateTransfer(data);
      throw new Error('expected error');
    } catch (err) {
      const details = (err as TransferError).details.join('\n');
      expect((err as TransferError).reason).toBe('INTEGRITY');
      expect(details).toContain('Person a occurs more than once');
      expect(details).toContain('profile picture');
      expect(details).toContain('person unbekannt missing');
    }
  });
});

describe('analyze', () => {
  const existing = transfer(
    [
      person('same'),
      person('changed', { birthPlace: 'Berlin' }),
      person('onlyExisting'),
      person('withEvent', { events: [{ id: 'e1', title: 'Taufe', category: 'BAPTISM', mediaIds: [], createdAt: T1, updatedAt: T1 }] }),
    ],
    [relation('r1', 'same', 'changed', 'CHILD')],
  );
  const imported = transfer(
    [
      person('same'),
      person('changed', { birthPlace: 'Hamburg', updatedAt: T2 }),
      person('new'),
      person('withEvent', {
        events: [
          { id: 'e1', title: 'Taufe', category: 'BAPTISM', mediaIds: [], place: 'Köln', createdAt: T1, updatedAt: T2 },
          { id: 'e2', title: 'Hochzeit', category: 'WEDDING', mediaIds: [], createdAt: T1, updatedAt: T1 },
        ],
      }),
    ],
    [
      relation('r1', 'same', 'changed', 'CHILD'),
      // The same relation under another id and recorded from the other direction
      relation('r2', 'changed', 'same', 'FATHER'),
      relation('r3', 'new', 'same', 'MOTHER'),
    ],
  );
  const analysis = analyze(imported, existing);

  it('classifies persons as new, unchanged or conflicting', () => {
    expect(analysis.newPersons).toEqual(['new']);
    expect(analysis.unchangedPersons).toEqual(['same']);
    expect(analysis.onlyExisting).toEqual(['onlyExisting']);
    expect(analysis.conflicts.map((c) => c.personId).sort()).toEqual(['changed', 'withEvent']);
  });

  it('lists the differing fields of a conflict and which side is newer', () => {
    const changed = analysis.conflicts.find((c) => c.personId === 'changed')!;
    expect(changed.changes).toEqual([{ field: 'birthPlace', existing: 'Berlin', imported: 'Hamburg' }]);
    expect(changed.importedNewer).toBe(true);
    const withEvent = analysis.conflicts.find((c) => c.personId === 'withEvent')!;
    expect(withEvent.changes).toEqual([{ field: 'event', label: 'Taufe', existing: { place: null }, imported: { place: 'Köln' } }]);
  });

  it('does not duplicate relations that already exist under another ID', () => {
    expect(analysis.relations.duplicates).toBe(1);
    expect(analysis.relations.created.map((r) => r.id)).toEqual(['r3']);
  });

  it('overwrite replaces everything', () => {
    const plan = buildPlan(imported, analysis, 'OVERWRITE');
    expect(plan.replaceAll).toBe(true);
    expect(plan.createPersons).toHaveLength(4);
    expect(plan.createEvents).toHaveLength(2);
    expect(plan.createRelations).toHaveLength(3);
    expect(summarize(analysis, plan)).toMatchObject({ newPersons: 4, removedPersons: 4, conflicts: 0 });
  });

  it('merge (newer wins) takes newer records and adds new ones', () => {
    const plan = buildPlan(imported, analysis, 'MERGE_NEWER');
    expect(plan.replaceAll).toBe(false);
    expect(plan.createPersons.map((p) => p.id)).toEqual(['new']);
    expect(plan.updatePersons.map((p) => p.id)).toEqual(['changed']);
    expect(plan.updateEvents.map((e) => e.record.id)).toEqual(['e1']);
    expect(plan.createEvents.map((e) => e.record.id)).toEqual(['e2']);
    expect(summarize(analysis, plan)).toMatchObject({ newPersons: 1, updatedPersons: 2, keptPersons: 0, conflicts: 2, newRelations: 1 });
  });

  it('merge (newer wins) keeps existing data that is newer', () => {
    const older = transfer([person('changed', { birthPlace: 'Hamburg', updatedAt: '2025-01-01T00:00:00.000Z' })]);
    const a = analyze(older, existing);
    const plan = buildPlan(older, a, 'MERGE_NEWER');
    expect(plan.updatePersons).toHaveLength(0);
    expect(summarize(a, plan)).toMatchObject({ updatedPersons: 0, keptPersons: 1 });
  });

  it('manual merge follows the decisions per person; undecided conflicts are kept', () => {
    const plan = buildPlan(imported, analysis, 'MERGE_MANUAL', { withEvent: 'IMPORT', changed: 'KEEP' });
    expect(plan.updatePersons).toHaveLength(0);
    expect(plan.updateEvents.map((e) => e.record.id)).toEqual(['e1']);
    expect(buildPlan(imported, analysis, 'MERGE_MANUAL').updateEvents).toHaveLength(0);
    expect(summarize(analysis, plan)).toMatchObject({ updatedPersons: 1, keptPersons: 1 });
  });
});
