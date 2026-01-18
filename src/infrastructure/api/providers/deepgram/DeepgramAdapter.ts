import type { ILogger, ISettingsManager } from '../../../../types';
import type { TranscriptionSettings as SettingsStoreTranscriptionSettings } from '../../../../types/DeepgramTypes';
import {
    ITranscriber,
    TranscriptionOptions,
    TranscriptionResponse,
    ProviderCapabilities,
    ProviderConfig,
    DeepgramSpecificOptions,
    TranscriptionError,
} from '../ITranscriber';
import { DeepgramService } from './DeepgramService';
import { DiarizationConfig, DEFAULT_DIARIZATION_CONFIG } from './DiarizationFormatter';
import { AudioChunker } from './audioChunker';

/**
 * DeepgramService를 ITranscriber 인터페이스에 맞게 변환하는 Adapter
 * Deepgram API의 모든 기능을 통합 인터페이스로 제공
 */
export class DeepgramAdapter implements ITranscriber {
    private config: ProviderConfig;
    private audioChunker: AudioChunker;
    private static readonly DEFAULT_TIER: NonNullable<DeepgramSpecificOptions['tier']> = 'nova-3';

    constructor(
        private deepgramService: DeepgramService,
        private logger: ILogger,
        private settingsManager?: ISettingsManager,
        config?: Partial<ProviderConfig>
    ) {
        this.audioChunker = new AudioChunker(logger);
        this.config = {
            enabled: true,
            apiKey: '',
            model: 'nova-3', // Nova-3를 기본 모델로 변경
            maxConcurrency: 5,
            timeout: 30000,
            rateLimit: {
                requests: 100,
                window: 60000, // 1분
            },
            ...config,
        };
    }

    /**
     * 오디오를 텍스트로 전사
     */
    async transcribe(
        audio: ArrayBuffer,
        options?: TranscriptionOptions
    ): Promise<TranscriptionResponse> {
        const audioSizeMB = audio.byteLength / (1024 * 1024);

        this.logger.debug(
            '=== DeepgramAdapter.transcribe START ===',
            this.sanitizeForLogging({
                audioSize: audio.byteLength,
                audioSizeMB,
                options,
            })
        );

        try {
            // Check settings for auto-chunking
            const autoChunkingEnabled = this.settingsManager?.get('autoChunking') ?? true;

            // Check if chunking is needed and enabled
            if (autoChunkingEnabled && this.audioChunker.needsChunking(audio.byteLength)) {
                this.logger.info('Large file detected, using chunked processing', {
                    sizeMB: audioSizeMB,
                    recommendedSettings: this.audioChunker.getRecommendedSettings(audio.byteLength),
                });

                // Notify user about chunking
                if (audioSizeMB > 100) {
                    this.logger.warn(
                        `Very large audio file (${Math.round(
                            audioSizeMB
                        )}MB). Processing may take significant time. Consider reducing file size or bitrate for better performance.`
                    );
                }

                return await this.transcribeWithChunking(audio, options);
            }

            // Standard processing for smaller files
            return await this.transcribeStandard(audio, options);
        } catch (error) {
            const errorObj = error as Error;

            // Enhanced error handling for large files
            if (errorObj instanceof TranscriptionError && errorObj.code === 'SERVER_TIMEOUT') {
                const recommendations = this.audioChunker.getRecommendedSettings(audio.byteLength);

                this.logger.error('Timeout error - providing chunking recommendations', errorObj, {
                    audioSizeMB,
                    recommendations,
                });

                const enhancedMessage = `Transcription timeout for ${Math.round(
                    audioSizeMB
                )}MB file.\n\nRecommended solutions:\n- Enable automatic chunking (files will be split into ${
                    recommendations.estimatedChunks || 'multiple'
                } chunks)\n- Use '${
                    recommendations.recommendedModel
                }' model for faster processing\n- Reduce audio bitrate to ${
                    recommendations.recommendedBitrate || '128 kbps'
                }\n- Convert to MP3 or OGG format for smaller file size`;

                throw new TranscriptionError(
                    enhancedMessage,
                    errorObj.code,
                    errorObj.provider,
                    errorObj.isRetryable,
                    errorObj.statusCode
                );
            }

            // Handle other error types with enhanced messaging.
            const enhancedError = this.enhanceTranscriptionError(errorObj, audio, options);
            throw enhancedError;
        }
    }

    /**
     * Standard transcription without chunking
     */
    private async transcribeStandard(
        audio: ArrayBuffer,
        options?: TranscriptionOptions
    ): Promise<TranscriptionResponse> {
        const startTime = Date.now();

        try {
            // 옵션 변환
            const deepgramOptions = this.convertOptions(options);
            const language = options?.language;

            this.logger.debug(
                'Calling Deepgram API with options:',
                this.sanitizeForLogging({
                    deepgramOptions,
                    language,
                })
            );

            // Deepgram API 호출
            const response = await this.deepgramService.transcribe(
                audio,
                deepgramOptions,
                language
            );

            this.logger.debug('Deepgram API response received:', {
                hasResponse: !!response,
                responseType: typeof response,
                hasResults: !!response?.results,
            });

            // 화자 분리 설정 구성
            const diarizationConfig = this.createDiarizationConfig(deepgramOptions);

            // 응답 변환 (화자 분리 설정 포함)
            const result = this.deepgramService.parseResponse(response, diarizationConfig);

            this.logger.debug('Parsed response:', {
                hasText: !!result?.text,
                textLength: result?.text?.length || 0,
                textPreview: result?.text?.substring(0, 100),
            });

            // 처리 시간 업데이트
            result.metadata = {
                ...result.metadata,
                processingTime: Date.now() - startTime,
            };

            this.logger.info('=== DeepgramAdapter.transcribe COMPLETE ===', {
                processingTime: result.metadata.processingTime,
                textLength: result.text?.length || 0,
                language: result.language,
            });

            return result;
        } finally {
            // Cleanup if needed
        }
    }

    /**
     * Transcription with automatic chunking for large files
     */
    private async transcribeWithChunking(
        audio: ArrayBuffer,
        options?: TranscriptionOptions
    ): Promise<TranscriptionResponse> {
        const startTime = Date.now();

        try {
            // Split audio into chunks
            const chunks = await this.audioChunker.splitAudio(audio);
            this.logger.info(`Processing ${chunks.length} audio chunks`);

            // Process each chunk
            const chunkResults: string[] = [];
            let totalConfidence = 0;
            let detectedLanguage: string | undefined;

            for (let i = 0; i < chunks.length; i++) {
                this.logger.debug(`Processing chunk ${i + 1}/${chunks.length}`, {
                    chunkSizeMB: Math.round(chunks[i].byteLength / (1024 * 1024)),
                });

                try {
                    const chunkResponse = await this.transcribeStandard(chunks[i], options);

                    if (chunkResponse.text && chunkResponse.text.trim()) {
                        chunkResults.push(chunkResponse.text);
                        totalConfidence += chunkResponse.confidence || 0;

                        if (!detectedLanguage && chunkResponse.language) {
                            detectedLanguage = chunkResponse.language;
                        }
                    }
                } catch (chunkError) {
                    this.logger.error(`Failed to process chunk ${i + 1}`, chunkError as Error);
                    // Continue with other chunks even if one fails
                }
            }

            if (chunkResults.length < chunks.length) {
                this.logger.warn('Chunked transcription completed with partial results', {
                    totalChunks: chunks.length,
                    successfulChunks: chunkResults.length,
                });
            }

            // Merge results
            const mergedText = this.audioChunker.mergeTranscriptionResults(chunkResults);
            const averageConfidence =
                chunkResults.length > 0 ? totalConfidence / chunkResults.length : 0;

            if (!mergedText || mergedText.trim().length === 0) {
                throw new TranscriptionError(
                    'All chunks failed to produce transcription',
                    'CHUNKING_FAILED',
                    'deepgram',
                    false
                );
            }

            const result: TranscriptionResponse = {
                text: mergedText,
                language: detectedLanguage,
                confidence: averageConfidence,
                provider: 'deepgram',
                metadata: {
                    processingTime: Date.now() - startTime,
                    chunksProcessed: chunks.length,
                    chunksSuccessful: chunkResults.length,
                    isPartial: chunkResults.length < chunks.length,
                },
            };

            this.logger.info('Chunked transcription completed', {
                totalChunks: chunks.length,
                successfulChunks: chunkResults.length,
                processingTime: result.metadata?.processingTime,
                textLength: result.text.length,
                isPartial: result.metadata?.isPartial,
            });

            return result;
        } catch (error) {
            this.logger.error('Chunked transcription failed', error as Error);
            throw error;
        }
    }

    /**
     * Handle transcription errors with enhanced messages
     */
    private enhanceTranscriptionError(
        error: Error,
        audio: ArrayBuffer,
        options?: TranscriptionOptions
    ): Error {
        const errorObj = error as TranscriptionError;

        if (errorObj instanceof TranscriptionError) {
            if (errorObj.code === 'EMPTY_TRANSCRIPT') {
                this.logger.error('DeepgramAdapter: Empty transcript detected', errorObj, {
                    originalMessage: errorObj.message,
                    audioSize: audio.byteLength,
                    language: options?.language,
                    model: options?.model,
                });

                const enhancedMessage = [
                    `No transcript was returned. ${errorObj.message}`,
                    '',
                    'Try the following:',
                    '- Ensure the audio contains clear speech',
                    '- Increase microphone input volume if the recording is quiet',
                    '- Reduce background noise or apply noise reduction',
                    '- Confirm the file format is supported (WAV, MP3, FLAC, etc.)',
                    '- Verify the language setting matches the spoken language',
                    '- Enable chunking for files that exceed the recommended size',
                ].join('\n');

                return new TranscriptionError(
                    enhancedMessage,
                    errorObj.code,
                    errorObj.provider,
                    errorObj.isRetryable,
                    errorObj.statusCode
                );
            }

            if (errorObj.code === 'INVALID_AUDIO') {
                this.logger.error('DeepgramAdapter: Invalid audio format', errorObj, {
                    originalMessage: errorObj.message,
                    audioSize: audio.byteLength,
                });

                const enhancedMessage = [
                    `The audio file could not be processed: ${errorObj.message}`,
                    '',
                    'Resolution steps:',
                    '- Confirm you selected the correct file and it is not corrupted',
                    '- Use a supported audio format (WAV, MP3, FLAC, OGG, etc.)',
                    '- Keep files under 2GB in size',
                    '- Enable automatic chunking for files larger than 50MB',
                ].join('\n');

                return new TranscriptionError(
                    enhancedMessage,
                    errorObj.code,
                    errorObj.provider,
                    errorObj.isRetryable,
                    errorObj.statusCode
                );
            }
        }

        this.logger.error('DeepgramAdapter: Transcription failed', error, {
            audioSize: audio.byteLength,
            audioSizeMB: Math.round(audio.byteLength / (1024 * 1024)),
            options: this.sanitizeForLogging(options),
            errorType: error.constructor.name,
            needsChunking: this.audioChunker.needsChunking(audio.byteLength),
        });

        return error;
    }

    /**
     * TranscriptionOptions를 DeepgramSpecificOptions로 변환
     */
    private convertOptions(options?: TranscriptionOptions): DeepgramSpecificOptions {
        const deepgramOptions: DeepgramSpecificOptions = {
            tier: DeepgramAdapter.DEFAULT_TIER,
            punctuate: true,
            smartFormat: true,
            diarize: true,
            utterances: true,
        };

        const modelToTier: Partial<Record<string, NonNullable<DeepgramSpecificOptions['tier']>>> = {
            'nova-3': 'nova-3',
            'nova-2': 'nova-2',
            nova: 'nova-2',
            enhanced: 'enhanced',
            base: 'base',
        };

        const requestedTier = options?.model ? modelToTier[options.model] : undefined;
        if (requestedTier) {
            deepgramOptions.tier = requestedTier;
        }

        const transcriptionSettings = this.settingsManager?.get('transcription') as
            | SettingsStoreTranscriptionSettings
            | undefined;
        const deepgramSettings = transcriptionSettings?.deepgram;
        const deepgramFeatures = deepgramSettings?.features;

        if (deepgramFeatures) {
            this.logger.debug(
                'Applying Deepgram feature overrides',
                this.sanitizeForLogging(deepgramFeatures)
            );

            if (typeof deepgramFeatures.punctuation === 'boolean') {
                deepgramOptions.punctuate = deepgramFeatures.punctuation;
            }
            if (typeof deepgramFeatures.smartFormat === 'boolean') {
                deepgramOptions.smartFormat = deepgramFeatures.smartFormat;
            }
            if (typeof deepgramFeatures.diarization === 'boolean') {
                deepgramOptions.diarize = deepgramFeatures.diarization;
            }
            if (typeof deepgramFeatures.utterances === 'boolean') {
                deepgramOptions.utterances = deepgramFeatures.utterances;
            }
            if (typeof deepgramFeatures.numerals === 'boolean') {
                deepgramOptions.numerals = deepgramFeatures.numerals;
            }
        }

        if (options?.deepgram) {
            Object.assign(deepgramOptions, options.deepgram);
        }

        this.logger.debug('Resolved Deepgram options', this.sanitizeForLogging(deepgramOptions));
        return deepgramOptions;
    }

    /**
     * Deepgram 옵션에서 화자 분리 설정 생성
     */
    private createDiarizationConfig(deepgramOptions: DeepgramSpecificOptions): DiarizationConfig {
        if (!deepgramOptions.diarize) {
            return { ...DEFAULT_DIARIZATION_CONFIG, enabled: false };
        }

        // 설정에서 사용자 화자 분리 설정 가져오기
        let userDiarizationConfig = null;
        if (this.settingsManager) {
            const transcriptionSettings = this.settingsManager.get('transcription') as any;
            userDiarizationConfig = transcriptionSettings?.deepgram?.diarizationConfig;
        }

        // 기본 설정을 베이스로 사용자 설정 덮어쓰기
        const config: DiarizationConfig = {
            ...DEFAULT_DIARIZATION_CONFIG,
            enabled: true,
            ...userDiarizationConfig,
        };

        this.logger.debug('Diarization config created:', this.sanitizeForLogging(config));
        return config;
    }

    /**
     * API 키 검증
     */
    async validateApiKey(key: string): Promise<boolean> {
        try {
            return await this.deepgramService.validateApiKey(key);
        } catch (error) {
            const err = error as TranscriptionError;

            if (
                err instanceof TranscriptionError &&
                (err.code === 'AUTH_ERROR' || err.statusCode === 401 || err.statusCode === 403)
            ) {
                this.logger.warn('DeepgramAdapter: API key authentication failed', {
                    statusCode: err.statusCode,
                });
                return false;
            }

            this.logger.error('DeepgramAdapter: API key validation error (non-auth)', err, {
                statusCode: err?.statusCode,
                errorType: err?.constructor?.name,
            });

            throw error;
        }
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
                'en',
                'es',
                'fr',
                'de',
                'it',
                'pt',
                'nl',
                'ru',
                'zh',
                'ja',
                'ko',
                'ar',
                'tr',
                'hi',
                'pl',
                'sv',
                'da',
                'no',
                'fi',
                'el',
                'he',
                'id',
                'ms',
                'th',
                'vi',
                'ta',
                'te',
                'uk',
                'cs',
                'ro',
                'hu',
                'bg',
                'ca',
                'hr',
                'sr',
                'sl',
                'sk',
                'lt',
                'lv',
                'et',
                'is',
                'mk',
                'sq',
                'eu',
                'gl',
                'cy',
                'bn',
                'ur',
                'fa',
                'gu',
                'mr',
                'pa',
                'kn',
                'ml',
                'or',
                'as',
                'ne',
                'si',
                'my',
                'km',
                'lo',
                'ka',
                'hy',
                'az',
                'kk',
                'uz',
                'tg',
                'ky',
                'tk',
                'mn',
                'bo',
                'am',
                'ti',
                'so',
                'sw',
                'rw',
                'yo',
                'ig',
                'ha',
                'zu',
                'xh',
                'af',
                'mt',
                'lb',
                'ga',
                'gd',
                'br',
                'fy',
                'yi',
                'jv',
                'su',
                'tl',
                'ceb',
                'haw',
                'eo',
                'la',
            ],
            maxFileSize: 2 * 1024 * 1024 * 1024, // 2GB
            audioFormats: [
                'mp3',
                'mp4',
                'wav',
                'flac',
                'ogg',
                'opus',
                'm4a',
                'webm',
                'amr',
                'ac3',
                'aac',
                'wma',
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
                'summarization',
            ],
            models: ['nova-3', 'nova-2', 'enhanced', 'base'],
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
            if (
                errorMessage.includes('circuit') ||
                errorMessage.includes('unavailable') ||
                errorMessage.includes('timeout') ||
                errorMessage.includes('rate limit')
            ) {
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
            ...config,
        };
    }

    private sanitizeForLogging<T>(data: T): T {
        const redactKeys = ['apikey', 'api_key', 'token', 'authorization', 'secret'];

        const scrub = (value: unknown): unknown => {
            if (value === null || value === undefined) {
                return value;
            }

            if (typeof value !== 'object') {
                return value;
            }

            if (value instanceof ArrayBuffer) {
                return '[ArrayBuffer]';
            }

            if (Array.isArray(value)) {
                return value.map((item) => scrub(item));
            }

            const clone: Record<string, unknown> = {};
            for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
                const lowered = key.toLowerCase();
                if (redactKeys.some((needle) => lowered.includes(needle))) {
                    clone[key] = '***';
                } else {
                    clone[key] = scrub(val);
                }
            }

            return clone;
        };

        return scrub(data) as T;
    }

    /**
     * 비용 계산 (추정치)
     * Deepgram 요금: https://deepgram.com/pricing
     */
    estimateCost(duration: number, model?: string): number {
        const tier = model || this.config.model || DeepgramAdapter.DEFAULT_TIER;

        // 분당 비용 (USD) - 2024년 Deepgram 요금
        const costPerMinute: Record<string, number> = {
            'nova-3': 0.0043, // Nova-3 (최신 프리미엄 모델)
            'nova-2': 0.0145, // Nova-2 (이전 프리미엄 모델)
            nova: 0.0125, // Nova (표준 모델)
            enhanced: 0.0085, // Enhanced (기본 모델)
            base: 0.0059, // Base (경제형 모델)
        };

        const minutes = duration / 60;
        const rate = costPerMinute[tier] || costPerMinute[DeepgramAdapter.DEFAULT_TIER];

        return minutes * rate;
    }
}
