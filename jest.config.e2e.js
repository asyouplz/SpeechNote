/**
 * Jest Configuration for E2E Tests
 * 
 * E2E 테스트를 위한 별도 Jest 설정
 * - 더 긴 타임아웃
 * - 실제 DOM 환경 시뮬레이션
 * - 통합 테스트 커버리지
 */

module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom', // E2E는 DOM 환경 필요
    roots: ['<rootDir>/tests/e2e'],
    testMatch: [
        '**/*.e2e.test.ts',
        '**/*.e2e.spec.ts'
    ],
    transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
            tsconfig: {
                esModuleInterop: true,
                allowSyntheticDefaultImports: true,
                jsx: 'react',
                lib: ['ES2020', 'DOM']
            }
        }]
    },
    setupFilesAfterEnv: [
        '<rootDir>/tests/helpers/e2e.setup.ts'
    ],
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/types/**',
        '!src/main.ts',
        '!src/**/*.test.ts',
        '!src/**/*.spec.ts'
    ],
    coverageDirectory: 'coverage/e2e',
    coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 75,
            lines: 80,
            statements: 80
        }
    },
    moduleNameMapper: {
        // 경로 별칭
        '^src/(.*)$': '<rootDir>/src/$1',
        '^@core/(.*)$': '<rootDir>/src/core/$1',
        '^@infrastructure/(.*)$': '<rootDir>/src/infrastructure/$1',
        '^@application/(.*)$': '<rootDir>/src/application/$1',
        '^@domain/(.*)$': '<rootDir>/src/domain/$1',
        '^@ui/(.*)$': '<rootDir>/src/ui/$1',
        '^@utils/(.*)$': '<rootDir>/src/utils/$1',
        '^@types/(.*)$': '<rootDir>/src/types/$1',
        
        // CSS 모듈 모킹
        '\\.(css|less|scss|sass)$': '<rootDir>/tests/mocks/styleMock.js',
        
        // 이미지/파일 모킹
        '\\.(jpg|jpeg|png|gif|svg|webp)$': '<rootDir>/tests/mocks/fileMock.js',
        
        // Obsidian 모킹
        '^obsidian$': '<rootDir>/tests/mocks/obsidian.mock.ts'
    },
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    verbose: true,
    testTimeout: 30000, // E2E는 더 긴 타임아웃 필요
    maxWorkers: 1, // E2E는 순차 실행 권장
    bail: false, // 첫 실패 시 중단하지 않음
    globalSetup: '<rootDir>/tests/helpers/global.setup.ts',
    globalTeardown: '<rootDir>/tests/helpers/global.teardown.ts',
    
    // 리포터 설정
    reporters: [
        'default',
        ['jest-html-reporters', {
            publicPath: './reports/e2e',
            filename: 'index.html',
            openReport: false,
            pageTitle: 'E2E Test Report',
            logoImgPath: './docs/logo.png',
            hideIcon: false,
            expand: false
        }]
    ],
    
    // Watch 모드 설정
    watchPlugins: [
        'jest-watch-typeahead/filename',
        'jest-watch-typeahead/testname'
    ]
};