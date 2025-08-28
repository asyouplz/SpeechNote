export interface SpeechToTextSettings {
    apiKey: string;
    model: WhisperModel;
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
    
    // Provider 설정 (Deepgram 마이그레이션)
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
            tier?: 'nova-2' | 'enhanced' | 'base';
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
    showFormatOptions: false
};