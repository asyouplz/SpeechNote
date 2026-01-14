import { Plugin } from 'obsidian';
import type { ISettingsManager, ILogger } from '../../types';

// 설정 타입 정의
export interface PluginSettings {
    // Legacy API key (for backward compatibility)
    apiKey: string;
    encryptedApiKey?: string;

    // Multi-provider support
    provider?: 'auto' | 'whisper' | 'deepgram';
    whisperApiKey?: string;
    deepgramApiKey?: string;
    selectionStrategy?:
        | 'cost_optimized'
        | 'performance_optimized'
        | 'quality_optimized'
        | 'round_robin'
        | 'ab_test';

    // Provider optimization settings
    costLimit?: number;
    qualityThreshold?: number;
    abTestEnabled?: boolean;
    abTestSplit?: number;

    // Original settings
    model: 'whisper-1';
    language: string;
    autoInsert: boolean;
    insertPosition: 'cursor' | 'end' | 'beginning';
    timestampFormat: 'none' | 'inline' | 'sidebar';
    maxFileSize: number;
    enableCache: boolean;
    cacheTTL: number;
    enableDebugLogging: boolean;
    prompt?: string;
    temperature?: number;
    responseFormat?: 'json' | 'text' | 'verbose_json';
}

// 기본 설정값
const DEFAULT_SETTINGS: PluginSettings = {
    apiKey: '',
    provider: 'auto',
    selectionStrategy: 'performance_optimized',
    abTestSplit: 50,
    model: 'whisper-1',
    language: 'auto',
    autoInsert: true,
    insertPosition: 'cursor',
    timestampFormat: 'none',
    maxFileSize: 25 * 1024 * 1024, // 25MB
    enableCache: true,
    cacheTTL: 3600000, // 1 hour
    enableDebugLogging: false,
    responseFormat: 'json',
};

// API 키 암호화/복호화 유틸리티
class ApiKeyEncryption {
    private readonly SALT = 'obsidian-speech-to-text-v1';

    // 간단한 XOR 기반 암호화 (실제 프로덕션에서는 더 강력한 암호화 사용 권장)
    encrypt(apiKey: string): string {
        if (!apiKey) return '';

        // Base64 인코딩으로 기본적인 보호
        const encoded = btoa(apiKey);

        // XOR 연산을 통한 추가 보호
        let encrypted = '';
        for (let i = 0; i < encoded.length; i++) {
            const charCode = encoded.charCodeAt(i);
            const saltCharCode = this.SALT.charCodeAt(i % this.SALT.length);
            encrypted += String.fromCharCode(charCode ^ saltCharCode);
        }

        return btoa(encrypted);
    }

    decrypt(encryptedKey: string): string {
        if (!encryptedKey) return '';

        try {
            // Base64 디코딩
            const decoded = atob(encryptedKey);

            // XOR 연산으로 복호화
            let decrypted = '';
            for (let i = 0; i < decoded.length; i++) {
                const charCode = decoded.charCodeAt(i);
                const saltCharCode = this.SALT.charCodeAt(i % this.SALT.length);
                decrypted += String.fromCharCode(charCode ^ saltCharCode);
            }

            // 최종 Base64 디코딩
            return atob(decrypted);
        } catch (error) {
            console.error('Failed to decrypt API key:', error);
            return '';
        }
    }

    // API 키 형식 검증
    validateApiKeyFormat(key: string): boolean {
        if (!key) return false;

        // OpenAI API 키 형식: sk-... (최소 20자)
        return /^sk-[A-Za-z0-9]{20,}$/.test(key);
    }

    // API 키 마스킹 (로깅/표시용)
    mask(key: string): string {
        if (!key || key.length < 10) return '***';

        const visibleStart = 7; // sk-XXXXX
        const visibleEnd = 4;
        const masked = '*'.repeat(Math.max(0, key.length - visibleStart - visibleEnd));

        return key.substring(0, visibleStart) + masked + key.substring(key.length - visibleEnd);
    }
}

export class SettingsManager implements ISettingsManager {
    private settings: PluginSettings;
    private encryption: ApiKeyEncryption;
    private logger?: ILogger;

    constructor(private plugin: Plugin, logger?: ILogger) {
        this.settings = { ...DEFAULT_SETTINGS };
        this.encryption = new ApiKeyEncryption();
        this.logger = logger;
    }

    private normalizeError(error: unknown): Error {
        return error instanceof Error ? error : new Error('Unknown error');
    }

    async load(): Promise<PluginSettings> {
        try {
            const loadedData = await this.plugin.loadData();

            if (loadedData) {
                // 기존 설정과 병합
                this.settings = { ...DEFAULT_SETTINGS, ...loadedData };

                // 암호화된 API 키가 있으면 복호화
                if (this.settings.encryptedApiKey && !this.settings.apiKey) {
                    this.settings.apiKey = this.encryption.decrypt(this.settings.encryptedApiKey);
                }

                // 비암호화 API 키가 있으면 암호화하여 저장
                if (this.settings.apiKey && !this.settings.encryptedApiKey) {
                    await this.encryptAndSaveApiKey(this.settings.apiKey);
                }
            }

            this.logger?.debug('Settings loaded successfully');
            return this.settings;
        } catch (error) {
            this.logger?.error('Failed to load settings', this.normalizeError(error));
            return this.settings;
        }
    }

    async save(settings: PluginSettings): Promise<void> {
        try {
            this.settings = settings;

            // API 키 암호화 처리
            if (settings.apiKey) {
                settings.encryptedApiKey = this.encryption.encrypt(settings.apiKey);
                // 원본 API 키는 저장하지 않음
                const { apiKey: _apiKey, ...saveData } = settings;
                await this.plugin.saveData(saveData);
            } else {
                await this.plugin.saveData(settings);
            }

            this.logger?.debug('Settings saved successfully');
        } catch (error) {
            this.logger?.error('Failed to save settings', this.normalizeError(error));
            throw error;
        }
    }

    get<K extends string>(key: K): unknown;
    get<K extends keyof PluginSettings>(key: K): PluginSettings[K];
    get(key: string): unknown {
        return this.settings[key as keyof PluginSettings];
    }

    async set<K extends string>(key: K, value: unknown): Promise<void>;
    async set<K extends keyof PluginSettings>(key: K, value: PluginSettings[K]): Promise<void>;
    async set(key: string, value: unknown): Promise<void> {
        const mutableSettings = this.settings as unknown as Record<string, unknown>;
        mutableSettings[key] = value;

        // API 키가 변경되면 특별 처리
        if (key === 'apiKey' && typeof value === 'string') {
            await this.encryptAndSaveApiKey(value);
        } else {
            await this.save(this.settings);
        }
    }

    // API 키 관련 메서드
    async setApiKey(apiKey: string): Promise<boolean> {
        // 형식 검증
        if (!this.encryption.validateApiKeyFormat(apiKey)) {
            this.logger?.warn('Invalid API key format');
            return false;
        }

        // 암호화하여 저장
        await this.encryptAndSaveApiKey(apiKey);
        return true;
    }

    getApiKey(): string {
        return this.settings.apiKey || '';
    }

    getMaskedApiKey(): string {
        const apiKey = this.getApiKey();
        return apiKey ? this.encryption.mask(apiKey) : 'Not configured';
    }

    private async encryptAndSaveApiKey(apiKey: string): Promise<void> {
        this.settings.apiKey = apiKey;
        this.settings.encryptedApiKey = this.encryption.encrypt(apiKey);

        // 저장 시 API 키는 제외
        const { apiKey: _apiKey, ...saveData } = this.settings;

        await this.plugin.saveData(saveData);
        this.logger?.debug('API key encrypted and saved', {
            masked: this.encryption.mask(apiKey),
        });
    }

    // 설정 초기화
    async reset(): Promise<void> {
        this.settings = { ...DEFAULT_SETTINGS };
        await this.save(this.settings);
        this.logger?.info('Settings reset to defaults');
    }

    // 설정 내보내기 (민감한 정보 제외)
    exportSettings(): Partial<PluginSettings> {
        const { apiKey: _apiKey, encryptedApiKey: _encryptedApiKey, ...exported } = this.settings;
        return exported;
    }

    // 설정 가져오기
    async importSettings(imported: Partial<PluginSettings>): Promise<void> {
        // API 키는 가져오지 않음
        const { apiKey: _apiKey, encryptedApiKey: _encryptedApiKey, ...safeImported } = imported;

        this.settings = { ...this.settings, ...safeImported };
        await this.save(this.settings);
        this.logger?.info('Settings imported successfully');
    }

    // 유효성 검증
    validateSettings(): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!this.settings.apiKey && !this.settings.encryptedApiKey) {
            errors.push('API key is not configured');
        }

        if (this.settings.maxFileSize <= 0 || this.settings.maxFileSize > 25 * 1024 * 1024) {
            errors.push('Invalid max file size (must be between 0 and 25MB)');
        }

        if (this.settings.cacheTTL < 0) {
            errors.push('Invalid cache TTL (must be positive)');
        }

        if (
            this.settings.temperature !== undefined &&
            (this.settings.temperature < 0 || this.settings.temperature > 1)
        ) {
            errors.push('Invalid temperature (must be between 0 and 1)');
        }

        return {
            valid: errors.length === 0,
            errors,
        };
    }
}
