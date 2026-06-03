export default {
  testEnvironment: 'node',
  transform: {},
  moduleFileExtensions: ['js', 'json', 'node'],
  verbose: true,
  clearMocks: true,
  setupFilesAfterEnv: ['./jest.setup.js'],
  collectCoverage: false,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/__tests__/',
    '/migrations/',
    '/jest.setup.js',
    '/jest.config.js',
  ],
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/config/db.js',
    '!src/migrations/**',
    '!**/*.cjs',
  ],
  testTimeout: 10000,
  injectGlobals: true,
};

