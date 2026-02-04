import { App, PluginSettingTab, Setting, Notice, Modal, ButtonComponent } from 'obsidian';
import type SpeechToTextPlugin from '../../main';
import { ApiKeyValidator } from './components/ApiKeyValidator';
import { ShortcutSettings } from './components/ShortcutSettings';
import { AdvancedSettings } from './components/AdvancedSettings';
import { GeneralSettings } from './components/GeneralSettings';
import { AudioSettings } from './components/AudioSettings';
import {
    AutoDisposable,
    EventListenerManager,
    ResourceManager,
} from '../../utils/memory/MemoryManager';
import { CancellablePromise, debounceAsync, withTimeout } from '../../utils/async/AsyncManager';
import {
    GlobalErrorManager,
    ErrorType,
    ErrorSeverity,
    tryCatchAsync,
} from '../../utils/error/ErrorManager';
import { isPlainRecord } from '../../types/guards';

/**
 * 개선된 설정 탭 UI 컴포넌트
 * - 메모리 누수 방지
 * - 비동기 처리 최적화
 * - 에러 처리 강화
 */
export class SettingsTabRefactored extends PluginSettingTab {
    plugin: SpeechToTextPlugin;

    // 컴포넌트 관리
    private components: Map<string, AutoDisposable> = new Map();
    private resourceManager = new ResourceManager();
    private eventManager = new EventListenerManager();
    private errorManager = GlobalErrorManager.getInstance();

    // 비동기 작업 관리
    private pendingOperations = new Set<CancellablePromise<boolean>>();

    // 디바운스된 저장 함수
    private debouncedSave = debounceAsync(() => this.plugin.saveSettings(), 500);

    constructor(app: App, plugin: SpeechToTextPlugin) {
        super(app, plugin);
        this.plugin = plugin;
        this.initializeComponents();
        this.setupErrorHandling();
    }

    private normalizeError(error: unknown): Error {
        return error instanceof Error ? error : new Error(String(error));
    }

    private getComponent<T extends AutoDisposable>(
        key: string,
        ctor: new (...args: never[]) => T
    ): T | null {
        const component = this.components.get(key);
        return component instanceof ctor ? component : null;
    }

    /**
     * 컴포넌트 초기화
     */
    private initializeComponents(): void {
        // 각 컴포넌트를 AutoDisposable로 래핑
        this.components.set('apiKeyValidator', new ApiKeyValidatorWrapper(this.plugin));
        this.components.set('shortcutSettings', new ShortcutSettingsWrapper(this.app, this.plugin));
        this.components.set('advancedSettings', new AdvancedSettingsWrapper(this.plugin));
        this.components.set('generalSettings', new GeneralSettingsWrapper(this.plugin));
        this.components.set('audioSettings', new AudioSettingsWrapper(this.plugin));
    }

    /**
     * 에러 핸들링 설정
     */
    private setupErrorHandling(): void {
        this.errorManager.onError((error) => {
            if (
                error.severity === ErrorSeverity.HIGH ||
                error.severity === ErrorSeverity.CRITICAL
            ) {
                new Notice(`설정 오류: ${error.userMessage || error.message}`);
            }
        });
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.addClass('speech-to-text-settings');

        void tryCatchAsync(() => Promise.resolve(this.renderContent(containerEl)), {
            onError: (error) => {
                void this.errorManager.handleError(error, {
                    type: ErrorType.UNKNOWN,
                    severity: ErrorSeverity.HIGH,
                    userMessage: '설정 페이지를 불러오는 중 오류가 발생했습니다.',
                });
            },
        });
    }

    /**
     * 콘텐츠 렌더링
     */
    private renderContent(containerEl: HTMLElement): void {
        // 헤더
        this.createHeader(containerEl);

        // 섹션별 설정
        this.createGeneralSection(containerEl);
        this.createApiSection(containerEl);
        this.createAudioSection(containerEl);
        this.createAdvancedSection(containerEl);
        this.createShortcutSection(containerEl);

        // 푸터
        this.createFooter(containerEl);
    }

    /**
     * 헤더 생성
     */
    private createHeader(containerEl: HTMLElement): void {
        const headerEl = containerEl.createDiv({ cls: 'settings-header' });

        new Setting(headerEl).setName('음성 전사 설정').setHeading();

        headerEl.createEl('p', {
            text: '음성을 텍스트로 변환하는 플러그인 설정을 구성합니다.',
            cls: 'settings-description',
        });

        const statusEl = headerEl.createDiv({ cls: 'settings-status' });
        this.updateStatus(statusEl);
    }

    /**
     * 일반 설정 섹션
     */
    private createGeneralSection(containerEl: HTMLElement): void {
        const sectionEl = this.createSection(containerEl, 'Basics', '기본 동작 설정');
        const component = this.getComponent('generalSettings', GeneralSettingsWrapper);
        component?.render(sectionEl);
    }

    /**
     * API 설정 섹션 (개선된 버전)
     */
    private createApiSection(containerEl: HTMLElement): void {
        const sectionEl = this.createSection(containerEl, 'API', 'Openai API 설정');

        const apiKeySetting = new Setting(sectionEl)
            .setName('API key')
            .setDesc('Openai API 키를 입력하세요. (sk-로 시작)');

        const inputEl = apiKeySetting.controlEl.createEl('input', {
            type: 'password',
            placeholder: 'sk-...',
            cls: 'api-key-input',
        });

        const currentKey = this.plugin.settings.apiKey;
        if (currentKey) {
            inputEl.value = this.maskApiKey(currentKey);
            inputEl.setAttribute('data-has-value', 'true');
        }

        // 토글 버튼 - 이벤트 리스너 관리 개선
        const toggleBtn = apiKeySetting.controlEl.createEl('button', {
            text: '👁',
            cls: 'api-key-toggle',
        });

        let isVisible = false;
        this.eventManager.add(toggleBtn, 'click', () => {
            isVisible = !isVisible;
            if (isVisible) {
                inputEl.type = 'text';
                inputEl.value = currentKey || '';
                toggleBtn.textContent = '🙈';
            } else {
                inputEl.type = 'password';
                inputEl.value = currentKey ? this.maskApiKey(currentKey) : '';
                toggleBtn.textContent = '👁';
            }
        });

        // 검증 버튼 - 비동기 처리 개선
        const validateBtn = apiKeySetting.controlEl.createEl('button', {
            text: '검증',
            cls: 'mod-cta api-key-validate',
        });

        this.eventManager.add(validateBtn, 'click', () => {
            void (async () => {
                const value = inputEl.value;
                if (!value || value === this.maskApiKey(currentKey)) {
                    new Notice('API 키를 입력해주세요');
                    return;
                }

                validateBtn.disabled = true;
                validateBtn.textContent = '검증 중...';

                // 취소 가능한 Promise로 검증
                const validation = new CancellablePromise<boolean>((resolve, reject, signal) => {
                    void (async () => {
                        try {
                            const validator = this.getComponent(
                                'apiKeyValidator',
                                ApiKeyValidatorWrapper
                            );
                            if (!validator) {
                                throw new Error('API 키 검증기를 불러오지 못했습니다');
                            }
                            const result = await withTimeout(
                                validator.validate(value),
                                10000,
                                new Error('API 키 검증 시간 초과')
                            );

                            if (!signal.aborted) {
                                resolve(result);
                            }
                        } catch (error) {
                            reject(error);
                        }
                    })();
                });

                this.pendingOperations.add(validation);

                try {
                    const isValid = await validation;

                    if (isValid) {
                        this.plugin.settings.apiKey = value;
                        await this.debouncedSave();
                        new Notice('✅ API 키가 검증되었습니다');
                        inputEl.setAttribute('data-valid', 'true');
                    } else {
                        new Notice('❌ 유효하지 않은 API 키입니다');
                        inputEl.setAttribute('data-valid', 'false');
                    }
                } catch (error) {
                    void this.errorManager.handleError(this.normalizeError(error), {
                        type: ErrorType.VALIDATION,
                        severity: ErrorSeverity.MEDIUM,
                        userMessage: 'API 키 검증 중 오류가 발생했습니다.',
                    });
                } finally {
                    this.pendingOperations.delete(validation);
                    validateBtn.disabled = false;
                    validateBtn.textContent = '검증';
                }
            })();
        });

        // 입력 변경 시 저장 - 디바운스 적용
        this.eventManager.add(inputEl, 'input', () => {
            void (async () => {
                const value = inputEl.value;
                if (value && value !== this.maskApiKey(currentKey)) {
                    if (!value.startsWith('sk-')) {
                        new Notice('API 키는 "sk-"로 시작해야 합니다');
                        return;
                    }

                    this.plugin.settings.apiKey = value;
                    await this.debouncedSave();
                    inputEl.setAttribute('data-has-value', 'true');
                }
            })();
        });

        this.createApiUsageDisplay(sectionEl);
    }

    /**
     * 오디오 설정 섹션
     */
    private createAudioSection(containerEl: HTMLElement): void {
        const sectionEl = this.createSection(containerEl, 'Audio', '음성 변환 설정');
        const component = this.getComponent('audioSettings', AudioSettingsWrapper);
        component?.render(sectionEl);
    }

    /**
     * 고급 설정 섹션
     */
    private createAdvancedSection(containerEl: HTMLElement): void {
        const sectionEl = this.createSection(containerEl, 'Advanced', '고급 설정');
        const component = this.getComponent('advancedSettings', AdvancedSettingsWrapper);
        component?.render(sectionEl);
    }

    /**
     * 단축키 설정 섹션
     */
    private createShortcutSection(containerEl: HTMLElement): void {
        const sectionEl = this.createSection(containerEl, 'Shortcuts', '단축키 설정');
        const component = this.getComponent('shortcutSettings', ShortcutSettingsWrapper);
        component?.render(sectionEl);
    }

    /**
     * 푸터 생성 (개선된 버전)
     */
    private createFooter(containerEl: HTMLElement): void {
        const footerEl = containerEl.createDiv({ cls: 'settings-footer' });

        const exportImportEl = footerEl.createDiv({ cls: 'settings-export-import' });

        // 설정 내보내기
        const exportBtn = new ButtonComponent(exportImportEl).setButtonText('설정 내보내기');

        this.eventManager.add(exportBtn.buttonEl, 'click', () => {
            void tryCatchAsync(() => this.exportSettings(), {
                onError: (error) => {
                    void this.errorManager.handleError(error, {
                        type: ErrorType.UNKNOWN,
                        severity: ErrorSeverity.LOW,
                        userMessage: '설정 내보내기에 실패했습니다.',
                    });
                },
            });
        });

        // 설정 가져오기
        const importBtn = new ButtonComponent(exportImportEl).setButtonText('설정 가져오기');

        this.eventManager.add(importBtn.buttonEl, 'click', () => {
            void tryCatchAsync(() => this.importSettings(), {
                onError: (error) => {
                    void this.errorManager.handleError(error, {
                        type: ErrorType.UNKNOWN,
                        severity: ErrorSeverity.LOW,
                        userMessage: '설정 가져오기에 실패했습니다.',
                    });
                },
            });
        });

        // 초기화 버튼
        const resetBtn = new ButtonComponent(footerEl)
            .setButtonText('기본값으로 초기화')
            .setWarning();

        this.eventManager.add(resetBtn.buttonEl, 'click', () => {
            void (async () => {
                const confirmed = await this.confirmReset();
                if (confirmed) {
                    await this.resetSettings();
                }
            })();
        });

        // 버전 정보
        const versionEl = footerEl.createDiv({ cls: 'settings-version' });
        versionEl.createEl('small', {
            text: `Version ${this.plugin.manifest.version} | `,
            cls: 'version-text',
        });

        const linkEl = versionEl.createEl('a', {
            text: '도움말',
            href: 'https://github.com/yourusername/obsidian-speech-to-text',
            cls: 'help-link',
        });
        linkEl.setAttribute('target', '_blank');
    }

    /**
     * 섹션 생성 헬퍼
     */
    private createSection(containerEl: HTMLElement, title: string, desc: string): HTMLElement {
        const sectionEl = containerEl.createDiv({
            cls: `settings-section settings-section-${title.toLowerCase()}`,
        });

        const headerEl = sectionEl.createDiv({ cls: 'section-header' });
        new Setting(headerEl).setName(title).setHeading();
        headerEl.createEl('p', { text: desc, cls: 'section-description' });

        return sectionEl.createDiv({ cls: 'section-content' });
    }

    /**
     * API 사용량 표시
     */
    private createApiUsageDisplay(containerEl: HTMLElement): void {
        const usageEl = containerEl.createDiv({ cls: 'api-usage-display' });

        new Setting(usageEl).setName('API 사용량').setHeading();

        const statsEl = usageEl.createDiv({ cls: 'usage-stats' });

        statsEl.createEl('div', {
            text: '이번 달 사용량: 0 / 무제한',
            cls: 'usage-item',
        });

        statsEl.createEl('div', {
            text: '예상 비용: $0.00',
            cls: 'usage-item',
        });

        const refreshBtn = new ButtonComponent(usageEl).setButtonText('사용량 새로고침');

        this.eventManager.add(refreshBtn.buttonEl, 'click', () => {
            new Notice('사용량 정보를 업데이트했습니다');
        });
    }

    /**
     * 상태 업데이트
     */
    private updateStatus(statusEl: HTMLElement): void {
        statusEl.empty();

        const settings = this.plugin.settings;
        const statusItems: Array<{
            label: string;
            value: string;
            status: 'success' | 'warning' | 'error';
        }> = [];

        if (settings.apiKey) {
            statusItems.push({
                label: 'API 키',
                value: '구성됨',
                status: 'success',
            });
        } else {
            statusItems.push({
                label: 'API 키',
                value: '미구성',
                status: 'error',
            });
        }

        statusItems.push({
            label: '캐시',
            value: settings.enableCache ? '활성화' : '비활성화',
            status: settings.enableCache ? 'success' : 'warning',
        });

        statusItems.push({
            label: '언어',
            value: this.getLanguageLabel(settings.language),
            status: 'success',
        });

        statusItems.forEach((item) => {
            const itemEl = statusEl.createDiv({ cls: `status-item status-${item.status}` });
            itemEl.createEl('span', { text: `${item.label}: `, cls: 'status-label' });
            itemEl.createEl('span', { text: item.value, cls: 'status-value' });
        });
    }

    /**
     * API 키 마스킹
     */
    private maskApiKey(key: string): string {
        if (!key || key.length < 10) return '***';
        const visibleStart = 7;
        const visibleEnd = 4;
        const masked = '*'.repeat(Math.max(0, key.length - visibleStart - visibleEnd));
        return key.substring(0, visibleStart) + masked + key.substring(key.length - visibleEnd);
    }

    /**
     * 언어 레이블 가져오기
     */
    private getLanguageLabel(code: string): string {
        const languages: Record<string, string> = {
            auto: '자동 감지',
            en: 'English',
            ko: '한국어',
            ja: '日本語',
            zh: '中文',
            es: 'Español',
            fr: 'Français',
            de: 'Deutsch',
        };
        return languages[code] || code;
    }

    /**
     * 설정 내보내기
     */
    private exportSettings(): Promise<void> {
        const exportSettings: Record<string, unknown> = { ...this.plugin.settings };
        delete exportSettings.apiKey;
        delete exportSettings.encryptedApiKey;

        const json = JSON.stringify(exportSettings, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = createEl('a');
        a.href = url;
        a.download = `speech-to-text-settings-${Date.now()}.json`;
        a.click();

        // 메모리 정리
        this.resourceManager.addTimer(window.setTimeout(() => URL.revokeObjectURL(url), 100));

        new Notice('설정을 내보냈습니다');
        return Promise.resolve();
    }

    /**
     * 설정 가져오기
     */
    private async importSettings(): Promise<void> {
        const input = createEl('input');
        input.type = 'file';
        input.accept = '.json';

        const filePromise = new Promise<File>((resolve, reject) => {
            this.eventManager.add(input, 'change', (e) => {
                const target = e.target;
                if (!(target instanceof HTMLInputElement)) {
                    reject(new Error('파일 입력을 읽지 못했습니다'));
                    return;
                }
                const file = target.files?.[0];
                if (file) {
                    resolve(file);
                } else {
                    reject(new Error('파일이 선택되지 않았습니다'));
                }
            });
        });

        input.click();

        const file = await filePromise;
        const text = await file.text();
        const parsed = JSON.parse(text) as unknown;
        if (!isPlainRecord(parsed)) {
            throw new Error('Invalid settings data');
        }

        const currentApiKey = this.plugin.settings.apiKey;
        Object.assign(this.plugin.settings, parsed);

        if (currentApiKey) {
            this.plugin.settings.apiKey = currentApiKey;
        }

        await this.plugin.saveSettings();

        new Notice('설정을 가져왔습니다');
        this.display();
    }

    /**
     * 설정 초기화 확인
     */
    private confirmReset(): Promise<boolean> {
        return new Promise((resolve) => {
            const modal = new ConfirmModalRefactored(
                this.app,
                '설정 초기화',
                '모든 설정을 기본값으로 초기화하시겠습니까? API 키도 삭제됩니다.',
                resolve
            );
            modal.open();
        });
    }

    /**
     * 설정 초기화
     */
    private async resetSettings(): Promise<void> {
        const { DEFAULT_SETTINGS } = await import('../../domain/models/Settings');
        this.plugin.settings = { ...DEFAULT_SETTINGS };
        await this.plugin.saveSettings();

        new Notice('설정이 초기화되었습니다');
        this.display();
    }

    /**
     * 컴포넌트 정리
     */
    hide(): void {
        // 진행 중인 비동기 작업 취소
        this.pendingOperations.forEach((operation) => operation.cancel());
        this.pendingOperations.clear();

        // 리소스 정리
        this.resourceManager.dispose();
        this.eventManager.removeAll();

        // 컴포넌트 정리
        this.components.forEach((component) => component.dispose());
        this.components.clear();
    }
}

/**
 * 개선된 확인 모달
 */
class ConfirmModalRefactored extends Modal {
    private resourceManager = new ResourceManager();
    private eventManager = new EventListenerManager();

    constructor(
        app: App,
        private title: string,
        private message: string,
        private onConfirm: (confirmed: boolean) => void
    ) {
        super(app);
    }

    onOpen() {
        const { contentEl } = this;

        new Setting(contentEl).setName(this.title).setHeading();
        contentEl.createEl('p', { text: this.message });

        const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });

        const cancelBtn = new ButtonComponent(buttonContainer).setButtonText('취소');

        this.eventManager.add(cancelBtn.buttonEl, 'click', () => {
            this.onConfirm(false);
            this.close();
        });

        const confirmBtn = new ButtonComponent(buttonContainer).setButtonText('확인').setWarning();

        this.eventManager.add(confirmBtn.buttonEl, 'click', () => {
            this.onConfirm(true);
            this.close();
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();

        // 리소스 정리
        this.resourceManager.dispose();
        this.eventManager.removeAll();
    }
}

/**
 * 컴포넌트 래퍼 클래스들
 */
class ApiKeyValidatorWrapper extends AutoDisposable {
    private validator: ApiKeyValidator;

    constructor(plugin: SpeechToTextPlugin) {
        super();
        this.validator = new ApiKeyValidator(plugin);
    }

    validate(key: string): Promise<boolean> {
        return this.validator.validate(key);
    }

    protected onDispose(): void {
        // 추가 정리 로직
    }
}

class GeneralSettingsWrapper extends AutoDisposable {
    private settings: GeneralSettings;

    constructor(plugin: SpeechToTextPlugin) {
        super();
        this.settings = new GeneralSettings(plugin);
    }

    render(container: HTMLElement): void {
        this.settings.render(container);
    }

    protected onDispose(): void {
        // 추가 정리 로직
    }
}

class AudioSettingsWrapper extends AutoDisposable {
    private settings: AudioSettings;

    constructor(plugin: SpeechToTextPlugin) {
        super();
        this.settings = new AudioSettings(plugin);
    }

    render(container: HTMLElement): void {
        this.settings.render(container);
    }

    protected onDispose(): void {
        // 추가 정리 로직
    }
}

class AdvancedSettingsWrapper extends AutoDisposable {
    private settings: AdvancedSettings;

    constructor(plugin: SpeechToTextPlugin) {
        super();
        this.settings = new AdvancedSettings(plugin);
    }

    render(container: HTMLElement): void {
        this.settings.render(container);
    }

    protected onDispose(): void {
        // 추가 정리 로직
    }
}

class ShortcutSettingsWrapper extends AutoDisposable {
    private settings: ShortcutSettings;

    constructor(app: App, plugin: SpeechToTextPlugin) {
        super();
        this.settings = new ShortcutSettings(app, plugin);
    }

    render(container: HTMLElement): void {
        this.settings.render(container);
    }

    protected onDispose(): void {
        // 추가 정리 로직
    }
}
