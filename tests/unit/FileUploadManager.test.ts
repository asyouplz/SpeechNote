/**
 * FileUploadManager 단위 테스트
 */

import { FileUploadManager, UploadProgress, ProcessedAudioFile } from '../../src/infrastructure/api/FileUploadManager';
import { Vault } from 'obsidian';
import type { ILogger } from '../../src/types';
import {
    createMockAudioFile,
    createMockArrayBuffer,
    createMockVault,
    createMockWAVBuffer
} from '../helpers/mockDataFactory';
import '../helpers/testSetup';

describe('FileUploadManager', () => {
    let fileUploadManager: FileUploadManager;
    let mockVault: Partial<Vault>;
    let mockLogger: jest.Mocked<ILogger>;

    beforeEach(() => {
        mockVault = createMockVault();
        mockLogger = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        };

        fileUploadManager = new FileUploadManager(mockVault as Vault, mockLogger);
    });

    afterEach(() => {
        jest.clearAllMocks();
        fileUploadManager.cleanup();
    });

    describe('prepareAudioFile', () => {
        it('should prepare valid audio file successfully', async () => {
            const file = createMockAudioFile({
                name: 'test.mp3',
                extension: 'mp3',
                size: 5 * 1024 * 1024 // 5MB
            });
            const mockBuffer = createMockArrayBuffer(5 * 1024 * 1024);
            
            (mockVault.readBinary as jest.Mock).mockResolvedValue(mockBuffer);

            const progressUpdates: UploadProgress[] = [];
            const result = await fileUploadManager.prepareAudioFile(file, (progress) => {
                progressUpdates.push(progress);
            });

            expect(result.buffer).toBe(mockBuffer);
            expect(result.metadata.name).toBe('test.mp3');
            expect(result.metadata.extension).toBe('mp3');
            expect(result.metadata.mimeType).toBe('audio/mpeg');
            expect(result.compressed).toBe(false);
            expect(result.originalSize).toBe(mockBuffer.byteLength);
            expect(result.processedSize).toBe(mockBuffer.byteLength);

            // Check progress updates
            expect(progressUpdates.length).toBeGreaterThan(0);
            expect(progressUpdates[progressUpdates.length - 1].status).toBe('completed');
            expect(progressUpdates[progressUpdates.length - 1].percentage).toBe(100);
        });

        it('should reject unsupported file formats', async () => {
            const file = createMockAudioFile({
                name: 'test.txt',
                extension: 'txt'
            });

            await expect(fileUploadManager.prepareAudioFile(file)).rejects.toThrow(
                'Unsupported file format: .txt'
            );
        });

        it('should reject files that are too small', async () => {
            const file = createMockAudioFile({
                size: 50 // Too small
            });

            await expect(fileUploadManager.prepareAudioFile(file)).rejects.toThrow(
                'File is too small'
            );
        });

        it('should reject files that are too large', async () => {
            const file = createMockAudioFile({
                size: 60 * 1024 * 1024 // 60MB - too large even for compression
            });

            await expect(fileUploadManager.prepareAudioFile(file)).rejects.toThrow(
                'File is too large'
            );
        });

        it('should compress large files', async () => {
            const file = createMockAudioFile({
                size: 30 * 1024 * 1024 // 30MB - needs compression
            });
            const mockBuffer = createMockWAVBuffer(44100, 700); // Large WAV file
            
            (mockVault.readBinary as jest.Mock).mockResolvedValue(mockBuffer);

            // Mock AudioContext for compression
            const mockAudioBuffer = {
                duration: 700,
                sampleRate: 44100,
                numberOfChannels: 2,
                length: 44100 * 700,
                getChannelData: jest.fn().mockReturnValue(new Float32Array(44100 * 700))
            };
            
            (global.AudioContext as jest.Mock).mockImplementation(() => ({
                decodeAudioData: jest.fn().mockResolvedValue(mockAudioBuffer),
                close: jest.fn()
            }));

            const progressUpdates: UploadProgress[] = [];
            const result = await fileUploadManager.prepareAudioFile(file, (progress) => {
                progressUpdates.push(progress);
            });

            expect(result.compressed).toBe(true);
            expect(mockLogger.info).toHaveBeenCalledWith(
                'Starting audio compression',
                expect.any(Object)
            );

            // Check that compression progress was reported
            const compressionProgress = progressUpdates.find(p => 
                p.message?.includes('Compressing audio')
            );
            expect(compressionProgress).toBeDefined();
        });

        it('should handle file read errors', async () => {
            const file = createMockAudioFile();
            const error = new Error('Failed to read file');
            
            (mockVault.readBinary as jest.Mock).mockRejectedValue(error);

            await expect(fileUploadManager.prepareAudioFile(file)).rejects.toThrow(
                'Failed to read file: Failed to read file'
            );
        });

        it('should extract metadata from audio buffer', async () => {
            const file = createMockAudioFile();
            const mockBuffer = createMockWAVBuffer(44100, 10);
            
            (mockVault.readBinary as jest.Mock).mockResolvedValue(mockBuffer);

            const mockAudioBuffer = {
                duration: 10,
                sampleRate: 44100,
                numberOfChannels: 2,
                length: 441000
            };
            
            (global.AudioContext as jest.Mock).mockImplementation(() => ({
                decodeAudioData: jest.fn().mockResolvedValue(mockAudioBuffer),
                close: jest.fn()
            }));

            const result = await fileUploadManager.prepareAudioFile(file);

            expect(result.metadata.duration).toBe(10);
            expect(result.metadata.sampleRate).toBe(44100);
            expect(result.metadata.channels).toBe(2);
            expect(result.metadata.bitrate).toBeDefined();
        });

        it('should handle metadata extraction failure gracefully', async () => {
            const file = createMockAudioFile();
            const mockBuffer = createMockArrayBuffer(1024);
            
            (mockVault.readBinary as jest.Mock).mockResolvedValue(mockBuffer);
            
            (global.AudioContext as jest.Mock).mockImplementation(() => ({
                decodeAudioData: jest.fn().mockRejectedValue(new Error('Decode failed')),
                close: jest.fn()
            }));

            const result = await fileUploadManager.prepareAudioFile(file);

            // Should still succeed even if metadata extraction fails
            expect(result).toBeDefined();
            expect(result.metadata.duration).toBeUndefined();
            expect(mockLogger.warn).toHaveBeenCalledWith(
                'Failed to extract audio metadata',
                expect.any(Error)
            );
        });

        it('should validate magic bytes for known formats', async () => {
            const file = createMockAudioFile({
                extension: 'wav'
            });
            const mockBuffer = createMockWAVBuffer();
            
            (mockVault.readBinary as jest.Mock).mockResolvedValue(mockBuffer);

            await fileUploadManager.prepareAudioFile(file);

            // Should not warn about invalid magic bytes for valid WAV
            expect(mockLogger.warn).not.toHaveBeenCalledWith(
                expect.stringContaining('File content does not match'),
                expect.any(Object)
            );
        });

        it('should warn about invalid magic bytes', async () => {
            const file = createMockAudioFile({
                extension: 'wav'
            });
            const mockBuffer = createMockArrayBuffer(1024); // Not a real WAV
            
            (mockVault.readBinary as jest.Mock).mockResolvedValue(mockBuffer);

            await fileUploadManager.prepareAudioFile(file);

            expect(mockLogger.warn).toHaveBeenCalledWith(
                'File content does not match expected format',
                expect.objectContaining({
                    extension: 'wav'
                })
            );
        });
    });

    describe('uploadInChunks', () => {
        it('should split buffer into chunks', async () => {
            const buffer = createMockArrayBuffer(10 * 1024 * 1024); // 10MB
            const chunkSize = 2 * 1024 * 1024; // 2MB chunks

            const chunks: ArrayBuffer[] = [];
            for await (const chunk of fileUploadManager.uploadInChunks(buffer, chunkSize)) {
                chunks.push(chunk);
            }

            expect(chunks.length).toBe(5); // 10MB / 2MB = 5 chunks
            expect(chunks[0].byteLength).toBe(chunkSize);
            expect(chunks[4].byteLength).toBe(chunkSize);
        });

        it('should handle non-divisible buffer sizes', async () => {
            const buffer = createMockArrayBuffer(5.5 * 1024 * 1024); // 5.5MB
            const chunkSize = 2 * 1024 * 1024; // 2MB chunks

            const chunks: ArrayBuffer[] = [];
            for await (const chunk of fileUploadManager.uploadInChunks(buffer, chunkSize)) {
                chunks.push(chunk);
            }

            expect(chunks.length).toBe(3); // 3 chunks
            expect(chunks[0].byteLength).toBe(chunkSize);
            expect(chunks[1].byteLength).toBe(chunkSize);
            expect(chunks[2].byteLength).toBe(1.5 * 1024 * 1024); // Remaining 1.5MB
        });

        it('should handle cancellation during chunking', async () => {
            const buffer = createMockArrayBuffer(10 * 1024 * 1024);
            const chunkSize = 1 * 1024 * 1024;

            // Start iteration
            const iterator = fileUploadManager.uploadInChunks(buffer, chunkSize);
            
            // Get first chunk
            await iterator.next();
            
            // Cancel
            fileUploadManager.cancel();

            // Next chunk should throw
            await expect(iterator.next()).rejects.toThrow('Upload cancelled');
        });
    });

    describe('cancel', () => {
        it('should cancel ongoing operations', () => {
            // Set up abort controller
            (fileUploadManager as any).abortController = new AbortController();

            fileUploadManager.cancel();

            expect(mockLogger.debug).toHaveBeenCalledWith('File upload cancelled');
        });

        it('should handle cancel when no operation is active', () => {
            fileUploadManager.cancel();

            // Should not throw or log
            expect(mockLogger.debug).not.toHaveBeenCalled();
        });
    });

    describe('cleanup', () => {
        it('should close audio context if exists', () => {
            const mockClose = jest.fn();
            (fileUploadManager as any).audioContext = {
                close: mockClose
            };

            fileUploadManager.cleanup();

            expect(mockClose).toHaveBeenCalled();
            expect((fileUploadManager as any).audioContext).toBeUndefined();
        });

        it('should clear abort controller', () => {
            (fileUploadManager as any).abortController = new AbortController();

            fileUploadManager.cleanup();

            expect((fileUploadManager as any).abortController).toBeUndefined();
        });
    });

    describe('supported formats', () => {
        const supportedFormats = ['m4a', 'mp3', 'wav', 'mp4', 'mpeg', 'mpga', 'webm', 'ogg'];

        supportedFormats.forEach(format => {
            it(`should support ${format} format`, async () => {
                const file = createMockAudioFile({
                    name: `test.${format}`,
                    extension: format,
                    size: 1024 * 1024
                });
                const mockBuffer = createMockArrayBuffer(1024 * 1024);
                
                (mockVault.readBinary as jest.Mock).mockResolvedValue(mockBuffer);

                const result = await fileUploadManager.prepareAudioFile(file);

                expect(result).toBeDefined();
                expect(result.metadata.extension).toBe(format);
            });
        });
    });

    describe('edge cases', () => {
        it('should handle exactly 25MB file', async () => {
            const file = createMockAudioFile({
                size: 25 * 1024 * 1024 // Exactly 25MB
            });
            const mockBuffer = createMockArrayBuffer(25 * 1024 * 1024);
            
            (mockVault.readBinary as jest.Mock).mockResolvedValue(mockBuffer);

            const result = await fileUploadManager.prepareAudioFile(file);

            expect(result.compressed).toBe(false); // Should not compress if exactly at limit
        });

        it('should compress file just over 25MB', async () => {
            const file = createMockAudioFile({
                size: 25 * 1024 * 1024 + 1 // 25MB + 1 byte
            });
            const mockBuffer = createMockArrayBuffer(25 * 1024 * 1024 + 1);
            
            (mockVault.readBinary as jest.Mock).mockResolvedValue(mockBuffer);

            const progressUpdates: UploadProgress[] = [];
            const result = await fileUploadManager.prepareAudioFile(file, (progress) => {
                progressUpdates.push(progress);
            });

            expect(result.compressed).toBe(true);
        });

        it('should handle empty progress callback', async () => {
            const file = createMockAudioFile();
            const mockBuffer = createMockArrayBuffer(1024);
            
            (mockVault.readBinary as jest.Mock).mockResolvedValue(mockBuffer);

            // No progress callback provided
            const result = await fileUploadManager.prepareAudioFile(file);

            expect(result).toBeDefined();
        });

        it('should report error in progress', async () => {
            const file = createMockAudioFile();
            const error = new Error('Test error');
            
            (mockVault.readBinary as jest.Mock).mockRejectedValue(error);

            const progressUpdates: UploadProgress[] = [];
            
            await expect(
                fileUploadManager.prepareAudioFile(file, (progress) => {
                    progressUpdates.push(progress);
                })
            ).rejects.toThrow(error);

            // Check that error was reported in progress
            const errorProgress = progressUpdates.find(p => p.status === 'error');
            expect(errorProgress).toBeDefined();
            expect(errorProgress?.message).toBe('Test error');
        });
    });

    describe('performance', () => {
        it('should process large files efficiently', async () => {
            const file = createMockAudioFile({
                size: 20 * 1024 * 1024 // 20MB
            });
            const mockBuffer = createMockArrayBuffer(20 * 1024 * 1024);
            
            (mockVault.readBinary as jest.Mock).mockResolvedValue(mockBuffer);

            const startTime = Date.now();
            await fileUploadManager.prepareAudioFile(file);
            const endTime = Date.now();

            // Should process within reasonable time (less than 1 second for 20MB)
            expect(endTime - startTime).toBeLessThan(1000);
        });

        it('should chunk large buffers efficiently', async () => {
            const buffer = createMockArrayBuffer(50 * 1024 * 1024); // 50MB
            const chunkSize = 5 * 1024 * 1024; // 5MB chunks

            const startTime = Date.now();
            const chunks: ArrayBuffer[] = [];
            
            for await (const chunk of fileUploadManager.uploadInChunks(buffer, chunkSize)) {
                chunks.push(chunk);
            }
            
            const endTime = Date.now();

            expect(chunks.length).toBe(10);
            expect(endTime - startTime).toBeLessThan(100); // Should be very fast
        });
    });
});