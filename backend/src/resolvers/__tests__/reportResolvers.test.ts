import { reportResolvers, MAX_REPORT_PERSONS } from '../reportResolvers.js';
import { prismaMock, testContext, TEST_TREE_ID } from '../../test/prismaMock.js';
import type { Person } from '../../generated/prisma/index.js';

describe('reportResolvers', () => {
  it('returns the persons of the active family tree in the order asked for and leaves out unknown ones', async () => {
    prismaMock.person.findMany.mockResolvedValue([{ id: 'b' }, { id: 'a' }] as Person[]);
    const result = await reportResolvers.Query.reportPersons(null, { ids: ['a', 'x', 'b'] }, testContext);
    expect(result.map((r) => r.person.id)).toEqual(['a', 'b']);
    expect(prismaMock.person.findMany).toHaveBeenCalledWith({ where: { id: { in: ['a', 'x', 'b'] }, familyTreeId: TEST_TREE_ID, isDeleted: false } });
  });

  it(`refuses more than ${MAX_REPORT_PERSONS} persons per request`, async () => {
    const ids = Array.from({ length: MAX_REPORT_PERSONS + 1 }, (_, i) => `p${i}`);
    await expect(reportResolvers.Query.reportPersons(null, { ids }, testContext)).rejects.toMatchObject({ extensions: { reason: 'TOO_MANY_PERSONS' } });
    expect(prismaMock.person.findMany).not.toHaveBeenCalled();
  });

  it('reads events, notes and media of the person with the queries of the person page', async () => {
    const person = { id: 'a' } as Person;
    prismaMock.event.findMany.mockResolvedValue([]);
    prismaMock.note.findMany.mockResolvedValue([]);
    prismaMock.media.findMany.mockResolvedValue([]);
    expect(reportResolvers.ReportPerson.id({ person })).toBe('a');
    await reportResolvers.ReportPerson.events({ person }, null, testContext);
    await reportResolvers.ReportPerson.notes({ person }, null, testContext);
    await reportResolvers.ReportPerson.media({ person }, null, testContext);
    expect(prismaMock.event.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { personId: 'a', person: { familyTreeId: TEST_TREE_ID } } }));
    expect(prismaMock.note.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { personId: 'a', person: { familyTreeId: TEST_TREE_ID } } }));
    expect(prismaMock.media.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { personId: 'a', familyTreeId: TEST_TREE_ID } }));
  });
});
