import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * Database features that only PostgreSQL has (raw SQL, case-insensitive mode, filters on list columns). They are
 * allowed only in src/lib/search/, so moving to another database later (mobile fork, see
 * documentation/distribution-concept.md, section 3.6) only has to look at that folder.
 */
const POSTGRES_ONLY = 'is PostgreSQL-specific – only allowed in src/lib/search/ (see documentation/code-guidelines.md, "Portability")';
const postgresOnly = [
  { selector: 'MemberExpression[property.name=/(queryRaw|executeRaw)(Unsafe)?$/]', message: `Raw SQL ${POSTGRES_ONLY}` },
  { selector: "MemberExpression[object.name='Prisma'][property.name=/^(sql|raw|join)$/]", message: `Raw SQL ${POSTGRES_ONLY}` },
  { selector: "Property[key.name='mode'][value.value='insensitive']", message: `mode: 'insensitive' ${POSTGRES_ONLY}` },
  { selector: 'Property[key.name=/^(has|hasSome|hasEvery|isEmpty)$/]', message: `A filter on a list column ${POSTGRES_ONLY}` },
];

/**
 * File access goes through src/lib/files/ (uploads, data folder) – a mobile fork has to replace exactly that (see
 * documentation/code-guidelines.md, "Portability"). The few other modules with an own reason are listed below.
 */
const FS_MODULES = ['fs', 'node:fs', 'fs/promises', 'node:fs/promises'];
const fsOnlyInFiles = {
  paths: FS_MODULES.map((name) => ({
    name,
    message: 'Direct file access is only allowed in src/lib/files/ – add a function there (see documentation/code-guidelines.md, "Portability")',
  })),
};

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ['src/generated/**', 'dist/**'],
  },
  {
    // Rules taken from the Google TypeScript Style Guide and the Microsoft TypeScript guidelines
    rules: {
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      curly: 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'no-console': 'error',
      'no-eval': 'error',
      'no-throw-literal': 'error',
      'default-case': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { disallowTypeAnnotations: false }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-namespace': 'error',
      '@typescript-eslint/array-type': ['error', { default: 'array-simple' }],
      '@typescript-eslint/no-wrapper-object-types': 'error',
      'no-restricted-syntax': ['error', ...postgresOnly],
      'no-restricted-imports': ['error', fsOnlyInFiles],
    },
  },
  {
    // The marked module for database-specific search, and tests (they describe the queries)
    files: ['src/lib/search/**', 'src/**/__tests__/**', 'src/test/**'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    // Allowed to use the file system: the file module itself, backups and logs (the guideline names them), tests, and
    // modules that do not touch the data of the user: the SQL files of the app (migrations), the built web page, the
    // bundled PostgreSQL (Windows app only), the example family tree and the system information.
    files: [
      'src/lib/files/**',
      'src/lib/backup/**',
      'src/lib/logFiles.ts',
      'src/lib/logger.ts',
      'src/lib/migrations.ts',
      'src/lib/frontend.ts',
      'src/lib/postgres/**',
      'src/lib/demo/**',
      'src/lib/systemInfo.ts',
      'src/**/__tests__/**',
      'src/test/**',
    ],
    rules: { 'no-restricted-imports': 'off' },
  },
);
