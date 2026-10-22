import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import express, { type Express } from 'express';
import { prismaMock } from '../../../test/prismaMock.js';

const mockDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cognatio-mcp-'));
process.env.SETTINGS_FILE = path.join(mockDir, 'settings.json');

jest.mock('../../logger.js', () => {
  const actual = jest.requireActual('../../logger.js');
  return { ...actual, logger: new actual.Logger({ level: 'error', console: 'off', file: null }) };
});
jest.mock('../../prisma.js', () => ({ prisma: prismaMock }));
jest.mock('../../files/uploads.js', () => ({ uploadDir: mockDir, removeUploadedFile: jest.fn(), ensureUploadDir: jest.fn(), removeTempFile: jest.fn() }));

import { createApp } from '../../../app.js';
import { enableMcp, readMcpConfig, setMcpExcludedTrees, setMcpPermissions } from '../config.js';
import { resetActivities, activitiesAfter } from '../activity.js';
import { readOnlyPermissions } from '../permissions.js';
import { mcpRouter } from '../route.js';
import { requestLogger } from '../../requestLogging.js';
import { Logger } from '../../logger.js';

let app: Express;
let token: string;

const TREES = [
  {
    id: 'tree-1',
    name: 'Kraft',
    description: null,
    isDeleted: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    _count: { persons: 2 },
  },
  {
    id: 'tree-2',
    name: 'Weber',
    description: null,
    isDeleted: false,
    createdAt: new Date('2026-02-01'),
    updatedAt: new Date('2026-02-01'),
    _count: { persons: 0 },
  },
];

const PERSON = {
  id: 'p1',
  firstName: 'Anna',
  lastName: 'Kraft',
  middleName: null,
  birthName: null,
  title: null,
  nickname: null,
  gender: 'FEMALE',
  birthDate: '14.09.1951',
  birthDatePrecision: 'EXACT',
  birthPlace: 'Leipzig',
  deathDate: null,
  deathDatePrecision: null,
  deathPlace: null,
  occupation: null,
  isDeleted: false,
  familyTreeId: 'tree-1',
  languages: [],
  profilePictureId: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const rpc = (body: unknown, auth: string | null = token) => {
  const req = request(app).post('/mcp').set('Content-Type', 'application/json').set('Accept', 'application/json, text/event-stream');
  return (auth ? req.set('Authorization', `Bearer ${auth}`) : req).send(body as object);
};

const call = (name: string, args: Record<string, unknown> = {}) => rpc({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } });

const listTools = async () => (await rpc({ jsonrpc: '2.0', id: 1, method: 'tools/list' })).body.result.tools.map((t: { name: string }) => t.name) as string[];

const textOf = (res: request.Response) => res.body.result.content[0].text as string;

beforeAll(async () => {
  app = await createApp();
});
beforeEach(() => {
  token = enableMcp().token;
  resetActivities();
  prismaMock.familyTree.findMany.mockResolvedValue(TREES as never);
});
afterAll(() => fs.rmSync(mockDir, { recursive: true, force: true }));

describe('access to /mcp', () => {
  it('answers initialize with the server name and instructions', async () => {
    const res = await rpc({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'claude-code', version: '1' } },
    });
    expect(res.status).toBe(200);
    expect(res.body.result.serverInfo.name).toBe('cognatio');
    expect(res.body.result.instructions).toContain('familyTree');
  });

  it('refuses a missing or wrong token (401), a web page (403) and everything while switched off (404)', async () => {
    expect((await rpc({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, null)).status).toBe(401);
    expect((await rpc({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, 'falsch')).status).toBe(401);
    const page = await request(app).post('/mcp').set('Origin', 'https://fremd.example').set('Authorization', `Bearer ${token}`).send({});
    expect(page.status).toBe(403);

    fs.writeFileSync(process.env.SETTINGS_FILE!, JSON.stringify({ mcp: { ...readMcpConfig(), enabled: false } }));
    const off = await rpc({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
    expect(off.status).toBe(404);
    expect(off.body.reason).toBe('MCP_DISABLED');
  });

  it('refuses a foreign host name (DNS rebinding)', async () => {
    const res = await rpc({ jsonrpc: '2.0', id: 1, method: 'tools/list' }).set('Host', 'boese.example');
    expect(res.status).toBe(403);
  });

  it('does not need the token of the app', async () => {
    process.env.COGNATIO_ACCESS_TOKEN = 'app-token';
    try {
      const withToken = await createApp();
      const res = await request(withToken)
        .post('/mcp')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json, text/event-stream')
        .set('Authorization', `Bearer ${token}`)
        .send({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
      expect(res.status).toBe(200);
      // … and the token of MCP opens nothing else
      expect((await request(withToken).get('/api/v1/jobs').set('Authorization', `Bearer ${token}`)).status).toBe(401);
    } finally {
      delete process.env.COGNATIO_ACCESS_TOKEN;
    }
  });

  it('allows only POST (stateless, no stream)', async () => {
    expect((await request(app).get('/mcp').set('Authorization', `Bearer ${token}`)).status).toBe(405);
  });
});

describe('the access log', () => {
  /** The level of the line the access log writes for one request */
  const levelOf = async (send: (app: Express) => request.Test) => {
    const log = new Logger({ level: 'debug', console: 'off', file: null, maxFileBytes: 0, keepFiles: 0 });
    const lines = jest.spyOn(log, 'log');
    const logged = express().use(requestLogger(log)).use('/mcp', mcpRouter(jest.fn()));
    await send(logged);
    return lines.mock.calls.find(([, msg]) => msg.startsWith('POST /mcp') || msg.startsWith('GET /mcp'))?.[0];
  };
  const post = (app: Express, version: string, body: object) =>
    request(app)
      .post('/mcp')
      .set('Authorization', `Bearer ${token}`)
      .set('Accept', 'application/json, text/event-stream')
      .set('Mcp-Protocol-Version', version)
      .send(body);

  it('keeps the steps of a normal connection out of the warnings: the probe of a newer version and the stream', async () => {
    expect(await levelOf((app) => post(app, '2099-01-01', { jsonrpc: '2.0', id: 1, method: 'tools/list' }).expect(400))).toBe('debug');
    expect(await levelOf((app) => request(app).get('/mcp').set('Authorization', `Bearer ${token}`).expect(405))).toBe('debug');
  });

  it('still warns about other refused requests', async () => {
    expect(await levelOf((app) => post(app, '2025-06-18', { nonsense: true }).expect(400))).toBe('warn');
    expect(await levelOf((app) => request(app).post('/mcp').send({}).expect(401))).toBe('warn');
  });
});

describe('tools and permissions', () => {
  it('lists only reading tools after switching on', async () => {
    const tools = await listTools();
    expect(tools).toEqual(expect.arrayContaining(['search', 'get_person', 'list_family_trees', 'list_sources', 'get_job', 'list_backups']));
    expect(tools).not.toContain('create_backup');
    expect(tools).not.toEqual(expect.arrayContaining(['create_person']));
    expect(tools.filter((name) => /^(create_person|update_|add_|delete_|remove_|restore_|import_|set_)/.test(name))).toEqual([]);
  });

  it('lists the changing tools of an area with "write" and "delete"', async () => {
    setMcpPermissions({ ...readOnlyPermissions(), persons: 'write' });
    let tools = await listTools();
    expect(tools).toEqual(expect.arrayContaining(['create_person', 'add_event', 'create_relation', 'move_to_recycle_bin']));
    expect(tools).not.toContain('delete_event');
    expect(tools).not.toContain('create_source');

    setMcpPermissions({ ...readOnlyPermissions(), persons: 'delete', backup: 'delete' });
    tools = await listTools();
    expect(tools).toEqual(expect.arrayContaining(['delete_event', 'delete_note', 'restore_backup']));
  });

  it('lists nothing of an area that is off', async () => {
    setMcpPermissions({ ...readOnlyPermissions(), persons: 'off', sources: 'off' });
    const tools = await listTools();
    expect(tools).not.toContain('search');
    expect(tools).not.toContain('list_sources');
    expect(tools).toContain('list_family_trees');
  });

  it('refuses a tool the permissions do not allow', async () => {
    const res = await call('create_person', { firstName: 'Anna' });
    expect(res.body.result.isError).toBe(true);
    expect(prismaMock.person.create).not.toHaveBeenCalled();
  });

  it('checks the permission again when the tool runs', async () => {
    const { callTool } = await import('../server.js');
    const { createPerson } = await import('../tools/changes.js');
    const result = await callTool(createPerson, { firstName: 'Anna' }, () => jest.fn() as never);
    expect(result.isError).toBe(true);
    expect((result.content[0] as { text: string }).text).toMatch(/^NOT_ALLOWED/);
    expect(activitiesAfter(0).entries).toEqual([expect.objectContaining({ tool: 'create_person', ok: false, reason: 'NOT_ALLOWED' })]);
  });
});

describe('family trees', () => {
  it('lists the trees without the excluded ones and marks the oldest as default', async () => {
    setMcpExcludedTrees(['tree-2']);
    const res = await call('list_family_trees');
    expect(JSON.parse(textOf(res))).toEqual([{ id: 'tree-1', name: 'Kraft', persons: 2, default: true }]);
  });

  it('refuses an excluded or unknown family tree by name', async () => {
    setMcpExcludedTrees(['tree-2']);
    const res = await call('list_persons', { familyTree: 'Weber' });
    expect(res.body.result.isError).toBe(true);
    expect(textOf(res)).toMatch(/^TREE_NOT_FOUND: No family tree "Weber". Available: "Kraft"/);
  });

  it('works in the family tree named by its name', async () => {
    prismaMock.person.findMany.mockResolvedValueOnce([PERSON] as never);
    const res = await call('list_persons', { familyTree: 'kraft' });
    expect(prismaMock.person.findMany.mock.calls[0][0]?.where).toMatchObject({ familyTreeId: 'tree-1' });
    const answer = JSON.parse(textOf(res));
    expect(answer).toMatchObject({ total: 1, page: 1, pages: 1 });
    expect(answer.items[0]).toEqual({
      id: 'p1',
      name: 'Anna Kraft',
      gender: 'FEMALE',
      birth: { date: '14.09.1951', place: 'Leipzig' },
      death: null,
      living: true,
    });
  });
});

describe('changes', () => {
  beforeEach(() => setMcpPermissions({ ...readOnlyPermissions(), persons: 'write' }));

  it('creates nothing when there are possible duplicates', async () => {
    prismaMock.person.findMany.mockResolvedValue([PERSON] as never);
    const res = await call('create_person', { firstName: 'Anna', lastName: 'Kraft', birthDate: '1951-09-14' });
    const answer = JSON.parse(textOf(res));
    expect(answer.created).toBe(false);
    expect(answer.possibleDuplicates[0].id).toBe('p1');
    expect(prismaMock.person.create).not.toHaveBeenCalled();
  });

  it('creates a person with the date in the form of the app and records the activity', async () => {
    prismaMock.person.findMany.mockResolvedValue([]);
    prismaMock.person.create.mockImplementation(((args: { data: Record<string, unknown> }) => Promise.resolve({ ...PERSON, ...args.data, id: 'p2' })) as never);
    const res = await rpc({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'create_person', arguments: { firstName: 'Karl', lastName: 'Kraft', birthDate: '1920-03-05', gender: 'MALE' } },
    });
    expect(JSON.parse(textOf(res))).toMatchObject({ created: true, person: { id: 'p2', name: 'Karl Kraft' } });
    expect(prismaMock.person.create.mock.calls[0][0].data).toMatchObject({
      firstName: 'Karl',
      birthDate: '05.03.1920',
      birthDatePrecision: 'EXACT',
      familyTreeId: 'tree-1',
    });
    expect(activitiesAfter(0).entries).toEqual([expect.objectContaining({ tool: 'create_person', tree: 'Kraft', target: 'Karl Kraft', ok: true })]);
  });

  it('passes the errors of the app on with their reason', async () => {
    prismaMock.person.findFirst.mockResolvedValue(null);
    const res = await call('update_person', { id: 'gibt-es-nicht', lastName: 'Weber' });
    expect(textOf(res)).toMatch(/^PERSON_NOT_FOUND/);
  });

  it('checks the arguments', async () => {
    const res = await call('create_relation', { personId: 'p1', relatedPersonId: 'p2', relation: 'ONKEL' });
    expect(res.body.result?.isError ?? res.body.error).toBeTruthy();
  });
});

describe('the settings section "MCP"', () => {
  it('cannot be read or changed through the GraphQL operations an assistant runs', async () => {
    const { graphqlRunner } = await import('../graphql.js');
    const { ApolloServer } = await import('@apollo/server');
    const { typeDefs } = await import('../../../schema/typeDefs.js');
    const { resolvers } = await import('../../../resolvers/index.js');
    const server = new ApolloServer({ typeDefs, resolvers });
    await server.start();
    const gql = graphqlRunner(server as never, prismaMock as never)(null);
    await expect(gql('mutation { setMcpPermissions(permissions: [{ area: "backup", level: "delete" }]) { enabled } }')).rejects.toMatchObject({
      reason: 'MCP_SETTINGS_FORBIDDEN',
    });
    await expect(gql('{ mcpSettings { enabled } }')).rejects.toMatchObject({ reason: 'MCP_SETTINGS_FORBIDDEN' });
    await server.stop();
  });

  it('is shown to the app without the token', async () => {
    const res = await request(app).post('/graphql').send({ query: '{ mcpSettings { enabled permissions { area level levels } excludedTrees } }' });
    const settings = res.body.data.mcpSettings;
    expect(settings.enabled).toBe(true);
    expect(settings.permissions).toContainEqual({ area: 'backup', level: 'read', levels: ['off', 'read', 'write', 'delete'] });
    expect(JSON.stringify(res.body)).not.toContain(token);
  });
});
