import type { ILogger } from '../../../../types';
import {
    ITranscriber,
    TranscriptionProvider,
    TranscriptionOptions,
    TranscriptionResponse,
    ProviderCapabilities,
    ProviderConfig,
    DeepgramSpecificOptions
} from '../ITranscriber';
import { DeepgramService } from './DeepgramService';

/**
 * DeepgramService를 ITranscriber 인터페이스에 맞게 변환하는 Adapter
 * Deepgram API의 모든 기능을 통합 인터페이스로 제공
 */
export class DeepgramAdapter implements ITranscriber {
    private config: ProviderConfig;
    
    constructor(
        private deepgramService: DeepgramService,
        private logger: ILogger,
        config?: Partial<ProviderConfig>
    ) {
        this.config = {
            enabled: true,
            apiKey: '',
            model: 'nova-2',
            maxConcurrency: 5,
            timeout: 30000,
            rateLimit: {
                requests: 100,
                window: 60000 // 1분
            },
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
            const deepgramOptions = this.convertOptions(options);
            const language = options?.language;
            
            // Deepgram API 호출
            const response = await this.deepgramService.transcribe(
                audio,
                deepgramOptions,
                language
            );
            
            // 응답 변환
            const result = this.deepgramService.parseResponse(response);
            
            // 처리 시간 업데이트
            result.metadata = {
                ...result.metadata,
                processingTime: Date.now() - startTime
            };
            
            return result;
        } catch (error) {
            this.logger.error('DeepgramAdapter: Transcription failed', error as Error);
            throw error;
        }
    }
    
    /**
     * TranscriptionOptions를 DeepgramSpecificOptions로 변환
     */
    private convertOptions(options?: TranscriptionOptions): DeepgramSpecificOptions {
        const deepgramOptions: DeepgramSpecificOptions = {
            tier: 'nova-2',
            punctuate: true,
            smartFormat: true
        };
        
        // 모델을 tier로 매핑
        if (options?.model) {
            const modelToTier: Record<string, any> = {
                'nova-2': 'nova-2',
                'nova': 'nova-2',
                'enhanced': 'enhanced',
                'base': 'base'
            };
            
            if (modelToTier[options.model]) {
                deepgramOptions.tier = modelToTier[options.model];
            }
        }
        
        // Deepgram 전용 옵션 적용
        if (options?.deepgram) {
            Object.assign(deepgramOptions, options.deepgram);
        }
        
        return deepgramOptions;
    }
    
    /**
     * API 키 검증
     */
    async validateApiKey(key: string): Promise<boolean> {
        return this.deepgramService.validateApiKey(key);
    }
    
    /**
     * 진행 중인 전사 취소
     */
    cancel(): void {
        this.deepgramService.cancel();
    }
    
    /**
     * Provider 이름 반환
     */
    getProviderName(): string {
        return 'Deepgram';
    }
    
    /**
     * Provider 능력 반환
     */
    getCapabilities(): ProviderCapabilities {
        return {
            streaming: true,
            realtime: true,
            languages: [
                'en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'ru', 'zh', 'ja',
                'ko', 'ar', 'tr', 'hi', 'pl', 'sv', 'da', 'no', 'fi', 'el',
                'he', 'id', 'ms', 'th', 'vi', 'ta', 'te', 'uk', 'cs', 'ro',
                'hu', 'bg', 'ca', 'hr', 'sr', 'sl', 'sk', 'lt', 'lv', 'et',
                'is', 'mk', 'sq', 'eu', 'gl', 'cy', 'bn', 'ur', 'fa', 'gu',
                'mr', 'pa', 'kn', 'ml', 'or', 'as', 'ne', 'si', 'my', 'km',
                'lo', 'ka', 'hy', 'az', 'kk', 'uz', 'tg', 'ky', 'tk', 'mn',
                'bo', 'am', 'ti', 'so', 'sw', 'rw', 'yo', 'ig', 'ha', 'zu',
                'xh', 'af', 'mt', 'lb', 'ga', 'gd', 'br', 'fy', 'yi', 'jv',
                'su', 'tl', 'ceb', 'haw', 'eo', 'la'
            ],
            maxFileSize: 2 * 1024 * 1024 * 1024, // 2GB
            audioFormats: [
                'mp3', 'mp4', 'wav', 'flac', 'ogg', 'opus', 
                'm4a', 'webm', 'amr', 'ac3', 'aac', 'wma'
            ],
            features: [
                'transcription',
                'punctuation',
                'smart_formatting',
                'diarization',
                'numerals',
                'profanity_filter',
                'redaction',
                'keywords',
                'language_detection',
                'streaming',
                'real_time',
                'multi_channel',
                'custom_vocabulary',
                'sentiment_analysis',
                'topic_detection',
                'entity_detection',
                'summarization'
            ],
            models: ['nova-2', 'enhanced', 'base']
        };
    }
    
    /**
     * Provider 상태 확인
     */
    async isAvailable(): Promise<boolean> {
        try {
            // 간단한 테스트 요청으로 가용성 확인
            const testAudio = new ArrayBuffer(1024);
            await this.deepgramService.transcribe(testAudio);
            return true;
        } catch (error) {
            const errorMessage = (error as Error).message.toLowerCase();
            
            // 일시적인 문제인 경우
            if (errorMessage.includes('circuit') || 
                errorMessage.includes('unavailable') ||
                errorMessage.includes('timeout') ||
                errorMessage.includes('rate limit')) {
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
        this.deepgramService.resetCircuitBreaker();
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
    
    /**
     * 비용 계산 (추정치)
     * Deepgram 요금: https://deepgram.com/pricing
     */
    estimateCost(duration: number, model?: string): number {
        const tier = model || this.config.model || 'nova-2';
        
        // 분당 비용 (USD)
        const costPerMinute: Record<string, number> = {
            'nova-2': 0.0043,
            'enhanced': 0.0145,
            'base': 0.0125
        };
        
        const minutes = duration / 60;
        const rate = costPerMinute[tier] || costPerMinute['nova-2'];
        
        return minutes * rate;
    }
}