import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const mockDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cognatio-mcp-basics-'));
process.env.SETTINGS_FILE = path.join(mockDir, 'settings.json');

import { areaLevel, normalizePermissions, readOnlyPermissions, allows, noPermissions } from '../permissions.js';
import { disableMcp, enableMcp, hashToken, readMcpConfig, renewMcpToken, setMcpExcludedTrees, setMcpPermissions, tokenMatches } from '../config.js';
import { checkLifespan, relationDay, shownDay, storedDate, yearOf } from '../dates.js';
import { defaultTree, pickTree, rememberAppTree } from '../trees.js';
import { activitiesAfter, addActivity, rememberClient, resetActivities } from '../activity.js';
import { LocalFileError, mimeTypeOf, readableFile, writableFolder, zipFilesIn } from '../../files/localFiles.js';
import { paged, toolAllowed, type McpToolError } from '../tool.js';

afterAll(() => fs.rmSync(mockDir, { recursive: true, force: true }));

describe('permissions', () => {
  it('offers every level in every area and refuses unknown values', () => {
    expect(areaLevel('backup', 'write')).toBe('write');
    expect(areaLevel('statistics', 'delete')).toBe('delete');
    expect(areaLevel('familyTrees', 'delete')).toBe('delete');
    expect(areaLevel('persons', 'alles')).toBe('off');
    expect(areaLevel('persons', 42)).toBe('off');
  });

  it('fills missing areas with "off" and compares levels', () => {
    const permissions = normalizePermissions({ persons: 'write', unbekannt: 'delete' });
    expect(permissions.persons).toBe('write');
    expect(permissions.media).toBe('off');
    expect(allows(permissions, 'persons', 'read')).toBe(true);
    expect(allows(permissions, 'persons', 'delete')).toBe(false);
    expect(Object.values(noPermissions()).every((level) => level === 'off')).toBe(true);
  });

  it('allows a tool of several areas if one of them is enough', () => {
    const permissions = { ...noPermissions(), backup: 'read' as const };
    expect(toolAllowed(permissions, { area: ['transfer', 'backup'], level: 'read' })).toBe(true);
    expect(toolAllowed(permissions, { area: 'transfer', level: 'read' })).toBe(false);
  });
});

describe('settings and token', () => {
  it('is off without settings', () => {
    expect(readMcpConfig()).toMatchObject({ enabled: false, tokenHash: null, excludedTrees: [] });
  });

  it('switches on with "read" everywhere and keeps only the hash of the token', () => {
    const { token, config } = enableMcp();
    expect(token).toMatch(/^[\w-]{43}$/);
    expect(config.permissions).toEqual(readOnlyPermissions());
    const stored = fs.readFileSync(process.env.SETTINGS_FILE!, 'utf8');
    expect(stored).not.toContain(token);
    expect(stored).toContain(hashToken(token));
    expect(tokenMatches(token, readMcpConfig().tokenHash)).toBe(true);
    expect(tokenMatches(`${token}x`, readMcpConfig().tokenHash)).toBe(false);
    expect(tokenMatches(null, readMcpConfig().tokenHash)).toBe(false);
  });

  it('replaces the token without touching the permissions', () => {
    const first = enableMcp().token;
    setMcpPermissions({ ...readOnlyPermissions(), persons: 'write' });
    const { token } = renewMcpToken();
    expect(tokenMatches(first, readMcpConfig().tokenHash)).toBe(false);
    expect(tokenMatches(token, readMcpConfig().tokenHash)).toBe(true);
    expect(readMcpConfig().permissions.persons).toBe('write');
  });

  it('switching off makes the token invalid; switching on again starts with "read"', () => {
    const { token } = enableMcp();
    setMcpPermissions({ ...readOnlyPermissions(), backup: 'delete' });
    disableMcp();
    expect(readMcpConfig()).toMatchObject({ enabled: false, tokenHash: null });
    expect(tokenMatches(token, readMcpConfig().tokenHash)).toBe(false);
    expect(enableMcp().config.permissions.backup).toBe('read');
  });

  it('keeps excluded family trees once each and the other settings of the file', () => {
    fs.writeFileSync(process.env.SETTINGS_FILE!, JSON.stringify({ limits: { importMb: 100 } }));
    enableMcp();
    setMcpExcludedTrees(['a', 'b', 'a']);
    expect(readMcpConfig().excludedTrees).toEqual(['a', 'b']);
    expect(JSON.parse(fs.readFileSync(process.env.SETTINGS_FILE!, 'utf8')).limits).toEqual({ importMb: 100 });
  });

  it('counts a damaged entry as switched off', () => {
    fs.writeFileSync(process.env.SETTINGS_FILE!, JSON.stringify({ mcp: { enabled: true, tokenHash: 'kurz', permissions: 'alles' } }));
    expect(readMcpConfig()).toMatchObject({ enabled: false, tokenHash: null });
    expect(readMcpConfig().permissions.persons).toBe('off');
  });
});

describe('dates', () => {
  it('stores dates in the form of the app with the precision of their form', () => {
    expect(storedDate('Born', '1951-09-14')).toMatchObject({ date: '14.09.1951', precision: 'EXACT' });
    expect(storedDate('Born', '1951-09')).toMatchObject({ date: '09.1951', precision: 'MONTH' });
    expect(storedDate('Born', '14.9.1951')).toMatchObject({ date: '14.9.1951', precision: 'EXACT' });
    expect(storedDate('Born', '2. Oktober 1951')).toMatchObject({ date: '02.10.1951', precision: 'EXACT' });
    expect(storedDate('Born', '1951')).toMatchObject({ date: '1951', precision: 'YEAR' });
    expect(storedDate('Born', 'um 1951')).toMatchObject({ date: 'um 1951', precision: 'APPROXIMATE' });
    expect(storedDate('Born', 'about 1951')).toMatchObject({ precision: 'APPROXIMATE' });
    expect(storedDate('Born', '1949-1951')).toMatchObject({ precision: 'APPROXIMATE' });
    expect(storedDate('Born', '  ')).toEqual({ date: null, precision: null, parsed: null });
  });

  it('refuses dates the form of the app refuses', () => {
    const refused = (value: string) => {
      try {
        storedDate('The date of birth', value);
      } catch (err) {
        return err as McpToolError;
      }
      throw new Error(`"${value}" was accepted`);
    };
    expect(refused('31.02.1910')).toMatchObject({ reason: 'INVALID_DATE', message: expect.stringContaining('The date of birth "31.02.1910"') });
    expect(refused('45.13.1951').reason).toBe('INVALID_DATE');
    expect(refused('irgendwann mal').reason).toBe('INVALID_DATE');
    expect(refused('2090').message).toContain('lies in the future');
    expect(refused('1987-1985').message).toContain('ends before it starts');
  });

  it('refuses a death before the birth and a life that is too long', () => {
    const born = storedDate('b', '1950').parsed;
    expect(() => checkLifespan(born, storedDate('d', '1949').parsed)).toThrow(expect.objectContaining({ reason: 'DEATH_BEFORE_BIRTH' }));
    expect(() => checkLifespan(born, storedDate('d', '1950').parsed)).not.toThrow();
    expect(() => checkLifespan(storedDate('b', '1800').parsed, storedDate('d', '1950').parsed)).toThrow(
      expect.objectContaining({ reason: 'LIFESPAN_TOO_LONG' }),
    );
    expect(() => checkLifespan(null, born)).not.toThrow();
  });

  it('turns days of relations into ISO dates and shows them like the app', () => {
    expect(relationDay('Start', '12.6.1948')).toBe('1948-06-12');
    expect(relationDay('Start', '1948-06-12')).toBe('1948-06-12');
    expect(relationDay('Start', '')).toBeNull();
    expect(relationDay('Start', undefined)).toBeUndefined();
    expect(() => relationDay('Start', '1948')).toThrow('must be a complete day');
    expect(() => relationDay('Start', '30.02.1948')).toThrow(expect.objectContaining({ reason: 'INVALID_DATE' }));
    expect(shownDay('1948-06-12T00:00:00.000Z')).toBe('12.06.1948');
    expect(shownDay(null)).toBeNull();
  });

  it('reads the year of a date', () => {
    expect(yearOf('um 1925')).toBe(1925);
    expect(yearOf('1969-1970')).toBe(1969);
    expect(yearOf(null)).toBeNull();
  });
});

describe('family tree of a call', () => {
  const trees = [
    { id: 'b', name: 'Weber', createdAt: '2026-02-01' },
    { id: 'a', name: 'Kraft', createdAt: '2026-01-01' },
  ];

  it('defaults to the tree the app showed last, otherwise the oldest', () => {
    expect(defaultTree(trees)?.id).toBe('a');
    rememberAppTree('b');
    expect(defaultTree(trees)?.id).toBe('b');
    rememberAppTree(null);
    expect(defaultTree(trees)?.id).toBe('b');
    expect(defaultTree([])).toBeNull();
  });

  it('finds a tree by id or name and names the available ones otherwise', () => {
    expect(pickTree(trees, 'KRAFT').id).toBe('a');
    expect(pickTree(trees, 'b').id).toBe('b');
    expect(() => pickTree(trees, 'Müller')).toThrow('Available: "Weber", "Kraft"');
    expect(() => pickTree([], undefined)).toThrow('There is no family tree');
  });

  it('asks for the id when two family trees have the same name', () => {
    const twins = [...trees, { id: 'c', name: 'kraft ' }];
    expect(() => pickTree(twins, 'Kraft')).toThrow(expect.objectContaining({ reason: 'TREE_AMBIGUOUS', message: expect.stringContaining('a, c') }));
    expect(pickTree(twins, 'c').id).toBe('c');
  });
});

describe('activity', () => {
  it('numbers the entries and names the client', () => {
    resetActivities();
    rememberClient('  claude-code  ');
    rememberClient(42);
    addActivity({ tool: 'add_note', tree: 'Kraft', target: 'Anna Kraft', ok: true }, new Date('2026-10-21T10:00:00Z'));
    addActivity({ tool: 'add_event', tree: 'Kraft', target: null, ok: false, reason: 'PERSON_NOT_FOUND' });
    expect(activitiesAfter(0)).toEqual({
      last: 2,
      entries: [
        { seq: 1, at: '2026-10-21T10:00:00.000Z', tool: 'add_note', client: 'claude-code', tree: 'Kraft', target: 'Anna Kraft', ok: true },
        expect.objectContaining({ seq: 2, ok: false, reason: 'PERSON_NOT_FOUND' }),
      ],
    });
    expect(activitiesAfter(2).entries).toEqual([]);
  });
});

describe('files of this computer', () => {
  const root = fs.mkdtempSync(path.join(mockDir, 'root-'));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'cognatio-outside-'));
  afterAll(() => fs.rmSync(outside, { recursive: true, force: true }));

  it('accepts files and folders only inside the allowed folders', () => {
    const file = path.join(root, 'scan.jpg');
    fs.writeFileSync(file, 'x');
    fs.writeFileSync(path.join(outside, 'fremd.txt'), 'x');
    expect(readableFile(file, [root])).toBe(fs.realpathSync(file));
    expect(writableFolder(root, [root])).toBe(fs.realpathSync(root));
    expect(() => readableFile(path.join(outside, 'fremd.txt'), [root])).toThrow(LocalFileError);
    expect(() => readableFile(path.join(root, '..', '..', path.basename(outside), 'fremd.txt'), [root])).toThrow('Only files in these folders');
    expect(() => readableFile('relativ/scan.jpg', [root])).toThrow('absolute path');
    expect(() => readableFile(path.join(root, 'fehlt.jpg'), [root])).toThrow('Not found');
    expect(() => readableFile(root, [root])).toThrow('Not a file');
    expect(() => writableFolder(file, [root])).toThrow('Not a folder');
  });

  it('names the media type by the extension and lists ZIP files newest first', () => {
    expect(mimeTypeOf('a.JPG')).toBe('image/jpeg');
    expect(mimeTypeOf('a.xyz')).toBe('application/octet-stream');
    fs.writeFileSync(path.join(root, 'alt.zip'), 'x');
    fs.utimesSync(path.join(root, 'alt.zip'), new Date('2020-01-01'), new Date('2020-01-01'));
    fs.writeFileSync(path.join(root, 'neu.zip'), 'xy');
    expect(zipFilesIn(root).map((f) => path.basename(f.file))).toEqual(['neu.zip', 'alt.zip']);
    expect(zipFilesIn(path.join(root, 'fehlt'))).toEqual([]);
  });
});

describe('pages', () => {
  it('cuts a list into pages', () => {
    const items = Array.from({ length: 120 }, (_, i) => i);
    expect(paged(items, 3)).toEqual({ total: 120, page: 3, pages: 3, items: items.slice(100) });
    expect(paged([], 1)).toEqual({ total: 0, page: 1, pages: 1, items: [] });
  });
});
