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
        const arrayBuffer = await this.vault.readBinary(file);
        const metadata = await this.extractMetadata(arrayBuffer);

        return {
            buffer: arrayBuffer,
            metadata,
            originalFile: file,
            compressed: false,
        };
    }

    async extractMetadata(buffer: ArrayBuffer): Promise<AudioMetadata> {
        // Basic metadata extraction (can be enhanced with audio analysis libraries)
        return {
            duration: undefined, // Would need audio parsing library
            bitrate: undefined,
            sampleRate: undefined,
            channels: undefined,
            codec: undefined,
        };
    }
}