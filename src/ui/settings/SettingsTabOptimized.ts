import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import type SpeechToTextPlugin from '../../main';
import { ApiKeyValidator } from './components/ApiKeyValidator';
import { ShortcutSettings } from './components/ShortcutSettings';
import { AdvancedSettings } from './components/AdvancedSettings';
import { GeneralSettings } from './components/GeneralSettings';
import { AudioSettings } from './components/AudioSettings';
import { EventListenerManager } from '../../utils/memory/MemoryManager';
import { debounceAsync } from '../../utils/async/AsyncManager';
import { GlobalErrorManager, ErrorType, ErrorSeverity } from '../../utils/error/ErrorManager';
import { DEFAULT_SETTINGS } from '../../domain/models/Settings';
import { ConfirmationModal } from '../modals/ConfirmationModal';
import { isPlainRecord } from '../../types/guards';

/**
 * 최적화된 설정 탭 컴포넌트
 * - AutoDisposable 패턴 적용
 * - 설정 섹션 모듈화
 * - 비동기 처리 개선
 * - 에러 경계 구현
 */
export class SettingsTabOptimized extends PluginSettingTab {
    plugin: SpeechToTextPlugin;

    // Components
    private components: SettingsComponents;

    // Memory Management
    private eventManager: EventListenerManager;
    private disposed = false;

    // State
    private state: SettingsState;

    // Error Manager
    private errorManager: GlobalErrorManager;

    constructor(app: App, plugin: SpeechToTextPlugin) {
        super(app, plugin);
        this.plugin = plugin;

        // Initialize managers
        this.eventManager = new EventListenerManager();
        this.errorManager = GlobalErrorManager.getInstance();

        // Initialize state
        this.state = {
            isDirty: false,
            isSaving: false,
            apiKeyVisible: false,
            validationStatus: new Map(),
        };

        // Initialize components with error boundaries
        this.components = this.initializeComponents();

        // Setup auto-save
        this.setupAutoSave();
    }

    private normalizeError(error: unknown): Error {
        return error instanceof Error ? error : new Error(String(error));
    }

    /**
     * 컴포넌트 초기화 - 에러 경계 포함
     */
    private initializeComponents(): SettingsComponents {
        try {
            return {
                apiKeyValidator: new ApiKeyValidator(this.plugin),
                generalSettings: new GeneralSettings(this.plugin),
                audioSettings: new AudioSettings(this.plugin),
                advancedSettings: new AdvancedSettings(this.plugin),
                shortcutSettings: new ShortcutSettings(this.app, this.plugin),
                sectionRenderers: new Map(),
            };
        } catch (error) {
            void this.errorManager.handleError(this.normalizeError(error), {
                type: ErrorType.RESOURCE,
                severity: ErrorSeverity.HIGH,
                context: { component: 'SettingsTab' },
            });

            // Return minimal components on error
            return {
                apiKeyValidator: null,
                generalSettings: null,
                audioSettings: null,
                advancedSettings: null,
                shortcutSettings: null,
                sectionRenderers: new Map(),
            };
        }
    }

    /**
     * 자동 저장 설정 - 디바운스 적용
     */
    private setupAutoSave(): void {
        const saveFunction = async (): Promise<void> => {
            if (!this.state.isDirty || this.state.isSaving) return;

            this.state.isSaving = true;

            try {
                await this.plugin.saveSettings();
                this.state.isDirty = false;
                this.updateSaveStatus('saved');
            } catch (error) {
                void this.errorManager.handleError(this.normalizeError(error), {
                    type: ErrorType.RESOURCE,
                    severity: ErrorSeverity.MEDIUM,
                    userMessage: '설정 저장 실패',
                });
                this.updateSaveStatus('error');
            } finally {
                this.state.isSaving = false;
            }
        };

        this.saveSettings = debounceAsync(saveFunction, 1000);
    }

    display(): void {
        const { containerEl } = this;

        // Clear and setup container
        this.prepareContainer(containerEl);

        // Create sections with error boundaries
        const sections = [
            { id: 'header', builder: () => this.createHeader(containerEl) },
            { id: 'general', builder: () => this.createGeneralSection(containerEl) },
            { id: 'api', builder: () => this.createApiSection(containerEl) },
            { id: 'audio', builder: () => this.createAudioSection(containerEl) },
            { id: 'advanced', builder: () => this.createAdvancedSection(containerEl) },
            { id: 'shortcuts', builder: () => this.createShortcutSection(containerEl) },
            { id: 'footer', builder: () => this.createFooter(containerEl) },
        ];

        // Render each section with error boundary
        sections.forEach((section) => {
            this.renderSectionWithErrorBoundary(section.id, section.builder);
        });
    }

    /**
     * 컨테이너 준비
     */
    private prepareContainer(containerEl: HTMLElement): void {
        containerEl.empty();
        containerEl.addClass('speech-to-text-settings', 'optimized-settings');

        // Add loading indicator
        const loadingEl = containerEl.createDiv('settings-loading');
        loadingEl.addClass('sn-hidden');
    }

    /**
     * 에러 경계로 섹션 렌더링
     */
    private renderSectionWithErrorBoundary(sectionId: string, builder: () => void): void {
        try {
            builder();
        } catch (error) {
            this.handleSectionError(sectionId, error);
        }
    }

    /**
     * 섹션 에러 처리
     */
    private handleSectionError(sectionId: string, error: unknown): void {
        const normalizedError = error instanceof Error ? error : new Error(String(error));
        void this.errorManager.handleError(normalizedError, {
            type: ErrorType.UNKNOWN,
            severity: ErrorSeverity.MEDIUM,
            context: { section: sectionId },
        });

        // Show fallback UI
        const fallback = this.containerEl.createDiv('section-error');
        fallback.createEl('p', {
            text: `${sectionId} 섹션 로드 실패`,
            cls: 'error-message',
        });

        const retryBtn = fallback.createEl('button', {
            text: '다시 시도',
            cls: 'retry-button',
        });

        this.eventManager.add(retryBtn, 'click', () => {
            fallback.remove();
            this.display();
        });
    }

    /**
     * 헤더 생성 - 단순화
     */
    private createHeader(containerEl: HTMLElement): void {
        const header = new SettingsHeader(containerEl, this.state);
        header.render();

        // Register for disposal
        this.components.sectionRenderers.set('header', header);
    }

    /**
     * API 섹션 생성 - 모듈화 및 보안 강화
     */
    private createApiSection(containerEl: HTMLElement): void {
        const section = new ApiSettingsSection(
            containerEl,
            this.plugin,
            this.components.apiKeyValidator,
            this.eventManager,
            this.state
        );

        section.render();
        section.onSettingsChange(() => {
            this.state.isDirty = true;
            void this.saveSettings();
        });

        this.components.sectionRenderers.set('api', section);
    }

    /**
     * 일반 설정 섹션 - 단순화
     */
    private createGeneralSection(containerEl: HTMLElement): void {
        const section = this.createSection(containerEl, 'General', '기본 동작 설정');

        if (this.components.generalSettings) {
            this.components.generalSettings.render(section);
            this.setupChangeTracking(section);
        }
    }

    /**
     * 오디오 설정 섹션
     */
    private createAudioSection(containerEl: HTMLElement): void {
        const section = this.createSection(containerEl, 'Audio', '음성 변환 설정');

        if (this.components.audioSettings) {
            this.components.audioSettings.render(section);
            this.setupChangeTracking(section);
        }
    }

    /**
     * 고급 설정 섹션
     */
    private createAdvancedSection(containerEl: HTMLElement): void {
        const section = this.createSection(containerEl, 'Advanced', '고급 설정');

        if (this.components.advancedSettings) {
            this.components.advancedSettings.render(section);
            this.setupChangeTracking(section);
        }
    }

    /**
     * 단축키 설정 섹션
     */
    private createShortcutSection(containerEl: HTMLElement): void {
        const section = this.createSection(containerEl, 'Shortcuts', '단축키 설정');

        if (this.components.shortcutSettings) {
            this.components.shortcutSettings.render(section);
            this.setupChangeTracking(section);
        }
    }

    /**
     * 푸터 생성
     */
    private createFooter(containerEl: HTMLElement): void {
        const footer = new SettingsFooter(containerEl, this.plugin, this.eventManager);

        footer.render();
        this.components.sectionRenderers.set('footer', footer);
    }

    /**
     * 섹션 생성 헬퍼
     */
    private createSection(container: HTMLElement, title: string, description: string): HTMLElement {
        const section = container.createDiv('settings-section');
        new Setting(section).setName(title).setHeading();

        if (description) {
            section.createEl('p', {
                text: description,
                cls: 'setting-item-description',
            });
        }

        return section;
    }

    /**
     * 변경 추적 설정
     */
    private setupChangeTracking(section: HTMLElement): void {
        // Track all input changes
        const inputs = section.querySelectorAll('input, select, textarea');

        inputs.forEach((input) => {
            if (input instanceof HTMLElement) {
                this.eventManager.add(input, 'change', () => {
                    this.state.isDirty = true;
                    void this.saveSettings();
                });
            }
        });
    }

    /**
     * 저장 상태 업데이트
     */
    private updateSaveStatus(status: 'saving' | 'saved' | 'error'): void {
        const statusEl = this.containerEl.querySelector('.save-status');
        if (!statusEl) return;

        statusEl.className = `save-status ${status}`;

        const messages = {
            saving: '저장 중...',
            saved: '저장됨',
            error: '저장 실패',
        };

        statusEl.textContent = messages[status];

        // Auto-hide success message
        if (status === 'saved') {
            setTimeout(() => {
                statusEl.textContent = '';
            }, 2000);
        }
    }

    /**
     * 설정 저장 (디바운스됨)
     */
    private saveSettings!: () => Promise<void>;

    /**
     * 리소스 정리
     */
    dispose(): void {
        if (this.disposed) return;

        this.disposed = true;

        // Dispose all section renderers
        this.components.sectionRenderers.forEach((renderer) => {
            if (renderer && typeof renderer.dispose === 'function') {
                renderer.dispose();
            }
        });

        // Clear event listeners
        this.eventManager.removeAll();

        // Clear state
        this.state.validationStatus.clear();
    }

    /**
     * AutoDisposable 구현
     */
    onDispose(): void {
        this.dispose();
    }

    isDisposed(): boolean {
        return this.disposed;
    }
}

/**
 * 설정 컴포넌트 인터페이스
 */
interface SettingsComponents {
    apiKeyValidator: ApiKeyValidator | null;
    generalSettings: GeneralSettings | null;
    audioSettings: AudioSettings | null;
    advancedSettings: AdvancedSettings | null;
    shortcutSettings: ShortcutSettings | null;
    sectionRenderers: Map<string, SectionRenderer>;
}

/**
 * 설정 상태 인터페이스
 */
interface SettingsState {
    isDirty: boolean;
    isSaving: boolean;
    apiKeyVisible: boolean;
    validationStatus: Map<string, boolean>;
}

/**
 * 섹션 렌더러 기본 클래스
 */
abstract class SectionRenderer {
    constructor(protected container: HTMLElement, protected eventManager?: EventListenerManager) {}

    abstract render(): void;

    dispose(): void {
        // Override in subclasses if needed
    }
}

/**
 * 설정 헤더 렌더러
 */
class SettingsHeader extends SectionRenderer {
    constructor(container: HTMLElement, private state: SettingsState) {
        super(container);
    }

    render(): void {
        const headerEl = this.container.createDiv({ cls: 'settings-header' });

        new Setting(headerEl).setName('음성 전사 설정').setHeading();

        headerEl.createEl('p', {
            text: '음성을 텍스트로 변환하는 플러그인 설정을 구성합니다.',
            cls: 'settings-description',
        });

        // Save status indicator
        const statusEl = headerEl.createDiv({ cls: 'save-status' });
        statusEl.classList.toggle('sn-hidden', !this.state.isDirty);
    }
}

/**
 * API 설정 섹션 렌더러
 */
class ApiSettingsSection extends SectionRenderer {
    private changeCallbacks: Set<() => void> = new Set();

    constructor(
        container: HTMLElement,
        private plugin: SpeechToTextPlugin,
        private validator: ApiKeyValidator | null,
        eventManager: EventListenerManager,
        private state: SettingsState
    ) {
        super(container, eventManager);
    }

    render(): void {
        const sectionEl = this.createSection();
        this.createApiKeyInput(sectionEl);
        this.createApiUsageDisplay(sectionEl);
    }

    private createSection(): HTMLElement {
        const section = this.container.createDiv('settings-section');
        new Setting(section).setName('API').setHeading();
        section.createEl('p', {
            text: 'Openai API 설정',
            cls: 'setting-item-description',
        });
        return section;
    }

    private createApiKeyInput(section: HTMLElement): void {
        const setting = new Setting(section)
            .setName('API key')
            .setDesc('Openai API 키를 입력하세요. (sk-로 시작)');

        const inputContainer = setting.controlEl.createDiv('api-key-container');
        const eventManager = this.eventManager;
        if (!eventManager) {
            return;
        }

        // Create secure input
        const input = new SecureApiKeyInput(
            inputContainer,
            this.plugin.settings.apiKey,
            eventManager
        );

        input.onChange((value) => {
            void (async () => {
                if (this.validator) {
                    const isValid = await this.validator.validate(value);
                    this.state.validationStatus.set('apiKey', isValid);

                    if (isValid) {
                        this.plugin.settings.apiKey = value;
                        this.notifyChange();
                        new Notice('✅ API 키가 검증되었습니다');
                    } else {
                        new Notice('❌ 유효하지 않은 API 키입니다');
                    }
                }
            })();
        });

        input.render();
    }

    private createApiUsageDisplay(section: HTMLElement): void {
        const usageEl = section.createDiv('api-usage');
        new Setting(usageEl).setName('API 사용량').setHeading();

        // Placeholder for usage stats
        const statsEl = usageEl.createDiv('usage-stats');
        statsEl.createEl('p', { text: '이번 달 사용량: 0 / 1000 요청' });
    }

    onSettingsChange(callback: () => void): void {
        this.changeCallbacks.add(callback);
    }

    private notifyChange(): void {
        this.changeCallbacks.forEach((callback) => callback());
    }
}

/**
 * 보안 API 키 입력 컴포넌트
 */
class SecureApiKeyInput {
    private inputEl!: HTMLInputElement;
    private toggleBtn!: HTMLButtonElement;
    private validateBtn!: HTMLButtonElement;
    private isVisible = false;
    private changeCallbacks: Set<(value: string) => void> = new Set();

    constructor(
        private container: HTMLElement,
        private initialValue: string,
        private eventManager: EventListenerManager
    ) {}

    render(): void {
        // Create masked input
        this.inputEl = this.container.createEl('input', {
            type: 'password',
            placeholder: 'sk-...',
            cls: 'api-key-input',
        });

        if (this.initialValue) {
            this.inputEl.value = this.maskApiKey(this.initialValue);
        }

        // Create toggle button
        this.toggleBtn = this.container.createEl('button', {
            text: '👁',
            cls: 'api-key-toggle',
        });

        // Create validate button
        this.validateBtn = this.container.createEl('button', {
            text: '검증',
            cls: 'mod-cta api-key-validate',
        });

        this.setupEventHandlers();
    }

    private setupEventHandlers(): void {
        // Toggle visibility
        this.eventManager.add(this.toggleBtn, 'click', () => {
            this.toggleVisibility();
        });

        // Validate on button click
        this.eventManager.add(this.validateBtn, 'click', () => {
            void this.validate();
        });

        // Track changes
        this.eventManager.add(this.inputEl, 'change', () => {
            const value = this.inputEl.value;
            if (value && value !== this.maskApiKey(this.initialValue)) {
                this.notifyChange(value);
            }
        });
    }

    private toggleVisibility(): void {
        this.isVisible = !this.isVisible;

        if (this.isVisible) {
            this.inputEl.type = 'text';
            this.inputEl.value = this.initialValue || '';
            this.toggleBtn.textContent = '🙈';
        } else {
            this.inputEl.type = 'password';
            this.inputEl.value = this.initialValue ? this.maskApiKey(this.initialValue) : '';
            this.toggleBtn.textContent = '👁';
        }
    }

    private validate(): void {
        const value = this.inputEl.value;

        if (!value || value === this.maskApiKey(this.initialValue)) {
            new Notice('API 키를 입력해주세요');
            return;
        }

        this.validateBtn.disabled = true;
        this.validateBtn.textContent = '검증 중...';

        try {
            this.notifyChange(value);
        } finally {
            this.validateBtn.disabled = false;
            this.validateBtn.textContent = '검증';
        }
    }

    private maskApiKey(key: string): string {
        if (!key) return '';
        if (key.length <= 8) return key;
        return key.substring(0, 7) + '...' + key.substring(key.length - 4);
    }

    onChange(callback: (value: string) => void): void {
        this.changeCallbacks.add(callback);
    }

    private notifyChange(value: string): void {
        this.changeCallbacks.forEach((callback) => callback(value));
    }
}

/**
 * 설정 푸터 렌더러
 */
class SettingsFooter extends SectionRenderer {
    constructor(
        container: HTMLElement,
        private plugin: SpeechToTextPlugin,
        eventManager: EventListenerManager
    ) {
        super(container, eventManager);
    }

    render(): void {
        const footer = this.container.createDiv('settings-footer');

        // Export/Import buttons
        new Setting(footer)
            .addButton((btn) =>
                btn.setButtonText('설정 내보내기').onClick(() => {
                    void this.exportSettings();
                })
            )
            .addButton((btn) =>
                btn.setButtonText('설정 가져오기').onClick(() => {
                    void this.importSettings();
                })
            );

        // Reset button
        new Setting(footer).addButton((btn) =>
            btn
                .setButtonText('기본값으로 재설정')
                .setWarning()
                .onClick(() => {
                    void this.resetSettings();
                })
        );
    }

    private exportSettings(): void {
        try {
            const settings = this.plugin.settings;
            const blob = new Blob([JSON.stringify(settings, null, 2)], {
                type: 'application/json',
            });

            const url = URL.createObjectURL(blob);
            const a = createEl('a');
            a.href = url;
            a.download = 'speech-to-text-settings.json';
            a.click();

            URL.revokeObjectURL(url);
            new Notice('설정을 내보냈습니다');
        } catch {
            new Notice('설정 내보내기 실패');
        }
    }

    private importSettings(): void {
        const input = createEl('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = (e) => {
            void (async () => {
                const target = e.target;
                if (!(target instanceof HTMLInputElement)) {
                    return;
                }
                const file = target.files?.[0];
                if (!file) return;

                try {
                    const text = await file.text();
                    const parsed = JSON.parse(text) as unknown;
                    if (!isPlainRecord(parsed)) {
                        throw new Error('Invalid settings data');
                    }

                    // Validate and merge settings
                    Object.assign(this.plugin.settings, parsed);
                    await this.plugin.saveSettings();

                    new Notice('설정을 가져왔습니다');

                    // Refresh UI - need to trigger parent component refresh
                    // This should be handled via event or callback
                } catch {
                    new Notice('설정 가져오기 실패');
                }
            })();
        };

        input.click();
    }

    private resetSettings(): void {
        new ConfirmationModal(
            this.plugin.app,
            'Reset settings',
            '모든 설정을 기본값으로 재설정하시겠습니까?',
            async () => {
                try {
                    // Reset to defaults
                    this.plugin.settings = { ...DEFAULT_SETTINGS };
                    await this.plugin.saveSettings();

                    new Notice('설정을 재설정했습니다');

                    // Refresh UI
                    // Note: We need to refresh the main settings tab, not from within footer
                    // This should be handled by the parent component
                } catch {
                    new Notice('설정 재설정 실패');
                }
            }
        ).open();
    }
}
