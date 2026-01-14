/**
 * Phase 3 설정 관리 API 구현
 */

import { EventEmitter } from 'events';
import type { App } from 'obsidian';
import type {
    ISettingsAPI,
    SettingsSchema,
    ValidationResult,
    ExportOptions,
    ImportOptions,
    ImportResult,
    ResetScope
} from '../../types/phase3-api';
import type { Unsubscribe } from '../../types/events';
import { SecureApiKeyManager, SettingsEncryptor } from '../security/Encryptor';
import { SettingsMigrator } from './SettingsMigrator';
import { SettingsValidator } from './SettingsValidator';

/**
 * 설정 API 구현
 */
export class SettingsAPI implements ISettingsAPI {
    private emitter = new EventEmitter();
    private settings: SettingsSchema;
    private apiKeyManager: SecureApiKeyManager;
    private encryptor: SettingsEncryptor;
    private migrator: SettingsMigrator;
    private validator: SettingsValidator;
    private storageKey = 'speech-to-text-settings';
    private defaultSettings: SettingsSchema;
    private app: App;

    constructor(app: App) {
        this.app = app;
        this.apiKeyManager = new SecureApiKeyManager(undefined, app);
        this.encryptor = new SettingsEncryptor();
        this.migrator = new SettingsMigrator(app);
        this.validator = new SettingsValidator();
        this.defaultSettings = this.getDefaultSettings();
        this.settings = { ...this.defaultSettings };
    }

    /**
     * 설정 초기화
     */
    async initialize(): Promise<void> {
        try {
            // Obsidian API를 통해 설정 로드
            const stored = this.app.loadLocalStorage(this.storageKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                
                // 마이그레이션 확인
                if (this.needsMigration()) {
                    this.settings = await this.migrator.migrate(
                        parsed,
                        parsed.version || '1.0.0',
                        this.defaultSettings.version
                    );
                } else {
                    this.settings = parsed;
                }
            }

            // API 키 복호화
            const apiKey = await this.apiKeyManager.getApiKey();
            if (apiKey) {
                this.settings.api.apiKey = apiKey;
            }
        } catch (error) {
            console.error('Failed to initialize settings:', error);
            this.settings = { ...this.defaultSettings };
        }
    }

    /**
     * 설정 조회
     */
    get<K extends keyof SettingsSchema>(key: K): Promise<SettingsSchema[K]> {
        return Promise.resolve(this.settings[key]);
    }

    /**
     * 전체 설정 조회
     */
    getAll(): Promise<SettingsSchema> {
        // API 키는 마스킹하여 반환
        const settings = { ...this.settings };
        if (settings.api.apiKey) {
            settings.api.apiKey = SecureApiKeyManager.maskApiKey(settings.api.apiKey);
        }
        return Promise.resolve(settings);
    }

    /**
     * 기본 설정 조회
     */
    getDefault<K extends keyof SettingsSchema>(key: K): SettingsSchema[K] {
        return this.defaultSettings[key];
    }

    /**
     * 설정 저장
     */
    async set<K extends keyof SettingsSchema>(
        key: K, 
        value: SettingsSchema[K]
    ): Promise<void> {
        const oldValue = this.settings[key];
        
        // 검증
        const validation = this.validateField(key, value);
        if (!validation.valid) {
            throw new Error(`Validation failed: ${validation.errors?.[0]?.message}`);
        }

        // API 키 특별 처리
        if (key === 'api') {
            const apiVal = value as SettingsSchema['api'];
            const apiKey = apiVal?.apiKey;
            if (apiKey && !apiKey.includes('*')) { // 마스킹되지 않은 실제 키인 경우
                await this.apiKeyManager.storeApiKey(apiKey);
            }
        }

        // 설정 업데이트
        this.settings[key] = value;
        await this.save();

        // 이벤트 발생
        this.emitter.emit('change', key, value, oldValue);
    }

    /**
     * 설정 일괄 업데이트
     */
    async update(updates: Partial<SettingsSchema>): Promise<void> {
        // 검증
        const validation = this.validate(updates);
        if (!validation.valid) {
            throw new Error(`Validation failed: ${validation.errors?.[0]?.message}`);
        }

        // API 키 특별 처리
        if (updates.api?.apiKey) {
            const apiKey = updates.api.apiKey;
            if (!apiKey.includes('*')) {
                await this.apiKeyManager.storeApiKey(apiKey);
                delete updates.api.apiKey; // 메모리에서 제거
            }
        }

        // 설정 병합
        Object.assign(this.settings, updates);
        await this.save();

        // 이벤트 발생
        this.emitter.emit('save');
    }

    /**
     * 설정 검증
     */
    validate(settings: Partial<SettingsSchema>): ValidationResult {
        return this.validator.validate(settings);
    }

    /**
     * 필드 검증
     */
    validateField<K extends keyof SettingsSchema>(key: K, value: SettingsSchema[K]): ValidationResult {
        return this.validator.validateField(key, value);
    }

    /**
     * 마이그레이션 필요 여부
     */
    needsMigration(): boolean {
        const stored = this.app.loadLocalStorage(this.storageKey);
        if (!stored) return false;

        try {
            const parsed = JSON.parse(stored);
            return parsed.version !== this.defaultSettings.version;
        } catch {
            return false;
        }
    }

    /**
     * 설정 마이그레이션
     */
    async migrate(fromVersion: string, toVersion: string): Promise<void> {
        this.settings = await this.migrator.migrate(
            this.settings,
            fromVersion,
            toVersion
        );
        await this.save();
        this.emitter.emit('migrate', fromVersion, toVersion);
    }

    /**
     * 설정 내보내기
     */
    async export(options: ExportOptions = {}): Promise<Blob> {
        const exportData = { ...this.settings };

        // API 키 제외 옵션
        if (!options.includeApiKeys) {
            delete exportData.api.apiKey;
        }

        // 암호화 옵션
        let finalData: unknown = exportData;
        if (options.encrypt && options.password) {
            finalData = await this.encryptor.encryptSensitiveSettings(exportData);
        }

        // 압축 옵션
        const json = JSON.stringify(finalData, null, 2);
        
        if (options.compress) {
            // gzip 압축 (브라우저 지원 시)
            const encoder = new TextEncoder();
            const data = encoder.encode(json);
            const compressed = await this.compress(data);
            return new Blob([compressed], { type: 'application/gzip' });
        }

        return new Blob([json], { type: 'application/json' });
    }

    /**
     * 설정 가져오기
     */
    async import(file: File, options: ImportOptions = {}): Promise<ImportResult> {
        try {
            let data: string;
            
            // 압축 파일 처리
            if (file.type === 'application/gzip') {
                const buffer = await file.arrayBuffer();
                const decompressed = await this.decompress(new Uint8Array(buffer));
                data = new TextDecoder().decode(decompressed);
            } else {
                data = await file.text();
            }

            let importedSettings = JSON.parse(data);

            // 암호화된 파일 처리
            if (options.password) {
                importedSettings = await this.encryptor.decryptSensitiveSettings(importedSettings);
            }

            // 검증
        let validation: ValidationResult | null = null;
            if (options.validate) {
                validation = this.validate(importedSettings);
                if (!validation.valid) {
                    return {
                        success: false,
                        imported: {},
                        errors: validation.errors?.map(e => e.message)
                    };
                }
            }

            // 병합 또는 덮어쓰기
            if (options.merge) {
                Object.assign(this.settings, importedSettings);
            } else if (options.overwrite) {
                this.settings = importedSettings;
            } else {
                // 기본: 안전한 병합 (API 키 제외)
                const { api, ...safeSettings } = importedSettings;
                Object.assign(this.settings, safeSettings);
            }

            await this.save();

            return {
                success: true,
                imported: importedSettings,
                warnings: validation?.warnings?.map(w => w.message)
            };
        } catch (error) {
            return {
                success: false,
                imported: {},
                errors: [`Import failed: ${(error as Error).message}`]
            };
        }
    }

    /**
     * 설정 초기화
     */
    async reset(scope: ResetScope = 'all'): Promise<void> {
        if (scope === 'all') {
            this.settings = { ...this.defaultSettings };
            await this.apiKeyManager.clearApiKey();
        } else if (Array.isArray(scope)) {
            scope.forEach(key => {
                const typedKey = key;
                this.settings[typedKey] = this.defaultSettings[typedKey];
            });
        } else {
            const typedKey = scope;
            this.settings[typedKey] = this.defaultSettings[typedKey];
        }

        await this.save();
        this.emitter.emit('reset', scope);
    }

    /**
     * 이벤트 리스너 등록 - ISettingsAPI 인터페이스 구현
     */
    on(event: string, listener: (...args: unknown[]) => void): Unsubscribe {
        this.emitter.on(event, listener);
        return () => this.emitter.off(event, listener);
    }

    /**
     * 설정 저장
     */
    private save(): Promise<void> {
        try {
            // API 키는 별도 저장
            const toSave = { ...this.settings };
            delete toSave.api.apiKey;

            this.app.saveLocalStorage(this.storageKey, JSON.stringify(toSave));
            return Promise.resolve();
        } catch (error) {
            console.error('Failed to save settings:', error);
            return Promise.reject(new Error('Failed to save settings'));
        }
    }

    /**
     * 기본 설정
     */
    private getDefaultSettings(): SettingsSchema {
        return {
            version: '3.0.0',
            general: {
                language: 'auto',
                theme: 'auto',
                autoSave: true,
                saveInterval: 30000,
                notifications: {
                    enabled: true,
                    sound: false,
                    position: 'top-right'
                }
            },
            api: {
                provider: 'openai',
                model: 'whisper-1',
                maxTokens: 4096,
                temperature: 0.5
            },
            audio: {
                format: 'webm',
                quality: 'high',
                sampleRate: 16000,
                channels: 1,
                language: 'auto',
                enhanceAudio: true
            },
            advanced: {
                cache: {
                    enabled: true,
                    maxSize: 100 * 1024 * 1024, // 100MB
                    ttl: 7 * 24 * 60 * 60 * 1000 // 7 days
                },
                performance: {
                    maxConcurrency: 3,
                    chunkSize: 1024 * 1024, // 1MB
                    timeout: 30000,
                    useWebWorkers: true
                },
                debug: {
                    enabled: false,
                    logLevel: 'error',
                    saveLogsToFile: false
                }
            },
            shortcuts: {
                startTranscription: 'Ctrl+Shift+S',
                stopTranscription: 'Ctrl+Shift+X',
                pauseTranscription: 'Ctrl+Shift+P',
                openSettings: 'Ctrl+,',
                openFilePicker: 'Ctrl+O'
            }
        };
    }

    /**
     * 데이터 압축
     */
    private async compress(data: Uint8Array): Promise<Uint8Array> {
        // CompressionStream API 사용 (브라우저 지원 확인 필요)
        if ('CompressionStream' in window) {
            const cs = new (window as typeof window & { CompressionStream: new (type: string) => unknown }).CompressionStream('gzip') as unknown as {
                writable: WritableStream<Uint8Array>;
                readable: ReadableStream<Uint8Array>;
            };
            const writer = cs.writable.getWriter();
            await writer.write(data);
            await writer.close();
            
            const chunks: Uint8Array[] = [];
            const reader = cs.readable.getReader();
            
            let finished = false;
            while (!finished) {
                const { done, value } = await reader.read();
                finished = done;
                if (!done && value) {
                    chunks.push(value);
                }
            }
            
            // 청크 결합
            const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
            const result = new Uint8Array(totalLength);
            let offset = 0;
            
            for (const chunk of chunks) {
                result.set(chunk, offset);
                offset += chunk.length;
            }
            
            return result;
        }
        
        // 압축 미지원 시 원본 반환
        return data;
    }

    /**
     * 데이터 압축 해제
     */
    private async decompress(data: Uint8Array): Promise<Uint8Array> {
        // DecompressionStream API 사용
        if ('DecompressionStream' in window) {
            const ds = new (window as typeof window & { DecompressionStream: new (type: string) => unknown }).DecompressionStream('gzip') as unknown as {
                writable: WritableStream<Uint8Array>;
                readable: ReadableStream<Uint8Array>;
            };
            const writer = ds.writable.getWriter();
            await writer.write(data);
            await writer.close();
            
            const chunks: Uint8Array[] = [];
            const reader = ds.readable.getReader();
            
            let finished = false;
            while (!finished) {
                const { done, value } = await reader.read();
                finished = done;
                if (!done && value) {
                    chunks.push(value);
                }
            }
            
            // 청크 결합
            const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
            const result = new Uint8Array(totalLength);
            let offset = 0;
            
            for (const chunk of chunks) {
                result.set(chunk, offset);
                offset += chunk.length;
            }
            
            return result;
        }
        
        return data;
    }
}
