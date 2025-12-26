/**
 * 화자 분리(Diarization) 텍스트 포맷팅 서비스
 * 
 * 핵심 기능:
 * - 단어 레벨 화자 정보를 세그먼트 레벨로 그룹화
 * - 연속된 같은 화자 발화 병합
 * - 사용자 정의 포맷팅 옵션 지원
 * - 메모리 효율적인 스트리밍 처리
 */

import type { ILogger } from '../../../../types';
import { DIARIZATION_DEFAULTS } from './constants';

// 타입 정의
export interface DiarizedWord {
    word: string;
    start: number;
    end: number;
    confidence: number;
    speaker?: number;
}

export interface DiarizedSegment {
    id: number;
    text: string;
    speaker: number;
    start: number;
    end: number;
    confidence: number;
    wordCount: number;
}

export interface DiarizationConfig {
    enabled: boolean;
    format: 'speaker_prefix' | 'speaker_block' | 'custom';
    speakerLabels: {
        prefix: string; // "Speaker", "화자", "발화자" 등
        numbering: 'numeric' | 'alphabetic' | 'custom';
        customLabels?: string[];
    };
    merging: {
        consecutiveThreshold: number; // 연속된 같은 화자 발화 병합 임계값 (초)
        minSegmentLength: number; // 최소 세그먼트 길이 (단어 수)
    };
    output: {
        includeTimestamps: boolean;
        includeConfidence: boolean;
        paragraphBreaks: boolean;
        lineBreaksBetweenSpeakers: boolean;
    };
}

export interface DiarizationStats {
    totalSpeakers: number;
    totalSegments: number;
    averageSegmentLength: number;
    speakerDistribution: Record<number, number>; // speaker -> segment count
    totalDuration: number;
    averageConfidence: number;
}

export interface DiarizationResult {
    formattedText: string;
    segments: DiarizedSegment[];
    speakerCount: number;
    statistics: DiarizationStats;
    originalWordCount: number;
}

/**
 * 기본 화자 분리 설정
 */
export const DEFAULT_DIARIZATION_CONFIG: DiarizationConfig = {
    enabled: true,
    format: 'speaker_prefix',
    speakerLabels: {
        prefix: 'Speaker',
        numbering: 'numeric'
    },
    merging: {
        consecutiveThreshold: DIARIZATION_DEFAULTS.CONSECUTIVE_THRESHOLD,
        minSegmentLength: DIARIZATION_DEFAULTS.MIN_SEGMENT_LENGTH
    },
    output: {
        includeTimestamps: false,
        includeConfidence: false,
        paragraphBreaks: true,
        lineBreaksBetweenSpeakers: true
    }
};

/**
 * 화자 분리 텍스트 포맷팅 클래스
 */
export class DiarizationFormatter {
    constructor(private logger: ILogger) {}

    /**
     * 단어 배열을 화자별로 그룹화하여 포맷된 텍스트를 생성합니다.
     */
    formatTranscript(
        words: DiarizedWord[], 
        config: DiarizationConfig = DEFAULT_DIARIZATION_CONFIG
    ): DiarizationResult {
        const startTime = Date.now();
        
        this.logFormatStart(words, config);

        // 화자 정보 검증 및 폴백 처리
        if (!this.hasSpeakerInformation(words)) {
            this.logger.debug('No speaker information found, returning original text');
            return this.createFallbackResult(words);
        }

        // 핵심 처리 파이프라인
        const result = this.processTranscriptWithSpeakers(words, config);
        
        this.logFormatComplete(result, Date.now() - startTime);
        return result;
    }

    /**
     * 화자 정보가 있는 경우의 처리 파이프라인
     */
    private processTranscriptWithSpeakers(
        words: DiarizedWord[], 
        config: DiarizationConfig
    ): DiarizationResult {
        const segments = this.buildSegments(words, config);
        this.logger.debug(`Created ${segments.length} segments from ${words.length} words`);

        const statistics = this.calculateStatistics(segments, words);
        const formattedText = this.formatSegments(segments, config);
        
        return {
            formattedText,
            segments,
            speakerCount: statistics.totalSpeakers,
            statistics,
            originalWordCount: words.length
        };
    }

    /**
     * 포맷팅 시작 로깅
     */
    private logFormatStart(words: DiarizedWord[], config: DiarizationConfig): void {
        this.logger.debug('=== DiarizationFormatter.formatTranscript START ===', {
            wordCount: words.length,
            config
        });
    }

    /**
     * 포맷팅 완료 로깅
     */
    private logFormatComplete(result: DiarizationResult, processingTime: number): void {
        this.logger.info('=== DiarizationFormatter.formatTranscript COMPLETE ===', {
            processingTime,
            speakerCount: result.speakerCount,
            segmentCount: result.segments.length,
            formattedTextLength: result.formattedText.length
        });
    }

    /**
     * 단어들이 화자 정보를 포함하는지 확인
     */
    private hasSpeakerInformation(words: DiarizedWord[]): boolean {
        return words.some(word => word.speaker !== undefined && word.speaker >= 0);
    }

    /**
     * 화자 정보가 없을 때 기본 결과 생성
     */
    private createFallbackResult(words: DiarizedWord[]): DiarizationResult {
        const text = words.map(w => w.word).join(' ');
        const totalDuration = words.length > 0 ? 
            words[words.length - 1].end - words[0].start : 0;

        return {
            formattedText: text,
            segments: [{
                id: 0,
                text,
                speaker: 0,
                start: words[0]?.start || 0,
                end: words[words.length - 1]?.end || 0,
                confidence: words.reduce((acc, w) => acc + w.confidence, 0) / words.length || 0,
                wordCount: words.length
            }],
            speakerCount: 1,
            statistics: {
                totalSpeakers: 1,
                totalSegments: 1,
                averageSegmentLength: words.length,
                speakerDistribution: { 0: 1 },
                totalDuration,
                averageConfidence: words.reduce((acc, w) => acc + w.confidence, 0) / words.length || 0
            },
            originalWordCount: words.length
        };
    }

    /**
     * 단어를 세그먼트로 그룹화 (메모리 효율적인 스트리밍 방식)
     */
    private buildSegments(words: DiarizedWord[], config: DiarizationConfig): DiarizedSegment[] {
        if (words.length === 0) return [];

        const segments: DiarizedSegment[] = [];
        let currentSegment: Partial<DiarizedSegment> | null = null;
        let segmentId = 0;

        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            
            if (this.shouldCreateNewSegment(word, currentSegment, config, i > 0 ? words[i-1] : null)) {
                // 현재 세그먼트를 완료하고 추가
                if (currentSegment && this.isValidSegment(currentSegment, config)) {
                    segments.push(this.finalizeSegment(currentSegment, segmentId++));
                }
                
                // 새 세그먼트 시작
                currentSegment = this.initializeSegment(word);
            } else if (currentSegment) {
                // 현재 세그먼트에 단어 추가
                this.appendToSegment(currentSegment, word);
            }
        }

        // 마지막 세그먼트 처리
        if (currentSegment && this.isValidSegment(currentSegment, config)) {
            segments.push(this.finalizeSegment(currentSegment, segmentId));
        }

        return segments;
    }

    /**
     * 새로운 세그먼트를 생성해야 하는지 판단
     */
    private shouldCreateNewSegment(
        currentWord: DiarizedWord,
        currentSegment: Partial<DiarizedSegment> | null,
        config: DiarizationConfig,
        previousWord: DiarizedWord | null
    ): boolean {
        // 첫 번째 단어인 경우
        if (!currentSegment) return true;

        // 화자가 변경된 경우
        if (currentSegment.speaker !== currentWord.speaker) return true;

        // 연속성 임계값 확인
        if (previousWord && currentSegment.end !== undefined) {
            const timeBetween = currentWord.start - previousWord.end;
            if (timeBetween > config.merging.consecutiveThreshold) {
                return true;
            }
        }

        return false;
    }

    /**
     * 새 세그먼트 초기화
     */
    private initializeSegment(word: DiarizedWord): Partial<DiarizedSegment> {
        return {
            text: word.word,
            speaker: word.speaker || 0,
            start: word.start,
            end: word.end,
            confidence: word.confidence,
            wordCount: 1
        };
    }

    /**
     * 세그먼트에 단어 추가
     */
    private appendToSegment(segment: Partial<DiarizedSegment>, word: DiarizedWord): void {
        segment.text = (segment.text || '') + ' ' + word.word;
        segment.end = word.end;
        segment.wordCount = (segment.wordCount || 0) + 1;
        
        // 평균 신뢰도 업데이트
        const totalConfidence = (segment.confidence || 0) * ((segment.wordCount || 1) - 1) + word.confidence;
        segment.confidence = totalConfidence / (segment.wordCount || 1);
    }

    /**
     * 세그먼트가 유효한지 확인
     */
    private isValidSegment(segment: Partial<DiarizedSegment>, config: DiarizationConfig): boolean {
        return (segment.wordCount || 0) >= config.merging.minSegmentLength &&
               (segment.text?.trim().length || 0) > 0;
    }

    /**
     * 세그먼트 완료
     */
    private finalizeSegment(segment: Partial<DiarizedSegment>, id: number): DiarizedSegment {
        return {
            id,
            text: (segment.text || '').trim(),
            speaker: segment.speaker || 0,
            start: segment.start || 0,
            end: segment.end || 0,
            confidence: segment.confidence || 0,
            wordCount: segment.wordCount || 0
        };
    }

    /**
     * 세그먼트를 포맷된 텍스트로 변환
     */
    private formatSegments(segments: DiarizedSegment[], config: DiarizationConfig): string {
        if (segments.length === 0) return '';

        const lines: string[] = [];

        for (const segment of segments) {
            const speakerLabel = this.generateSpeakerLabel(segment.speaker, config);
            let line = '';

            switch (config.format) {
                case 'speaker_prefix':
                    line = `${speakerLabel}: ${segment.text}`;
                    break;
                
                case 'speaker_block':
                    line = `${speakerLabel}\n${segment.text}`;
                    break;
                
                case 'custom':
                    line = this.applyCustomFormat(segment, speakerLabel, config);
                    break;
                
                default:
                    line = `${speakerLabel}: ${segment.text}`;
            }

            // 추가 정보 포함
            if (config.output.includeTimestamps) {
                const timestamp = `[${this.formatTime(segment.start)} - ${this.formatTime(segment.end)}]`;
                line = `${timestamp} ${line}`;
            }

            if (config.output.includeConfidence) {
                const confidence = `(${Math.round(segment.confidence * 100)}%)`;
                line = `${line} ${confidence}`;
            }

            lines.push(line);
        }

        // 화자 간 줄바꿈 처리
        if (config.output.lineBreaksBetweenSpeakers) {
            return this.insertSpeakerBreaks(lines, segments);
        }

        return lines.join('\n');
    }

    /**
     * 화자 라벨 생성
     */
    private generateSpeakerLabel(speakerNumber: number, config: DiarizationConfig): string {
        const { prefix, numbering, customLabels } = config.speakerLabels;

        if (customLabels && customLabels[speakerNumber]) {
            return customLabels[speakerNumber];
        }

        switch (numbering) {
            case 'alphabetic': {
                const letter = String.fromCharCode(65 + (speakerNumber % 26)); // A, B, C...
                return `${prefix} ${letter}`;
            }
            
            case 'numeric':
            default:
                return `${prefix} ${speakerNumber + 1}`;
        }
    }

    /**
     * 사용자 정의 포맷 적용
     */
    private applyCustomFormat(
        segment: DiarizedSegment, 
        speakerLabel: string, 
        _config: DiarizationConfig
    ): string {
        // 기본적으로 prefix 형태로 처리 (확장 가능)
        return `${speakerLabel}: ${segment.text}`;
    }

    /**
     * 화자 간 줄바꿈 삽입
     */
    private insertSpeakerBreaks(lines: string[], segments: DiarizedSegment[]): string {
        const result: string[] = [];
        let previousSpeaker: number | null = null;

        for (let i = 0; i < lines.length; i++) {
            const currentSpeaker = segments[i].speaker;
            
            // 화자가 변경된 경우 빈 줄 추가
            if (previousSpeaker !== null && previousSpeaker !== currentSpeaker) {
                result.push('');
            }
            
            result.push(lines[i]);
            previousSpeaker = currentSpeaker;
        }

        return result.join('\n');
    }

    /**
     * 시간을 MM:SS 형식으로 포맷
     */
    private formatTime(seconds: number): string {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * 통계 계산
     */
    private calculateStatistics(segments: DiarizedSegment[], words: DiarizedWord[]): DiarizationStats {
        if (segments.length === 0) {
            return {
                totalSpeakers: 0,
                totalSegments: 0,
                averageSegmentLength: 0,
                speakerDistribution: {},
                totalDuration: 0,
                averageConfidence: 0
            };
        }

        // 화자별 세그먼트 수 계산
        const speakerDistribution: Record<number, number> = {};
        let totalConfidence = 0;
        let totalWordCount = 0;

        for (const segment of segments) {
            speakerDistribution[segment.speaker] = (speakerDistribution[segment.speaker] || 0) + 1;
            totalConfidence += segment.confidence;
            totalWordCount += segment.wordCount;
        }

        const totalDuration = words.length > 0 ? 
            words[words.length - 1].end - words[0].start : 0;

        return {
            totalSpeakers: Object.keys(speakerDistribution).length,
            totalSegments: segments.length,
            averageSegmentLength: segments.length > 0 ? totalWordCount / segments.length : 0,
            speakerDistribution,
            totalDuration,
            averageConfidence: segments.length > 0 ? totalConfidence / segments.length : 0
        };
    }

    /**
     * 설정 유효성 검증
     */
    validateConfig(config: DiarizationConfig): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (config.merging.consecutiveThreshold < 0) {
            errors.push('consecutiveThreshold must be non-negative');
        }

        if (config.merging.minSegmentLength < 1) {
            errors.push('minSegmentLength must be at least 1');
        }

        if (!config.speakerLabels.prefix.trim()) {
            errors.push('speakerLabels.prefix cannot be empty');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}
