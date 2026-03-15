import { Setting, Notice } from 'obsidian';
import type SpeechToTextPlugin from '../../../main';
import {
    TranscriptionProvider,
    SelectionStrategy,
} from '../../../infrastructure/api/providers/ITranscriber';

/**
 * Provider 설정 컴포넌트
 * Multi-provider 지원을 위한 UI 컴포넌트
 *
 * 설계 원칙:
 * 1. Progressive Disclosure - 기본/고급 설정 분리
 * 2. Real-time Validation - 즉각적인 피드백
 * 3. Accessibility - 키보드 네비게이션 지원
 */
export class ProviderSettings {
    private currentProvider: TranscriptionProvider | 'auto' = 'auto';
    private apiKeys: Map<TranscriptionProvider, string> = new Map();
    private isAdvancedMode = false;
    private metricsEnabled = false;

    constructor(private plugin: SpeechToTextPlugin) {
        this.loadCurrentSettings();
    }

    /**
     * 컴포넌트 렌더링
     */
    render(containerEl: HTMLElement): void {
        // 섹션 헤더
        this.renderHeader(containerEl);

        // Provider 선택
        this.renderProviderSelector(containerEl);

        // API 키 입력
        this.renderApiKeyInputs(containerEl);

        // 고급 설정 토글
        this.renderAdvancedToggle(containerEl);

        // 고급 설정 (조건부 렌더링)
        if (this.isAdvancedMode) {
            this.renderAdvancedSettings(containerEl);
        }

        // 메트릭 표시 (조건부 렌더링)
        if (this.metricsEnabled) {
            this.renderMetrics(containerEl);
        }
    }

    /**
     * 섹션 헤더 렌더링
     */
    private renderHeader(containerEl: HTMLElement): void {
        const headerEl = containerEl.createDiv({ cls: 'sn-provider-settings-header' });

        headerEl.createEl('h3', {
            text: 'Transcription provider',
            cls: 'setting-item-name',
        });

        headerEl.createEl('div', {
            text: 'Choose your preferred speech-to-text provider or let the system auto-select based on performance.',
            cls: 'setting-item-description',
        });

        // 현재 상태 표시
        this.renderConnectionStatus(headerEl);
    }

    /**
     * Provider 선택 UI
     */
    private renderProviderSelector(containerEl: HTMLElement): void {
        new Setting(containerEl)
            .setName('Provider selection')
            .setDesc('Choose a specific provider or use automatic selection')
            .addDropdown((dropdown) => {
                dropdown
                    .addOption('auto', 'Automatic (recommended)')
                    .addOption('whisper', 'OpenAI Whisper')
                    .addOption('deepgram', 'Deepgram')
                    .setValue(this.currentProvider)
                    .onChange(async (value) => {
                        if (this.isProviderValue(value)) {
                            this.currentProvider = value;
                            await this.saveProviderSelection(value);

                            // UI 업데이트
                            this.updateApiKeyVisibility(containerEl);

                            // 사용자 피드백
                            this.showProviderInfo(value);
                        }
                    });
            });
    }

    /**
     * API 키 입력 필드들
     */
    private renderApiKeyInputs(containerEl: HTMLElement): void {
        const apiKeysContainer = containerEl.createDiv({
            cls: 'sn-api-keys-container',
        });

        // Whisper API Key
        this.renderSingleApiKey(
            apiKeysContainer,
            'whisper',
            'API key for OpenAI',
            'Enter your API key for OpenAI (starts with sk-)',
            'sk-...'
        );

        // Deepgram API Key
        this.renderSingleApiKey(
            apiKeysContainer,
            'deepgram',
            'Deepgram API key',
            'Enter your deepgram API key',
            'your-deepgram-api-key'
        );
    }

    /**
     * 단일 API 키 입력 필드
     */
    private renderSingleApiKey(
        containerEl: HTMLElement,
        provider: TranscriptionProvider,
        title: string,
        desc: string,
        placeholder: string
    ): void {
        const settingEl = new Setting(containerEl)
            .setName(title)
            .setDesc(desc)
            .setClass(`api-key-${provider}`);

        // 입력 필드
        const inputEl = settingEl.controlEl.createEl('input', {
            type: 'password',
            placeholder: placeholder,
            cls: 'sn-api-key-input',
        });

        // 현재 값 설정
        const currentKey = this.apiKeys.get(provider);
        if (currentKey) {
            inputEl.value = this.maskApiKey(currentKey);
            inputEl.setAttribute('data-has-value', 'true');
        }

        // 토글 버튼 (보기/숨기기)
        this.addVisibilityToggle(settingEl.controlEl, inputEl, provider);

        // 검증 버튼
        this.addValidationButton(settingEl.controlEl, inputEl, provider);

        // 입력 이벤트 핸들러
        this.addInputHandler(inputEl, provider);

        // 조건부 표시
        this.updateSingleKeyVisibility(settingEl, provider);
    }

    /**
     * 고급 설정 토글
     */
    private renderAdvancedToggle(containerEl: HTMLElement): void {
        new Setting(containerEl)
            .setName('Advanced settings')
            .setDesc('Show advanced configuration options')
            .addToggle((toggle) => {
                toggle.setValue(this.isAdvancedMode).onChange((value) => {
                    this.isAdvancedMode = value;

                    // 전체 UI 재렌더링
                    containerEl.empty();
                    this.render(containerEl);
                });
            });
    }

    /**
     * 고급 설정 섹션
     */
    private renderAdvancedSettings(containerEl: HTMLElement): void {
        const advancedEl = containerEl.createDiv({
            cls: 'sn-advanced-settings-container',
        });

        // Selection Strategy
        this.renderSelectionStrategy(advancedEl);

        // Cost Optimization
        this.renderCostSettings(advancedEl);

        // Quality Settings
        this.renderQualitySettings(advancedEl);

        // A/B Testing
        this.renderABTestSettings(advancedEl);

        // Metrics Toggle
        this.renderMetricsToggle(advancedEl);
    }

    /**
     * Selection Strategy 설정
     */
    private renderSelectionStrategy(containerEl: HTMLElement): void {
        new Setting(containerEl)
            .setName('Selection strategy')
            .setDesc('How should the system choose between providers?')
            .addDropdown((dropdown) => {
                dropdown
                    .addOption(SelectionStrategy.COST_OPTIMIZED, 'Cost-optimized')
                    .addOption(SelectionStrategy.PERFORMANCE_OPTIMIZED, 'Performance-optimized')
                    .addOption(SelectionStrategy.QUALITY_OPTIMIZED, 'Quality-optimized')
                    .addOption(SelectionStrategy.ROUND_ROBIN, 'Round-robin')
                    .addOption(SelectionStrategy.AB_TEST, 'A/B tests')
                    .setValue(
                        this.plugin.settings.selectionStrategy ||
                            SelectionStrategy.PERFORMANCE_OPTIMIZED
                    )
                    .onChange(async (value) => {
                        if (this.isSelectionStrategy(value)) {
                            await this.saveStrategy(value);
                            this.showStrategyInfo(value);
                        }
                    });
            });
    }

    /**
     * 비용 설정
     */
    private renderCostSettings(containerEl: HTMLElement): void {
        new Setting(containerEl)
            .setName('Monthly cost limit')
            .setDesc('Set a maximum monthly spending limit (usd)')
            .addText((text) => {
                text.setPlaceholder('50.00')
                    .setValue(this.plugin.settings.costLimit?.toString() || '')
                    .onChange(async (value) => {
                        const limit = parseFloat(value);
                        if (!isNaN(limit) && limit > 0) {
                            await this.saveCostLimit(limit);
                            new Notice(`Cost limit set to $${limit.toFixed(2)}`);
                        }
                    });
            });
    }

    /**
     * 품질 설정
     */
    private renderQualitySettings(containerEl: HTMLElement): void {
        new Setting(containerEl)
            .setName('Minimum quality threshold')
            .setDesc('Minimum acceptable transcription accuracy (0-100%)')
            .addSlider((slider) => {
                slider
                    .setLimits(0, 100, 5)
                    .setValue(this.plugin.settings.qualityThreshold || 85)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        await this.saveQualityThreshold(value);
                    });
            });
    }

    /**
     * A/B Testing 설정
     */
    private renderABTestSettings(containerEl: HTMLElement): void {
        const abTestEl = containerEl.createDiv({ cls: 'sn-ab-test-settings' });

        new Setting(abTestEl)
            .setName('Enable A/B tests')
            .setDesc('Compare providers to find the best one for your use case')
            .addToggle((toggle) => {
                toggle
                    .setValue(this.plugin.settings.abTestEnabled || false)
                    .onChange(async (value) => {
                        await this.saveABTestEnabled(value);
                        if (value) {
                            this.renderABTestDetails(abTestEl);
                        }
                    });
            });

        if (this.plugin.settings.abTestEnabled) {
            this.renderABTestDetails(abTestEl);
        }
    }

    /**
     * A/B Test 세부 설정
     */
    private renderABTestDetails(containerEl: HTMLElement): void {
        new Setting(containerEl)
            .setName('Traffic split')
            .setDesc('Percentage of requests to send to whisper vs deepgram')
            .addSlider((slider) => {
                const currentSplit = this.plugin.settings.abTestSplit || 50;

                slider
                    .setLimits(0, 100, 5)
                    .setValue(currentSplit)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        await this.saveABTestSplit(value);
                    });

                // 분할 비율 표시
                const displayEl = containerEl.createDiv({ cls: 'sn-split-display' });
                displayEl.createEl('span', { text: `Whisper: ${currentSplit}%` });
                displayEl.createEl('span', { text: `Deepgram: ${100 - currentSplit}%` });
            });
    }

    /**
     * 메트릭 토글
     */
    private renderMetricsToggle(containerEl: HTMLElement): void {
        new Setting(containerEl)
            .setName('Show performance metrics')
            .setDesc('Display real-time performance statistics')
            .addToggle((toggle) => {
                toggle.setValue(this.metricsEnabled).onChange((value) => {
                    this.metricsEnabled = value;

                    // UI 업데이트
                    containerEl.empty();
                    this.render(containerEl);
                });
            });
    }

    /**
     * 메트릭 표시
     */
    private renderMetrics(containerEl: HTMLElement): void {
        const metricsEl = containerEl.createDiv({ cls: 'sn-metrics-container' });

        metricsEl.createEl('h4', { text: 'Performance metrics' });

        // 각 Provider별 메트릭
        this.renderProviderMetrics(metricsEl, 'whisper');
        this.renderProviderMetrics(metricsEl, 'deepgram');

        // 비교 차트
        this.renderComparisonChart(metricsEl);
    }

    /**
     * Provider별 메트릭 표시
     */
    private renderProviderMetrics(containerEl: HTMLElement, provider: TranscriptionProvider): void {
        const stats = this.getProviderStats(provider);

        const statsEl = containerEl.createDiv({
            cls: `sn-provider-stats sn-provider-stats--${provider}`,
        });
        statsEl.createEl('h5', { text: this.getProviderDisplayName(provider) });

        const statGrid = statsEl.createDiv({ cls: 'sn-stat-grid' });

        const statItems = [
            {
                label: 'Success rate:',
                value: `${(stats.successRate * 100).toFixed(1)}%`,
                className: this.getStatClass(stats.successRate),
            },
            {
                label: 'Avg. latency:',
                value: `${stats.avgLatency.toFixed(0)}ms`,
            },
            {
                label: 'Total requests:',
                value: String(stats.totalRequests),
            },
            {
                label: 'Est. cost:',
                value: `$${stats.estimatedCost.toFixed(2)}`,
            },
        ];

        statItems.forEach((item) => {
            const itemEl = statGrid.createDiv({ cls: 'sn-stat-item' });
            itemEl.createEl('span', { cls: 'sn-stat-label', text: item.label });
            const valueSpan = itemEl.createEl('span', { cls: 'sn-stat-value', text: item.value });
            if (item.className) {
                valueSpan.addClass(item.className);
            }
        });
    }

    /**
     * 비교 차트 렌더링
     */
    private renderComparisonChart(containerEl: HTMLElement): void {
        const chartEl = containerEl.createDiv({ cls: 'sn-comparison-chart' });
        chartEl.createEl('h5', { text: 'Provider comparison' });

        // 간단한 막대 차트 (실제로는 Chart.js 등 사용 권장)
        const chartContent = chartEl.createDiv({ cls: 'sn-chart-content' });
        const bars = chartContent.createDiv({ cls: 'sn-chart-bars' });

        const whisperBar = bars.createDiv({ cls: 'sn-chart-bar sn-chart-bar--whisper' });
        whisperBar.createEl('span', { cls: 'sn-bar-label', text: 'Whisper' });

        const deepgramBar = bars.createDiv({ cls: 'sn-chart-bar sn-chart-bar--deepgram' });
        deepgramBar.createEl('span', { cls: 'sn-bar-label', text: 'Deepgram' });

        const legend = chartContent.createDiv({ cls: 'sn-chart-legend' });
        legend.createEl('span', { text: 'Overall performance score' });
    }

    /**
     * 연결 상태 표시
     */
    private renderConnectionStatus(containerEl: HTMLElement): void {
        const statusEl = containerEl.createDiv({ cls: 'sn-connection-status' });

        const whisperConnected = this.checkConnection('whisper');
        const deepgramConnected = this.checkConnection('deepgram');

        if (whisperConnected || deepgramConnected) {
            statusEl.addClass('sn-connection-status--connected');
            statusEl.setText('✅ connected');
        } else {
            statusEl.addClass('sn-connection-status--disconnected');
            statusEl.setText('⚠️ no providers configured');
        }
    }

    // === Helper Methods ===

    /**
     * API 키 마스킹
     */
    private maskApiKey(key: string): string {
        if (!key || key.length < 10) return '***';
        return key.substring(0, 5) + '***' + key.substring(key.length - 4);
    }

    /**
     * 가시성 토글 추가
     */
    private addVisibilityToggle(
        containerEl: HTMLElement,
        inputEl: HTMLInputElement,
        provider: TranscriptionProvider
    ): void {
        const toggleBtn = containerEl.createEl('button', {
            text: '👁',
            cls: 'sn-visibility-toggle',
        });

        let isVisible = false;
        const actualKey = this.apiKeys.get(provider) || '';

        toggleBtn.addEventListener('click', () => {
            isVisible = !isVisible;
            if (isVisible) {
                inputEl.type = 'text';
                inputEl.value = actualKey;
                toggleBtn.textContent = '🙈';
            } else {
                inputEl.type = 'password';
                inputEl.value = actualKey ? this.maskApiKey(actualKey) : '';
                toggleBtn.textContent = '👁';
            }
        });
    }

    /**
     * 검증 버튼 추가
     */
    private addValidationButton(
        containerEl: HTMLElement,
        inputEl: HTMLInputElement,
        provider: TranscriptionProvider
    ): void {
        const validateBtn = containerEl.createEl('button', {
            text: 'Verify',
            cls: 'mod-cta sn-validate-btn',
        });

        validateBtn.addEventListener('click', () => {
            validateBtn.disabled = true;
            validateBtn.textContent = 'Verifying...';

            const isValid = this.validateApiKey(provider, inputEl.value);

            if (isValid) {
                new Notice(`✅ ${this.getProviderDisplayName(provider)} API key verified!`);
                inputEl.addClass('sn-api-key-input--valid');
            } else {
                new Notice(`❌ Invalid ${this.getProviderDisplayName(provider)} API key`);
                inputEl.addClass('sn-api-key-input--invalid');
            }

            validateBtn.disabled = false;
            validateBtn.textContent = 'Verify';
        });
    }

    /**
     * 입력 핸들러 추가
     */
    private addInputHandler(inputEl: HTMLInputElement, provider: TranscriptionProvider): void {
        inputEl.addEventListener('change', () => {
            void (async () => {
                const value = inputEl.value;

                // 마스킹된 값이면 무시
                if (value.includes('***')) return;

                // 형식 검증
                if (this.validateKeyFormat(provider, value)) {
                    this.apiKeys.set(provider, value);
                    await this.saveApiKey(provider, value);
                    inputEl.removeClass('sn-api-key-input--invalid');
                } else {
                    inputEl.addClass('sn-api-key-input--invalid');
                    new Notice(`Invalid ${this.getProviderDisplayName(provider)} key format`);
                }
            })();
        });
    }

    /**
     * API 키 가시성 업데이트
     */
    private updateApiKeyVisibility(containerEl: HTMLElement): void {
        const whisperEl = containerEl.querySelector('.api-key-whisper');
        const deepgramEl = containerEl.querySelector('.api-key-deepgram');

        if (this.currentProvider === 'auto') {
            // Auto mode: 모든 키 표시
            whisperEl?.removeClass('sn-hidden');
            deepgramEl?.removeClass('sn-hidden');
        } else if (this.currentProvider === 'whisper') {
            // Whisper only
            whisperEl?.removeClass('sn-hidden');
            deepgramEl?.addClass('sn-hidden');
        } else if (this.currentProvider === 'deepgram') {
            // Deepgram only
            whisperEl?.addClass('sn-hidden');
            deepgramEl?.removeClass('sn-hidden');
        }
    }

    /**
     * 단일 키 가시성 업데이트
     */
    private updateSingleKeyVisibility(settingEl: Setting, provider: TranscriptionProvider): void {
        if (this.currentProvider === 'auto' || this.currentProvider === provider) {
            settingEl.settingEl.classList.remove('sn-hidden');
        } else {
            settingEl.settingEl.classList.add('sn-hidden');
        }
    }

    /**
     * Provider 정보 표시
     */
    private showProviderInfo(provider: string): void {
        const info: Record<string, string> = {
            auto: '🤖 System will automatically select the best provider based on performance and availability',
            whisper: '🎯 OpenAI Whisper - high accuracy, supports 50+ languages',
            deepgram: '🚀 Deepgram - fast real-time transcription with excellent accuracy',
        };

        new Notice(info[provider] || 'Provider selected');
    }

    /**
     * Strategy 정보 표시
     */
    private showStrategyInfo(strategy: string): void {
        const info: Record<string, string> = {
            [SelectionStrategy.COST_OPTIMIZED]: '💰 Will choose the most cost-effective provider',
            [SelectionStrategy.PERFORMANCE_OPTIMIZED]: '⚡ Will choose the fastest provider',
            [SelectionStrategy.QUALITY_OPTIMIZED]: '✨ Will choose the most accurate provider',
            [SelectionStrategy.ROUND_ROBIN]: '🔄 Will alternate between providers equally',
            [SelectionStrategy.AB_TEST]: '🧪 Will split traffic for comparison',
        };

        new Notice(info[strategy] || 'Strategy selected');
    }

    /**
     * Provider 표시 이름 가져오기
     */
    private getProviderDisplayName(provider: TranscriptionProvider): string {
        const names: Record<TranscriptionProvider, string> = {
            whisper: 'OpenAI Whisper',
            deepgram: 'Deepgram',
        };
        return names[provider] || provider;
    }

    /**
     * 통계 클래스 가져오기
     */
    private getStatClass(value: number): string {
        if (value >= 0.95) return 'sn-stat-excellent';
        if (value >= 0.85) return 'sn-stat-good';
        if (value >= 0.7) return 'sn-stat-fair';
        return 'sn-stat-poor';
    }

    /**
     * 연결 확인
     */
    private checkConnection(provider: TranscriptionProvider): boolean {
        return this.apiKeys.has(provider) && (this.apiKeys.get(provider)?.length ?? 0) > 0;
    }

    /**
     * Provider 통계 가져오기
     */
    private getProviderStats(_provider: TranscriptionProvider): {
        successRate: number;
        avgLatency: number;
        totalRequests: number;
        estimatedCost: number;
    } {
        // TODO: 실제 메트릭 시스템과 연동
        return {
            successRate: 0.95,
            avgLatency: 1200,
            totalRequests: 150,
            estimatedCost: 2.5,
        };
    }

    /**
     * API 키 형식 검증
     */
    private validateKeyFormat(provider: TranscriptionProvider, key: string): boolean {
        if (!key) return false;

        if (provider === 'whisper') {
            return key.startsWith('sk-') && key.length > 20;
        } else if (provider === 'deepgram') {
            return key.length > 30; // Deepgram keys are typically longer
        }

        return false;
    }

    /**
     * API 키 검증
     */
    private validateApiKey(provider: TranscriptionProvider, key: string): boolean {
        // TODO: 실제 API 검증 로직 구현
        return this.validateKeyFormat(provider, key);
    }

    /**
     * 현재 설정 로드
     */
    private loadCurrentSettings(): void {
        // TODO: 실제 설정 로드
        this.currentProvider = this.plugin.settings.provider || 'auto';

        if (this.plugin.settings.whisperApiKey) {
            this.apiKeys.set('whisper', this.plugin.settings.whisperApiKey);
        }

        if (this.plugin.settings.deepgramApiKey) {
            this.apiKeys.set('deepgram', this.plugin.settings.deepgramApiKey);
        }
    }

    // === Save Methods ===

    private async saveProviderSelection(provider: string): Promise<void> {
        if (this.isProviderValue(provider)) {
            this.plugin.settings.provider = provider;
            await this.plugin.saveSettings();
        }
    }

    private isProviderValue(value: string): value is TranscriptionProvider | 'auto' {
        return value === 'auto' || value === 'whisper' || value === 'deepgram';
    }

    private isSelectionStrategy(value: string): value is SelectionStrategy {
        return Object.values(SelectionStrategy).includes(value as SelectionStrategy);
    }

    private async saveApiKey(provider: TranscriptionProvider, key: string): Promise<void> {
        if (provider === 'whisper') {
            this.plugin.settings.whisperApiKey = key;
        } else if (provider === 'deepgram') {
            this.plugin.settings.deepgramApiKey = key;
        }
        await this.plugin.saveSettings();
    }

    private async saveStrategy(strategy: SelectionStrategy): Promise<void> {
        this.plugin.settings.selectionStrategy = strategy;
        await this.plugin.saveSettings();
    }

    private async saveCostLimit(limit: number): Promise<void> {
        this.plugin.settings.costLimit = limit;
        await this.plugin.saveSettings();
    }

    private async saveQualityThreshold(threshold: number): Promise<void> {
        this.plugin.settings.qualityThreshold = threshold;
        await this.plugin.saveSettings();
    }

    private async saveABTestEnabled(enabled: boolean): Promise<void> {
        this.plugin.settings.abTestEnabled = enabled;
        await this.plugin.saveSettings();
    }

    private async saveABTestSplit(split: number): Promise<void> {
        this.plugin.settings.abTestSplit = split;
        await this.plugin.saveSettings();
    }
}
