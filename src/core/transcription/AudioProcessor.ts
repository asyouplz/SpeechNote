import { TFile, Vault } from 'obsidian';
import type {
    IAudioProcessor,
    ValidationResult,
    ProcessedAudio,
    AudioMetadata,
    ILogger,
} from '../../types';
import type { ProviderCapabilities } from '../../infrastructure/api/providers/ITranscriber';

export class AudioProcessor implements IAudioProcessor {
    private readonly DEFAULT_MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB (default/fallback)
    private readonly SUPPORTED_FORMATS = ['.m4a', '.mp3', '.wav', '.mp4'];
    private providerCapabilities: ProviderCapabilities | null = null;

    constructor(private vault: Vault, private logger: ILogger) {}

    /**
     * Set provider-specific capabilities including file size limits
     */
    setProviderCapabilities(capabilities: ProviderCapabilities): void {
        this.providerCapabilities = capabilities;
        this.logger.debug('Provider capabilities updated', {
            provider: capabilities.maxFileSize,
            maxFileSize: this.formatSize(capabilities.maxFileSize),
            supportedFormats: capabilities.audioFormats
        });
    }

    /**
     * Get the maximum file size based on provider capabilities
     */
    private getMaxFileSize(): number {
        return this.providerCapabilities?.maxFileSize || this.DEFAULT_MAX_FILE_SIZE;
    }

    /**
     * Format file size in human-readable format
     */
    private formatSize(bytes: number): string {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${Math.round(size * 10) / 10}${units[unitIndex]}`;
    }

    async validate(file: TFile): Promise<ValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Check file extension
        const extension = `.${file.extension.toLowerCase()}`;
        if (!this.SUPPORTED_FORMATS.includes(extension)) {
            errors.push(
                `Unsupported format: ${extension}. Supported formats: ${this.SUPPORTED_FORMATS.join(
                    ', '
                )}`
            );
        }

        // Check file size
        const maxFileSize = this.getMaxFileSize();
        if (file.stat.size > maxFileSize) {
            const fileSizeMB = Math.round(file.stat.size / 1024 / 1024);
            const maxSizeMB = Math.round(maxFileSize / 1024 / 1024);
            errors.push(
                `File size (${fileSizeMB}MB) exceeds maximum allowed size (${maxSizeMB}MB)`
            );
        }

        // Add warning for large files
        if (file.stat.size > 10 * 1024 * 1024) {
            warnings.push('Large file may take longer to process');
        }

        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined,
            warnings: warnings.length > 0 ? warnings : undefined,
        };
    }

    async process(file: TFile): Promise<ProcessedAudio> {
        this.logger.debug('Processing audio file', {
            fileName: file.name,
            extension: file.extension,
            sizeBytes: file.stat.size
        });

        const arrayBuffer = await this.vault.readBinary(file);
        const metadata = await this.extractMetadata(arrayBuffer, file); // 파일 정보 전달

        this.logger.debug('Audio processing completed', {
            bufferSize: arrayBuffer.byteLength,
            detectedFormat: metadata.format
        });

        return {
            buffer: arrayBuffer,
            metadata,
            originalFile: file,
            compressed: false,
        };
    }

    async extractMetadata(buffer: ArrayBuffer, file?: TFile): Promise<AudioMetadata> {
        // Extract format from file extension
        let format: string | undefined;
        if (file) {
            const extension = file.extension.toLowerCase();
            format = extension;
            this.logger.debug('Audio format detected from file extension', {
                fileName: file.name,
                extension,
                format
            });
        }

        // Basic file size analysis
        const fileSizeKB = Math.round(buffer.byteLength / 1024);
        this.logger.debug('Audio file analysis', {
            sizeKB: fileSizeKB,
            sizeBytes: buffer.byteLength,
            format
        });

        return {
            duration: undefined, // Would need audio parsing library
            bitrate: undefined,
            sampleRate: undefined,
            channels: undefined,
            codec: undefined,
            format, // 🔥 핵심: 파일 형식 정보 추가
            fileSize: buffer.byteLength
        };
    }
}