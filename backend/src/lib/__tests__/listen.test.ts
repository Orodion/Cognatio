import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { listen } from '../listen.js';

const ok: Parameters<typeof listen>[0] = (_req, res) => res.end('ok');
const portOf = (server: Server) => (server.address() as AddressInfo).port;
const close = (server: Server) => new Promise((resolve) => server.close(resolve));

describe('listen', () => {
  let taken: Server;

  beforeAll(async () => {
    taken = await listen(ok, 0, '127.0.0.1');
  });
  afterAll(() => close(taken));

  it('listens on the given port', async () => {
    const first = await listen(ok, 0, '127.0.0.1');
    const port = portOf(first);
    await close(first);
    const again = await listen(ok, port, '127.0.0.1');
    expect(portOf(again)).toBe(port);
    await close(again);
  });

  it('fails on a taken port without fallback', async () => {
    await expect(listen(ok, portOf(taken), '127.0.0.1')).rejects.toMatchObject({ code: 'EADDRINUSE' });
  });

  it('takes a free port when the asked one is taken', async () => {
    const server = await listen(ok, portOf(taken), '127.0.0.1', true);
    expect(portOf(server)).not.toBe(portOf(taken));
    expect(portOf(server)).toBeGreaterThan(0);
    await close(server);
  });
});
