/**
 * 설정 마이그레이션 시스템
 */

import type { SettingsSchema, LanguageCode } from '../../types/phase3-api';

type Migration = (settings: SettingsSchema) => Promise<SettingsSchema>;

/**
 * 설정 마이그레이터
 */
export class SettingsMigrator {
    private migrations: Map<string, Migration> = new Map();

    constructor() {
        this.registerMigrations();
    }

    private readonly legacyLanguageMap: Record<string, string> = {
        korean: 'ko',
        english: 'en',
        japanese: 'ja',
        chinese: 'zh',
        spanish: 'es',
        german: 'de'
    };

    private normalizeLegacyLanguage(language?: string): string {
        if (!language) return 'auto';
        const mapped = this.legacyLanguageMap[language.toLowerCase()];
        return mapped || language;
    }

    /**
     * 마이그레이션 실행
     */
    async migrate(
        currentSettings: SettingsSchema,
        fromVersion: string,
        toVersion: string
    ): Promise<SettingsSchema> {
        const path = this.findMigrationPath(fromVersion, toVersion);
        
        if (path.length === 0) {
            // 마이그레이션 경로가 없으면 그대로 반환
            return currentSettings;
        }

        let settings = currentSettings;
        
        // 순차적으로 마이그레이션 실행
        for (const step of path) {
            const migration = this.migrations.get(step);
            if (migration) {
                if (process.env.NODE_ENV === 'development') {
                    console.debug(`Migrating settings: ${step}`);
                }
                settings = await migration(settings);
            }
        }

        // 버전 업데이트
        settings.version = toVersion;
        
        return settings;
    }

    /**
     * 마이그레이션 경로 찾기
     */
    private findMigrationPath(fromVersion: string, toVersion: string): string[] {
        const from = this.parseVersion(fromVersion);
        const to = this.parseVersion(toVersion);
        
        if (from.major === to.major && from.minor === to.minor && from.patch === to.patch) {
            return [];
        }

        const path: string[] = [];
        
        // 버전 순서대로 마이그레이션 경로 생성
        const versions = this.getVersionSequence(fromVersion, toVersion);
        
        for (let i = 0; i < versions.length - 1; i++) {
            const key = `${versions[i]}->${versions[i + 1]}`;
            if (this.migrations.has(key)) {
                path.push(key);
            }
        }

        return path;
    }

    /**
     * 버전 시퀀스 생성
     */
    private getVersionSequence(fromVersion: string, toVersion: string): string[] {
        const knownVersions = [
            '1.0.0', '1.1.0', '1.2.0',
            '2.0.0', '2.1.0', '2.2.0',
            '3.0.0'
        ];

        const fromIndex = knownVersions.indexOf(fromVersion);
        const toIndex = knownVersions.indexOf(toVersion);

        if (fromIndex === -1 || toIndex === -1 || fromIndex >= toIndex) {
            return [];
        }

        return knownVersions.slice(fromIndex, toIndex + 1);
    }

    /**
     * 버전 파싱
     */
    private parseVersion(version: string | undefined | null): { major: number; minor: number; patch: number } {
        if (!version || typeof version !== 'string') {
            return { major: 0, minor: 0, patch: 0 };
        }

        const [major = 0, minor = 0, patch = 0] = version.split('.').map((value) => {
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : 0;
        });
        return { major, minor, patch };
    }

    /**
     * 마이그레이션 등록
     */
    private registerMigrations(): void {
        // 1.0.0 -> 1.1.0
        this.migrations.set('1.0.0->1.1.0', async (settings) => {
            return {
                ...settings,
                // autoSave 추가
                autoSave: (settings as Record<string, unknown>).autoSave ?? true,
                // 캐시 설정 추가
                enableCache: (settings as Record<string, unknown>).enableCache ?? true
            };
        });

        // 1.1.0 -> 1.2.0
        this.migrations.set('1.1.0->1.2.0', async (settings) => {
            return {
                ...settings,
                // 언어 설정 마이그레이션
                language: this.normalizeLegacyLanguage(settings.language as string | undefined) as LanguageCode,
                // 청크 크기 추가
                chunkSize: settings.chunkSize ?? 1024 * 1024
            };
        });

        // 1.2.0 -> 2.0.0 (메이저 업데이트)
        this.migrations.set('1.2.0->2.0.0', async (settings) => {
            const getBool = (val: unknown, fallback: boolean) =>
                typeof val === 'boolean' ? val : fallback;
            const getNum = (val: unknown, fallback: number) =>
                typeof val === 'number' ? val : fallback;
            const pickFormat = (val: unknown): SettingsSchema['audio']['format'] => {
                const allowed: SettingsSchema['audio']['format'][] = ['mp3', 'm4a', 'wav', 'webm'];
                return allowed.includes(val as SettingsSchema['audio']['format']) ? (val as SettingsSchema['audio']['format']) : 'webm';
            };
            const pickQuality = (val: unknown): SettingsSchema['audio']['quality'] => {
                const allowed: SettingsSchema['audio']['quality'][] = ['low', 'medium', 'high', 'lossless'];
                return allowed.includes(val as SettingsSchema['audio']['quality']) ? (val as SettingsSchema['audio']['quality']) : 'high';
            };
            const pickSampleRate = (val: unknown): SettingsSchema['audio']['sampleRate'] => {
                const allowed: SettingsSchema['audio']['sampleRate'][] = [8000, 16000, 22050, 44100, 48000];
                return allowed.includes(val as SettingsSchema['audio']['sampleRate'])
                    ? (val as SettingsSchema['audio']['sampleRate'])
                    : 16000;
            };

            const migrated: SettingsSchema = {
                version: '2.0.0',
                general: {
                    language: this.normalizeLegacyLanguage(settings.language as string | undefined) as LanguageCode,
                    autoSave: getBool((settings as Record<string, unknown>).autoSave, true),
                    saveInterval: getNum((settings as Record<string, unknown>).saveInterval, 30000),
                    theme: 'auto',
                    notifications: {
                        enabled: true,
                        sound: false,
                        position: 'top-right'
                    }
                },
                api: {
                    provider: 'openai',
                    apiKey: (settings as Record<string, unknown>).apiKey as string | undefined,
                    model: ((settings as Record<string, unknown>).model as string) || 'whisper-1',
                    maxTokens: getNum((settings as Record<string, unknown>).maxTokens, 4096),
                    temperature: 0.5
                },
                audio: {
                    format: pickFormat((settings as Record<string, unknown>).audioFormat),
                    quality: pickQuality((settings as Record<string, unknown>).audioQuality),
                    sampleRate: pickSampleRate((settings as Record<string, unknown>).sampleRate),
                    channels: 1,
                    language: this.normalizeLegacyLanguage(settings.language as string | undefined),
                    enhanceAudio: false
                },
                advanced: {
                    cache: {
                        enabled: getBool((settings as Record<string, unknown>).enableCache, true),
                        maxSize: getNum((settings as Record<string, unknown>).cacheSize, 100 * 1024 * 1024),
                        ttl: 60_000
                    },
                    performance: {
                        chunkSize: getNum((settings as Record<string, unknown>).chunkSize, 1024 * 1024),
                        maxConcurrency: getNum((settings as Record<string, unknown>).maxConcurrency, 3),
                        timeout: 30_000,
                        useWebWorkers: false
                    },
                    debug: {
                        enabled: false,
                        logLevel: 'warn',
                        saveLogsToFile: false
                    }
                },
                shortcuts: {
                    startTranscription: 'Mod+Shift+S',
                    stopTranscription: 'Mod+Shift+X',
                    pauseTranscription: 'Mod+Shift+P',
                    openSettings: 'Mod+,',
                    openFilePicker: 'Mod+Shift+O'
                }
            };

            return migrated;
        });

        // 2.0.0 -> 2.1.0
        this.migrations.set('2.0.0->2.1.0', async (settings) => {
            return {
                ...settings,
                version: '2.1.0',
                // 테마 설정 추가
                general: {
                    ...settings.general,
                    theme: 'auto'
                },
                // Temperature 설정 추가
                api: {
                    ...settings.api,
                    temperature: 0.5
                },
                // 채널 설정 추가
                audio: {
                    ...settings.audio,
                    channels: settings.audio?.channels ?? 1,
                    enhanceAudio: settings.audio?.enhanceAudio ?? false
                }
            };
        });

        // 2.1.0 -> 2.2.0
        this.migrations.set('2.1.0->2.2.0', async (settings) => {
            return {
                ...settings,
                version: '2.2.0',
                // 알림 설정 추가
                general: {
                    ...settings.general,
                    notifications: {
                        enabled: true,
                        sound: false,
                        position: 'top-right'
                    }
                },
                // TTL 설정 추가
                advanced: {
                    ...settings.advanced,
                    cache: {
                        ...settings.advanced?.cache,
                        ttl: 7 * 24 * 60 * 60 * 1000 // 7 days
                    },
                    // 타임아웃 설정 추가
                    performance: {
                        ...settings.advanced?.performance,
                        timeout: 30000
                    }
                }
            };
        });

        // 2.2.0 -> 3.0.0 (메이저 업데이트)
        this.migrations.set('2.2.0->3.0.0', async (settings) => {
            // API 키 분리 및 암호화 준비
            const apiKey = settings.api?.apiKey;
            const newSettings: SettingsSchema = {
                version: '3.0.0',
                general: {
                    ...settings.general,
                    language: this.normalizeLegacyLanguage(settings.general?.language || (settings as Record<string, unknown>).language) as LanguageCode,
                    theme: settings.general?.theme || 'auto',
                    autoSave: settings.general?.autoSave ?? true,
                    saveInterval: typeof settings.general?.saveInterval === 'number' ? settings.general.saveInterval : 30000,
                    notifications: settings.general?.notifications || {
                        enabled: true,
                        sound: false,
                        position: 'top-right'
                    }
                },
                api: {
                    provider: settings.api?.provider || 'openai',
                    endpoint: settings.api?.endpoint,
                    model: settings.api?.model || 'whisper-1',
                    maxTokens: typeof settings.api?.maxTokens === 'number' ? settings.api.maxTokens : 4096,
                    temperature: settings.api?.temperature ?? 0.5
                    // apiKey는 별도 암호화 저장으로 이동
                },
                audio: {
                    format: settings.audio?.format || 'webm',
                    quality: settings.audio?.quality || 'high',
                    sampleRate: typeof settings.audio?.sampleRate === 'number' ? settings.audio.sampleRate : 16000,
                    channels: settings.audio?.channels ?? 1,
                language: this.normalizeLegacyLanguage(
                    typeof (settings.audio?.language ?? (settings as Record<string, unknown>).language) === 'string'
                        ? (settings.audio?.language ?? (settings as Record<string, unknown>).language) as string
                        : undefined
                ) as LanguageCode,
                enhanceAudio: settings.audio?.enhanceAudio ?? true
            },
                advanced: {
                    cache: {
                        enabled: settings.advanced?.cache?.enabled ?? true,
                        maxSize: settings.advanced?.cache?.maxSize ?? 100 * 1024 * 1024,
                        ttl: settings.advanced?.cache?.ttl ?? 7 * 24 * 60 * 60 * 1000
                    },
                    performance: {
                        maxConcurrency: settings.advanced?.performance?.maxConcurrency ?? 3,
                        chunkSize: settings.advanced?.performance?.chunkSize ?? 1024 * 1024,
                        timeout: settings.advanced?.performance?.timeout ?? 30000,
                        useWebWorkers: true // 새 기능
                    },
                    debug: {
                        enabled: false,
                        logLevel: 'error',
                        saveLogsToFile: false
                    }
                },
                shortcuts: {
                    startTranscription: settings.shortcuts?.startTranscription || 'Ctrl+Shift+S',
                    stopTranscription: settings.shortcuts?.stopTranscription || 'Ctrl+Shift+X',
                    pauseTranscription: settings.shortcuts?.pauseTranscription || 'Ctrl+Shift+P',
                    openSettings: settings.shortcuts?.openSettings || 'Ctrl+,',
                    openFilePicker: settings.shortcuts?.openFilePicker || 'Ctrl+O'
                }
            };

            return newSettings;
        });
    }

    /**
     * 백업 생성
     */
    async createBackup(settings: SettingsSchema): Promise<string> {
        const backup = {
            timestamp: new Date().toISOString(),
            version: settings.version || 'unknown',
            settings: JSON.parse(JSON.stringify(settings)) // Deep clone
        };

        const key = `settings_backup_${Date.now()}`;
        localStorage.setItem(key, JSON.stringify(backup));
        
        // 오래된 백업 정리 (최대 5개 유지)
        this.cleanupOldBackups();
        
        return key;
    }

    /**
     * 백업 복원
     */
    async restoreBackup(backupKey: string): Promise<SettingsSchema> {
        const backupData = localStorage.getItem(backupKey);
        if (!backupData) {
            throw new Error('Backup not found');
        }

        const backup = JSON.parse(backupData);
        return backup.settings;
    }

    /**
     * 오래된 백업 정리
     */
    private cleanupOldBackups(): void {
        const backupKeys: Array<{ key: string; timestamp: number }> = [];
        
        // 백업 키 수집
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith('settings_backup_')) {
                const timestamp = parseInt(key.replace('settings_backup_', ''));
                backupKeys.push({ key, timestamp });
            }
        }

        // 시간순 정렬
        backupKeys.sort((a, b) => b.timestamp - a.timestamp);

        // 최신 5개만 유지
        const toDelete = backupKeys.slice(5);
        toDelete.forEach(({ key }) => localStorage.removeItem(key));
    }

    /**
     * 마이그레이션 필요 여부 확인
     */
    needsMigration(currentVersion: string, targetVersion: string): boolean {
        const current = this.parseVersion(currentVersion);
        const target = this.parseVersion(targetVersion);

        return current.major !== target.major ||
               current.minor !== target.minor ||
               current.patch !== target.patch;
    }

    /**
     * 호환성 확인
     */
    isCompatible(version: string): boolean {
        const parsed = this.parseVersion(version);
        const current = this.parseVersion('3.0.0');

        // 메이저 버전이 같거나 이전 버전이면 호환 가능
        return parsed.major <= current.major;
    }
}
