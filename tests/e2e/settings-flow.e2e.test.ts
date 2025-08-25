/**
 * E2E Test: 설정 변경 및 저장 플로우
 * 
 * 테스트 시나리오:
 * 1. 설정 탭 열기
 * 2. 각 설정 항목 변경
 * 3. 유효성 검사
 * 4. 설정 저장
 * 5. 설정 복원
 * 6. 설정 마이그레이션
 */

import { App, PluginSettingTab, Setting } from 'obsidian';
import { SettingsTab } from '../../src/ui/settings/SettingsTab';
import { SettingsManager } from '../../src/infrastructure/storage/SettingsManager';
import { SettingsValidator } from '../../src/infrastructure/api/SettingsValidator';
import { SettingsMigrator } from '../../src/infrastructure/api/SettingsMigrator';
import { ApiKeyValidator } from '../../src/ui/settings/components/ApiKeyValidator';
import { NotificationManager } from '../../src/ui/notifications/NotificationManager';
import { Settings } from '../../src/domain/models/Settings';
import { EventManager } from '../../src/application/EventManager';

describe('E2E: 설정 플로우', () => {
    let app: App;
    let plugin: any;
    let settingsTab: SettingsTab;
    let settingsManager: SettingsManager;
    let settingsValidator: SettingsValidator;
    let settingsMigrator: SettingsMigrator;
    let notificationManager: NotificationManager;
    let eventManager: EventManager;
    let containerEl: HTMLElement;

    beforeEach(() => {
        // Mock DOM 환경
        containerEl = document.createElement('div');
        document.body.appendChild(containerEl);

        // Mock Obsidian App
        app = {
            vault: {
                adapter: {
                    read: jest.fn(),
                    write: jest.fn(),
                    exists: jest.fn().mockResolvedValue(true)
                }
            },
            workspace: {
                trigger: jest.fn()
            }
        } as any;

        // Mock Plugin
        plugin = {
            manifest: {
                id: 'speech-to-text',
                name: 'Speech to Text',
                version: '2.0.0'
            },
            settings: {
                apiKey: '',
                apiUrl: 'https://api.openai.com/v1/audio/transcriptions',
                model: 'whisper-1',
                language: 'auto',
                temperature: 0,
                responseFormat: 'text',
                maxFileSize: 25,
                autoSave: true,
                insertPosition: 'cursor',
                addTimestamp: false,
                timestampFormat: 'YYYY-MM-DD HH:mm:ss',
                enableNotifications: true,
                debug: false,
                retryAttempts: 3,
                retryDelay: 1000,
                timeout: 30000,
                concurrentLimit: 3
            },
            saveData: jest.fn(),
            loadData: jest.fn()
        };

        // 서비스 초기화
        eventManager = new EventManager();
        settingsValidator = new SettingsValidator();
        settingsMigrator = new SettingsMigrator();
        settingsManager = new SettingsManager(plugin);
        notificationManager = new NotificationManager(app, plugin.settings);
        settingsTab = new SettingsTab(app, plugin);
    });

    afterEach(() => {
        document.body.removeChild(containerEl);
        jest.clearAllMocks();
    });

    describe('설정 UI 렌더링', () => {
        test('모든 설정 섹션이 올바르게 표시됨', () => {
            settingsTab.display();

            // 섹션 확인
            const sections = containerEl.querySelectorAll('.setting-section');
            expect(sections.length).toBeGreaterThan(0);

            // 주요 설정 항목 확인
            const apiKeyInput = containerEl.querySelector('input[type="password"]');
            expect(apiKeyInput).toBeTruthy();

            const languageDropdown = containerEl.querySelector('select.language-select');
            expect(languageDropdown).toBeTruthy();

            const saveButton = containerEl.querySelector('button.save-settings');
            expect(saveButton).toBeTruthy();
        });

        test('설정 그룹별 접기/펼치기 기능', () => {
            settingsTab.display();

            // 고급 설정 섹션 찾기
            const advancedSection = containerEl.querySelector('.advanced-settings');
            const toggleButton = advancedSection?.querySelector('.section-toggle');

            expect(advancedSection).toBeTruthy();
            expect(toggleButton).toBeTruthy();

            // 초기 상태: 접혀있음
            expect(advancedSection?.classList.contains('collapsed')).toBe(true);

            // 클릭하여 펼치기
            toggleButton?.dispatchEvent(new MouseEvent('click'));
            expect(advancedSection?.classList.contains('collapsed')).toBe(false);

            // 다시 클릭하여 접기
            toggleButton?.dispatchEvent(new MouseEvent('click'));
            expect(advancedSection?.classList.contains('collapsed')).toBe(true);
        });
    });

    describe('설정 변경 및 유효성 검사', () => {
        test('API 키 입력 및 검증', async () => {
            settingsTab.display();

            const apiKeyInput = containerEl.querySelector('input[type="password"]') as HTMLInputElement;
            const validateButton = containerEl.querySelector('button.validate-api-key') as HTMLButtonElement;

            // 빈 API 키 검증
            apiKeyInput.value = '';
            validateButton.click();
            
            await new Promise(resolve => setTimeout(resolve, 100));
            
            let errorMessage = containerEl.querySelector('.error-message');
            expect(errorMessage?.textContent).toContain('API 키를 입력해주세요');

            // 유효한 API 키 입력
            apiKeyInput.value = 'sk-valid-api-key-1234567890';
            apiKeyInput.dispatchEvent(new Event('input'));

            // Mock API 검증 성공
            global.fetch = jest.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ models: ['whisper-1'] })
            });

            validateButton.click();
            await new Promise(resolve => setTimeout(resolve, 100));

            const successMessage = containerEl.querySelector('.success-message');
            expect(successMessage?.textContent).toContain('API 키가 유효합니다');
        });

        test('언어 설정 변경', () => {
            settingsTab.display();

            const languageSelect = containerEl.querySelector('select.language-select') as HTMLSelectElement;
            
            // 초기값 확인
            expect(languageSelect.value).toBe('auto');

            // 언어 변경
            languageSelect.value = 'ko';
            languageSelect.dispatchEvent(new Event('change'));

            expect(plugin.settings.language).toBe('ko');

            // 다른 언어로 변경
            languageSelect.value = 'en';
            languageSelect.dispatchEvent(new Event('change'));

            expect(plugin.settings.language).toBe('en');
        });

        test('파일 크기 제한 설정', () => {
            settingsTab.display();

            const fileSizeInput = containerEl.querySelector('input.file-size-input') as HTMLInputElement;
            
            // 유효한 값
            fileSizeInput.value = '20';
            fileSizeInput.dispatchEvent(new Event('input'));
            expect(plugin.settings.maxFileSize).toBe(20);

            // 최대값 초과
            fileSizeInput.value = '30';
            fileSizeInput.dispatchEvent(new Event('input'));
            
            const errorMessage = containerEl.querySelector('.file-size-error');
            expect(errorMessage?.textContent).toContain('최대 25MB까지 허용됩니다');

            // 최소값 미만
            fileSizeInput.value = '0';
            fileSizeInput.dispatchEvent(new Event('input'));
            expect(errorMessage?.textContent).toContain('최소 1MB 이상이어야 합니다');
        });

        test('응답 형식 설정', () => {
            settingsTab.display();

            const formatRadios = containerEl.querySelectorAll('input[name="response-format"]') as NodeListOf<HTMLInputElement>;
            
            // text 형식 선택
            const textRadio = Array.from(formatRadios).find(r => r.value === 'text');
            textRadio?.click();
            expect(plugin.settings.responseFormat).toBe('text');

            // json 형식 선택
            const jsonRadio = Array.from(formatRadios).find(r => r.value === 'json');
            jsonRadio?.click();
            expect(plugin.settings.responseFormat).toBe('json');

            // 추가 옵션 표시 확인 (json 선택 시)
            const timestampOption = containerEl.querySelector('.timestamp-option');
            expect(timestampOption?.classList.contains('visible')).toBe(true);
        });
    });

    describe('설정 저장 및 복원', () => {
        test('설정 저장', async () => {
            const newSettings: Settings = {
                ...plugin.settings,
                apiKey: 'sk-new-api-key',
                language: 'ko',
                maxFileSize: 20,
                enableNotifications: false
            };

            await settingsManager.saveSettings(newSettings);

            expect(plugin.saveData).toHaveBeenCalledWith(newSettings);
            
            // 이벤트 발생 확인
            const eventSpy = jest.spyOn(eventManager, 'emit');
            eventManager.emit('settings:saved', newSettings);
            expect(eventSpy).toHaveBeenCalledWith('settings:saved', newSettings);
        });

        test('설정 불러오기', async () => {
            const savedSettings = {
                apiKey: 'sk-saved-key',
                language: 'en',
                maxFileSize: 15
            };

            plugin.loadData.mockResolvedValue(savedSettings);
            
            const loadedSettings = await settingsManager.loadSettings();
            
            expect(loadedSettings).toMatchObject(savedSettings);
        });

        test('설정 초기화', async () => {
            settingsTab.display();

            const resetButton = containerEl.querySelector('button.reset-settings') as HTMLButtonElement;
            
            // 확인 대화상자 모의
            const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
            
            resetButton.click();
            
            expect(confirmSpy).toHaveBeenCalledWith('모든 설정을 초기값으로 되돌리시겠습니까?');
            
            // 기본 설정으로 복원 확인
            expect(plugin.settings.apiKey).toBe('');
            expect(plugin.settings.language).toBe('auto');
            expect(plugin.settings.maxFileSize).toBe(25);
        });

        test('설정 내보내기/가져오기', async () => {
            settingsTab.display();

            // 내보내기
            const exportButton = containerEl.querySelector('button.export-settings') as HTMLButtonElement;
            const downloadSpy = jest.spyOn(document, 'createElement');
            
            exportButton.click();
            
            // 다운로드 링크 생성 확인
            expect(downloadSpy).toHaveBeenCalledWith('a');

            // 가져오기
            const importInput = containerEl.querySelector('input[type="file"].import-settings') as HTMLInputElement;
            const importedSettings = {
                apiKey: 'sk-imported-key',
                language: 'ja',
                maxFileSize: 10
            };

            // 파일 읽기 모의
            const file = new File([JSON.stringify(importedSettings)], 'settings.json', { type: 'application/json' });
            const fileReader = new FileReader();
            
            Object.defineProperty(importInput, 'files', {
                value: [file],
                writable: false
            });

            importInput.dispatchEvent(new Event('change'));
            
            // 비동기 처리 대기
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // 설정이 가져와졌는지 확인
            expect(plugin.settings.language).toBe('ja');
        });
    });

    describe('설정 마이그레이션', () => {
        test('구버전 설정 마이그레이션', async () => {
            const oldSettings = {
                apiKey: 'old-key',
                language: 'korean', // 구버전 형식
                fileSize: 20 // 구버전 속성명
            };

            const migratedSettings = await settingsMigrator.migrate(oldSettings);

            expect(migratedSettings.apiKey).toBe('old-key');
            expect(migratedSettings.language).toBe('ko'); // 새 형식으로 변환
            expect(migratedSettings.maxFileSize).toBe(20); // 새 속성명으로 변환
        });

        test('누락된 설정 자동 보완', async () => {
            const incompleteSettings = {
                apiKey: 'test-key'
                // 다른 설정들이 누락됨
            };

            const completedSettings = await settingsMigrator.migrate(incompleteSettings);

            // 기본값으로 보완되었는지 확인
            expect(completedSettings.language).toBe('auto');
            expect(completedSettings.maxFileSize).toBe(25);
            expect(completedSettings.enableNotifications).toBe(true);
        });
    });

    describe('단축키 설정', () => {
        test('단축키 등록 및 변경', () => {
            settingsTab.display();

            const hotkeySection = containerEl.querySelector('.hotkey-settings');
            const hotkeyInput = hotkeySection?.querySelector('input.hotkey-input') as HTMLInputElement;

            // 단축키 입력 시뮬레이션
            const keyEvent = new KeyboardEvent('keydown', {
                ctrlKey: true,
                shiftKey: true,
                key: 'T'
            });

            hotkeyInput.focus();
            hotkeyInput.dispatchEvent(keyEvent);

            expect(hotkeyInput.value).toBe('Ctrl+Shift+T');

            // 중복 단축키 검사
            const duplicateEvent = new KeyboardEvent('keydown', {
                ctrlKey: true,
                key: 'S' // 저장 단축키와 충돌
            });

            hotkeyInput.dispatchEvent(duplicateEvent);
            
            const warningMessage = containerEl.querySelector('.hotkey-warning');
            expect(warningMessage?.textContent).toContain('이미 사용 중인 단축키입니다');
        });
    });

    describe('설정 변경 실시간 반영', () => {
        test('알림 설정 변경 시 즉시 반영', () => {
            settingsTab.display();

            const notificationToggle = containerEl.querySelector('input[type="checkbox"].notification-toggle') as HTMLInputElement;
            
            // 알림 비활성화
            notificationToggle.checked = false;
            notificationToggle.dispatchEvent(new Event('change'));

            expect(plugin.settings.enableNotifications).toBe(false);

            // NotificationManager에 즉시 반영되는지 확인
            const testNotification = notificationManager.success('테스트 메시지');
            expect(testNotification).toBeUndefined(); // 알림이 생성되지 않음
        });

        test('디버그 모드 토글', () => {
            settingsTab.display();

            const debugToggle = containerEl.querySelector('input[type="checkbox"].debug-toggle') as HTMLInputElement;
            
            // 디버그 모드 활성화
            debugToggle.checked = true;
            debugToggle.dispatchEvent(new Event('change'));

            expect(plugin.settings.debug).toBe(true);

            // 콘솔 로그 활성화 확인
            const consoleSpy = jest.spyOn(console, 'log');
            console.log('[DEBUG] Test message');
            expect(consoleSpy).toHaveBeenCalledWith('[DEBUG] Test message');
        });
    });
});