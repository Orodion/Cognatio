import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

// Feature boundaries (documentation/code-guidelines.md, "Frontend features"): a feature may import another feature only where
// FEATURE_DEPENDENCIES allows it, and only its `lib`, `types` and `graphql` files plus the components listed in PUBLIC_COMPONENTS;
// other `components` and `pages` of a feature are private. `persons` and `tree` use each other on purpose: the person page draws the
// relation graph with the tree component, and the tree draws persons. Likewise `persons` and `statistics`: the statistics pick
// persons, and the person list shows the persons behind a figure of the statistics.
const FEATURE_DEPENDENCIES = {
  // settings: the queries of the section "MCP" (changes of AI assistants appear under "Activity")
  activity: ['settings', 'transfer'],
  dashboard: ['persons'],
  reports: ['family-trees', 'persons', 'sources', 'statistics'],
  'family-trees': [],
  help: [],
  persons: ['family-trees', 'sources', 'statistics', 'tree'],
  settings: ['family-trees', 'persons', 'transfer', 'tree'],
  sources: ['family-trees', 'persons'],
  statistics: ['family-trees', 'persons', 'sources', 'tree'],
  transfer: ['family-trees'],
  trash: ['family-trees', 'persons', 'sources'],
  tree: ['family-trees', 'persons'],
};
const PUBLIC_COMPONENTS = {
  persons: ['MediaOpenLink', 'MourningRibbon', 'PersonFormDialog', 'PersonPicker'],
  sources: ['CitationMark', 'PersonSourcesTab', 'SourceSearchHits'],
  statistics: ['ScopeBar', 'StatisticsFilterChip'],
  transfer: ['ErrorBox', 'TransferProgressBar'],
  tree: ['FamilyTree'],
};

const featureBoundaries = Object.entries(FEATURE_DEPENDENCIES).map(([feature, allowed]) => ({
  files: [`src/features/${feature}/**/*.{ts,tsx}`],
  ignores: ['**/__tests__/**'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          ...Object.keys(FEATURE_DEPENDENCIES)
            .filter((other) => other !== feature && !allowed.includes(other))
            .map((other) => ({
              group: [`@/features/${other}`, `@/features/${other}/**`],
              message: `The feature "${feature}" may not use "${other}" (FEATURE_DEPENDENCIES in eslint.config.mjs).`,
            })),
          ...allowed.map((other) => ({
            group: [
              `@/features/${other}/components/**`,
              `@/features/${other}/pages/**`,
              ...(PUBLIC_COMPONENTS[other] ?? []).map((name) => `!@/features/${other}/components/${name}`),
            ],
            message: `Components and pages of "${other}" are private; only lib, types, graphql and PUBLIC_COMPONENTS can be used.`,
          })),
        ],
      },
    ],
  },
}));

export default tseslint.config(
  {
    // Only TypeScript is linted (as before); the JavaScript config files are CommonJS for their tools
    ignores: ['dist/**', 'coverage/**', '**/*.js', '**/*.cjs', '**/*.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    // Rules taken from the Google TypeScript Style Guide, the Microsoft TypeScript guidelines and the React docs
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
      '@typescript-eslint/array-type': ['error', { default: 'array-simple' }],
      // The two classic hook rules; the React Compiler rules of eslint-plugin-react-hooks 7 are not enabled
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  ...featureBoundaries,
  {
    // Shared building blocks know nothing about features
    files: ['src/components/ui/**/*.{ts,tsx}', 'src/lib/**/*.{ts,tsx}'],
    ignores: ['**/__tests__/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['@/features/**'], message: 'Shared code in components/ui and lib may not import from a feature.' }] },
      ],
    },
  },
);
