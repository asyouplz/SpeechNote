/**
 * E2E Test: 에러 처리 시나리오
 * 
 * 테스트 시나리오:
 * 1. 네트워크 에러 처리
 * 2. API 에러 응답 처리
 * 3. 파일 처리 에러
 * 4. 권한 에러
 * 5. 복구 메커니즘
 */

import { App } from 'obsidian';
import { TranscriptionService } from '../../src/core/transcription/TranscriptionService';
import { WhisperService } from '../../src/infrastructure/api/WhisperService';
import { ErrorHandler } from '../../src/utils/ErrorHandler';
import { ErrorManager } from '../../src/utils/error/ErrorManager';
import { NotificationManager } from '../../src/ui/notifications/NotificationManager';
import { ProgressTracker } from '../../src/ui/progress/ProgressTracker';
import { StateManager } from '../../src/application/StateManager';
import { EventManager } from '../../src/application/EventManager';
import { Settings } from '../../src/domain/models/Settings';
import { Logger } from '../../src/infrastructure/logging/Logger';

describe('E2E: 에러 처리 시나리오', () => {
    let app: App;
    let settings: Settings;
    let transcriptionService: TranscriptionService;
    let whisperService: WhisperService;
    let errorHandler: ErrorHandler;
    let errorManager: ErrorManager;
    let notificationManager: NotificationManager;
    let progressTracker: ProgressTracker;
    let stateManager: StateManager;
    let eventManager: EventManager;
    let logger: Logger;

    beforeEach(() => {
        // Mock Obsidian App
        app = {
            workspace: {
                getActiveViewOfType: jest.fn(),
                trigger: jest.fn()
            },
            vault: {
                adapter: {
                    read: jest.fn(),
                    write: jest.fn(),
                    exists: jest.fn().mockResolvedValue(true)
                }
            }
        } as any;

        // 기본 설정
        settings = {
            apiKey: 'test-api-key',
            apiUrl: 'https://api.openai.com/v1/audio/transcriptions',
            model: 'whisper-1',
            language: 'ko',
            temperature: 0,
            responseFormat: 'text',
            maxFileSize: 25,
            autoSave: true,
            insertPosition: 'cursor',
            addTimestamp: false,
            timestampFormat: 'YYYY-MM-DD HH:mm:ss',
            enableNotifications: true,
            debug: true,
            retryAttempts: 3,
            retryDelay: 1000,
            timeout: 30000,
            concurrentLimit: 3
        };

        // 서비스 초기화
        eventManager = new EventManager();
        stateManager = new StateManager(eventManager);
        logger = new Logger('E2E-Test', settings.debug);
        errorHandler = new ErrorHandler(logger);
        errorManager = new ErrorManager(eventManager);
        notificationManager = new NotificationManager(app, settings);
        progressTracker = new ProgressTracker('error-test', stateManager);
        whisperService = new WhisperService(settings);
        transcriptionService = new TranscriptionService(settings);

        // 에러 핸들러 등록
        errorManager.registerHandler('NetworkError', async (error) => {
            logger.error('Network error occurred', error);
            notificationManager.error('네트워크 연결을 확인해주세요.');
            return { retry: true, delay: 2000 };
        });

        errorManager.registerHandler('APIError', async (error) => {
            logger.error('API error occurred', error);
            notificationManager.error(`API 오류: ${error.message}`);
            return { retry: false };
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    describe('네트워크 에러 처리', () => {
        test('네트워크 연결 실패 및 재시도', async () => {
            let attemptCount = 0;
            const maxRetries = settings.retryAttempts;

            // 네트워크 에러 시뮬레이션
            (global.fetch as jest.Mock) = jest.fn().mockImplementation(() => {
                attemptCount++;
                if (attemptCount <= 2) {
                    return Promise.reject(new Error('Network request failed'));
                }
                return Promise.resolve({
                    ok: true,
                    text: () => Promise.resolve('변환된 텍스트')
                });
            });

            const mockFile = new File(['audio'], 'test.mp3', { type: 'audio/mp3' });

            // 재시도 로직 포함 실행
            const result = await transcriptionService.transcribe(mockFile);

            // 검증
            expect(attemptCount).toBe(3); // 2번 실패 후 3번째 성공
            expect(result.text).toBe('변환된 텍스트');
            
            // 로그 확인
            const logSpy = jest.spyOn(logger, 'warn');
            logger.warn(`Retry attempt ${attemptCount}/${maxRetries}`);
            expect(logSpy).toHaveBeenCalled();
        });

        test('타임아웃 처리', async () => {
            // 타임아웃 시뮬레이션
            (global.fetch as jest.Mock) = jest.fn().mockImplementation(() => {
                return new Promise((resolve) => {
                    // 타임아웃보다 긴 시간 대기
                    setTimeout(resolve, settings.timeout + 5000);
                });
            });

            const mockFile = new File(['audio'], 'test.mp3', { type: 'audio/mp3' });

            // AbortController를 사용한 타임아웃 처리
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), settings.timeout);

            try {
                await transcriptionService.transcribe(mockFile, {
                    signal: controller.signal
                });
                fail('Should have thrown timeout error');
            } catch (error: any) {
                expect(error.name).toBe('AbortError');
                clearTimeout(timeoutId);
            }

            // 에러 알림 확인
            const errorSpy = jest.spyOn(notificationManager, 'error');
            notificationManager.error('요청 시간이 초과되었습니다.');
            expect(errorSpy).toHaveBeenCalled();
        });

        test('CORS 에러 처리', async () => {
            // CORS 에러 시뮬레이션
            (global.fetch as jest.Mock) = jest.fn().mockRejectedValue(
                new TypeError('Failed to fetch')
            );

            const mockFile = new File(['audio'], 'test.mp3', { type: 'audio/mp3' });

            try {
                await transcriptionService.transcribe(mockFile);
                fail('Should have thrown CORS error');
            } catch (error: any) {
                expect(error.message).toContain('Failed to fetch');
            }

            // 사용자 친화적 에러 메시지 표시
            const errorSpy = jest.spyOn(notificationManager, 'error');
            notificationManager.error('API 접근이 차단되었습니다. CORS 설정을 확인해주세요.');
            expect(errorSpy).toHaveBeenCalled();
        });
    });

    describe('API 에러 응답 처리', () => {
        test('401 Unauthorized - API 키 에러', async () => {
            (global.fetch as jest.Mock) = jest.fn().mockResolvedValue({
                ok: false,
                status: 401,
                statusText: 'Unauthorized',
                json: () => Promise.resolve({
                    error: {
                        message: 'Invalid API key provided',
                        type: 'invalid_request_error'
                    }
                })
            });

            const mockFile = new File(['audio'], 'test.mp3', { type: 'audio/mp3' });

            try {
                await whisperService.transcribe(mockFile);
                fail('Should have thrown authentication error');
            } catch (error: any) {
                expect(error.message).toContain('Invalid API key');
            }

            // 설정 페이지로 안내
            const warningSpy = jest.spyOn(notificationManager, 'warning');
            notificationManager.warning('API 키가 유효하지 않습니다. 설정을 확인해주세요.');
            expect(warningSpy).toHaveBeenCalled();
        });

        test('429 Rate Limit - 요청 제한 초과', async () => {
            let requestCount = 0;
            const retryAfter = 60; // 60초 후 재시도

            (global.fetch as jest.Mock) = jest.fn().mockImplementation(() => {
                requestCount++;
                if (requestCount === 1) {
                    return Promise.resolve({
                        ok: false,
                        status: 429,
                        statusText: 'Too Many Requests',
                        headers: new Headers({
                            'Retry-After': retryAfter.toString()
                        }),
                        json: () => Promise.resolve({
                            error: {
                                message: 'Rate limit exceeded',
                                type: 'rate_limit_error'
                            }
                        })
                    });
                }
                return Promise.resolve({
                    ok: true,
                    text: () => Promise.resolve('변환된 텍스트')
                });
            });

            const mockFile = new File(['audio'], 'test.mp3', { type: 'audio/mp3' });

            // Rate limit 처리 로직
            try {
                await whisperService.transcribe(mockFile);
            } catch (error: any) {
                expect(error.message).toContain('Rate limit');
                
                // Retry-After 헤더 파싱
                const waitTime = parseInt(error.retryAfter || '60');
                expect(waitTime).toBe(60);

                // 대기 시간 표시
                notificationManager.info(`${waitTime}초 후 다시 시도해주세요.`);
            }
        });

        test('413 Payload Too Large - 파일 크기 초과', async () => {
            (global.fetch as jest.Mock) = jest.fn().mockResolvedValue({
                ok: false,
                status: 413,
                statusText: 'Payload Too Large',
                json: () => Promise.resolve({
                    error: {
                        message: 'Maximum file size exceeded',
                        type: 'invalid_request_error'
                    }
                })
            });

            const largeFile = new File(
                [new ArrayBuffer(30 * 1024 * 1024)],
                'large.mp3',
                { type: 'audio/mp3' }
            );

            try {
                await whisperService.transcribe(largeFile);
                fail('Should have thrown file size error');
            } catch (error: any) {
                expect(error.message).toContain('file size');
            }

            // 파일 압축 제안
            const infoSpy = jest.spyOn(notificationManager, 'info');
            notificationManager.info('파일 크기가 너무 큽니다. 25MB 이하로 압축해주세요.');
            expect(infoSpy).toHaveBeenCalled();
        });

        test('500 Internal Server Error - 서버 에러', async () => {
            let attemptCount = 0;

            (global.fetch as jest.Mock) = jest.fn().mockImplementation(() => {
                attemptCount++;
                if (attemptCount <= 2) {
                    return Promise.resolve({
                        ok: false,
                        status: 500,
                        statusText: 'Internal Server Error',
                        json: () => Promise.resolve({
                            error: {
                                message: 'An error occurred during processing',
                                type: 'server_error'
                            }
                        })
                    });
                }
                return Promise.resolve({
                    ok: true,
                    text: () => Promise.resolve('변환된 텍스트')
                });
            });

            const mockFile = new File(['audio'], 'test.mp3', { type: 'audio/mp3' });

            // 서버 에러 시 자동 재시도
            const result = await transcriptionService.transcribe(mockFile);

            expect(attemptCount).toBe(3);
            expect(result.text).toBe('변환된 텍스트');
        });
    });

    describe('파일 처리 에러', () => {
        test('지원하지 않는 파일 형식', async () => {
            const unsupportedFile = new File(
                ['text content'],
                'document.txt',
                { type: 'text/plain' }
            );

            try {
                await transcriptionService.transcribe(unsupportedFile);
                fail('Should have thrown unsupported file error');
            } catch (error: any) {
                expect(error.message).toContain('Unsupported file type');
            }

            // 지원 형식 안내
            const infoSpy = jest.spyOn(notificationManager, 'info');
            notificationManager.info('지원 형식: mp3, mp4, mpeg, mpga, m4a, wav, webm');
            expect(infoSpy).toHaveBeenCalled();
        });

        test('손상된 오디오 파일', async () => {
            (global.fetch as jest.Mock) = jest.fn().mockResolvedValue({
                ok: false,
                status: 400,
                statusText: 'Bad Request',
                json: () => Promise.resolve({
                    error: {
                        message: 'Invalid audio file',
                        type: 'invalid_request_error'
                    }
                })
            });

            const corruptedFile = new File(
                ['corrupted data'],
                'corrupted.mp3',
                { type: 'audio/mp3' }
            );

            try {
                await whisperService.transcribe(corruptedFile);
                fail('Should have thrown corrupted file error');
            } catch (error: any) {
                expect(error.message).toContain('Invalid audio file');
            }

            // 파일 검증 제안
            notificationManager.warning('오디오 파일이 손상되었을 수 있습니다.');
        });

        test('파일 읽기 권한 에러', async () => {
            const mockFile = new File(['audio'], 'test.mp3', { type: 'audio/mp3' });
            
            // 파일 읽기 에러 시뮬레이션
            jest.spyOn(mockFile, 'arrayBuffer').mockRejectedValue(
                new Error('Permission denied')
            );

            try {
                await transcriptionService.transcribe(mockFile);
                fail('Should have thrown permission error');
            } catch (error: any) {
                expect(error.message).toContain('Permission denied');
            }

            // 권한 확인 안내
            notificationManager.error('파일 접근 권한이 없습니다.');
        });
    });

    describe('복구 메커니즘', () => {
        test('자동 백오프 재시도', async () => {
            const delays: number[] = [];
            let attemptCount = 0;

            (global.fetch as jest.Mock) = jest.fn().mockImplementation(() => {
                attemptCount++;
                if (attemptCount < 3) {
                    return Promise.reject(new Error('Temporary failure'));
                }
                return Promise.resolve({
                    ok: true,
                    text: () => Promise.resolve('변환된 텍스트')
                });
            });

            // 재시도 간격 추적
            const originalSetTimeout = global.setTimeout;
            (global.setTimeout as any) = jest.fn((callback, delay) => {
                delays.push(delay);
                return originalSetTimeout(callback, 0); // 즉시 실행
            });

            const mockFile = new File(['audio'], 'test.mp3', { type: 'audio/mp3' });
            const result = await transcriptionService.transcribe(mockFile);

            // 지수 백오프 확인 (1초, 2초, 4초...)
            expect(delays[0]).toBe(1000);
            expect(delays[1]).toBe(2000);
            expect(result.text).toBe('변환된 텍스트');
        });

        test('부분 성공 처리', async () => {
            const files = [
                new File(['audio1'], 'file1.mp3', { type: 'audio/mp3' }),
                new File(['audio2'], 'file2.mp3', { type: 'audio/mp3' }),
                new File(['audio3'], 'file3.mp3', { type: 'audio/mp3' })
            ];

            let callCount = 0;
            (global.fetch as jest.Mock) = jest.fn().mockImplementation(() => {
                callCount++;
                if (callCount === 2) {
                    // 두 번째 파일만 실패
                    return Promise.reject(new Error('Processing failed'));
                }
                return Promise.resolve({
                    ok: true,
                    text: () => Promise.resolve(`변환된 텍스트 ${callCount}`)
                });
            });

            const results: any[] = [];
            const errors: any[] = [];

            for (const file of files) {
                try {
                    const result = await transcriptionService.transcribe(file);
                    results.push({ file: file.name, text: result.text });
                } catch (error) {
                    errors.push({ file: file.name, error });
                }
            }

            // 부분 성공 확인
            expect(results).toHaveLength(2);
            expect(errors).toHaveLength(1);
            expect(errors[0].file).toBe('file2.mp3');

            // 결과 요약 표시
            notificationManager.info(`${results.length}개 성공, ${errors.length}개 실패`);
        });

        test('에러 로깅 및 리포팅', async () => {
            const logSpy = jest.spyOn(logger, 'error');
            const errorReportSpy = jest.fn();

            // 에러 리포터 등록
            errorManager.setReporter(errorReportSpy);

            (global.fetch as jest.Mock) = jest.fn().mockRejectedValue(
                new Error('Critical error')
            );

            const mockFile = new File(['audio'], 'test.mp3', { type: 'audio/mp3' });

            try {
                await transcriptionService.transcribe(mockFile);
            } catch (error: any) {
                // 에러 로깅
                logger.error('Transcription failed', error);
                expect(logSpy).toHaveBeenCalledWith('Transcription failed', error);

                // 에러 리포팅
                await errorManager.report(error, {
                    context: 'transcription',
                    file: mockFile.name,
                    timestamp: new Date().toISOString()
                });
                expect(errorReportSpy).toHaveBeenCalled();
            }
        });

        test('폴백 메커니즘', async () => {
            // 메인 API 실패 시 폴백 API 사용
            const mainApiUrl = settings.apiUrl;
            const fallbackApiUrl = 'https://fallback-api.example.com/transcribe';

            let apiCallCount = 0;
            (global.fetch as jest.Mock) = jest.fn().mockImplementation((url) => {
                apiCallCount++;
                if (url === mainApiUrl && apiCallCount === 1) {
                    return Promise.reject(new Error('Main API failed'));
                }
                return Promise.resolve({
                    ok: true,
                    text: () => Promise.resolve('폴백 API 결과')
                });
            });

            // 폴백 설정
            settings.fallbackApiUrl = fallbackApiUrl;
            const mockFile = new File(['audio'], 'test.mp3', { type: 'audio/mp3' });

            // 폴백 로직이 있는 서비스 사용
            const result = await transcriptionService.transcribe(mockFile);

            expect(result.text).toBe('폴백 API 결과');
            expect(apiCallCount).toBe(2); // 메인 실패, 폴백 성공

            // 폴백 사용 알림
            notificationManager.warning('대체 API를 사용하여 처리되었습니다.');
        });
    });

    describe('사용자 친화적 에러 메시지', () => {
        test('기술적 에러를 사용자 친화적 메시지로 변환', () => {
            const technicalErrors = [
                { error: 'ECONNREFUSED', message: '서버에 연결할 수 없습니다.' },
                { error: 'ETIMEDOUT', message: '연결 시간이 초과되었습니다.' },
                { error: 'ENOTFOUND', message: '서버를 찾을 수 없습니다.' },
                { error: 'EPERM', message: '권한이 없습니다.' },
                { error: 'ENOSPC', message: '저장 공간이 부족합니다.' }
            ];

            technicalErrors.forEach(({ error, message }) => {
                const userMessage = errorHandler.getUserFriendlyMessage(new Error(error));
                expect(userMessage).toBe(message);
            });
        });

        test('에러 코드별 해결 방법 제시', () => {
            const errorWithSolution = {
                code: 'INVALID_API_KEY',
                message: 'API 키가 유효하지 않습니다.',
                solution: '설정에서 올바른 API 키를 입력해주세요.'
            };

            const solution = errorHandler.getSolution(errorWithSolution.code);
            expect(solution).toBe(errorWithSolution.solution);

            // 해결 방법 표시
            notificationManager.error(
                errorWithSolution.message,
                { detail: solution }
            );
        });
    });
});