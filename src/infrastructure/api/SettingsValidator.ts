/**
 * 설정 검증 시스템
 */

import type { 
    SettingsSchema, 
    ValidationResult, 
    ValidationError, 
    ValidationWarning 
} from '../../types/phase3-api';

/**
 * 설정 검증기
 */
export class SettingsValidator {
    private validators: Map<string, (value: any) => ValidationResult>;

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
            const result = this.validateField(key as keyof SettingsSchema, value);
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
            warnings: warnings.length > 0 ? warnings : undefined
        };
    }

    /**
     * 개별 필드 검증
     */
    validateField<K extends keyof SettingsSchema>(key: K, value: any): ValidationResult {
        const validator = this.validators.get(key);
        if (!validator) {
            // 알 수 없는 필드는 경고
            return {
                valid: true,
                warnings: [{
                    field: key,
                    message: `Unknown setting field: ${key}`,
                    suggestion: 'This field may be deprecated or invalid'
                }]
            };
        }

        return validator(value);
    }

    /**
     * 검증기 초기화
     */
    private initializeValidators(): void {
        // General 설정 검증
        this.validators.set('general', (value) => {
            const errors: ValidationError[] = [];
            const warnings: ValidationWarning[] = [];

            if (!value || typeof value !== 'object') {
                errors.push({
                    field: 'general',
                    message: 'General settings must be an object',
                    code: 'INVALID_TYPE'
                });
                return { valid: false, errors };
            }

            // 언어 코드 검증
            if (value.language) {
                const validLanguages = ['auto', 'en', 'ko', 'ja', 'zh', 'es', 'fr', 'de'];
                if (!validLanguages.includes(value.language)) {
                    errors.push({
                        field: 'general.language',
                        message: `Invalid language code: ${value.language}`,
                        code: 'INVALID_LANGUAGE'
                    });
                }
            }

            // 테마 검증
            if (value.theme) {
                const validThemes = ['light', 'dark', 'auto'];
                if (!validThemes.includes(value.theme)) {
                    errors.push({
                        field: 'general.theme',
                        message: `Invalid theme: ${value.theme}`,
                        code: 'INVALID_THEME'
                    });
                }
            }

            // 저장 간격 검증
            if (value.saveInterval !== undefined) {
                if (typeof value.saveInterval !== 'number' || value.saveInterval < 1000) {
                    errors.push({
                        field: 'general.saveInterval',
                        message: 'Save interval must be at least 1000ms',
                        code: 'INVALID_INTERVAL'
                    });
                } else if (value.saveInterval < 10000) {
                    warnings.push({
                        field: 'general.saveInterval',
                        message: 'Save interval is very short',
                        suggestion: 'Consider using at least 10000ms to reduce disk I/O'
                    });
                }
            }

            return {
                valid: errors.length === 0,
                errors: errors.length > 0 ? errors : undefined,
                warnings: warnings.length > 0 ? warnings : undefined
            };
        });

        // API 설정 검증
        this.validators.set('api', (value) => {
            const errors: ValidationError[] = [];
            const warnings: ValidationWarning[] = [];

            if (!value || typeof value !== 'object') {
                errors.push({
                    field: 'api',
                    message: 'API settings must be an object',
                    code: 'INVALID_TYPE'
                });
                return { valid: false, errors };
            }

            // 프로바이더 검증
            if (value.provider) {
                const validProviders = ['openai', 'azure', 'custom'];
                if (!validProviders.includes(value.provider)) {
                    errors.push({
                        field: 'api.provider',
                        message: `Invalid provider: ${value.provider}`,
                        code: 'INVALID_PROVIDER'
                    });
                }
            }

            // 엔드포인트 검증 (커스텀 프로바이더)
            if (value.provider === 'custom' && !value.endpoint) {
                errors.push({
                    field: 'api.endpoint',
                    message: 'Custom provider requires an endpoint URL',
                    code: 'MISSING_ENDPOINT'
                });
            } else if (value.endpoint) {
                try {
                    new URL(value.endpoint);
                } catch {
                    errors.push({
                        field: 'api.endpoint',
                        message: 'Invalid endpoint URL',
                        code: 'INVALID_URL'
                    });
                }
            }

            // 모델 검증
            if (value.model && value.provider === 'openai') {
                const validModels = ['whisper-1'];
                if (!validModels.includes(value.model)) {
                    warnings.push({
                        field: 'api.model',
                        message: `Unknown OpenAI model: ${value.model}`,
                        suggestion: 'Consider using "whisper-1"'
                    });
                }
            }

            // 토큰 한계 검증
            if (value.maxTokens !== undefined) {
                if (typeof value.maxTokens !== 'number' || value.maxTokens < 1) {
                    errors.push({
                        field: 'api.maxTokens',
                        message: 'Max tokens must be a positive number',
                        code: 'INVALID_TOKENS'
                    });
                } else if (value.maxTokens > 32768) {
                    warnings.push({
                        field: 'api.maxTokens',
                        message: 'Max tokens is very high',
                        suggestion: 'Consider using 4096 or less for better performance'
                    });
                }
            }

            // Temperature 검증
            if (value.temperature !== undefined) {
                if (typeof value.temperature !== 'number' || 
                    value.temperature < 0 || value.temperature > 2) {
                    errors.push({
                        field: 'api.temperature',
                        message: 'Temperature must be between 0 and 2',
                        code: 'INVALID_TEMPERATURE'
                    });
                }
            }

            return {
                valid: errors.length === 0,
                errors: errors.length > 0 ? errors : undefined,
                warnings: warnings.length > 0 ? warnings : undefined
            };
        });

        // Audio 설정 검증
        this.validators.set('audio', (value) => {
            const errors: ValidationError[] = [];
            const warnings: ValidationWarning[] = [];

            if (!value || typeof value !== 'object') {
                errors.push({
                    field: 'audio',
                    message: 'Audio settings must be an object',
                    code: 'INVALID_TYPE'
                });
                return { valid: false, errors };
            }

            // 포맷 검증
            if (value.format) {
                const validFormats = ['mp3', 'm4a', 'wav', 'webm'];
                if (!validFormats.includes(value.format)) {
                    errors.push({
                        field: 'audio.format',
                        message: `Invalid audio format: ${value.format}`,
                        code: 'INVALID_FORMAT'
                    });
                }
            }

            // 품질 검증
            if (value.quality) {
                const validQualities = ['low', 'medium', 'high', 'lossless'];
                if (!validQualities.includes(value.quality)) {
                    errors.push({
                        field: 'audio.quality',
                        message: `Invalid audio quality: ${value.quality}`,
                        code: 'INVALID_QUALITY'
                    });
                }
            }

            // 샘플 레이트 검증
            if (value.sampleRate !== undefined) {
                const validRates = [8000, 16000, 22050, 44100, 48000];
                if (!validRates.includes(value.sampleRate)) {
                    errors.push({
                        field: 'audio.sampleRate',
                        message: `Invalid sample rate: ${value.sampleRate}`,
                        code: 'INVALID_SAMPLE_RATE'
                    });
                }
            }

            // 채널 검증
            if (value.channels !== undefined) {
                if (value.channels !== 1 && value.channels !== 2) {
                    errors.push({
                        field: 'audio.channels',
                        message: 'Channels must be 1 (mono) or 2 (stereo)',
                        code: 'INVALID_CHANNELS'
                    });
                }
            }

            return {
                valid: errors.length === 0,
                errors: errors.length > 0 ? errors : undefined,
                warnings: warnings.length > 0 ? warnings : undefined
            };
        });

        // Advanced 설정 검증
        this.validators.set('advanced', (value) => {
            const errors: ValidationError[] = [];
            const warnings: ValidationWarning[] = [];

            if (!value || typeof value !== 'object') {
                errors.push({
                    field: 'advanced',
                    message: 'Advanced settings must be an object',
                    code: 'INVALID_TYPE'
                });
                return { valid: false, errors };
            }

            // 캐시 설정 검증
            if (value.cache) {
                if (value.cache.maxSize !== undefined) {
                    if (typeof value.cache.maxSize !== 'number' || value.cache.maxSize < 0) {
                        errors.push({
                            field: 'advanced.cache.maxSize',
                            message: 'Cache max size must be a positive number',
                            code: 'INVALID_CACHE_SIZE'
                        });
                    } else if (value.cache.maxSize > 500 * 1024 * 1024) {
                        warnings.push({
                            field: 'advanced.cache.maxSize',
                            message: 'Cache size is very large (>500MB)',
                            suggestion: 'Consider using 100MB or less'
                        });
                    }
                }

                if (value.cache.ttl !== undefined) {
                    if (typeof value.cache.ttl !== 'number' || value.cache.ttl < 0) {
                        errors.push({
                            field: 'advanced.cache.ttl',
                            message: 'Cache TTL must be a positive number',
                            code: 'INVALID_TTL'
                        });
                    }
                }
            }

            // 성능 설정 검증
            if (value.performance) {
                if (value.performance.maxConcurrency !== undefined) {
                    if (typeof value.performance.maxConcurrency !== 'number' || 
                        value.performance.maxConcurrency < 1 || 
                        value.performance.maxConcurrency > 10) {
                        errors.push({
                            field: 'advanced.performance.maxConcurrency',
                            message: 'Max concurrency must be between 1 and 10',
                            code: 'INVALID_CONCURRENCY'
                        });
                    }
                }

                if (value.performance.timeout !== undefined) {
                    if (typeof value.performance.timeout !== 'number' || 
                        value.performance.timeout < 1000) {
                        errors.push({
                            field: 'advanced.performance.timeout',
                            message: 'Timeout must be at least 1000ms',
                            code: 'INVALID_TIMEOUT'
                        });
                    } else if (value.performance.timeout > 300000) {
                        warnings.push({
                            field: 'advanced.performance.timeout',
                            message: 'Timeout is very long (>5 minutes)',
                            suggestion: 'Consider using 30000ms or less'
                        });
                    }
                }
            }

            // 디버그 설정 검증
            if (value.debug) {
                if (value.debug.logLevel) {
                    const validLevels = ['error', 'warn', 'info', 'debug'];
                    if (!validLevels.includes(value.debug.logLevel)) {
                        errors.push({
                            field: 'advanced.debug.logLevel',
                            message: `Invalid log level: ${value.debug.logLevel}`,
                            code: 'INVALID_LOG_LEVEL'
                        });
                    }
                }
            }

            return {
                valid: errors.length === 0,
                errors: errors.length > 0 ? errors : undefined,
                warnings: warnings.length > 0 ? warnings : undefined
            };
        });

        // Shortcuts 설정 검증
        this.validators.set('shortcuts', (value) => {
            const errors: ValidationError[] = [];
            const warnings: ValidationWarning[] = [];

            if (!value || typeof value !== 'object') {
                errors.push({
                    field: 'shortcuts',
                    message: 'Shortcut settings must be an object',
                    code: 'INVALID_TYPE'
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
                        code: 'INVALID_SHORTCUT'
                    });
                }
            };

            // 각 단축키 검증
            for (const [key, shortcut] of Object.entries(value)) {
                if (typeof shortcut === 'string') {
                    validateShortcut(key, shortcut);
                }
            }

            // 중복 단축키 확인
            const shortcuts = Object.values(value).filter(v => typeof v === 'string');
            const duplicates = shortcuts.filter((item, index) => shortcuts.indexOf(item) !== index);
            if (duplicates.length > 0) {
                warnings.push({
                    field: 'shortcuts',
                    message: `Duplicate shortcuts detected: ${duplicates.join(', ')}`,
                    suggestion: 'Each action should have a unique shortcut'
                });
            }

            return {
                valid: errors.length === 0,
                errors: errors.length > 0 ? errors : undefined,
                warnings: warnings.length > 0 ? warnings : undefined
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
                code: 'MISSING_API_KEY'
            });
        } else if (apiKey.startsWith('sk-')) {
            // OpenAI 키 형식
            if (apiKey.length < 40) {
                errors.push({
                    field: 'apiKey',
                    message: 'OpenAI API key appears to be too short',
                    code: 'INVALID_API_KEY_LENGTH'
                });
            }
        } else if (apiKey.length < 32) {
            // 일반 키 최소 길이
            warnings.push({
                field: 'apiKey',
                message: 'API key seems short',
                suggestion: 'Ensure you have copied the complete API key'
            });
        }

        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined,
            warnings: warnings.length > 0 ? warnings : undefined
        };
    }
}