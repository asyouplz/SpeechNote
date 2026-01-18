/**
 * SettingsAPI 테스트 스위트
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { SettingsAPI } from '../../src/infrastructure/api/SettingsAPI';
import { SecureApiKeyManager, Encryptor } from '../../src/infrastructure/security/Encryptor';
import { SettingsValidator } from '../../src/infrastructure/api/SettingsValidator';
import { SettingsMigrator } from '../../src/infrastructure/api/SettingsMigrator';
import type { SettingsSchema } from '../../src/types/phase3-api';

// localStorage 모킹
const localStorageMock = (() => {
    let store: Record<string, string> = {};

    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
            store[key] = value;
        },
        removeItem: (key: string) => {
            delete store[key];
        },
        clear: () => {
            store = {};
        },
        get length() {
            return Object.keys(store).length;
        },
        key: (index: number) => {
            const keys = Object.keys(store);
            return keys[index] || null;
        }
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
});

describe('SettingsAPI', () => {
    let settingsAPI: SettingsAPI;

    beforeEach(async () => {
        localStorageMock.clear();
        settingsAPI = new SettingsAPI();
        await settingsAPI.initialize();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('초기화', () => {
        it('기본 설정으로 초기화되어야 함', async () => {
            const settings = await settingsAPI.getAll();

            expect(settings.version).toBe('3.0.0');
            expect(settings.general.language).toBe('auto');
            expect(settings.api.provider).toBe('openai');
            expect(settings.audio.format).toBe('webm');
        });

        it('저장된 설정을 로드해야 함', async () => {
            const savedSettings = {
                version: '3.0.0',
                general: {
                    language: 'ko',
                    theme: 'dark',
                    autoSave: false,
                    saveInterval: 60000,
                    notifications: {
                        enabled: false,
                        sound: true,
                        position: 'bottom-right' as const
                    }
                }
            };

            localStorageMock.setItem('speech-to-text-settings', JSON.stringify(savedSettings));

            const newAPI = new SettingsAPI();
            await newAPI.initialize();

            const general = await newAPI.get('general');
            expect(general.language).toBe('ko');
            expect(general.theme).toBe('dark');
            expect(general.autoSave).toBe(false);
        });
    });

    describe('설정 조회', () => {
        it('개별 설정을 조회할 수 있어야 함', async () => {
            const general = await settingsAPI.get('general');

            expect(general).toBeDefined();
            expect(general.language).toBe('auto');
            expect(general.autoSave).toBe(true);
        });

        it('전체 설정을 조회할 수 있어야 함', async () => {
            const allSettings = await settingsAPI.getAll();

            expect(allSettings).toBeDefined();
            expect(allSettings.version).toBe('3.0.0');
            expect(allSettings.general).toBeDefined();
            expect(allSettings.api).toBeDefined();
            expect(allSettings.audio).toBeDefined();
            expect(allSettings.advanced).toBeDefined();
            expect(allSettings.shortcuts).toBeDefined();
        });

        it('API 키는 마스킹되어 반환되어야 함', async () => {
            // API 키 설정
            const api = await settingsAPI.get('api');
            api.apiKey = 'sk-test1234567890abcdef';

            const allSettings = await settingsAPI.getAll();

            if (allSettings.api.apiKey) {
                expect(allSettings.api.apiKey).toContain('*');
                expect(allSettings.api.apiKey).not.toBe('sk-test1234567890abcdef');
            }
        });
    });

    describe('설정 저장', () => {
        it('개별 설정을 저장할 수 있어야 함', async () => {
            const newGeneral = await settingsAPI.get('general');
            newGeneral.language = 'ko';
            newGeneral.theme = 'dark';

            await settingsAPI.set('general', newGeneral);

            const saved = await settingsAPI.get('general');
            expect(saved.language).toBe('ko');
            expect(saved.theme).toBe('dark');
        });

        it('일괄 업데이트가 가능해야 함', async () => {
            await settingsAPI.update({
                general: {
                    language: 'en',
                    theme: 'light',
                    autoSave: false,
                    saveInterval: 10000,
                    notifications: {
                        enabled: false,
                        sound: false,
                        position: 'top-left'
                    }
                }
            });

            const general = await settingsAPI.get('general');
            expect(general.language).toBe('en');
            expect(general.theme).toBe('light');
            expect(general.autoSave).toBe(false);
        });

        it('변경 이벤트가 발생해야 함', async () => {
            const changeHandler = jest.fn();
            settingsAPI.on('change', changeHandler);

            const general = await settingsAPI.get('general');
            general.language = 'ja';
            await settingsAPI.set('general', general);

            expect(changeHandler).toHaveBeenCalled();
            expect(changeHandler).toHaveBeenCalledWith('general', expect.any(Object), expect.any(Object));
        });
    });

    describe('설정 검증', () => {
        it('유효한 설정을 검증해야 함', () => {
            const result = settingsAPI.validate({
                general: {
                    language: 'ko',
                    theme: 'dark',
                    autoSave: true,
                    saveInterval: 30000,
                    notifications: {
                        enabled: true,
                        sound: false,
                        position: 'top-right'
                    }
                }
            });

            expect(result.valid).toBe(true);
            expect(result.errors).toBeUndefined();
        });

        it('유효하지 않은 설정을 거부해야 함', () => {
            const result = settingsAPI.validate({
                general: {
                    language: 'invalid-lang',
                    theme: 'invalid-theme' as any,
                    autoSave: true,
                    saveInterval: -1000,
                    notifications: {
                        enabled: true,
                        sound: false,
                        position: 'top-right'
                    }
                }
            });

            expect(result.valid).toBe(false);
            expect(result.errors).toBeDefined();
            expect(result.errors?.length).toBeGreaterThan(0);
        });

        it('필드별 검증이 가능해야 함', () => {
            const result = settingsAPI.validateField('api', {
                provider: 'invalid-provider',
                model: 'whisper-1',
                maxTokens: -100,
                temperature: 3
            });

            expect(result.valid).toBe(false);
            expect(result.errors).toBeDefined();
        });
    });

    describe('설정 마이그레이션', () => {
        it('버전 마이그레이션이 필요한지 확인해야 함', () => {
            localStorageMock.setItem('speech-to-text-settings', JSON.stringify({
                version: '2.0.0'
            }));

            const needsMigration = settingsAPI.needsMigration();
            expect(needsMigration).toBe(true);
        });

        it('설정을 마이그레이션할 수 있어야 함', async () => {
            await settingsAPI.migrate('2.0.0', '3.0.0');

            const settings = await settingsAPI.getAll();
            expect(settings.version).toBe('3.0.0');
        });

        it('마이그레이션 이벤트가 발생해야 함', async () => {
            const migrateHandler = jest.fn();
            settingsAPI.on('migrate', migrateHandler);

            await settingsAPI.migrate('2.0.0', '3.0.0');

            expect(migrateHandler).toHaveBeenCalledWith('2.0.0', '3.0.0');
        });
    });

    describe('설정 내보내기/가져오기', () => {
        it('설정을 내보낼 수 있어야 함', async () => {
            const blob = await settingsAPI.export();

            expect(blob).toBeInstanceOf(Blob);
            expect(blob.type).toBe('application/json');

            const text = await blob.text();
            const exported = JSON.parse(text);

            expect(exported.version).toBe('3.0.0');
            expect(exported.api.apiKey).toBeUndefined(); // API 키 제외
        });

        it('API 키를 포함하여 내보낼 수 있어야 함', async () => {
            const api = await settingsAPI.get('api');
            api.apiKey = 'sk-test-key';
            await settingsAPI.set('api', api);

            const blob = await settingsAPI.export({ includeApiKeys: true });
            const text = await blob.text();
            const exported = JSON.parse(text);

            expect(exported.api.apiKey).toBeDefined();
        });

        it('설정을 가져올 수 있어야 함', async () => {
            const importData = {
                version: '3.0.0',
                general: {
                    language: 'ja',
                    theme: 'light',
                    autoSave: false,
                    saveInterval: 60000,
                    notifications: {
                        enabled: false,
                        sound: true,
                        position: 'bottom-left' as const
                    }
                }
            };

            const file = new File(
                [JSON.stringify(importData)],
                'settings.json',
                { type: 'application/json' }
            );

            const result = await settingsAPI.import(file, { merge: true });

            expect(result.success).toBe(true);

            const general = await settingsAPI.get('general');
            expect(general.language).toBe('ja');
            expect(general.theme).toBe('light');
        });

        it('유효하지 않은 파일 가져오기를 거부해야 함', async () => {
            const invalidData = { invalid: 'data' };
            const file = new File(
                [JSON.stringify(invalidData)],
                'invalid.json',
                { type: 'application/json' }
            );

            const result = await settingsAPI.import(file, { validate: true });

            expect(result.success).toBe(false);
            expect(result.errors).toBeDefined();
        });
    });

    describe('설정 초기화', () => {
        it('전체 설정을 초기화할 수 있어야 함', async () => {
            // 설정 변경
            const general = await settingsAPI.get('general');
            general.language = 'ko';
            await settingsAPI.set('general', general);

            // 초기화
            await settingsAPI.reset('all');

            const resetGeneral = await settingsAPI.get('general');
            expect(resetGeneral.language).toBe('auto'); // 기본값
        });

        it('특정 섹션만 초기화할 수 있어야 함', async () => {
            // 설정 변경
            const general = await settingsAPI.get('general');
            general.language = 'ko';
            await settingsAPI.set('general', general);

            const api = await settingsAPI.get('api');
            api.maxTokens = 8192;
            await settingsAPI.set('api', api);

            // general만 초기화
            await settingsAPI.reset('general');

            const resetGeneral = await settingsAPI.get('general');
            const resetApi = await settingsAPI.get('api');

            expect(resetGeneral.language).toBe('auto'); // 초기화됨
            expect(resetApi.maxTokens).toBe(8192); // 유지됨
        });

        it('초기화 이벤트가 발생해야 함', async () => {
            const resetHandler = jest.fn();
            settingsAPI.on('reset', resetHandler);

            await settingsAPI.reset('all');

            expect(resetHandler).toHaveBeenCalledWith('all');
        });
    });
});

describe('SecureApiKeyManager', () => {
    let manager: SecureApiKeyManager;

    beforeEach(() => {
        localStorageMock.clear();
        manager = new SecureApiKeyManager();
    });

    describe('API 키 저장', () => {
        it('API 키를 암호화하여 저장해야 함', async () => {
            const apiKey = 'sk-test1234567890abcdef';

            await manager.storeApiKey(apiKey);

            const stored = localStorageMock.getItem('encrypted_api_key');
            expect(stored).toBeDefined();
            expect(stored).not.toBe(apiKey); // 암호화됨

            const parsed = JSON.parse(stored!);
            expect(parsed.data).toBeDefined();
            expect(parsed.iv).toBeDefined();
            expect(parsed.salt).toBeDefined();
        });

        it('유효하지 않은 API 키를 거부해야 함', async () => {
            const invalidKey = 'invalid-key';

            await expect(manager.storeApiKey(invalidKey)).rejects.toThrow('Invalid API key format');
        });
    });

    describe('API 키 조회', () => {
        it('저장된 API 키를 복호화하여 반환해야 함', async () => {
            const apiKey = 'sk-test1234567890abcdef';

            await manager.storeApiKey(apiKey);
            const retrieved = await manager.getApiKey();

            expect(retrieved).toBe(apiKey);
        });

        it('API 키가 없으면 null을 반환해야 함', async () => {
            const retrieved = await manager.getApiKey();

            expect(retrieved).toBeNull();
        });
    });

    describe('API 키 마스킹', () => {
        it('API 키를 올바르게 마스킹해야 함', () => {
            const apiKey = 'sk-test1234567890abcdef';
            const masked = SecureApiKeyManager.maskApiKey(apiKey);

            expect(masked).toContain('sk-test');
            expect(masked).toContain('*');
            expect(masked).toContain('cdef');
            expect(masked).not.toBe(apiKey);
        });

        it('짧은 API 키도 마스킹해야 함', () => {
            const shortKey = 'sk-123';
            const masked = SecureApiKeyManager.maskApiKey(shortKey);

            expect(masked).toContain('*');
            expect(masked.length).toBeGreaterThan(0);
        });
    });

    describe('API 키 관리', () => {
        it('API 키 존재 여부를 확인할 수 있어야 함', async () => {
            expect(manager.hasApiKey()).toBe(false);

            await manager.storeApiKey('sk-test1234567890abcdef');

            expect(manager.hasApiKey()).toBe(true);
        });

        it('API 키를 삭제할 수 있어야 함', async () => {
            await manager.storeApiKey('sk-test1234567890abcdef');
            expect(manager.hasApiKey()).toBe(true);

            manager.clearApiKey();

            expect(manager.hasApiKey()).toBe(false);
            expect(await manager.getApiKey()).toBeNull();
        });
    });
});

describe('Encryptor', () => {
    let encryptor: Encryptor;

    beforeEach(() => {
        encryptor = new Encryptor();
    });

    it('텍스트를 암호화할 수 있어야 함', async () => {
        const plainText = 'This is a secret message';

        const encrypted = await encryptor.encrypt(plainText);

        expect(encrypted.data).toBeDefined();
        expect(encrypted.iv).toBeDefined();
        expect(encrypted.salt).toBeDefined();
        expect(encrypted.data).not.toBe(plainText);
    });

    it('암호화된 텍스트를 복호화할 수 있어야 함', async () => {
        const plainText = 'This is a secret message';

        const encrypted = await encryptor.encrypt(plainText);
        const decrypted = await encryptor.decrypt(encrypted);

        expect(decrypted).toBe(plainText);
    });

    it('다른 salt/iv로 암호화하면 다른 결과가 나와야 함', async () => {
        const plainText = 'Same message';

        const encrypted1 = await encryptor.encrypt(plainText);
        const encrypted2 = await encryptor.encrypt(plainText);

        expect(encrypted1.data).not.toBe(encrypted2.data);
        expect(encrypted1.iv).not.toBe(encrypted2.iv);
        expect(encrypted1.salt).not.toBe(encrypted2.salt);
    });

    it('유니코드 텍스트를 처리할 수 있어야 함', async () => {
        const unicodeText = '한글 テスト 🚀 Unicode!';

        const encrypted = await encryptor.encrypt(unicodeText);
        const decrypted = await encryptor.decrypt(encrypted);

        expect(decrypted).toBe(unicodeText);
    });
});

describe('SettingsValidator', () => {
    let validator: SettingsValidator;

    beforeEach(() => {
        validator = new SettingsValidator();
    });

    describe('General 설정 검증', () => {
        it('유효한 general 설정을 통과시켜야 함', () => {
            const result = validator.validateField('general', {
                language: 'ko',
                theme: 'dark',
                autoSave: true,
                saveInterval: 30000,
                notifications: {
                    enabled: true,
                    sound: false,
                    position: 'top-right'
                }
            });

            expect(result.valid).toBe(true);
        });

        it('유효하지 않은 언어 코드를 거부해야 함', () => {
            const result = validator.validateField('general', {
                language: 'invalid-lang'
            });

            expect(result.valid).toBe(false);
            expect(result.errors?.[0].code).toBe('INVALID_LANGUAGE');
        });

        it('너무 짧은 저장 간격에 대해 경고해야 함', () => {
            const result = validator.validateField('general', {
                saveInterval: 5000
            });

            expect(result.valid).toBe(true);
            expect(result.warnings).toBeDefined();
        });
    });

    describe('API 설정 검증', () => {
        it('유효한 API 설정을 통과시켜야 함', () => {
            const result = validator.validateField('api', {
                provider: 'openai',
                model: 'whisper-1',
                maxTokens: 4096,
                temperature: 0.7
            });

            expect(result.valid).toBe(true);
        });

        it('커스텀 프로바이더에 엔드포인트가 없으면 거부해야 함', () => {
            const result = validator.validateField('api', {
                provider: 'custom'
            });

            expect(result.valid).toBe(false);
            expect(result.errors?.[0].code).toBe('MISSING_ENDPOINT');
        });

        it('유효하지 않은 temperature를 거부해야 함', () => {
            const result = validator.validateField('api', {
                temperature: 3
            });

            expect(result.valid).toBe(false);
            expect(result.errors?.[0].code).toBe('INVALID_TEMPERATURE');
        });
    });

    describe('API 키 검증', () => {
        it('유효한 OpenAI API 키를 통과시켜야 함', () => {
            const result = SettingsValidator.validateApiKey('sk-test1234567890abcdefghijklmnopqrstuvwxyz');

            expect(result.valid).toBe(true);
        });

        it('너무 짧은 API 키를 거부해야 함', () => {
            const result = SettingsValidator.validateApiKey('sk-short');

            expect(result.valid).toBe(false);
            expect(result.errors?.[0].code).toBe('INVALID_API_KEY_LENGTH');
        });

        it('빈 API 키를 거부해야 함', () => {
            const result = SettingsValidator.validateApiKey('');

            expect(result.valid).toBe(false);
            expect(result.errors?.[0].code).toBe('MISSING_API_KEY');
        });
    });
});

describe('SettingsMigrator', () => {
    let migrator: SettingsMigrator;

    beforeEach(() => {
        migrator = new SettingsMigrator();
    });

    it('마이그레이션이 필요한지 확인할 수 있어야 함', () => {
        expect(migrator.needsMigration('2.0.0', '3.0.0')).toBe(true);
        expect(migrator.needsMigration('3.0.0', '3.0.0')).toBe(false);
    });

    it('버전 호환성을 확인할 수 있어야 함', () => {
        expect(migrator.isCompatible('2.0.0')).toBe(true);
        expect(migrator.isCompatible('3.0.0')).toBe(true);
        expect(migrator.isCompatible('4.0.0')).toBe(false);
    });

    it('설정을 마이그레이션할 수 있어야 함', async () => {
        const oldSettings = {
            version: '2.0.0',
            general: {
                language: 'ko',
                autoSave: true
            },
            api: {
                apiKey: 'sk-old-key',
                model: 'whisper-1'
            }
        };

        const migrated = await migrator.migrate(oldSettings, '2.0.0', '3.0.0');

        expect(migrated.version).toBe('3.0.0');
        expect(migrated.shortcuts).toBeDefined(); // 새로 추가된 필드
        expect(migrated.advanced.debug).toBeDefined(); // 새로 추가된 필드
    });

    it('백업을 생성할 수 있어야 함', async () => {
        const settings = {
            version: '3.0.0',
            general: { language: 'ko' }
        };

        const backupKey = await migrator.createBackup(settings);

        expect(backupKey).toContain('settings_backup_');
        expect(localStorageMock.getItem(backupKey)).toBeDefined();
    });

    it('백업을 복원할 수 있어야 함', async () => {
        const settings = {
            version: '3.0.0',
            general: { language: 'ko' }
        };

        const backupKey = await migrator.createBackup(settings);
        const restored = await migrator.restoreBackup(backupKey);

        expect(restored.version).toBe('3.0.0');
        expect(restored.general.language).toBe('ko');
    });
});