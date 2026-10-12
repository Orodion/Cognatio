import http, { type RequestListener, type Server } from 'node:http';

/**
 * Starts the HTTP server. With `fallback` a port that is taken or forbidden (EADDRINUSE; EACCES: a range reserved by
 * Windows) is replaced by a free one: the desktop app asks for the port of the last start, which may be in use by now.
 */
export function listen(handler: RequestListener, port: number, host: string, fallback = false): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(handler);
    const onError = (err: NodeJS.ErrnoException) => {
      if (fallback && port !== 0 && (err.code === 'EADDRINUSE' || err.code === 'EACCES')) {
        resolve(listen(handler, 0, host));
        return;
      }
      reject(err);
    };
    server.once('error', onError);
    server.listen(port, host, () => {
      server.off('error', onError);
      resolve(server);
    });
  });
}
