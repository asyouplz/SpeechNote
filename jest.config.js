const isCI = process.env.CI === 'true';
const isDebug = process.env.DEBUG === 'true';

const tsJestTransform = [
    'ts-jest',
    {
        isolatedModules: true,
        tsconfig: {
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
            skipLibCheck: true
        }
    }
];

const moduleNameMapper = {
    '^src/(.*)$': '<rootDir>/src/$1',
    '^@core/(.*)$': '<rootDir>/src/core/$1',
    '^@infrastructure/(.*)$': '<rootDir>/src/infrastructure/$1',
    '^@application/(.*)$': '<rootDir>/src/application/$1',
    '^@domain/(.*)$': '<rootDir>/src/domain/$1',
    '^@ui/(.*)$': '<rootDir>/src/ui/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '\\.(css|less|scss|sass)$': '<rootDir>/tests/mocks/styleMock.js',
    '\\.(jpg|jpeg|png|gif|svg|webp)$': '<rootDir>/tests/mocks/fileMock.js',
    '^obsidian$': '<rootDir>/tests/mocks/obsidian.mock.ts'
};

const createProject = overrides => ({
    preset: 'ts-jest',
    transform: {
        '^.+\\.(ts|tsx)$': tsJestTransform
    },
    moduleNameMapper,
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    ...overrides
});

module.exports = {
    cache: true,
    cacheDirectory: '<rootDir>/.jest-cache',
    maxWorkers: isCI ? 2 : '50%',
    verbose: true,
    reporters: [
        'default',
        ...(isCI
            ? [
                  [
                      'jest-junit',
                      {
                          outputDirectory: './reports',
                          outputName: 'junit.xml'
                      }
                  ]
              ]
            : [])
    ],
    bail: isCI ? 1 : 0,
    errorOnDeprecated: true,
    workerIdleMemoryLimit: '512MB',
    onlyChanged: false,
    logHeapUsage: isDebug,
    detectOpenHandles: isDebug,
    detectLeaks: isDebug,
    collectCoverage: isCI,
    coverageProvider: 'v8',
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/types/**',
        '!src/main.ts',
        '!src/**/*.test.ts',
        '!src/**/*.spec.ts'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
    projects: [
        createProject({
            displayName: 'Unit Tests',
            testEnvironment: 'node',
            testMatch: ['<rootDir>/tests/unit/**/*.test.ts'],
            setupFilesAfterEnv: ['<rootDir>/tests/helpers/testSetup.js'],
            testTimeout: 10000,
            coverageThreshold: {
                global: {
                    branches: 50,
                    functions: 25,
                    lines: 10,
                    statements: 10
                }
            }
        }),
        createProject({
            displayName: 'Integration Tests',
            testEnvironment: 'node',
            testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
            setupFilesAfterEnv: ['<rootDir>/tests/helpers/testSetup.js'],
            testTimeout: 15000,
            coverageThreshold: {
                global: {
                    branches: 50,
                    functions: 25,
                    lines: 3,
                    statements: 3
                }
            }
        }),
        createProject({
            displayName: 'E2E Tests',
            testEnvironment: 'jsdom',
            testMatch: ['<rootDir>/tests/e2e/**/*.e2e.test.ts'],
            setupFilesAfterEnv: ['<rootDir>/tests/helpers/e2e.setup.ts'],
            maxWorkers: 1,
            testTimeout: 30000,
            coverageThreshold: {
                global: {
                    branches: 50,
                    functions: 25,
                    lines: 3,
                    statements: 3
                }
            }
        })
    ]
};
