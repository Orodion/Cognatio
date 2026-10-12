import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config({ ignores: ['dist/**', 'stage/**', 'release/**'] }, eslint.configs.recommended, ...tseslint.configs.recommended, {
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
  },
  linterOptions: { reportUnusedDisableDirectives: 'error' },
});
