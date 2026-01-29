/**
 * Deepgram API 에러 처리 및 Graceful Degradation 구현
 * 다양한 실패 시나리오에 대한 적절한 대응책 제공
 */

import type { ILogger } from '../../../../types';
import {
    TranscriptionError,
    ProviderAuthenticationError,
    ProviderRateLimitError,
    ProviderUnavailableError,
} from '../ITranscriber';
import { ERROR_MESSAGES, DIAGNOSTIC_MESSAGES } from './constants';
import type { ValidationError, DiagnosticInfo, AudioMetrics, DeepgramAPIResponse } from './types';

/**
 * API 에러 코드별 처리 전략
 */
interface ErrorStrategy {
    shouldRetry: boolean;
    degradationOptions: string[];
    userMessage: string;
    technicalDetails: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

/**
 * Graceful Degradation 옵션
 */
export interface DegradationOptions {
    fallbackModel?: string;
    disableFeatures?: string[];
    reduceQuality?: boolean;
    splitFile?: boolean;
    alternativeProvider?: string;
}

/**
 * 에러 분석 결과
 */
export interface ErrorAnalysis {
    category: 'network' | 'authentication' | 'validation' | 'quota' | 'server' | 'unknown';
    severity: 'low' | 'medium' | 'high' | 'critical';
    isRetryable: boolean;
    degradationOptions: DegradationOptions;
    recommendedActions: string[];
    estimatedRecoveryTime?: number;
}

/**
 * 강화된 에러 처리 클래스
 */
export class DeepgramErrorHandler {
    private readonly errorStrategies: Map<number, ErrorStrategy> = new Map([
        [
            400,
            {
                shouldRetry: false,
                degradationOptions: ['tryDifferentModel', 'validateInput'],
                userMessage: 'Audio format or parameters are invalid',
                technicalDetails: 'Bad request - check audio format and API parameters',
            },
        ],
        [
            401,
            {
                shouldRetry: false,
                degradationOptions: ['checkApiKey', 'tryAlternativeProvider'],
                userMessage: 'Invalid API credentials',
                technicalDetails: 'Authentication failed - API key may be invalid or expired',
            },
        ],
        [
            402,
            {
                shouldRetry: false,
                degradationOptions: ['upgradeAccount', 'tryAlternativeProvider'],
                userMessage: 'Insufficient credits or quota exceeded',
                technicalDetails: 'Payment required - account may need upgrade or credit refill',
            },
        ],
        [
            429,
            {
                shouldRetry: true,
                degradationOptions: ['waitAndRetry', 'reduceRequestRate'],
                userMessage: 'Too many requests - please wait',
                technicalDetails: 'Rate limit exceeded - implement exponential backoff',
            },
        ],
        [
            500,
            {
                shouldRetry: true,
                degradationOptions: ['retryWithDelay', 'tryDifferentModel'],
                userMessage: 'Service temporarily unavailable',
                technicalDetails: 'Internal server error - typically transient',
            },
        ],
        [
            502,
            {
                shouldRetry: true,
                degradationOptions: ['retryWithDelay', 'tryAlternativeProvider'],
                userMessage: 'Service gateway error',
                technicalDetails: 'Bad gateway - upstream service issue',
            },
        ],
        [
            503,
            {
                shouldRetry: true,
                degradationOptions: ['retryLater', 'reduceLoad'],
                userMessage: 'Service temporarily overloaded',
                technicalDetails: 'Service unavailable - server capacity issue',
            },
        ],
        [
            504,
            {
                shouldRetry: true,
                degradationOptions: ['splitFile', 'tryFasterModel', 'reduceQuality'],
                userMessage: 'Processing timeout - file may be too large',
                technicalDetails: 'Gateway timeout - consider breaking large files into chunks',
            },
        ],
    ]);

    constructor(private logger: ILogger) {}

    /**
     * API 응답 에러를 적절한 예외로 변환
     */
    handleAPIError(response: {
        status: number;
        json?: unknown;
        headers?: Record<string, string>;
    }): never {
        const errorBody = isRecord(response.json) ? response.json : undefined;
        const errorMessage =
            (typeof errorBody?.message === 'string' ? errorBody.message : undefined) ??
            (typeof errorBody?.error === 'string' ? errorBody.error : undefined) ??
            'Unknown error';
        const strategy = this.errorStrategies.get(response.status);

        this.logger.error(`Deepgram API Error: ${response.status} - ${errorMessage}`, undefined, {
            status: response.status,
            errorBody,
            strategy: strategy?.technicalDetails,
        });

        // 구체적인 에러 타입별 처리
        switch (response.status) {
            case 400:
                throw new TranscriptionError(
                    errorMessage || 'Invalid request',
                    'BAD_REQUEST',
                    'deepgram',
                    false,
                    400
                );
            case 401:
                throw new ProviderAuthenticationError('deepgram');
            case 402:
                throw new TranscriptionError(
                    'Insufficient credits',
                    'INSUFFICIENT_CREDITS',
                    'deepgram',
                    false,
                    402
                );
            case 429: {
                const retryAfter = response.headers?.['retry-after'];
                throw new ProviderRateLimitError(
                    'deepgram',
                    retryAfter ? parseInt(retryAfter) : undefined
                );
            }
            case 500:
            case 502:
            case 503:
                throw new ProviderUnavailableError('deepgram');
            case 504:
                throw new TranscriptionError(
                    ERROR_MESSAGES.API.SERVER_TIMEOUT,
                    'SERVER_TIMEOUT',
                    'deepgram',
                    true,
                    504
                );
            default:
                throw new TranscriptionError(
                    `API error: ${errorMessage}`,
                    'UNKNOWN_ERROR',
                    'deepgram',
                    strategy?.shouldRetry || false,
                    response.status
                );
        }
    }

    /**
     * 에러 분석 및 복구 전략 수립
     */
    analyzeError(
        error: Error,
        context: { audioSize?: number; model?: string; features?: string[] } = {}
    ): ErrorAnalysis {
        if (error instanceof ProviderAuthenticationError) {
            return {
                category: 'authentication',
                severity: 'critical',
                isRetryable: false,
                degradationOptions: {
                    alternativeProvider: 'whisper',
                },
                recommendedActions: [
                    'Verify API key is correct and active',
                    'Check account status and permissions',
                    'Consider switching to alternative provider temporarily',
                ],
            };
        }

        if (error instanceof ProviderRateLimitError) {
            return {
                category: 'quota',
                severity: 'medium',
                isRetryable: true,
                degradationOptions: {
                    reduceQuality: true,
                },
                recommendedActions: [
                    'Wait for rate limit to reset',
                    'Implement exponential backoff',
                    'Consider upgrading API plan',
                ],
                estimatedRecoveryTime: error.retryAfter || 60,
            };
        }

        if (error instanceof TranscriptionError) {
            return this.analyzeTranscriptionError(error, context);
        }

        // 일반적인 에러 분석
        return {
            category: 'unknown',
            severity: 'medium',
            isRetryable: false,
            degradationOptions: {
                alternativeProvider: 'whisper',
            },
            recommendedActions: [
                'Check network connectivity',
                'Try again in a few minutes',
                'Contact support if issue persists',
            ],
        };
    }

    /**
     * TranscriptionError 세부 분석
     */
    private analyzeTranscriptionError(error: TranscriptionError, _context: unknown): ErrorAnalysis {
        switch (error.code) {
            case 'SERVER_TIMEOUT':
                return {
                    category: 'server',
                    severity: 'high',
                    isRetryable: true,
                    degradationOptions: {
                        splitFile: true,
                        fallbackModel: 'enhanced',
                        reduceQuality: true,
                    },
                    recommendedActions: [
                        'Break large files into smaller chunks (< 50MB)',
                        'Try faster model like "enhanced"',
                        'Reduce audio quality/bitrate',
                    ],
                };

            case 'EMPTY_TRANSCRIPT':
                return {
                    category: 'validation',
                    severity: 'medium',
                    isRetryable: false,
                    degradationOptions: {
                        fallbackModel: 'nova-3',
                        disableFeatures: ['diarization'],
                    },
                    recommendedActions: [
                        'Check audio contains actual speech',
                        'Verify audio quality and volume',
                        'Try different language settings',
                        'Use more accurate model if available',
                    ],
                };

            case 'INVALID_AUDIO':
                return {
                    category: 'validation',
                    severity: 'high',
                    isRetryable: false,
                    degradationOptions: {},
                    recommendedActions: [
                        'Check audio file format is supported',
                        'Verify file is not corrupted',
                        'Try converting to a different format',
                    ],
                };

            default:
                return {
                    category: 'unknown',
                    severity: 'medium',
                    isRetryable: error.isRetryable,
                    degradationOptions: {
                        alternativeProvider: 'whisper',
                    },
                    recommendedActions: [
                        'Try again with different settings',
                        'Contact support if issue persists',
                    ],
                };
        }
    }

    /**
     * Graceful Degradation 전략 적용
     */
    applyDegradation(
        originalOptions: Record<string, unknown>,
        degradationOptions: DegradationOptions,
        error: Error
    ): Promise<Record<string, unknown>> {
        const degradedOptions = { ...originalOptions };

        this.logger.info('Applying graceful degradation', {
            originalError: error.message,
            degradationOptions,
        });

        // 모델 변경
        if (degradationOptions.fallbackModel) {
            degradedOptions.tier = degradationOptions.fallbackModel;
            this.logger.debug(`Falling back to model: ${degradationOptions.fallbackModel}`);
        }

        // 기능 비활성화
        if (degradationOptions.disableFeatures) {
            for (const feature of degradationOptions.disableFeatures) {
                degradedOptions[feature] = false;
                this.logger.debug(`Disabled feature: ${feature}`);
            }
        }

        // 품질 감소
        if (degradationOptions.reduceQuality) {
            degradedOptions.smartFormat = false;
            degradedOptions.numerals = false;
            this.logger.debug('Reduced quality options');
        }

        return Promise.resolve(degradedOptions);
    }

    /**
     * 빈 응답에 대한 진단 및 권장사항
     */
    diagnoseEmptyResponse(
        response: DeepgramAPIResponse,
        audioMetrics: AudioMetrics
    ): DiagnosticInfo {
        const diagnostics: ValidationError[] = [];
        const recommendations: string[] = [];

        const channel = response.results.channels[0];
        const alternative = channel?.alternatives[0];

        // 신뢰도 분석
        if (alternative?.confidence === 0) {
            diagnostics.push({
                code: 'ZERO_CONFIDENCE',
                message: 'Zero confidence - possibly no speech detected',
                severity: 'error',
            });
            recommendations.push('Check if audio contains actual speech');
        }

        // 단어 타임스탬프 분석
        if (!alternative?.words || alternative.words.length === 0) {
            diagnostics.push({
                code: 'NO_WORD_TIMESTAMPS',
                message: 'No word timestamps - indicates no speech recognition',
                severity: 'error',
            });
            recommendations.push('Verify audio quality and format compatibility');
        }

        // 지속시간 분석
        if (response.metadata.duration < 1) {
            diagnostics.push({
                code: 'SHORT_DURATION',
                message: 'Very short audio duration',
                severity: 'warning',
            });
            recommendations.push('Ensure audio file has sufficient content');
        }

        // 언어 감지 분석
        if (!channel?.detected_language) {
            diagnostics.push({
                code: 'NO_LANGUAGE_DETECTED',
                message: 'No language detected',
                severity: 'warning',
            });
            recommendations.push('Try specifying language explicitly or use language detection');
        }

        // 권장사항 추가
        recommendations.push(...DIAGNOSTIC_MESSAGES.EMPTY_TRANSCRIPT_CAUSES);

        return {
            timestamp: new Date().toISOString(),
            modelUsed: response.metadata.models[0] || 'unknown',
            audioMetrics,
            processingMetrics: {
                startTime: Date.now(),
                apiCalls: 1,
                retryCount: 0,
            },
            errors: diagnostics.filter((d) => d.severity === 'error'),
            warnings: diagnostics.filter((d) => d.severity === 'warning'),
            recommendations,
        };
    }

    /**
     * 에러 복구 전략 실행
     */
    async executeRecoveryStrategy(
        error: Error,
        analysis: ErrorAnalysis,
        retryFunction: () => Promise<unknown>
    ): Promise<unknown> {
        this.logger.info('Executing error recovery strategy', {
            error: error.message,
            category: analysis.category,
            isRetryable: analysis.isRetryable,
        });

        // 재시도 가능한 에러인 경우
        if (analysis.isRetryable && analysis.estimatedRecoveryTime) {
            this.logger.debug(`Waiting ${analysis.estimatedRecoveryTime}s before retry`);
            await this.sleep(analysis.estimatedRecoveryTime * 1000);
            return retryFunction();
        }

        // 재시도 불가능한 경우, 에러를 그대로 던짐
        throw error;
    }

    /**
     * 지연 유틸리티
     */
    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * 사용자 친화적인 에러 메시지 생성
     */
    generateUserFriendlyMessage(error: Error, analysis: ErrorAnalysis): string {
        const baseMessage = analysis.recommendedActions[0] || 'An unexpected error occurred';

        switch (analysis.category) {
            case 'authentication':
                return 'API authentication failed. Please check your API key and try again.';
            case 'quota':
                return 'Rate limit exceeded. Please wait a moment and try again.';
            case 'network':
                return 'Network connection issue. Please check your internet connection.';
            case 'validation':
                return 'Audio file appears to be invalid or contains no speech. Please check your audio file.';
            case 'server':
                return 'Service temporarily unavailable. Please try again in a few minutes.';
            default:
                return baseMessage;
        }
    }
}
