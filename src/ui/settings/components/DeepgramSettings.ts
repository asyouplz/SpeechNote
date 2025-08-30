import { Setting, Notice } from 'obsidian';
import type SpeechToTextPlugin from '../../../main';
import { DeepgramModelRegistry, DeepgramModel, DeepgramFeature } from '../../../config/DeepgramModelRegistry';

/**
 * Deepgram 설정 UI 컴포넌트
 * - API 키 관리
 * - 모델 선택
 * - 기능 토글
 * - 비용 추정
 */
export class DeepgramSettings {
    private plugin: SpeechToTextPlugin;
    private registry: DeepgramModelRegistry;
    private containerEl: HTMLElement;
    private selectedModel: DeepgramModel | null = null;
    private estimatedCostEl: HTMLElement | null = null;

    constructor(plugin: SpeechToTextPlugin, containerEl: HTMLElement) {
        this.plugin = plugin;
        this.containerEl = containerEl;
        this.registry = DeepgramModelRegistry.getInstance();
    }

    /**
     * Deepgram 설정 UI 렌더링
     */
    public render(): void {
        // 섹션 헤더
        this.containerEl.createEl('h4', { text: 'Deepgram Configuration' });
        
        // 설명
        const descEl = this.containerEl.createEl('p', { 
            text: 'Configure Deepgram for advanced speech recognition with multiple language support and AI features.',
            cls: 'setting-item-description'
        });
        descEl.style.marginBottom = '20px';

        // API 키 설정
        this.renderApiKeySection();
        
        // 모델 선택
        this.renderModelSelection();
        
        // 기능 토글
        this.renderFeatureToggles();
        
        // 고급 설정
        this.renderAdvancedSettings();
        
        // 비용 추정
        this.renderCostEstimation();
        
        // API 키 검증 버튼
        this.renderValidationButton();
    }

    /**
     * API 키 입력 섹션
     */
    private renderApiKeySection(): void {
        new Setting(this.containerEl)
            .setName('Deepgram API Key')
            .setDesc('Enter your Deepgram API key for transcription')
            .addText(text => {
                text
                    .setPlaceholder('Enter API key...')
                    .setValue(this.maskApiKey(this.plugin.settings.deepgramApiKey || ''))
                    .onChange(async (value) => {
                        if (value && !value.includes('*')) {
                            this.plugin.settings.deepgramApiKey = value;
                            await this.plugin.saveSettings();
                            
                            // Re-display masked version
                            text.setValue(this.maskApiKey(value));
                            new Notice('Deepgram API key saved');
                            
                            // Enable model selection if API key is provided
                            this.updateUIState();
                        }
                    });
                
                // Security: password input type
                text.inputEl.type = 'password';
                text.inputEl.addClass('deepgram-api-key-input');
                
                // Show actual value on focus
                text.inputEl.addEventListener('focus', () => {
                    if (this.plugin.settings.deepgramApiKey) {
                        text.setValue(this.plugin.settings.deepgramApiKey);
                    }
                });
                
                // Mask on blur
                text.inputEl.addEventListener('blur', () => {
                    if (this.plugin.settings.deepgramApiKey) {
                        text.setValue(this.maskApiKey(this.plugin.settings.deepgramApiKey));
                    }
                });
            });
    }

    /**
     * 모델 선택 섹션
     */
    private renderModelSelection(): void {
        const setting = new Setting(this.containerEl)
            .setName('Deepgram Model')
            .setDesc('Select the Deepgram model for transcription');

        const dropdown = setting.addDropdown(dropdown => {
            // 기본 옵션
            dropdown.addOption('', 'Select a model...');
            
            // 모델 옵션 추가
            const models = this.registry.getAllModels();
            models.forEach(model => {
                const optionText = `${model.name} (${model.tier}) - $${model.pricing.perMinute}/min`;
                dropdown.addOption(model.id, optionText);
            });
            
            // 현재 설정값 반영
            const currentModel = this.plugin.settings.transcription?.deepgram?.model || '';
            dropdown.setValue(currentModel);
            
            // 변경 핸들러
            dropdown.onChange(async (value) => {
                if (!value) {
                    this.selectedModel = null;
                    return;
                }
                
                this.selectedModel = this.registry.getModel(value) || null;
                
                // 설정 저장
                if (!this.plugin.settings.transcription) {
                    this.plugin.settings.transcription = {};
                }
                if (!this.plugin.settings.transcription.deepgram) {
                    this.plugin.settings.transcription.deepgram = {
                        enabled: true,
                        model: value
                    };
                } else {
                    this.plugin.settings.transcription.deepgram.model = value;
                }
                
                await this.plugin.saveSettings();
                
                // UI 업데이트
                this.updateModelInfo();
                this.updateFeatureAvailability();
                this.updateCostEstimation();
                
                new Notice(`Selected model: ${this.selectedModel?.name}`);
            });
            
            return dropdown;
        });

        // API 키가 없으면 비활성화
        if (!this.plugin.settings.deepgramApiKey) {
            // dropdown element를 직접 찾아서 비활성화
            const selectElement = setting.settingEl.querySelector('select');
            if (selectElement) {
                selectElement.disabled = true;
            }
            setting.setDesc('Please enter your Deepgram API key first');
        }
    }

    /**
     * 모델 정보 표시
     */
    private updateModelInfo(): void {
        // 기존 정보 제거
        const existingInfo = this.containerEl.querySelector('.deepgram-model-info');
        if (existingInfo) {
            existingInfo.remove();
        }

        if (!this.selectedModel) return;

        // 모델 정보 컨테이너
        const infoContainer = this.containerEl.createEl('div', { cls: 'deepgram-model-info' });
        infoContainer.style.cssText = `
            background: var(--background-secondary);
            padding: 12px;
            border-radius: 6px;
            margin: 10px 0;
            font-size: 0.9em;
        `;

        // 모델 설명
        infoContainer.createEl('p', { 
            text: this.selectedModel.description,
            cls: 'model-description'
        });

        // 성능 지표
        const metricsEl = infoContainer.createEl('div', { cls: 'model-metrics' });
        metricsEl.style.cssText = 'display: flex; gap: 20px; margin-top: 8px;';
        
        metricsEl.createEl('span', { 
            text: `Accuracy: ${this.selectedModel.performance.accuracy}%`
        });
        metricsEl.createEl('span', { 
            text: `Speed: ${this.selectedModel.performance.speed}`
        });
        metricsEl.createEl('span', { 
            text: `Latency: ${this.selectedModel.performance.latency}`
        });

        // 지원 언어
        const langEl = infoContainer.createEl('div', { cls: 'supported-languages' });
        langEl.style.cssText = 'margin-top: 8px;';
        langEl.createEl('span', { 
            text: `Supported languages: ${this.selectedModel.languages.join(', ')}`
        });
    }

    /**
     * 기능 토글 섹션
     */
    private renderFeatureToggles(): void {
        const featuresContainer = this.containerEl.createEl('div', { cls: 'deepgram-features' });
        featuresContainer.createEl('h5', { text: 'Features' });

        const features = this.registry.getAllFeatures();
        
        features.forEach((feature, key) => {
            const setting = new Setting(featuresContainer)
                .setName(feature.name)
                .setDesc(feature.description);

            // Premium 기능 표시
            if (feature.requiresPremium) {
                setting.setDesc(`${feature.description} (Premium feature)`);
            }

            setting.addToggle(toggle => {
                // 현재 설정값 반영
                const currentValue = this.plugin.settings.transcription?.deepgram?.features?.[key as keyof typeof this.plugin.settings.transcription.deepgram.features] || feature.default;
                
                toggle
                    .setValue(currentValue)
                    .onChange(async (value) => {
                        // 설정 구조 초기화
                        if (!this.plugin.settings.transcription) {
                            this.plugin.settings.transcription = {};
                        }
                        if (!this.plugin.settings.transcription.deepgram) {
                            this.plugin.settings.transcription.deepgram = { enabled: true };
                        }
                        if (!this.plugin.settings.transcription.deepgram.features) {
                            this.plugin.settings.transcription.deepgram.features = {};
                        }
                        
                        // 기능 설정 저장
                        (this.plugin.settings.transcription.deepgram.features as any)[key] = value;
                        await this.plugin.saveSettings();
                        
                        // 비용 업데이트 (일부 기능은 추가 비용 발생 가능)
                        this.updateCostEstimation();
                    });
                
                // 모델이 해당 기능을 지원하지 않으면 비활성화
                if (this.selectedModel && !this.registry.isFeatureSupported(this.selectedModel.id, key)) {
                    toggle.setDisabled(true);
                    setting.setDesc(`${feature.description} (Not supported by selected model)`);
                }
                
                return toggle;
            });
        });
    }

    /**
     * 고급 설정 섹션
     */
    private renderAdvancedSettings(): void {
        const advancedContainer = this.containerEl.createEl('div', { cls: 'deepgram-advanced' });
        advancedContainer.createEl('h5', { text: 'Advanced Settings' });

        // 언어 우선 설정
        new Setting(advancedContainer)
            .setName('Preferred Language')
            .setDesc('Set preferred language for better accuracy')
            .addDropdown(dropdown => {
                dropdown
                    .addOption('auto', 'Auto-detect')
                    .addOption('en', 'English')
                    .addOption('es', 'Spanish')
                    .addOption('fr', 'French')
                    .addOption('de', 'German')
                    .addOption('pt', 'Portuguese')
                    .addOption('nl', 'Dutch')
                    .addOption('it', 'Italian')
                    .addOption('pl', 'Polish')
                    .addOption('ru', 'Russian')
                    .addOption('zh', 'Chinese')
                    .addOption('ja', 'Japanese')
                    .addOption('ko', 'Korean')
                    .addOption('ar', 'Arabic')
                    .addOption('hi', 'Hindi')
                    .setValue(this.plugin.settings.language || 'auto')
                    .onChange(async (value) => {
                        this.plugin.settings.language = value;
                        await this.plugin.saveSettings();
                    });
            });

        // 타임아웃 설정
        new Setting(advancedContainer)
            .setName('Request Timeout')
            .setDesc('Maximum time to wait for transcription (in seconds)')
            .addText(text => {
                text
                    .setPlaceholder('30')
                    .setValue(String((this.plugin.settings.requestTimeout || 30000) / 1000))
                    .onChange(async (value) => {
                        const timeout = parseInt(value) * 1000;
                        if (!isNaN(timeout) && timeout >= 5000 && timeout <= 120000) {
                            this.plugin.settings.requestTimeout = timeout;
                            await this.plugin.saveSettings();
                        }
                    });
            });

        // 재시도 설정
        new Setting(advancedContainer)
            .setName('Max Retries')
            .setDesc('Number of retry attempts on failure')
            .addDropdown(dropdown => {
                dropdown
                    .addOption('0', 'No retries')
                    .addOption('1', '1 retry')
                    .addOption('2', '2 retries')
                    .addOption('3', '3 retries')
                    .setValue(String(this.plugin.settings.maxRetries || 3))
                    .onChange(async (value) => {
                        this.plugin.settings.maxRetries = parseInt(value);
                        await this.plugin.saveSettings();
                    });
            });
    }

    /**
     * 비용 추정 섹션
     */
    private renderCostEstimation(): void {
        const costContainer = this.containerEl.createEl('div', { cls: 'deepgram-cost-estimation' });
        costContainer.style.cssText = `
            background: var(--background-modifier-border);
            padding: 12px;
            border-radius: 6px;
            margin-top: 20px;
        `;
        
        costContainer.createEl('h5', { text: 'Cost Estimation' });
        
        this.estimatedCostEl = costContainer.createEl('div', { cls: 'cost-details' });
        this.updateCostEstimation();
    }

    /**
     * 비용 추정 업데이트
     */
    private updateCostEstimation(): void {
        if (!this.estimatedCostEl) return;
        
        this.estimatedCostEl.empty();
        
        if (!this.selectedModel) {
            this.estimatedCostEl.createEl('p', { 
                text: 'Select a model to see cost estimation',
                cls: 'mod-warning'
            });
            return;
        }

        const costInfo = this.estimatedCostEl.createEl('div');
        
        // 분당 비용
        costInfo.createEl('p', { 
            text: `Cost per minute: $${this.selectedModel.pricing.perMinute}`
        });
        
        // 예상 월 비용 (하루 10분 사용 가정)
        const dailyMinutes = 10;
        const monthlyMinutes = dailyMinutes * 30;
        const monthlyCost = this.registry.calculateCost(this.selectedModel.id, monthlyMinutes);
        
        costInfo.createEl('p', { 
            text: `Estimated monthly cost (${dailyMinutes} min/day): $${monthlyCost.toFixed(2)}`
        });
        
        // 예산 경고
        if (this.plugin.settings.monthlyBudget && monthlyCost > this.plugin.settings.monthlyBudget) {
            costInfo.createEl('p', { 
                text: `⚠️ Exceeds monthly budget of $${this.plugin.settings.monthlyBudget}`,
                cls: 'mod-warning'
            });
        }
    }

    /**
     * API 키 검증 버튼
     */
    private renderValidationButton(): void {
        new Setting(this.containerEl)
            .setName('Validate Configuration')
            .setDesc('Test your Deepgram API key and settings')
            .addButton(button => {
                button
                    .setButtonText('Validate')
                    .setCta()
                    .onClick(async () => {
                        button.setDisabled(true);
                        button.setButtonText('Validating...');
                        
                        try {
                            const isValid = await this.validateApiKey();
                            
                            if (isValid) {
                                new Notice('✅ Deepgram configuration is valid');
                                button.setButtonText('Valid ✓');
                                button.removeCta();
                                
                                // 3초 후 원래 상태로 복구
                                setTimeout(() => {
                                    button.setButtonText('Validate');
                                    button.setCta();
                                    button.setDisabled(false);
                                }, 3000);
                            } else {
                                throw new Error('Invalid API key');
                            }
                        } catch (error) {
                            console.error('Validation error:', error);
                            new Notice('❌ Invalid Deepgram API key or configuration');
                            button.setButtonText('Validate');
                            button.setWarning();
                            button.setDisabled(false);
                        }
                    });
            });
    }

    /**
     * API 키 검증
     */
    private async validateApiKey(): Promise<boolean> {
        if (!this.plugin.settings.deepgramApiKey) {
            return false;
        }

        try {
            // Deepgram API 검증 엔드포인트 호출
            const response = await fetch('https://api.deepgram.com/v1/projects', {
                method: 'GET',
                headers: {
                    'Authorization': `Token ${this.plugin.settings.deepgramApiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.ok;
        } catch (error) {
            console.error('API validation error:', error);
            return false;
        }
    }

    /**
     * API 키 마스킹
     */
    private maskApiKey(key: string): string {
        if (!key || key.length < 10) {
            return '';
        }
        
        const visibleStart = 8;
        const visibleEnd = 4;
        
        if (key.length <= visibleStart + visibleEnd) {
            return key;
        }
        
        const masked = '*'.repeat(key.length - visibleStart - visibleEnd);
        return key.substring(0, visibleStart) + masked + key.substring(key.length - visibleEnd);
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
     * 기능 가용성 업데이트
     */
    private updateFeatureAvailability(): void {
        if (!this.selectedModel) return;
        
        const features = this.registry.getAllFeatures();
        features.forEach((feature, key) => {
            const toggle = this.containerEl.querySelector(`[data-feature="${key}"]`) as HTMLInputElement;
            if (toggle) {
                const isSupported = this.registry.isFeatureSupported(this.selectedModel!.id, key);
                toggle.disabled = !isSupported;
                
                // 지원하지 않는 기능은 끄기
                if (!isSupported && toggle.checked) {
                    toggle.checked = false;
                    toggle.dispatchEvent(new Event('change'));
                }
            }
        });
    }
}