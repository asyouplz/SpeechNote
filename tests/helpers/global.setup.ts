/**
 * Global Setup for Tests
 *
 * 모든 테스트 실행 전 한 번 실행되는 설정
 * - 테스트 데이터베이스 준비
 * - 환경 변수 설정
 * - 테스트 서버 시작
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const globalSetup = async (): Promise<void> => {
    console.log('\n🚀 Starting global test setup...\n');

    // 1. 환경 변수 설정
    process.env.NODE_ENV = 'test';
    process.env.TEST_MODE = 'true';
    process.env.LOG_LEVEL = 'error'; // 테스트 중 로그 최소화

    // 2. 테스트 디렉토리 생성
    const testDirs = [
        '.jest-cache',
        'coverage',
        'reports',
        'reports/e2e',
        'tests/e2e/screenshots',
        'tests/fixtures',
    ];

    testDirs.forEach((dir) => {
        const fullPath = path.join(process.cwd(), dir);
        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
        }
    });

    // 3. 테스트 설정 파일 생성
    const testConfig = {
        apiUrl: 'http://localhost:3001/api',
        mockApiUrl: 'http://localhost:3002/mock',
        testTimeout: 30000,
        retryAttempts: 3,
        debug: false,
    };

    fs.writeFileSync(
        path.join(process.cwd(), 'tests/test-config.json'),
        JSON.stringify(testConfig, null, 2)
    );

    // 4. Mock 서버 시작 (필요한 경우)
    if (process.env.START_MOCK_SERVER === 'true') {
        console.log('Starting mock server...');

        const mockServer = spawn('node', ['tests/mocks/server.js'], {
            detached: false,
            stdio: 'pipe',
        });

        // 서버 시작 대기
        await new Promise<void>((resolve) => {
            mockServer.stdout?.on('data', (data) => {
                if (data.toString().includes('Mock server started')) {
                    console.log('✅ Mock server is ready');
                    resolve();
                }
            });

            // 타임아웃 설정
            setTimeout(() => {
                console.warn('⚠️ Mock server startup timeout');
                resolve();
            }, 10000);
        });

        // 프로세스 ID 저장 (나중에 종료용)
        fs.writeFileSync(
            path.join(process.cwd(), '.mock-server.pid'),
            mockServer.pid?.toString() || ''
        );
    }

    // 5. 테스트 데이터 준비
    const testData = {
        users: [
            { id: 1, name: 'Test User 1', apiKey: 'test-key-1' },
            { id: 2, name: 'Test User 2', apiKey: 'test-key-2' },
        ],
        files: [
            { id: 1, name: 'test1.mp3', size: 1024000, type: 'audio/mp3' },
            { id: 2, name: 'test2.wav', size: 2048000, type: 'audio/wav' },
        ],
        transcriptions: [
            { id: 1, fileId: 1, text: 'Test transcription 1', status: 'completed' },
            { id: 2, fileId: 2, text: 'Test transcription 2', status: 'pending' },
        ],
    };

    fs.writeFileSync(
        path.join(process.cwd(), 'tests/fixtures/test-data.json'),
        JSON.stringify(testData, null, 2)
    );

    // 6. 테스트용 오디오 파일 생성
    createTestAudioFiles();

    // 7. 성능 측정 시작
    if (process.env.MEASURE_PERFORMANCE === 'true') {
        global.testStartTime = Date.now();
        console.log('Performance measurement started');
    }

    // 8. 브라우저 환경 준비 (E2E용)
    if (process.env.TEST_TYPE === 'e2e') {
        await setupBrowserEnvironment();
    }

    console.log('✅ Global test setup completed\n');
};

/**
 * 테스트용 오디오 파일 생성
 */
function createTestAudioFiles(): void {
    const audioDir = path.join(process.cwd(), 'tests/fixtures/audio');

    if (!fs.existsSync(audioDir)) {
        fs.mkdirSync(audioDir, { recursive: true });
    }

    // 더미 오디오 파일 생성 (실제 오디오 데이터는 아님)
    const files = [
        { name: 'small.mp3', size: 100 * 1024 }, // 100KB
        { name: 'medium.mp3', size: 5 * 1024 * 1024 }, // 5MB
        { name: 'large.mp3', size: 20 * 1024 * 1024 }, // 20MB
    ];

    files.forEach((file) => {
        const filePath = path.join(audioDir, file.name);
        if (!fs.existsSync(filePath)) {
            // 더미 데이터로 파일 생성
            const buffer = Buffer.alloc(file.size);
            fs.writeFileSync(filePath, buffer);
            console.log(`Created test audio file: ${file.name}`);
        }
    });
}

/**
 * 브라우저 환경 설정 (E2E 테스트용)
 */
async function setupBrowserEnvironment(): Promise<void> {
    console.log('Setting up browser environment for E2E tests...');

    // Playwright 설치 확인
    try {
        require('playwright');
        console.log('✅ Playwright is installed');
    } catch (error) {
        console.error('❌ Playwright is not installed. Please run: npx playwright install');
        process.exit(1);
    }

    // 브라우저 다운로드 상태 확인
    const { chromium, firefox, webkit } = require('playwright');

    try {
        await chromium.launch({ headless: true }).then((b) => b.close());
        await firefox.launch({ headless: true }).then((b) => b.close());
        await webkit.launch({ headless: true }).then((b) => b.close());
        console.log('✅ All browsers are ready');
    } catch (error) {
        console.error('❌ Some browsers are not installed. Please run: npx playwright install');
    }
}

/**
 * 환경 변수 검증
 */
function validateEnvironment(): void {
    const requiredEnvVars = ['NODE_ENV', 'TEST_MODE'];

    const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

    if (missingVars.length > 0) {
        console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
        process.exit(1);
    }
}

// 에러 핸들링
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection during setup:', reason);
    process.exit(1);
});

export default globalSetup;
