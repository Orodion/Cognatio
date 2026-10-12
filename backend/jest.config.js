export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  clearMocks: true,
  // The build copies the generated Prisma client to dist/ – the same package name as in src/generated
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  // Include all source files – also those no test imports (yet)
  collectCoverageFrom: ['src/**/*.ts', '!src/generated/**', '!src/**/__tests__/**', '!src/test/**'],
  coverageReporters: ['text-summary', 'lcov', 'cobertura'],
  // Minimum coverage (applies with --coverage, i.e. in CI): a few points below the level of 2026-09-29
  // (lines 87 %, statements 86 %, branches 76 %, functions 83 %) – raise step by step with new tests
  coverageThreshold: {
    global: { lines: 83, statements: 82, branches: 72, functions: 80 },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        diagnostics: {
          ignoreCodes: [151002, 151001],
        },
      },
    ],
  },
  extensionsToTreatAsEsm: ['.ts'],
};
