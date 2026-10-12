import path from 'node:path';

const DEMO_FILE = 'Cognatio-Demo-Familie-Kraft.zip';

export interface AppPaths {
  /** Folder of the backend (`dist/index.js`, `prisma/migrations`, `node_modules`) */
  backendDir: string;
  backendEntry: string;
  migrationsDir: string;
  /** Built frontend (index.html) */
  frontendDir: string;
  /** Bundled PostgreSQL (with `bin/`) */
  pgDir: string;
  /** Example family tree that is created on the first start (export file of the app) */
  demoFile: string;
}

/**
 * Where the parts of the app are: installed, they are in the `resources` folder of the program (placed there by
 * electron-builder, see electron-builder.yml); during development in the repository.
 */
export function appPaths(packaged: boolean, resourcesPath: string, repoRoot: string): AppPaths {
  if (packaged) {
    const backendDir = path.join(resourcesPath, 'backend');
    return {
      backendDir,
      backendEntry: path.join(backendDir, 'dist', 'index.js'),
      migrationsDir: path.join(backendDir, 'prisma', 'migrations'),
      frontendDir: path.join(resourcesPath, 'frontend'),
      pgDir: path.join(resourcesPath, 'postgres'),
      demoFile: path.join(resourcesPath, 'demo', DEMO_FILE),
    };
  }
  const backendDir = path.join(repoRoot, 'backend');
  return {
    backendDir,
    backendEntry: path.join(backendDir, 'dist', 'index.js'),
    migrationsDir: path.join(backendDir, 'prisma', 'migrations'),
    frontendDir: path.join(repoRoot, 'frontend', 'dist'),
    pgDir: path.join(repoRoot, 'tools', 'postgres'),
    demoFile: path.join(repoRoot, 'demo', DEMO_FILE),
  };
}

/**
 * Data folder: `portable` marker file next to the program → `data` next to it (USB stick), otherwise the
 * per-user app-data folder. COGNATIO_DATA_DIR overrides both (development, tests).
 */
export function dataDir(options: { env: NodeJS.ProcessEnv; userData: string; portableDir?: string; hasPortableMarker?: boolean }): string {
  const fromEnv = options.env.COGNATIO_DATA_DIR?.trim();
  if (fromEnv) {
    return path.resolve(fromEnv);
  }
  if (options.hasPortableMarker && options.portableDir) {
    return path.join(options.portableDir, 'data');
  }
  return options.userData;
}
