/**
 * 설정 마이그레이션 시스템
 */

import type { SettingsSchema } from '../../types/phase3-api';

type Migration = (settings: any) => Promise<any>;

/**
 * 설정 마이그레이터
 */
export class SettingsMigrator {
    private migrations: Map<string, Migration> = new Map();

    constructor() {
        this.registerMigrations();
    }

    /**
     * 마이그레이션 실행
     */
    async migrate(
        currentSettings: any,
        fromVersion: string,
        toVersion: string
    ): Promise<SettingsSchema> {
        const path = this.findMigrationPath(fromVersion, toVersion);
        
        if (path.length === 0) {
            // 마이그레이션 경로가 없으면 그대로 반환
            return currentSettings as SettingsSchema;
        }

        let settings = currentSettings;
        
        // 순차적으로 마이그레이션 실행
        for (const step of path) {
            const migration = this.migrations.get(step);
            if (migration) {
                console.log(`Migrating settings: ${step}`);
                settings = await migration(settings);
            }
        }

        // 버전 업데이트
        settings.version = toVersion;
        
        return settings as SettingsSchema;
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
    private parseVersion(version: string): { major: number; minor: number; patch: number } {
        const [major = 0, minor = 0, patch = 0] = version.split('.').map(Number);
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
                autoSave: settings.autoSave ?? true,
                // 캐시 설정 추가
                enableCache: settings.enableCache ?? true
            };
        });

        // 1.1.0 -> 1.2.0
        this.migrations.set('1.1.0->1.2.0', async (settings) => {
            return {
                ...settings,
                // 언어 설정 마이그레이션
                language: settings.language || 'auto',
                // 청크 크기 추가
                chunkSize: settings.chunkSize ?? 1024 * 1024
            };
        });

        // 1.2.0 -> 2.0.0 (메이저 업데이트)
        this.migrations.set('1.2.0->2.0.0', async (settings) => {
            // 구조 변경: flat -> nested
            return {
                version: '2.0.0',
                general: {
                    language: settings.language || 'auto',
                    autoSave: settings.autoSave ?? true,
                    saveInterval: settings.saveInterval ?? 30000
                },
                api: {
                    provider: 'openai',
                    apiKey: settings.apiKey,
                    model: settings.model || 'whisper-1',
                    maxTokens: settings.maxTokens ?? 4096
                },
                audio: {
                    format: settings.audioFormat || 'webm',
                    quality: settings.audioQuality || 'high',
                    sampleRate: settings.sampleRate ?? 16000
                },
                advanced: {
                    cache: {
                        enabled: settings.enableCache ?? true,
                        maxSize: settings.cacheSize ?? 100 * 1024 * 1024
                    },
                    performance: {
                        chunkSize: settings.chunkSize ?? 1024 * 1024,
                        maxConcurrency: settings.maxConcurrency ?? 3
                    }
                }
            };
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
                    channels: 1,
                    enhanceAudio: false
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
                    language: settings.general?.language || 'auto',
                    theme: settings.general?.theme || 'auto',
                    autoSave: settings.general?.autoSave ?? true,
                    saveInterval: settings.general?.saveInterval ?? 30000,
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
                    maxTokens: settings.api?.maxTokens ?? 4096,
                    temperature: settings.api?.temperature ?? 0.5
                    // apiKey는 별도 암호화 저장으로 이동
                },
                audio: {
                    format: settings.audio?.format || 'webm',
                    quality: settings.audio?.quality || 'high',
                    sampleRate: settings.audio?.sampleRate ?? 16000,
                    channels: settings.audio?.channels ?? 1,
                    language: settings.audio?.language || 'auto',
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

            // API 키는 마이그레이션 후 별도 처리 필요
            if (apiKey) {
                // 임시로 메모리에 보관 (실제 저장은 SecureApiKeyManager에서 처리)
                (newSettings as any).__migratedApiKey = apiKey;
            }

            return newSettings;
        });
    }

    /**
     * 백업 생성
     */
    async createBackup(settings: any): Promise<string> {
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
    async restoreBackup(backupKey: string): Promise<any> {
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