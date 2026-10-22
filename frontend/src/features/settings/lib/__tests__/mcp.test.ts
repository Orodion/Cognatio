import { describe, expect, it } from 'vitest';
import {
  allState,
  changesForAll,
  claudeCodeCommand,
  clientJson,
  isTicked,
  levelAfter,
  permissionSummary,
  warningFor,
  warningForChanges,
  type McpPermission,
} from '@/features/settings/lib/mcp';

const permission = (area: string, level: McpPermission['level'], levels: McpPermission['levels'] = ['off', 'read', 'write', 'delete']): McpPermission => ({
  area,
  level,
  levels,
});

describe('warningFor', () => {
  it('warns only when a level is raised to write or delete', () => {
    expect(warningFor('read', 'write')).toBe('write');
    expect(warningFor('off', 'delete')).toBe('delete');
    expect(warningFor('write', 'delete')).toBe('delete');
    expect(warningFor('off', 'read')).toBeNull();
    expect(warningFor('delete', 'write')).toBeNull();
  });
});

describe('permissionSummary', () => {
  it('names off, nothing, read only, read and write, deleting and everything', () => {
    expect(permissionSummary({ enabled: false, permissions: [] })).toBe('off');
    expect(permissionSummary({ enabled: true, permissions: [permission('persons', 'off')] })).toBe('nothing');
    expect(permissionSummary({ enabled: true, permissions: [permission('persons', 'read'), permission('backup', 'off')] })).toBe('readOnly');
    expect(permissionSummary({ enabled: true, permissions: [permission('persons', 'write'), permission('backup', 'read')] })).toBe('readWrite');
    expect(permissionSummary({ enabled: true, permissions: [permission('persons', 'delete'), permission('backup', 'read')] })).toBe('withDelete');
    expect(permissionSummary({ enabled: true, permissions: [permission('persons', 'delete'), permission('statistics', 'read', ['off', 'read'])] })).toBe(
      'everything',
    );
  });
});

describe('client configuration', () => {
  it('builds the command for Claude Code and the JSON block', () => {
    expect(claudeCodeCommand('http://127.0.0.1:5123/mcp', 'abc')).toBe(
      'claude mcp add --transport http cognatio http://127.0.0.1:5123/mcp --header "Authorization: Bearer abc"',
    );
    expect(JSON.parse(clientJson('http://127.0.0.1:5123/mcp', 'abc'))).toEqual({
      mcpServers: { cognatio: { type: 'http', url: 'http://127.0.0.1:5123/mcp', headers: { Authorization: 'Bearer abc' } } },
    });
  });
});

describe('boxes of the permissions', () => {
  const persons = permission('persons', 'read');
  const backup = permission('backup', 'read', ['off', 'read', 'delete']);

  it('ticks the lower levels with a higher one', () => {
    expect(isTicked(permission('persons', 'write'), 'read')).toBe(true);
    expect(isTicked(permission('persons', 'write'), 'delete')).toBe(false);
  });

  it('sets a level by ticking and falls back to the next lower one by unticking', () => {
    expect(levelAfter(persons, 'delete', true)).toBe('delete');
    expect(levelAfter(permission('persons', 'delete'), 'write', true)).toBe('delete');
    expect(levelAfter(permission('persons', 'delete'), 'write', false)).toBe('read');
    expect(levelAfter(permission('persons', 'write'), 'read', false)).toBe('off');
    expect(levelAfter(permission('backup', 'delete', ['off', 'read', 'delete']), 'delete', false)).toBe('read');
    expect(levelAfter(persons, 'delete', false)).toBe('read');
  });

  it('changes all areas at once, an area without the level takes the next lower one', () => {
    expect(changesForAll([persons, backup], 'write', true)).toEqual([{ area: 'persons', from: 'read', level: 'write' }]);
    expect(changesForAll([persons, backup], 'delete', true)).toEqual([
      { area: 'persons', from: 'read', level: 'delete' },
      { area: 'backup', from: 'read', level: 'delete' },
    ]);
    expect(changesForAll([permission('persons', 'delete'), backup], 'read', false)).toEqual([
      { area: 'persons', from: 'delete', level: 'off' },
      { area: 'backup', from: 'read', level: 'off' },
    ]);
  });

  it('shows the box of all areas ticked, partly ticked or not ticked', () => {
    expect(allState([persons, backup], 'read')).toBe('all');
    expect(allState([permission('persons', 'write'), backup], 'write')).toBe('all');
    expect(allState([permission('persons', 'delete'), backup], 'delete')).toBe('some');
    expect(allState([persons, backup], 'delete')).toBe('none');
  });

  it('warns once, with the strongest warning', () => {
    expect(warningForChanges(changesForAll([persons, backup], 'delete', true))).toBe('delete');
    expect(warningForChanges([{ area: 'persons', from: 'read', level: 'write' }])).toBe('write');
    expect(warningForChanges([{ area: 'persons', from: 'write', level: 'read' }])).toBeNull();
  });
});
