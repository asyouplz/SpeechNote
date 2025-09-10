import { requestUrl, RequestUrlParam } from 'obsidian';
import type { ILogger } from '../../../../types';
import {
    DeepgramSpecificOptions,
    TranscriptionResponse,
    TranscriptionSegment,
    ProviderAuthenticationError,
    ProviderRateLimitError,
    ProviderUnavailableError,
    TranscriptionError
} from '../ITranscriber';
import { CircuitBreaker } from '../common/CircuitBreaker';
import { RateLimiter } from '../common/RateLimiter';
import { RetryHandler, RetryStrategy } from '../common/RetryStrategy';

// Constants
const DEEPGRAM_CONFIG = {
    API_ENDPOINT: 'https://api.deepgram.com/v1/listen',
    MAX_FILE_SIZE: 2 * 1024 * 1024 * 1024, // 2GB
    DEFAULT_TIMEOUT: 120000, // 2 minutes base; overall cap handled by outer service
    DEFAULT_MODEL: 'nova-2',
    WORDS_PER_SEGMENT: 10
} as const;

// Type definitions
interface DeepgramAPIResponse {
    metadata: {
        transaction_key: string;
        request_id: string;
        sha256: string;
        created: string;
        duration: number;
        channels: number;
        models: string[];
        model_info: Record<string, {
            name: string;
            version: string;
            tier: string;
        }>;
    };
    results: {
        channels: Array<{
            alternatives: Array<{
                transcript: string;
                confidence: number;
                words?: Array<{
                    word: string;
                    start: number;
                    end: number;
                    confidence: number;
                    speaker?: number;
                }>;
            }>;
            detected_language?: string;
        }>;
    };
}

interface DeepgramServiceConfig {
    apiKey: string;
    logger: ILogger;
    requestsPerMinute?: number;
    timeout?: number;
    circuitBreakerConfig?: {
        failureThreshold?: number;
        successThreshold?: number;
        timeout?: number;
    };
    retryConfig?: {
        maxRetries?: number;
        baseDelayMs?: number;
        maxDelayMs?: number;
    };
}

/**
 * Refactored Deepgram API Service
 * Clean architecture with separated concerns and improved testability
 */
export class DeepgramServiceRefactored {
    private readonly circuitBreaker: CircuitBreaker;
    private readonly retryHandler: RetryHandler;
    private readonly rateLimiter: RateLimiter;
    private readonly timeout: number;
    private abortController?: AbortController;

    constructor(private readonly config: DeepgramServiceConfig) {
        this.timeout = config.timeout ?? DEEPGRAM_CONFIG.DEFAULT_TIMEOUT;

        // Initialize resilience components
        this.circuitBreaker = new CircuitBreaker(
            'Deepgram',
            config.logger,
            config.circuitBreakerConfig
        );

        this.retryHandler = new RetryHandler(
            'Deepgram',
            config.logger,
            RetryStrategy.EXPONENTIAL,
            {
                ...config.retryConfig,
                retryCondition: this.isRetryableError
            }
        );

        this.rateLimiter = new RateLimiter(
            'Deepgram',
            config.logger,
            {
                requestsPerWindow: config.requestsPerMinute ?? 100,
                windowMs: 60000,
                queueEnabled: true,
                maxQueueSize: 20
            }
        );
    }

    /**
     * Main transcription method with all resilience patterns applied
     */
    async transcribe(
        audio: ArrayBuffer,
        options?: DeepgramSpecificOptions,
        language?: string
    ): Promise<DeepgramAPIResponse> {
        // Validate input
        this.validateInput(audio);

        // Apply rate limiting
        await this.rateLimiter.acquire();

        // Execute with circuit breaker and retry logic
        return this.circuitBreaker.execute(() =>
            this.retryHandler.execute(
                () => this.performTranscription(audio, options, language),
                'transcription'
            )
        );
    }

    /**
     * Validate API key
     */
    async validateApiKey(apiKey: string): Promise<boolean> {
        const testAudio = new ArrayBuffer(1024);
        const originalKey = this.config.apiKey;
        
        try {
            this.config.apiKey = apiKey;
            await this.performTranscription(testAudio);
            return true;
        } catch (error) {
            return !(error instanceof ProviderAuthenticationError);
        } finally {
            this.config.apiKey = originalKey;
        }
    }

    /**
     * Parse API response to unified format
     */
    parseResponse(response: DeepgramAPIResponse): TranscriptionResponse {
        const channel = response.results.channels[0];
        const alternative = channel?.alternatives[0];

        if (!alternative) {
            throw new Error('Invalid Deepgram response: missing transcription data');
        }

        return {
            text: alternative.transcript,
            language: channel.detected_language,
            confidence: alternative.confidence,
            duration: response.metadata.duration,
            segments: this.createSegments(alternative.words),
            provider: 'deepgram',
            metadata: {
                model: response.metadata.models[0],
                processingTime: response.metadata.duration,
                wordCount: this.countWords(alternative.transcript)
            }
        };
    }

    /**
     * Cancel ongoing transcription
     */
    cancel(): void {
        if (this.abortController) {
            this.abortController.abort();
            this.config.logger.debug('Deepgram transcription cancelled');
        }
    }

    /**
     * Reset circuit breaker
     */
    resetCircuitBreaker(): void {
        this.circuitBreaker.reset();
    }

    /**
     * Get service statistics
     */
    getStats() {
        return {
            circuitBreaker: this.circuitBreaker.getStats(),
            rateLimiter: this.rateLimiter.getStats()
        };
    }

    /**
     * Perform the actual API call
     */
    private async performTranscription(
        audio: ArrayBuffer,
        options?: DeepgramSpecificOptions,
        language?: string
    ): Promise<DeepgramAPIResponse> {
        this.abortController = new AbortController();
        const startTime = Date.now();

        try {
            const request = this.buildRequest(audio, options, language);
            const response = await requestUrl(request);

            this.logRequestMetrics(startTime, audio.byteLength, response.status);

            if (response.status === 200) {
                return response.json as DeepgramAPIResponse;
            }

            throw await this.handleApiError(response);
        } catch (error) {
            if ((error as Error).name === 'AbortError') {
                throw new TranscriptionError(
                    'Transcription cancelled',
                    'CANCELLED',
                    'deepgram',
                    false
                );
            }
            throw error;
        } finally {
            this.abortController = undefined;
        }
    }

    /**
     * Build API request
     */
    private buildRequest(
        audio: ArrayBuffer,
        options?: DeepgramSpecificOptions,
        language?: string
    ): RequestUrlParam {
        return {
            url: this.buildUrl(options, language),
            method: 'POST',
            headers: this.buildHeaders(),
            body: audio,
            throw: false,
        };
    }

    /**
     * Build API URL with query parameters
     */
    private buildUrl(options?: DeepgramSpecificOptions, language?: string): string {
        const params = new URLSearchParams();
        const userTier = (options?.tier || '').toString().toLowerCase();
        const isNovaFamily = userTier.includes('nova');

        // Required parameters
        if (isNovaFamily || (language && language.startsWith('ko'))) {
            params.append('model', '2-general');
            params.append('tier', 'nova');
        } else {
            const model = options?.tier ?? DEEPGRAM_CONFIG.DEFAULT_MODEL;
            params.append('model', model);
        }

        // Language configuration
        if (language && language !== 'auto') {
            params.append('language', language);
        } else if (options?.detectLanguage) {
            params.append('detect_language', 'true');
        }

        // Feature flags
        this.appendFeatureFlags(params, options);

        return `${DEEPGRAM_CONFIG.API_ENDPOINT}?${params.toString()}`;
    }

    /**
     * Append feature flags to URL parameters
     */
    private appendFeatureFlags(params: URLSearchParams, options?: DeepgramSpecificOptions): void {
        const features = {
            punctuate: options?.punctuate !== false,
            smart_format: options?.smartFormat,
            diarize: options?.diarize,
            utterances: (options as any)?.utterances,
            numerals: options?.numerals,
            profanity_filter: options?.profanityFilter
        };

        Object.entries(features).forEach(([key, value]) => {
            if (value) {
                params.append(key, 'true');
            }
        });

        // Array-based features
        if (options?.redact?.length) {
            params.append('redact', options.redact.join(','));
        }

        if (options?.keywords?.length) {
            params.append('keywords', options.keywords.join(','));
        }
    }

    /**
     * Build request headers
     */
    private buildHeaders(): Record<string, string> {
        return {
            'Authorization': `Token ${this.config.apiKey}`,
            'Content-Type': 'audio/wav'
        };
    }

    /**
     * Handle API errors
     */
    private async handleApiError(response: any): Promise<never> {
        const errorBody = response.json;
        const errorMessage = errorBody?.message ?? errorBody?.error ?? 'Unknown error';

        this.config.logger.error(`Deepgram API Error: ${response.status}`, undefined, {
            status: response.status,
            errorBody
        });

        const errorMap: Record<number, () => Error> = {
            400: () => new TranscriptionError(errorMessage, 'BAD_REQUEST', 'deepgram', false, 400),
            401: () => new ProviderAuthenticationError('deepgram'),
            402: () => new TranscriptionError('Insufficient credits', 'INSUFFICIENT_CREDITS', 'deepgram', false, 402),
            429: () => new ProviderRateLimitError('deepgram', response.headers?.['retry-after']),
            500: () => new ProviderUnavailableError('deepgram'),
            502: () => new ProviderUnavailableError('deepgram'),
            503: () => new ProviderUnavailableError('deepgram')
        };

        const errorFactory = errorMap[response.status];
        if (errorFactory) {
            throw errorFactory();
        }

        throw new TranscriptionError(
            `API error: ${errorMessage}`,
            'UNKNOWN_ERROR',
            'deepgram',
            false,
            response.status
        );
    }

    /**
     * Create segments from words
     */
    private createSegments(words?: any[]): TranscriptionSegment[] {
        if (!words?.length) {
            return [];
        }

        const segments: TranscriptionSegment[] = [];
        const wordsPerSegment = DEEPGRAM_CONFIG.WORDS_PER_SEGMENT;

        for (let i = 0; i < words.length; i += wordsPerSegment) {
            const segmentWords = words.slice(i, Math.min(i + wordsPerSegment, words.length));
            if (segmentWords.length > 0) {
                segments.push(this.createSegment(segmentWords, Math.floor(i / wordsPerSegment)));
            }
        }

        return segments;
    }

    /**
     * Create a single segment from words
     */
    private createSegment(words: any[], id: number): TranscriptionSegment {
        const text = words.map(w => w.word).join(' ');
        const totalConfidence = words.reduce((acc, w) => acc + w.confidence, 0);
        
        return {
            id,
            start: words[0].start,
            end: words[words.length - 1].end,
            text,
            confidence: totalConfidence / words.length,
            speaker: words[0].speaker
        };
    }

    /**
     * Check if error is retryable
     */
    private isRetryableError = (error: any): boolean => {
        if (error instanceof TranscriptionError) {
            return error.isRetryable;
        }

        const retryableMessages = ['network', 'timeout', 'econnreset', 'socket'];
        const message = error.message?.toLowerCase() ?? '';
        
        return retryableMessages.some(msg => message.includes(msg));
    };

    /**
     * Validate input audio
     */
    private validateInput(audio: ArrayBuffer): void {
        if (!audio || audio.byteLength === 0) {
            throw new TranscriptionError(
                'Invalid audio buffer',
                'INVALID_INPUT',
                'deepgram',
                false
            );
        }

        if (audio.byteLength > DEEPGRAM_CONFIG.MAX_FILE_SIZE) {
            throw new TranscriptionError(
                `Audio file too large: ${audio.byteLength} bytes`,
                'FILE_TOO_LARGE',
                'deepgram',
                false
            );
        }
    }

    /**
     * Count words in text
     */
    private countWords(text: string): number {
        return text.split(/\s+/).filter(word => word.length > 0).length;
    }

    /**
     * Log request metrics
     */
    private logRequestMetrics(startTime: number, fileSize: number, status: number): void {
        const duration = Date.now() - startTime;
        this.config.logger.info('Deepgram request completed', {
            duration,
            fileSize,
            status
        });
    }
}
