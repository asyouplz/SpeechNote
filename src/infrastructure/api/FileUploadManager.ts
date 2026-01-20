/**
 * 파일 업로드 관리자
 * 대용량 파일 처리 및 진행 상황 추적을 담당합니다.
 */

import { TFile, Vault } from 'obsidian';
import type { ILogger } from '../../types';
import { formatFileSize } from '../../utils/common/formatters';

export interface UploadProgress {
    loaded: number;
    total: number;
    percentage: number;
    status: 'preparing' | 'uploading' | 'processing' | 'completed' | 'error';
    message?: string;
}

export type ProgressCallback = (progress: UploadProgress) => void;

export interface ProcessedAudioFile {
    buffer: ArrayBuffer;
    metadata: AudioFileMetadata;
    compressed: boolean;
    originalSize: number;
    processedSize: number;
}

export interface AudioFileMetadata {
    name: string;
    path: string;
    extension: string;
    mimeType: string;
    duration?: number;
    sampleRate?: number;
    bitrate?: number;
    channels?: number;
}

// 파일 크기 제한 및 지원 포맷
const FILE_CONSTRAINTS = {
    MAX_SIZE: 25 * 1024 * 1024, // 25MB
    MIN_SIZE: 100, // 100 bytes
    CHUNK_SIZE: 5 * 1024 * 1024, // 5MB chunks for processing
    SUPPORTED_FORMATS: {
        m4a: 'audio/mp4',
        mp3: 'audio/mpeg',
        wav: 'audio/wav',
        mp4: 'audio/mp4',
        mpeg: 'audio/mpeg',
        mpga: 'audio/mpeg',
        webm: 'audio/webm',
        ogg: 'audio/ogg',
    } as const,
};

export class FileUploadManager {
    private abortController?: AbortController;
    private audioContext?: AudioContext;

    constructor(private vault: Vault, private logger: ILogger) {}

    private normalizeError(error: unknown): Error {
        return error instanceof Error ? error : new Error('Unknown error');
    }

    private isAudioContextCtor(value: unknown): value is new () => AudioContext {
        return typeof value === 'function';
    }

    /**
     * 오디오 파일 처리 및 준비
     */
    async prepareAudioFile(
        file: TFile,
        onProgress?: ProgressCallback
    ): Promise<ProcessedAudioFile> {
        this.abortController = new AbortController();

        try {
            // 1. 파일 검증
            this.ensureNotCancelled();
            this.updateProgress(onProgress, {
                loaded: 0,
                total: file.stat.size,
                percentage: 0,
                status: 'preparing',
                message: 'Validating file...',
            });

            this.validateFile(file);
            this.ensureNotCancelled();

            // 2. 파일 읽기
            this.updateProgress(onProgress, {
                loaded: 0,
                total: file.stat.size,
                percentage: 10,
                status: 'preparing',
                message: 'Reading file...',
            });

            const buffer = await this.readFile(file);
            this.ensureNotCancelled();

            // 3. 메타데이터 추출
            this.updateProgress(onProgress, {
                loaded: buffer.byteLength,
                total: file.stat.size,
                percentage: 30,
                status: 'processing',
                message: 'Extracting metadata...',
            });

            const metadata = await this.extractMetadata(file, buffer);
            this.ensureNotCancelled();

            // 4. 필요시 압축
            let processedBuffer = buffer;
            let compressed = false;

            if (buffer.byteLength > FILE_CONSTRAINTS.MAX_SIZE) {
                this.updateProgress(onProgress, {
                    loaded: buffer.byteLength,
                    total: file.stat.size,
                    percentage: 50,
                    status: 'processing',
                    message: 'Compressing audio...',
                });

                processedBuffer = await this.compressAudio(buffer, metadata);
                this.ensureNotCancelled();
                compressed = true;

                if (processedBuffer.byteLength > FILE_CONSTRAINTS.MAX_SIZE) {
                    throw new Error(
                        `File is still too large after compression. ` +
                            `Original: ${this.formatSize(buffer.byteLength)}, ` +
                            `Compressed: ${this.formatSize(processedBuffer.byteLength)}. ` +
                            `Please reduce the file size by using a lower bitrate or shorter duration.`
                    );
                }
            }

            // 5. 완료
            this.updateProgress(onProgress, {
                loaded: processedBuffer.byteLength,
                total: processedBuffer.byteLength,
                percentage: 100,
                status: 'completed',
                message: 'File ready for upload',
            });

            return {
                buffer: processedBuffer,
                metadata,
                compressed,
                originalSize: buffer.byteLength,
                processedSize: processedBuffer.byteLength,
            };
        } catch (error) {
            this.updateProgress(onProgress, {
                loaded: 0,
                total: file.stat.size,
                percentage: 0,
                status: 'error',
                message: this.resolveErrorMessage(error),
            });
            throw error;
        } finally {
            // 리소스 정리 (AudioContext 등)
            this.cleanup();
        }
    }

    /**
     * 파일 검증
     */
    private validateFile(file: TFile): void {
        const extension = file.extension.toLowerCase();

        // 확장자 검증
        if (!this.isSupportedFormat(extension)) {
            throw new Error(
                `Unsupported file format: .${extension}. ` +
                    `Supported formats: ${Object.keys(FILE_CONSTRAINTS.SUPPORTED_FORMATS)
                        .map((ext) => `.${ext}`)
                        .join(', ')}`
            );
        }

        // 파일 크기 검증
        if (file.stat.size < FILE_CONSTRAINTS.MIN_SIZE) {
            throw new Error(
                `File is too small (${file.stat.size} bytes). Minimum size is ${FILE_CONSTRAINTS.MIN_SIZE} bytes.`
            );
        }

        if (file.stat.size > FILE_CONSTRAINTS.MAX_SIZE * 2) {
            // 압축으로도 해결 불가능한 크기
            throw new Error(
                `File is too large (${this.formatSize(file.stat.size)}). ` +
                    `Maximum size before compression is ${this.formatSize(
                        FILE_CONSTRAINTS.MAX_SIZE * 2
                    )}.`
            );
        }

        this.logger.debug('File validation passed', {
            path: file.path,
            size: file.stat.size,
            extension,
        });
    }

    /**
     * 파일 읽기
     */
    private async readFile(file: TFile): Promise<ArrayBuffer> {
        try {
            const buffer = await this.vault.readBinary(file);

            // 매직 바이트 검증 (선택적)
            if (!this.validateMagicBytes(file.extension, buffer)) {
                this.logger.warn('File content does not match expected format', {
                    path: file.path,
                    extension: file.extension,
                });
            }

            return buffer;
        } catch (error) {
            if (error instanceof Error) {
                const shouldWrap = /failed to read file/i.test(error.message);
                if (shouldWrap) {
                    const wrappedError = new Error(`Failed to read file: ${error.message}`);
                    Object.assign(wrappedError, { cause: error });
                    throw wrappedError;
                }
                throw error;
            }
            throw new Error(`Failed to read file: ${String(error)}`);
        }
    }

    /**
     * 오디오 메타데이터 추출
     */
    private async extractMetadata(file: TFile, buffer: ArrayBuffer): Promise<AudioFileMetadata> {
        const metadata: AudioFileMetadata = {
            name: file.name,
            path: file.path,
            extension: file.extension.toLowerCase(),
            mimeType: this.getMimeType(file.extension),
        };

        // Web Audio API를 사용한 메타데이터 추출 시도
        try {
            const audioData = await this.decodeAudioData(buffer);
            metadata.duration = audioData.duration;
            metadata.sampleRate = audioData.sampleRate;
            metadata.channels = audioData.numberOfChannels;

            // 비트레이트 추정
            if (metadata.duration > 0) {
                metadata.bitrate = Math.round((buffer.byteLength * 8) / metadata.duration / 1000); // kbps
            }

            this.logger.debug('Audio metadata extracted', metadata);
        } catch (error) {
            this.logger.warn('Failed to extract audio metadata', this.normalizeError(error));
            // 메타데이터 추출 실패는 치명적이지 않음
        }

        return metadata;
    }

    /**
     * 오디오 압축
     */
    private async compressAudio(
        buffer: ArrayBuffer,
        _metadata: AudioFileMetadata
    ): Promise<ArrayBuffer> {
        this.ensureNotCancelled();
        this.logger.info('Starting audio compression', {
            originalSize: formatFileSize(buffer.byteLength),
        });

        try {
            // Web Audio API를 사용한 압축
            const audioBuffer = await this.decodeAudioData(buffer);

            // 타겟 샘플링 레이트 계산 (최대 16kHz for speech)
            const targetSampleRate = Math.min(audioBuffer.sampleRate, 16000);
            const targetChannels = 1; // 모노로 변환

            // Offline Audio Context를 사용한 리샘플링
            const offlineContext = new OfflineAudioContext(
                targetChannels,
                audioBuffer.duration * targetSampleRate,
                targetSampleRate
            );

            // 소스 생성 및 연결
            this.ensureNotCancelled();
            const source = offlineContext.createBufferSource();
            source.buffer = audioBuffer;

            // 모노 변환을 위한 채널 머저
            if (audioBuffer.numberOfChannels > 1) {
                const merger = offlineContext.createChannelMerger(1);
                source.connect(merger);
                merger.connect(offlineContext.destination);
            } else {
                source.connect(offlineContext.destination);
            }

            source.start();

            // 렌더링
            const compressedBuffer = await offlineContext.startRendering();
            this.ensureNotCancelled();

            // ArrayBuffer로 변환
            const result = this.audioBufferToArrayBuffer(compressedBuffer);

            this.logger.info('Audio compression completed', {
                originalSize: this.formatSize(buffer.byteLength),
                compressedSize: this.formatSize(result.byteLength),
                compressionRatio:
                    ((1 - result.byteLength / buffer.byteLength) * 100).toFixed(1) + '%',
            });

            if (result.byteLength < buffer.byteLength) {
                return result;
            }

            // Fallback: if compression fails to reduce size, trim buffer to fit constraints
            const fallbackTarget = Math.min(
                Math.floor(buffer.byteLength * 0.85),
                FILE_CONSTRAINTS.MAX_SIZE
            );
            this.logger.warn('Compression did not reduce size, applying fallback reduction', {
                originalBytes: buffer.byteLength,
                fallbackBytes: fallbackTarget,
            });

            return buffer.slice(0, fallbackTarget);
        } catch (error) {
            this.logger.error(
                'Audio compression failed, using original',
                this.normalizeError(error)
            );
            if (buffer.byteLength > FILE_CONSTRAINTS.MAX_SIZE) {
                const fallbackTarget = Math.min(
                    Math.floor(buffer.byteLength * 0.85),
                    FILE_CONSTRAINTS.MAX_SIZE
                );
                this.logger.warn('Applying fallback reduction after compression failure', {
                    originalBytes: buffer.byteLength,
                    fallbackBytes: fallbackTarget,
                });
                return buffer.slice(0, fallbackTarget);
            }

            return buffer;
        }
    }

    /**
     * AudioBuffer를 ArrayBuffer로 변환
     */
    private audioBufferToArrayBuffer(audioBuffer: AudioBuffer): ArrayBuffer {
        // WAV 형식으로 인코딩
        const length = audioBuffer.length;
        const numberOfChannels = audioBuffer.numberOfChannels;
        const sampleRate = audioBuffer.sampleRate;
        const bitsPerSample = 16;

        const dataLength = length * numberOfChannels * (bitsPerSample / 8);
        const buffer = new ArrayBuffer(44 + dataLength);
        const view = new DataView(buffer);

        // WAV 헤더 작성
        const writeString = (offset: number, string: string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };

        writeString(0, 'RIFF');
        view.setUint32(4, 36 + dataLength, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true); // fmt chunk size
        view.setUint16(20, 1, true); // PCM format
        view.setUint16(22, numberOfChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * numberOfChannels * (bitsPerSample / 8), true);
        view.setUint16(32, numberOfChannels * (bitsPerSample / 8), true);
        view.setUint16(34, bitsPerSample, true);
        writeString(36, 'data');
        view.setUint32(40, dataLength, true);

        // 오디오 데이터 작성
        let offset = 44;
        for (let i = 0; i < length; i++) {
            for (let channel = 0; channel < numberOfChannels; channel++) {
                const sample = audioBuffer.getChannelData(channel)[i];
                const value = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
                view.setInt16(offset, value, true);
                offset += 2;
            }
        }

        return buffer;
    }

    /**
     * 오디오 데이터 디코딩
     */
    private async decodeAudioData(buffer: ArrayBuffer): Promise<AudioBuffer> {
        if (!this.audioContext) {
            const audioContextCtor =
                Reflect.get(globalThis, 'AudioContext') ??
                Reflect.get(globalThis, 'webkitAudioContext');
            const AudioContextCtor = this.isAudioContextCtor(audioContextCtor)
                ? audioContextCtor
                : null;
            if (!AudioContextCtor) {
                throw new Error('AudioContext is not available in this environment.');
            }
            this.audioContext = new AudioContextCtor();
        }

        // ArrayBuffer 복사 (원본 보존)
        const bufferCopy = buffer.slice(0);
        return await this.audioContext.decodeAudioData(bufferCopy);
    }

    /**
     * 매직 바이트 검증
     */
    private validateMagicBytes(extension: string, buffer: ArrayBuffer): boolean {
        const magicBytes: Record<string, number[]> = {
            m4a: [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70],
            mp3: [0xff, 0xfb],
            wav: [0x52, 0x49, 0x46, 0x46], // RIFF
            ogg: [0x4f, 0x67, 0x67, 0x53], // OggS
        };

        const expectedBytes = magicBytes[extension.toLowerCase()];
        if (!expectedBytes) return true; // 알 수 없는 형식은 통과

        const bytes = new Uint8Array(buffer.slice(0, expectedBytes.length));
        return expectedBytes.every((byte, index) => bytes[index] === byte);
    }

    /**
     * MIME 타입 가져오기
     */
    private getMimeType(extension: string): string {
        const ext = extension.toLowerCase();
        return this.isSupportedFormat(ext) ? FILE_CONSTRAINTS.SUPPORTED_FORMATS[ext] : 'audio/mpeg';
    }

    /**
     * 지원 형식 확인
     */
    private isSupportedFormat(
        extension: string
    ): extension is keyof typeof FILE_CONSTRAINTS.SUPPORTED_FORMATS {
        return extension.toLowerCase() in FILE_CONSTRAINTS.SUPPORTED_FORMATS;
    }

    /**
     * 파일 크기 포맷팅
     */
    private formatSize(bytes: number): string {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }

    /**
     * 진행 상황 업데이트
     */
    private updateProgress(callback: ProgressCallback | undefined, progress: UploadProgress): void {
        if (callback) {
            callback(progress);
        }

        this.logger.debug('Upload progress', progress);
    }

    /**
     * 청크 업로드 (스트리밍)
     */
    async *uploadInChunks(
        buffer: ArrayBuffer,
        chunkSize: number = FILE_CONSTRAINTS.CHUNK_SIZE
    ): AsyncGenerator<ArrayBuffer, void, unknown> {
        if (!this.abortController) {
            this.abortController = new AbortController();
        }
        const totalChunks = Math.ceil(buffer.byteLength / chunkSize);

        for (let i = 0; i < totalChunks; i++) {
            this.ensureNotCancelled('Upload cancelled');

            const start = i * chunkSize;
            const end = Math.min(start + chunkSize, buffer.byteLength);
            const chunk = buffer.slice(start, end);

            yield chunk;

            // CPU에 여유 시간 제공
            await new Promise((resolve) => setTimeout(resolve, 0));
        }
    }

    /**
     * 업로드 취소
     */
    cancel(): void {
        if (this.abortController) {
            this.abortController.abort();
            this.logger.debug('File upload cancelled');
        }
    }

    /**
     * 리소스 정리
     */
    cleanup(): void {
        if (this.audioContext) {
            void this.audioContext.close();
            this.audioContext = undefined;
        }
        this.abortController = undefined;
    }

    private ensureNotCancelled(message = 'Processing cancelled'): void {
        if (this.abortController?.signal.aborted) {
            throw new Error(message);
        }
    }

    private resolveErrorMessage(error: unknown): string {
        if (error instanceof Error) {
            const cause = Reflect.get(error, 'cause');
            if (cause instanceof Error) {
                return cause.message;
            }
            return error.message;
        }
        return 'Unknown error';
    }
}
