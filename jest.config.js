const isCI = process.env.CI === 'true';
const isDebug = process.env.DEBUG === 'true';

module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src', '<rootDir>/tests'],
    
    // 캐싱 최적화
    cache: true,
    cacheDirectory: '<rootDir>/.jest-cache',
    
    // 병렬 실행 최적화
    maxWorkers: isCI ? 2 : '50%',
    
    // 테스트 파일 패턴
    testMatch: [
        '<rootDir>/src/**/__tests__/**/*.{ts,tsx}',
        '<rootDir>/src/**/*.{spec,test}.{ts,tsx}',
        '<rootDir>/tests/**/*.{spec,test}.{ts,tsx}'
    ],
    
    transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
            isolatedModules: true,
            tsconfig: {
                esModuleInterop: true,
                allowSyntheticDefaultImports: true,
                skipLibCheck: true
            }
        }]
    },
    
    // 커버리지 설정
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
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 75,
            lines: 80,
            statements: 80
        }
    },
    
    // 모듈 매핑
    moduleNameMapper: {
        '^src/(.*)$': '<rootDir>/src/$1',
        '^@core/(.*)$': '<rootDir>/src/core/$1',
        '^@infrastructure/(.*)$': '<rootDir>/src/infrastructure/$1',
        '^@application/(.*)$': '<rootDir>/src/application/$1',
        '^@domain/(.*)$': '<rootDir>/src/domain/$1',
        '^@ui/(.*)$': '<rootDir>/src/ui/$1',
        '^@utils/(.*)$': '<rootDir>/src/utils/$1',
        '^@types/(.*)$': '<rootDir>/src/types/$1',
        
        // 정적 자산 모킹
        '\\.(css|less|scss|sass)$': '<rootDir>/tests/mocks/styleMock.js',
        '\\.(jpg|jpeg|png|gif|svg|webp)$': '<rootDir>/tests/mocks/fileMock.js',
        '^obsidian$': '<rootDir>/tests/mocks/obsidian.mock.ts'
    },
    
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    verbose: true,
    testTimeout: 10000,
    
    // 프로젝트별 설정
    projects: [
        {
            displayName: 'Unit Tests',
            testMatch: ['<rootDir>/tests/unit/**/*.test.ts'],
            testEnvironment: 'node',
            setupFilesAfterEnv: ['<rootDir>/tests/helpers/testSetup.js']
        },
        {
            displayName: 'Integration Tests', 
            testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
            testEnvironment: 'node',
            setupFilesAfterEnv: ['<rootDir>/tests/helpers/testSetup.js'],
            testTimeout: 15000
        },
        {
            displayName: 'E2E Tests',
            testMatch: ['<rootDir>/tests/e2e/**/*.e2e.test.ts'],
            testEnvironment: 'jsdom',
            setupFilesAfterEnv: ['<rootDir>/tests/helpers/e2e.setup.ts'],
            testTimeout: 30000,
            maxWorkers: 1
        }
    ],
    
    // 리포터 설정
    reporters: [
        'default',
        ...(isCI ? [
            ['jest-junit', {
                outputDirectory: './reports',
                outputName: 'junit.xml'
            }]
        ] : [])
    ],
    
    // 성능 최적화
    bail: isCI ? 1 : 0,
    errorOnDeprecated: true,
    workerIdleMemoryLimit: '512MB',
    
    // 변경된 파일만 테스트 (CI 제외)
    onlyChanged: !isCI,
    
    // 디버깅 옵션
    logHeapUsage: isDebug,
    detectOpenHandles: isDebug,
    detectLeaks: isDebug
};
