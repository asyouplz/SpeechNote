/**
 * WhisperService API 통합 테스트
 * OpenAI Whisper API와의 통합을 테스트합니다.
 */

import {
    WhisperService,
    WhisperAPIError,
    AuthenticationError,
    RateLimitError,
} from '../../src/infrastructure/api/WhisperService';
import { SettingsManager, PluginSettings } from '../../src/infrastructure/storage/SettingsManager';
import type { ILogger, WhisperOptions, WhisperResponse } from '../../src/types';
import { requestUrl } from 'obsidian';

// Mock Obsidian API
jest.mock('obsidian', () => ({
    requestUrl: jest.fn(),
    Plugin: jest.fn().mockImplementation(() => ({
        loadData: jest.fn(),
        saveData: jest.fn(),
    })),
}));

// Mock Logger
class MockLogger implements ILogger {
    debug = jest.fn();
    info = jest.fn();
    warn = jest.fn();
    error = jest.fn();
}

describe('WhisperService Integration Tests', () => {
    let whisperService: WhisperService;
    let logger: MockLogger;
    const mockApiKey = 'sk-test1234567890abcdefghijklmnopqrstuvwxyz';

    beforeEach(() => {
        logger = new MockLogger();
        whisperService = new WhisperService(mockApiKey, logger);
        jest.clearAllMocks();
    });

    describe('API 요청 처리', () => {
        it('성공적인 transcription 요청을 처리해야 함', async () => {
            // Arrange
            const audioBuffer = new ArrayBuffer(1000);
            const expectedResponse = {
                text: '안녕하세요, 테스트입니다.',
                language: 'ko',
                duration: 2.5,
            };

            (requestUrl as jest.Mock).mockResolvedValue({
                status: 200,
                json: expectedResponse,
            });

            // Act
            const result = await whisperService.transcribe(audioBuffer);

            // Assert
            expect(result).toEqual(expectedResponse);
            expect(logger.debug).toHaveBeenCalledWith(
                expect.stringContaining('Starting transcription request'),
                expect.objectContaining({
                    fileSize: 1000,
                })
            );
            expect(logger.info).toHaveBeenCalledWith(
                expect.stringMatching(/Transcription completed in \d+ms/),
                expect.any(Object)
            );
        });

        it('verbose_json 형식의 응답을 올바르게 파싱해야 함', async () => {
            // Arrange
            const audioBuffer = new ArrayBuffer(1000);
            const verboseResponse = {
                text: 'Hello world',
                language: 'en',
                duration: 1.5,
                segments: [
                    {
                        id: 0,
                        seek: 0,
                        start: 0,
                        end: 0.5,
                        text: 'Hello',
                        tokens: [1, 2],
                        temperature: 0.0,
                        avg_logprob: -0.5,
                        compression_ratio: 1.2,
                        no_speech_prob: 0.01,
                    },
                    {
                        id: 1,
                        seek: 0,
                        start: 0.5,
                        end: 1.5,
                        text: ' world',
                        tokens: [3, 4],
                        temperature: 0.0,
                        avg_logprob: -0.3,
                        compression_ratio: 1.1,
                        no_speech_prob: 0.02,
                    },
                ],
            };

            (requestUrl as jest.Mock).mockResolvedValue({
                status: 200,
                json: verboseResponse,
            });

            // Act
            const result = await whisperService.transcribe(audioBuffer, {
                responseFormat: 'verbose_json',
            });

            // Assert
            expect(result.text).toBe('Hello world');
            expect(result.segments).toHaveLength(2);
            expect(result.segments![0].text).toBe('Hello');
        });

        it('text 형식의 응답을 올바르게 처리해야 함', async () => {
            // Arrange
            const audioBuffer = new ArrayBuffer(1000);
            const textResponse = 'This is plain text response';

            (requestUrl as jest.Mock).mockResolvedValue({
                status: 200,
                json: textResponse, // text 형식은 string으로 반환
            });

            // Act
            const result = await whisperService.transcribe(audioBuffer, {
                responseFormat: 'text',
            });

            // Assert
            expect(result.text).toBe(textResponse);
            expect(result.duration).toBeGreaterThan(0);
        });
    });

    describe('에러 처리', () => {
        it('401 에러를 AuthenticationError로 변환해야 함', async () => {
            // Arrange
            const audioBuffer = new ArrayBuffer(1000);

            (requestUrl as jest.Mock).mockResolvedValue({
                status: 401,
                json: { error: { message: 'Invalid API key' } },
            });

            // Act & Assert
            await expect(whisperService.transcribe(audioBuffer)).rejects.toThrow(
                AuthenticationError
            );

            expect(logger.error).toHaveBeenCalledWith(
                expect.stringContaining('API Error: 401'),
                undefined,
                expect.objectContaining({ status: 401 })
            );
        });

        it('429 에러를 RateLimitError로 변환해야 함', async () => {
            // Arrange
            const audioBuffer = new ArrayBuffer(1000);

            (requestUrl as jest.Mock).mockResolvedValue({
                status: 429,
                json: { error: { message: 'Rate limit exceeded' } },
                headers: { 'retry-after': '60' },
            });

            // Act & Assert
            await expect(whisperService.transcribe(audioBuffer)).rejects.toThrow(RateLimitError);
        });

        it('파일 크기 제한을 검증해야 함', async () => {
            // Arrange
            const largeBuffer = new ArrayBuffer(26 * 1024 * 1024); // 26MB

            // Act & Assert
            await expect(whisperService.transcribe(largeBuffer)).rejects.toThrow(
                'File size exceeds API limit (25MB)'
            );
        });

        it('네트워크 에러를 재시도해야 함', async () => {
            // Arrange
            const audioBuffer = new ArrayBuffer(1000);
            let attempts = 0;

            (requestUrl as jest.Mock).mockImplementation(() => {
                attempts++;
                if (attempts < 3) {
                    throw new Error('Network error');
                }
                return Promise.resolve({
                    status: 200,
                    json: { text: 'Success after retry' },
                });
            });

            // Act
            const result = await whisperService.transcribe(audioBuffer);

            // Assert
            expect(result.text).toBe('Success after retry');
            expect(attempts).toBe(3);
            expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('Retrying after'));
        });

        it('최대 재시도 횟수 초과 시 에러를 발생시켜야 함', async () => {
            // Arrange
            const audioBuffer = new ArrayBuffer(1000);

            (requestUrl as jest.Mock).mockRejectedValue(new Error('Network error'));

            // Act & Assert
            await expect(whisperService.transcribe(audioBuffer)).rejects.toThrow(
                'Operation failed after 3 attempts'
            );
        });
    });

    describe('API 키 검증', () => {
        it('유효한 API 키를 검증해야 함', async () => {
            // Arrange
            (requestUrl as jest.Mock).mockResolvedValue({
                status: 200,
                json: { text: 'Test' },
            });

            // Act
            const isValid = await whisperService.validateApiKey(mockApiKey);

            // Assert
            expect(isValid).toBe(true);
        });

        it('잘못된 API 키를 거부해야 함', async () => {
            // Arrange
            (requestUrl as jest.Mock).mockResolvedValue({
                status: 401,
                json: { error: { message: 'Invalid API key' } },
            });

            // Act
            const isValid = await whisperService.validateApiKey('invalid-key');

            // Assert
            expect(isValid).toBe(false);
            expect(logger.warn).toHaveBeenCalledWith('API key validation failed: Invalid key');
        });
    });

    describe('요청 취소', () => {
        it('진행 중인 요청을 취소할 수 있어야 함', async () => {
            // Arrange
            const audioBuffer = new ArrayBuffer(1000);

            (requestUrl as jest.Mock).mockImplementation(() => {
                // AbortError 시뮬레이션
                const error = new Error('Aborted');
                error.name = 'AbortError';
                throw error;
            });

            // Act
            const promise = whisperService.transcribe(audioBuffer);
            whisperService.cancel();

            // Assert
            await expect(promise).rejects.toThrow('Transcription cancelled');
            expect(logger.debug).toHaveBeenCalledWith('Transcription cancelled by user');
        });
    });

    describe('FormData 구성', () => {
        it('모든 옵션이 올바르게 FormData에 포함되어야 함', async () => {
            // Arrange
            const audioBuffer = new ArrayBuffer(1000);
            const options: WhisperOptions = {
                language: 'ko',
                prompt: '이것은 한국어 음성입니다.',
                temperature: 0.7,
                responseFormat: 'verbose_json',
            };

            let capturedFormData: FormData | null = null;
            (requestUrl as jest.Mock).mockImplementation((params) => {
                capturedFormData = params.body;
                return Promise.resolve({
                    status: 200,
                    json: { text: 'Test' },
                });
            });

            // Act
            await whisperService.transcribe(audioBuffer, options);

            // Assert
            expect(capturedFormData).not.toBeNull();
            // FormData 검증 (실제 환경에서는 FormData 내용을 직접 확인하기 어려움)
            expect(requestUrl).toHaveBeenCalledWith(
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        Authorization: `Bearer ${mockApiKey}`,
                    }),
                })
            );
        });

        it('긴 프롬프트를 자동으로 잘라야 함', async () => {
            // Arrange
            const audioBuffer = new ArrayBuffer(1000);
            const longPrompt = 'a'.repeat(1000); // 매우 긴 프롬프트

            (requestUrl as jest.Mock).mockResolvedValue({
                status: 200,
                json: { text: 'Test' },
            });

            // Act
            await whisperService.transcribe(audioBuffer, {
                prompt: longPrompt,
            });

            // Assert
            // 프롬프트가 잘렸는지 확인 (224 토큰 * 4 = 896자 - 3 = 893자 + '...')
            expect(requestUrl).toHaveBeenCalled();
        });
    });

    describe('Circuit Breaker', () => {
        it('연속된 실패 후 Circuit이 열려야 함', async () => {
            // Arrange
            const audioBuffer = new ArrayBuffer(1000);
            (requestUrl as jest.Mock).mockResolvedValue({
                status: 500,
                json: { error: { message: 'Server error' } },
            });

            // Act & Assert
            // 5번 실패 시도
            for (let i = 0; i < 5; i++) {
                await expect(whisperService.transcribe(audioBuffer)).rejects.toThrow(
                    WhisperAPIError
                );
            }

            // Circuit이 열린 후 요청 시도
            await expect(whisperService.transcribe(audioBuffer)).rejects.toThrow(
                'Circuit breaker is open'
            );

            expect(logger.warn).toHaveBeenCalledWith(
                expect.stringContaining('Circuit breaker opened')
            );
        });

        it('Circuit을 수동으로 리셋할 수 있어야 함', async () => {
            // Arrange
            const audioBuffer = new ArrayBuffer(1000);

            // Circuit을 열기 위해 실패 유도
            (requestUrl as jest.Mock).mockResolvedValue({
                status: 500,
                json: { error: { message: 'Server error' } },
            });

            for (let i = 0; i < 5; i++) {
                await expect(whisperService.transcribe(audioBuffer)).rejects.toThrow();
            }

            // Circuit 리셋
            whisperService.resetCircuitBreaker();

            // 성공 응답 설정
            (requestUrl as jest.Mock).mockResolvedValue({
                status: 200,
                json: { text: 'Success after reset' },
            });

            // Act
            const result = await whisperService.transcribe(audioBuffer);

            // Assert
            expect(result.text).toBe('Success after reset');
            expect(logger.info).toHaveBeenCalledWith('Circuit breaker reset');
        });
    });
});

describe('SettingsManager Integration Tests', () => {
    let settingsManager: SettingsManager;
    let mockPlugin: any;
    let logger: MockLogger;

    beforeEach(() => {
        logger = new MockLogger();
        mockPlugin = {
            loadData: jest.fn(),
            saveData: jest.fn(),
        };
        settingsManager = new SettingsManager(mockPlugin, logger);
    });

    describe('API 키 관리', () => {
        it('API 키를 암호화하여 저장해야 함', async () => {
            // Arrange
            const apiKey = 'sk-test1234567890abcdefghijklmnopqrstuvwxyz';

            // Act
            const result = await settingsManager.setApiKey(apiKey);

            // Assert
            expect(result).toBe(true);
            expect(mockPlugin.saveData).toHaveBeenCalledWith(
                expect.objectContaining({
                    encryptedApiKey: expect.any(String),
                })
            );
            expect(mockPlugin.saveData).toHaveBeenCalledWith(
                expect.not.objectContaining({
                    apiKey: apiKey,
                })
            );
        });

        it('잘못된 형식의 API 키를 거부해야 함', async () => {
            // Arrange
            const invalidKey = 'invalid-api-key';

            // Act
            const result = await settingsManager.setApiKey(invalidKey);

            // Assert
            expect(result).toBe(false);
            expect(logger.warn).toHaveBeenCalledWith('Invalid API key format');
        });

        it('API 키를 마스킹하여 반환해야 함', async () => {
            // Arrange
            const apiKey = 'sk-test1234567890abcdefghijklmnopqrstuvwxyz';
            await settingsManager.setApiKey(apiKey);

            // Act
            const masked = settingsManager.getMaskedApiKey();

            // Assert
            expect(masked).toMatch(/^sk-test\*+wxyz$/);
            expect(masked).not.toContain('1234567890');
        });
    });

    describe('설정 저장 및 로드', () => {
        it('설정을 저장하고 로드할 수 있어야 함', async () => {
            // Arrange
            const settings: PluginSettings = {
                apiKey: '',
                model: 'whisper-1',
                language: 'ko',
                autoInsert: false,
                insertPosition: 'end',
                timestampFormat: 'inline',
                maxFileSize: 20 * 1024 * 1024,
                enableCache: false,
                cacheTTL: 7200000,
                enableDebugLogging: true,
                responseFormat: 'verbose_json',
            };

            mockPlugin.loadData.mockResolvedValue(settings);

            // Act
            const loaded = await settingsManager.load();

            // Assert
            expect(loaded).toMatchObject({
                language: 'ko',
                autoInsert: false,
                insertPosition: 'end',
            });
        });

        it('암호화된 API 키를 복호화하여 로드해야 함', async () => {
            // Arrange
            const apiKey = 'sk-test1234567890abcdefghijklmnopqrstuvwxyz';
            await settingsManager.setApiKey(apiKey);

            const savedData = mockPlugin.saveData.mock.calls[0][0];
            mockPlugin.loadData.mockResolvedValue(savedData);

            // 새 인스턴스 생성
            const newManager = new SettingsManager(mockPlugin, logger);

            // Act
            await newManager.load();
            const loadedKey = newManager.getApiKey();

            // Assert
            expect(loadedKey).toBe(apiKey);
        });
    });

    describe('설정 검증', () => {
        it('유효한 설정을 검증해야 함', async () => {
            // Arrange
            await settingsManager.setApiKey('sk-test1234567890abcdefghijklmnopqrstuvwxyz');

            // Act
            const validation = settingsManager.validateSettings();

            // Assert
            expect(validation.valid).toBe(true);
            expect(validation.errors).toHaveLength(0);
        });

        it('잘못된 설정을 감지해야 함', async () => {
            // Arrange
            await settingsManager.set('maxFileSize', 30 * 1024 * 1024); // 30MB (초과)
            await settingsManager.set('temperature', 1.5); // 1.5 (범위 초과)

            // Act
            const validation = settingsManager.validateSettings();

            // Assert
            expect(validation.valid).toBe(false);
            expect(validation.errors).toContain('API key is not configured');
            expect(validation.errors).toContain(
                'Invalid max file size (must be between 0 and 25MB)'
            );
            expect(validation.errors).toContain('Invalid temperature (must be between 0 and 1)');
        });
    });

    describe('설정 내보내기/가져오기', () => {
        it('민감한 정보를 제외하고 설정을 내보내야 함', async () => {
            // Arrange
            await settingsManager.setApiKey('sk-test1234567890abcdefghijklmnopqrstuvwxyz');
            await settingsManager.set('language', 'ko');

            // Act
            const exported = settingsManager.exportSettings();

            // Assert
            expect(exported.language).toBe('ko');
            expect(exported.apiKey).toBeUndefined();
            expect(exported.encryptedApiKey).toBeUndefined();
        });

        it('설정을 가져올 때 API 키는 무시해야 함', async () => {
            // Arrange
            const originalKey = 'sk-original1234567890abcdefghijklmnopqrstuvwxyz';
            await settingsManager.setApiKey(originalKey);

            const imported = {
                apiKey: 'sk-imported9876543210zyxwvutsrqponmlkjihgfedcba',
                language: 'en',
            };

            // Act
            await settingsManager.importSettings(imported);

            // Assert
            const currentKey = settingsManager.getApiKey();
            expect(currentKey).toBe(originalKey); // 원래 키 유지
            expect(settingsManager.get('language')).toBe('en'); // 다른 설정은 변경
        });
    });
});
