import type { ILogger } from '../../types';

export interface AudioValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    metadata: {
        format: string;
        estimatedDuration?: number;
        fileSize: number;
        hasValidHeader: boolean;
    };
}

export interface SilenceCheckResult {
    isSilent: boolean;
    averageAmplitude: number;
    peakAmplitude: number;
    confidenceLevel: number;
}

/**
 * 오디오 파일 검증 및 분석 클래스
 */
export class AudioValidator {
    private readonly AUDIO_SIGNATURES = {
        wav: [0x52, 0x49, 0x46, 0x46], // RIFF
        mp3: [0xff, 0xfb], // MP3 frame header (일반적인 경우)
        m4a: [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70], // M4A container
        flac: [0x66, 0x4c, 0x61, 0x43], // fLaC
        ogg: [0x4f, 0x67, 0x67, 0x53], // OggS
        webm: [0x1a, 0x45, 0xdf, 0xa3], // WebM
    };

    constructor(private logger: ILogger) {}

    /**
     * 오디오 데이터 검증
     */
    validateAudio(audioBuffer: ArrayBuffer): AudioValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];
        const uint8Array = new Uint8Array(audioBuffer);

        // 파일 크기 검증
        if (audioBuffer.byteLength === 0) {
            errors.push('Audio buffer is empty');
        }

        if (audioBuffer.byteLength < 100) {
            warnings.push('Audio file is very small, may not contain sufficient data');
        }

        // 형식 감지
        const detectedFormat = this.detectFormat(uint8Array);
        const hasValidHeader = detectedFormat !== 'unknown';

        if (!hasValidHeader) {
            warnings.push('Could not detect audio format from file header');
        }

        this.logger.debug('Audio validation completed', {
            fileSize: audioBuffer.byteLength,
            detectedFormat,
            hasValidHeader,
            errorsCount: errors.length,
            warningsCount: warnings.length,
        });

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            metadata: {
                format: detectedFormat,
                fileSize: audioBuffer.byteLength,
                hasValidHeader,
                estimatedDuration: this.estimateDuration(audioBuffer, detectedFormat),
            },
        };
    }

    /**
     * 바이너리 헤더로 오디오 형식 감지
     */
    private detectFormat(uint8Array: Uint8Array): string {
        for (const [format, signature] of Object.entries(this.AUDIO_SIGNATURES)) {
            if (this.matchesSignature(uint8Array, signature)) {
                return format;
            }
        }

        // MP3의 다른 가능한 헤더들 확인
        if (this.isMP3(uint8Array)) {
            return 'mp3';
        }

        return 'unknown';
    }

    /**
     * 시그니처 매칭 확인
     */
    private matchesSignature(data: Uint8Array, signature: number[]): boolean {
        if (data.length < signature.length) {
            return false;
        }

        for (let i = 0; i < signature.length; i++) {
            if (data[i] !== signature[i]) {
                return false;
            }
        }
        return true;
    }

    /**
     * MP3 형식 확인 (다양한 헤더 패턴)
     */
    private isMP3(data: Uint8Array): boolean {
        if (data.length < 2) return false;

        // ID3 태그가 있는 MP3
        if (data[0] === 0x49 && data[1] === 0x44 && data[2] === 0x33) {
            return true;
        }

        // 다양한 MP3 프레임 헤더
        const firstByte = data[0];
        const secondByte = data[1];

        return firstByte === 0xff && (secondByte & 0xe0) === 0xe0;
    }

    /**
     * 대략적인 재생 시간 추정
     */
    private estimateDuration(buffer: ArrayBuffer, format: string): number | undefined {
        // 간단한 추정 공식 (실제로는 더 복잡한 계산 필요)
        const fileSizeKB = buffer.byteLength / 1024;

        switch (format) {
            case 'mp3':
                // MP3: 평균 128kbps 가정
                return (fileSizeKB * 8) / 128;
            case 'wav':
                // WAV: 대략 1.4MB/분 가정
                return fileSizeKB / 1400;
            case 'm4a':
                // M4A: 평균 96kbps 가정
                return (fileSizeKB * 8) / 96;
            default:
                return undefined;
        }
    }

    /**
     * 무음 검사 (WAV 전용)
     */
    checkForSilence(audioBuffer: ArrayBuffer): SilenceCheckResult {
        const uint8Array = new Uint8Array(audioBuffer);

        // WAV 헤더 스킵 (일반적으로 44바이트)
        const dataStart = this.findWAVDataStart(uint8Array) || 44;
        const audioData = uint8Array.slice(dataStart);

        let sum = 0;
        let peak = 0;
        let sampleCount = 0;

        // 16비트 샘플로 가정하고 분석
        for (let i = 0; i < audioData.length - 1; i += 2) {
            const sample = Math.abs((audioData[i + 1] << 8) | audioData[i]);
            sum += sample;
            peak = Math.max(peak, sample);
            sampleCount++;
        }

        const averageAmplitude = sampleCount > 0 ? sum / sampleCount : 0;
        const normalizedAverage = averageAmplitude / 32768; // 16비트 최대값으로 정규화
        const normalizedPeak = peak / 32768;

        // 무음 판단 임계값
        const silenceThreshold = 0.01; // 1%
        const isSilent = normalizedAverage < silenceThreshold && normalizedPeak < 0.05;

        return {
            isSilent,
            averageAmplitude: normalizedAverage,
            peakAmplitude: normalizedPeak,
            confidenceLevel: isSilent ? 0.9 : 0.1,
        };
    }

    /**
     * WAV 파일에서 실제 오디오 데이터 시작 위치 찾기
     */
    private findWAVDataStart(data: Uint8Array): number | null {
        // "data" 청크 찾기
        for (let i = 0; i < data.length - 4; i++) {
            if (
                data[i] === 0x64 &&
                data[i + 1] === 0x61 &&
                data[i + 2] === 0x74 &&
                data[i + 3] === 0x61
            ) {
                return i + 8; // "data" + 크기(4바이트) 스킵
            }
        }
        return null;
    }
}
