import { TFile, Vault } from 'obsidian';
import type {
    IAudioProcessor,
    ValidationResult,
    ProcessedAudio,
    AudioMetadata,
    ILogger,
} from '../../types';

export class AudioProcessor implements IAudioProcessor {
    private readonly MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
    private readonly SUPPORTED_FORMATS = ['.m4a', '.mp3', '.wav', '.mp4'];

    constructor(private vault: Vault, private logger: ILogger) {}

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
        if (file.stat.size > this.MAX_FILE_SIZE) {
            errors.push(
                `File size (${Math.round(
                    file.stat.size / 1024 / 1024
                )}MB) exceeds maximum allowed size (25MB)`
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