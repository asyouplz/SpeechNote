import type { ILogger, WhisperOptions, WhisperResponse } from '../../../../types';
import {
    ITranscriber,
    TranscriptionProvider,
    TranscriptionOptions,
    TranscriptionResponse,
    ProviderCapabilities,
    ProviderConfig
} from '../ITranscriber';
import { WhisperService } from '../../WhisperService';

/**
 * WhisperService를 ITranscriber 인터페이스에 맞게 변환하는 Adapter
 * 기존 WhisperService의 모든 기능을 유지하면서 새로운 인터페이스와 호환
 */
export class WhisperAdapter implements ITranscriber {
    private config: ProviderConfig;

    private normalizeError(error: unknown): Error {
        return error instanceof Error ? error : new Error('Unknown error');
    }
    
    constructor(
        private whisperService: WhisperService,
        private logger: ILogger,
        config?: Partial<ProviderConfig>
    ) {
        this.config = {
            enabled: true,
            apiKey: '',
            model: 'whisper-1',
            maxConcurrency: 1,
            timeout: 30000,
            ...config
        };
    }
    
    /**
     * 오디오를 텍스트로 전사
     */
    async transcribe(
        audio: ArrayBuffer,
        options?: TranscriptionOptions
    ): Promise<TranscriptionResponse> {
        const startTime = Date.now();
        
        try {
            // 옵션 변환
            const whisperOptions = this.convertOptions(options);
            
            // 기존 WhisperService 호출
            const response = await this.whisperService.transcribe(audio, whisperOptions);
            
            const processingTime = Date.now() - startTime;
            
            // 응답 변환
            return this.convertResponse(response, processingTime);
        } catch (error) {
            const normalizedError = this.normalizeError(error);
            this.logger.error('WhisperAdapter: Transcription failed', normalizedError);
            throw normalizedError;
        }
    }
    
    /**
     * TranscriptionOptions를 WhisperOptions로 변환
     */
    private convertOptions(options?: TranscriptionOptions): WhisperOptions {
        const whisperOptions: WhisperOptions = {
            model: options?.model || this.config.model || 'whisper-1',
            language: options?.language
        };
        
        // Whisper 전용 옵션 적용
        if (options?.whisper) {
            const specific = options.whisper;
            
            if (specific.temperature !== undefined) {
                whisperOptions.temperature = specific.temperature;
            }
            
            if (specific.prompt) {
                whisperOptions.prompt = specific.prompt;
            }
            
            if (specific.responseFormat) {
                whisperOptions.responseFormat = specific.responseFormat;
            }
        }
        
        // verbose_json을 기본값으로 설정 (세그먼트 정보를 위해)
        if (!whisperOptions.responseFormat) {
            whisperOptions.responseFormat = 'verbose_json';
        }
        
        return whisperOptions;
    }
    
    /**
     * WhisperResponse를 TranscriptionResponse로 변환
     */
    private convertResponse(
        response: WhisperResponse,
        processingTime: number
    ): TranscriptionResponse {
        const wordCount = response.text.split(/\s+/).filter(word => word.length > 0).length;
        
        return {
            text: response.text,
            language: response.language,
            duration: response.duration,
            segments: response.segments?.map((segment, index) => ({
                id: segment.id ?? index,
                start: segment.start,
                end: segment.end,
                text: segment.text,
                confidence: segment.no_speech_prob ? 1 - segment.no_speech_prob : undefined
            })),
            provider: 'whisper',
            metadata: {
                model: 'whisper-1',
                processingTime,
                wordCount
            }
        };
    }
    
    /**
     * API 키 검증
     */
    validateApiKey(key: string): Promise<boolean> {
        return this.whisperService.validateApiKey(key);
    }
    
    /**
     * 진행 중인 전사 취소
     */
    cancel(): void {
        this.whisperService.cancel();
    }
    
    /**
     * Provider 이름 반환
     */
    getProviderName(): string {
        return 'OpenAI Whisper';
    }
    
    /**
     * Provider 능력 반환
     */
    getCapabilities(): ProviderCapabilities {
        return {
            streaming: false,
            realtime: false,
            languages: [
                'en', 'zh', 'de', 'es', 'ru', 'ko', 'fr', 'ja', 'pt', 'tr',
                'pl', 'ca', 'nl', 'ar', 'sv', 'it', 'id', 'hi', 'fi', 'vi',
                'he', 'uk', 'el', 'ms', 'cs', 'ro', 'da', 'hu', 'ta', 'no',
                'th', 'ur', 'hr', 'bg', 'lt', 'la', 'mi', 'ml', 'cy', 'sk',
                'te', 'fa', 'lv', 'bn', 'sr', 'az', 'sl', 'kn', 'et', 'mk',
                'br', 'eu', 'is', 'hy', 'ne', 'mn', 'bs', 'kk', 'sq', 'sw',
                'gl', 'mr', 'pa', 'si', 'km', 'sn', 'yo', 'so', 'af', 'oc',
                'ka', 'be', 'tg', 'sd', 'gu', 'am', 'yi', 'lo', 'uz', 'fo',
                'ht', 'ps', 'tk', 'nn', 'mt', 'sa', 'lb', 'my', 'bo', 'tl',
                'mg', 'as', 'tt', 'haw', 'ln', 'ha', 'ba', 'jw', 'su'
            ],
            maxFileSize: 25 * 1024 * 1024, // 25MB
            audioFormats: ['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm'],
            features: [
                'transcription',
                'translation',
                'timestamps',
                'language_detection',
                'word_timestamps'
            ],
            models: ['whisper-1']
        };
    }
    
    /**
     * Provider 상태 확인
     */
    async isAvailable(): Promise<boolean> {
        try {
            // Circuit Breaker 상태 확인을 위한 간단한 테스트
            const testAudio = new ArrayBuffer(1024);
            await this.whisperService.transcribe(testAudio, {
                responseFormat: 'text'
            });
            return true;
        } catch (error) {
            const errorMessage = this.normalizeError(error).message.toLowerCase();
            
            // Circuit Breaker가 열려있거나 일시적인 문제인 경우
            if (errorMessage.includes('circuit') || 
                errorMessage.includes('unavailable') ||
                errorMessage.includes('timeout')) {
                return false;
            }
            
            // API 키 문제나 다른 영구적인 문제는 사용 가능한 것으로 간주
            return true;
        }
    }
    
    /**
     * 현재 설정 반환
     */
    getConfig(): ProviderConfig {
        return { ...this.config };
    }
    
    /**
     * Circuit Breaker 리셋
     */
    resetCircuitBreaker(): void {
        this.whisperService.resetCircuitBreaker();
    }
    
    /**
     * 설정 업데이트
     */
    updateConfig(config: Partial<ProviderConfig>): void {
        this.config = {
            ...this.config,
            ...config
        };
    }
}
