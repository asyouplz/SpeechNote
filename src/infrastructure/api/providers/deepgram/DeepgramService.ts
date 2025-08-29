import { requestUrl, RequestUrlParam } from 'obsidian';
import type { ILogger } from '../../../../types';
import {
    TranscriptionProvider,
    DeepgramSpecificOptions,
    TranscriptionResponse,
    TranscriptionSegment,
    ProviderAuthenticationError,
    ProviderRateLimitError,
    ProviderUnavailableError,
    TranscriptionError
} from '../ITranscriber';

// Deepgram API 응답 타입
interface DeepgramAPIResponse {
    metadata: {
        transaction_key: string;
        request_id: string;
        sha256: string;
        created: string;
        duration: number;
        channels: number;
        models: string[];
        model_info: {
            [key: string]: {
                name: string;
                version: string;
                tier: string;
            };
        };
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

// Rate Limiter 구현
class RateLimiter {
    private queue: Array<() => void> = [];
    private processing = false;
    private lastRequestTime = 0;
    
    constructor(
        private requestsPerMinute: number,
        private logger: ILogger
    ) {}
    
    async acquire(): Promise<void> {
        return new Promise<void>(resolve => {
            this.queue.push(resolve);
            this.processQueue();
        });
    }
    
    private async processQueue(): Promise<void> {
        if (this.processing || this.queue.length === 0) {
            return;
        }
        
        this.processing = true;
        const minInterval = 60000 / this.requestsPerMinute;
        
        while (this.queue.length > 0) {
            const now = Date.now();
            const timeSinceLastRequest = now - this.lastRequestTime;
            
            if (timeSinceLastRequest < minInterval) {
                const waitTime = minInterval - timeSinceLastRequest;
                await this.sleep(waitTime);
            }
            
            const resolve = this.queue.shift();
            if (resolve) {
                this.lastRequestTime = Date.now();
                resolve();
            }
        }
        
        this.processing = false;
    }
    
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Circuit Breaker 재사용 (WhisperService와 동일한 패턴)
class CircuitBreaker {
    private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
    private failureCount = 0;
    private successCount = 0;
    private nextAttemptTime = 0;
    private readonly failureThreshold = 5;
    private readonly successThreshold = 2;
    private readonly timeout = 60000; // 1분

    constructor(private logger: ILogger) {}

    async execute<T>(operation: () => Promise<T>): Promise<T> {
        if (this.isOpen()) {
            throw new ProviderUnavailableError('deepgram');
        }

        try {
            const result = await operation();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    private isOpen(): boolean {
        if (this.state === 'OPEN') {
            if (Date.now() >= this.nextAttemptTime) {
                this.state = 'HALF_OPEN';
                this.logger.info('Deepgram Circuit breaker entering HALF_OPEN state');
                return false;
            }
            return true;
        }
        return false;
    }

    private onSuccess(): void {
        this.failureCount = 0;
        
        if (this.state === 'HALF_OPEN') {
            this.successCount++;
            if (this.successCount >= this.successThreshold) {
                this.state = 'CLOSED';
                this.successCount = 0;
                this.logger.info('Deepgram Circuit breaker closed');
            }
        }
    }

    private onFailure(): void {
        this.failureCount++;
        
        if (this.state === 'HALF_OPEN') {
            this.state = 'OPEN';
            this.nextAttemptTime = Date.now() + this.timeout;
            this.logger.warn('Deepgram Circuit breaker opened due to failure in HALF_OPEN state');
        } else if (this.failureCount >= this.failureThreshold) {
            this.state = 'OPEN';
            this.nextAttemptTime = Date.now() + this.timeout;
            this.logger.warn(`Deepgram Circuit breaker opened after ${this.failureCount} failures`);
        }
    }

    reset(): void {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.successCount = 0;
        this.logger.info('Deepgram Circuit breaker reset');
    }
}

// Exponential Backoff Retry Strategy
class ExponentialBackoffRetry {
    private readonly maxRetries = 3;
    private readonly baseDelay = 1000;
    private readonly maxDelay = 10000;

    constructor(private logger: ILogger) {}

    async execute<T>(operation: () => Promise<T>): Promise<T> {
        let lastError: Error;
        
        for (let attempt = 0; attempt < this.maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error as Error;
                
                if (!this.isRetryable(error)) {
                    throw error;
                }
                
                if (attempt < this.maxRetries - 1) {
                    const delay = this.calculateDelay(attempt);
                    this.logger.debug(`Deepgram: Retrying after ${delay}ms (attempt ${attempt + 1}/${this.maxRetries})`);
                    await this.sleep(delay);
                }
            }
        }
        
        throw new TranscriptionError(
            `Deepgram operation failed after ${this.maxRetries} attempts: ${lastError!.message}`,
            'MAX_RETRIES_EXCEEDED',
            'deepgram',
            false
        );
    }
    
    private isRetryable(error: any): boolean {
        if (error instanceof TranscriptionError) {
            return error.isRetryable;
        }
        // 네트워크 에러는 재시도 가능
        return error.message?.toLowerCase().includes('network');
    }
    
    private calculateDelay(attempt: number): number {
        const delay = Math.min(
            this.baseDelay * Math.pow(2, attempt),
            this.maxDelay
        );
        // Jitter 추가
        return delay + Math.random() * 1000;
    }
    
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Deepgram API 서비스
 * 
 * Deepgram API와의 통신을 담당하며, 자동 재시도, Circuit Breaker,
 * Rate Limiting을 통해 안정적인 API 호출을 보장합니다.
 */
export class DeepgramService {
    private readonly API_ENDPOINT = 'https://api.deepgram.com/v1/listen';
    private readonly MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB (Deepgram 지원)
    private readonly TIMEOUT = 30000; // 30 seconds
    
    private abortController?: AbortController;
    private circuitBreaker: CircuitBreaker;
    private retryStrategy: ExponentialBackoffRetry;
    private rateLimiter: RateLimiter;
    
    constructor(
        private apiKey: string,
        private logger: ILogger,
        requestsPerMinute: number = 100
    ) {
        this.circuitBreaker = new CircuitBreaker(logger);
        this.retryStrategy = new ExponentialBackoffRetry(logger);
        this.rateLimiter = new RateLimiter(requestsPerMinute, logger);
    }
    
    /**
     * 오디오를 텍스트로 변환합니다.
     */
    async transcribe(
        audio: ArrayBuffer,
        options?: DeepgramSpecificOptions,
        language?: string
    ): Promise<DeepgramAPIResponse> {
        // Rate limiting
        await this.rateLimiter.acquire();
        
        // Circuit Breaker와 재시도 전략을 통한 실행
        return this.circuitBreaker.execute(() =>
            this.retryStrategy.execute(() =>
                this.performTranscription(audio, options, language)
            )
        );
    }
    
    private async performTranscription(
        audio: ArrayBuffer,
        options?: DeepgramSpecificOptions,
        language?: string
    ): Promise<DeepgramAPIResponse> {
        this.abortController = new AbortController();
        const startTime = Date.now();
        
        try {
            const url = this.buildUrl(options, language);
            const headers = this.buildHeaders();
            
            this.logger.debug('Starting Deepgram transcription request', {
                fileSize: audio.byteLength,
                options,
                language
            });
            
            const requestParams: RequestUrlParam = {
                url,
                method: 'POST',
                headers,
                body: audio,
                throw: false,
            };
            
            const response = await requestUrl(requestParams);
            const processingTime = Date.now() - startTime;
            
            this.logger.info(`Deepgram transcription completed in ${processingTime}ms`, {
                status: response.status
            });
            
            if (response.status === 200) {
                return response.json as DeepgramAPIResponse;
            } else {
                throw await this.handleAPIError(response);
            }
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
    
    private buildUrl(options?: DeepgramSpecificOptions, language?: string): string {
        const params = new URLSearchParams();
        
        // 모델 설정 (tier)
        const model = options?.tier || 'nova-2';
        params.append('model', model);
        
        // 언어 설정
        if (language && language !== 'auto') {
            params.append('language', language);
        } else if (options?.detectLanguage) {
            params.append('detect_language', 'true');
        }
        
        // 기능 옵션
        if (options?.punctuate !== false) {
            params.append('punctuate', 'true');
        }
        
        if (options?.smartFormat) {
            params.append('smart_format', 'true');
        }
        
        if (options?.diarize) {
            params.append('diarize', 'true');
        }
        
        if (options?.numerals) {
            params.append('numerals', 'true');
        }
        
        if (options?.profanityFilter) {
            params.append('profanity_filter', 'true');
        }
        
        if (options?.redact && options.redact.length > 0) {
            params.append('redact', options.redact.join(','));
        }
        
        if (options?.keywords && options.keywords.length > 0) {
            params.append('keywords', options.keywords.join(','));
        }
        
        return `${this.API_ENDPOINT}?${params.toString()}`;
    }
    
    private buildHeaders(): Record<string, string> {
        return {
            'Authorization': `Token ${this.apiKey}`,
            'Content-Type': 'audio/wav'
        };
    }
    
    private async handleAPIError(response: any): Promise<never> {
        const errorBody = response.json;
        const errorMessage = errorBody?.message || errorBody?.error || 'Unknown error';
        
        this.logger.error(`Deepgram API Error: ${response.status} - ${errorMessage}`, undefined, {
            status: response.status,
            errorBody
        });
        
        switch (response.status) {
            case 400:
                throw new TranscriptionError(
                    errorMessage || 'Invalid request',
                    'BAD_REQUEST',
                    'deepgram',
                    false,
                    400
                );
            case 401:
                throw new ProviderAuthenticationError('deepgram');
            case 402:
                throw new TranscriptionError(
                    'Insufficient credits',
                    'INSUFFICIENT_CREDITS',
                    'deepgram',
                    false,
                    402
                );
            case 429:
                const retryAfter = response.headers?.['retry-after'];
                throw new ProviderRateLimitError(
                    'deepgram',
                    retryAfter ? parseInt(retryAfter) : undefined
                );
            case 500:
            case 502:
            case 503:
                throw new ProviderUnavailableError('deepgram');
            default:
                throw new TranscriptionError(
                    `API error: ${errorMessage}`,
                    'UNKNOWN_ERROR',
                    'deepgram',
                    false,
                    response.status
                );
        }
    }
    
    /**
     * API 키의 유효성을 검증합니다.
     */
    async validateApiKey(key: string): Promise<boolean> {
        const originalKey = this.apiKey;
        this.apiKey = key;
        
        try {
            // 작은 테스트 오디오 생성 (1KB)
            const testAudio = new ArrayBuffer(1024);
            await this.performTranscription(testAudio);
            return true;
        } catch (error) {
            if (error instanceof ProviderAuthenticationError) {
                this.logger.warn('Deepgram API key validation failed: Invalid key');
                return false;
            }
            // 다른 에러는 API 키와 관련 없을 수 있음
            this.logger.debug('Deepgram API key validation encountered non-auth error', error);
            return true;
        } finally {
            this.apiKey = originalKey;
        }
    }
    
    /**
     * 진행 중인 변환 요청을 취소합니다.
     */
    cancel(): void {
        if (this.abortController) {
            this.abortController.abort();
            this.logger.debug('Deepgram transcription cancelled by user');
        }
    }
    
    /**
     * Circuit Breaker를 리셋합니다.
     */
    resetCircuitBreaker(): void {
        this.circuitBreaker.reset();
    }
    
    /**
     * 응답을 통합 형식으로 변환
     */
    parseResponse(response: DeepgramAPIResponse): TranscriptionResponse {
        const channel = response.results.channels[0];
        const alternative = channel.alternatives[0];
        
        // 세그먼트 생성 (단어 기반)
        let segments: TranscriptionSegment[] = [];
        if (alternative.words) {
            segments = this.createSegmentsFromWords(alternative.words);
        }
        
        return {
            text: alternative.transcript,
            language: channel.detected_language,
            confidence: alternative.confidence,
            duration: response.metadata.duration,
            segments,
            provider: 'deepgram',
            metadata: {
                model: response.metadata.models[0],
                processingTime: response.metadata.duration,
                wordCount: alternative.transcript.split(/\s+/).length
            }
        };
    }
    
    private createSegmentsFromWords(words: any[]): TranscriptionSegment[] {
        const segments: TranscriptionSegment[] = [];
        const wordsPerSegment = 10; // 10단어씩 세그먼트 생성
        
        for (let i = 0; i < words.length; i += wordsPerSegment) {
            const segmentWords = words.slice(i, Math.min(i + wordsPerSegment, words.length));
            if (segmentWords.length > 0) {
                segments.push({
                    id: Math.floor(i / wordsPerSegment),
                    start: segmentWords[0].start,
                    end: segmentWords[segmentWords.length - 1].end,
                    text: segmentWords.map((w: any) => w.word).join(' '),
                    confidence: segmentWords.reduce((acc: number, w: any) => acc + w.confidence, 0) / segmentWords.length,
                    speaker: segmentWords[0].speaker
                });
            }
        }
        
        return segments;
    }
}