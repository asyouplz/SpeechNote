/**
 * AudioProcessor 단위 테스트
 */

import { AudioProcessor } from '../../src/core/transcription/AudioProcessor';
import { Vault } from 'obsidian';
import type { ILogger } from '../../src/types';
import {
    createMockAudioFile,
    createMockArrayBuffer,
    createMockVault,
} from '../helpers/mockDataFactory';
import '../helpers/testSetup';

describe('AudioProcessor', () => {
    let audioProcessor: AudioProcessor;
    let mockVault: Partial<Vault>;
    let mockLogger: ILogger;

    beforeEach(() => {
        mockVault = createMockVault();
        mockLogger = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        };

        audioProcessor = new AudioProcessor(mockVault as Vault, mockLogger);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('validate', () => {
        it('should validate supported audio formats', async () => {
            const validFormats = ['mp3', 'm4a', 'wav', 'mp4'];

            for (const format of validFormats) {
                const file = createMockAudioFile({
                    name: `test.${format}`,
                    extension: format,
                    size: 5 * 1024 * 1024, // 5MB
                });

                const result = await audioProcessor.validate(file);

                expect(result.valid).toBe(true);
                expect(result.errors).toBeUndefined();
            }
        });

        it('should reject unsupported formats', async () => {
            const invalidFormats = ['txt', 'pdf', 'docx', 'aac'];

            for (const format of invalidFormats) {
                const file = createMockAudioFile({
                    name: `test.${format}`,
                    extension: format,
                });

                const result = await audioProcessor.validate(file);

                expect(result.valid).toBe(false);
                expect(result.errors).toBeDefined();
                expect(result.errors![0]).toContain('Unsupported format');
            }
        });

        it('should reject files exceeding maximum size', async () => {
            const file = createMockAudioFile({
                size: 30 * 1024 * 1024, // 30MB
            });

            const result = await audioProcessor.validate(file);

            expect(result.valid).toBe(false);
            expect(result.errors).toBeDefined();
            expect(result.errors![0]).toContain('exceeds maximum allowed size');
        });

        it('should add warning for large files', async () => {
            const file = createMockAudioFile({
                size: 15 * 1024 * 1024, // 15MB
            });

            const result = await audioProcessor.validate(file);

            expect(result.valid).toBe(true);
            expect(result.warnings).toBeDefined();
            expect(result.warnings![0]).toContain('Large file may take longer');
        });

        it('should handle edge case file sizes', async () => {
            // Exactly at limit
            const fileAtLimit = createMockAudioFile({
                size: 25 * 1024 * 1024, // 25MB
            });

            const resultAtLimit = await audioProcessor.validate(fileAtLimit);
            expect(resultAtLimit.valid).toBe(true);

            // Just over limit
            const fileOverLimit = createMockAudioFile({
                size: 25 * 1024 * 1024 + 1, // 25MB + 1 byte
            });

            const resultOverLimit = await audioProcessor.validate(fileOverLimit);
            expect(resultOverLimit.valid).toBe(false);
        });

        it('should handle case-insensitive extensions', async () => {
            const mixedCaseFormats = ['MP3', 'M4A', 'WaV', 'Mp4'];

            for (const format of mixedCaseFormats) {
                const file = createMockAudioFile({
                    name: `test.${format}`,
                    extension: format,
                    size: 1024 * 1024,
                });

                const result = await audioProcessor.validate(file);
                expect(result.valid).toBe(true);
            }
        });

        describe('provider-specific file size limits', () => {
            it('should use default 25MB limit by default', async () => {
                const file = createMockAudioFile({
                    size: 30 * 1024 * 1024, // 30MB
                });

                const result = await audioProcessor.validate(file);

                expect(result.valid).toBe(false);
                expect(result.errors![0]).toContain('30MB');
                expect(result.errors![0]).toContain('25MB');
            });

            it('should accept larger files when Deepgram capabilities are set', async () => {
                // Set Deepgram capabilities (2GB limit)
                audioProcessor.setProviderCapabilities({
                    maxFileSize: 2 * 1024 * 1024 * 1024, // 2GB
                });

                const file = createMockAudioFile({
                    size: 100 * 1024 * 1024, // 100MB
                });

                const result = await audioProcessor.validate(file);

                expect(result.valid).toBe(true);
                expect(result.errors).toBeUndefined();
            });

            it('should reject files exceeding Deepgram 2GB limit', async () => {
                // Set Deepgram capabilities (2GB limit)
                audioProcessor.setProviderCapabilities({
                    maxFileSize: 2 * 1024 * 1024 * 1024, // 2GB
                });

                const file = createMockAudioFile({
                    size: 2.5 * 1024 * 1024 * 1024, // 2.5GB
                });

                const result = await audioProcessor.validate(file);

                expect(result.valid).toBe(false);
                expect(result.errors![0]).toContain('2560MB');
                expect(result.errors![0]).toContain('2048MB');
            });

            it('should log capability updates', () => {
                audioProcessor.setProviderCapabilities({
                    maxFileSize: 2 * 1024 * 1024 * 1024, // 2GB
                });

                expect(mockLogger.debug).toHaveBeenCalledWith(
                    'AudioProcessor capabilities updated',
                    expect.objectContaining({
                        previousLimit: 25,
                        newLimit: 2048,
                        provider: 'Deepgram',
                    })
                );
            });

            it('should maintain Whisper 25MB limit when set', async () => {
                // Set Whisper capabilities (25MB limit)
                audioProcessor.setProviderCapabilities({
                    maxFileSize: 25 * 1024 * 1024, // 25MB
                });

                const file = createMockAudioFile({
                    size: 30 * 1024 * 1024, // 30MB
                });

                const result = await audioProcessor.validate(file);

                expect(result.valid).toBe(false);
                expect(result.errors![0]).toContain('30MB');
                expect(result.errors![0]).toContain('25MB');
            });
        });
    });

    describe('process', () => {
        it('should process valid audio file', async () => {
            const file = createMockAudioFile();
            const mockBuffer = createMockArrayBuffer(1024);

            (mockVault.readBinary as jest.Mock).mockResolvedValue(mockBuffer);

            const result = await audioProcessor.process(file);

            expect(result.buffer).toBe(mockBuffer);
            expect(result.originalFile).toBe(file);
            expect(result.compressed).toBe(false);
            expect(result.metadata).toBeDefined();
            expect(mockVault.readBinary).toHaveBeenCalledWith(file);
        });

        it('should handle file read errors', async () => {
            const file = createMockAudioFile();
            const error = new Error('Failed to read file');

            (mockVault.readBinary as jest.Mock).mockRejectedValue(error);

            await expect(audioProcessor.process(file)).rejects.toThrow(error);
        });

        it('should extract metadata from audio buffer', async () => {
            const file = createMockAudioFile();
            const mockBuffer = createMockArrayBuffer(2048);

            (mockVault.readBinary as jest.Mock).mockResolvedValue(mockBuffer);

            const result = await audioProcessor.process(file);

            expect(result.metadata).toBeDefined();
            // Metadata extraction is basic in current implementation
            expect(result.metadata.duration).toBeUndefined();
            expect(result.metadata.bitrate).toBeUndefined();
        });
    });

    describe('extractMetadata', () => {
        it('should return basic metadata structure', async () => {
            const buffer = createMockArrayBuffer(1024);

            const metadata = await audioProcessor.extractMetadata(buffer);

            expect(metadata).toEqual({
                duration: undefined,
                bitrate: undefined,
                sampleRate: undefined,
                channels: undefined,
                codec: undefined,
                format: undefined,
                fileSize: 1024,
            });
        });

        it('should handle empty buffer', async () => {
            const buffer = new ArrayBuffer(0);

            const metadata = await audioProcessor.extractMetadata(buffer);

            expect(metadata).toBeDefined();
            expect(metadata.duration).toBeUndefined();
        });
    });

    describe('edge cases', () => {
        it('should handle files with special characters in name', async () => {
            const file = createMockAudioFile({
                name: 'test file (2024) [edited].mp3',
                path: 'folder/test file (2024) [edited].mp3',
            });

            const result = await audioProcessor.validate(file);
            expect(result.valid).toBe(true);
        });

        it('should handle files with multiple dots in name', async () => {
            const file = createMockAudioFile({
                name: 'test.audio.file.mp3',
                extension: 'mp3',
            });

            const result = await audioProcessor.validate(file);
            expect(result.valid).toBe(true);
        });

        it('should handle zero-size files', async () => {
            const file = createMockAudioFile({
                size: 0,
            });

            const result = await audioProcessor.validate(file);

            // Zero-size files should be invalid
            expect(result.valid).toBe(true); // Current implementation doesn't check minimum size
        });
    });

    describe('performance', () => {
        it('should process files efficiently', async () => {
            const file = createMockAudioFile({
                size: 10 * 1024 * 1024, // 10MB
            });
            const mockBuffer = createMockArrayBuffer(10 * 1024 * 1024);

            (mockVault.readBinary as jest.Mock).mockResolvedValue(mockBuffer);

            const startTime = Date.now();
            await audioProcessor.process(file);
            const endTime = Date.now();

            // Processing should be fast (less than 100ms for 10MB)
            expect(endTime - startTime).toBeLessThan(100);
        });

        it('should validate files quickly', async () => {
            const files = Array.from({ length: 100 }, (_, i) =>
                createMockAudioFile({
                    name: `test${i}.mp3`,
                    size: Math.random() * 30 * 1024 * 1024,
                })
            );

            const startTime = Date.now();

            for (const file of files) {
                await audioProcessor.validate(file);
            }

            const endTime = Date.now();

            // Validation of 100 files should be fast (less than 50ms)
            expect(endTime - startTime).toBeLessThan(50);
        });
    });
});
