import { SelectionStrategy } from '../../infrastructure/api/providers/ITranscriber';

export interface SpeechToTextSettings {
    apiKey: string;
    apiEndpoint?: string;  // Added for custom API endpoint support
    model: WhisperModel | string;  // Allow string for compatibility
    language: LanguageCode;
    autoInsert: boolean;
    insertPosition: InsertPosition;
    timestampFormat: TimestampFormat;
    maxFileSize: number;
    enableCache: boolean;
    cacheTTL: number;
    temperature?: number;
    prompt?: string;
    // New formatting options
    textFormat?: 'plain' | 'markdown' | 'quote' | 'bullet' | 'heading' | 'code' | 'callout';
    addTimestamp?: boolean;
    showFormatOptions?: boolean;
    
    // Multi-Provider Configuration
    provider?: 'auto' | 'whisper' | 'deepgram';
    whisperApiKey?: string;
    deepgramApiKey?: string;
    deepgramModel?: string;  // Deepgram model/tier selection
    encryptedApiKey?: string;
    
    // Selection Strategy
    selectionStrategy?: SelectionStrategy;
    fallbackStrategy?: 'auto' | 'manual' | 'none';
    
    // Strategy Weights (for performance optimization)
    latencyWeight?: number;
    successWeight?: number;
    costWeight?: number;
    
    // Cost Management
    monthlyBudget?: number;
    costLimit?: number;
    budgetAlert?: number;
    autoCostOptimization?: boolean;
    
    // Quality Control
    qualityThreshold?: number;
    minConfidence?: number;
    strictLanguage?: boolean;
    enablePostProcessing?: boolean;
    
    // A/B Testing
    abTestEnabled?: boolean;
    
    // Large File Handling (for Deepgram)
    autoChunking?: boolean;
    maxChunkSizeMB?: number;
    chunkOverlapSeconds?: number;
    abTestSplit?: number;
    abTestDuration?: number;
    abTestMetrics?: 'all' | 'latency' | 'accuracy' | 'cost';
    
    // Performance Tuning
    requestTimeout?: number;
    maxParallelRequests?: number;
    maxRetries?: number;
    cacheDuration?: number;
    
    // Circuit Breaker
    circuitBreakerEnabled?: boolean;
    circuitBreakerThreshold?: number;
    circuitBreakerTimeout?: number;
    
    // Reliability
    healthChecksEnabled?: boolean;
    gracefulDegradation?: boolean;
    
    // Developer Options
    debugMode?: boolean;
    metricsEnabled?: boolean;
    metricsRetentionDays?: number;
    showMetrics?: boolean;
    
    // Security
    autoValidateKeys?: boolean;
    useEnvVars?: boolean;
    
    // Provider 설정 (Deepgram 마이그레이션 - 기존 호환성 유지)
    transcription?: {
        defaultProvider?: 'whisper' | 'deepgram';
        autoSelect?: boolean;
        selectionStrategy?: 'manual' | 'cost_optimized' | 'performance_optimized' | 'quality_optimized';
        fallbackEnabled?: boolean;
        
        whisper?: {
            enabled?: boolean;
            apiKey?: string;
            model?: string;
        };
        
        deepgram?: {
            enabled?: boolean;
            apiKey?: string;
            model?: string;
            tier?: 'nova-3' | 'nova-2' | 'enhanced' | 'base';
            features?: {
                punctuation?: boolean;
                smartFormat?: boolean;
                diarization?: boolean;
                numerals?: boolean;
            };
        };
        
        abTest?: {
            enabled?: boolean;
            trafficSplit?: number;
            metricTracking?: boolean;
        };
        
        monitoring?: {
            enabled?: boolean;
            metricsEndpoint?: string;
        };
    };
    [key: string]: unknown;
}

export type WhisperModel = 'whisper-1';
export type LanguageCode = 'auto' | 'en' | 'ko' | 'ja' | 'zh' | 'es' | 'fr' | 'de' | string;
export type InsertPosition = 'cursor' | 'end' | 'beginning';
export type TimestampFormat = 'none' | 'inline' | 'sidebar';

export const DEFAULT_SETTINGS: SpeechToTextSettings = {
    apiKey: '',
    model: 'whisper-1',
    language: 'auto',
    autoInsert: true,
    insertPosition: 'cursor',
    timestampFormat: 'none',
    maxFileSize: 25 * 1024 * 1024, // 25MB
    enableCache: true,
    cacheTTL: 3600000, // 1 hour
    temperature: undefined,
    prompt: undefined,
    textFormat: 'plain',
    addTimestamp: false,
    showFormatOptions: false,
    
    // Multi-Provider Defaults
    provider: 'auto',
    selectionStrategy: SelectionStrategy.PERFORMANCE_OPTIMIZED,
    fallbackStrategy: 'auto',
    
    // Strategy Weights Defaults
    latencyWeight: 40,
    successWeight: 35,
    costWeight: 25,
    
    // Cost Management Defaults
    budgetAlert: 80,
    autoCostOptimization: false,
    
    // Quality Control Defaults
    qualityThreshold: 85,
    minConfidence: 70,
    strictLanguage: false,
    enablePostProcessing: true,
    
    // A/B Testing Defaults
    abTestEnabled: false,
    abTestSplit: 50,
    abTestDuration: 7,
    abTestMetrics: 'all',
    
    // Performance Tuning Defaults
    requestTimeout: 30000, // 30 seconds
    maxParallelRequests: 2,
    maxRetries: 3,
    cacheDuration: 24, // hours
    
    // Circuit Breaker Defaults
    circuitBreakerEnabled: true,
    circuitBreakerThreshold: 5,
    circuitBreakerTimeout: 60000, // 1 minute
    
    // Reliability Defaults
    healthChecksEnabled: false,
    gracefulDegradation: true,
    
    // Developer Options Defaults
    debugMode: false,
    metricsEnabled: false,
    metricsRetentionDays: 30,
    showMetrics: false,
    
    // Security Defaults
    autoValidateKeys: false,
    useEnvVars: false
};
