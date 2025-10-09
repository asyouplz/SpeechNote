import { requestUrl, RequestUrlParam } from 'obsidian';
import type { IWhisperService, WhisperOptions, WhisperResponse, ILogger } from '../../types';
import { retry, sleep, withTimeout } from '../../utils/common/helpers';
import { validateApiKey, validateRange } from '../../utils/common/validators';
import { formatFileSize, truncateText } from '../../utils/common/formatters';
import { isWhisperResponse } from '../../types/guards';

// 커스텀 에러 클래스
export class WhisperAPIError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly status?: number,
        public readonly isRetryable: boolean = false
    ) {
        super(message);
        this.name = 'WhisperAPIError';
    }
}

export class AuthenticationError extends WhisperAPIError {
    constructor(message: string = 'Invalid API key') {
        super(message, 'AUTH_ERROR', 401, false);
    }
}

export class RateLimitError extends WhisperAPIError {
    constructor(public readonly retryAfter?: number) {
        super('Rate limit exceeded', 'RATE_LIMIT', 429, true);
    }
}

export class FileTooLargeError extends WhisperAPIError {
    constructor() {
        super('File size exceeds API limit (25MB)', 'FILE_TOO_LARGE', 413, false);
    }
}

export class ServerError extends WhisperAPIError {
    constructor(message: string, status: number) {
        super(message, 'SERVER_ERROR', status, true);
    }
}

// 재시도 전략 인터페이스
interface RetryStrategy {
    execute<T>(operation: () => Promise<T>): Promise<T>;
}

// 지수 백오프 재시도 전략
class ExponentialBackoffRetry implements RetryStrategy {
    private readonly maxRetries = 3;
    private readonly baseDelay = 250;
    private readonly maxDelay = 2000;

    constructor(private logger: ILogger) {}

    async execute<T>(operation: () => Promise<T>): Promise<T> {
        let lastError: Error | undefined;
        
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
                    this.logger.debug(`Retrying after ${delay}ms (attempt ${attempt + 1}/${this.maxRetries})`);
                    await this.sleep(delay);
                }
            }
        }
        
        if (lastError instanceof WhisperAPIError) {
            throw lastError;
        }

        throw new WhisperAPIError(
            `Operation failed after ${this.maxRetries} attempts: ${lastError?.message ?? 'Unknown error'}`,
            'MAX_RETRIES_EXCEEDED',
            undefined,
            false
        );
    }
    
    private isRetryable(error: any): boolean {
        if (error instanceof WhisperAPIError) {
            return error.isRetryable;
        }

        const message = ((error as Error).message || '').toLowerCase();
        return (
            message.includes('network') ||
            message.includes('temporary') ||
            message.includes('timeout')
        );
    }
    
    private calculateDelay(attempt: number): number {
        const delay = Math.min(
            this.baseDelay * Math.pow(2, attempt),
            this.maxDelay
        );
        // Jitter 추가
        return delay + Math.random() * 250;
    }
    
    private sleep(ms: number): Promise<void> {
        return sleep(ms);
    }
}

// Circuit Breaker 구현
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
            throw new WhisperAPIError(
                `Circuit breaker is open. Try again after ${new Date(this.nextAttemptTime).toLocaleTimeString()}`,
                'CIRCUIT_OPEN',
                undefined,
                false
            );
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
                this.logger.info('Circuit breaker entering HALF_OPEN state');
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
                this.logger.info('Circuit breaker closed');
            }
        }
    }

    private onFailure(): void {
        this.failureCount++;
        
        if (this.state === 'HALF_OPEN') {
            this.state = 'OPEN';
            this.nextAttemptTime = Date.now() + this.timeout;
            this.logger.warn('Circuit breaker opened due to failure in HALF_OPEN state');
        } else if (this.failureCount >= this.failureThreshold) {
            this.state = 'OPEN';
            this.nextAttemptTime = Date.now() + this.timeout;
            this.logger.warn(`Circuit breaker opened after ${this.failureCount} failures`);
        }
    }

    reset(): void {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.successCount = 0;
        this.logger.info('Circuit breaker reset');
    }
}

/**
 * OpenAI Whisper API 서비스
 * 
 * Whisper API와의 통신을 담당하며, 자동 재시도, Circuit Breaker,
 * 큐잉 시스템을 통해 안정적인 API 호출을 보장합니다.
 * 
 * @example
 * ```typescript
 * const whisperService = new WhisperService(apiKey, logger);
 * const response = await whisperService.transcribe(audioBuffer, {
 *   language: 'ko',
 *   responseFormat: 'verbose_json'
 * });
 * ```
 */
export class WhisperService implements IWhisperService {
    private readonly API_ENDPOINT = 'https://api.openai.com/v1/audio/transcriptions';
    private readonly MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
    private readonly TIMEOUT = 30000; // 30 seconds
    
    private abortController?: AbortController;
    private retryStrategy: RetryStrategy;
    private circuitBreaker: CircuitBreaker;
    private requestQueue: Promise<any> = Promise.resolve();
    private pendingRequests: Array<() => Promise<void>> = [];
    private isProcessingQueue = false;

    constructor(private apiKey: string, private logger: ILogger) {
        this.retryStrategy = new ExponentialBackoffRetry(logger);
        this.circuitBreaker = new CircuitBreaker(logger);
    }

    /**
     * 오디오를 텍스트로 변환합니다.
     * 
     * @param audio - 변환할 오디오 버퍼 (ArrayBuffer)
     * @param options - Whisper API 옵션
     * @returns 변환된 텍스트와 메타데이터를 포함한 응답
     * @throws {FileTooLargeError} 파일이 25MB를 초과할 때
     * @throws {AuthenticationError} API 키가 유효하지 않을 때
     * @throws {RateLimitError} API 호출 제한에 도달했을 때
     * @throws {WhisperAPIError} 기타 API 에러
     * 
     * @example
     * ```typescript
     * try {
     *   const result = await whisperService.transcribe(audioBuffer, {
     *     language: 'ko',
     *     temperature: 0.2
     *   });
     *   console.log(result.text);
     * } catch (error) {
     *   if (error instanceof RateLimitError) {
     *     // 재시도 로직
     *   }
     * }
     * ```
     */
    async transcribe(audio: ArrayBuffer, options?: WhisperOptions): Promise<WhisperResponse> {
        // 큐에 추가하여 순차 처리
        return this.queueRequest(() => this.executeTranscription(audio, options));
    }

    private async executeTranscription(
        audio: ArrayBuffer, 
        options?: WhisperOptions
    ): Promise<WhisperResponse> {
        // 파일 크기 검증
        if (audio.byteLength > this.MAX_FILE_SIZE) {
            throw new FileTooLargeError();
        }

        // Circuit Breaker와 재시도 전략을 통한 실행
        return this.circuitBreaker.execute(() =>
            this.retryStrategy.execute(() => 
                this.performTranscription(audio, options)
            )
        );
    }

    private async performTranscription(
        audio: ArrayBuffer,
        options?: WhisperOptions
    ): Promise<WhisperResponse> {
        this.abortController = new AbortController();
        const startTime = Date.now();

        try {
            const formData = this.buildFormData(audio, options);
            const requestParams = this.buildRequestParams(formData);
            
            this.logger.debug('Starting transcription request',
                this.sanitizeForLogging({
                    fileSize: audio.byteLength,
                    options
                })
            );

            const response = await requestUrl(requestParams);
            const processingTime = Date.now() - startTime;

            this.logger.info(`Transcription completed in ${processingTime}ms`, {
                status: response.status
            });

            if (response.status === 200) {
                return this.parseResponse(response.json, processingTime);
            } else {
                throw await this.handleAPIError(response);
            }
        } catch (error) {
            if ((error as Error).name === 'AbortError') {
                this.logger.debug('Transcription cancelled by user');
                throw new WhisperAPIError('Transcription cancelled', 'CANCELLED', undefined, false);
            }
            this.logger.error('Transcription request failed', error as Error);
            throw error;
        } finally {
            this.abortController = undefined;
        }
    }

    private buildFormData(audio: ArrayBuffer, options?: WhisperOptions): FormData {
        const formData = new FormData();
        
        // 오디오 파일 추가
        const mimeType = this.getMimeType(options);
        const audioBlob = new Blob([audio], { type: mimeType });
        formData.append('file', audioBlob, 'audio.m4a');
        
        // 모델 설정
        formData.append('model', options?.model || 'whisper-1');
        
        // 언어 설정
        if (options?.language && options.language !== 'auto') {
            formData.append('language', options.language);
        }
        
        // 프롬프트 설정 (최대 224 토큰)
        if (options?.prompt) {
            const truncatedPrompt = this.truncatePrompt(options.prompt);
            formData.append('prompt', truncatedPrompt);
        }
        
        // 온도 설정 (0.0 ~ 1.0)
        if (options?.temperature !== undefined) {
            const validation = validateRange(options.temperature, 0, 1);
            if (validation.valid) {
                formData.append('temperature', options.temperature.toString());
            } else {
                this.logger.warn('Invalid temperature value, using default', { temperature: options.temperature });
            }
        }
        
        // 응답 형식 설정
        if (options?.responseFormat) {
            formData.append('response_format', options.responseFormat);
        }
        
        return formData;
    }

    private buildRequestParams(formData: FormData): RequestUrlParam {
        return {
            url: this.API_ENDPOINT,
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.apiKey}`
            },
            body: formData as unknown as string | ArrayBuffer,
            timeout: this.TIMEOUT,
            throw: false
        } as RequestUrlParam;
    }

    private parseResponse(json: any, processingTime: number): WhisperResponse {
        if (json === undefined || json === null) {
            const duration = Math.max(processingTime / 1000, 0.001);
            return {
                text: '',
                duration
            };
        }

        // 텍스트 형식 응답
        if (typeof json === 'string') {
            const duration = Math.max(processingTime / 1000, 0.001);
            return {
                text: json,
                duration
            };
        }

        // JSON 형식 응답
        const fallbackDuration = Math.max(processingTime / 1000, 0.001);
        const response: WhisperResponse = {
            text: json.text || '',
            language: json.language,
            duration: json.duration || fallbackDuration
        };
        
        // verbose_json 형식인 경우 segments 포함
        if (json.segments) {
            response.segments = json.segments;
        }
        
        return response;
    }

    private async handleAPIError(response: any): Promise<never> {
        const errorBody = response.json;
        const errorMessage = errorBody?.error?.message || 'Unknown error';
        
        this.logger.error(`API Error: ${response.status} - ${errorMessage}`, undefined,
            this.sanitizeForLogging({
                status: response.status,
                errorBody
            })
        );
        
        switch (response.status) {
            case 400:
                throw new WhisperAPIError(
                    errorMessage || 'Invalid request',
                    'BAD_REQUEST',
                    400,
                    false
                );
            case 401:
                throw new AuthenticationError();
            case 429:
                const retryAfter = response.headers?.['retry-after'];
                throw new RateLimitError(retryAfter ? parseInt(retryAfter) : undefined);
            case 413:
                throw new FileTooLargeError();
            case 500:
            case 502:
            case 503:
                throw new ServerError(
                    `Server error: ${errorMessage}`,
                    response.status
                );
            default:
                throw new WhisperAPIError(
                    `API error: ${errorMessage}`,
                    'UNKNOWN_ERROR',
                    response.status,
                    false
                );
        }
    }

    private getMimeType(options?: WhisperOptions): string {
        // 기본값은 audio/m4a
        return 'audio/m4a';
    }

    private truncatePrompt(prompt: string, maxTokens: number = 224): string {
        // 대략 1 토큰 = 4 문자로 계산
        const maxChars = maxTokens * 4;
        return truncateText(prompt, maxChars);
    }

    private queueRequest<T>(request: () => Promise<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            const task = async () => {
                try {
                    const result = await request();
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            };

            this.pendingRequests.push(task);
            void this.processQueue();
        });
    }

    private async processQueue(): Promise<void> {
        if (this.isProcessingQueue) {
            return;
        }

        this.isProcessingQueue = true;

        while (this.pendingRequests.length > 0) {
            const next = this.pendingRequests.shift();
            if (next) {
                await next();
            }
        }

        this.isProcessingQueue = false;
    }

    /**
     * API 키의 유효성을 검증합니다.
     * 
     * @param key - 검증할 OpenAI API 키
     * @returns API 키가 유효하면 true, 그렇지 않으면 false
     * 
     * @example
     * ```typescript
     * const isValid = await whisperService.validateApiKey('sk-...');
     * if (!isValid) {
     *   console.error('Invalid API key');
     * }
     * ```
     */
    async validateApiKey(key: string): Promise<boolean> {
        const originalKey = this.apiKey;
        this.apiKey = key;
        
        try {
            // 유효한 크기의 테스트 오디오 생성 (1KB)
            const testAudio = new ArrayBuffer(1024);
            await this.performTranscription(testAudio, {
                responseFormat: 'text'
            });
            return true;
        } catch (error) {
            if (error instanceof AuthenticationError) {
                this.logger.warn('API key validation failed: Invalid key');
                return false;
            }
            // 다른 에러는 API 키와 관련 없을 수 있음
            this.logger.debug('API key validation encountered non-auth error', error);
            return true;
        } finally {
            this.apiKey = originalKey;
        }
    }

    /**
     * 진행 중인 변환 요청을 취소합니다.
     * 
     * @example
     * ```typescript
     * // 변환 시작
     * const promise = whisperService.transcribe(audioBuffer);
     * 
     * // 취소
     * whisperService.cancel();
     * ```
     */
    cancel(): void {
        if (this.abortController && !this.abortController.signal.aborted) {
            this.abortController.abort();
            this.logger.debug('Transcription cancelled by user');
        }
    }

    /**
     * Sanitize data for logging by removing sensitive information
     */
    private sanitizeForLogging<T>(data: T): T {
        const redactKeys = ['apikey', 'api_key', 'token', 'authorization', 'secret'];

        const scrub = (value: unknown): unknown => {
            if (value === null || value === undefined) {
                return value;
            }

            if (typeof value !== 'object') {
                return value;
            }

            if (value instanceof ArrayBuffer) {
                return '[ArrayBuffer]';
            }

            if (Array.isArray(value)) {
                return value.map((item) => scrub(item));
            }

            const clone: Record<string, unknown> = {};
            for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
                const lowered = key.toLowerCase();
                if (redactKeys.some((needle) => lowered.includes(needle))) {
                    clone[key] = '***';
                } else {
                    clone[key] = scrub(val);
                }
            }

            return clone;
        };

        return scrub(data) as T;
    }

    /**
     * Circuit Breaker를 리셋합니다.
     * 
     * Circuit Breaker가 OPEN 상태일 때 강제로 리셋하여
     * API 호출을 다시 시도할 수 있게 합니다.
     * 
     * @example
     * ```typescript
     * // Circuit Breaker가 열려있을 때
     * whisperService.resetCircuitBreaker();
     * // 이제 API 호출이 다시 가능합니다
     * ```
     */
    resetCircuitBreaker(): void {
        this.circuitBreaker.reset();
    }
}
