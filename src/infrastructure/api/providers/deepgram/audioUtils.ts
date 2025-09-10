/**
 * 오디오 처리 관련 유틸리티 클래스들
 * DeepgramService에서 분리하여 단일 책임 원칙 적용
 */

import type { ILogger } from '../../../../types';
import { AUDIO_VALIDATION, AUDIO_FORMATS, ERROR_MESSAGES, RELIABILITY, DEEPGRAM_API } from './constants';

/**
 * 오디오 검증 결과 타입
 */
export interface AudioValidationResult {
    isValid: boolean;
    warnings: string[];
    errors: string[];
    metadata: {
        size: number;
        isEmpty: boolean;
        hasMinimumSize: boolean;
        format?: string;
    };
}

/**
 * 무음 분석 결과 타입
 */
export interface SilenceAnalysisResult {
    isSilent: boolean;
    averageAmplitude: number;
    peakAmplitude: number;
}

/**
 * 오디오 검증 유틸리티
 */
export class AudioValidator {
    constructor(private logger: ILogger) {}
    
    /**
     * 오디오 데이터의 기본적인 검증을 수행합니다.
     */
    validateAudio(audio: ArrayBuffer): AudioValidationResult {
        const warnings: string[] = [];
        const errors: string[] = [];
        const metadata = {
            size: audio.byteLength,
            isEmpty: audio.byteLength === 0,
            hasMinimumSize: audio.byteLength >= AUDIO_VALIDATION.MIN_HEADER_SIZE,
            format: this.detectAudioFormat(audio)
        };
        
        this.performBasicValidation(metadata, errors);
        this.performSizeWarnings(metadata, warnings);
        
        const isValid = errors.length === 0;
        
        this.logger.debug('Audio validation completed', {
            isValid,
            warnings: warnings.length,
            errors: errors.length,
            metadata
        });
        
        return { isValid, warnings, errors, metadata };
    }
    
    /**
     * 오디오가 무음인지 간단히 체크합니다 (WAV 형식만).
     */
    checkForSilence(audio: ArrayBuffer): SilenceAnalysisResult {
        if (audio.byteLength < AUDIO_VALIDATION.MIN_HEADER_SIZE) {
            return { isSilent: true, averageAmplitude: 0, peakAmplitude: 0 };
        }
        
        // WAV 형식인지 확인
        if (!this.isWavFormat(audio)) {
            return { isSilent: false, averageAmplitude: -1, peakAmplitude: -1 };
        }
        
        return this.analyzeSilence(audio);
    }

    /**
     * 기본 검증 수행
     */
    private performBasicValidation(metadata: any, errors: string[]): void {
        if (metadata.isEmpty) {
            errors.push(ERROR_MESSAGES.AUDIO_VALIDATION.EMPTY);
        }
        
        if (!metadata.hasMinimumSize && !metadata.isEmpty) {
            errors.push(ERROR_MESSAGES.AUDIO_VALIDATION.TOO_SMALL);
        }
        
        if (metadata.size > AUDIO_VALIDATION.SIZE_WARNING_LARGE) {
            errors.push(ERROR_MESSAGES.AUDIO_VALIDATION.TOO_LARGE);
        }
    }

    /**
     * 크기 관련 경고 수행
     */
    private performSizeWarnings(metadata: any, warnings: string[]): void {
        if (metadata.size < AUDIO_VALIDATION.SIZE_WARNING_THRESHOLD) {
            warnings.push(ERROR_MESSAGES.AUDIO_VALIDATION.VERY_SMALL_WARNING);
        }
        
        if (metadata.size > AUDIO_VALIDATION.SIZE_WARNING_LARGE) {
            warnings.push(ERROR_MESSAGES.AUDIO_VALIDATION.LARGE_WARNING);
        }
    }

    /**
     * WAV 형식 여부 확인
     */
    private isWavFormat(audio: ArrayBuffer): boolean {
        const view = new Uint8Array(audio, 0, 4);
        const wavSignature = AUDIO_FORMATS.SIGNATURES.WAV;
        return view[0] === wavSignature[0] && 
               view[1] === wavSignature[1] && 
               view[2] === wavSignature[2] && 
               view[3] === wavSignature[3];
    }

    /**
     * 무음 분석 수행
     */
    private analyzeSilence(audio: ArrayBuffer): SilenceAnalysisResult {
        try {
            // WAV 헤더 건너뛰고 오디오 데이터 샘플링
            const dataStart = AUDIO_VALIDATION.MIN_HEADER_SIZE;
            const sampleSize = Math.min(audio.byteLength - dataStart, AUDIO_VALIDATION.SAMPLE_SIZE);
            const samples = new Int16Array(audio, dataStart, sampleSize / 2);
            
            let sum = 0;
            let peak = 0;
            
            for (let i = 0; i < samples.length; i++) {
                const amplitude = Math.abs(samples[i]);
                sum += amplitude;
                peak = Math.max(peak, amplitude);
            }
            
            const averageAmplitude = samples.length > 0 ? sum / samples.length : 0;
            const isSilent = averageAmplitude < AUDIO_VALIDATION.SILENCE_THRESHOLD && 
                           peak < AUDIO_VALIDATION.SILENCE_THRESHOLD * AUDIO_VALIDATION.SILENCE_PEAK_MULTIPLIER;
            
            return { isSilent, averageAmplitude, peakAmplitude: peak };
        } catch (error) {
            this.logger.warn('Failed to analyze audio for silence', error as Error);
            return { isSilent: false, averageAmplitude: -1, peakAmplitude: -1 };
        }
    }
    
    /**
     * 오디오 형식을 간단히 감지합니다.
     */
    private detectAudioFormat(audio: ArrayBuffer): string | undefined {
        if (audio.byteLength < 12) return undefined;
        
        const view = new Uint8Array(audio, 0, 12);
        
        // 각 포맷별 시그니처 확인
        if (this.checkSignature(view, AUDIO_FORMATS.SIGNATURES.WAV, 0)) {
            return 'wav';
        }
        
        if (this.checkMP3Signature(view)) {
            return 'mp3';
        }
        
        if (this.checkSignature(view, AUDIO_FORMATS.SIGNATURES.FLAC, 0)) {
            return 'flac';
        }
        
        if (this.checkSignature(view, AUDIO_FORMATS.SIGNATURES.OGG, 0)) {
            return 'ogg';
        }
        
        if (view.length >= 8 && this.checkSignature(view, AUDIO_FORMATS.SIGNATURES.M4A_FTYP, 4)) {
            return 'm4a';
        }
        
        if (this.checkSignature(view, AUDIO_FORMATS.SIGNATURES.WEBM, 0)) {
            return 'webm';
        }
        
        this.logger.debug('Unknown audio format detected', {
            firstBytes: Array.from(view.slice(0, 8)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')
        });
        
        return 'unknown';
    }

    /**
     * 시그니처 패턴 확인
     */
    private checkSignature(view: Uint8Array, signature: readonly number[], offset: number): boolean {
        return signature.every((byte, index) => view[offset + index] === byte);
    }

    /**
     * MP3 특별 시그니처 확인 (복합 조건)
     */
    private checkMP3Signature(view: Uint8Array): boolean {
        // MP3 프레임 헤더 또는 ID3 태그
        return (view[0] === 0xFF && (view[1] & 0xE0) === 0xE0) || 
               this.checkSignature(view, AUDIO_FORMATS.SIGNATURES.MP3_ID3, 0);
    }
}

/**
 * Content-Type 매핑 유틸리티
 */
export class ContentTypeMapper {
    /**
     * 감지된 형식에 따른 Content-Type 반환
     */
    static getContentType(detectedFormat?: string): string {
        if (detectedFormat && AUDIO_FORMATS.CONTENT_TYPES[detectedFormat as keyof typeof AUDIO_FORMATS.CONTENT_TYPES]) {
            return AUDIO_FORMATS.CONTENT_TYPES[detectedFormat as keyof typeof AUDIO_FORMATS.CONTENT_TYPES];
        }
        return AUDIO_FORMATS.DEFAULT_CONTENT_TYPE;
    }
}

/**
 * 파일 크기 기반 타임아웃 계산 유틸리티
 */
export class TimeoutCalculator {
    constructor(private baseTimeout: number, private logger: ILogger) {}

    /**
     * 파일 크기에 따른 동적 타임아웃 계산
     */
    calculateDynamicTimeout(audioSize: number): number {
        const sizeMB = audioSize / (1024 * 1024);
        
        // 작은 파일은 기본 타임아웃 사용
        if (sizeMB <= RELIABILITY.TIMEOUT.SIZE_MB_THRESHOLD) {
            return this.baseTimeout;
        }
        
        // 큰 파일은 크기 기반 타임아웃 계산
        const estimatedProcessingTime = Math.max(
            sizeMB * RELIABILITY.TIMEOUT.PROCESSING_TIME_PER_MB,
            this.baseTimeout
        );
        
        // 버퍼 추가하고 최대값 제한
        const dynamicTimeout = Math.min(
            estimatedProcessingTime * RELIABILITY.TIMEOUT.BUFFER_MULTIPLIER,
            DEEPGRAM_API.MAX_TIMEOUT
        );
        
        this.logger.debug('Dynamic timeout calculation', {
            audioSizeMB: sizeMB,
            baseTimeout: this.baseTimeout,
            estimatedProcessingTime,
            finalTimeout: dynamicTimeout,
            timeoutMinutes: Math.round(dynamicTimeout / 60000)
        });
        
        return dynamicTimeout;
    }
}