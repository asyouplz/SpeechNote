import type { ILogger } from '../../../../types';
import { DEEPGRAM_API } from './constants';

/**
 * Audio chunking utility for handling large files
 * Splits large audio files into smaller chunks for reliable processing
 */
export class AudioChunker {
    private readonly CHUNK_SIZE = DEEPGRAM_API.RECOMMENDED_MAX_SIZE; // 50MB default
    private readonly WAV_HEADER_SIZE = 44;

    constructor(private logger: ILogger) {}

    /**
     * Check if audio needs chunking based on size
     */
    needsChunking(audioSize: number): boolean {
        return audioSize > this.CHUNK_SIZE;
    }

    /**
     * Split audio buffer into smaller chunks
     * Currently supports WAV format for precise splitting
     */
    splitAudio(audio: ArrayBuffer): Promise<ArrayBuffer[]> {
        const audioSize = audio.byteLength;

        // If small enough, return as single chunk
        if (!this.needsChunking(audioSize)) {
            return Promise.resolve([audio]);
        }

        this.logger.info('Splitting large audio file into chunks', {
            originalSizeMB: Math.round(audioSize / (1024 * 1024)),
            chunkSizeMB: Math.round(this.CHUNK_SIZE / (1024 * 1024)),
            estimatedChunks: Math.ceil(audioSize / this.CHUNK_SIZE),
        });

        // For WAV files, we can split more intelligently
        if (this.isWavFile(audio)) {
            return Promise.resolve(this.splitWavAudio(audio));
        }

        // For other formats, simple byte splitting (may not work perfectly)
        return Promise.resolve(this.splitByteArray(audio));
    }

    /**
     * Check if audio is WAV format
     */
    private isWavFile(audio: ArrayBuffer): boolean {
        if (audio.byteLength < 12) return false;
        const view = new Uint8Array(audio, 0, 4);
        return view[0] === 0x52 && view[1] === 0x49 && view[2] === 0x46 && view[3] === 0x46;
    }

    /**
     * Split WAV file preserving header
     */
    private splitWavAudio(audio: ArrayBuffer): ArrayBuffer[] {
        const chunks: ArrayBuffer[] = [];
        const header = audio.slice(0, this.WAV_HEADER_SIZE);
        const data = audio.slice(this.WAV_HEADER_SIZE);

        const dataSize = data.byteLength;
        const chunkDataSize = this.CHUNK_SIZE - this.WAV_HEADER_SIZE;
        const numChunks = Math.ceil(dataSize / chunkDataSize);

        for (let i = 0; i < numChunks; i++) {
            const start = i * chunkDataSize;
            const end = Math.min(start + chunkDataSize, dataSize);
            const chunkData = data.slice(start, end);

            // Create new WAV with header and chunk data
            const chunk = new ArrayBuffer(this.WAV_HEADER_SIZE + chunkData.byteLength);
            const chunkView = new Uint8Array(chunk);

            // Copy header
            chunkView.set(new Uint8Array(header), 0);

            // Copy data
            chunkView.set(new Uint8Array(chunkData), this.WAV_HEADER_SIZE);

            // Update header with new data size
            this.updateWavHeader(chunk, chunkData.byteLength);

            chunks.push(chunk);

            this.logger.debug(`Created chunk ${i + 1}/${numChunks}`, {
                sizeMB: Math.round(chunk.byteLength / (1024 * 1024)),
            });
        }

        return chunks;
    }

    /**
     * Update WAV header with new data size
     */
    private updateWavHeader(buffer: ArrayBuffer, dataSize: number): void {
        const view = new DataView(buffer);

        // Update file size (offset 4)
        view.setUint32(4, dataSize + 36, true);

        // Update data chunk size (offset 40)
        view.setUint32(40, dataSize, true);
    }

    /**
     * Simple byte array splitting for non-WAV formats
     * Note: This may not work perfectly for all formats
     */
    private splitByteArray(audio: ArrayBuffer): ArrayBuffer[] {
        const chunks: ArrayBuffer[] = [];
        const audioSize = audio.byteLength;
        const numChunks = Math.ceil(audioSize / this.CHUNK_SIZE);

        this.logger.warn('Using simple byte splitting for non-WAV format. Results may vary.');

        for (let i = 0; i < numChunks; i++) {
            const start = i * this.CHUNK_SIZE;
            const end = Math.min(start + this.CHUNK_SIZE, audioSize);
            chunks.push(audio.slice(start, end));

            this.logger.debug(`Created chunk ${i + 1}/${numChunks}`, {
                sizeMB: Math.round((end - start) / (1024 * 1024)),
            });
        }

        return chunks;
    }

    /**
     * Merge transcription results from multiple chunks
     */
    mergeTranscriptionResults(results: string[]): string {
        // Simple concatenation with space
        // Could be improved with smarter merging logic
        return results.filter((r) => r && r.trim()).join(' ');
    }

    /**
     * Get recommended settings for large files
     */
    getRecommendedSettings(fileSize: number): {
        needsChunking: boolean;
        recommendedModel: string;
        recommendedBitrate?: string;
        estimatedChunks?: number;
    } {
        const sizeMB = fileSize / (1024 * 1024);

        if (sizeMB <= 50) {
            return {
                needsChunking: false,
                recommendedModel: 'nova-2',
            };
        } else if (sizeMB <= 100) {
            return {
                needsChunking: true,
                recommendedModel: 'enhanced', // Faster model
                recommendedBitrate: '128 kbps',
                estimatedChunks: Math.ceil(fileSize / this.CHUNK_SIZE),
            };
        } else {
            return {
                needsChunking: true,
                recommendedModel: 'enhanced',
                recommendedBitrate: '64 kbps', // Lower bitrate for very large files
                estimatedChunks: Math.ceil(fileSize / this.CHUNK_SIZE),
            };
        }
    }
}
