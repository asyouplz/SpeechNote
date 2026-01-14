import type { Editor, EditorPosition, MarkdownView, TFile } from 'obsidian';

// Domain Models
export interface AudioFile {
    path: string;
    name: string;
    size: number;
    format: AudioFormat;
    created: Date;
    modified: Date;
}

export type AudioFormat = 'M4A' | 'MP3' | 'WAV' | 'MP4';

export interface ProcessedAudio {
    buffer: ArrayBuffer;
    metadata: AudioMetadata;
    originalFile: TFile;
    compressed: boolean;
}

export interface AudioMetadata {
    duration?: number;
    bitrate?: number;
    sampleRate?: number;
    channels?: number;
    codec?: string;
    format?: string; // 파일 형식 (mp3, wav, m4a 등)
    fileSize?: number; // 파일 크기 (bytes)
}

export interface TranscriptionResult {
    text: string;
    language?: string;
    confidence?: number;
    segments?: TranscriptionSegment[];
    metadata?: TranscriptionMetadata;
}

export interface TranscriptionSegment {
    id: number;
    start: number;
    end: number;
    text: string;
    confidence?: number;
}

export interface TranscriptionMetadata {
    model: string;
    processingTime: number;
    audioLength?: number;
    wordCount: number;
}

// State Models
export interface AppState {
    status: TranscriptionStatus;
    currentFile: AudioFile | null;
    progress: number;
    error: Error | null;
    history: TranscriptionHistory[];
}

export interface TranscriptionHistory {
    id: string;
    file: AudioFile;
    result: TranscriptionResult;
    timestamp: Date;
    success: boolean;
}

export type TranscriptionStatus = 
    | 'idle'
    | 'validating'
    | 'processing'
    | 'uploading'
    | 'transcribing'
    | 'formatting'
    | 'inserting'
    | 'completed'
    | 'cancelled'
    | 'error';

// API Models
export interface WhisperOptions {
    model?: string;
    language?: string;
    prompt?: string;
    temperature?: number;
    responseFormat?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
}

export interface WhisperResponse {
    text: string;
    language?: string;
    duration?: number;
    segments?: Array<{
        id?: number;
        seek?: number;
        start: number;
        end: number;
        text: string;
        tokens?: number[];
        temperature?: number;
        avg_logprob?: number;
        compression_ratio?: number;
        no_speech_prob?: number;
    }>;
}

// Validation
export interface ValidationResult {
    valid: boolean;
    errors?: string[];
    warnings?: string[];
}

// Events
export type EventHandler<T = unknown> = (data: T) => void;
export type Unsubscribe = () => void;
export type StateListener = (state: AppState, prevState?: AppState) => void;

// Cache
export interface CacheEntry<T = unknown> {
    value: T;
    created: number;
    lastAccessed: number;
    ttl: number;
}

// Error Types
export interface ErrorInfo {
    code: string;
    message: string;
    statusCode?: number;
    isRetryable?: boolean;
}

// Service Interfaces
export interface ITranscriptionService {
    transcribe(file: TFile | File, options?: { signal?: AbortSignal }): Promise<TranscriptionResult>;
    cancel(): void;
    getStatus(): TranscriptionStatus;
}

export interface IWhisperService {
    transcribe(audio: ArrayBuffer | Blob, options?: WhisperOptions): Promise<WhisperResponse>;
    validateApiKey(key: string): Promise<boolean>;
    cancel(): void;
}

export interface IAudioProcessor {
    validate(file: TFile): Promise<ValidationResult>;
    process(file: TFile): Promise<ProcessedAudio>;
    extractMetadata(buffer: ArrayBuffer): Promise<AudioMetadata>;
}

export interface ITextFormatter {
    format(text: string, options?: FormatOptions): string;
    insertTimestamps(text: string, segments: TranscriptionSegment[]): string;
    cleanUp(text: string): string;
}

export interface FormatOptions {
    includeTimestamps?: boolean;
    timestampFormat?: 'inline' | 'sidebar' | 'none';
    language?: string;
    cleanupText?: boolean;
}

export interface IEventManager {
    emit(event: string, data?: unknown): void;
    on(event: string, handler: EventHandler): Unsubscribe;
    once(event: string, handler: EventHandler): Unsubscribe;
    off(event: string, handler?: EventHandler): void;
    removeAllListeners(event?: string): void;
}

export interface IStateManager {
    getState(): Readonly<AppState>;
    setState(updates: Partial<AppState>): void;
    subscribe(listener: StateListener): Unsubscribe;
    reset(): void;
}

export interface ISettingsManager {
    load(): Promise<unknown>;
    save(settings: unknown): Promise<void>;
    get<K extends string>(key: K): unknown;
    set<K extends string>(key: K, value: unknown): Promise<void>;
}

export interface ICacheManager {
    get<T = unknown>(key: string): Promise<T | null>;
    set<T = unknown>(key: string, value: T, ttl?: number): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
}

export interface ILogger {
    debug<TContext = Record<string, unknown>>(message: string, context?: TContext): void;
    info<TContext = Record<string, unknown>>(message: string, context?: TContext): void;
    warn<TContext = Record<string, unknown>>(message: string, context?: TContext): void;
    error<TContext = Record<string, unknown>>(message: string, error?: Error, context?: TContext): void;
}

export type ObsidianEditor = Editor;
export type ObsidianEditorPosition = EditorPosition;
export type ObsidianMarkdownView = MarkdownView;
