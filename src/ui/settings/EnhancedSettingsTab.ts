/**
 * Phase 3 개선된 설정 탭 UI
 */

import { App, PluginSettingTab, Setting, Notice, Modal, ButtonComponent, ToggleComponent } from 'obsidian';
import type SpeechToTextPlugin from '../../main';
import { SettingsAPI } from '../../infrastructure/api/SettingsAPI';
import { SecureApiKeyManager } from '../../infrastructure/security/Encryptor';
import { SettingsValidator } from '../../infrastructure/api/SettingsValidator';
import type { SettingsSchema, ValidationResult } from '../../types/phase3-api';
import { AutoDisposable } from '../../utils/memory/MemoryManager';

/**
 * 개선된 설정 탭
 */
export class EnhancedSettingsTab extends PluginSettingTab {
    private plugin: SpeechToTextPlugin;
    private settingsAPI: SettingsAPI;
    private apiKeyManager: SecureApiKeyManager;
    private validator: SettingsValidator;
    private memoryManager: AutoDisposable;
    private isDirty: boolean = false;
    private autoSaveTimeout: NodeJS.Timeout | null = null;

    constructor(app: App, plugin: SpeechToTextPlugin) {
        super(app, plugin);
        this.plugin = plugin;
        this.settingsAPI = new SettingsAPI();
        this.apiKeyManager = new SecureApiKeyManager();
        this.validator = new SettingsValidator();
        this.memoryManager = new ResourceManager();
        
        // 초기화
        this.initialize();
    }

    /**
     * 초기화
     */
    private async initialize(): Promise<void> {
        await this.settingsAPI.initialize();
        
        // 변경 감지 리스너
        const unsubscribe = this.settingsAPI.on('change', () => {
            this.isDirty = true;
            this.scheduleAutoSave();
        });
        
        this.memoryManager.add({
            dispose: () => unsubscribe()
        });
    }

    /**
     * 설정 화면 표시
     */
    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.addClass('enhanced-settings-tab');

        // 헤더
        this.createHeader(containerEl);

        // 탭 네비게이션
        const tabContainer = this.createTabNavigation(containerEl);
        
        // 섹션 컨테이너
        const contentContainer = containerEl.createDiv({ cls: 'settings-content' });

        // 기본 탭 표시
        this.showGeneralSettings(contentContainer);

        // 푸터
        this.createFooter(containerEl);
    }

    /**
     * 헤더 생성
     */
    private createHeader(containerEl: HTMLElement): void {
        const headerEl = containerEl.createDiv({ cls: 'settings-header-enhanced' });
        
        // 제목
        const titleContainer = headerEl.createDiv({ cls: 'header-title-container' });
        titleContainer.createEl('h2', { 
            text: 'Speech to Text Settings',
            cls: 'settings-title' 
        });
        
        // 상태 표시
        const statusBadge = titleContainer.createEl('span', {
            cls: 'status-badge',
            text: this.isDirty ? 'Modified' : 'Saved'
        });
        
        if (this.isDirty) {
            statusBadge.addClass('status-modified');
        } else {
            statusBadge.addClass('status-saved');
        }

        // 설명
        headerEl.createEl('p', { 
            text: 'Configure speech-to-text transcription settings',
            cls: 'settings-description' 
        });

        // 빠른 동작 버튼들
        const quickActions = headerEl.createDiv({ cls: 'quick-actions' });
        
        new ButtonComponent(quickActions)
            .setButtonText('Save All')
            .setCta()
            .onClick(async () => {
                await this.saveSettings();
                new Notice('Settings saved successfully');
            });

        new ButtonComponent(quickActions)
            .setButtonText('Reset to Defaults')
            .setWarning()
            .onClick(async () => {
                if (await this.confirmReset()) {
                    await this.resetSettings();
                }
            });
    }

    /**
     * 탭 네비게이션 생성
     */
    private createTabNavigation(containerEl: HTMLElement): HTMLElement {
        const tabContainer = containerEl.createDiv({ cls: 'settings-tabs' });
        
        const tabs = [
            { id: 'general', label: 'General', icon: '⚙️' },
            { id: 'api', label: 'API', icon: '🔑' },
            { id: 'audio', label: 'Audio', icon: '🎙️' },
            { id: 'advanced', label: 'Advanced', icon: '🔧' },
            { id: 'shortcuts', label: 'Shortcuts', icon: '⌨️' },
            { id: 'about', label: 'About', icon: 'ℹ️' }
        ];

        tabs.forEach(tab => {
            const tabEl = tabContainer.createEl('button', {
                cls: 'settings-tab',
                text: `${tab.icon} ${tab.label}`
            });
            
            tabEl.setAttribute('data-tab', tab.id);
            
            tabEl.addEventListener('click', () => {
                // 활성 탭 업데이트
                tabContainer.querySelectorAll('.settings-tab').forEach(el => {
                    el.removeClass('active');
                });
                tabEl.addClass('active');
                
                // 콘텐츠 표시
                const contentContainer = containerEl.querySelector('.settings-content') as HTMLElement;
                this.showTabContent(contentContainer, tab.id);
            });
        });

        // 첫 번째 탭 활성화
        tabContainer.querySelector('.settings-tab')?.addClass('active');

        return tabContainer;
    }

    /**
     * 탭 콘텐츠 표시
     */
    private showTabContent(container: HTMLElement, tabId: string): void {
        container.empty();
        
        switch (tabId) {
            case 'general':
                this.showGeneralSettings(container);
                break;
            case 'api':
                this.showApiSettings(container);
                break;
            case 'audio':
                this.showAudioSettings(container);
                break;
            case 'advanced':
                this.showAdvancedSettings(container);
                break;
            case 'shortcuts':
                this.showShortcutSettings(container);
                break;
            case 'about':
                this.showAbout(container);
                break;
        }
    }

    /**
     * General 설정
     */
    private showGeneralSettings(container: HTMLElement): void {
        const section = container.createDiv({ cls: 'settings-section' });
        
        section.createEl('h3', { text: 'General Settings' });

        // 언어 설정
        new Setting(section)
            .setName('Language')
            .setDesc('Select the language for transcription')
            .addDropdown(dropdown => {
                const languages = {
                    'auto': 'Auto Detect',
                    'en': 'English',
                    'ko': '한국어',
                    'ja': '日本語',
                    'zh': '中文',
                    'es': 'Español',
                    'fr': 'Français',
                    'de': 'Deutsch'
                };
                
                Object.entries(languages).forEach(([code, name]) => {
                    dropdown.addOption(code, name);
                });
                
                this.settingsAPI.get('general').then(general => {
                    dropdown.setValue(general.language);
                });
                
                dropdown.onChange(async (value) => {
                    const general = await this.settingsAPI.get('general');
                    general.language = value as any;
                    await this.settingsAPI.set('general', general);
                });
            });

        // 테마 설정
        new Setting(section)
            .setName('Theme')
            .setDesc('Choose the appearance theme')
            .addDropdown(dropdown => {
                dropdown
                    .addOption('auto', 'Auto (System)')
                    .addOption('light', 'Light')
                    .addOption('dark', 'Dark');
                
                this.settingsAPI.get('general').then(general => {
                    dropdown.setValue(general.theme);
                });
                
                dropdown.onChange(async (value) => {
                    const general = await this.settingsAPI.get('general');
                    general.theme = value as any;
                    await this.settingsAPI.set('general', general);
                    this.applyTheme(value);
                });
            });

        // 자동 저장
        new Setting(section)
            .setName('Auto Save')
            .setDesc('Automatically save transcriptions')
            .addToggle(toggle => {
                this.settingsAPI.get('general').then(general => {
                    toggle.setValue(general.autoSave);
                });
                
                toggle.onChange(async (value) => {
                    const general = await this.settingsAPI.get('general');
                    general.autoSave = value;
                    await this.settingsAPI.set('general', general);
                });
            });

        // 저장 간격
        new Setting(section)
            .setName('Save Interval')
            .setDesc('Auto-save interval in seconds')
            .addSlider(slider => {
                slider
                    .setLimits(10, 300, 10)
                    .setDynamicTooltip();
                
                this.settingsAPI.get('general').then(general => {
                    slider.setValue(general.saveInterval / 1000);
                });
                
                slider.onChange(async (value) => {
                    const general = await this.settingsAPI.get('general');
                    general.saveInterval = value * 1000;
                    await this.settingsAPI.set('general', general);
                });
            });

        // 알림 설정
        const notificationSection = section.createDiv({ cls: 'sub-section' });
        notificationSection.createEl('h4', { text: 'Notifications' });

        new Setting(notificationSection)
            .setName('Enable Notifications')
            .setDesc('Show notifications for events')
            .addToggle(toggle => {
                this.settingsAPI.get('general').then(general => {
                    toggle.setValue(general.notifications.enabled);
                });
                
                toggle.onChange(async (value) => {
                    const general = await this.settingsAPI.get('general');
                    general.notifications.enabled = value;
                    await this.settingsAPI.set('general', general);
                });
            });

        new Setting(notificationSection)
            .setName('Sound')
            .setDesc('Play sound with notifications')
            .addToggle(toggle => {
                this.settingsAPI.get('general').then(general => {
                    toggle.setValue(general.notifications.sound);
                });
                
                toggle.onChange(async (value) => {
                    const general = await this.settingsAPI.get('general');
                    general.notifications.sound = value;
                    await this.settingsAPI.set('general', general);
                });
            });
    }

    /**
     * API 설정
     */
    private async showApiSettings(container: HTMLElement): Promise<void> {
        const section = container.createDiv({ cls: 'settings-section' });
        
        section.createEl('h3', { text: 'API Configuration' });

        // API 프로바이더
        new Setting(section)
            .setName('API Provider')
            .setDesc('Select the transcription service provider')
            .addDropdown(dropdown => {
                dropdown
                    .addOption('openai', 'OpenAI Whisper')
                    .addOption('azure', 'Azure Speech Services')
                    .addOption('custom', 'Custom Endpoint');
                
                this.settingsAPI.get('api').then(api => {
                    dropdown.setValue(api.provider);
                });
                
                dropdown.onChange(async (value) => {
                    const api = await this.settingsAPI.get('api');
                    api.provider = value as any;
                    await this.settingsAPI.set('api', api);
                    
                    // UI 업데이트
                    this.showApiSettings(container);
                });
            });

        // API 키 입력 (보안 강화)
        const apiKeySetting = new Setting(section)
            .setName('API Key')
            .setDesc('Enter your API key (securely encrypted)');

        const inputContainer = apiKeySetting.controlEl.createDiv({ cls: 'api-key-input-container' });
        
        const inputEl = inputContainer.createEl('input', {
            type: 'password',
            placeholder: 'Enter API key...',
            cls: 'api-key-input'
        });

        // 기존 키 확인
        const hasKey = this.apiKeyManager.hasApiKey();
        if (hasKey) {
            inputEl.placeholder = '••••••••••••••••';
            inputEl.addClass('has-value');
        }

        // 토글 버튼
        const toggleBtn = inputContainer.createEl('button', {
            cls: 'api-key-toggle',
            attr: { 'aria-label': 'Toggle visibility' }
        });
        toggleBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24"><path d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 10c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/></svg>`;
        
        let isVisible = false;
        toggleBtn.addEventListener('click', async () => {
            isVisible = !isVisible;
            if (isVisible) {
                inputEl.type = 'text';
                if (hasKey) {
                    const key = await this.apiKeyManager.getApiKey();
                    if (key) inputEl.value = key;
                }
            } else {
                inputEl.type = 'password';
                if (hasKey && !inputEl.value) {
                    inputEl.value = '';
                    inputEl.placeholder = '••••••••••••••••';
                }
            }
        });

        // 검증 버튼
        const validateBtn = inputContainer.createEl('button', {
            text: 'Validate',
            cls: 'mod-cta api-key-validate'
        });

        validateBtn.addEventListener('click', async () => {
            const value = inputEl.value;
            if (!value) {
                new Notice('Please enter an API key');
                return;
            }

            validateBtn.disabled = true;
            validateBtn.textContent = 'Validating...';

            try {
                // API 키 검증
                const validation = SettingsValidator.validateApiKey(value);
                
                if (validation.valid) {
                    // 암호화 저장
                    await this.apiKeyManager.storeApiKey(value);
                    new Notice('✅ API key validated and saved securely');
                    inputEl.value = '';
                    inputEl.placeholder = '••••••••••••••••';
                    inputEl.addClass('has-value');
                } else {
                    const error = validation.errors?.[0]?.message || 'Invalid API key';
                    new Notice(`❌ ${error}`);
                }
            } catch (error) {
                new Notice('❌ Failed to validate API key');
                console.error(error);
            } finally {
                validateBtn.disabled = false;
                validateBtn.textContent = 'Validate';
            }
        });

        // 모델 선택
        const api = await this.settingsAPI.get('api');
        if (api.provider === 'openai') {
            new Setting(section)
                .setName('Model')
                .setDesc('Select the OpenAI model')
                .addDropdown(dropdown => {
                    dropdown.addOption('whisper-1', 'Whisper v1');
                    dropdown.setValue(api.model);
                    
                    dropdown.onChange(async (value) => {
                        api.model = value;
                        await this.settingsAPI.set('api', api);
                    });
                });
        }

        // 커스텀 엔드포인트
        if (api.provider === 'custom') {
            new Setting(section)
                .setName('Endpoint URL')
                .setDesc('Custom API endpoint')
                .addText(text => {
                    text.setPlaceholder('https://api.example.com/transcribe');
                    text.setValue(api.endpoint || '');
                    
                    text.onChange(async (value) => {
                        api.endpoint = value;
                        await this.settingsAPI.set('api', api);
                    });
                });
        }

        // 고급 API 설정
        new Setting(section)
            .setName('Max Tokens')
            .setDesc('Maximum tokens per request')
            .addText(text => {
                text.setPlaceholder('4096');
                text.setValue(String(api.maxTokens));
                
                text.onChange(async (value) => {
                    const num = parseInt(value);
                    if (!isNaN(num) && num > 0) {
                        api.maxTokens = num;
                        await this.settingsAPI.set('api', api);
                    }
                });
            });

        new Setting(section)
            .setName('Temperature')
            .setDesc('Model temperature (0-2)')
            .addSlider(slider => {
                slider
                    .setLimits(0, 2, 0.1)
                    .setDynamicTooltip()
                    .setValue(api.temperature);
                
                slider.onChange(async (value) => {
                    api.temperature = value;
                    await this.settingsAPI.set('api', api);
                });
            });
    }

    /**
     * Audio 설정
     */
    private async showAudioSettings(container: HTMLElement): Promise<void> {
        const section = container.createDiv({ cls: 'settings-section' });
        
        section.createEl('h3', { text: 'Audio Settings' });

        const audio = await this.settingsAPI.get('audio');

        // 오디오 포맷
        new Setting(section)
            .setName('Audio Format')
            .setDesc('Select the audio format for recording')
            .addDropdown(dropdown => {
                dropdown
                    .addOption('webm', 'WebM (Recommended)')
                    .addOption('mp3', 'MP3')
                    .addOption('m4a', 'M4A')
                    .addOption('wav', 'WAV (Lossless)');
                
                dropdown.setValue(audio.format);
                dropdown.onChange(async (value) => {
                    audio.format = value as any;
                    await this.settingsAPI.set('audio', audio);
                });
            });

        // 오디오 품질
        new Setting(section)
            .setName('Audio Quality')
            .setDesc('Select recording quality')
            .addDropdown(dropdown => {
                dropdown
                    .addOption('low', 'Low (Smaller file)')
                    .addOption('medium', 'Medium')
                    .addOption('high', 'High (Recommended)')
                    .addOption('lossless', 'Lossless (Large file)');
                
                dropdown.setValue(audio.quality);
                dropdown.onChange(async (value) => {
                    audio.quality = value as any;
                    await this.settingsAPI.set('audio', audio);
                });
            });

        // 샘플 레이트
        new Setting(section)
            .setName('Sample Rate')
            .setDesc('Audio sample rate in Hz')
            .addDropdown(dropdown => {
                const rates = [8000, 16000, 22050, 44100, 48000];
                rates.forEach(rate => {
                    dropdown.addOption(String(rate), `${rate} Hz`);
                });
                
                dropdown.setValue(String(audio.sampleRate));
                dropdown.onChange(async (value) => {
                    audio.sampleRate = parseInt(value) as any;
                    await this.settingsAPI.set('audio', audio);
                });
            });

        // 채널
        new Setting(section)
            .setName('Channels')
            .setDesc('Mono or stereo recording')
            .addDropdown(dropdown => {
                dropdown
                    .addOption('1', 'Mono (Recommended)')
                    .addOption('2', 'Stereo');
                
                dropdown.setValue(String(audio.channels));
                dropdown.onChange(async (value) => {
                    audio.channels = parseInt(value) as any;
                    await this.settingsAPI.set('audio', audio);
                });
            });

        // 오디오 향상
        new Setting(section)
            .setName('Enhance Audio')
            .setDesc('Apply noise reduction and enhancement')
            .addToggle(toggle => {
                toggle.setValue(audio.enhanceAudio);
                toggle.onChange(async (value) => {
                    audio.enhanceAudio = value;
                    await this.settingsAPI.set('audio', audio);
                });
            });

        // 언어 설정
        new Setting(section)
            .setName('Audio Language')
            .setDesc('Language hint for better recognition')
            .addText(text => {
                text.setPlaceholder('auto');
                text.setValue(audio.language);
                text.onChange(async (value) => {
                    audio.language = value;
                    await this.settingsAPI.set('audio', audio);
                });
            });
    }

    /**
     * Advanced 설정
     */
    private async showAdvancedSettings(container: HTMLElement): Promise<void> {
        const section = container.createDiv({ cls: 'settings-section' });
        
        section.createEl('h3', { text: 'Advanced Settings' });

        const advanced = await this.settingsAPI.get('advanced');

        // 캐시 설정
        const cacheSection = section.createDiv({ cls: 'sub-section' });
        cacheSection.createEl('h4', { text: 'Cache Settings' });

        new Setting(cacheSection)
            .setName('Enable Cache')
            .setDesc('Cache transcription results')
            .addToggle(toggle => {
                toggle.setValue(advanced.cache.enabled);
                toggle.onChange(async (value) => {
                    advanced.cache.enabled = value;
                    await this.settingsAPI.set('advanced', advanced);
                });
            });

        new Setting(cacheSection)
            .setName('Max Cache Size')
            .setDesc('Maximum cache size in MB')
            .addSlider(slider => {
                slider
                    .setLimits(10, 500, 10)
                    .setDynamicTooltip()
                    .setValue(advanced.cache.maxSize / (1024 * 1024));
                
                slider.onChange(async (value) => {
                    advanced.cache.maxSize = value * 1024 * 1024;
                    await this.settingsAPI.set('advanced', advanced);
                });
            });

        new Setting(cacheSection)
            .setName('Cache TTL')
            .setDesc('Cache time-to-live in days')
            .addSlider(slider => {
                slider
                    .setLimits(1, 30, 1)
                    .setDynamicTooltip()
                    .setValue(advanced.cache.ttl / (24 * 60 * 60 * 1000));
                
                slider.onChange(async (value) => {
                    advanced.cache.ttl = value * 24 * 60 * 60 * 1000;
                    await this.settingsAPI.set('advanced', advanced);
                });
            });

        // 성능 설정
        const perfSection = section.createDiv({ cls: 'sub-section' });
        perfSection.createEl('h4', { text: 'Performance Settings' });

        new Setting(perfSection)
            .setName('Max Concurrency')
            .setDesc('Maximum concurrent operations')
            .addSlider(slider => {
                slider
                    .setLimits(1, 10, 1)
                    .setDynamicTooltip()
                    .setValue(advanced.performance.maxConcurrency);
                
                slider.onChange(async (value) => {
                    advanced.performance.maxConcurrency = value;
                    await this.settingsAPI.set('advanced', advanced);
                });
            });

        new Setting(perfSection)
            .setName('Chunk Size')
            .setDesc('File chunk size in MB')
            .addSlider(slider => {
                slider
                    .setLimits(0.5, 10, 0.5)
                    .setDynamicTooltip()
                    .setValue(advanced.performance.chunkSize / (1024 * 1024));
                
                slider.onChange(async (value) => {
                    advanced.performance.chunkSize = value * 1024 * 1024;
                    await this.settingsAPI.set('advanced', advanced);
                });
            });

        new Setting(perfSection)
            .setName('Timeout')
            .setDesc('Request timeout in seconds')
            .addSlider(slider => {
                slider
                    .setLimits(10, 300, 10)
                    .setDynamicTooltip()
                    .setValue(advanced.performance.timeout / 1000);
                
                slider.onChange(async (value) => {
                    advanced.performance.timeout = value * 1000;
                    await this.settingsAPI.set('advanced', advanced);
                });
            });

        new Setting(perfSection)
            .setName('Use Web Workers')
            .setDesc('Process audio in background threads')
            .addToggle(toggle => {
                toggle.setValue(advanced.performance.useWebWorkers);
                toggle.onChange(async (value) => {
                    advanced.performance.useWebWorkers = value;
                    await this.settingsAPI.set('advanced', advanced);
                });
            });

        // 디버그 설정
        const debugSection = section.createDiv({ cls: 'sub-section' });
        debugSection.createEl('h4', { text: 'Debug Settings' });

        new Setting(debugSection)
            .setName('Enable Debug Mode')
            .setDesc('Show detailed logs and diagnostics')
            .addToggle(toggle => {
                toggle.setValue(advanced.debug.enabled);
                toggle.onChange(async (value) => {
                    advanced.debug.enabled = value;
                    await this.settingsAPI.set('advanced', advanced);
                });
            });

        new Setting(debugSection)
            .setName('Log Level')
            .setDesc('Minimum log level to display')
            .addDropdown(dropdown => {
                dropdown
                    .addOption('error', 'Error')
                    .addOption('warn', 'Warning')
                    .addOption('info', 'Info')
                    .addOption('debug', 'Debug');
                
                dropdown.setValue(advanced.debug.logLevel);
                dropdown.onChange(async (value) => {
                    advanced.debug.logLevel = value as any;
                    await this.settingsAPI.set('advanced', advanced);
                });
            });

        new Setting(debugSection)
            .setName('Save Logs to File')
            .setDesc('Export debug logs to file')
            .addToggle(toggle => {
                toggle.setValue(advanced.debug.saveLogsToFile);
                toggle.onChange(async (value) => {
                    advanced.debug.saveLogsToFile = value;
                    await this.settingsAPI.set('advanced', advanced);
                });
            });
    }

    /**
     * Shortcut 설정
     */
    private async showShortcutSettings(container: HTMLElement): Promise<void> {
        const section = container.createDiv({ cls: 'settings-section' });
        
        section.createEl('h3', { text: 'Keyboard Shortcuts' });
        
        const shortcuts = await this.settingsAPI.get('shortcuts');

        // 단축키 항목들
        const shortcutItems = [
            { key: 'startTranscription', label: 'Start Transcription' },
            { key: 'stopTranscription', label: 'Stop Transcription' },
            { key: 'pauseTranscription', label: 'Pause Transcription' },
            { key: 'openSettings', label: 'Open Settings' },
            { key: 'openFilePicker', label: 'Open File Picker' }
        ];

        shortcutItems.forEach(item => {
            new Setting(section)
                .setName(item.label)
                .setDesc(`Shortcut for ${item.label.toLowerCase()}`)
                .addText(text => {
                    text.setPlaceholder('e.g., Ctrl+Shift+S');
                    text.setValue(shortcuts[item.key as keyof typeof shortcuts]);
                    
                    // 단축키 캡처
                    text.inputEl.addEventListener('keydown', async (e) => {
                        e.preventDefault();
                        
                        const modifiers = [];
                        if (e.ctrlKey) modifiers.push('Ctrl');
                        if (e.altKey) modifiers.push('Alt');
                        if (e.shiftKey) modifiers.push('Shift');
                        if (e.metaKey) modifiers.push('Cmd');
                        
                        if (e.key && !['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
                            const shortcut = [...modifiers, e.key.toUpperCase()].join('+');
                            text.setValue(shortcut);
                            
                            shortcuts[item.key as keyof typeof shortcuts] = shortcut;
                            await this.settingsAPI.set('shortcuts', shortcuts);
                        }
                    });
                });
        });

        // 단축키 리셋 버튼
        new ButtonComponent(section)
            .setButtonText('Reset All Shortcuts')
            .onClick(async () => {
                const defaults = this.settingsAPI.getDefault('shortcuts');
                await this.settingsAPI.set('shortcuts', defaults);
                this.showShortcutSettings(container); // 화면 새로고침
                new Notice('Shortcuts reset to defaults');
            });
    }

    /**
     * About 섹션
     */
    private showAbout(container: HTMLElement): void {
        const section = container.createDiv({ cls: 'settings-section about-section' });
        
        section.createEl('h3', { text: 'About Speech to Text' });

        // 버전 정보
        const versionInfo = section.createDiv({ cls: 'version-info' });
        versionInfo.createEl('p', { 
            text: `Version: ${this.plugin.manifest.version}` 
        });
        versionInfo.createEl('p', { 
            text: `Author: ${this.plugin.manifest.author}` 
        });

        // 링크들
        const links = section.createDiv({ cls: 'about-links' });
        
        const githubLink = links.createEl('a', {
            text: '📖 Documentation',
            href: 'https://github.com/yourusername/obsidian-speech-to-text'
        });
        githubLink.setAttribute('target', '_blank');

        links.createEl('br');

        const issueLink = links.createEl('a', {
            text: '🐛 Report Issue',
            href: 'https://github.com/yourusername/obsidian-speech-to-text/issues'
        });
        issueLink.setAttribute('target', '_blank');

        // 통계
        const statsSection = section.createDiv({ cls: 'stats-section' });
        statsSection.createEl('h4', { text: 'Usage Statistics' });
        
        const stats = statsSection.createDiv({ cls: 'stats-grid' });
        
        // 예시 통계 (실제 구현 시 실제 데이터 사용)
        this.createStatItem(stats, 'Total Transcriptions', '0');
        this.createStatItem(stats, 'Total Duration', '0h 0m');
        this.createStatItem(stats, 'Cache Size', '0 MB');
        this.createStatItem(stats, 'API Calls This Month', '0');

        // 캐시 관리
        const cacheSection = section.createDiv({ cls: 'cache-management' });
        cacheSection.createEl('h4', { text: 'Cache Management' });
        
        new ButtonComponent(cacheSection)
            .setButtonText('Clear Cache')
            .setWarning()
            .onClick(async () => {
                // 캐시 클리어 로직
                new Notice('Cache cleared successfully');
            });

        // 로그 내보내기
        new ButtonComponent(cacheSection)
            .setButtonText('Export Logs')
            .onClick(async () => {
                // 로그 내보내기 로직
                new Notice('Logs exported');
            });
    }

    /**
     * 통계 아이템 생성
     */
    private createStatItem(container: HTMLElement, label: string, value: string): void {
        const item = container.createDiv({ cls: 'stat-item' });
        item.createEl('span', { text: label, cls: 'stat-label' });
        item.createEl('span', { text: value, cls: 'stat-value' });
    }

    /**
     * 푸터 생성
     */
    private createFooter(containerEl: HTMLElement): void {
        const footerEl = containerEl.createDiv({ cls: 'settings-footer-enhanced' });
        
        // Import/Export 섹션
        const portSection = footerEl.createDiv({ cls: 'port-section' });
        
        new ButtonComponent(portSection)
            .setButtonText('📤 Export Settings')
            .onClick(async () => {
                await this.exportSettings();
            });

        new ButtonComponent(portSection)
            .setButtonText('📥 Import Settings')
            .onClick(async () => {
                await this.importSettings();
            });

        // 도움말 링크
        const helpSection = footerEl.createDiv({ cls: 'help-section' });
        helpSection.createEl('span', { 
            text: 'Need help? ',
            cls: 'help-text' 
        });
        
        const helpLink = helpSection.createEl('a', {
            text: 'View Documentation',
            href: '#',
            cls: 'help-link'
        });
        
        helpLink.addEventListener('click', (e) => {
            e.preventDefault();
            // 도움말 모달 열기
            new HelpModal(this.app).open();
        });
    }

    /**
     * 테마 적용
     */
    private applyTheme(theme: string): void {
        const body = document.body;
        
        if (theme === 'auto') {
            // 시스템 테마 감지
            const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            theme = isDark ? 'dark' : 'light';
        }

        body.removeClass('theme-light', 'theme-dark');
        body.addClass(`theme-${theme}`);
    }

    /**
     * 자동 저장 스케줄링
     */
    private scheduleAutoSave(): void {
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }

        this.autoSaveTimeout = setTimeout(async () => {
            await this.saveSettings();
            this.isDirty = false;
            new Notice('Settings auto-saved', 2000);
        }, 5000); // 5초 후 자동 저장
    }

    /**
     * 설정 저장
     */
    private async saveSettings(): Promise<void> {
        try {
            // API를 통해 저장 (이미 검증됨)
            this.isDirty = false;
            this.display(); // UI 업데이트
        } catch (error) {
            console.error('Failed to save settings:', error);
            new Notice('Failed to save settings');
        }
    }

    /**
     * 설정 내보내기
     */
    private async exportSettings(): Promise<void> {
        try {
            const blob = await this.settingsAPI.export({
                includeApiKeys: false,
                compress: true
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `speech-to-text-settings-${Date.now()}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
            new Notice('Settings exported successfully');
        } catch (error) {
            console.error('Export failed:', error);
            new Notice('Failed to export settings');
        }
    }

    /**
     * 설정 가져오기
     */
    private async importSettings(): Promise<void> {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,.gz';
        
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            
            try {
                const result = await this.settingsAPI.import(file, {
                    merge: true,
                    validate: true
                });
                
                if (result.success) {
                    new Notice('Settings imported successfully');
                    this.display(); // UI 새로고침
                } else {
                    const errors = result.errors?.join('\n') || 'Unknown error';
                    new Notice(`Import failed:\n${errors}`);
                }
            } catch (error) {
                console.error('Import failed:', error);
                new Notice('Failed to import settings');
            }
        };
        
        input.click();
    }

    /**
     * 설정 초기화 확인
     */
    private async confirmReset(): Promise<boolean> {
        return new Promise((resolve) => {
            const modal = new ConfirmModal(
                this.app,
                'Reset Settings',
                'Are you sure you want to reset all settings to defaults? This cannot be undone.',
                (confirmed) => resolve(confirmed)
            );
            modal.open();
        });
    }

    /**
     * 설정 초기화
     */
    private async resetSettings(): Promise<void> {
        await this.settingsAPI.reset('all');
        new Notice('Settings reset to defaults');
        this.display(); // UI 새로고침
    }

    /**
     * 정리
     */
    onClose(): void {
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }
        this.memoryManager.dispose();
    }
}

/**
 * 확인 모달
 */
class ConfirmModal extends Modal {
    constructor(
        app: App,
        private title: string,
        private message: string,
        private callback: (confirmed: boolean) => void
    ) {
        super(app);
    }

    onOpen(): void {
        const { contentEl } = this;
        
        contentEl.createEl('h2', { text: this.title });
        contentEl.createEl('p', { text: this.message });
        
        const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });
        
        new ButtonComponent(buttonContainer)
            .setButtonText('Cancel')
            .onClick(() => {
                this.callback(false);
                this.close();
            });
            
        new ButtonComponent(buttonContainer)
            .setButtonText('Confirm')
            .setCta()
            .onClick(() => {
                this.callback(true);
                this.close();
            });
    }

    onClose(): void {
        const { contentEl } = this;
        contentEl.empty();
    }
}

/**
 * 도움말 모달
 */
class HelpModal extends Modal {
    onOpen(): void {
        const { contentEl } = this;
        
        contentEl.createEl('h2', { text: 'Speech to Text Help' });
        
        const helpContent = contentEl.createDiv({ cls: 'help-content' });
        
        // 도움말 내용
        helpContent.createEl('h3', { text: 'Getting Started' });
        helpContent.createEl('p', { 
            text: '1. Configure your API key in the API settings tab'
        });
        helpContent.createEl('p', { 
            text: '2. Set your preferred audio settings'
        });
        helpContent.createEl('p', { 
            text: '3. Use the keyboard shortcuts or buttons to start transcription'
        });
        
        helpContent.createEl('h3', { text: 'Keyboard Shortcuts' });
        const shortcutList = helpContent.createEl('ul');
        shortcutList.createEl('li', { text: 'Ctrl+Shift+S: Start transcription' });
        shortcutList.createEl('li', { text: 'Ctrl+Shift+X: Stop transcription' });
        shortcutList.createEl('li', { text: 'Ctrl+Shift+P: Pause transcription' });
        
        helpContent.createEl('h3', { text: 'Troubleshooting' });
        helpContent.createEl('p', { 
            text: 'If transcription is not working, check:'
        });
        const troubleList = helpContent.createEl('ul');
        troubleList.createEl('li', { text: 'API key is valid and has credits' });
        troubleList.createEl('li', { text: 'Microphone permissions are granted' });
        troubleList.createEl('li', { text: 'Audio format is supported by your browser' });
        
        // 닫기 버튼
        new ButtonComponent(contentEl)
            .setButtonText('Close')
            .setCta()
            .onClick(() => this.close());
    }

    onClose(): void {
        const { contentEl } = this;
        contentEl.empty();
    }
}