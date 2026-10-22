/**
 * The port the server listens on, known after the start: the settings section "MCP" shows the address an assistant
 * connects to. `changed`: the desktop app asked for the port of its last start, but it was taken – a client set up
 * with the old address must be given the new one.
 */
let current: { port: number; changed: boolean } | null = null;

export function setServerPort(port: number, requested: number) {
  current = { port, changed: requested !== 0 && requested !== port };
}

export const serverPort = () => current;
