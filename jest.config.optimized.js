/**
 * Optimized Jest Configuration
 * 
 * 최적화된 Jest 설정
 * - 병렬 실행 최적화
 * - 캐싱 전략
 * - 선택적 테스트 실행
 */

const baseConfig = require('./jest.config.js');

module.exports = {
    ...baseConfig,
    
    // 캐싱 설정
    cache: true,
    cacheDirectory: '<rootDir>/.jest-cache',
    
    // 병렬 실행 최적화
    maxWorkers: '50%', // CPU 코어의 50% 사용
    
    // 테스트 파일 패턴 최적화
    testMatch: [
        '<rootDir>/src/**/__tests__/**/*.{ts,tsx}',
        '<rootDir>/src/**/*.{spec,test}.{ts,tsx}',
        '<rootDir>/tests/**/*.{spec,test}.{ts,tsx}'
    ],
    
    // 변경된 파일만 테스트 (CI 제외)
    onlyChanged: process.env.CI !== 'true',
    
    // 커버리지 최적화
    collectCoverage: process.env.CI === 'true', // CI에서만 커버리지 수집
    coverageProvider: 'v8', // 더 빠른 V8 엔진 사용
    
    // 성능 최적화
    globals: {
        'ts-jest': {
            isolatedModules: true, // 더 빠른 타입 체크
            tsconfig: {
                ...baseConfig.globals['ts-jest'].tsconfig,
                skipLibCheck: true // 라이브러리 타입 체크 스킵
            }
        }
    },
    
    // 테스트 스위트별 설정
    projects: [
        {
            displayName: 'Unit Tests',
            testMatch: ['<rootDir>/tests/unit/**/*.test.ts'],
            testEnvironment: 'node',
            setupFilesAfterEnv: ['<rootDir>/tests/helpers/unit.setup.ts']
        },
        {
            displayName: 'Integration Tests',
            testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
            testEnvironment: 'node',
            setupFilesAfterEnv: ['<rootDir>/tests/helpers/integration.setup.ts'],
            testTimeout: 15000
        },
        {
            displayName: 'E2E Tests',
            testMatch: ['<rootDir>/tests/e2e/**/*.e2e.test.ts'],
            testEnvironment: 'jsdom',
            setupFilesAfterEnv: ['<rootDir>/tests/helpers/e2e.setup.ts'],
            testTimeout: 30000,
            maxWorkers: 1 // E2E는 순차 실행
        },
        {
            displayName: 'Component Tests',
            testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts'],
            testEnvironment: 'jsdom',
            setupFilesAfterEnv: ['<rootDir>/tests/helpers/component.setup.ts']
        }
    ],
    
    // 테스트 결과 캐싱
    testResultsProcessor: 'jest-sonar-reporter',
    
    // 추가 리포터
    reporters: [
        'default',
        ['jest-junit', {
            outputDirectory: './reports',
            outputName: 'junit.xml',
            classNameTemplate: '{classname}',
            titleTemplate: '{title}',
            ancestorSeparator: ' › ',
            usePathForSuiteName: true
        }],
        ['jest-progress-bar-reporter', {
            customSummary: true,
            customProgressBar: true
        }]
    ],
    
    // 성능 모니터링
    logHeapUsage: process.env.DEBUG === 'true',
    
    // 실패한 테스트 우선 실행
    testSequencer: '<rootDir>/tests/helpers/testSequencer.js',
    
    // 스냅샷 설정
    snapshotResolver: '<rootDir>/tests/helpers/snapshotResolver.js',
    snapshotSerializers: ['jest-serializer-html'],
    
    // 에러 처리
    bail: process.env.CI === 'true' ? 1 : 0, // CI에서는 첫 실패 시 중단
    errorOnDeprecated: true, // deprecated API 사용 시 에러
    
    // 리소스 한계 설정
    workerIdleMemoryLimit: '512MB', // 워커 메모리 제한
    
    // 디버깅 옵션
    detectOpenHandles: process.env.DEBUG === 'true',
    detectLeaks: process.env.DEBUG === 'true'
};