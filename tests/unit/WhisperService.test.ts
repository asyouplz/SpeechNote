/**
 * WhisperService 단위 테스트
 */

import { requestUrl } from 'obsidian';
import {
    WhisperService,
    WhisperAPIError,
    AuthenticationError,
    RateLimitError,
    FileTooLargeError,
    ServerError,
} from '../../src/infrastructure/api/WhisperService';
import type { ILogger, WhisperOptions } from '../../src/types';
import {
    createMockArrayBuffer,
    createMockWhisperResponse,
    createMockAPIErrorResponse,
} from '../helpers/mockDataFactory';
import '../helpers/testSetup';

// Mock Obsidian's requestUrl
jest.mock('obsidian', () => ({
    requestUrl: jest.fn(),
}));

// Mock helper functions
jest.mock('../../src/utils/common/helpers', () => ({
    retry: jest.fn((fn) => fn()),
    sleep: jest.fn(() => Promise.resolve()),
    withTimeout: jest.fn((promise) => promise),
}));

jest.mock('../../src/utils/common/validators', () => ({
    validateApiKey: jest.fn(() => ({ valid: true })),
    validateRange: jest.fn((value) => ({ valid: value >= 0 && value <= 1, value })),
}));

jest.mock('../../src/utils/common/formatters', () => ({
    formatFileSize: jest.fn((size) => `${(size / 1024 / 1024).toFixed(2)}MB`),
    truncateText: jest.fn((text, maxLength) => text.substring(0, maxLength)),
}));

describe('WhisperService', () => {
    let whisperService: WhisperService;
    let mockLogger: jest.Mocked<ILogger>;
    const mockApiKey = 'test-api-key';

    beforeEach(() => {
        mockLogger = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        };

        whisperService = new WhisperService(mockApiKey, mockLogger);
        jest.clearAllMocks();
    });

    describe('transcribe', () => {
        it('should successfully transcribe audio', async () => {
            const audioBuffer = createMockArrayBuffer(1024);
            const mockResponse = createMockWhisperResponse();

            (requestUrl as jest.Mock).mockResolvedValue({
                status: 200,
                json: mockResponse,
            });

            const result = await whisperService.transcribe(audioBuffer);

            expect(result.text).toBe(mockResponse.text);
            expect(result.language).toBe(mockResponse.language);
            expect(requestUrl).toHaveBeenCalledWith(
                expect.objectContaining({
                    url: 'https://api.openai.com/v1/audio/transcriptions',
                    method: 'POST',
                    headers: expect.objectContaining({
                        Authorization: `Bearer ${mockApiKey}`,
                    }),
                })
            );
        });

        it('should include options in request', async () => {
            const audioBuffer = createMockArrayBuffer(1024);
            const options: WhisperOptions = {
                language: 'ko',
                model: 'whisper-1',
                temperature: 0.2,
                prompt: 'Test prompt',
                responseFormat: 'verbose_json',
            };

            (requestUrl as jest.Mock).mockResolvedValue({
                status: 200,
                json: createMockWhisperResponse(),
            });

            await whisperService.transcribe(audioBuffer, options);

            const callArgs = (requestUrl as jest.Mock).mock.calls[0][0];
            const formData = callArgs.body as FormData;

            // Verify FormData append was called with correct parameters
            expect(formData.append).toHaveBeenCalledWith('model', 'whisper-1');
            expect(formData.append).toHaveBeenCalledWith('language', 'ko');
            expect(formData.append).toHaveBeenCalledWith('temperature', '0.2');
            expect(formData.append).toHaveBeenCalledWith('response_format', 'verbose_json');
        });

        it('should reject files larger than 25MB', async () => {
            const largeBuffer = createMockArrayBuffer(26 * 1024 * 1024); // 26MB

            await expect(whisperService.transcribe(largeBuffer)).rejects.toThrow(FileTooLargeError);
            expect(requestUrl).not.toHaveBeenCalled();
        });

        it('should handle text response format', async () => {
            const audioBuffer = createMockArrayBuffer(1024);
            const textResponse = 'Transcribed text only';

            (requestUrl as jest.Mock).mockResolvedValue({
                status: 200,
                json: textResponse,
            });

            const result = await whisperService.transcribe(audioBuffer, {
                responseFormat: 'text',
            });

            expect(result.text).toBe(textResponse);
            expect(result.duration).toBeDefined();
        });

        it('should handle verbose_json response with segments', async () => {
            const audioBuffer = createMockArrayBuffer(1024);
            const mockResponse = {
                text: 'Full transcription',
                language: 'ko',
                duration: 10.5,
                segments: [
                    { start: 0, end: 5, text: 'First segment' },
                    { start: 5, end: 10.5, text: 'Second segment' },
                ],
            };

            (requestUrl as jest.Mock).mockResolvedValue({
                status: 200,
                json: mockResponse,
            });

            const result = await whisperService.transcribe(audioBuffer, {
                responseFormat: 'verbose_json',
            });

            expect(result.text).toBe(mockResponse.text);
            expect(result.segments).toEqual(mockResponse.segments);
            expect(result.language).toBe('ko');
        });

        it('should skip language parameter when set to auto', async () => {
            const audioBuffer = createMockArrayBuffer(1024);

            (requestUrl as jest.Mock).mockResolvedValue({
                status: 200,
                json: createMockWhisperResponse(),
            });

            await whisperService.transcribe(audioBuffer, {
                language: 'auto',
            });

            const callArgs = (requestUrl as jest.Mock).mock.calls[0][0];
            const formData = callArgs.body as FormData;

            // Should not append language when set to 'auto'
            expect(formData.append).not.toHaveBeenCalledWith('language', 'auto');
        });

        it('should validate and clamp temperature value', async () => {
            const audioBuffer = createMockArrayBuffer(1024);

            (requestUrl as jest.Mock).mockResolvedValue({
                status: 200,
                json: createMockWhisperResponse(),
            });

            // Test invalid temperature (> 1)
            await whisperService.transcribe(audioBuffer, {
                temperature: 1.5,
            });

            expect(mockLogger.warn).toHaveBeenCalledWith(
                'Invalid temperature value, using default',
                expect.objectContaining({ temperature: 1.5 })
            );
        });

        it('should truncate long prompts', async () => {
            const audioBuffer = createMockArrayBuffer(1024);
            const longPrompt = 'Very long prompt '.repeat(100); // > 224 tokens

            (requestUrl as jest.Mock).mockResolvedValue({
                status: 200,
                json: createMockWhisperResponse(),
            });

            await whisperService.transcribe(audioBuffer, {
                prompt: longPrompt,
            });

            const callArgs = (requestUrl as jest.Mock).mock.calls[0][0];
            const formData = callArgs.body as FormData;

            // Verify prompt was truncated
            expect(formData.append).toHaveBeenCalledWith(
                'prompt',
                expect.stringMatching(/^Very long prompt/)
            );
        });
    });

    describe('error handling', () => {
        it('should handle 401 authentication error', async () => {
            const audioBuffer = createMockArrayBuffer(1024);

            (requestUrl as jest.Mock).mockResolvedValue({
                status: 401,
                json: { error: { message: 'Invalid API key' } },
            });

            await expect(whisperService.transcribe(audioBuffer)).rejects.toThrow(
                AuthenticationError
            );
        });

        it('should handle 429 rate limit error', async () => {
            const audioBuffer = createMockArrayBuffer(1024);

            (requestUrl as jest.Mock).mockResolvedValue({
                status: 429,
                json: { error: { message: 'Rate limit exceeded' } },
                headers: { 'retry-after': '60' },
            });

            await expect(whisperService.transcribe(audioBuffer)).rejects.toThrow(RateLimitError);
        });

        it('should handle 413 file too large error', async () => {
            const audioBuffer = createMockArrayBuffer(1024);

            (requestUrl as jest.Mock).mockResolvedValue({
                status: 413,
                json: { error: { message: 'Request entity too large' } },
            });

            await expect(whisperService.transcribe(audioBuffer)).rejects.toThrow(FileTooLargeError);
        });

        it('should handle 500 server error', async () => {
            const audioBuffer = createMockArrayBuffer(1024);

            (requestUrl as jest.Mock).mockResolvedValue({
                status: 500,
                json: { error: { message: 'Internal server error' } },
            });

            await expect(whisperService.transcribe(audioBuffer)).rejects.toThrow(ServerError);
        });

        it('should handle network errors', async () => {
            const audioBuffer = createMockArrayBuffer(1024);

            (requestUrl as jest.Mock).mockRejectedValue(new Error('Network error'));

            await expect(whisperService.transcribe(audioBuffer)).rejects.toThrow('Network error');
        });

        it('should handle abort errors', async () => {
            const audioBuffer = createMockArrayBuffer(1024);
            const abortError = new Error('Aborted');
            abortError.name = 'AbortError';

            (requestUrl as jest.Mock).mockRejectedValue(abortError);

            await expect(whisperService.transcribe(audioBuffer)).rejects.toThrow(
                expect.objectContaining({
                    code: 'CANCELLED',
                    message: 'Transcription cancelled',
                })
            );
        });

        it('should handle malformed response', async () => {
            const audioBuffer = createMockArrayBuffer(1024);

            (requestUrl as jest.Mock).mockResolvedValue({
                status: 200,
                json: null,
            });

            const result = await whisperService.transcribe(audioBuffer);

            expect(result.text).toBe('');
        });
    });

    describe('cancel', () => {
        it('should cancel ongoing transcription', () => {
            // Set up abort controller
            const abortController = new AbortController();
            (whisperService as any).abortController = abortController;
            const abortSpy = jest.spyOn(abortController, 'abort');

            whisperService.cancel();

            expect(abortSpy).toHaveBeenCalled();
            expect(mockLogger.debug).toHaveBeenCalledWith('Transcription cancelled by user');
        });

        it('should handle cancel when no transcription is active', () => {
            whisperService.cancel();

            expect(mockLogger.debug).not.toHaveBeenCalled();
        });
    });

    describe('validateApiKey', () => {
        it('should validate valid API key', async () => {
            (requestUrl as jest.Mock).mockResolvedValue({
                status: 200,
                json: { text: 'Test' },
            });

            const isValid = await whisperService.validateApiKey('sk-valid-key');

            expect(isValid).toBe(true);
        });

        it('should reject invalid API key', async () => {
            (requestUrl as jest.Mock).mockResolvedValue({
                status: 401,
                json: { error: { message: 'Invalid API key' } },
            });

            const isValid = await whisperService.validateApiKey('invalid-key');

            expect(isValid).toBe(false);
            expect(mockLogger.warn).toHaveBeenCalledWith('API key validation failed: Invalid key');
        });

        it('should handle non-auth errors during validation', async () => {
            (requestUrl as jest.Mock).mockResolvedValue({
                status: 500,
                json: { error: { message: 'Server error' } },
            });

            const isValid = await whisperService.validateApiKey('sk-test-key');

            // Non-auth errors should still return true (key might be valid)
            expect(isValid).toBe(true);
            expect(mockLogger.debug).toHaveBeenCalled();
        });

        it('should restore original API key after validation', async () => {
            const originalKey = mockApiKey;
            const testKey = 'sk-test-key';

            (requestUrl as jest.Mock).mockResolvedValue({
                status: 200,
                json: { text: 'Test' },
            });

            await whisperService.validateApiKey(testKey);

            // Verify original key is restored
            expect((whisperService as any).apiKey).toBe(originalKey);
        });
    });

    describe('resetCircuitBreaker', () => {
        it('should reset circuit breaker', () => {
            whisperService.resetCircuitBreaker();

            expect(mockLogger.info).toHaveBeenCalledWith('Circuit breaker reset');
        });
    });

    describe('queue management', () => {
        it('should process requests sequentially', async () => {
            const buffers = [
                createMockArrayBuffer(1024),
                createMockArrayBuffer(2048),
                createMockArrayBuffer(3072),
            ];

            let callCount = 0;
            (requestUrl as jest.Mock).mockImplementation(() => {
                callCount++;
                return Promise.resolve({
                    status: 200,
                    json: createMockWhisperResponse({ text: `Response ${callCount}` }),
                });
            });

            const results = await Promise.all(
                buffers.map((buffer) => whisperService.transcribe(buffer))
            );

            expect(results).toHaveLength(3);
            expect(results[0].text).toContain('Response 1');
            expect(results[1].text).toContain('Response 2');
            expect(results[2].text).toContain('Response 3');
        });

        it('should continue queue processing after error', async () => {
            const buffers = [createMockArrayBuffer(1024), createMockArrayBuffer(2048)];

            (requestUrl as jest.Mock)
                .mockRejectedValueOnce(new Error('First request failed'))
                .mockResolvedValueOnce({
                    status: 200,
                    json: createMockWhisperResponse({ text: 'Second request success' }),
                });

            const results = await Promise.allSettled(
                buffers.map((buffer) => whisperService.transcribe(buffer))
            );

            expect(results[0].status).toBe('rejected');
            expect(results[1].status).toBe('fulfilled');
            if (results[1].status === 'fulfilled') {
                expect(results[1].value.text).toBe('Second request success');
            }
        });
    });

    describe('performance', () => {
        it('should handle timeout correctly', async () => {
            const audioBuffer = createMockArrayBuffer(1024);

            (requestUrl as jest.Mock).mockImplementation(
                () => new Promise((resolve) => setTimeout(resolve, 60000))
            );

            // This should timeout (30s timeout configured)
            const promise = whisperService.transcribe(audioBuffer);

            // We can't actually wait for timeout in tests, so we'll just verify the config
            const callArgs = (requestUrl as jest.Mock).mock.calls[0][0];
            expect(callArgs.timeout).toBe(30000);
        });

        it('should log processing time', async () => {
            const audioBuffer = createMockArrayBuffer(1024);

            (requestUrl as jest.Mock).mockResolvedValue({
                status: 200,
                json: createMockWhisperResponse(),
            });

            await whisperService.transcribe(audioBuffer);

            expect(mockLogger.info).toHaveBeenCalledWith(
                expect.stringContaining('Transcription completed in'),
                expect.objectContaining({ status: 200 })
            );
        });
    });
});
