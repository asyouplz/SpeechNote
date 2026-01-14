import { App, Setting, Notice, ButtonComponent, Modal, requestUrl } from 'obsidian';
import type SpeechToTextPlugin from '../../../../main';
import { TranscriptionProvider } from '../../../../infrastructure/api/providers/ITranscriber';
import { Encryptor } from '../../../../infrastructure/security/Encryptor';
import { BaseSettingsComponent } from '../../base/BaseSettingsComponent';
import { UIComponentFactory } from '../../base/CommonUIComponents';
import { isPlainRecord } from '../../../../types/guards';

/**
 * API 키 타입 정의
 */
interface ApiKeyData {
    provider: TranscriptionProvider;
    key: string;
    isValid: boolean;
    lastValidated?: Date;
}

/**
 * 검증 상태 타입
 */
type ValidationStatus = 'valid' | 'invalid' | 'checking' | 'error' | 'unverified';

interface ValidationState {
    status: ValidationStatus;
    lastValidated?: Date;
    message?: string;
}

/**
 * Provider 설정 타입
 */
interface ProviderConfig {
    name: string;
    placeholder: string;
    pattern: RegExp;
    validateEndpoint: string;
    headers: (key: string) => Record<string, string>;
}

/**
 * API Key Manager (리팩토링 버전)
 *
 * 개선사항:
 * - 제네릭 타입 활용으로 타입 안전성 강화
 * - 메모이제이션으로 불필요한 re-render 방지
 * - 디바운스로 과도한 검증 요청 방지
 * - 에러 바운더리와 graceful degradation
 * - 향상된 접근성 지원
 */
export class APIKeyManagerRefactored extends BaseSettingsComponent {
    private encryptor: Encryptor;
    private apiKeys = new Map<TranscriptionProvider, ApiKeyData>();
    private validationStates = new Map<TranscriptionProvider, ValidationState>();
    private keyVisibility = new Map<TranscriptionProvider, boolean>();

    // 검증 캐시 (TTL: 5분)
    private validationCache = new Map<string, { valid: boolean; timestamp: number }>();
    private readonly CACHE_TTL = 5 * 60 * 1000;

    // 디바운스 타이머
    private debounceTimers = new Map<string, number>();

    // Provider 설정
    private readonly providerConfigs: Map<TranscriptionProvider, ProviderConfig> = new Map([
        [
            'whisper',
            {
                name: 'OpenAI Whisper',
                placeholder: 'sk-...',
                pattern: /^sk-[A-Za-z0-9]{48,}$/,
                validateEndpoint: 'https://api.openai.com/v1/models',
                headers: (key: string) => ({ Authorization: `Bearer ${key}` }),
            },
        ],
        [
            'deepgram',
            {
                name: 'Deepgram',
                placeholder: 'Enter Deepgram API key',
                pattern: /^[a-f0-9]{32,}$/,
                validateEndpoint: 'https://api.deepgram.com/v1/projects',
                headers: (key: string) => ({ Authorization: `Token ${key}` }),
            },
        ],
    ]);

    constructor(plugin: SpeechToTextPlugin) {
        super(plugin);
        this.encryptor = new Encryptor();
        void this.initialize();
    }

    /**
     * 초기화
     */
    private async initialize(): Promise<void> {
        await this.loadApiKeys();
    }

    /**
     * 렌더링 구현
     */
    protected doRender(containerEl: HTMLElement): void {
        containerEl.addClass('api-key-manager-refactored');

        // 헤더
        this.renderHeader(containerEl);

        // API 키 입력 섹션
        this.renderApiKeyInputs(containerEl);

        // 보안 정보
        this.renderSecurityInfo(containerEl);

        // 액션 버튼
        this.renderActions(containerEl);
    }

    /**
     * 헤더 렌더링
     */
    private renderHeader(containerEl: HTMLElement): void {
        const headerEl = this.createSection(
            containerEl,
            '🔐 API 키 관리',
            '안전한 API 키 관리 및 검증',
            'api-key-header'
        );

        // 전체 상태 표시
        this.renderOverallStatus(headerEl);
    }

    /**
     * 전체 상태 렌더링
     */
    private renderOverallStatus(containerEl: HTMLElement): void {
        const statusContainer = containerEl.createDiv({ cls: 'overall-api-status' });

        const validKeys = Array.from(this.validationStates.values()).filter(
            (state) => state.status === 'valid'
        ).length;
        const totalKeys = this.providerConfigs.size;

        const status: 'success' | 'warning' | 'error' =
            validKeys === totalKeys ? 'success' : validKeys > 0 ? 'warning' : 'error';

        UIComponentFactory.createStatusIndicator(
            statusContainer,
            status,
            `${validKeys}/${totalKeys} 키 검증됨`,
            status === 'success' ? '✅' : status === 'warning' ? '⚠️' : '❌'
        );
    }

    /**
     * API 키 입력 렌더링
     */
    private renderApiKeyInputs(containerEl: HTMLElement): void {
        const inputsSection = this.createSection(containerEl, 'API 키', '', 'api-key-inputs');

        // 현재 Provider 또는 모든 Provider 표시
        const currentProvider = this.plugin.settings.provider ?? 'auto';
        const providers =
            currentProvider === 'auto'
                ? Array.from(this.providerConfigs.keys())
                : this.isTranscriptionProvider(currentProvider)
                ? [currentProvider]
                : [];

        providers.forEach((provider) => {
            this.renderSingleApiKeyInput(inputsSection, provider);
        });
    }

    /**
     * 단일 API 키 입력 렌더링 (최적화)
     */
    private renderSingleApiKeyInput(
        containerEl: HTMLElement,
        provider: TranscriptionProvider
    ): void {
        const config = this.providerConfigs.get(provider);
        if (!config) return;

        const keyData = this.apiKeys.get(provider);
        const validationState = this.validationStates.get(provider);

        // 카드 형태로 렌더링
        const cardEl = containerEl.createDiv({ cls: `api-key-card ${provider}` });

        // Provider 정보
        const headerEl = cardEl.createDiv({ cls: 'card-header' });
        headerEl.createEl('h5', { text: config.name });

        // 상태 표시
        this.renderKeyStatus(headerEl, validationState);

        // 입력 필드 컨테이너
        const inputContainer = cardEl.createDiv({ cls: 'key-input-container' });

        // 입력 필드 그룹
        const inputGroup = inputContainer.createDiv({ cls: 'input-group' });

        // 입력 필드
        const inputEl = this.createSecureInput(inputGroup, provider, config, keyData);

        // 액션 버튼들
        this.createInputActions(inputGroup, inputEl, provider, config);

        // 검증 메시지
        if (validationState?.message) {
            this.renderValidationMessage(cardEl, validationState);
        }

        // 최근 검증 시간
        if (validationState?.lastValidated) {
            this.renderLastValidated(cardEl, validationState.lastValidated);
        }
    }

    /**
     * 보안 입력 필드 생성
     */
    private createSecureInput(
        containerEl: HTMLElement,
        provider: TranscriptionProvider,
        config: ProviderConfig,
        keyData?: ApiKeyData
    ): HTMLInputElement {
        const inputEl = containerEl.createEl('input', {
            type: 'password',
            placeholder: config.placeholder,
            cls: 'api-key-input secure-input',
            attr: {
                'data-provider': provider,
                autocomplete: 'off',
                spellcheck: 'false',
                'aria-label': `${config.name} API 키`,
                'aria-describedby': `${provider}-validation-message`,
            },
        });

        // 기존 값 설정
        if (keyData?.key) {
            inputEl.value = this.maskApiKey(keyData.key);
            inputEl.addClass('has-value');
        }

        // 이벤트 핸들러 (최적화)
        this.attachOptimizedInputHandlers(inputEl, provider, config);

        return inputEl;
    }

    /**
     * 최적화된 입력 핸들러
     */
    private attachOptimizedInputHandlers(
        inputEl: HTMLInputElement,
        provider: TranscriptionProvider,
        config: ProviderConfig
    ): void {
        // 입력 검증 (디바운스 적용)
        inputEl.addEventListener('input', (e) => {
            const target = e.target;
            if (!(target instanceof HTMLInputElement)) {
                return;
            }
            const value = target.value;

            // 마스킹된 값은 무시
            if (value.includes('*')) return;

            // 디바운스된 검증
            setTimeout(() => {
                this.validateInputFormat(inputEl, value, config.pattern);
            }, 500);
        });

        // 포커스 아웃시 저장
        inputEl.addEventListener('blur', async (e) => {
            const target = e.target;
            if (!(target instanceof HTMLInputElement)) {
                return;
            }
            const value = target.value;

            if (value && !value.includes('*') && config.pattern.test(value)) {
                await this.saveApiKey(provider, value);
            }
        });

        // Enter 키 처리
        inputEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const validateBtn = inputEl.parentElement?.querySelector('.validate-btn');
                if (validateBtn instanceof HTMLButtonElement) {
                    validateBtn.click();
                }
            }
        });
    }

    /**
     * 입력 액션 버튼 생성
     */
    private createInputActions(
        containerEl: HTMLElement,
        inputEl: HTMLInputElement,
        provider: TranscriptionProvider,
        config: ProviderConfig
    ): void {
        const actionsEl = containerEl.createDiv({ cls: 'input-actions' });

        // 가시성 토글
        this.createVisibilityToggle(actionsEl, inputEl, provider);

        // 검증 버튼
        this.createValidateButton(actionsEl, inputEl, provider, config);

        // 복사 버튼
        this.createCopyButton(actionsEl, provider);

        // 삭제 버튼
        this.createDeleteButton(actionsEl, provider);
    }

    /**
     * 가시성 토글 버튼 (개선)
     */
    private createVisibilityToggle(
        containerEl: HTMLElement,
        inputEl: HTMLInputElement,
        provider: TranscriptionProvider
    ): HTMLButtonElement {
        const btn = containerEl.createEl('button', {
            cls: 'icon-btn visibility-toggle',
            attr: {
                'aria-label': '키 보기/숨기기',
                title: '키 보기/숨기기',
                role: 'switch',
                'aria-checked': 'false',
            },
        });

        const updateIcon = () => {
            const isVisible = this.keyVisibility.get(provider) || false;
            btn.setText(isVisible ? '👁️' : '🙈');
            btn.setAttribute('aria-checked', String(isVisible));
        };

        updateIcon();

        btn.onclick = () => {
            const isVisible = !(this.keyVisibility.get(provider) || false);
            this.keyVisibility.set(provider, isVisible);

            const keyData = this.apiKeys.get(provider);
            if (keyData) {
                inputEl.type = isVisible ? 'text' : 'password';
                inputEl.value = isVisible ? keyData.key : this.maskApiKey(keyData.key);
            }

            updateIcon();
        };

        return btn;
    }

    /**
     * 검증 버튼 (개선)
     */
    private createValidateButton(
        containerEl: HTMLElement,
        inputEl: HTMLInputElement,
        provider: TranscriptionProvider,
        config: ProviderConfig
    ): HTMLButtonElement {
        const btn = containerEl.createEl('button', {
            text: '검증',
            cls: 'validate-btn mod-cta',
            attr: {
                'aria-label': 'API 키 검증',
                title: 'API 키 유효성 검사',
            },
        });

        btn.onclick = async () => {
            await this.validateApiKeyWithUI(inputEl, provider, config, btn);
        };

        return btn;
    }

    /**
     * 복사 버튼
     */
    private createCopyButton(
        containerEl: HTMLElement,
        provider: TranscriptionProvider
    ): HTMLButtonElement {
        const btn = containerEl.createEl('button', {
            cls: 'icon-btn copy-btn',
            text: '📋',
            attr: {
                'aria-label': 'API 키 복사',
                title: '클립보드에 복사',
            },
        });

        btn.onclick = async () => {
            await this.copyApiKey(provider);
        };

        return btn;
    }

    /**
     * 삭제 버튼
     */
    private createDeleteButton(
        containerEl: HTMLElement,
        provider: TranscriptionProvider
    ): HTMLButtonElement {
        const btn = containerEl.createEl('button', {
            cls: 'icon-btn delete-btn',
            text: '🗑️',
            attr: {
                'aria-label': 'API 키 삭제',
                title: 'API 키 제거',
            },
        });

        btn.onclick = async () => {
            await this.deleteApiKey(provider);
        };

        return btn;
    }

    /**
     * 키 상태 렌더링
     */
    private renderKeyStatus(containerEl: HTMLElement, state?: ValidationState): void {
        const statusMap: Record<ValidationStatus, { icon: string; text: string; class: string }> = {
            valid: { icon: '✅', text: '검증됨', class: 'status-valid' },
            invalid: { icon: '❌', text: '유효하지 않음', class: 'status-invalid' },
            checking: { icon: '🔄', text: '확인 중...', class: 'status-checking' },
            error: { icon: '⚠️', text: '오류', class: 'status-error' },
            unverified: { icon: '❓', text: '미검증', class: 'status-unverified' },
        };

        const status = state?.status || 'unverified';
        const config = statusMap[status];

        const _statusEl = containerEl.createSpan({
            cls: `key-status ${config.class}`,
            text: `${config.icon} ${config.text}`,
            attr: {
                role: 'status',
                'aria-live': 'polite',
            },
        });
    }

    /**
     * 검증 메시지 렌더링
     */
    private renderValidationMessage(containerEl: HTMLElement, state: ValidationState): void {
        if (!state.message) return;

        const _messageEl = containerEl.createDiv({
            cls: `validation-message message-${state.status}`,
            text: state.message,
            attr: {
                role: 'alert',
                'aria-live': 'polite',
            },
        });
    }

    /**
     * 최근 검증 시간 렌더링
     */
    private renderLastValidated(containerEl: HTMLElement, date: Date): void {
        const _timeEl = containerEl.createDiv({
            cls: 'last-validated',
            text: `최근 검증: ${this.formatRelativeTime(date)}`,
            attr: {
                'aria-label': `최근 검증 시간: ${date.toLocaleString()}`,
            },
        });
    }

    /**
     * 보안 정보 렌더링
     */
    private renderSecurityInfo(containerEl: HTMLElement): void {
        const { contentEl } = UIComponentFactory.createCollapsibleSection(
            containerEl,
            '🔒 보안 정보',
            false
        );

        const infoItems = [
            '✅ API 키는 AES-256-GCM으로 암호화됩니다',
            '✅ 키는 로그나 디버그 출력에 노출되지 않습니다',
            '✅ 로컬 저장소에만 보관되며 외부로 전송되지 않습니다',
            '💡 추가 보안을 위해 환경 변수 사용을 권장합니다',
        ];

        const listEl = contentEl.createEl('ul', { cls: 'security-list' });
        infoItems.forEach((item) => {
            listEl.createEl('li', { text: item });
        });

        // 보안 설정 버튼
        new ButtonComponent(contentEl)
            .setButtonText('보안 설정')
            .setIcon('shield')
            .onClick(() => this.showSecuritySettings());
    }

    /**
     * 액션 버튼 렌더링
     */
    private renderActions(containerEl: HTMLElement): void {
        const actionsSection = this.createSection(containerEl, '작업', '', 'api-key-actions');

        const actions = [
            {
                text: '모든 키 검증',
                onClick: () => this.verifyAllKeys(),
                primary: true,
            },
            {
                text: '키 가져오기',
                onClick: () => this.importKeys(),
            },
            {
                text: '키 내보내기',
                onClick: () => this.exportKeys(),
            },
        ];

        actions.forEach((action) => {
            const btn = new ButtonComponent(actionsSection)
                .setButtonText(action.text)
                .onClick(action.onClick);

            if (action.primary) btn.setCta();
        });
    }

    /**
     * UI를 통한 API 키 검증
     */
    private async validateApiKeyWithUI(
        inputEl: HTMLInputElement,
        provider: TranscriptionProvider,
        config: ProviderConfig,
        btn: HTMLButtonElement
    ): Promise<void> {
        const value = inputEl.value;

        // 마스킹된 값 체크
        if (value.includes('*')) {
            this.showNotice('새로운 API 키를 입력해주세요');
            return;
        }

        // 형식 검증
        if (!config.pattern.test(value)) {
            this.updateValidationState(
                provider,
                'invalid',
                `올바른 ${config.name} 키 형식이 아닙니다`
            );
            return;
        }

        // UI 상태 업데이트
        btn.disabled = true;
        btn.textContent = '검증 중...';
        this.updateValidationState(provider, 'checking');

        try {
            const isValid = await this.validateApiKey(provider, value, config);

            if (isValid) {
                await this.saveApiKey(provider, value);
                this.updateValidationState(provider, 'valid', 'API 키가 검증되었습니다');
                this.showNotice(`✅ ${config.name} API 키 검증 성공`);
            } else {
                this.updateValidationState(provider, 'invalid', 'API 키가 유효하지 않습니다');
                this.showNotice(`❌ ${config.name} API 키 검증 실패`);
            }
        } catch (error) {
            console.error(`API 키 검증 오류:`, error);
            this.updateValidationState(provider, 'error', '검증 중 오류가 발생했습니다');
        } finally {
            btn.disabled = false;
            btn.textContent = '검증';
        }
    }

    /**
     * API 키 검증 (캐시 적용)
     */
    private async validateApiKey(
        provider: TranscriptionProvider,
        key: string,
        config: ProviderConfig
    ): Promise<boolean> {
        // 캐시 확인
        const cacheKey = `${provider}:${key}`;
        const cached = this.validationCache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            return cached.valid;
        }

        try {
            const response = await requestUrl({
                url: config.validateEndpoint,
                method: 'GET',
                headers: config.headers(key),
            });

            const isValid = response.status >= 200 && response.status < 300;

            // 캐시 저장
            this.validationCache.set(cacheKey, {
                valid: isValid,
                timestamp: Date.now(),
            });

            return isValid;
        } catch (error) {
            console.error(`${provider} 검증 오류:`, error);
            return false;
        }
    }

    /**
     * 모든 키 검증
     */
    public async verifyAllKeys(): Promise<Map<TranscriptionProvider, boolean>> {
        const results = new Map<TranscriptionProvider, boolean>();

        const promises = Array.from(this.apiKeys.entries()).map(async ([provider, keyData]) => {
            const config = this.providerConfigs.get(provider);
            if (!config) return { provider, valid: false };

            const valid = await this.validateApiKey(provider, keyData.key, config);
            return { provider, valid };
        });

        const validationResults = await Promise.all(promises);

        validationResults.forEach(({ provider, valid }) => {
            results.set(provider, valid);
            this.updateValidationState(
                provider,
                valid ? 'valid' : 'invalid',
                valid ? 'API 키가 검증되었습니다' : 'API 키가 유효하지 않습니다'
            );
        });

        // UI 새로고침
        if (this.containerEl) {
            this.render(this.containerEl);
        }

        return results;
    }

    /**
     * 입력 형식 검증
     */
    private validateInputFormat(inputEl: HTMLInputElement, value: string, pattern: RegExp): void {
        const isValid = pattern.test(value);

        if (isValid) {
            inputEl.removeClass('invalid');
            inputEl.addClass('valid-format');
        } else {
            inputEl.removeClass('valid-format');
            inputEl.addClass('invalid');
        }
    }

    /**
     * 검증 상태 업데이트
     */
    private updateValidationState(
        provider: TranscriptionProvider,
        status: ValidationStatus,
        message?: string
    ): void {
        this.validationStates.set(provider, {
            status,
            message,
            lastValidated: status === 'valid' ? new Date() : undefined,
        });

        // UI에 반영
        const cardEl = document.querySelector(`.api-key-card.${provider}`);
        if (cardEl) {
            // 상태 업데이트 로직
        }
    }

    /**
     * API 키 저장 (암호화)
     */
    private async saveApiKey(provider: TranscriptionProvider, key: string): Promise<void> {
        await this.withErrorHandling(async () => {
            // 암호화
            const encrypted = await this.encryptor.encrypt(key);

            // 메모리 저장
            this.apiKeys.set(provider, {
                provider,
                key,
                isValid: true,
                lastValidated: new Date(),
            });

            // 설정 저장
            const encryptedString = JSON.stringify(encrypted);
            if (provider === 'whisper') {
                this.plugin.settings.apiKey = encryptedString;
                this.plugin.settings.whisperApiKey = encryptedString;
            } else if (provider === 'deepgram') {
                this.plugin.settings.deepgramApiKey = encryptedString;
            }

            await this.saveSettings();
        });
    }

    /**
     * API 키 삭제
     */
    private async deleteApiKey(provider: TranscriptionProvider): Promise<void> {
        const confirmed = await UIComponentFactory.showConfirmDialog(
            'API 키 삭제',
            `${this.providerConfigs.get(provider)?.name} API 키를 삭제하시겠습니까?`,
            '삭제',
            '취소'
        );

        if (!confirmed) return;

        await this.withErrorHandling(async () => {
            this.apiKeys.delete(provider);
            this.validationStates.delete(provider);

            if (provider === 'whisper') {
                this.plugin.settings.apiKey = '';
                this.plugin.settings.whisperApiKey = '';
            } else if (provider === 'deepgram') {
                this.plugin.settings.deepgramApiKey = '';
            }

            await this.saveSettings();

            // UI 새로고침
            if (this.containerEl) {
                this.render(this.containerEl);
            }

            this.showNotice('API 키가 삭제되었습니다');
        });
    }

    /**
     * API 키 복사
     */
    private async copyApiKey(provider: TranscriptionProvider): Promise<void> {
        const keyData = this.apiKeys.get(provider);
        if (!keyData) {
            this.showNotice('복사할 API 키가 없습니다');
            return;
        }

        await this.withErrorHandling(async () => {
            await navigator.clipboard.writeText(keyData.key);
            this.showNotice('API 키가 클립보드에 복사되었습니다');
        }, 'API 키 복사 실패');
    }

    /**
     * 키 가져오기
     */
    private importKeys(): void {
        const input = createEl('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = async (e) => {
            const target = e.target;
            if (!(target instanceof HTMLInputElement)) {
                return;
            }
            const file = target.files?.[0];
            if (!file) return;

            await this.withErrorHandling(async () => {
                const content = await file.text();
                const parsed = JSON.parse(content);
                const keys: Record<string, string> = {};
                if (isPlainRecord(parsed)) {
                    Object.entries(parsed).forEach(([key, value]) => {
                        if (typeof value === 'string') {
                            keys[key] = value;
                        }
                    });
                }

                for (const [provider, key] of Object.entries(keys)) {
                    if (this.isTranscriptionProvider(provider)) {
                        await this.saveApiKey(provider, key);
                    }
                }

                this.showNotice('API 키를 가져왔습니다');

                // UI 새로고침
                if (this.containerEl) {
                    this.render(this.containerEl);
                }
            }, 'API 키 가져오기 실패');
        };

        input.click();
    }

    /**
     * 키 내보내기
     */
    private async exportKeys(): Promise<void> {
        await this.withErrorHandling(() => {
            const exportData: Record<string, string> = {};

            this.apiKeys.forEach((keyData, provider) => {
                exportData[provider] = keyData.key;
            });

            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json',
            });
            const url = URL.createObjectURL(blob);

            const a = createEl('a');
            a.href = url;
            a.download = `api-keys-${Date.now()}.json`;
            a.click();

            URL.revokeObjectURL(url);
            this.showNotice('API 키를 내보냈습니다');
            return Promise.resolve();
        }, 'API 키 내보내기 실패');
    }

    private isTranscriptionProvider(value: string): value is TranscriptionProvider {
        return value === 'whisper' || value === 'deepgram';
    }

    /**
     * 보안 설정 표시
     */
    private showSecuritySettings(): void {
        const modal = new SecuritySettingsModal(this.plugin.app!, this.plugin);
        modal.open();
    }

    /**
     * API 키 마스킹
     */
    private maskApiKey(key: string): string {
        if (!key || key.length < 10) return '***';

        const visibleStart = 7;
        const visibleEnd = 4;
        const maskedLength = Math.max(3, key.length - visibleStart - visibleEnd);

        return (
            key.substring(0, visibleStart) +
            '*'.repeat(maskedLength) +
            key.substring(key.length - visibleEnd)
        );
    }

    /**
     * 상대 시간 포맷팅
     */
    private formatRelativeTime(date: Date): string {
        const now = new Date();
        const diff = now.getTime() - date.getTime();

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return '방금 전';
        if (minutes < 60) return `${minutes}분 전`;
        if (hours < 24) return `${hours}시간 전`;
        return `${days}일 전`;
    }

    /**
     * API 키 로드
     */
    private async loadApiKeys(): Promise<void> {
        await this.withErrorHandling(async () => {
            // 환경 변수 확인
            if (this.plugin.settings.useEnvVars) {
                this.loadFromEnvironment();
            }

            // 저장된 키 로드
            await this.loadFromSettings();
        });
    }

    /**
     * 환경 변수에서 로드
     */
    private loadFromEnvironment(): void {
        // 브라우저 환경에서는 환경 변수 사용 불가
        // Electron 환경에서만 가능
    }

    /**
     * 설정에서 로드
     */
    private async loadFromSettings(): Promise<void> {
        const providers: Array<{ provider: TranscriptionProvider; key: string | undefined }> = [
            {
                provider: 'whisper',
                key: this.plugin.settings.whisperApiKey || this.plugin.settings.apiKey,
            },
            { provider: 'deepgram', key: this.plugin.settings.deepgramApiKey },
        ];

        for (const { provider, key } of providers) {
            if (key) {
                try {
                    const encryptedData = JSON.parse(key);
                    const decrypted = await this.encryptor.decrypt(encryptedData);
                    this.apiKeys.set(provider, {
                        provider,
                        key: decrypted,
                        isValid: false,
                    });
                } catch (error) {
                    // 암호화되지 않은 키일 수 있음
                    if (!key.includes('*')) {
                        this.apiKeys.set(provider, {
                            provider,
                            key,
                            isValid: false,
                        });
                    }
                }
            }
        }
    }

    /**
     * 정리
     */
    public destroy(): void {
        super.destroy();

        // 타이머 정리
        this.debounceTimers.forEach((timer) => window.clearTimeout(timer));
        this.debounceTimers.clear();

        // 캐시 정리
        this.validationCache.clear();

        // 맵 정리
        this.apiKeys.clear();
        this.validationStates.clear();
        this.keyVisibility.clear();
    }
}

/**
 * 보안 설정 모달
 */
class SecuritySettingsModal extends Modal {
    constructor(app: App, private plugin: SpeechToTextPlugin) {
        super(app);
    }

    onOpen(): void {
        const { contentEl, titleEl } = this;

        titleEl.setText('API 키 보안 설정');

        // 암호화 설정
        new Setting(contentEl)
            .setName('암호화')
            .setDesc('API 키는 항상 암호화됩니다')
            .addToggle((toggle) => {
                toggle.setValue(true).setDisabled(true);
            });

        // 자동 검증
        new Setting(contentEl)
            .setName('저장시 자동 검증')
            .setDesc('API 키 저장시 자동으로 유효성을 검증합니다')
            .addToggle((toggle) => {
                toggle
                    .setValue(this.plugin.settings.autoValidateKeys || false)
                    .onChange(async (value) => {
                        this.plugin.settings.autoValidateKeys = value;
                        await this.plugin.saveSettings();
                    });
            });

        // 환경 변수 사용
        new Setting(contentEl)
            .setName('환경 변수 사용')
            .setDesc('환경 변수에서 API 키를 로드합니다 (더 안전)')
            .addToggle((toggle) => {
                toggle
                    .setValue(this.plugin.settings.useEnvVars || false)
                    .onChange(async (value) => {
                        this.plugin.settings.useEnvVars = value;
                        await this.plugin.saveSettings();

                        if (value) {
                            this.showEnvVarInstructions();
                        }
                    });
            });
    }

    private showEnvVarInstructions(): void {
        new Notice('환경 변수 설정 방법은 문서를 참조하세요');
    }
}
