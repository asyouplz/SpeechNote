/**
 * 설정 검증 시스템
 */

import type {
    SettingsSchema,
    ValidationResult,
    ValidationError,
    ValidationWarning,
} from '../../types/phase3-api';
import { isPlainRecord } from '../../types/guards';

/**
 * 설정 검증기
 */
export class SettingsValidator {
    private validators: Map<string, (value: unknown) => ValidationResult>;

    constructor() {
        this.validators = new Map();
        this.initializeValidators();
    }

    /**
     * 전체 설정 검증
     */
    validate(settings: Partial<SettingsSchema>): ValidationResult {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];

        // 각 필드 검증
        for (const [key, value] of Object.entries(settings)) {
            const result = this.validateField(key, value);
            if (result.errors) {
                errors.push(...result.errors);
            }
            if (result.warnings) {
                warnings.push(...result.warnings);
            }
        }

        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined,
            warnings: warnings.length > 0 ? warnings : undefined,
        };
    }

    /**
     * 개별 필드 검증
     */
    validateField<K extends keyof SettingsSchema>(
        key: K,
        value: SettingsSchema[K]
    ): ValidationResult;
    validateField(key: string, value: unknown): ValidationResult {
        const validator = this.validators.get(key);
        if (!validator) {
            // 알 수 없는 필드는 경고
            return {
                valid: true,
                warnings: [
                    {
                        field: key,
                        message: `Unknown setting field: ${key}`,
                        suggestion: 'This field may be deprecated or invalid',
                    },
                ],
            };
        }

        return validator(value);
    }

    /**
     * 검증기 초기화
     */
    private initializeValidators(): void {
        // General 설정 검증
        this.validators.set('general', (value: unknown) => {
            const general = isPlainRecord(value) ? value : null;
            const errors: ValidationError[] = [];
            const warnings: ValidationWarning[] = [];

            if (!general) {
                errors.push({
                    field: 'general',
                    message: 'General settings must be an object',
                    code: 'INVALID_TYPE',
                });
                return { valid: false, errors };
            }

            // 언어 코드 검증
            if (typeof general.language === 'string') {
                const validLanguages = ['auto', 'en', 'ko', 'ja', 'zh', 'es', 'fr', 'de'];
                if (!validLanguages.includes(general.language)) {
                    errors.push({
                        field: 'general.language',
                        message: `Invalid language code: ${general.language}`,
                        code: 'INVALID_LANGUAGE',
                    });
                }
            }

            // 테마 검증
            if (typeof general.theme === 'string') {
                const validThemes = ['light', 'dark', 'auto'];
                if (!validThemes.includes(general.theme)) {
                    errors.push({
                        field: 'general.theme',
                        message: `Invalid theme: ${general.theme}`,
                        code: 'INVALID_THEME',
                    });
                }
            }

            // 저장 간격 검증
            if (general.saveInterval !== undefined) {
                if (typeof general.saveInterval !== 'number' || general.saveInterval < 1000) {
                    errors.push({
                        field: 'general.saveInterval',
                        message: 'Save interval must be at least 1000ms',
                        code: 'INVALID_INTERVAL',
                    });
                } else if (general.saveInterval < 10000) {
                    warnings.push({
                        field: 'general.saveInterval',
                        message: 'Save interval is very short',
                        suggestion: 'Consider using at least 10000ms to reduce disk I/O',
                    });
                }
            }

            return {
                valid: errors.length === 0,
                errors: errors.length > 0 ? errors : undefined,
                warnings: warnings.length > 0 ? warnings : undefined,
            };
        });

        // API 설정 검증
        this.validators.set('api', (value: unknown) => {
            const api = isPlainRecord(value) ? value : null;
            const errors: ValidationError[] = [];
            const warnings: ValidationWarning[] = [];

            if (!api) {
                errors.push({
                    field: 'api',
                    message: 'API settings must be an object',
                    code: 'INVALID_TYPE',
                });
                return { valid: false, errors };
            }

            // 프로바이더 검증
            if (typeof api.provider === 'string') {
                const validProviders = ['openai', 'azure', 'custom'];
                if (!validProviders.includes(api.provider)) {
                    errors.push({
                        field: 'api.provider',
                        message: `Invalid provider: ${api.provider}`,
                        code: 'INVALID_PROVIDER',
                    });
                }
            }

            // 엔드포인트 검증 (커스텀 프로바이더)
            if (api.provider === 'custom' && !api.endpoint) {
                errors.push({
                    field: 'api.endpoint',
                    message: 'Custom provider requires an endpoint URL',
                    code: 'MISSING_ENDPOINT',
                });
            } else if (typeof api.endpoint === 'string') {
                try {
                    new URL(api.endpoint);
                } catch {
                    errors.push({
                        field: 'api.endpoint',
                        message: 'Invalid endpoint URL',
                        code: 'INVALID_URL',
                    });
                }
            }

            // 모델 검증
            if (typeof api.model === 'string' && api.provider === 'openai') {
                const validModels = ['whisper-1'];
                if (!validModels.includes(api.model)) {
                    warnings.push({
                        field: 'api.model',
                        message: `Unknown OpenAI model: ${api.model}`,
                        suggestion: 'Consider using "whisper-1"',
                    });
                }
            }

            // 토큰 한계 검증
            if (api.maxTokens !== undefined) {
                if (typeof api.maxTokens !== 'number' || api.maxTokens < 1) {
                    errors.push({
                        field: 'api.maxTokens',
                        message: 'Max tokens must be a positive number',
                        code: 'INVALID_TOKENS',
                    });
                } else if (api.maxTokens > 32768) {
                    warnings.push({
                        field: 'api.maxTokens',
                        message: 'Max tokens is very high',
                        suggestion: 'Consider using 4096 or less for better performance',
                    });
                }
            }

            // Temperature 검증
            if (api.temperature !== undefined) {
                if (
                    typeof api.temperature !== 'number' ||
                    api.temperature < 0 ||
                    api.temperature > 2
                ) {
                    errors.push({
                        field: 'api.temperature',
                        message: 'Temperature must be between 0 and 2',
                        code: 'INVALID_TEMPERATURE',
                    });
                }
            }

            return {
                valid: errors.length === 0,
                errors: errors.length > 0 ? errors : undefined,
                warnings: warnings.length > 0 ? warnings : undefined,
            };
        });

        // Audio 설정 검증
        this.validators.set('audio', (value: unknown) => {
            const audio = isPlainRecord(value) ? value : null;
            const errors: ValidationError[] = [];
            const warnings: ValidationWarning[] = [];

            if (!audio) {
                errors.push({
                    field: 'audio',
                    message: 'Audio settings must be an object',
                    code: 'INVALID_TYPE',
                });
                return { valid: false, errors };
            }

            // 포맷 검증
            if (typeof audio.format === 'string') {
                const validFormats = ['mp3', 'm4a', 'wav', 'webm'];
                if (!validFormats.includes(audio.format)) {
                    errors.push({
                        field: 'audio.format',
                        message: `Invalid audio format: ${audio.format}`,
                        code: 'INVALID_FORMAT',
                    });
                }
            }

            // 품질 검증
            if (typeof audio.quality === 'string') {
                const validQualities = ['low', 'medium', 'high', 'lossless'];
                if (!validQualities.includes(audio.quality)) {
                    errors.push({
                        field: 'audio.quality',
                        message: `Invalid audio quality: ${audio.quality}`,
                        code: 'INVALID_QUALITY',
                    });
                }
            }

            // 샘플 레이트 검증
            if (audio.sampleRate !== undefined) {
                const validRates = [8000, 16000, 22050, 44100, 48000];
                if (
                    typeof audio.sampleRate !== 'number' ||
                    !validRates.includes(audio.sampleRate)
                ) {
                    errors.push({
                        field: 'audio.sampleRate',
                        message: `Invalid sample rate: ${audio.sampleRate}`,
                        code: 'INVALID_SAMPLE_RATE',
                    });
                }
            }

            // 채널 검증
            if (audio.channels !== undefined) {
                if (audio.channels !== 1 && audio.channels !== 2) {
                    errors.push({
                        field: 'audio.channels',
                        message: 'Channels must be 1 (mono) or 2 (stereo)',
                        code: 'INVALID_CHANNELS',
                    });
                }
            }

            return {
                valid: errors.length === 0,
                errors: errors.length > 0 ? errors : undefined,
                warnings: warnings.length > 0 ? warnings : undefined,
            };
        });

        // Advanced 설정 검증
        this.validators.set('advanced', (value: unknown) => {
            const advanced = isPlainRecord(value) ? value : null;
            const errors: ValidationError[] = [];
            const warnings: ValidationWarning[] = [];

            if (!advanced) {
                errors.push({
                    field: 'advanced',
                    message: 'Advanced settings must be an object',
                    code: 'INVALID_TYPE',
                });
                return { valid: false, errors };
            }

            // 캐시 설정 검증
            if (isPlainRecord(advanced.cache)) {
                if (advanced.cache.maxSize !== undefined) {
                    if (typeof advanced.cache.maxSize !== 'number' || advanced.cache.maxSize < 0) {
                        errors.push({
                            field: 'advanced.cache.maxSize',
                            message: 'Cache max size must be a positive number',
                            code: 'INVALID_CACHE_SIZE',
                        });
                    } else if (advanced.cache.maxSize > 500 * 1024 * 1024) {
                        warnings.push({
                            field: 'advanced.cache.maxSize',
                            message: 'Cache size is very large (>500MB)',
                            suggestion: 'Consider using 100MB or less',
                        });
                    }
                }

                if (advanced.cache.ttl !== undefined) {
                    if (typeof advanced.cache.ttl !== 'number' || advanced.cache.ttl < 0) {
                        errors.push({
                            field: 'advanced.cache.ttl',
                            message: 'Cache TTL must be a positive number',
                            code: 'INVALID_TTL',
                        });
                    }
                }
            }

            // 성능 설정 검증
            if (isPlainRecord(advanced.performance)) {
                if (advanced.performance.maxConcurrency !== undefined) {
                    if (
                        typeof advanced.performance.maxConcurrency !== 'number' ||
                        advanced.performance.maxConcurrency < 1 ||
                        advanced.performance.maxConcurrency > 10
                    ) {
                        errors.push({
                            field: 'advanced.performance.maxConcurrency',
                            message: 'Max concurrency must be between 1 and 10',
                            code: 'INVALID_CONCURRENCY',
                        });
                    }
                }

                if (advanced.performance.timeout !== undefined) {
                    if (
                        typeof advanced.performance.timeout !== 'number' ||
                        advanced.performance.timeout < 1000
                    ) {
                        errors.push({
                            field: 'advanced.performance.timeout',
                            message: 'Timeout must be at least 1000ms',
                            code: 'INVALID_TIMEOUT',
                        });
                    } else if (advanced.performance.timeout > 300000) {
                        warnings.push({
                            field: 'advanced.performance.timeout',
                            message: 'Timeout is very long (>5 minutes)',
                            suggestion: 'Consider using 30000ms or less',
                        });
                    }
                }
            }

            // 디버그 설정 검증
            if (isPlainRecord(advanced.debug)) {
                if (typeof advanced.debug.logLevel === 'string') {
                    const validLevels = ['error', 'warn', 'info', 'debug'];
                    if (!validLevels.includes(advanced.debug.logLevel)) {
                        errors.push({
                            field: 'advanced.debug.logLevel',
                            message: `Invalid log level: ${advanced.debug.logLevel}`,
                            code: 'INVALID_LOG_LEVEL',
                        });
                    }
                }
            }

            return {
                valid: errors.length === 0,
                errors: errors.length > 0 ? errors : undefined,
                warnings: warnings.length > 0 ? warnings : undefined,
            };
        });

        // Shortcuts 설정 검증
        this.validators.set('shortcuts', (value: unknown) => {
            const shortcuts = isPlainRecord(value) ? value : null;
            const errors: ValidationError[] = [];
            const warnings: ValidationWarning[] = [];

            if (!shortcuts) {
                errors.push({
                    field: 'shortcuts',
                    message: 'Shortcut settings must be an object',
                    code: 'INVALID_TYPE',
                });
                return { valid: false, errors };
            }

            // 단축키 형식 검증
            const validateShortcut = (field: string, shortcut: string) => {
                // 기본 형식 검증 (Ctrl/Cmd/Alt/Shift + Key)
                const pattern = /^(Ctrl|Cmd|Alt|Shift|\+|[A-Z0-9])+$/i;
                if (!pattern.test(shortcut.replace(/\s/g, ''))) {
                    errors.push({
                        field: `shortcuts.${field}`,
                        message: `Invalid shortcut format: ${shortcut}`,
                        code: 'INVALID_SHORTCUT',
                    });
                }
            };

            // 각 단축키 검증
            for (const [key, shortcut] of Object.entries(shortcuts)) {
                if (typeof shortcut === 'string') {
                    validateShortcut(key, shortcut);
                }
            }

            // 중복 단축키 확인
            const shortcutValues = Object.values(shortcuts).filter((v) => typeof v === 'string');
            const duplicates = shortcutValues.filter(
                (item, index) => shortcutValues.indexOf(item) !== index
            );
            if (duplicates.length > 0) {
                warnings.push({
                    field: 'shortcuts',
                    message: `Duplicate shortcuts detected: ${duplicates.join(', ')}`,
                    suggestion: 'Each action should have a unique shortcut',
                });
            }

            return {
                valid: errors.length === 0,
                errors: errors.length > 0 ? errors : undefined,
                warnings: warnings.length > 0 ? warnings : undefined,
            };
        });
    }

    /**
     * API 키 검증
     */
    static validateApiKey(apiKey: string): ValidationResult {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];

        if (!apiKey) {
            errors.push({
                field: 'apiKey',
                message: 'API key is required',
                code: 'MISSING_API_KEY',
            });
        } else if (apiKey.startsWith('sk-')) {
            // OpenAI 키 형식
            if (apiKey.length < 40) {
                errors.push({
                    field: 'apiKey',
                    message: 'OpenAI API key appears to be too short',
                    code: 'INVALID_API_KEY_LENGTH',
                });
            }
        } else if (apiKey.length < 32) {
            // 일반 키 최소 길이
            warnings.push({
                field: 'apiKey',
                message: 'API key seems short',
                suggestion: 'Ensure you have copied the complete API key',
            });
        }

        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined,
            warnings: warnings.length > 0 ? warnings : undefined,
        };
    }
}
