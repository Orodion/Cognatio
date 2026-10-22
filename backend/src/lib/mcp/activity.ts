/**
 * Changes of AI assistants while the backend runs: the page "Activity" shows one entry per tool call ("Claude added a
 * life event to Anna Kraft"), so the user sees what happened while the assistant worked. Kept in memory only, like the
 * other entries of the page.
 */
export interface McpActivity {
  /** Increasing number: the page asks for the entries after the last one it knows */
  seq: number;
  at: string;
  tool: string;
  /** Name of the client that connected last (e.g. "claude-code"); empty if unknown */
  client: string;
  tree: string | null;
  /** What was changed (a person, a source, a file) */
  target: string | null;
  ok: boolean;
  /** Reason of a refusal or error */
  reason?: string;
}

const KEEP = 200;
let entries: McpActivity[] = [];
let seq = 0;
let client = '';

/** Remembers the name the client gave when it connected (initialize) */
export function rememberClient(name: unknown) {
  if (typeof name === 'string' && name.trim()) {
    client = name.trim().slice(0, 60);
  }
}

export function addActivity(entry: Omit<McpActivity, 'seq' | 'at' | 'client'>, now = new Date()) {
  seq += 1;
  entries = [...entries, { ...entry, seq, at: now.toISOString(), client }].slice(-KEEP);
}

/** The entries after `after`, oldest first, and the number of the newest one */
export function activitiesAfter(after: number) {
  return { entries: entries.filter((entry) => entry.seq > after), last: seq };
}

/** For tests: starts empty again */
export function resetActivities() {
  entries = [];
  seq = 0;
  client = '';
}
