import { App, PluginSettingTab, Setting, Notice, Modal, ButtonComponent, TextComponent } from 'obsidian';
import type SpeechToTextPlugin from '../../main';
import { PluginSettings } from '../../infrastructure/storage/SettingsManager';
import { ApiKeyValidator } from './components/ApiKeyValidator';
import { ShortcutSettings } from './components/ShortcutSettings';
import { AdvancedSettings } from './components/AdvancedSettings';
import { GeneralSettings } from './components/GeneralSettings';
import { AudioSettings } from './components/AudioSettings';

/**
 * 설정 탭 UI 컴포넌트
 * 플러그인의 모든 설정을 관리하는 메인 설정 페이지
 */
export class SettingsTab extends PluginSettingTab {
    plugin: SpeechToTextPlugin;
    private apiKeyValidator: ApiKeyValidator;
    private shortcutSettings: ShortcutSettings;
    private advancedSettings: AdvancedSettings;
    private generalSettings: GeneralSettings;
    private audioSettings: AudioSettings;

    constructor(app: App, plugin: SpeechToTextPlugin) {
        super(app, plugin);
        this.plugin = plugin;
        
        // 컴포넌트 초기화
        this.apiKeyValidator = new ApiKeyValidator(plugin);
        this.shortcutSettings = new ShortcutSettings(app, plugin);
        this.advancedSettings = new AdvancedSettings(plugin);
        this.generalSettings = new GeneralSettings(plugin);
        this.audioSettings = new AudioSettings(plugin);
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.addClass('speech-to-text-settings');

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
        
        headerEl.createEl('h2', { 
            text: 'Speech to Text 설정',
            cls: 'settings-title' 
        });
        
        headerEl.createEl('p', { 
            text: '음성을 텍스트로 변환하는 플러그인 설정을 구성합니다.',
            cls: 'settings-description' 
        });

        // 상태 표시
        const statusEl = headerEl.createDiv({ cls: 'settings-status' });
        this.updateStatus(statusEl);
    }

    /**
     * 일반 설정 섹션
     */
    private createGeneralSection(containerEl: HTMLElement): void {
        const sectionEl = this.createSection(containerEl, 'General', '기본 동작 설정');
        this.generalSettings.render(sectionEl);
    }

    /**
     * API 설정 섹션
     */
    private createApiSection(containerEl: HTMLElement): void {
        const sectionEl = this.createSection(containerEl, 'API', 'OpenAI API 설정');
        
        // API 키 입력
        const apiKeySetting = new Setting(sectionEl)
            .setName('API Key')
            .setDesc('OpenAI API 키를 입력하세요. (sk-로 시작)');

        // 마스킹된 입력 필드
        const inputEl = apiKeySetting.controlEl.createEl('input', {
            type: 'password',
            placeholder: 'sk-...',
            cls: 'api-key-input'
        });

        const currentKey = this.plugin.settings.apiKey;
        if (currentKey) {
            inputEl.value = this.maskApiKey(currentKey);
            inputEl.setAttribute('data-has-value', 'true');
        }

        // 토글 버튼 (보이기/숨기기)
        const toggleBtn = apiKeySetting.controlEl.createEl('button', {
            text: '👁',
            cls: 'api-key-toggle'
        });
        
        let isVisible = false;
        toggleBtn.addEventListener('click', () => {
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

        // 검증 버튼
        const validateBtn = apiKeySetting.controlEl.createEl('button', {
            text: '검증',
            cls: 'mod-cta api-key-validate'
        });

        validateBtn.addEventListener('click', async () => {
            const value = inputEl.value;
            if (!value || value === this.maskApiKey(currentKey)) {
                new Notice('API 키를 입력해주세요');
                return;
            }

            validateBtn.disabled = true;
            validateBtn.textContent = '검증 중...';

            const isValid = await this.apiKeyValidator.validate(value);
            
            if (isValid) {
                this.plugin.settings.apiKey = value;
                await this.plugin.saveSettings();
                new Notice('✅ API 키가 검증되었습니다');
                inputEl.setAttribute('data-valid', 'true');
            } else {
                new Notice('❌ 유효하지 않은 API 키입니다');
                inputEl.setAttribute('data-valid', 'false');
            }

            validateBtn.disabled = false;
            validateBtn.textContent = '검증';
        });

        // 입력 변경 시 저장
        inputEl.addEventListener('change', async () => {
            const value = inputEl.value;
            if (value && value !== this.maskApiKey(currentKey)) {
                // 형식 검증
                if (!value.startsWith('sk-')) {
                    new Notice('API 키는 "sk-"로 시작해야 합니다');
                    return;
                }
                
                this.plugin.settings.apiKey = value;
                await this.plugin.saveSettings();
                inputEl.setAttribute('data-has-value', 'true');
            }
        });

        // API 사용량 표시
        this.createApiUsageDisplay(sectionEl);
    }

    /**
     * 오디오 설정 섹션
     */
    private createAudioSection(containerEl: HTMLElement): void {
        const sectionEl = this.createSection(containerEl, 'Audio', '음성 변환 설정');
        this.audioSettings.render(sectionEl);
    }

    /**
     * 고급 설정 섹션
     */
    private createAdvancedSection(containerEl: HTMLElement): void {
        const sectionEl = this.createSection(containerEl, 'Advanced', '고급 설정');
        this.advancedSettings.render(sectionEl);
    }

    /**
     * 단축키 설정 섹션
     */
    private createShortcutSection(containerEl: HTMLElement): void {
        const sectionEl = this.createSection(containerEl, 'Shortcuts', '단축키 설정');
        this.shortcutSettings.render(sectionEl);
    }

    /**
     * 푸터 생성
     */
    private createFooter(containerEl: HTMLElement): void {
        const footerEl = containerEl.createDiv({ cls: 'settings-footer' });
        
        // 설정 내보내기/가져오기
        const exportImportEl = footerEl.createDiv({ cls: 'settings-export-import' });
        
        new ButtonComponent(exportImportEl)
            .setButtonText('설정 내보내기')
            .onClick(async () => {
                await this.exportSettings();
            });

        new ButtonComponent(exportImportEl)
            .setButtonText('설정 가져오기')
            .onClick(async () => {
                await this.importSettings();
            });

        // 초기화 버튼
        new ButtonComponent(footerEl)
            .setButtonText('기본값으로 초기화')
            .setWarning()
            .onClick(async () => {
                const confirmed = await this.confirmReset();
                if (confirmed) {
                    await this.resetSettings();
                }
            });

        // 버전 정보
        const versionEl = footerEl.createDiv({ cls: 'settings-version' });
        versionEl.createEl('small', { 
            text: `Version ${this.plugin.manifest.version} | `,
            cls: 'version-text'
        });
        
        const linkEl = versionEl.createEl('a', { 
            text: '도움말',
            href: 'https://github.com/yourusername/obsidian-speech-to-text',
            cls: 'help-link'
        });
        linkEl.setAttribute('target', '_blank');
    }

    /**
     * 섹션 생성 헬퍼
     */
    private createSection(containerEl: HTMLElement, title: string, desc: string): HTMLElement {
        const sectionEl = containerEl.createDiv({ cls: `settings-section settings-section-${title.toLowerCase()}` });
        
        const headerEl = sectionEl.createDiv({ cls: 'section-header' });
        headerEl.createEl('h3', { text: title });
        headerEl.createEl('p', { text: desc, cls: 'section-description' });
        
        const contentEl = sectionEl.createDiv({ cls: 'section-content' });
        
        return contentEl;
    }

    /**
     * API 사용량 표시
     */
    private createApiUsageDisplay(containerEl: HTMLElement): void {
        const usageEl = containerEl.createDiv({ cls: 'api-usage-display' });
        
        usageEl.createEl('h4', { text: 'API 사용량' });
        
        const statsEl = usageEl.createDiv({ cls: 'usage-stats' });
        
        // 사용량 통계 (예시)
        statsEl.createEl('div', { 
            text: '이번 달 사용량: 0 / 무제한',
            cls: 'usage-item' 
        });
        
        statsEl.createEl('div', { 
            text: '예상 비용: $0.00',
            cls: 'usage-item' 
        });
        
        // 새로고침 버튼
        new ButtonComponent(usageEl)
            .setButtonText('사용량 새로고침')
            .onClick(async () => {
                // API 사용량 조회 로직
                new Notice('사용량 정보를 업데이트했습니다');
            });
    }

    /**
     * 상태 업데이트
     */
    private updateStatus(statusEl: HTMLElement): void {
        statusEl.empty();
        
        const settings = this.plugin.settings;
        const statusItems: Array<{ label: string; value: string; status: 'success' | 'warning' | 'error' }> = [];
        
        // API 키 상태
        if (settings.apiKey) {
            statusItems.push({
                label: 'API 키',
                value: '구성됨',
                status: 'success'
            });
        } else {
            statusItems.push({
                label: 'API 키',
                value: '미구성',
                status: 'error'
            });
        }
        
        // 캐시 상태
        statusItems.push({
            label: '캐시',
            value: settings.enableCache ? '활성화' : '비활성화',
            status: settings.enableCache ? 'success' : 'warning'
        });
        
        // 언어 설정
        statusItems.push({
            label: '언어',
            value: this.getLanguageLabel(settings.language),
            status: 'success'
        });
        
        // 상태 아이템 렌더링
        statusItems.forEach(item => {
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
            'auto': '자동 감지',
            'en': 'English',
            'ko': '한국어',
            'ja': '日本語',
            'zh': '中文',
            'es': 'Español',
            'fr': 'Français',
            'de': 'Deutsch'
        };
        return languages[code] || code;
    }

    /**
     * 설정 내보내기
     */
    private async exportSettings(): Promise<void> {
        try {
            const settings = { ...this.plugin.settings };
            // API 키 제외
            delete (settings as any).apiKey;
            delete (settings as any).encryptedApiKey;
            
            const json = JSON.stringify(settings, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `speech-to-text-settings-${Date.now()}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
            new Notice('설정을 내보냈습니다');
        } catch (error) {
            new Notice('설정 내보내기 실패');
            console.error(error);
        }
    }

    /**
     * 설정 가져오기
     */
    private async importSettings(): Promise<void> {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            
            try {
                const text = await file.text();
                const settings = JSON.parse(text);
                
                // 기존 API 키 보존
                const currentApiKey = this.plugin.settings.apiKey;
                
                // 설정 병합
                Object.assign(this.plugin.settings, settings);
                
                // API 키 복원
                if (currentApiKey) {
                    this.plugin.settings.apiKey = currentApiKey;
                }
                
                await this.plugin.saveSettings();
                
                new Notice('설정을 가져왔습니다');
                this.display(); // UI 새로고침
            } catch (error) {
                new Notice('설정 가져오기 실패');
                console.error(error);
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
        // 기본 설정으로 초기화
        const { DEFAULT_SETTINGS } = await import('../../domain/models/Settings');
        this.plugin.settings = { ...DEFAULT_SETTINGS };
        await this.plugin.saveSettings();
        
        new Notice('설정이 초기화되었습니다');
        this.display(); // UI 새로고침
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
        private onConfirm: (confirmed: boolean) => void
    ) {
        super(app);
    }

    onOpen() {
        const { contentEl } = this;
        
        contentEl.createEl('h2', { text: this.title });
        contentEl.createEl('p', { text: this.message });
        
        const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });
        
        new ButtonComponent(buttonContainer)
            .setButtonText('취소')
            .onClick(() => {
                this.onConfirm(false);
                this.close();
            });
            
        new ButtonComponent(buttonContainer)
            .setButtonText('확인')
            .setWarning()
            .onClick(() => {
                this.onConfirm(true);
                this.close();
            });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}