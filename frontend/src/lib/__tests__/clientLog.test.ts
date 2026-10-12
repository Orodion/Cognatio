import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MAX_CLIENT_LOG_ENTRIES, clearClientLog, describeArgs, formatClientLog, getClientLog, installClientLog, logClient } from '../clientLog';

beforeEach(() => {
  clearClientLog();
  sessionStorage.clear();
});

describe('client log', () => {
  it('collects entries with time and level and formats them as JSON lines', () => {
    logClient('warn', 'first');
    logClient('error', 'second');
    const log = getClientLog();
    expect(log.map((e) => [e.level, e.msg])).toEqual([
      ['warn', 'first'],
      ['error', 'second'],
    ]);
    expect(new Date(log[0].time).toString()).not.toBe('Invalid Date');
    expect(
      formatClientLog()
        .split('\n')
        .map((l) => JSON.parse(l).msg),
    ).toEqual(['first', 'second']);
  });

  it('keeps only the last entries and cuts very long messages', () => {
    for (let i = 0; i < MAX_CLIENT_LOG_ENTRIES + 20; i++) {
      logClient('info', `entry ${i}`);
    }
    const log = getClientLog();
    expect(log).toHaveLength(MAX_CLIENT_LOG_ENTRIES);
    expect(log[log.length - 1].msg).toBe(`entry ${MAX_CLIENT_LOG_ENTRIES + 19}`);

    clearClientLog();
    logClient('error', 'x'.repeat(10_000));
    expect(getClientLog()[0].msg.length).toBeLessThan(4100);
  });

  it('survives a reload through the session storage', () => {
    logClient('error', 'remembered');
    expect(JSON.parse(sessionStorage.getItem('cognatio-client-log')!)[0].msg).toBe('remembered');
  });

  it('describes errors with their stack and objects as JSON', () => {
    const text = describeArgs(['failed:', new Error('boom'), { id: 1 }, 42]);
    expect(text).toContain('failed:');
    expect(text).toContain('Error: boom');
    expect(text).toContain('{"id":1}');
    expect(text).toContain('42');
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(() => describeArgs([cyclic])).not.toThrow();
  });

  it('collects console warnings and errors, uncaught errors and rejections – and only installs once', () => {
    const original = { warn: vi.fn(), error: vi.fn() };
    const target = Object.assign(new EventTarget(), {
      // Copy: installing replaces the functions of this object
      console: { ...original },
      location: { pathname: '/settings' },
    }) as unknown as Window & typeof globalThis;
    installClientLog(target);
    installClientLog(target);

    target.console.warn('careful', 1);
    target.console.error(new Error('bad'));
    const error = new Event('error') as Event & { message: string; filename: string; lineno: number; colno: number; error: Error };
    Object.assign(error, { message: 'oops', filename: 'app.js', lineno: 3, colno: 4, error: undefined });
    target.dispatchEvent(error);
    const rejection = new Event('unhandledrejection') as Event & { reason: unknown };
    rejection.reason = new Error('rejected');
    target.dispatchEvent(rejection);

    // The original functions are still called
    expect(original.warn).toHaveBeenCalledWith('careful', 1);
    expect(original.error).toHaveBeenCalledTimes(1);
    const messages = getClientLog().map((e) => `${e.level}: ${e.msg}`);
    expect(messages).toEqual(
      expect.arrayContaining([
        'warn: careful 1',
        expect.stringMatching(/^error: Error: bad/),
        'error: Uncaught error: oops (app.js:3:4)',
        expect.stringMatching(/^error: Unhandled promise rejection: Error: rejected/),
      ]),
    );
    // Not twice although installed twice
    expect(messages.filter((m) => m.startsWith('warn: careful'))).toHaveLength(1);
  });
});
