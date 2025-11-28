import type { ILogger } from '../../../../types';
import {
    TranscriptionOptions,
    TranscriptionResponse,
    ProviderCapabilities,
    ProviderConfig,
    DeepgramSpecificOptions
} from '../ITranscriber';
import { BaseTranscriptionAdapter } from '../common/BaseAdapter';
import { DeepgramServiceRefactored } from './DeepgramServiceRefactored';

// Provider-specific constants
const DEEPGRAM_CONSTANTS = {
    PROVIDER_NAME: 'Deepgram',
    DEFAULT_MODEL: 'nova-3',
    MAX_FILE_SIZE: 2 * 1024 * 1024 * 1024, // 2GB
    DEFAULT_TIMEOUT: 30000,
    DEFAULT_CONCURRENCY: 5,
    DEFAULT_RATE_LIMIT: 100
} as const;

// Supported languages (comprehensive list)
const DEEPGRAM_LANGUAGES = [
    'en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'ru', 'zh', 'ja',
    'ko', 'ar', 'tr', 'hi', 'pl', 'sv', 'da', 'no', 'fi', 'el',
    'he', 'id', 'ms', 'th', 'vi', 'ta', 'te', 'uk', 'cs', 'ro',
    'hu', 'bg', 'ca', 'hr', 'sr', 'sl', 'sk', 'lt', 'lv', 'et'
] as const;

// Supported audio formats
const DEEPGRAM_AUDIO_FORMATS = [
    'mp3', 'mp4', 'wav', 'flac', 'ogg', 'opus',
    'm4a', 'webm', 'amr', 'ac3', 'aac', 'wma'
] as const;

// Available features
const DEEPGRAM_FEATURES = [
    'transcription', 'punctuation', 'smart_formatting', 'diarization',
    'numerals', 'profanity_filter', 'redaction', 'keywords',
    'language_detection', 'streaming', 'real_time', 'multi_channel'
] as const;

// Model tiers with pricing
const DEEPGRAM_MODELS = {
    'nova-3': { tier: 'nova-3', costPerMinute: 0.0043 },
    'nova-2': { tier: 'nova-2', costPerMinute: 0.0043 },
    'nova': { tier: 'nova-2', costPerMinute: 0.0043 },
    'enhanced': { tier: 'enhanced', costPerMinute: 0.0145 },
    'base': { tier: 'base', costPerMinute: 0.0125 }
} as const;

/**
 * Refactored Deepgram Adapter
 * Clean implementation extending base adapter with provider-specific logic
 */
export class DeepgramAdapterRefactored extends BaseTranscriptionAdapter {
    private deepgramService: DeepgramServiceRefactored;

    constructor(
        apiKey: string,
        logger: ILogger,
        config?: Partial<ProviderConfig>
    ) {
        super(DEEPGRAM_CONSTANTS.PROVIDER_NAME, logger, config);

        this.deepgramService = new DeepgramServiceRefactored({
            apiKey: config?.apiKey ?? apiKey,
            logger,
            requestsPerMinute: config?.rateLimit?.requests ?? DEEPGRAM_CONSTANTS.DEFAULT_RATE_LIMIT,
            timeout: config?.timeout ?? DEEPGRAM_CONSTANTS.DEFAULT_TIMEOUT
        });
    }

    /**
     * Get default configuration
     */
    protected getDefaultConfig(): ProviderConfig {
        return {
            enabled: true,
            apiKey: '',
            model: DEEPGRAM_CONSTANTS.DEFAULT_MODEL,
            maxConcurrency: DEEPGRAM_CONSTANTS.DEFAULT_CONCURRENCY,
            timeout: DEEPGRAM_CONSTANTS.DEFAULT_TIMEOUT,
            rateLimit: {
                requests: DEEPGRAM_CONSTANTS.DEFAULT_RATE_LIMIT,
                window: 60000
            }
        };
    }

    /**
     * Main transcription method
     */
    async transcribe(
        audio: ArrayBuffer,
        options?: TranscriptionOptions
    ): Promise<TranscriptionResponse> {
        this.validateAudio(audio);
        this.startTiming();

        try {
            // Convert options to Deepgram-specific format
            const deepgramOptions = this.convertToDeepgramOptions(options);
            const language = this.extractLanguage(options);

            // Call Deepgram service
            const response = await this.deepgramService.transcribe(
                audio,
                deepgramOptions,
                language
            );

            // Parse and return response
            const result = this.deepgramService.parseResponse(response);

            // Enhance with processing time
            if (result.metadata) {
                result.metadata.processingTime = this.getElapsedTime();
            }

            this.logInfo(`Transcription completed in ${this.getElapsedTime()}ms`);
            return result;

        } catch (error) {
            this.logError('Transcription failed', error as Error);
            throw error;
        }
    }

    /**
     * Validate API key
     */
    async validateApiKey(key: string): Promise<boolean> {
        try {
            return await this.deepgramService.validateApiKey(key);
        } catch (error) {
            this.logError('API key validation failed', error as Error);
            return false;
        }
    }

    /**
     * Cancel ongoing transcription
     */
    cancel(): void {
        this.deepgramService.cancel();
    }

    /**
     * Get provider capabilities
     */
    getCapabilities(): ProviderCapabilities {
        return {
            streaming: true,
            realtime: true,
            languages: [...DEEPGRAM_LANGUAGES],
            maxFileSize: DEEPGRAM_CONSTANTS.MAX_FILE_SIZE,
            audioFormats: [...DEEPGRAM_AUDIO_FORMATS],
            features: [...DEEPGRAM_FEATURES],
            models: Object.keys(DEEPGRAM_MODELS)
        };
    }

    /**
     * Check provider availability
     */
    async isAvailable(): Promise<boolean> {
        try {
            const stats = this.deepgramService.getStats();

            // Check if circuit breaker is open
            if (stats.circuitBreaker.state === 'OPEN') {
                return false;
            }

            // Check rate limit availability
            if (!stats.rateLimiter.availableTokens) {
                return false;
            }

            // Perform test transcription
            const testAudio = new ArrayBuffer(1024);
            await this.deepgramService.transcribe(testAudio);

            return true;
        } catch (error) {
            const message = (error as Error).message.toLowerCase();

            // Temporary issues mean service is unavailable
            const temporaryIssues = ['circuit', 'unavailable', 'timeout', 'rate limit'];
            return !temporaryIssues.some(issue => message.includes(issue));
        }
    }

    /**
     * React to configuration updates
     */
    protected onConfigUpdate(config: Partial<ProviderConfig>): void {
        if (config.apiKey) {
            // Recreate service with new API key
            this.deepgramService = new DeepgramServiceRefactored({
                apiKey: config.apiKey,
                logger: this.logger,
                requestsPerMinute: this.config.rateLimit?.requests ?? DEEPGRAM_CONSTANTS.DEFAULT_RATE_LIMIT,
                timeout: this.config.timeout ?? DEEPGRAM_CONSTANTS.DEFAULT_TIMEOUT
            });
        }
    }

    /**
     * Reset circuit breaker
     */
    resetCircuitBreaker(): void {
        this.deepgramService.resetCircuitBreaker();
    }

    /**
     * Estimate transcription cost
     */
    estimateCost(durationSeconds: number, model?: string): number {
        const modelKey = (model ?? this.config.model ?? DEEPGRAM_CONSTANTS.DEFAULT_MODEL) as keyof typeof DEEPGRAM_MODELS;
        const modelConfig = DEEPGRAM_MODELS[modelKey] ?? DEEPGRAM_MODELS['nova-2'];
        const minutes = durationSeconds / 60;

        return minutes * modelConfig.costPerMinute;
    }

    /**
     * Get service statistics
     */
    getStatistics() {
        return this.deepgramService.getStats();
    }

    /**
     * Convert generic options to Deepgram-specific format
     */
    private convertToDeepgramOptions(options?: TranscriptionOptions): DeepgramSpecificOptions {
        const deepgramOptions: DeepgramSpecificOptions = {
            tier: this.mapModelToTier(options?.model),
            punctuate: true,
            smartFormat: true
        };

        // Apply Deepgram-specific options if provided
        if (options?.deepgram) {
            return {
                ...deepgramOptions,
                ...options.deepgram
            };
        }

        return deepgramOptions;
    }

    /**
     * Map generic model name to Deepgram tier
     */
    private mapModelToTier(model?: string): 'nova-3' | 'nova-2' | 'enhanced' | 'base' {
        if (!model) {
            return DEEPGRAM_CONSTANTS.DEFAULT_MODEL;
        }

        const modelKey = model as keyof typeof DEEPGRAM_MODELS;
        return DEEPGRAM_MODELS[modelKey]?.tier ?? DEEPGRAM_CONSTANTS.DEFAULT_MODEL;
    }

    /**
     * Extract language from options
     */
    private extractLanguage(options?: TranscriptionOptions): string | undefined {
        if (options?.language) {
            return options.language;
        }

        if (options?.deepgram?.detectLanguage) {
            return 'auto';
        }

        return undefined;
    }
}
export { DeepgramAdapterRefactored as DeepgramAdapter };
