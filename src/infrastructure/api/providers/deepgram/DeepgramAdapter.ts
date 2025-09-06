import type { ILogger, ISettingsManager } from '../../../../types';
import {
    ITranscriber,
    TranscriptionProvider,
    TranscriptionOptions,
    TranscriptionResponse,
    ProviderCapabilities,
    ProviderConfig,
    DeepgramSpecificOptions,
    TranscriptionError
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
        private settingsManager?: ISettingsManager,
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
        this.logger.debug('=== DeepgramAdapter.transcribe START ===', {
            audioSize: audio.byteLength,
            options
        });
        
        try {
            // 옵션 변환
            const deepgramOptions = this.convertOptions(options);
            const language = options?.language;
            
            this.logger.debug('Calling Deepgram API with options:', {
                deepgramOptions,
                language
            });
            
            // Deepgram API 호출
            const response = await this.deepgramService.transcribe(
                audio,
                deepgramOptions,
                language
            );
            
            this.logger.debug('Deepgram API response received:', {
                hasResponse: !!response,
                responseType: typeof response,
                hasResults: !!response?.results
            });
            
            // 응답 변환
            const result = this.deepgramService.parseResponse(response);
            
            this.logger.debug('Parsed response:', {
                hasText: !!result?.text,
                textLength: result?.text?.length || 0,
                textPreview: result?.text?.substring(0, 100)
            });
            
            // 처리 시간 업데이트
            result.metadata = {
                ...result.metadata,
                processingTime: Date.now() - startTime
            };
            
            this.logger.info('=== DeepgramAdapter.transcribe COMPLETE ===', {
                processingTime: result.metadata.processingTime,
                textLength: result.text?.length || 0,
                language: result.language
            });
            
            return result;
        } catch (error) {
            const errorObj = error as Error;
            
            // 에러 타입별로 사용자 친화적 메시지 제공
            if (errorObj instanceof TranscriptionError) {
                // 빈 transcript 에러의 경우 추가 컨텍스트 제공
                if (errorObj.code === 'EMPTY_TRANSCRIPT') {
                    this.logger.error('DeepgramAdapter: Empty transcript - providing user guidance', errorObj, {
                        originalMessage: errorObj.message,
                        audioSize: audio.byteLength,
                        language: options?.language,
                        model: options?.model
                    });
                    
                    // 사용자에게 실용적인 해결책 제시
                    const enhancedMessage = `음성을 텍스트로 변환할 수 없었습니다. ${errorObj.message}

다음 사항을 확인해 주세요:
• 오디오에 명확한 음성이 포함되어 있는지 확인
• 마이크 볼륨이 충분한지 확인
• 배경소음이 너무 크지 않은지 확인
• 지원되는 오디오 형식인지 확인 (WAV, MP3, FLAC 등)
• 언어 설정이 올바른지 확인`;

                    throw new TranscriptionError(
                        enhancedMessage,
                        errorObj.code,
                        errorObj.provider,
                        errorObj.isRetryable,
                        errorObj.statusCode
                    );
                }
                
                // 오디오 검증 에러의 경우
                if (errorObj.code === 'INVALID_AUDIO') {
                    this.logger.error('DeepgramAdapter: Invalid audio format', errorObj, {
                        originalMessage: errorObj.message,
                        audioSize: audio.byteLength
                    });
                    
                    const enhancedMessage = `오디오 파일에 문제가 있습니다: ${errorObj.message}

해결 방법:
• 올바른 오디오 파일을 선택했는지 확인
• 파일이 손상되지 않았는지 확인
• 지원되는 형식 (WAV, MP3, FLAC, OGG 등)인지 확인
• 파일 크기가 2GB를 초과하지 않는지 확인`;

                    throw new TranscriptionError(
                        enhancedMessage,
                        errorObj.code,
                        errorObj.provider,
                        errorObj.isRetryable,
                        errorObj.statusCode
                    );
                }
            }
            
            this.logger.error('DeepgramAdapter: Transcription failed', errorObj, {
                audioSize: audio.byteLength,
                options: options,
                errorType: errorObj.constructor.name
            });
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
        
        // 설정에서 기능 옵션 가져오기
        let deepgramFeatures: any = null;
        
        if (this.settingsManager) {
            const transcriptionSettings = this.settingsManager.get('transcription');
            deepgramFeatures = transcriptionSettings?.deepgram?.features;
            this.logger.debug('Using feature settings from settingsManager', deepgramFeatures);
        }
        
        if (deepgramFeatures) {
            this.logger.debug('Applying feature settings from UI', deepgramFeatures);
            
            // 기능 설정 매핑
            if (deepgramFeatures.punctuation !== undefined) {
                deepgramOptions.punctuate = deepgramFeatures.punctuation;
            }
            if (deepgramFeatures.smartFormat !== undefined) {
                deepgramOptions.smartFormat = deepgramFeatures.smartFormat;
            }
            if (deepgramFeatures.diarization !== undefined) {
                deepgramOptions.diarize = deepgramFeatures.diarization;
            }
            if (deepgramFeatures.numerals !== undefined) {
                deepgramOptions.numerals = deepgramFeatures.numerals;
            }
        }
        
        // Deepgram 전용 옵션 적용 (우선순위 높음)
        if (options?.deepgram) {
            Object.assign(deepgramOptions, options.deepgram);
        }
        
        this.logger.debug('Final Deepgram options', deepgramOptions);
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