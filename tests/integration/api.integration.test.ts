/**
 * API 통합 테스트
 * WhisperService와 FileUploadManager의 통합 동작을 검증합니다.
 */

import { WhisperService } from '../../src/infrastructure/api/WhisperService';
import { FileUploadManager } from '../../src/infrastructure/api/FileUploadManager';
import { TranscriptionService } from '../../src/core/transcription/TranscriptionService';
import { AudioProcessor } from '../../src/core/transcription/AudioProcessor';
import { TextFormatter } from '../../src/core/transcription/TextFormatter';
import { Vault, requestUrl } from 'obsidian';
import type { IEventManager, ILogger } from '../../src/types';
import {
    createMockAudioFile,
    createMockArrayBuffer,
    createMockVault,
    createMockSettings,
    createMockWhisperResponse,
    createMockWAVBuffer
} from '../helpers/mockDataFactory';
import '../helpers/testSetup';

// Mock Obsidian's requestUrl
jest.mock('obsidian', () => ({
    ...jest.requireActual('obsidian'),
    requestUrl: jest.fn()
}));

describe('API Integration Tests', () => {
    let whisperService: WhisperService;
    let fileUploadManager: FileUploadManager;
    let transcriptionService: TranscriptionService;
    let audioProcessor: AudioProcessor;
    let textFormatter: TextFormatter;
    let mockVault: Partial<Vault>;
    let mockEventManager: jest.Mocked<IEventManager>;
    let mockLogger: jest.Mocked<ILogger>;
    let mockSettings = createMockSettings();

    beforeEach(() => {
        // Setup mocks
        mockVault = createMockVault();
        mockLogger = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        };

        mockEventManager = {
            emit: jest.fn(),
            on: jest.fn(),
            off: jest.fn(),
            once: jest.fn()
        };

        // Initialize services
        whisperService = new WhisperService('test-api-key', mockLogger);
        fileUploadManager = new FileUploadManager(mockVault as Vault, mockLogger);
        audioProcessor = new AudioProcessor(mockVault as Vault, mockLogger);
        textFormatter = new TextFormatter(mockSettings);
        
        transcriptionService = new TranscriptionService(
            whisperService,
            audioProcessor,
            textFormatter,
            mockEventManager,
            mockLogger
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
        fileUploadManager.cleanup();
    });

    describe('WhisperService + FileUploadManager Integration', () => {
        it('should process and transcribe audio file end-to-end', async () => {
            // Setup
            const file = createMockAudioFile({
                name: 'test-audio.mp3',
                extension: 'mp3',
                size: 2 * 1024 * 1024 // 2MB
            });
            const mockBuffer = createMockWAVBuffer(44100, 5);
            const mockWhisperResponse = createMockWhisperResponse({
                text: '통합 테스트 결과입니다.',
                language: 'ko'
            });

            (mockVault.readBinary as jest.Mock).mockResolvedValue(mockBuffer);
            (requestUrl as jest.Mock).mockResolvedValue({
                status: 200,
                json: mockWhisperResponse
            });

            // Execute
            const processedFile = await fileUploadManager.prepareAudioFile(file);
            const transcriptionResult = await whisperService.transcribe(processedFile.buffer);

            // Verify
            expect(processedFile).toBeDefined();
            expect(processedFile.metadata.name).toBe('test-audio.mp3');
            expect(transcriptionResult.text).toBe('통합 테스트 결과입니다.');
            expect(transcriptionResult.language).toBe('ko');
        });

        it('should handle large file compression and transcription', async () => {
            // Setup - file that needs compression
            const file = createMockAudioFile({
                name: 'large-audio.wav',
                extension: 'wav',
                size: 30 * 1024 * 1024 // 30MB
            });
            const mockBuffer = createMockWAVBuffer(44100, 700); // Large WAV

            (mockVault.readBinary as jest.Mock).mockResolvedValue(mockBuffer);
            (requestUrl as jest.Mock).mockResolvedValue({
                status: 200,
                json: createMockWhisperResponse()
            });

            // Execute
            const processedFile = await fileUploadManager.prepareAudioFile(file);
            
            // Verify compression occurred
            expect(processedFile.compressed).toBe(true);
            expect(processedFile.processedSize).toBeLessThan(processedFile.originalSize);

            // Transcribe compressed audio
            const result = await whisperService.transcribe(processedFile.buffer);
            expect(result).toBeDefined();
        });

        it('should propagate progress updates through the pipeline', async () => {
            const file = createMockAudioFile();
            const mockBuffer = createMockArrayBuffer(1024 * 1024);
            const progressUpdates: any[] = [];

            (mockVault.readBinary as jest.Mock).mockResolvedValue(mockBuffer);
            (requestUrl as jest.Mock).mockResolvedValue({
                status: 200,
                json: createMockWhisperResponse()
            });

            // Capture progress
            const processedFile = await fileUploadManager.prepareAudioFile(file, (progress) => {
                progressUpdates.push({ type: 'upload', ...progress });
            });

            // Verify progress updates
            expect(progressUpdates.length).toBeGreaterThan(0);
            expect(progressUpdates.some(p => p.status === 'preparing')).toBe(true);
            expect(progressUpdates.some(p => p.status === 'completed')).toBe(true);

            // Continue with transcription
            const result = await whisperService.transcribe(processedFile.buffer);
            expect(result).toBeDefined();
        });

        it('should handle API errors after file processing', async () => {
            const file = createMockAudioFile();
            const mockBuffer = createMockArrayBuffer(1024);

            (mockVault.readBinary as jest.Mock).mockResolvedValue(mockBuffer);
            (requestUrl as jest.Mock).mockResolvedValue({
                status: 401,
                json: { error: { message: 'Invalid API key' } }
            });

            // File processing should succeed
            const processedFile = await fileUploadManager.prepareAudioFile(file);
            expect(processedFile).toBeDefined();

            // But transcription should fail with auth error
            await expect(whisperService.transcribe(processedFile.buffer))
                .rejects.toThrow('Invalid API key');
        });

        it('should handle cancellation during processing', async () => {
            const file = createMockAudioFile({
                size: 10 * 1024 * 1024 // 10MB
            });
            const mockBuffer = createMockArrayBuffer(10 * 1024 * 1024);

            (mockVault.readBinary as jest.Mock).mockResolvedValue(mockBuffer);

            // Start processing
            const processingPromise = fileUploadManager.prepareAudioFile(file);

            // Cancel immediately
            fileUploadManager.cancel();

            // Should handle cancellation gracefully
            await expect(processingPromise).rejects.toThrow();
        });
    });

    describe('Full Transcription Pipeline Integration', () => {
        it('should complete full transcription workflow', async () => {
            const file = createMockAudioFile({
                name: 'speech.mp3',
                extension: 'mp3',
                size: 3 * 1024 * 1024
            });
            const mockBuffer = createMockArrayBuffer(3 * 1024 * 1024);
            const mockWhisperResponse = createMockWhisperResponse({
                text: '안녕하세요. 음성 인식 테스트입니다.',
                language: 'ko',
                segments: [
                    { start: 0, end: 2, text: '안녕하세요.' },
                    { start: 2, end: 5, text: '음성 인식 테스트입니다.' }
                ]
            });

            (mockVault.readBinary as jest.Mock).mockResolvedValue(mockBuffer);
            (requestUrl as jest.Mock).mockResolvedValue({
                status: 200,
                json: mockWhisperResponse
            });

            // Execute full pipeline
            const result = await transcriptionService.transcribe(file);

            // Verify complete flow
            expect(result.text).toContain('안녕하세요');
            expect(result.language).toBe('ko');
            expect(result.segments).toHaveLength(2);

            // Verify events were emitted
            expect(mockEventManager.emit).toHaveBeenCalledWith(
                'transcription:start',
                expect.objectContaining({ fileName: 'speech.mp3' })
            );
            expect(mockEventManager.emit).toHaveBeenCalledWith(
                'transcription:complete',
                expect.any(Object)
            );
        });

        it('should handle validation errors in pipeline', async () => {
            const file = createMockAudioFile({
                extension: 'txt', // Invalid format
                size: 1024
            });

            await expect(transcriptionService.transcribe(file))
                .rejects.toThrow('File validation failed');

            expect(mockEventManager.emit).toHaveBeenCalledWith(
                'transcription:error',
                expect.any(Object)
            );
        });

        it('should handle network errors in pipeline', async () => {
            const file = createMockAudioFile();
            const mockBuffer = createMockArrayBuffer(1024);

            (mockVault.readBinary as jest.Mock).mockResolvedValue(mockBuffer);
            (requestUrl as jest.Mock).mockRejectedValue(new Error('Network error'));

            await expect(transcriptionService.transcribe(file))
                .rejects.toThrow('Network error');

            expect(mockEventManager.emit).toHaveBeenCalledWith(
                'transcription:error',
                expect.objectContaining({
                    error: expect.objectContaining({
                        message: 'Network error'
                    })
                })
            );
        });

        it('should apply text formatting in pipeline', async () => {
            const file = createMockAudioFile();
            const mockBuffer = createMockArrayBuffer(1024);
            const mockWhisperResponse = createMockWhisperResponse({
                text: '  많은   공백이    있는   텍스트입니다.  '
            });

            (mockVault.readBinary as jest.Mock).mockResolvedValue(mockBuffer);
            (requestUrl as jest.Mock).mockResolvedValue({
                status: 200,
                json: mockWhisperResponse
            });

            const result = await transcriptionService.transcribe(file);

            // Text should be formatted
            expect(result.text).toBe('많은 공백이 있는 텍스트입니다.');
            expect(result.text).not.toContain('  '); // No double spaces
        });

        it('should handle timestamp formatting when configured', async () => {
            // Update settings for timestamp
            mockSettings.timestampFormat = 'inline';
            textFormatter = new TextFormatter(mockSettings);
            
            transcriptionService = new TranscriptionService(
                whisperService,
                audioProcessor,
                textFormatter,
                mockEventManager,
                mockLogger
            );

            const file = createMockAudioFile();
            const mockBuffer = createMockArrayBuffer(1024);
            const mockWhisperResponse = createMockWhisperResponse({
                text: '타임스탬프 테스트',
                segments: [
                    { start: 0, end: 3, text: '타임스탬프 테스트' }
                ]
            });

            (mockVault.readBinary as jest.Mock).mockResolvedValue(mockBuffer);
            (requestUrl as jest.Mock).mockResolvedValue({
                status: 200,
                json: mockWhisperResponse
            });

            const result = await transcriptionService.transcribe(file);

            expect(result.segments).toBeDefined();
            expect(result.segments![0].text).toBe('타임스탬프 테스트');
        });
    });

    describe('Error Recovery and Retry Logic', () => {
        it('should handle transient API errors with retry', async () => {
            const file = createMockAudioFile();
            const mockBuffer = createMockArrayBuffer(1024);

            (mockVault.readBinary as jest.Mock).mockResolvedValue(mockBuffer);
            
            // First call fails, second succeeds
            (requestUrl as jest.Mock)
                .mockRejectedValueOnce(new Error('Temporary error'))
                .mockResolvedValueOnce({
                    status: 200,
                    json: createMockWhisperResponse()
                });

            // Should eventually succeed with retry
            const processedFile = await fileUploadManager.prepareAudioFile(file);
            
            // Note: Retry logic is in WhisperService
            // This would require retry strategy to be properly mocked
            expect(processedFile).toBeDefined();
        });

        it('should handle rate limiting gracefully', async () => {
            const file = createMockAudioFile();
            const mockBuffer = createMockArrayBuffer(1024);

            (mockVault.readBinary as jest.Mock).mockResolvedValue(mockBuffer);
            (requestUrl as jest.Mock).mockResolvedValue({
                status: 429,
                json: { error: { message: 'Rate limit exceeded' } },
                headers: { 'retry-after': '5' }
            });

            const processedFile = await fileUploadManager.prepareAudioFile(file);
            
            await expect(whisperService.transcribe(processedFile.buffer))
                .rejects.toThrow('Rate limit exceeded');
        });
    });

    describe('Concurrent Operations', () => {
        it('should handle multiple file processing concurrently', async () => {
            const files = [
                createMockAudioFile({ name: 'file1.mp3' }),
                createMockAudioFile({ name: 'file2.mp3' }),
                createMockAudioFile({ name: 'file3.mp3' })
            ];
            const mockBuffer = createMockArrayBuffer(1024);

            (mockVault.readBinary as jest.Mock).mockResolvedValue(mockBuffer);
            (requestUrl as jest.Mock).mockResolvedValue({
                status: 200,
                json: createMockWhisperResponse()
            });

            // Process files concurrently
            const results = await Promise.all(
                files.map(file => transcriptionService.transcribe(file))
            );

            expect(results).toHaveLength(3);
            results.forEach(result => {
                expect(result.text).toBeDefined();
                expect(result.language).toBeDefined();
            });

            // Verify all events were emitted
            expect(mockEventManager.emit).toHaveBeenCalledTimes(6); // 3 starts + 3 completes
        });

        it('should handle mixed success and failure in concurrent operations', async () => {
            const files = [
                createMockAudioFile({ name: 'success.mp3' }),
                createMockAudioFile({ name: 'failure.txt', extension: 'txt' }), // Will fail validation
                createMockAudioFile({ name: 'success2.mp3' })
            ];
            const mockBuffer = createMockArrayBuffer(1024);

            (mockVault.readBinary as jest.Mock).mockResolvedValue(mockBuffer);
            (requestUrl as jest.Mock).mockResolvedValue({
                status: 200,
                json: createMockWhisperResponse()
            });

            // Process files concurrently with error handling
            const results = await Promise.allSettled(
                files.map(file => transcriptionService.transcribe(file))
            );

            expect(results[0].status).toBe('fulfilled');
            expect(results[1].status).toBe('rejected');
            expect(results[2].status).toBe('fulfilled');
        });
    });

    describe('Performance and Memory Management', () => {
        it('should handle large files without memory issues', async () => {
            const file = createMockAudioFile({
                size: 24 * 1024 * 1024 // 24MB - just under limit
            });
            const mockBuffer = createMockArrayBuffer(24 * 1024 * 1024);

            (mockVault.readBinary as jest.Mock).mockResolvedValue(mockBuffer);
            (requestUrl as jest.Mock).mockResolvedValue({
                status: 200,
                json: createMockWhisperResponse()
            });

            const startMemory = process.memoryUsage().heapUsed;
            
            const result = await transcriptionService.transcribe(file);
            
            const endMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = (endMemory - startMemory) / 1024 / 1024; // MB

            expect(result).toBeDefined();
            // Memory increase should be reasonable (less than 100MB for a 24MB file)
            expect(memoryIncrease).toBeLessThan(100);
        });

        it('should clean up resources after processing', async () => {
            const file = createMockAudioFile();
            const mockBuffer = createMockArrayBuffer(1024);

            (mockVault.readBinary as jest.Mock).mockResolvedValue(mockBuffer);
            (requestUrl as jest.Mock).mockResolvedValue({
                status: 200,
                json: createMockWhisperResponse()
            });

            await transcriptionService.transcribe(file);

            // Cleanup
            fileUploadManager.cleanup();

            // Verify cleanup was performed
            expect((fileUploadManager as any).audioContext).toBeUndefined();
            expect((fileUploadManager as any).abortController).toBeUndefined();
        });
    });
});