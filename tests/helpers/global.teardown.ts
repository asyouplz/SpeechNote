/**
 * Global Teardown for Tests
 *
 * 모든 테스트 완료 후 한 번 실행되는 정리 작업
 * - 테스트 서버 종료
 * - 임시 파일 정리
 * - 테스트 리포트 생성
 */

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const globalTeardown = async (): Promise<void> => {
    console.log('\n🧹 Starting global test teardown...\n');

    try {
        // 1. Mock 서버 종료
        if (fs.existsSync('.mock-server.pid')) {
            const pid = fs.readFileSync('.mock-server.pid', 'utf8');
            if (pid) {
                try {
                    process.kill(parseInt(pid), 'SIGTERM');
                    console.log('✅ Mock server stopped');
                } catch (error) {
                    console.warn('⚠️ Could not stop mock server:', error);
                }
                fs.unlinkSync('.mock-server.pid');
            }
        }

        // 2. 성능 측정 결과 출력
        if (global.testStartTime) {
            const duration = Date.now() - global.testStartTime;
            const minutes = Math.floor(duration / 60000);
            const seconds = ((duration % 60000) / 1000).toFixed(2);
            console.log(`\n⏱️ Total test duration: ${minutes}m ${seconds}s\n`);

            // 성능 리포트 생성
            const performanceReport = {
                totalDuration: duration,
                timestamp: new Date().toISOString(),
                environment: process.env.NODE_ENV,
                nodeVersion: process.version,
            };

            fs.writeFileSync(
                path.join(process.cwd(), 'reports/performance.json'),
                JSON.stringify(performanceReport, null, 2)
            );
        }

        // 3. 임시 파일 정리 (선택적)
        if (process.env.CLEANUP_TEMP_FILES === 'true') {
            console.log('Cleaning up temporary files...');

            const tempDirs = ['tests/fixtures/temp', 'tests/e2e/downloads', '.tmp'];

            tempDirs.forEach((dir) => {
                const fullPath = path.join(process.cwd(), dir);
                if (fs.existsSync(fullPath)) {
                    fs.rmSync(fullPath, { recursive: true, force: true });
                    console.log(`Removed: ${dir}`);
                }
            });
        }

        // 4. 테스트 결과 집계
        await aggregateTestResults();

        // 5. 커버리지 리포트 병합
        if (fs.existsSync('coverage')) {
            await mergeCoverageReports();
        }

        // 6. 테스트 실패 시 로그 수집
        if (process.env.COLLECT_FAILURE_LOGS === 'true') {
            await collectFailureLogs();
        }

        // 7. 알림 발송 (CI 환경에서)
        if (process.env.CI === 'true' && process.env.SEND_NOTIFICATIONS === 'true') {
            await sendTestNotifications();
        }

        console.log('✅ Global test teardown completed\n');
    } catch (error) {
        console.error('❌ Error during teardown:', error);
        process.exit(1);
    }
};

/**
 * 테스트 결과 집계
 */
async function aggregateTestResults(): Promise<void> {
    console.log('Aggregating test results...');

    const resultsDir = path.join(process.cwd(), 'reports');
    const results: any[] = [];

    // 모든 결과 파일 읽기
    if (fs.existsSync(resultsDir)) {
        const files = fs.readdirSync(resultsDir).filter((f) => f.endsWith('.xml'));

        files.forEach((file) => {
            const content = fs.readFileSync(path.join(resultsDir, file), 'utf8');
            // XML 파싱 (간단한 예시)
            const matches = content.match(
                /<testsuite[^>]*tests="(\d+)"[^>]*failures="(\d+)"[^>]*errors="(\d+)"[^>]*time="([\d.]+)"/
            );
            if (matches) {
                results.push({
                    file,
                    tests: parseInt(matches[1]),
                    failures: parseInt(matches[2]),
                    errors: parseInt(matches[3]),
                    time: parseFloat(matches[4]),
                });
            }
        });
    }

    // 집계 결과
    const summary = {
        totalTests: results.reduce((sum, r) => sum + r.tests, 0),
        totalFailures: results.reduce((sum, r) => sum + r.failures, 0),
        totalErrors: results.reduce((sum, r) => sum + r.errors, 0),
        totalTime: results.reduce((sum, r) => sum + r.time, 0),
        testSuites: results.length,
        timestamp: new Date().toISOString(),
    };

    // 요약 출력
    console.log('\n📊 Test Summary:');
    console.log(`   Total Tests: ${summary.totalTests}`);
    console.log(`   Passed: ${summary.totalTests - summary.totalFailures - summary.totalErrors}`);
    console.log(`   Failed: ${summary.totalFailures}`);
    console.log(`   Errors: ${summary.totalErrors}`);
    console.log(`   Duration: ${summary.totalTime.toFixed(2)}s`);
    console.log(
        `   Success Rate: ${(
            (1 - (summary.totalFailures + summary.totalErrors) / summary.totalTests) *
            100
        ).toFixed(2)}%\n`
    );

    // 요약 파일 저장
    fs.writeFileSync(path.join(resultsDir, 'summary.json'), JSON.stringify(summary, null, 2));
}

/**
 * 커버리지 리포트 병합
 */
async function mergeCoverageReports(): Promise<void> {
    console.log('Merging coverage reports...');

    try {
        // nyc를 사용한 커버리지 병합
        await execAsync('npx nyc merge coverage coverage/merged');
        await execAsync(
            'npx nyc report --reporter=lcov --reporter=text-summary --report-dir=coverage/final'
        );

        // 커버리지 요약 읽기
        const summaryPath = path.join(process.cwd(), 'coverage/final/coverage-summary.json');
        if (fs.existsSync(summaryPath)) {
            const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
            const total = summary.total;

            console.log('\n📈 Coverage Summary:');
            console.log(`   Lines: ${total.lines.pct}%`);
            console.log(`   Statements: ${total.statements.pct}%`);
            console.log(`   Functions: ${total.functions.pct}%`);
            console.log(`   Branches: ${total.branches.pct}%\n`);
        }
    } catch (error) {
        console.warn('⚠️ Could not merge coverage reports:', error);
    }
}

/**
 * 실패한 테스트 로그 수집
 */
async function collectFailureLogs(): Promise<void> {
    console.log('Collecting failure logs...');

    const logsDir = path.join(process.cwd(), 'reports/failure-logs');
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }

    // Jest 로그 파일 확인
    const jestLogPath = path.join(process.cwd(), 'jest.log');
    if (fs.existsSync(jestLogPath)) {
        const content = fs.readFileSync(jestLogPath, 'utf8');
        const failures = content.match(/FAIL.*?(?=PASS|FAIL|$)/gs);

        if (failures && failures.length > 0) {
            fs.writeFileSync(path.join(logsDir, 'jest-failures.log'), failures.join('\n'));
            console.log(`Collected ${failures.length} test failures`);
        }
    }
}

/**
 * 테스트 결과 알림 발송
 */
async function sendTestNotifications(): Promise<void> {
    console.log('Sending test notifications...');

    const summaryPath = path.join(process.cwd(), 'reports/summary.json');
    if (!fs.existsSync(summaryPath)) {
        return;
    }

    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    const passed =
        summary.totalTests === summary.totalTests - summary.totalFailures - summary.totalErrors;

    // Slack 알림 예시
    if (process.env.SLACK_WEBHOOK) {
        const message = {
            text: `Test Results: ${passed ? '✅ All tests passed!' : '❌ Some tests failed'}`,
            attachments: [
                {
                    color: passed ? 'good' : 'danger',
                    fields: [
                        { title: 'Total Tests', value: summary.totalTests, short: true },
                        {
                            title: 'Failed',
                            value: summary.totalFailures + summary.totalErrors,
                            short: true,
                        },
                        {
                            title: 'Duration',
                            value: `${summary.totalTime.toFixed(2)}s`,
                            short: true,
                        },
                        {
                            title: 'Success Rate',
                            value: `${(
                                (1 -
                                    (summary.totalFailures + summary.totalErrors) /
                                        summary.totalTests) *
                                100
                            ).toFixed(2)}%`,
                            short: true,
                        },
                    ],
                },
            ],
        };

        try {
            await fetch(process.env.SLACK_WEBHOOK, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(message),
            });
            console.log('✅ Slack notification sent');
        } catch (error) {
            console.warn('⚠️ Could not send Slack notification:', error);
        }
    }
}

// 프로세스 정리
process.on('exit', (code) => {
    if (code === 0) {
        console.log('✨ All tests completed successfully!');
    } else {
        console.log(`⚠️ Tests completed with exit code ${code}`);
    }
});

export default globalTeardown;
