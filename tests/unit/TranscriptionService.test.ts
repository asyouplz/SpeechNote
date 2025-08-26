/**
 * TranscriptionService 단위 테스트
 */

import { TranscriptionService } from '../../src/core/transcription/TranscriptionService';
import type {
    IWhisperService,
    IAudioProcessor,
    ITextFormatter,
    IEventManager,
    ILogger,
    TranscriptionStatus
} from '../../src/types';
import {
    createMockAudioFile,
    createMockArrayBuffer,
    createMockWhisperResponse,
    createMockValidationResult,
    createMockProcessedAudio,
    createMockTranscriptionResult,
    createMockError
} from '../helpers/mockDataFactory';
import '../helpers/testSetup';

describe('TranscriptionService', () => {
    let transcriptionService: TranscriptionService;
    let mockWhisperService: jest.Mocked<IWhisperService>;
    let mockAudioProcessor: jest.Mocked<IAudioProcessor>;
    let mockTextFormatter: jest.Mocked<ITextFormatter>;
    let mockEventManager: jest.Mocked<IEventManager>;
    let mockLogger: jest.Mocked<ILogger>;

    beforeEach(() => {
        // Create mocks
        mockWhisperService = {
            transcribe: jest.fn(),
            cancel: jest.fn(),
            validateApiKey: jest.fn()
        } as jest.Mocked<IWhisperService>;

        mockAudioProcessor = {
            validate: jest.fn(),
            process: jest.fn(),
            extractMetadata: jest.fn()
        } as jest.Mocked<IAudioProcessor>;

        mockTextFormatter = {
            format: jest.fn(),
            insertTimestamps: jest.fn(),
            cleanUp: jest.fn()
        } as jest.Mocked<ITextFormatter>;

        mockEventManager = {
            emit: jest.fn(),
            on: jest.fn(),
            off: jest.fn(),
            once: jest.fn()
        } as jest.Mocked<IEventManager>;

        mockLogger = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        };

        transcriptionService = new TranscriptionService(
            mockWhisperService,
            mockAudioProcessor,
            mockTextFormatter,
            mockEventManager,
            mockLogger
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('transcribe', () => {
        it('should complete full transcription workflow successfully', async () => {
            const file = createMockAudioFile();
            const mockValidation = createMockValidationResult({ valid: true });
            const mockProcessedAudio = createMockProcessedAudio();
            const mockWhisperResponse = createMockWhisperResponse();
            const formattedText = '포맷된 텍스트입니다.';

            mockAudioProcessor.validate.mockResolvedValue(mockValidation);
            mockAudioProcessor.process.mockResolvedValue(mockProcessedAudio);
            mockWhisperService.transcribe.mockResolvedValue(mockWhisperResponse);
            mockTextFormatter.format.mockReturnValue(formattedText);

            const result = await transcriptionService.transcribe(file);

            // Verify result
            expect(result.text).toBe(formattedText);
            expect(result.language).toBe(mockWhisperResponse.language);

            // Verify workflow order
            expect(mockAudioProcessor.validate).toHaveBeenCalledWith(file);
            expect(mockAudioProcessor.process).toHaveBeenCalledWith(file);
            expect(mockWhisperService.transcribe).toHaveBeenCalledWith(mockProcessedAudio.buffer);
            expect(mockTextFormatter.format).toHaveBeenCalledWith(mockWhisperResponse.text);

            // Verify events
            expect(mockEventManager.emit).toHaveBeenCalledWith('transcription:start', { fileName: file.name });
            expect(mockEventManager.emit).toHaveBeenCalledWith('transcription:complete', expect.objectContaining({ result }));
        });

        it('should handle validation failure', async () => {
            const file = createMockAudioFile();
            const validationErrors = ['File too large', 'Unsupported format'];
            const mockValidation = createMockValidationResult({ 
                valid: false, 
                errors: validationErrors 
            });

            mockAudioProcessor.validate.mockResolvedValue(mockValidation);

            await expect(transcriptionService.transcribe(file)).rejects.toThrow(
                'File validation failed: File too large, Unsupported format'
            );

            expect(mockAudioProcessor.process).not.toHaveBeenCalled();
            expect(mockWhisperService.transcribe).not.toHaveBeenCalled();
            expect(mockEventManager.emit).toHaveBeenCalledWith('transcription:error', expect.any(Object));
        });

        it('should handle audio processing failure', async () => {
            const file = createMockAudioFile();
            const error = new Error('Failed to read audio file');

            mockAudioProcessor.validate.mockResolvedValue(createMockValidationResult({ valid: true }));
            mockAudioProcessor.process.mockRejectedValue(error);

            await expect(transcriptionService.transcribe(file)).rejects.toThrow(error);

            expect(mockWhisperService.transcribe).not.toHaveBeenCalled();
            expect(mockEventManager.emit).toHaveBeenCalledWith('transcription:error', { error });
        });

        it('should handle WhisperService failure', async () => {
            const file = createMockAudioFile();
            const error = new Error('API request failed');

            mockAudioProcessor.validate.mockResolvedValue(createMockValidationResult({ valid: true }));
            mockAudioProcessor.process.mockResolvedValue(createMockProcessedAudio());
            mockWhisperService.transcribe.mockRejectedValue(error);

            await expect(transcriptionService.transcribe(file)).rejects.toThrow(error);

            expect(mockTextFormatter.format).not.toHaveBeenCalled();
            expect(mockEventManager.emit).toHaveBeenCalledWith('transcription:error', { error });
        });

        it('should handle text formatting failure', async () => {
            const file = createMockAudioFile();
            const error = new Error('Formatting failed');

            mockAudioProcessor.validate.mockResolvedValue(createMockValidationResult({ valid: true }));
            mockAudioProcessor.process.mockResolvedValue(createMockProcessedAudio());
            mockWhisperService.transcribe.mockResolvedValue(createMockWhisperResponse());
            mockTextFormatter.format.mockImplementation(() => { throw error; });

            await expect(transcriptionService.transcribe(file)).rejects.toThrow(error);

            expect(mockEventManager.emit).toHaveBeenCalledWith('transcription:error', { error });
        });

        it('should include segments when available', async () => {
            const file = createMockAudioFile();
            const segments = [
                { start: 0, end: 5, text: '첫 번째 세그먼트' },
                { start: 5, end: 10, text: '두 번째 세그먼트' }
            ];
            const mockWhisperResponse = createMockWhisperResponse({ segments });

            mockAudioProcessor.validate.mockResolvedValue(createMockValidationResult({ valid: true }));
            mockAudioProcessor.process.mockResolvedValue(createMockProcessedAudio());
            mockWhisperService.transcribe.mockResolvedValue(mockWhisperResponse);
            mockTextFormatter.format.mockReturnValue('포맷된 텍스트');

            const result = await transcriptionService.transcribe(file);

            expect(result.segments).toBeDefined();
            expect(result.segments).toHaveLength(2);
            expect(result.segments![0]).toEqual({
                id: 0,
                start: 0,
                end: 5,
                text: '첫 번째 세그먼트'
            });
        });

        it('should handle response without segments', async () => {
            const file = createMockAudioFile();
            const mockWhisperResponse = createMockWhisperResponse({ segments: undefined });

            mockAudioProcessor.validate.mockResolvedValue(createMockValidationResult({ valid: true }));
            mockAudioProcessor.process.mockResolvedValue(createMockProcessedAudio());
            mockWhisperService.transcribe.mockResolvedValue(mockWhisperResponse);
            mockTextFormatter.format.mockReturnValue('포맷된 텍스트');

            const result = await transcriptionService.transcribe(file);

            expect(result.segments).toBeUndefined();
        });
    });

    describe('cancel', () => {
        it('should cancel transcription and emit event', () => {
            transcriptionService.cancel();

            expect(mockEventManager.emit).toHaveBeenCalledWith('transcription:cancelled', {});
            expect(transcriptionService.getStatus()).toBe('cancelled');
        });

        it('should abort controller if exists', () => {
            // Create abort controller by accessing private property through reflection
            const abortController = new AbortController();
            (transcriptionService as any).abortController = abortController;
            const abortSpy = jest.spyOn(abortController, 'abort');

            transcriptionService.cancel();

            expect(abortSpy).toHaveBeenCalled();
            expect(transcriptionService.getStatus()).toBe('cancelled');
        });

        it('should handle multiple cancel calls gracefully', () => {
            transcriptionService.cancel();
            transcriptionService.cancel();
            transcriptionService.cancel();

            expect(mockEventManager.emit).toHaveBeenCalledTimes(3);
            expect(transcriptionService.getStatus()).toBe('cancelled');
        });
    });

    describe('getStatus', () => {
        it('should return initial status as idle', () => {
            expect(transcriptionService.getStatus()).toBe('idle');
        });

        it('should track status changes during transcription', async () => {
            const file = createMockAudioFile();
            const statusChanges: TranscriptionStatus[] = [];

            // Setup successful mocks
            mockAudioProcessor.validate.mockImplementation(async () => {
                statusChanges.push(transcriptionService.getStatus());
                return createMockValidationResult({ valid: true });
            });

            mockAudioProcessor.process.mockImplementation(async () => {
                statusChanges.push(transcriptionService.getStatus());
                return createMockProcessedAudio();
            });

            mockWhisperService.transcribe.mockImplementation(async () => {
                statusChanges.push(transcriptionService.getStatus());
                return createMockWhisperResponse();
            });

            mockTextFormatter.format.mockImplementation(() => {
                statusChanges.push(transcriptionService.getStatus());
                return '포맷된 텍스트';
            });

            await transcriptionService.transcribe(file);

            // Check that status changed appropriately
            expect(statusChanges).toContain('validating');
            expect(statusChanges).toContain('processing');
            expect(statusChanges).toContain('transcribing');
            expect(statusChanges).toContain('formatting');
            expect(transcriptionService.getStatus()).toBe('completed');
        });

        it('should set status to error on failure', async () => {
            const file = createMockAudioFile();
            mockAudioProcessor.validate.mockRejectedValue(new Error('Validation error'));

            try {
                await transcriptionService.transcribe(file);
            } catch {
                // Expected to throw
            }

            expect(transcriptionService.getStatus()).toBe('error');
        });
    });

    describe('event emissions', () => {
        it('should emit start event with file name', async () => {
            const file = createMockAudioFile({ name: 'test-audio.mp3' });
            
            mockAudioProcessor.validate.mockResolvedValue(createMockValidationResult({ valid: true }));
            mockAudioProcessor.process.mockResolvedValue(createMockProcessedAudio());
            mockWhisperService.transcribe.mockResolvedValue(createMockWhisperResponse());
            mockTextFormatter.format.mockReturnValue('텍스트');

            await transcriptionService.transcribe(file);

            expect(mockEventManager.emit).toHaveBeenCalledWith(
                'transcription:start',
                { fileName: 'test-audio.mp3' }
            );
        });

        it('should emit complete event with result', async () => {
            const file = createMockAudioFile();
            
            mockAudioProcessor.validate.mockResolvedValue(createMockValidationResult({ valid: true }));
            mockAudioProcessor.process.mockResolvedValue(createMockProcessedAudio());
            mockWhisperService.transcribe.mockResolvedValue(createMockWhisperResponse());
            mockTextFormatter.format.mockReturnValue('완료된 텍스트');

            const result = await transcriptionService.transcribe(file);

            expect(mockEventManager.emit).toHaveBeenCalledWith(
                'transcription:complete',
                { result }
            );
        });

        it('should emit error event on any failure', async () => {
            const file = createMockAudioFile();
            const error = new Error('Test error');
            
            mockAudioProcessor.validate.mockRejectedValue(error);

            await expect(transcriptionService.transcribe(file)).rejects.toThrow(error);

            expect(mockEventManager.emit).toHaveBeenCalledWith(
                'transcription:error',
                { error }
            );
        });
    });

    describe('edge cases', () => {
        it('should handle empty validation errors array', async () => {
            const file = createMockAudioFile();
            const mockValidation = createMockValidationResult({ 
                valid: false, 
                errors: [] 
            });

            mockAudioProcessor.validate.mockResolvedValue(mockValidation);

            await expect(transcriptionService.transcribe(file)).rejects.toThrow(
                'File validation failed: '
            );
        });

        it('should handle undefined validation errors', async () => {
            const file = createMockAudioFile();
            const mockValidation = createMockValidationResult({ 
                valid: false, 
                errors: undefined 
            });

            mockAudioProcessor.validate.mockResolvedValue(mockValidation);

            await expect(transcriptionService.transcribe(file)).rejects.toThrow(
                'File validation failed: '
            );
        });

        it('should handle empty WhisperService response text', async () => {
            const file = createMockAudioFile();
            const mockWhisperResponse = createMockWhisperResponse({ text: '' });

            mockAudioProcessor.validate.mockResolvedValue(createMockValidationResult({ valid: true }));
            mockAudioProcessor.process.mockResolvedValue(createMockProcessedAudio());
            mockWhisperService.transcribe.mockResolvedValue(mockWhisperResponse);
            mockTextFormatter.format.mockReturnValue('');

            const result = await transcriptionService.transcribe(file);

            expect(result.text).toBe('');
        });

        it('should handle very long text', async () => {
            const file = createMockAudioFile();
            const longText = '긴 텍스트 '.repeat(10000);
            const mockWhisperResponse = createMockWhisperResponse({ text: longText });

            mockAudioProcessor.validate.mockResolvedValue(createMockValidationResult({ valid: true }));
            mockAudioProcessor.process.mockResolvedValue(createMockProcessedAudio());
            mockWhisperService.transcribe.mockResolvedValue(mockWhisperResponse);
            mockTextFormatter.format.mockReturnValue(longText);

            const result = await transcriptionService.transcribe(file);

            expect(result.text).toBe(longText);
            expect(result.text.length).toBeGreaterThan(50000);
        });
    });

    describe('concurrent operations', () => {
        it('should handle multiple transcriptions sequentially', async () => {
            const files = [
                createMockAudioFile({ name: 'file1.mp3' }),
                createMockAudioFile({ name: 'file2.mp3' }),
                createMockAudioFile({ name: 'file3.mp3' })
            ];

            mockAudioProcessor.validate.mockResolvedValue(createMockValidationResult({ valid: true }));
            mockAudioProcessor.process.mockResolvedValue(createMockProcessedAudio());
            mockWhisperService.transcribe.mockResolvedValue(createMockWhisperResponse());
            mockTextFormatter.format.mockReturnValue('텍스트');

            const results = await Promise.all(
                files.map(file => transcriptionService.transcribe(file))
            );

            expect(results).toHaveLength(3);
            expect(mockAudioProcessor.validate).toHaveBeenCalledTimes(3);
            expect(mockWhisperService.transcribe).toHaveBeenCalledTimes(3);
        });
    });
});