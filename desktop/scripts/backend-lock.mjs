// Lock file for the production dependencies of the backend, taken from the lock file of the repository. stage.mjs
// installs the backend into desktop/stage/backend; with this file `npm ci` installs exactly the versions (and
// integrity hashes) the tests ran with and THIRD-PARTY-NOTICES.md was generated from, instead of whatever is newest
// the day the installer is built.

/** Lock file entries below the workspace folder (`backend/node_modules/x`) belong to that workspace only */
const WORKSPACE = 'backend';

/** Where npm finds `name` for the package at `from` ('' is the root): the closest node_modules folder upwards */
function resolve(packages, from, name) {
  let base = from;
  for (;;) {
    const candidate = `${base ? `${base}/` : ''}node_modules/${name}`;
    if (packages[candidate]) return candidate;
    if (!base) return null;
    const cut = base.lastIndexOf('/node_modules/');
    base = cut === -1 ? '' : base.slice(0, cut);
  }
}

/**
 * @param lock parsed package-lock.json (lockfileVersion 3) of the repository
 * @param pkg  package.json of the staged backend (no scripts, no development dependencies)
 * @returns parsed package-lock.json for the staged backend
 */
export function backendLockfile(lock, pkg) {
  const { packages } = lock;
  if (lock.lockfileVersion !== 3 || !packages) throw new Error('Unsupported package-lock.json (lockfileVersion 3 expected)');

  const wanted = new Map(); // path in the repository lock file -> path in the stage
  const queue = [[WORKSPACE, pkg]];
  while (queue.length) {
    const [from, entry] = queue.pop();
    const optionalPeers = entry.peerDependenciesMeta ?? {};
    const names = [
      ...Object.keys(entry.dependencies ?? {}),
      ...Object.keys(entry.optionalDependencies ?? {}),
      ...Object.keys(entry.peerDependencies ?? {}).filter((name) => !optionalPeers[name]?.optional),
    ];
    for (const name of names) {
      const found = resolve(packages, from, name);
      if (!found) {
        // A platform package that is not in the lock file is only fine when it is optional
        if (entry.optionalDependencies?.[name] || optionalPeers[name]?.optional) continue;
        throw new Error(`${name} (needed by ${from || 'the root'}) is not in package-lock.json`);
      }
      if (wanted.has(found)) continue;
      wanted.set(found, found.startsWith(`${WORKSPACE}/`) ? found.slice(WORKSPACE.length + 1) : found);
      queue.push([found, packages[found]]);
    }
  }

  const staged = {};
  for (const [from, to] of [...wanted].sort((a, b) => a[1].localeCompare(b[1]))) {
    if (staged[to]) throw new Error(`${from} and ${to} would both land in the same place of the stage`);
    const { dev: _dev, devOptional: _devOptional, ...entry } = packages[from];
    staged[to] = entry;
  }
  const { name, version, dependencies, optionalDependencies, engines } = pkg;
  return {
    name,
    version,
    lockfileVersion: 3,
    requires: true,
    packages: { '': { name, version, dependencies, optionalDependencies, engines }, ...staged },
  };
}
