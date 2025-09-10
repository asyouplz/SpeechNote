/**
 * 전사 서비스 공통 인터페이스
 * 모든 전사 Provider(Whisper, Deepgram 등)가 구현해야 하는 인터페이스
 */

// Provider 타입 정의
export type TranscriptionProvider = 'whisper' | 'deepgram';

// Provider 능력 정의
export interface ProviderCapabilities {
    streaming: boolean;
    realtime: boolean;
    languages: string[];
    maxFileSize: number; // bytes
    audioFormats: string[];
    features: string[];
    models?: string[];
}

// 통합된 옵션 인터페이스
export interface TranscriptionOptions {
    // 공통 옵션
    language?: string;
    model?: string;
    
    // Provider별 옵션
    whisper?: WhisperSpecificOptions;
    deepgram?: DeepgramSpecificOptions;
    
    // 메타 옵션
    preferredProvider?: TranscriptionProvider | 'auto';
    fallbackEnabled?: boolean;
}

// Whisper 전용 옵션
export interface WhisperSpecificOptions {
    temperature?: number;
    prompt?: string;
    responseFormat?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
}

// Deepgram 전용 옵션
export interface DeepgramSpecificOptions {
    tier?: 'nova-3' | 'nova-2' | 'enhanced' | 'base' | 'nova';
    punctuate?: boolean;
    smartFormat?: boolean;
    diarize?: boolean;
    utterances?: boolean;
    numerals?: boolean;
    profanityFilter?: boolean;
    redact?: string[];
    keywords?: string[];
    detectLanguage?: boolean;
}

// 전사 세그먼트
export interface TranscriptionSegment {
    id: number;
    start: number;
    end: number;
    text: string;
    confidence?: number;
    speaker?: string;
}

// 통합 응답 형식
export interface TranscriptionResponse {
    text: string;
    language?: string;
    confidence?: number;
    duration?: number;
    segments?: TranscriptionSegment[];
    provider: TranscriptionProvider;
    metadata?: {
        model?: string;
        processingTime?: number;
        cost?: number;
        wordCount?: number;
    };
}

// Provider 설정
export interface ProviderConfig {
    enabled: boolean;
    apiKey: string;
    model?: string;
    maxConcurrency?: number;
    rateLimit?: {
        requests: number;
        window: number; // milliseconds
    };
    timeout?: number; // milliseconds
}

// 전사 Provider 인터페이스
export interface ITranscriber {
    /**
     * 오디오를 텍스트로 전사
     */
    transcribe(audio: ArrayBuffer, options?: TranscriptionOptions): Promise<TranscriptionResponse>;
    
    /**
     * API 키 검증
     */
    validateApiKey(key: string): Promise<boolean>;
    
    /**
     * 진행 중인 전사 취소
     */
    cancel(): void;
    
    /**
     * Provider 이름 반환
     */
    getProviderName(): string;
    
    /**
     * Provider 능력 반환
     */
    getCapabilities(): ProviderCapabilities;
    
    /**
     * Provider 상태 확인
     */
    isAvailable(): Promise<boolean>;
    
    /**
     * 현재 설정 반환
     */
    getConfig(): ProviderConfig;
}

// 스트리밍 지원 Provider 인터페이스
export interface IStreamingTranscriber extends ITranscriber {
    /**
     * 스트리밍 전사 시작
     */
    startStream(
        onPartialResult: (text: string) => void,
        options?: TranscriptionOptions
    ): Promise<void>;
    
    /**
     * 오디오 청크 전송
     */
    sendAudioChunk(chunk: ArrayBuffer): Promise<void>;
    
    /**
     * 스트리밍 종료 및 최종 결과 반환
     */
    endStream(): Promise<TranscriptionResponse>;
}

// Provider 메트릭
export interface ProviderMetrics {
    provider: TranscriptionProvider;
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageLatency: number;
    averageCost: number;
    lastError?: {
        message: string;
        timestamp: Date;
    };
}

// A/B 테스트 설정
export interface ABTestConfig {
    enabled: boolean;
    trafficSplit: number; // 0-1, Whisper 트래픽 비율
    metricTracking: boolean;
    experimentId?: string;
}

// Provider 선택 전략
export enum SelectionStrategy {
    MANUAL = 'manual',
    COST_OPTIMIZED = 'cost_optimized',
    PERFORMANCE_OPTIMIZED = 'performance_optimized',
    QUALITY_OPTIMIZED = 'quality_optimized',
    ROUND_ROBIN = 'round_robin',
    AB_TEST = 'ab_test'
}

// Factory에서 사용할 Provider 설정
export interface TranscriptionProviderConfig {
    defaultProvider: TranscriptionProvider;
    autoSelect: boolean;
    selectionStrategy?: SelectionStrategy;
    fallbackEnabled: boolean;
    
    whisper?: ProviderConfig;
    deepgram?: ProviderConfig;
    
    abTest?: ABTestConfig;
    
    monitoring?: {
        enabled: boolean;
        metricsEndpoint?: string;
        alertThresholds?: {
            errorRate?: number;
            latency?: number;
            cost?: number;
        };
    };
}

// Provider 에러 타입
export class TranscriptionError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly provider: TranscriptionProvider,
        public readonly isRetryable: boolean = false,
        public readonly statusCode?: number
    ) {
        super(message);
        this.name = 'TranscriptionError';
    }
}

// Provider별 에러 타입
export class ProviderAuthenticationError extends TranscriptionError {
    constructor(provider: TranscriptionProvider, message: string = 'Invalid API key') {
        super(message, 'AUTH_ERROR', provider, false, 401);
    }
}

export class ProviderRateLimitError extends TranscriptionError {
    constructor(
        provider: TranscriptionProvider,
        public readonly retryAfter?: number
    ) {
        super('Rate limit exceeded', 'RATE_LIMIT', provider, true, 429);
    }
}

export class ProviderQuotaExceededError extends TranscriptionError {
    constructor(provider: TranscriptionProvider) {
        super('Quota exceeded', 'QUOTA_EXCEEDED', provider, false, 402);
    }
}

export class ProviderUnavailableError extends TranscriptionError {
    constructor(provider: TranscriptionProvider) {
        super('Provider temporarily unavailable', 'UNAVAILABLE', provider, true, 503);
    }
}
