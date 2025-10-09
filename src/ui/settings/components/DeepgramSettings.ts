import { Setting, Notice } from 'obsidian';
import type SpeechToTextPlugin from '../../../main';
import { DeepgramModelRegistry, DeepgramModel, DeepgramFeature } from '../../../config/DeepgramModelRegistry';
import { UI_CONSTANTS, CONFIG_CONSTANTS, LANGUAGE_OPTIONS, DEFAULT_MODELS, DEFAULT_FEATURES } from '../../../config/DeepgramConstants';
import { DeepgramLogger } from '../helpers/DeepgramLogger';
import { DeepgramUIBuilder } from './DeepgramUIBuilder';
import { DeepgramValidator } from '../services/DeepgramValidator';
import { DeepgramCostCalculator } from '../services/DeepgramCostCalculator';
import type { 
    TextComponent, 
    DropdownComponent, 
    ToggleComponent, 
    ButtonComponent,
    DeepgramFeatures 
} from '../../../types/DeepgramTypes';

/**
 * Deepgram 설정 UI 컴포넌트
 * - API 키 관리
 * - 모델 선택
 * - 기능 토글
 * - 비용 추정
 */
export class DeepgramSettings {
    private plugin: SpeechToTextPlugin;
    private registry: DeepgramModelRegistry | null = null;
    private containerEl: HTMLElement;
    private selectedModel: DeepgramModel | null = null;
    private estimatedCostEl: HTMLElement | null = null;
    
    // 헬퍼 클래스들
    private logger: DeepgramLogger;
    private uiBuilder: DeepgramUIBuilder;
    private validator: DeepgramValidator;
    private costCalculator: DeepgramCostCalculator;

    constructor(plugin: SpeechToTextPlugin, containerEl: HTMLElement) {
        this.plugin = plugin;
        this.containerEl = containerEl;
        
        // 헬퍼 클래스 초기화
        this.logger = DeepgramLogger.getInstance();
        this.uiBuilder = new DeepgramUIBuilder(containerEl);
        this.validator = new DeepgramValidator();
        this.costCalculator = new DeepgramCostCalculator();
        
        // DeepgramModelRegistry 안전한 초기화
        this.initializeRegistry();
    }

    /**
     * Registry 초기화
     */
    private initializeRegistry(): void {
        try {
            this.logger.info('Attempting to initialize DeepgramModelRegistry...');
            this.registry = DeepgramModelRegistry.getInstance();
            
            const models = this.registry.getAllModels();
            this.logger.info(`Registry initialized successfully with ${models.length} models`);
            
            if (models.length === 0) {
                this.logger.warn('Registry has no models, will use fallback');
                this.registry = null;
            }
        } catch (error) {
            this.logger.error('Failed to initialize registry', error);
            this.registry = null;
            this.logger.info('Will continue with fallback UI');
        }
    }

    /**
     * Deepgram 설정 UI 렌더링
     */
    public render(): void {
        this.logger.group('render()');
        this.logRenderState();
        
        try {
            this.uiBuilder.clearContainer();
            this.renderHeader();
            this.renderSections();
            
            this.logger.info(`Total elements created: ${this.containerEl.children.length}`);
            this.logger.groupEnd();
        } catch (error) {
            this.logger.error('Critical error in render()', error);
            this.renderFallbackUI(error);
        }
    }

    /**
     * 렌더링 상태 로깅
     */
    private logRenderState(): void {
        this.logger.debug('Container element:', this.containerEl);
        this.logger.debug('Container is connected:', this.containerEl.isConnected);
        this.logger.debug('Registry available:', !!this.registry);
        this.logger.debug('API key exists:', !!this.plugin.settings.deepgramApiKey);
        
        if (!this.containerEl.isConnected) {
            this.logger.warn('Container is not connected to DOM, attempting to render anyway');
        }
        
        if (!this.registry) {
            this.logger.warn('Registry not available, using fallback UI');
        }
    }

    /**
     * 헤더 섹션 렌더링
     */
    private renderHeader(): void {
        this.uiBuilder.createHeader(UI_CONSTANTS.MESSAGES.HEADER);
        this.uiBuilder.createDescription(UI_CONSTANTS.MESSAGES.DESCRIPTION);
        
        if (!this.registry) {
            this.uiBuilder.createWarning(UI_CONSTANTS.MESSAGES.REGISTRY_WARNING);
        }
    }

    /**
     * 모든 섹션 렌더링
     */
    private renderSections(): void {
        this.logger.info('Rendering API key section...');
        this.renderApiKeySection();
        
        this.logger.info('Rendering model selection...');
        this.renderModelSelection();
        
        this.logger.info('Rendering feature toggles...');
        this.renderFeatureToggles();
        
        this.logger.info('Rendering advanced settings...');
        this.renderAdvancedSettings();
        
        this.logger.info('Rendering cost estimation...');
        this.renderCostEstimation();
        
        this.logger.info('Rendering validation button...');
        this.renderValidationButton();
    }

    /**
     * API 키 입력 섹션
     */
    private renderApiKeySection(): void {
        new Setting(this.containerEl)
            .setName(UI_CONSTANTS.MESSAGES.API_KEY_LABEL)
            .setDesc(UI_CONSTANTS.MESSAGES.API_KEY_DESC)
            .addText(text => {
                this.setupApiKeyInput(text);
            });
    }

    /**
     * API 키 입력 필드 설정
     */
    private setupApiKeyInput(text: TextComponent): void {
        const currentKey = this.plugin.settings.deepgramApiKey || '';
        
        text
            .setPlaceholder(UI_CONSTANTS.MESSAGES.API_KEY_PLACEHOLDER)
            .setValue(this.validator.maskApiKey(currentKey))
            .onChange(async (value: string) => {
                await this.handleApiKeyChange(value, text);
            });
        
        // Security settings
        text.inputEl.type = 'password';
        text.inputEl.addClass(UI_CONSTANTS.CLASSES.API_KEY_INPUT);
        
        // Event listeners
        this.attachApiKeyEventListeners(text);
    }

    /**
     * API 키 변경 처리
     */
    private async handleApiKeyChange(value: string, text: TextComponent): Promise<void> {
        if (value && !value.includes('*')) {
            this.plugin.settings.deepgramApiKey = value;
            await this.plugin.saveSettings();
            
            text.setValue(this.validator.maskApiKey(value));
            new Notice(UI_CONSTANTS.MESSAGES.API_KEY_SAVED);
            
            this.updateUIState();
        }
    }

    /**
     * API 키 이벤트 리스너 연결
     */
    private attachApiKeyEventListeners(text: TextComponent): void {
        text.inputEl.addEventListener('focus', () => {
            if (this.plugin.settings.deepgramApiKey) {
                text.setValue(this.plugin.settings.deepgramApiKey);
            }
        });
        
        text.inputEl.addEventListener('blur', () => {
            if (this.plugin.settings.deepgramApiKey) {
                text.setValue(this.validator.maskApiKey(this.plugin.settings.deepgramApiKey));
            }
        });
    }

    /**
     * 모델 선택 섹션
     */
    private renderModelSelection(): void {
        const setting = new Setting(this.containerEl)
            .setName(UI_CONSTANTS.MESSAGES.MODEL_LABEL)
            .setDesc(UI_CONSTANTS.MESSAGES.MODEL_DESC);

        const dropdown = setting.addDropdown(dropdown => {
            this.populateModelDropdown(dropdown);
            this.setupModelDropdownHandlers(dropdown);
            return dropdown;
        });

        this.disableIfNoApiKey(setting);
    }

    /**
     * 모델 드롭다운 채우기
     */
    private populateModelDropdown(dropdown: DropdownComponent): void {
        dropdown.addOption('', UI_CONSTANTS.MESSAGES.MODEL_PLACEHOLDER);
        
        if (!this.registry) {
            this.logger.warn('Registry not available, using default models');
            this.addDefaultModelOptions(dropdown);
            return;
        }
        
        try {
            const models = this.registry.getAllModels();
            if (models.length === 0) {
                this.logger.warn('No models in registry, using defaults');
                this.addDefaultModelOptions(dropdown);
            } else {
                this.addModelOptions(dropdown, models);
                this.logger.info(`Added ${models.length} models to dropdown`);
            }
        } catch (error) {
            this.logger.error('Error loading models', error);
            this.addDefaultModelOptions(dropdown);
        }
    }

    /**
     * 모델 옵션 추가
     */
    private addModelOptions(dropdown: DropdownComponent, models: DeepgramModel[]): void {
        models.forEach((model: DeepgramModel) => {
            const optionText = this.formatModelOption(model);
            dropdown.addOption(model.id, optionText);
        });
    }

    /**
     * 모델 옵션 포맷팅
     */
    private formatModelOption(model: DeepgramModel): string {
        return `${model.name} (${model.tier}) - $${model.pricing.perMinute}/min`;
    }

    /**
     * 모델 드롭다운 핸들러 설정
     */
    private setupModelDropdownHandlers(dropdown: DropdownComponent): void {
        const currentModel = this.plugin.settings.transcription?.deepgram?.model || '';
        dropdown.setValue(currentModel);
        
        dropdown.onChange(async (value: string) => {
            await this.handleModelChange(value);
        });
    }

    /**
     * 모델 변경 처리
     */
    private async handleModelChange(modelId: string): Promise<void> {
        if (!modelId) {
            this.selectedModel = null;
            return;
        }
        
        this.selectedModel = this.registry?.getModel(modelId) || null;
        await this.saveModelSelection(modelId);
        this.updateUIAfterModelChange();
        
        if (this.selectedModel) {
            new Notice(`Selected model: ${this.selectedModel.name}`);
        }
    }

    /**
     * 모델 선택 저장
     */
    private async saveModelSelection(modelId: string): Promise<void> {
        if (!this.plugin.settings.transcription) {
            this.plugin.settings.transcription = {};
        }
        if (!this.plugin.settings.transcription.deepgram) {
            this.plugin.settings.transcription.deepgram = {
                enabled: true,
                model: modelId
            };
        } else {
            this.plugin.settings.transcription.deepgram.model = modelId;
        }
        
        await this.plugin.saveSettings();
    }

    /**
     * 모델 변경 후 UI 업데이트
     */
    private updateUIAfterModelChange(): void {
        this.updateModelInfo();
        this.updateFeatureAvailability();
        this.updateCostEstimation();
    }

    /**
     * API 키 없을 시 비활성화
     */
    private disableIfNoApiKey(setting: Setting): void {
        if (!this.plugin.settings.deepgramApiKey) {
            const selectElement = setting.settingEl.querySelector('select') as HTMLSelectElement;
            if (selectElement) {
                selectElement.disabled = true;
            }
            setting.setDesc(UI_CONSTANTS.MESSAGES.API_KEY_REQUIRED);
        }
    }

    /**
     * 모델 정보 표시
     */
    private updateModelInfo(): void {
        if (!this.selectedModel) return;
        this.uiBuilder.createModelInfoCard(this.selectedModel);
    }

    /**
     * 기능 토글 섹션
     */
    private renderFeatureToggles(): void {
        const container = this.uiBuilder.createSection(
            UI_CONSTANTS.CLASSES.FEATURES_CONTAINER,
            UI_CONSTANTS.MESSAGES.FEATURES_HEADER
        );

        if (!this.registry) {
            this.renderDefaultFeatures(container);
            return;
        }
        
        const features = this.registry.getAllFeatures();
        features.forEach((feature, key) => {
            this.renderFeatureToggle(container, feature, key);
        });
    }

    /**
     * 개별 기능 토글 렌더링
     */
    private renderFeatureToggle(
        container: HTMLElement, 
        feature: DeepgramFeature, 
        key: string
    ): void {
        const setting = new Setting(container)
            .setName(feature.name)
            .setDesc(this.getFeatureDescription(feature));

        setting.addToggle(toggle => {
            const currentValue = this.getFeatureValue(key, feature.default);
            
            toggle
                .setValue(currentValue)
                .onChange(async (value: boolean) => {
                    await this.saveFeatureSetting(key, value);
                    this.updateCostEstimation();
                });
            
            this.updateFeatureAvailabilityForToggle(toggle, setting, feature, key);
            
            return toggle;
        });
    }

    /**
     * 기능 설명 가져오기
     */
    private getFeatureDescription(feature: DeepgramFeature): string {
        return feature.requiresPremium 
            ? `${feature.description} (Premium feature)` 
            : feature.description;
    }

    /**
     * 기능 값 가져오기
     */
    private getFeatureValue(key: string, defaultValue: boolean): boolean {
        const features = this.plugin.settings.transcription?.deepgram?.features as DeepgramFeatures | undefined;
        return features?.[key] ?? defaultValue;
    }

    /**
     * 기능 설정 저장
     */
    private async saveFeatureSetting(key: string, value: boolean): Promise<void> {
        this.ensureTranscriptionSettings();
        
        if (!this.plugin.settings.transcription!.deepgram!.features) {
            this.plugin.settings.transcription!.deepgram!.features = {};
        }
        
        const features = this.plugin.settings.transcription!.deepgram!.features as DeepgramFeatures;
        features[key] = value;
        await this.plugin.saveSettings();
    }

    /**
     * 트랜스크립션 설정 초기화
     */
    private ensureTranscriptionSettings(): void {
        if (!this.plugin.settings.transcription) {
            this.plugin.settings.transcription = {};
        }
        if (!this.plugin.settings.transcription.deepgram) {
            this.plugin.settings.transcription.deepgram = { enabled: true };
        }
    }

    /**
     * 기능 토글 가용성 업데이트
     */
    private updateFeatureAvailabilityForToggle(
        toggle: ToggleComponent, 
        setting: Setting, 
        feature: DeepgramFeature, 
        key: string
    ): void {
        if (this.selectedModel && this.registry && 
            !this.registry.isFeatureSupported(this.selectedModel.id, key)) {
            toggle.setDisabled(true);
            setting.setDesc(`${feature.description} (Not supported by selected model)`);
        }
    }

    /**
     * 고급 설정 섹션
     */
    private renderAdvancedSettings(): void {
        const container = this.uiBuilder.createSection(
            UI_CONSTANTS.CLASSES.ADVANCED_CONTAINER,
            UI_CONSTANTS.MESSAGES.ADVANCED_HEADER
        );

        this.renderLanguagePreference(container);
        this.renderTimeoutSetting(container);
        this.renderRetrySetting(container);
        this.renderChunkingSettings(container);
    }

    /**
     * 언어 설정
     */
    private renderLanguagePreference(container: HTMLElement): void {
        new Setting(container)
            .setName('Preferred Language')
            .setDesc('Set preferred language for better accuracy')
            .addDropdown(dropdown => {
                LANGUAGE_OPTIONS.forEach(option => {
                    dropdown.addOption(option.value, option.label);
                });
                
                dropdown.setValue(this.plugin.settings.language || 'auto');
                dropdown.onChange(async (value: string) => {
                    this.plugin.settings.language = value;
                    await this.plugin.saveSettings();
                });
            });
    }

    /**
     * 타임아웃 설정
     */
    private renderTimeoutSetting(container: HTMLElement): void {
        new Setting(container)
            .setName('Request Timeout')
            .setDesc('Maximum time to wait for transcription (in seconds)')
            .addText(text => {
                const currentTimeout = this.plugin.settings.requestTimeout || CONFIG_CONSTANTS.TIMEOUT.DEFAULT;
                
                text
                    .setPlaceholder('30')
                    .setValue(String(currentTimeout / 1000))
                    .onChange(async (value: string) => {
                        const timeout = this.validator.validateTimeout(value);
                        if (timeout !== null) {
                            this.plugin.settings.requestTimeout = timeout;
                            await this.plugin.saveSettings();
                        }
                    });
            });
    }

    /**
     * 재시도 설정
     */
    private renderRetrySetting(container: HTMLElement): void {
        new Setting(container)
            .setName('Max Retries')
            .setDesc('Number of retry attempts on failure')
            .addDropdown(dropdown => {
                for (let i = 0; i <= CONFIG_CONSTANTS.RETRIES.MAX; i++) {
                    const label = i === 0 ? 'No retries' : `${i} ${i === 1 ? 'retry' : 'retries'}`;
                    dropdown.addOption(String(i), label);
                }
                
                const currentRetries = this.plugin.settings.maxRetries || CONFIG_CONSTANTS.RETRIES.DEFAULT;
                dropdown.setValue(String(currentRetries));
                
                dropdown.onChange(async (value: string) => {
                    this.plugin.settings.maxRetries = parseInt(value);
                    await this.plugin.saveSettings();
                });
            });
    }

    /**
     * Chunking settings for large files
     */
    private renderChunkingSettings(container: HTMLElement): void {
        // Auto-chunking toggle
        new Setting(container)
            .setName('Automatic File Chunking')
            .setDesc('Automatically split large audio files (>50MB) into smaller chunks for reliable processing')
            .addToggle(toggle => {
                toggle
                    .setValue(this.plugin.settings.autoChunking ?? true)
                    .onChange(async (value: boolean) => {
                        this.plugin.settings.autoChunking = value;
                        await this.plugin.saveSettings();
                        
                        // Show/hide chunk size setting based on toggle
                        const chunkSizeSetting = container.querySelector('.chunk-size-setting') as HTMLElement;
                        if (chunkSizeSetting) {
                            chunkSizeSetting.classList.toggle('sn-hidden', !value);
                        }
                    });
            });

        // Maximum chunk size
        const chunkSizeSetting = new Setting(container)
            .setName('Maximum Chunk Size')
            .setDesc('Maximum size per chunk in MB (recommended: 50MB)')
            .addSlider(slider => {
                slider
                    .setLimits(10, 100, 10)
                    .setValue(this.plugin.settings.maxChunkSizeMB ?? 50)
                    .setDynamicTooltip()
                    .onChange(async (value: number) => {
                        this.plugin.settings.maxChunkSizeMB = value;
                        await this.plugin.saveSettings();
                    });
            });
        
        // Add class for conditional display
        chunkSizeSetting.settingEl.addClass('chunk-size-setting');
        
        // Initially hide if auto-chunking is disabled
        if (!this.plugin.settings.autoChunking) {
            chunkSizeSetting.settingEl.addClass('sn-hidden');
        }
        
        // Add informational note about chunking
        const noteEl = container.createDiv();
        noteEl.addClass('setting-item-description');
        noteEl.addClass('deepgram-note');
        noteEl.createEl('strong', { text: 'Note on Large Files:' });

        const primaryList = noteEl.createEl('ul');
        ['Files larger than 50MB may experience timeout errors',
            'Auto-chunking splits files into manageable pieces',
            'Each chunk is processed separately and results are merged'
        ].forEach(item => {
            primaryList.createEl('li', { text: item });
        });

        noteEl.createEl('p', {
            text: 'For best results with very large files (>100MB), consider:'
        });
        const secondaryList = noteEl.createEl('ul');
        [
            "Using the 'enhanced' model for faster processing",
            'Reducing audio bitrate to 64-128 kbps',
            'Converting to efficient formats (MP3, OGG)'
        ].forEach(item => {
            secondaryList.createEl('li', { text: item });
        });
    }

    /**
     * 비용 추정 섹션
     */
    private renderCostEstimation(): void {
        const costContainer = this.uiBuilder.createCostEstimationContainer();
        this.estimatedCostEl = costContainer.createEl('div', { cls: UI_CONSTANTS.CLASSES.COST_DETAILS });
        this.updateCostEstimation();
    }

    /**
     * 비용 추정 업데이트
     */
    private updateCostEstimation(): void {
        if (!this.estimatedCostEl) return;
        
        const estimation = this.costCalculator.calculateEstimation(
            this.selectedModel, 
            this.plugin.settings.monthlyBudget
        );
        
        if (!estimation) {
            this.uiBuilder.updateCostDetails(this.estimatedCostEl.parentElement!, null);
            return;
        }
        
        this.uiBuilder.updateCostDetails(
            this.estimatedCostEl.parentElement!, 
            this.selectedModel, 
            estimation.monthly
        );
        
        if (estimation.exceeedsBudget && this.plugin.settings.monthlyBudget) {
            this.uiBuilder.addBudgetWarning(
                this.estimatedCostEl.parentElement!, 
                estimation.monthly, 
                this.plugin.settings.monthlyBudget
            );
        }
    }

    /**
     * API 키 검증 버튼
     */
    private renderValidationButton(): void {
        new Setting(this.containerEl)
            .setName(UI_CONSTANTS.MESSAGES.VALIDATION_LABEL)
            .setDesc(UI_CONSTANTS.MESSAGES.VALIDATION_DESC)
            .addButton(button => {
                this.setupValidationButton(button);
            });
    }

    /**
     * 검증 버튼 설정
     */
    private setupValidationButton(button: ButtonComponent): void {
        button
            .setButtonText(UI_CONSTANTS.MESSAGES.VALIDATION_BUTTON)
            .setCta()
            .onClick(async () => {
                await this.handleValidation(button);
            });
    }

    /**
     * 검증 처리
     */
    private async handleValidation(button: ButtonComponent): Promise<void> {
        button.setDisabled(true);
        button.setButtonText(UI_CONSTANTS.MESSAGES.VALIDATING);
        
        try {
            const isValid = await this.validator.validateApiKey(
                this.plugin.settings.deepgramApiKey || ''
            );
            
            if (isValid) {
                this.handleValidationSuccess(button);
            } else {
                throw new Error('Invalid API key');
            }
        } catch (error) {
            this.handleValidationError(button, error);
        }
    }

    /**
     * 검증 성공 처리
     */
    private handleValidationSuccess(button: ButtonComponent): void {
        new Notice(UI_CONSTANTS.MESSAGES.VALIDATION_SUCCESS);
        button.setButtonText('Valid ✓');
        button.removeCta();
        
        setTimeout(() => {
            button.setButtonText(UI_CONSTANTS.MESSAGES.VALIDATION_BUTTON);
            button.setCta();
            button.setDisabled(false);
        }, CONFIG_CONSTANTS.VALIDATION_RESET_DELAY);
    }

    /**
     * 검증 실패 처리
     */
    private handleValidationError(button: ButtonComponent, error: unknown): void {
        this.logger.error('Validation error', error);
        new Notice(UI_CONSTANTS.MESSAGES.VALIDATION_ERROR);
        button.setButtonText(UI_CONSTANTS.MESSAGES.VALIDATION_BUTTON);
        button.setWarning();
        button.setDisabled(false);
    }


    /**
     * UI 상태 업데이트
     */
    private updateUIState(): void {
        const hasApiKey = !!this.plugin.settings.deepgramApiKey;
        
        // 모델 선택 드롭다운 활성화/비활성화
        const modelDropdown = this.containerEl.querySelector('select') as HTMLSelectElement;
        if (modelDropdown) {
            modelDropdown.disabled = !hasApiKey;
        }
        
        // 기능 토글 활성화/비활성화
        const toggles = this.containerEl.querySelectorAll('.checkbox-container input');
        toggles.forEach((toggle: Element) => {
            (toggle as HTMLInputElement).disabled = !hasApiKey || !this.selectedModel;
        });
    }

    /**
     * 기본 기능 렌더링 (Registry 없을 때 폴백)
     */
    private renderDefaultFeatures(container: HTMLElement): void {
        DEFAULT_FEATURES.forEach(feature => {
            new Setting(container)
                .setName(feature.name)
                .setDesc(feature.description)
                .addToggle(toggle => {
                    const currentValue = this.getFeatureValue(feature.key, feature.default);
                    
                    toggle
                        .setValue(currentValue)
                        .onChange(async (value: boolean) => {
                            await this.saveFeatureSetting(feature.key, value);
                        });
                });
        });
    }

    /**
     * 기능 가용성 업데이트
     */
    private updateFeatureAvailability(): void {
        if (!this.selectedModel || !this.registry) return;
        
        const features = this.registry.getAllFeatures();
        features.forEach((feature, key) => {
            this.updateFeatureToggleState(key);
        });
    }

    /**
     * 개별 기능 토글 상태 업데이트
     */
    private updateFeatureToggleState(featureKey: string): void {
        const toggle = this.containerEl.querySelector(
            `[data-feature="${featureKey}"]`
        ) as HTMLInputElement;
        
        if (!toggle || !this.selectedModel || !this.registry) return;
        
        const isSupported = this.registry.isFeatureSupported(
            this.selectedModel.id, 
            featureKey
        );
        
        toggle.disabled = !isSupported;
        
        if (!isSupported && toggle.checked) {
            toggle.checked = false;
            toggle.dispatchEvent(new Event('change'));
        }
    }

    /**
     * 기본 모델 옵션 추가 (Registry 실패 시 폴백)
     */
    private addDefaultModelOptions(dropdown: DropdownComponent): void {
        DEFAULT_MODELS.forEach(model => {
            const optionText = `${model.name} (${model.tier}) - $${model.price}/min`;
            dropdown.addOption(model.id, optionText);
        });
        
        this.logger.info('Added default model options');
    }

    /**
     * 폴백 UI 렌더링 (심각한 오류 발생 시)
     */
    private renderFallbackUI(error: unknown): void {
        this.logger.info('Rendering fallback UI due to error');
        
        try {
            this.uiBuilder.clearContainer();
            this.uiBuilder.createErrorContainer(error);
            this.renderMinimalSettings();
            
            this.logger.info('Fallback UI rendered successfully');
        } catch (fallbackError) {
            this.logger.error('Failed to render fallback UI', fallbackError);
            this.renderCriticalError();
        }
    }

    /**
     * 최소한의 설정 UI
     */
    private renderMinimalSettings(): void {
        // API 키 설정
        new Setting(this.containerEl)
            .setName(UI_CONSTANTS.MESSAGES.API_KEY_LABEL)
            .setDesc(UI_CONSTANTS.MESSAGES.API_KEY_DESC)
            .addText(text => {
                text
                    .setPlaceholder(UI_CONSTANTS.MESSAGES.API_KEY_PLACEHOLDER)
                    .setValue(this.plugin.settings.deepgramApiKey || '')
                    .onChange(async (value: string) => {
                        this.plugin.settings.deepgramApiKey = value;
                        await this.plugin.saveSettings();
                        new Notice(UI_CONSTANTS.MESSAGES.API_KEY_SAVED);
                    });
                text.inputEl.type = 'password';
            });
        
        // 모델 선택
        new Setting(this.containerEl)
            .setName(UI_CONSTANTS.MESSAGES.MODEL_LABEL)
            .setDesc(UI_CONSTANTS.MESSAGES.MODEL_DESC)
            .addDropdown(dropdown => {
                dropdown.addOption('', UI_CONSTANTS.MESSAGES.MODEL_PLACEHOLDER);
                this.addDefaultModelOptions(dropdown);
                
                const currentModel = this.plugin.settings.transcription?.deepgram?.model || '';
                dropdown.setValue(currentModel);
                
                dropdown.onChange(async (value: string) => {
                    await this.saveModelSelection(value);
                });
            });
    }

    /**
     * 치명적 오류 표시
     */
    private renderCriticalError(): void {
        this.uiBuilder.clearContainer();
        this.containerEl.createEl('p', {
            text: UI_CONSTANTS.MESSAGES.CRITICAL_ERROR,
            cls: UI_CONSTANTS.CLASSES.WARNING
        });
    }
}
