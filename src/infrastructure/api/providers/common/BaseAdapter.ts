import type { ILogger } from '../../../../types';
import {
    ITranscriber,
    TranscriptionProvider,
    TranscriptionOptions,
    TranscriptionResponse,
    TranscriptionSegment,
    ProviderCapabilities,
    ProviderConfig,
} from '../ITranscriber';

/**
 * Base adapter class for transcription providers
 * Implements common functionality to reduce code duplication
 */
export abstract class BaseTranscriptionAdapter implements ITranscriber {
    protected config: ProviderConfig;
    protected startTime?: number;

    constructor(
        protected readonly providerName: string,
        protected readonly logger: ILogger,
        config?: Partial<ProviderConfig>
    ) {
        this.config = this.getDefaultConfig();
        if (config) {
            this.updateConfig(config);
        }
    }

    /**
     * Get default configuration for the provider
     */
    protected abstract getDefaultConfig(): ProviderConfig;

    /**
     * Main transcription method to be implemented by subclasses
     */
    abstract transcribe(
        audio: ArrayBuffer,
        options?: TranscriptionOptions
    ): Promise<TranscriptionResponse>;

    /**
     * Validate API key implementation
     */
    abstract validateApiKey(key: string): Promise<boolean>;

    /**
     * Cancel ongoing transcription
     */
    abstract cancel(): void;

    /**
     * Get provider capabilities
     */
    abstract getCapabilities(): ProviderCapabilities;

    /**
     * Check provider availability
     */
    abstract isAvailable(): Promise<boolean>;

    /**
     * Get provider display name
     */
    getProviderName(): string {
        return this.providerName;
    }

    /**
     * Get current configuration
     */
    getConfig(): ProviderConfig {
        return { ...this.config };
    }

    /**
     * Update configuration
     */
    updateConfig(config: Partial<ProviderConfig>): void {
        this.config = {
            ...this.config,
            ...config,
        };
        this.onConfigUpdate(config);
    }

    /**
     * Hook for subclasses to react to config changes
     */
    protected onConfigUpdate(_config: Partial<ProviderConfig>): void {
        // Override in subclasses if needed
    }

    /**
     * Start timing a transcription
     */
    protected startTiming(): void {
        this.startTime = Date.now();
    }

    /**
     * Get elapsed time since timing started
     */
    protected getElapsedTime(): number {
        if (!this.startTime) {
            return 0;
        }
        return Date.now() - this.startTime;
    }

    private isTranscriptionSegment(value: unknown): value is TranscriptionSegment {
        if (!value || typeof value !== 'object') {
            return false;
        }

        const id = Reflect.get(value, 'id');
        const start = Reflect.get(value, 'start');
        const end = Reflect.get(value, 'end');
        const text = Reflect.get(value, 'text');

        return (
            typeof id === 'number' &&
            typeof start === 'number' &&
            typeof end === 'number' &&
            typeof text === 'string'
        );
    }

    /**
     * Create a standardized transcription response
     */
    protected createResponse(
        text: string,
        provider: TranscriptionProvider,
        options?: {
            language?: string;
            confidence?: number;
            duration?: number;
            segments?: unknown[];
            model?: string;
            wordCount?: number;
        }
    ): TranscriptionResponse {
        const wordCount = options?.wordCount ?? this.countWords(text);
        const processingTime = this.getElapsedTime();

        const segmentCandidates = options?.segments;
        const segments =
            Array.isArray(segmentCandidates) &&
            segmentCandidates.every((segment) => this.isTranscriptionSegment(segment))
                ? segmentCandidates
                : undefined;

        return {
            text,
            provider,
            language: options?.language,
            confidence: options?.confidence,
            duration: options?.duration,
            segments,
            metadata: {
                model: options?.model ?? this.config.model,
                processingTime,
                wordCount,
            },
        };
    }

    /**
     * Count words in text
     */
    protected countWords(text: string): number {
        return text.split(/\s+/).filter((word) => word.length > 0).length;
    }

    /**
     * Log debug information
     */
    protected logDebug(message: string, data?: unknown): void {
        this.logger.debug(`${this.providerName}: ${message}`, data);
    }

    /**
     * Log info information
     */
    protected logInfo(message: string, data?: unknown): void {
        this.logger.info(`${this.providerName}: ${message}`, data);
    }

    /**
     * Log warning
     */
    protected logWarning(message: string, error?: Error, data?: unknown): void {
        if (error) {
            this.logger.warn(`${this.providerName}: ${message}`, { error, data });
        } else {
            this.logger.warn(`${this.providerName}: ${message}`, data);
        }
    }

    /**
     * Log error
     */
    protected logError(message: string, error: Error, data?: unknown): void {
        this.logger.error(`${this.providerName}: ${message}`, error, data);
    }

    /**
     * Validate audio buffer
     */
    protected validateAudio(audio: ArrayBuffer): void {
        if (!audio || audio.byteLength === 0) {
            throw new Error('Invalid audio buffer: empty or null');
        }

        const capabilities = this.getCapabilities();
        if (audio.byteLength > capabilities.maxFileSize) {
            throw new Error(
                `Audio file too large: ${audio.byteLength} bytes exceeds maximum of ${capabilities.maxFileSize} bytes`
            );
        }
    }

    /**
     * Check if provider is enabled
     */
    protected isEnabled(): boolean {
        return this.config.enabled;
    }

    /**
     * Check if API key is configured
     */
    protected hasApiKey(): boolean {
        return !!this.config.apiKey && this.config.apiKey.length > 0;
    }
}
