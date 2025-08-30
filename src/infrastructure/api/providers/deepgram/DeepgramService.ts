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

// 오디오 검증 유틸리티
class AudioValidator {
    constructor(private logger: ILogger) {}
    
    /**
     * 오디오 데이터의 기본적인 검증을 수행합니다.
     */
    validateAudio(audio: ArrayBuffer): {
        isValid: boolean;
        warnings: string[];
        errors: string[];
        metadata: {
            size: number;
            isEmpty: boolean;
            hasMinimumSize: boolean;
            format?: string;
        };
    } {
        const warnings: string[] = [];
        const errors: string[] = [];
        const metadata = {
            size: audio.byteLength,
            isEmpty: audio.byteLength === 0,
            hasMinimumSize: audio.byteLength >= 44, // WAV 헤더 최소 크기
            format: this.detectAudioFormat(audio)
        };
        
        // 기본 검증
        if (metadata.isEmpty) {
            errors.push('Audio data is empty');
        }
        
        if (!metadata.hasMinimumSize && !metadata.isEmpty) {
            errors.push('Audio data too small to contain valid audio');
        }
        
        if (metadata.size > 2 * 1024 * 1024 * 1024) { // 2GB limit
            errors.push('Audio file exceeds maximum size limit (2GB)');
        }
        
        // 경고 사항
        if (metadata.size < 1024) { // 1KB 미만
            warnings.push('Audio file is very small, may not contain meaningful content');
        }
        
        if (metadata.size > 100 * 1024 * 1024) { // 100MB 이상
            warnings.push('Large audio file may take longer to process');
        }
        
        const isValid = errors.length === 0;
        
        this.logger.debug('Audio validation completed', {
            isValid,
            warnings: warnings.length,
            errors: errors.length,
            metadata
        });
        
        return {
            isValid,
            warnings,
            errors,
            metadata
        };
    }
    
    /**
     * 오디오 형식을 간단히 감지합니다.
     */
    private detectAudioFormat(audio: ArrayBuffer): string | undefined {
        if (audio.byteLength < 12) return undefined;
        
        const view = new Uint8Array(audio, 0, 12);
        
        // WAV 파일 시그니처
        if (view[0] === 0x52 && view[1] === 0x49 && view[2] === 0x46 && view[3] === 0x46) {
            return 'wav';
        }
        
        // MP3 파일 시그니처
        if ((view[0] === 0xFF && (view[1] & 0xE0) === 0xE0) || 
            (view[0] === 0x49 && view[1] === 0x44 && view[2] === 0x33)) {
            return 'mp3';
        }
        
        // FLAC 파일 시그니처
        if (view[0] === 0x66 && view[1] === 0x4C && view[2] === 0x61 && view[3] === 0x43) {
            return 'flac';
        }
        
        // OGG 파일 시그니처
        if (view[0] === 0x4F && view[1] === 0x67 && view[2] === 0x67 && view[3] === 0x53) {
            return 'ogg';
        }
        
        // M4A/MP4 컨테이너 시그니처 (ftyp 박스)
        if (view.length >= 8) {
            // 4바이트부터 "ftyp" 확인
            if (view[4] === 0x66 && view[5] === 0x74 && view[6] === 0x79 && view[7] === 0x70) {
                return 'm4a';
            }
        }
        
        // WebM 파일 시그니처
        if (view[0] === 0x1A && view[1] === 0x45 && view[2] === 0xDF && view[3] === 0xA3) {
            return 'webm';
        }
        
        this.logger.debug('Unknown audio format detected', {
            firstBytes: Array.from(view.slice(0, 8)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')
        });
        
        return 'unknown';
    }
    
    /**
     * 오디오가 무음인지 간단히 체크합니다 (WAV 형식만).
     */
    checkForSilence(audio: ArrayBuffer): { 
        isSilent: boolean; 
        averageAmplitude: number;
        peakAmplitude: number;
    } {
        if (audio.byteLength < 44) {
            return { isSilent: true, averageAmplitude: 0, peakAmplitude: 0 };
        }
        
        // WAV 형식인지 확인
        const view = new Uint8Array(audio, 0, 4);
        if (!(view[0] === 0x52 && view[1] === 0x49 && view[2] === 0x46 && view[3] === 0x46)) {
            // WAV가 아니면 검증 불가
            return { isSilent: false, averageAmplitude: -1, peakAmplitude: -1 };
        }
        
        try {
            // WAV 헤더 건너뛰고 오디오 데이터 샘플링
            const dataStart = 44;
            const sampleSize = Math.min(audio.byteLength - dataStart, 8192); // 8KB 샘플링
            const samples = new Int16Array(audio, dataStart, sampleSize / 2);
            
            let sum = 0;
            let peak = 0;
            
            for (let i = 0; i < samples.length; i++) {
                const amplitude = Math.abs(samples[i]);
                sum += amplitude;
                peak = Math.max(peak, amplitude);
            }
            
            const averageAmplitude = samples.length > 0 ? sum / samples.length : 0;
            
            // 임계값: 16bit 최대값의 1%
            const silenceThreshold = 327; // (32767 * 0.01)
            const isSilent = averageAmplitude < silenceThreshold && peak < silenceThreshold * 5;
            
            return { isSilent, averageAmplitude, peakAmplitude: peak };
        } catch (error) {
            this.logger.warn('Failed to analyze audio for silence', error as Error);
            return { isSilent: false, averageAmplitude: -1, peakAmplitude: -1 };
        }
    }
}

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
    private audioValidator: AudioValidator;
    
    constructor(
        private apiKey: string,
        private logger: ILogger,
        requestsPerMinute: number = 100
    ) {
        this.circuitBreaker = new CircuitBreaker(logger);
        this.retryStrategy = new ExponentialBackoffRetry(logger);
        this.rateLimiter = new RateLimiter(requestsPerMinute, logger);
        this.audioValidator = new AudioValidator(logger);
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
            // 1. 오디오 검증
            const validation = this.audioValidator.validateAudio(audio);
            
            this.logger.debug('Audio validation results', {
                isValid: validation.isValid,
                warnings: validation.warnings,
                errors: validation.errors,
                metadata: validation.metadata
            });
            
            // 오류가 있으면 즉시 실패
            if (!validation.isValid) {
                throw new TranscriptionError(
                    `Audio validation failed: ${validation.errors.join(', ')}`,
                    'INVALID_AUDIO',
                    'deepgram',
                    false
                );
            }
            
            // 경고사항 로깅
            validation.warnings.forEach(warning => {
                this.logger.warn(`Audio validation warning: ${warning}`);
            });
            
            // 2. 무음 검사 (WAV 형식만)
            if (validation.metadata.format === 'wav') {
                const silenceCheck = this.audioValidator.checkForSilence(audio);
                this.logger.debug('Audio silence analysis', silenceCheck);
                
                if (silenceCheck.isSilent) {
                    this.logger.warn('Audio appears to be silent or very quiet', {
                        averageAmplitude: silenceCheck.averageAmplitude,
                        peakAmplitude: silenceCheck.peakAmplitude
                    });
                }
            }
            
            const url = this.buildUrl(options, language);
            const headers = this.buildHeaders(validation.metadata.format);
            
            this.logger.debug('Starting Deepgram transcription request', {
                fileSize: audio.byteLength,
                detectedFormat: validation.metadata.format,
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
                status: response.status,
                statusText: response.status >= 200 && response.status < 300 ? 'OK' : 'ERROR'
            });
            
            if (response.status === 200) {
                const jsonResponse = response.json as DeepgramAPIResponse;
                
                // 응답의 상세한 구조 로깅
                this.logger.debug('=== Deepgram API Raw Response Analysis ===', {
                    hasJson: !!jsonResponse,
                    responseKeys: jsonResponse ? Object.keys(jsonResponse) : [],
                    hasMetadata: !!jsonResponse?.metadata,
                    hasResults: !!jsonResponse?.results,
                    metadataKeys: jsonResponse?.metadata ? Object.keys(jsonResponse.metadata) : [],
                    resultsKeys: jsonResponse?.results ? Object.keys(jsonResponse.results) : [],
                    channelsCount: jsonResponse?.results?.channels?.length || 0
                });
                
                // 첫 번째 채널의 상세 분석
                if (jsonResponse?.results?.channels?.[0]) {
                    const firstChannel = jsonResponse.results.channels[0];
                    this.logger.debug('First channel analysis', {
                        hasAlternatives: !!firstChannel.alternatives,
                        alternativesCount: firstChannel.alternatives?.length || 0,
                        detectedLanguage: firstChannel.detected_language,
                        firstAlternative: firstChannel.alternatives?.[0] ? {
                            hasTranscript: !!firstChannel.alternatives[0].transcript,
                            transcriptLength: firstChannel.alternatives[0].transcript?.length || 0,
                            transcriptEmpty: !firstChannel.alternatives[0].transcript || firstChannel.alternatives[0].transcript.trim() === '',
                            transcriptPreview: firstChannel.alternatives[0].transcript?.substring(0, 200) + (firstChannel.alternatives[0].transcript && firstChannel.alternatives[0].transcript.length > 200 ? '...' : ''),
                            confidence: firstChannel.alternatives[0].confidence,
                            hasWords: !!firstChannel.alternatives[0].words,
                            wordsCount: firstChannel.alternatives[0].words?.length || 0,
                            firstFewWords: firstChannel.alternatives[0].words?.slice(0, 5).map(w => ({
                                word: w.word,
                                confidence: w.confidence
                            }))
                        } : null
                    });
                }
                
                // 메타데이터 상세 로깅
                if (jsonResponse?.metadata) {
                    this.logger.debug('Metadata analysis', {
                        duration: jsonResponse.metadata.duration,
                        channels: jsonResponse.metadata.channels,
                        models: jsonResponse.metadata.models,
                        modelInfo: jsonResponse.metadata.model_info
                    });
                }
                
                return jsonResponse;
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
    
    private buildHeaders(detectedFormat?: string): Record<string, string> {
        // 감지된 형식에 따른 Content-Type 매핑
        const contentTypeMap: Record<string, string> = {
            'wav': 'audio/wav',
            'mp3': 'audio/mpeg',
            'flac': 'audio/flac',
            'ogg': 'audio/ogg',
            'm4a': 'audio/mp4',
            'webm': 'audio/webm',
            'opus': 'audio/opus'
        };
        
        // 기본값은 audio/wav, 감지된 형식이 있으면 해당 타입 사용
        const contentType = detectedFormat && contentTypeMap[detectedFormat] 
            ? contentTypeMap[detectedFormat] 
            : 'audio/wav';
            
        this.logger.debug('Content-Type selected', {
            detectedFormat,
            contentType
        });
        
        return {
            'Authorization': `Token ${this.apiKey}`,
            'Content-Type': contentType
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
        this.logger.debug('=== DeepgramService.parseResponse START ===');
        this.logger.debug('Full response structure:', {
            hasMetadata: !!response?.metadata,
            hasResults: !!response?.results,
            channelsCount: response?.results?.channels?.length || 0
        });
        
        // 응답 검증
        if (!response || !response.results || !response.results.channels || response.results.channels.length === 0) {
            this.logger.error('Invalid Deepgram response structure', undefined, { response });
            throw new TranscriptionError(
                'Invalid response from Deepgram API',
                'INVALID_RESPONSE',
                'deepgram',
                false
            );
        }
        
        const channel = response.results.channels[0];
        this.logger.debug('Channel data:', {
            hasAlternatives: !!channel?.alternatives,
            alternativesCount: channel?.alternatives?.length || 0,
            detectedLanguage: channel?.detected_language
        });
        
        if (!channel.alternatives || channel.alternatives.length === 0) {
            this.logger.error('No alternatives in Deepgram response', undefined, { channel });
            throw new TranscriptionError(
                'No transcription alternatives found',
                'NO_ALTERNATIVES',
                'deepgram',
                false
            );
        }
        
        const alternative = channel.alternatives[0];
        this.logger.debug('Alternative data:', {
            hasTranscript: !!alternative?.transcript,
            transcriptLength: alternative?.transcript?.length || 0,
            transcriptPreview: alternative?.transcript?.substring(0, 100),
            confidence: alternative?.confidence,
            hasWords: !!alternative?.words,
            wordsCount: alternative?.words?.length || 0
        });
        
        // 텍스트가 비어있는지 확인 및 상세 진단
        const isEmptyTranscript = !alternative.transcript || alternative.transcript.trim().length === 0;
        if (isEmptyTranscript) {
            this.logger.warn('=== EMPTY TRANSCRIPT DETECTED ===', {
                transcript: alternative.transcript,
                transcriptType: typeof alternative.transcript,
                transcriptLength: alternative.transcript?.length || 0,
                trimmedLength: alternative.transcript?.trim().length || 0,
                confidence: alternative.confidence,
                hasWords: !!alternative.words,
                wordsCount: alternative.words?.length || 0,
                detectedLanguage: channel.detected_language,
                duration: response.metadata.duration,
                channels: response.metadata.channels,
                models: response.metadata.models
            });
            
            // 진단 정보 수집
            const diagnosticInfo: string[] = [];
            
            if (alternative.confidence === 0) {
                diagnosticInfo.push('Zero confidence - possibly no speech detected');
            }
            
            if (!alternative.words || alternative.words.length === 0) {
                diagnosticInfo.push('No word timestamps - indicates no speech recognition');
            } else {
                diagnosticInfo.push(`${alternative.words.length} words detected but empty transcript`);
            }
            
            if (response.metadata.duration < 1) {
                diagnosticInfo.push('Very short audio duration');
            }
            
            if (!channel.detected_language) {
                diagnosticInfo.push('No language detected');
            }
            
            this.logger.warn('Empty transcript diagnostic analysis', {
                possibleCauses: diagnosticInfo,
                recommendations: [
                    'Check audio quality and volume',
                    'Verify audio contains actual speech',
                    'Consider adjusting language settings',
                    'Try different Deepgram model',
                    'Check for audio format compatibility issues'
                ]
            });
            
            // 빈 응답에 대한 더 자세한 에러 메시지
            const errorDetails = diagnosticInfo.length > 0 
                ? ` Possible causes: ${diagnosticInfo.join(', ')}`
                : '';
                
            throw new TranscriptionError(
                `Transcription service returned empty text.${errorDetails}`,
                'EMPTY_TRANSCRIPT',
                'deepgram',
                false
            );
        }
        
        // 세그먼트 생성 (단어 기반)
        let segments: TranscriptionSegment[] = [];
        if (alternative.words && alternative.words.length > 0) {
            segments = this.createSegmentsFromWords(alternative.words);
            this.logger.debug(`Created ${segments.length} segments from ${alternative.words.length} words`);
        }
        
        const result: TranscriptionResponse = {
            text: alternative.transcript || '',
            language: channel.detected_language,
            confidence: alternative.confidence,
            duration: response.metadata.duration,
            segments,
            provider: 'deepgram',
            metadata: {
                model: response.metadata.models?.[0] || 'unknown',
                processingTime: response.metadata.duration,
                wordCount: alternative.transcript ? alternative.transcript.split(/\s+/).length : 0
            }
        };
        
        this.logger.info('=== DeepgramService.parseResponse COMPLETE ===', {
            textLength: result.text.length,
            textPreview: result.text.substring(0, 100),
            language: result.language,
            confidence: result.confidence,
            segmentsCount: result.segments?.length || 0
        });
        
        return result;
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