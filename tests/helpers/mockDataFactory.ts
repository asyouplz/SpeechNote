/**
 * 테스트용 Mock 데이터 팩토리
 * 테스트에서 재사용 가능한 mock 데이터 생성 함수들을 제공합니다.
 */

import { TFile, Vault } from 'obsidian';
import type {
    WhisperResponse,
    TranscriptionResult,
    TranscriptionSegment,
    ValidationResult,
    ProcessedAudio,
    AudioMetadata,
    FormatOptions
} from '../../src/types';
import type { SpeechToTextSettings } from '../../src/domain/models/Settings';

/**
 * Mock 오디오 파일 생성
 */
export function createMockAudioFile(options: {
    name?: string;
    path?: string;
    extension?: string;
    size?: number;
    mtime?: number;
    ctime?: number;
} = {}): TFile {
    const defaults = {
        name: 'test-audio.mp3',
        path: 'test-audio.mp3',
        extension: 'mp3',
        size: 1024 * 1024, // 1MB
        mtime: Date.now(),
        ctime: Date.now()
    };

    const config = { ...defaults, ...options };

    return {
        name: config.name,
        path: config.path,
        extension: config.extension,
        stat: {
            size: config.size,
            mtime: config.mtime,
            ctime: config.ctime
        },
        vault: {} as Vault,
        basename: config.name.replace(/\.[^/.]+$/, '')
    } as TFile;
}

/**
 * Mock ArrayBuffer 생성
 */
export function createMockArrayBuffer(size: number = 1024): ArrayBuffer {
    const buffer = new ArrayBuffer(size);
    const view = new Uint8Array(buffer);
    
    // 간단한 패턴으로 채우기
    for (let i = 0; i < size; i++) {
        view[i] = i % 256;
    }
    
    return buffer;
}

/**
 * Mock Whisper API 응답 생성
 */
export function createMockWhisperResponse(options: {
    text?: string;
    language?: string;
    duration?: number;
    segments?: Array<{ start: number; end: number; text: string }>;
} = {}): WhisperResponse {
    const defaults = {
        text: '안녕하세요. 테스트 변환 텍스트입니다.',
        language: 'ko',
        duration: 5.5
    };

    const config = { ...defaults, ...options };

    const response: WhisperResponse = {
        text: config.text,
        language: config.language,
        duration: config.duration
    };

    if (config.segments) {
        response.segments = config.segments;
    }

    return response;
}

/**
 * Mock TranscriptionResult 생성
 */
export function createMockTranscriptionResult(options: {
    text?: string;
    language?: string;
    segments?: TranscriptionSegment[];
} = {}): TranscriptionResult {
    const defaults = {
        text: '변환된 텍스트입니다.',
        language: 'ko'
    };

    const config = { ...defaults, ...options };

    return {
        text: config.text,
        language: config.language,
        segments: config.segments
    };
}

/**
 * Mock Settings 생성
 */
export function createMockSettings(overrides: Partial<SpeechToTextSettings> = {}): SpeechToTextSettings {
    return {
        apiKey: 'test-api-key',
        apiEndpoint: 'https://api.openai.com/v1/audio/transcriptions',
        language: 'ko',
        autoInsert: true,
        insertPosition: 'cursor',
        timestampFormat: 'none',
        saveAudioFiles: false,
        audioSaveLocation: 'recordings',
        maxFileSize: 25,
        model: 'whisper-1',
        temperature: 0.2,
        responseFormat: 'json',
        prompt: '',
        shortcuts: {
            startRecording: 'Ctrl+Shift+R',
            stopRecording: 'Ctrl+Shift+S',
            insertTranscription: 'Ctrl+Shift+I'
        },
        ui: {
            showNotifications: true,
            notificationDuration: 5000,
            confirmBeforeInsert: false,
            showProgressBar: true,
            theme: 'auto'
        },
        advanced: {
            enableDebugMode: false,
            retryAttempts: 3,
            retryDelay: 1000,
            timeout: 30000,
            enableCache: true,
            cacheExpiration: 3600000
        },
        ...overrides
    };
}

/**
 * Mock ValidationResult 생성
 */
export function createMockValidationResult(options: {
    valid?: boolean;
    errors?: string[];
    warnings?: string[];
} = {}): ValidationResult {
    const defaults = {
        valid: true
    };

    const config = { ...defaults, ...options };

    return {
        valid: config.valid,
        errors: config.errors,
        warnings: config.warnings
    };
}

/**
 * Mock ProcessedAudio 생성
 */
export function createMockProcessedAudio(options: {
    buffer?: ArrayBuffer;
    metadata?: Partial<AudioMetadata>;
    originalFile?: TFile;
    compressed?: boolean;
} = {}): ProcessedAudio {
    const defaults = {
        buffer: createMockArrayBuffer(1024),
        metadata: createMockAudioMetadata(),
        originalFile: createMockAudioFile(),
        compressed: false
    };

    const config = { ...defaults, ...options };

    return {
        buffer: config.buffer,
        metadata: { ...defaults.metadata, ...config.metadata },
        originalFile: config.originalFile,
        compressed: config.compressed
    };
}

/**
 * Mock AudioMetadata 생성
 */
export function createMockAudioMetadata(overrides: Partial<AudioMetadata> = {}): AudioMetadata {
    return {
        duration: 10.5,
        bitrate: 128000,
        sampleRate: 44100,
        channels: 2,
        codec: 'mp3',
        ...overrides
    };
}

/**
 * Mock FormatOptions 생성
 */
export function createMockFormatOptions(overrides: Partial<FormatOptions> = {}): FormatOptions {
    return {
        includeTimestamps: false,
        timestampFormat: 'inline',
        cleanupText: true,
        paragraphBreaks: true,
        ...overrides
    };
}

/**
 * Mock Error 생성
 */
export function createMockError(message: string = 'Test error', code?: string): Error {
    const error = new Error(message);
    if (code) {
        (error as any).code = code;
    }
    return error;
}

/**
 * Mock API 에러 응답 생성
 */
export function createMockAPIErrorResponse(status: number, message: string) {
    return {
        status,
        json: {
            error: {
                message,
                type: 'error',
                code: `error_${status}`
            }
        },
        headers: {}
    };
}

/**
 * Mock File 객체 생성 (브라우저 File API)
 */
export function createMockFile(options: {
    name?: string;
    size?: number;
    type?: string;
    lastModified?: number;
} = {}): File {
    const defaults = {
        name: 'test.mp3',
        size: 1024 * 1024,
        type: 'audio/mp3',
        lastModified: Date.now()
    };

    const config = { ...defaults, ...options };
    const buffer = new ArrayBuffer(config.size);
    
    return new File([buffer], config.name, {
        type: config.type,
        lastModified: config.lastModified
    });
}

/**
 * Mock TranscriptionSegment 생성
 */
export function createMockTranscriptionSegment(options: {
    id?: number;
    start?: number;
    end?: number;
    text?: string;
} = {}): TranscriptionSegment {
    const defaults = {
        id: 0,
        start: 0,
        end: 5,
        text: '테스트 세그먼트 텍스트'
    };

    const config = { ...defaults, ...options };

    return {
        id: config.id,
        start: config.start,
        end: config.end,
        text: config.text
    };
}

/**
 * Mock 타임스탬프 배열 생성
 */
export function createMockSegments(count: number = 3): TranscriptionSegment[] {
    const segments: TranscriptionSegment[] = [];
    let currentTime = 0;

    for (let i = 0; i < count; i++) {
        const duration = 3 + Math.random() * 2; // 3-5초
        segments.push({
            id: i,
            start: currentTime,
            end: currentTime + duration,
            text: `세그먼트 ${i + 1} 텍스트입니다.`
        });
        currentTime += duration;
    }

    return segments;
}

/**
 * Mock Vault 생성
 */
export function createMockVault(): Partial<Vault> {
    return {
        readBinary: jest.fn().mockResolvedValue(createMockArrayBuffer()),
        read: jest.fn().mockResolvedValue('Test content'),
        modify: jest.fn().mockResolvedValue(undefined),
        create: jest.fn().mockResolvedValue({} as TFile),
        delete: jest.fn().mockResolvedValue(undefined),
        rename: jest.fn().mockResolvedValue(undefined)
    };
}

/**
 * WAV 파일 헤더를 가진 Mock ArrayBuffer 생성
 */
export function createMockWAVBuffer(sampleRate: number = 44100, duration: number = 1): ArrayBuffer {
    const numChannels = 1;
    const bitsPerSample = 16;
    const numSamples = sampleRate * duration;
    const dataSize = numSamples * numChannels * (bitsPerSample / 8);
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // WAV 헤더 작성
    const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
    view.setUint16(32, numChannels * (bitsPerSample / 8), true);
    view.setUint16(34, bitsPerSample, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    // 간단한 사인파 데이터 추가
    let offset = 44;
    const frequency = 440; // A4
    for (let i = 0; i < numSamples; i++) {
        const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate);
        const value = sample * 0x7FFF;
        view.setInt16(offset, value, true);
        offset += 2;
    }

    return buffer;
}