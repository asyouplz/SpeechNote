/**
 * Deepgram 관련 타입 정의 강화
 * 타입 안전성을 위한 엄격한 타입 정의
 */

// === 기본 열거형 타입들 ===
export type ModelTier = 'economy' | 'basic' | 'standard' | 'premium' | 'enterprise';
export type PerformanceSpeed = 'slow' | 'moderate' | 'fast' | 'very_fast';
export type LatencyLevel = 'high' | 'medium' | 'low' | 'very_low';
export type MemoryUsage = 'low' | 'medium' | 'high';
export type AudioFormat = 'wav' | 'mp3' | 'flac' | 'ogg' | 'm4a' | 'webm' | 'opus' | 'unknown';
export type SpeakerNumbering = 'numeric' | 'alphabetic' | 'custom';
export type DiarizationFormat = 'speaker_prefix' | 'speaker_block' | 'custom';

// === Deepgram API 응답 구조 타입 강화 ===
export interface DeepgramWord {
    word: string;
    start: number;
    end: number;
    confidence: number;
    speaker?: number;
}

export interface DeepgramAlternative {
    transcript: string;
    confidence: number;
    words?: DeepgramWord[];
}

export interface DeepgramChannel {
    alternatives: DeepgramAlternative[];
    detected_language?: string;
}

export interface DeepgramModelInfo {
    name: string;
    version: string;
    tier: string;
}

export interface DeepgramMetadata {
    transaction_key: string;
    request_id: string;
    sha256: string;
    created: string;
    duration: number;
    channels: number;
    models: string[];
    model_info: Record<string, DeepgramModelInfo>;
}

export interface DeepgramResults {
    channels: DeepgramChannel[];
}

export interface DeepgramAPIResponse {
    metadata: DeepgramMetadata;
    results: DeepgramResults;
}

// === 모델 기능 및 성능 타입 ===
export interface ModelPerformanceMetrics {
    accuracy: number; // 0-100
    speed: PerformanceSpeed;
    latency: LatencyLevel;
    memoryUsage: MemoryUsage;
}

export interface ModelLimits {
    maxFileSize: number; // bytes
    maxDuration: number; // seconds
    concurrentRequests: number;
}

export interface ModelPricing {
    perMinute: number; // USD
    currency: 'USD' | 'EUR' | 'GBP';
    freeMinutes?: number;
}

export interface ModelAvailability {
    regions: string[];
    beta?: boolean;
    deprecated?: boolean;
    replacedBy?: string;
}

export interface ModelFeatureSet {
    // 기본 기능
    punctuation: boolean;
    smartFormat: boolean;
    numerals: boolean;

    // 프리미엄 기능
    diarization: boolean;
    profanityFilter: boolean;
    redaction: boolean;
    utterances: boolean;

    // 엔터프라이즈 기능
    summarization: boolean;
    advancedDiarization: boolean;
    emotionDetection: boolean;
    speakerIdentification: boolean;

    // 실시간 기능
    realTime: boolean;
    streaming: boolean;

    // 고급 기능
    languageDetection: boolean;
    customVocabulary: boolean;
    sentimentAnalysis: boolean;
    topicDetection: boolean;
}

// === 화자 분리 관련 타입 강화 ===
export interface SpeakerLabelConfig {
    prefix: string;
    numbering: SpeakerNumbering;
    customLabels?: readonly string[];
}

export interface DiarizationMergingConfig {
    consecutiveThreshold: number; // seconds
    minSegmentLength: number; // word count
}

export interface DiarizationOutputConfig {
    includeTimestamps: boolean;
    includeConfidence: boolean;
    paragraphBreaks: boolean;
    lineBreaksBetweenSpeakers: boolean;
}

export interface DiarizationConfigComplete {
    enabled: boolean;
    format: DiarizationFormat;
    speakerLabels: SpeakerLabelConfig;
    merging: DiarizationMergingConfig;
    output: DiarizationOutputConfig;
}

// === 검증 및 에러 처리 타입 ===
export interface ValidationError {
    code: string;
    message: string;
    severity: 'error' | 'warning';
    field?: string;
}

export interface AudioMetrics {
    size: number;
    duration?: number;
    channels?: number;
    sampleRate?: number;
    bitRate?: number;
    format: AudioFormat;
}

export interface ProcessingMetrics {
    startTime: number;
    endTime?: number;
    duration?: number;
    memoryUsage?: number;
    apiCalls: number;
    retryCount: number;
}

// === API 옵션 타입 강화 ===
export interface DeepgramRequestOptions {
    model: string;
    language?: string;
    detectLanguage?: boolean;
    punctuate?: boolean;
    smartFormat?: boolean;
    diarize?: boolean;
    numerals?: boolean;
    profanityFilter?: boolean;
    redact?: readonly string[];
    keywords?: readonly string[];
    customVocabulary?: readonly string[];
}

// === 유틸리티 타입들 ===
export type NonEmptyArray<T> = [T, ...T[]];

export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

// Type guards
export const isValidModelTier = (tier: string): tier is ModelTier => {
    return ['economy', 'basic', 'standard', 'premium', 'enterprise'].includes(tier);
};

export const isValidAudioFormat = (format: string): format is AudioFormat => {
    return ['wav', 'mp3', 'flac', 'ogg', 'm4a', 'webm', 'opus', 'unknown'].includes(format);
};

export const isValidPerformanceSpeed = (speed: string): speed is PerformanceSpeed => {
    return ['slow', 'moderate', 'fast', 'very_fast'].includes(speed);
};

// === 런타임 타입 검증 헬퍼들 ===
export class TypeValidator {
    static isDeepgramAPIResponse(obj: unknown): obj is DeepgramAPIResponse {
        return (
            isRecord(obj) &&
            isRecord(obj.metadata) &&
            isRecord(obj.results) &&
            Array.isArray(obj.results.channels)
        );
    }

    static hasValidWord(word: unknown): word is DeepgramWord {
        if (!isRecord(word)) {
            return false;
        }
        return (
            typeof word.word === 'string' &&
            typeof word.start === 'number' &&
            typeof word.end === 'number' &&
            typeof word.confidence === 'number' &&
            word.start >= 0 &&
            word.end >= word.start &&
            word.confidence >= 0 &&
            word.confidence <= 1
        );
    }

    static hasValidSpeakerInfo(word: unknown): boolean {
        return (
            isRecord(word) &&
            word.speaker !== undefined &&
            typeof word.speaker === 'number' &&
            word.speaker >= 0
        );
    }

    static isValidDiarizationConfig(config: unknown): config is DiarizationConfigComplete {
        return (
            isRecord(config) &&
            typeof config.enabled === 'boolean' &&
            isRecord(config.speakerLabels) &&
            isRecord(config.merging) &&
            isRecord(config.output)
        );
    }
}

// === 성능 모니터링 타입 ===
export interface PerformanceMetrics {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    averageFileSize: number;
    totalProcessingTime: number;
    circuitBreakerTrips: number;
    retryAttempts: number;
}

// === 진단 정보 타입 ===
export interface DiagnosticInfo {
    timestamp: string;
    modelUsed: string;
    audioMetrics: AudioMetrics;
    processingMetrics: ProcessingMetrics;
    errors: ValidationError[];
    warnings: ValidationError[];
    recommendations: string[];
}
