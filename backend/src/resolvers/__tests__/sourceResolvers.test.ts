jest.mock('../../lib/files/uploads.js', () => ({ ...jest.requireActual('../../lib/files/uploads.js'), removeUploadedFile: jest.fn() }));

import type { GraphQLError } from 'graphql';
import { removeUploadedFile } from '../../lib/files/uploads.js';
import { sourceResolvers, sourceUsage } from '../sourceResolvers.js';
import { prismaMock, testContext, TEST_TREE_ID } from '../../test/prismaMock.js';

const ctx = testContext;
const { Query, Mutation } = sourceResolvers;
const now = new Date('2026-10-13T10:00:00.000Z');

const source = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  type: 'CHURCH_BOOK',
  title: `Kirchenbuch ${id}`,
  author: null,
  publication: null,
  abbreviation: null,
  text: null,
  repositoryId: null,
  callNumber: null,
  note: null,
  isDeleted: false,
  deletedAt: null,
  createdAt: now,
  updatedAt: now,
  repository: null,
  media: [],
  ...extra,
});

const reason = async (fn: () => unknown) => {
  try {
    await fn();
  } catch (err) {
    return (err as GraphQLError).extensions?.reason;
  }
  return 'no error';
};

/** No citations and no links anywhere */
function emptyUsage() {
  prismaMock.citation.findMany.mockResolvedValue([]);
  for (const table of ['personCitation', 'eventCitation', 'relationCitation'] as const) {
    (prismaMock[table].groupBy as unknown as jest.Mock).mockResolvedValue([]);
  }
}

beforeEach(() => {
  jest.clearAllMocks();
  prismaMock.$transaction.mockImplementation((async (fn: (tx: typeof prismaMock) => unknown) => fn(prismaMock)) as never);
});

describe('sourceUsage', () => {
  it('counts citations and supported facts per source, in all family trees and in the active one', async () => {
    prismaMock.citation.findMany.mockResolvedValue([
      { id: 'c1', sourceId: 's1' },
      { id: 'c2', sourceId: 's1' },
      { id: 'c3', sourceId: 's2' },
    ] as never);
    // Called first for all family trees, then for the active one
    (prismaMock.personCitation.groupBy as unknown as jest.Mock)
      .mockResolvedValueOnce([
        { citationId: 'c1', _count: { _all: 2 } },
        { citationId: 'c3', _count: { _all: 1 } },
      ])
      .mockResolvedValueOnce([{ citationId: 'c1', _count: { _all: 1 } }]);
    (prismaMock.eventCitation.groupBy as unknown as jest.Mock)
      .mockResolvedValueOnce([{ citationId: 'c2', _count: { _all: 1 } }])
      .mockResolvedValueOnce([{ citationId: 'c2', _count: { _all: 1 } }]);
    (prismaMock.relationCitation.groupBy as unknown as jest.Mock).mockResolvedValue([]);

    const usage = await sourceUsage(prismaMock as never, TEST_TREE_ID);

    expect(usage.get('s1')).toEqual({ citations: 2, links: 3, treeLinks: 2 });
    expect(usage.get('s2')).toEqual({ citations: 1, links: 1, treeLinks: 0 });
    expect(prismaMock.personCitation.groupBy).toHaveBeenCalledWith(expect.objectContaining({ where: { person: { familyTreeId: TEST_TREE_ID } } }));
  });
});

describe('sources', () => {
  it('shows the sources of the active family tree and the unused ones, ALL the whole library', async () => {
    prismaMock.source.findMany.mockResolvedValue([source('used'), source('other'), source('unused')] as never);
    prismaMock.citation.findMany.mockResolvedValue([
      { id: 'c1', sourceId: 'used' },
      { id: 'c2', sourceId: 'other' },
    ] as never);
    (prismaMock.personCitation.groupBy as unknown as jest.Mock).mockImplementation(async (args: { where?: unknown }) =>
      args.where
        ? [{ citationId: 'c1', _count: { _all: 1 } }]
        : [
            { citationId: 'c1', _count: { _all: 1 } },
            { citationId: 'c2', _count: { _all: 4 } },
          ],
    );
    (prismaMock.eventCitation.groupBy as unknown as jest.Mock).mockResolvedValue([]);
    (prismaMock.relationCitation.groupBy as unknown as jest.Mock).mockResolvedValue([]);

    const inTree = await Query.sources(null, { scope: 'TREE' }, ctx);
    expect(inTree.map((s) => s.id)).toEqual(['used', 'unused']);
    const all = await Query.sources(null, { scope: 'ALL' }, ctx);
    expect(all.map((s) => [s.id, s.usage.links, s.usage.treeLinks])).toEqual([
      ['used', 1, 1],
      ['other', 4, 0],
      ['unused', 0, 0],
    ]);
    // Never the recycle bin
    expect(prismaMock.source.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { isDeleted: false } }));
  });
});

describe('createSource', () => {
  it('stores the cleaned fields, OTHER without a type, and links the scans', async () => {
    emptyUsage();
    prismaMock.media.count.mockResolvedValue(1);
    prismaMock.source.create.mockResolvedValue(source('s1') as never);

    await Mutation.createSource(null, { data: { title: '  Kirchenbuch St. Martin ', author: ' ', mediaIds: ['m1', 'm1'] } }, ctx);

    expect(prismaMock.source.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'OTHER', title: 'Kirchenbuch St. Martin', author: null, media: { create: [{ mediaId: 'm1' }] } }),
      }),
    );
    // Scans of the library or files of the active family tree
    expect(prismaMock.media.count).toHaveBeenCalledWith({
      where: { id: { in: ['m1'] }, OR: [{ familyTreeId: TEST_TREE_ID }, { familyTreeId: null, personId: null }] },
    });
  });

  it('refuses an empty title, an unknown type, a missing archive and a medium of another family tree', async () => {
    expect(await reason(() => Mutation.createSource(null, { data: { title: ' ' } }, ctx))).toBe('SOURCE_TITLE_REQUIRED');
    expect(await reason(() => Mutation.createSource(null, { data: { title: 'A', type: 'POEM' } }, ctx))).toBe('INVALID_SOURCE_TYPE');
    prismaMock.repository.findFirst.mockResolvedValue(null);
    expect(await reason(() => Mutation.createSource(null, { data: { title: 'A', repositoryId: 'r9' } }, ctx))).toBe('REPOSITORY_NOT_FOUND');
    prismaMock.media.count.mockResolvedValue(0);
    expect(await reason(() => Mutation.createSource(null, { data: { title: 'A', mediaIds: ['foreign'] } }, ctx))).toBe('MEDIA_NOT_FOUND');
    expect(await reason(() => Mutation.createSource(null, { data: { title: 'x'.repeat(1001) } }, ctx))).toBe('TEXT_TOO_LONG');
  });
});

describe('updateSource', () => {
  it('removes a scan of the library together with its file once nothing links it any more', async () => {
    emptyUsage();
    prismaMock.source.findFirst.mockResolvedValue(source('s1') as never);
    prismaMock.media.count.mockResolvedValue(1);
    prismaMock.sourceMedia.findMany.mockResolvedValue([{ mediaId: 'keep' }, { mediaId: 'old' }] as never);
    prismaMock.source.update.mockResolvedValue(source('s1') as never);
    prismaMock.media.findMany.mockResolvedValue([{ id: 'old', fileName: 'old.jpg' }] as never);

    await Mutation.updateSource(null, { id: 's1', data: { title: 'Neu', mediaIds: ['keep'] } }, ctx);

    expect(prismaMock.media.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['old'] }, familyTreeId: null, personId: null, sources: { none: {} }, citations: { none: {} }, events: { none: {} } },
      select: { id: true, fileName: true },
    });
    expect(prismaMock.media.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['old'] } } });
    expect(removeUploadedFile).toHaveBeenCalledWith('old.jpg');
  });
});

describe('updateSource and archives in the recycle bin', () => {
  it('keeps the archive a source has although it is in the recycle bin, but refuses to choose such an archive anew', async () => {
    emptyUsage();
    prismaMock.source.findFirst.mockResolvedValue(source('s1', { repositoryId: 'trashed' }) as never);
    prismaMock.source.update.mockResolvedValue(source('s1') as never);
    await Mutation.updateSource(null, { id: 's1', data: { title: 'Neu', repositoryId: 'trashed' } }, ctx);
    expect(prismaMock.repository.findFirst).not.toHaveBeenCalled();

    prismaMock.repository.findFirst.mockResolvedValue(null);
    expect(await reason(() => Mutation.updateSource(null, { id: 's1', data: { title: 'Neu', repositoryId: 'other-trashed' } }, ctx))).toBe(
      'REPOSITORY_NOT_FOUND',
    );
  });
});

describe('recycle bin', () => {
  it('moves a source into the recycle bin and restores it', async () => {
    prismaMock.source.findFirst.mockResolvedValue(source('s1') as never);
    expect(await Mutation.deleteSource(null, { id: 's1' }, ctx)).toBe(true);
    expect(prismaMock.source.update).toHaveBeenCalledWith({ where: { id: 's1' }, data: { isDeleted: true, deletedAt: expect.any(Date) } });
  });

  it('deletes a source for good only from the recycle bin, with the scans nothing else links', async () => {
    prismaMock.source.findUnique.mockResolvedValueOnce({ isDeleted: false } as never);
    expect(await reason(() => Mutation.hardDeleteSource(null, { id: 's1' }, ctx))).toBe('SOURCE_NOT_DELETED');

    prismaMock.source.findUnique.mockResolvedValueOnce({ isDeleted: true } as never);
    prismaMock.sourceMedia.findMany.mockResolvedValue([{ mediaId: 'scan' }] as never);
    prismaMock.citationMedia.findMany.mockResolvedValue([{ mediaId: 'page' }] as never);
    prismaMock.citation.findMany.mockResolvedValue([{ id: 'c1' }] as never);
    prismaMock.personCitation.findMany.mockResolvedValue([{ personId: 'p1', fact: 'BIRTH' }] as never);
    prismaMock.eventCitation.findMany.mockResolvedValue([]);
    prismaMock.relationCitation.findMany.mockResolvedValue([]);
    prismaMock.media.findMany.mockResolvedValue([
      { id: 'scan', fileName: 'scan.pdf' },
      { id: 'page', fileName: 'page.jpg' },
    ] as never);

    expect(await Mutation.hardDeleteSource(null, { id: 's1' }, ctx)).toBe(true);
    expect(prismaMock.source.delete).toHaveBeenCalledWith({ where: { id: 's1' } });
    // The persons whose facts lose a citation count as changed
    expect(prismaMock.person.updateMany).toHaveBeenCalledWith({ where: { id: { in: ['p1'] } }, data: { updatedAt: expect.any(Date) } });
    expect(removeUploadedFile).toHaveBeenCalledWith('scan.pdf');
    expect(removeUploadedFile).toHaveBeenCalledWith('page.jpg');
  });

  it('deletes an archive for good only from the recycle bin', async () => {
    prismaMock.repository.findUnique.mockResolvedValueOnce({ isDeleted: false } as never);
    expect(await reason(() => Mutation.hardDeleteRepository(null, { id: 'r1' }, ctx))).toBe('REPOSITORY_NOT_DELETED');
    prismaMock.repository.findUnique.mockResolvedValueOnce(null);
    expect(await reason(() => Mutation.hardDeleteRepository(null, { id: 'r1' }, ctx))).toBe('REPOSITORY_NOT_FOUND');
  });

  it('shows no archive while it is in the recycle bin', async () => {
    const shown = await sourceResolvers.Source.repository({ id: 's1', repositoryId: 'r1', repository: { isDeleted: true } }, null, ctx);
    expect(shown).toBeNull();
  });
});

describe('citations', () => {
  beforeEach(() => {
    prismaMock.citation.findFirst.mockResolvedValue({ id: 'c1', sourceId: 's1' } as never);
    prismaMock.citation.findUniqueOrThrow.mockResolvedValue({ id: 'c1', sourceId: 's1' } as never);
  });

  it('creates a citation and links it right away with the birth of a person of the active family tree', async () => {
    prismaMock.source.findFirst.mockResolvedValue(source('s1') as never);
    prismaMock.person.findFirst.mockResolvedValue({ id: 'p1' } as never);
    prismaMock.citation.create.mockResolvedValue({ id: 'c1' } as never);

    await Mutation.createCitation(
      null,
      { data: { sourceId: 's1', page: ' S. 12 ', date: '1880', datePrecision: 'YEAR', quality: 3 }, targets: [{ personId: 'p1', fact: 'BIRTH' }] },
      ctx,
    );

    expect(prismaMock.citation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ sourceId: 's1', page: 'S. 12', date: '1880', datePrecision: 'YEAR', quality: 3 }),
    });
    expect(prismaMock.person.findFirst).toHaveBeenCalledWith({ where: { id: 'p1', familyTreeId: TEST_TREE_ID } });
    expect(prismaMock.personCitation.createMany).toHaveBeenCalledWith({ data: [{ citationId: 'c1', personId: 'p1', fact: 'BIRTH' }], skipDuplicates: true });
  });

  it('refuses a quality outside 0 to 3, a source in the recycle bin and an unknown fact', async () => {
    prismaMock.source.findFirst.mockResolvedValue(source('s1') as never);
    expect(await reason(() => Mutation.createCitation(null, { data: { sourceId: 's1', quality: 4 } }, ctx))).toBe('INVALID_QUALITY');
    prismaMock.source.findFirst.mockResolvedValue(null);
    expect(await reason(() => Mutation.createCitation(null, { data: { sourceId: 'gone' } }, ctx))).toBe('SOURCE_NOT_FOUND');
    prismaMock.person.findFirst.mockResolvedValue({ id: 'p1' } as never);
    expect(await reason(() => Mutation.linkCitation(null, { citationId: 'c1', targets: [{ personId: 'p1', fact: 'BURIAL' }] }, ctx))).toBe('INVALID_FACT');
  });

  it('links one citation with several facts – each target names exactly one person, event or relation of the family tree', async () => {
    prismaMock.person.findFirst.mockResolvedValue({ id: 'groom' } as never);
    prismaMock.event.findFirst.mockResolvedValue({ id: 'wedding' } as never);
    prismaMock.relation.findFirst.mockResolvedValue({ id: 'marriage' } as never);

    await Mutation.linkCitation(null, { citationId: 'c1', targets: [{ personId: 'groom' }, { eventId: 'wedding' }, { relationId: 'marriage' }] }, ctx);

    expect(prismaMock.personCitation.createMany).toHaveBeenCalledWith({
      data: [{ citationId: 'c1', personId: 'groom', fact: 'GENERAL' }],
      skipDuplicates: true,
    });
    expect(prismaMock.eventCitation.createMany).toHaveBeenCalledWith({ data: [{ citationId: 'c1', eventId: 'wedding' }], skipDuplicates: true });
    expect(prismaMock.relationCitation.createMany).toHaveBeenCalledWith({ data: [{ citationId: 'c1', relationId: 'marriage' }], skipDuplicates: true });
    expect(prismaMock.event.findFirst).toHaveBeenCalledWith({ where: { id: 'wedding', person: { familyTreeId: TEST_TREE_ID } }, select: { id: true } });
    expect(prismaMock.relation.findFirst).toHaveBeenCalledWith({ where: { id: 'marriage', personA: { familyTreeId: TEST_TREE_ID } }, select: { id: true } });
    // A new link counts as a change of the fact
    expect(prismaMock.event.updateMany).toHaveBeenCalledWith({ where: { id: { in: ['wedding'] } }, data: { updatedAt: expect.any(Date) } });

    expect(await reason(() => Mutation.linkCitation(null, { citationId: 'c1', targets: [{ personId: 'groom', eventId: 'wedding' }] }, ctx))).toBe(
      'INVALID_CITATION_TARGET',
    );
    prismaMock.event.findFirst.mockResolvedValue(null);
    expect(await reason(() => Mutation.linkCitation(null, { citationId: 'c1', targets: [{ eventId: 'elsewhere' }] }, ctx))).toBe('EVENT_NOT_FOUND');
  });

  it('removes a single link', async () => {
    prismaMock.person.findFirst.mockResolvedValue({ id: 'p1' } as never);
    await Mutation.unlinkCitation(null, { citationId: 'c1', target: { personId: 'p1', fact: 'DEATH' } }, ctx);
    expect(prismaMock.personCitation.deleteMany).toHaveBeenCalledWith({ where: { citationId: 'c1', personId: 'p1', fact: 'DEATH' } });
  });

  it('lists the citations of a person, of its events and of its relations', async () => {
    prismaMock.person.findFirst.mockResolvedValue({ id: 'p1' } as never);
    prismaMock.personCitation.findMany.mockResolvedValue([{ fact: 'BIRTH', citation: { id: 'c1' } }] as never);
    prismaMock.eventCitation.findMany.mockResolvedValue([{ eventId: 'e1', citation: { id: 'c2' } }] as never);
    prismaMock.relationCitation.findMany.mockResolvedValue([{ relationId: 'r1', citation: { id: 'c1' } }] as never);

    const result = await Query.personCitations(null, { personId: 'p1' }, ctx);

    expect(result).toEqual([
      { kind: 'PERSON', fact: 'BIRTH', eventId: null, relationId: null, citation: { id: 'c1' } },
      { kind: 'EVENT', fact: null, eventId: 'e1', relationId: null, citation: { id: 'c2' } },
      { kind: 'RELATION', fact: null, eventId: null, relationId: 'r1', citation: { id: 'c1' } },
    ]);
    // Without sources in the recycle bin and without deleted relations
    expect(prismaMock.relationCitation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { relation: { active: true, OR: [{ personAId: 'p1' }, { personBId: 'p1' }] }, citation: { source: { isDeleted: false } } },
      }),
    );
  });

  it('shows the supported facts with person and family tree', async () => {
    const tree = { id: 'tree-2', name: 'Kraft' };
    prismaMock.personCitation.findMany.mockResolvedValue([{ fact: 'BIRTH', person: { id: 'p1', familyTree: tree } }] as never);
    prismaMock.eventCitation.findMany.mockResolvedValue([
      { event: { id: 'e1', title: 'Hochzeit', date: '1900', person: { id: 'p2', familyTree: tree } } },
    ] as never);
    prismaMock.relationCitation.findMany.mockResolvedValue([
      { relation: { id: 'r1', type: 'WIFE', personA: { id: 'p2', familyTree: tree }, personB: { id: 'p3' } } },
    ] as never);

    const links = await sourceResolvers.Citation.links({ id: 'c1' }, null, ctx);

    expect(links.map((l) => [l.kind, l.familyTreeName])).toEqual([
      ['PERSON', 'Kraft'],
      ['EVENT', 'Kraft'],
      ['RELATION', 'Kraft'],
    ]);
    expect(links[1]).toMatchObject({ eventId: 'e1', eventTitle: 'Hochzeit', eventDate: '1900' });
    expect(links[2]).toMatchObject({ relationId: 'r1', relationType: 'WIFE', otherPerson: { id: 'p3' } });
  });

  it('deletes a citation with its links and touches the facts it supported', async () => {
    prismaMock.citationMedia.findMany.mockResolvedValue([]);
    prismaMock.personCitation.findMany.mockResolvedValue([]);
    prismaMock.eventCitation.findMany.mockResolvedValue([{ eventId: 'e1' }] as never);
    prismaMock.relationCitation.findMany.mockResolvedValue([]);

    expect(await Mutation.deleteCitation(null, { id: 'c1' }, ctx)).toBe(true);
    expect(prismaMock.citation.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
    expect(prismaMock.event.updateMany).toHaveBeenCalledWith({ where: { id: { in: ['e1'] } }, data: { updatedAt: expect.any(Date) } });
  });
});

describe('search and statistics', () => {
  it('finds sources whose fields, archive or citations contain every word, without the recycle bin', async () => {
    emptyUsage();
    prismaMock.source.findMany.mockResolvedValue([source('s1')] as never);
    const hits = await Query.searchSources(null, { query: 'Taufe  Martin' }, ctx);
    expect(hits.map((s) => s.id)).toEqual(['s1']);
    const where = (prismaMock.source.findMany.mock.calls[0][0] as { where: { isDeleted: boolean; AND: unknown[] } }).where;
    expect(where.isDeleted).toBe(false);
    expect(where.AND).toHaveLength(2);
    expect(JSON.stringify(where.AND[0])).toContain('"citations":{"some"');
    expect(JSON.stringify(where.AND[0])).toContain('"repository":{"name"');
    expect(await Query.searchSources(null, { query: '   ' }, ctx)).toEqual([]);
  });

  it('counts the sources of the family tree and lists the most cited first', async () => {
    prismaMock.person.count.mockResolvedValueOnce(10).mockResolvedValueOnce(4);
    prismaMock.citation.count.mockResolvedValue(6);
    prismaMock.citation.findMany.mockResolvedValue([
      { id: 'c1', sourceId: 'a' },
      { id: 'c2', sourceId: 'b' },
    ] as never);
    (prismaMock.personCitation.groupBy as unknown as jest.Mock).mockResolvedValue([
      { citationId: 'c1', _count: { _all: 1 } },
      { citationId: 'c2', _count: { _all: 3 } },
    ]);
    (prismaMock.eventCitation.groupBy as unknown as jest.Mock).mockResolvedValue([]);
    (prismaMock.relationCitation.groupBy as unknown as jest.Mock).mockResolvedValue([]);
    prismaMock.source.findMany.mockResolvedValue([
      { id: 'a', title: 'Alpha', abbreviation: null, type: 'BOOK' },
      { id: 'b', title: 'Beta', abbreviation: null, type: 'CENSUS' },
      { id: 'unused', title: 'Gamma', abbreviation: null, type: 'OTHER' },
    ] as never);

    const stats = await Query.sourceStatistics(null, null, ctx);

    expect(stats).toMatchObject({ persons: 10, citedPersons: 4, citations: 6, sources: 2 });
    expect(stats.topSources.map((s) => [s.id, s.links])).toEqual([
      ['b', 3],
      ['a', 1],
    ]);
  });
});
