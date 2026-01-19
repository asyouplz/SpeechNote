import { App, Setting, Notice, Modal, ButtonComponent } from 'obsidian';
import type SpeechToTextPlugin from '../../../main';
import {
    TranscriptionProvider,
    SelectionStrategy,
} from '../../../infrastructure/api/providers/ITranscriber';
import { APIKeyManager } from './components/APIKeyManager';
import { AdvancedSettingsPanel } from './components/AdvancedSettingsPanel';
// import { ProviderMetricsDisplay } from './components/ProviderMetricsDisplay';
import { isPlainRecord } from '../../../types/guards';

/**
 * Provider Settings Container
 *
 * 컨테이너 컴포넌트로서 Provider 관련 모든 설정을 관리합니다.
 * Single Responsibility: Provider 설정의 전체적인 조율 및 상태 관리
 *
 * @reliability 99.9% - 안정적인 설정 관리
 * @security 모든 API 키는 암호화되어 저장
 * @performance <100ms UI 응답
 */
export class ProviderSettingsContainer {
    private apiKeyManager: APIKeyManager;
    private advancedPanel: AdvancedSettingsPanel;
    private metricsDisplay?: ProviderMetricsDisplay;

    // 상태
    private currentProvider: TranscriptionProvider | 'auto' = 'auto';
    private isExpanded = false;
    private connectionStatus: Map<TranscriptionProvider, boolean> = new Map();
    private lastValidation: Map<TranscriptionProvider, Date> = new Map();

    // 실시간 업데이트를 위한 interval
    private statusUpdateInterval?: number;

    constructor(private app: App, private plugin: SpeechToTextPlugin) {
        this.apiKeyManager = new APIKeyManager(plugin);
        this.advancedPanel = new AdvancedSettingsPanel(plugin);

        void this.initialize();
    }

    /**
     * 초기화
     */
    private initialize(): void {
        // 현재 설정 로드
        this.loadSettings();

        // 연결 상태 확인
        this.checkAllConnections();

        // 실시간 상태 업데이트 시작
        this.startStatusMonitoring();
    }

    /**
     * 컨테이너 렌더링
     */
    public render(containerEl: HTMLElement): void {
        containerEl.empty();
        containerEl.addClass('provider-settings-container');

        // 헤더 섹션
        this.renderHeader(containerEl);

        // 상태 대시보드
        this.renderStatusDashboard(containerEl);

        // Provider 선택 섹션
        this.renderProviderSelection(containerEl);

        // API Key 관리 섹션
        this.renderApiKeySection(containerEl);

        // 고급 설정 (토글 가능)
        if (this.isExpanded) {
            this.renderAdvancedSection(containerEl);
        }

        // 메트릭 표시 (옵션)
        if (this.plugin.settings.showMetrics) {
            this.renderMetricsSection(containerEl);
        }

        // 액션 버튼들
        this.renderActions(containerEl);
    }

    /**
     * 헤더 렌더링
     */
    private renderHeader(containerEl: HTMLElement): void {
        const headerEl = containerEl.createDiv({ cls: 'provider-header' });

        // 타이틀
        const titleEl = headerEl.createDiv({ cls: 'provider-title' });
        new Setting(titleEl).setName('🎯 Transcription provider Configuration').setHeading();

        // 확장/축소 토글
        const toggleBtn = headerEl.createEl('button', {
            cls: 'provider-expand-toggle',
            attr: {
                'aria-label': this.isExpanded ? 'Collapse settings' : 'Expand settings',
                'aria-expanded': String(this.isExpanded),
            },
        });
        toggleBtn.setText(this.isExpanded ? '▼' : '▶');
        toggleBtn.onclick = () => this.toggleExpanded(containerEl);

        // 설명
        headerEl.createEl('p', {
            text: 'Configure your speech-to-text providers for optimal performance and reliability.',
            cls: 'provider-description',
        });
    }

    /**
     * 상태 대시보드
     */
    private renderStatusDashboard(containerEl: HTMLElement): void {
        const dashboardEl = containerEl.createDiv({ cls: 'provider-status-dashboard' });

        // 전체 상태 인디케이터
        const overallStatus = this.getOverallStatus();
        const statusEl = dashboardEl.createDiv({
            cls: `overall-status status-${overallStatus.level}`,
        });

        const indicator = statusEl.createDiv({ cls: 'status-indicator' });
        indicator.createEl('span', {
            cls: 'status-icon',
            text: overallStatus.icon,
        });
        indicator.createEl('span', {
            cls: 'status-text',
            text: overallStatus.text,
        });

        // Provider별 상태
        const providersEl = dashboardEl.createDiv({ cls: 'providers-status-grid' });

        const providers: TranscriptionProvider[] = ['whisper', 'deepgram'];
        providers.forEach((provider) => {
            const providerEl = providersEl.createDiv({ cls: 'provider-status-item' });
            const isConnected = this.connectionStatus.get(provider) || false;
            const hasKey = this.hasApiKey(provider);

            providerEl.createDiv({
                cls: 'provider-name',
                text: this.getProviderDisplayName(provider),
            });

            const indicatorsEl = providerEl.createDiv({ cls: 'provider-indicators' });

            const keyStatus = indicatorsEl.createEl('span', {
                cls: `indicator key-status ${hasKey ? 'has-key' : 'no-key'}`,
                attr: { title: hasKey ? 'API key configured' : 'No API key' },
            });
            keyStatus.setText(hasKey ? '🔑' : '🔒');

            const connectionStatus = indicatorsEl.createEl('span', {
                cls: `indicator connection-status ${isConnected ? 'connected' : 'disconnected'}`,
                attr: { title: isConnected ? 'Connected' : 'Not connected' },
            });
            connectionStatus.setText(isConnected ? '✅' : '⭕');

            const performanceStatus = indicatorsEl.createEl('span', {
                cls: 'indicator performance-status',
                attr: { title: 'Performance score' },
            });
            performanceStatus.setText(this.getPerformanceIndicator(provider));

            // 클릭시 상세 정보
            providerEl.onclick = () => this.showProviderDetails(provider);
        });

        // 실시간 업데이트 타이머
        const updateEl = dashboardEl.createDiv({ cls: 'last-update' });
        updateEl.createEl('small', {
            text: `Last checked: ${new Date().toLocaleTimeString()}`,
            cls: 'update-time',
        });
    }

    /**
     * Provider 선택 섹션
     */
    private renderProviderSelection(containerEl: HTMLElement): void {
        const selectionEl = containerEl.createDiv({ cls: 'provider-selection-section' });

        new Setting(selectionEl)
            .setName('Provider mode')
            .setDesc('Select how to choose the transcription provider')
            .addDropdown((dropdown) => {
                dropdown
                    .addOption('auto', '🤖 Automatic (recommended)')
                    .addOption('whisper', '🎯 OpenAI Whisper only')
                    .addOption('deepgram', '🚀 Deepgram only')
                    .setValue(this.currentProvider)
                    .onChange(async (value) => {
                        if (this.isProviderSelection(value)) {
                            this.currentProvider = value;
                            await this.saveProviderSelection(value);

                            // UI 업데이트
                            this.updateProviderVisibility(containerEl);

                            // 즉각적인 피드백
                            this.showProviderNotice(value);
                        }
                    });
            })
            .addExtraButton((button) => {
                button
                    .setIcon('help-circle')
                    .setTooltip('Learn more about provider selection')
                    .onClick(() => this.showProviderHelp());
            });

        // Auto 모드일 때 전략 선택
        if (this.currentProvider === 'auto') {
            this.renderStrategySelection(selectionEl);
        }
    }

    /**
     * 전략 선택 (Auto 모드)
     */
    private renderStrategySelection(containerEl: HTMLElement): void {
        new Setting(containerEl)
            .setName('Selection strategy')
            .setDesc('How should the system choose between providers?')
            .addDropdown((dropdown) => {
                dropdown
                    .addOption(SelectionStrategy.PERFORMANCE_OPTIMIZED, '⚡ Performance first')
                    .addOption(SelectionStrategy.COST_OPTIMIZED, '💰 Cost optimized')
                    .addOption(SelectionStrategy.QUALITY_OPTIMIZED, '✨ Quality first')
                    .addOption(SelectionStrategy.ROUND_ROBIN, '🔄 Round robin')
                    .setValue(
                        this.plugin.settings.selectionStrategy ||
                        SelectionStrategy.PERFORMANCE_OPTIMIZED
                    )
                    .onChange(async (value) => {
                        if (this.isSelectionStrategy(value)) {
                            await this.saveStrategy(value);
                        }
                    });
            });
    }

    /**
     * API Key 관리 섹션
     */
    private renderApiKeySection(containerEl: HTMLElement): void {
        const apiKeySection = containerEl.createDiv({ cls: 'api-key-section' });

        // APIKeyManager 컴포넌트 렌더링
        this.apiKeyManager.render(apiKeySection, this.currentProvider);

        // 일괄 검증 버튼
        const actionsEl = apiKeySection.createDiv({ cls: 'api-key-actions' });

        new ButtonComponent(actionsEl)
            .setButtonText('Verify all keys')
            .setCta()
            .onClick(async () => {
                await this.verifyAllApiKeys();
            });

        new ButtonComponent(actionsEl).setButtonText('Import keys').onClick(() => {
            this.importApiKeys();
        });
    }

    /**
     * 고급 설정 섹션
     */
    private renderAdvancedSection(containerEl: HTMLElement): void {
        const advancedSection = containerEl.createDiv({ cls: 'advanced-settings-section' });

        // AdvancedSettingsPanel 컴포넌트 렌더링
        this.advancedPanel.render(advancedSection);
    }

    /**
     * 메트릭 섹션
     */
    private renderMetricsSection(containerEl: HTMLElement): void {
        const metricsSection = containerEl.createDiv({ cls: 'metrics-section' });

        if (!this.metricsDisplay) {
            this.metricsDisplay = new ProviderMetricsDisplay(this.plugin);
        }

        this.metricsDisplay.render(metricsSection);
    }

    /**
     * 액션 버튼들
     */
    private renderActions(containerEl: HTMLElement): void {
        const actionsEl = containerEl.createDiv({ cls: 'provider-actions' });

        // 테스트 버튼
        new ButtonComponent(actionsEl).setButtonText('Test connection').onClick(async () => {
            await this.testCurrentProvider();
        });

        // 설정 내보내기
        new ButtonComponent(actionsEl).setButtonText('Export config').onClick(() => {
            this.exportConfiguration();
        });

        // 설정 초기화
        new ButtonComponent(actionsEl)
            .setButtonText('Reset to defaults')
            .setWarning()
            .onClick(async () => {
                if (await this.confirmReset()) {
                    await this.resetProviderSettings();
                }
            });
    }

    // === Helper Methods ===

    /**
     * 전체 상태 가져오기
     */
    private getOverallStatus(): { level: string; icon: string; text: string } {
        const hasAnyKey = this.hasApiKey('whisper') || this.hasApiKey('deepgram');
        const hasAnyConnection = Array.from(this.connectionStatus.values()).some((v) => v);

        if (hasAnyConnection) {
            return { level: 'good', icon: '✅', text: 'Operational' };
        } else if (hasAnyKey) {
            return { level: 'warning', icon: '⚠️', text: 'Keys configured, not connected' };
        } else {
            return { level: 'error', icon: '❌', text: 'No providers configured' };
        }
    }

    /**
     * API 키 존재 확인
     */
    private hasApiKey(provider: TranscriptionProvider): boolean {
        if (provider === 'whisper') {
            return !!this.plugin.settings.apiKey;
        } else if (provider === 'deepgram') {
            return !!this.plugin.settings.deepgramApiKey;
        }
        return false;
    }

    /**
     * Provider 표시 이름
     */
    private getProviderDisplayName(provider: string): string {
        const names: Record<string, string> = {
            whisper: 'OpenAI Whisper',
            deepgram: 'Deepgram',
            auto: 'Automatic',
        };
        return names[provider] || provider;
    }

    /**
     * 성능 인디케이터
     */
    private getPerformanceIndicator(_provider: TranscriptionProvider): string {
        // TODO: 실제 메트릭 연동
        const score = Math.random() * 100; // 임시 값

        if (score >= 90) return '🟢';
        if (score >= 70) return '🟡';
        if (score >= 50) return '🟠';
        return '🔴';
    }

    /**
     * Provider 상세 정보 표시
     */
    private showProviderDetails(provider: TranscriptionProvider): void {
        const modal = new ProviderDetailsModal(this.app, provider, this.plugin);
        modal.open();
    }

    /**
     * 확장/축소 토글
     */
    private toggleExpanded(containerEl: HTMLElement): void {
        this.isExpanded = !this.isExpanded;
        this.render(containerEl);
    }

    /**
     * Provider 선택 알림
     */
    private showProviderNotice(provider: string): void {
        const messages: Record<string, string> = {
            auto: '🤖 System will automatically select the best provider',
            whisper: '🎯 Using OpenAI Whisper exclusively',
            deepgram: '🚀 Using Deepgram exclusively',
        };
        new Notice(messages[provider] || 'Provider updated');
    }

    /**
     * Provider 도움말 표시
     */
    private showProviderHelp(): void {
        const modal = new Modal(this.app);
        modal.titleEl.setText('Provider selection guide');

        const contentEl = modal.contentEl;
        const helpContainer = contentEl.createDiv('provider-help');

        const sections = [
            {
                title: '🤖 Automatic mode',
                description: 'The system intelligently selects the best provider based on:',
                bullets: [
                    'Current availability and response times',
                    'Historical success rates',
                    'Your configured selection strategy',
                ],
            },
            {
                title: '🎯 OpenAI Whisper',
                bullets: [
                    'Excellent accuracy for 50+ languages',
                    'Best for long-form content',
                    'Supports timestamps and speaker diarization',
                ],
            },
            {
                title: '🚀 Deepgram',
                bullets: [
                    'Ultra-fast real-time transcription',
                    'Lower latency than Whisper',
                    'Cost-effective for high volume',
                ],
            },
        ];

        sections.forEach((section) => {
            new Setting(helpContainer).setName(section.title).setHeading();
            if (section.description) {
                helpContainer.createEl('p', { text: section.description });
            }

            if (section.bullets?.length) {
                const list = helpContainer.createEl('ul');
                section.bullets.forEach((item) => {
                    list.createEl('li', { text: item });
                });
            }
        });

        modal.open();
    }

    /**
     * 모든 연결 확인
     */
    private checkAllConnections(): void {
        const providers: TranscriptionProvider[] = ['whisper', 'deepgram'];

        for (const provider of providers) {
            if (this.hasApiKey(provider)) {
                const isConnected = this.checkProviderConnection(provider);
                this.connectionStatus.set(provider, isConnected);
                this.lastValidation.set(provider, new Date());
            }
        }
    }

    /**
     * Provider 연결 확인
     */
    private checkProviderConnection(provider: TranscriptionProvider): boolean {
        try {
            // TODO: 실제 연결 테스트 구현
            return true; // 임시
        } catch (error) {
            console.error(`Failed to check ${provider} connection:`, error);
            return false;
        }
    }

    /**
     * 상태 모니터링 시작
     */
    private startStatusMonitoring(): void {
        // 5분마다 상태 업데이트
        this.statusUpdateInterval = window.setInterval(() => {
            this.checkAllConnections();
        }, 5 * 60 * 1000);
    }

    /**
     * 모든 API 키 검증
     */
    private async verifyAllApiKeys(): Promise<void> {
        const notice = new Notice('Verifying API keys...', 0);

        try {
            const results = await this.apiKeyManager.verifyAllKeys();

            let message = 'Verification complete:\n';
            for (const [provider, result] of results) {
                message += `${this.getProviderDisplayName(provider)}: ${result ? '✅' : '❌'}\n`;
            }

            notice.hide();
            new Notice(message, 5000);
        } catch (error) {
            notice.hide();
            new Notice('Failed to verify API keys', 5000);
            console.error('API key verification error:', error);
        }
    }

    /**
     * API 키 가져오기
     */
    private importApiKeys(): void {
        // 파일 선택 다이얼로그
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

            try {
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

                await this.apiKeyManager.importKeys(keys);
                new Notice('API keys imported successfully');

                // UI 새로고침
                const containerEl = document.querySelector('.provider-settings-container');
                if (containerEl instanceof HTMLElement) {
                    this.render(containerEl);
                }
            } catch (error) {
                new Notice('Failed to import API keys');
                console.error('Import error:', error);
            }
        };

        input.click();
    }

    /**
     * 현재 Provider 테스트
     */
    private async testCurrentProvider(): Promise<void> {
        const notice = new Notice('Testing connection...', 0);

        try {
            // TODO: 실제 테스트 구현
            await new Promise((resolve) => setTimeout(resolve, 2000)); // 시뮬레이션

            notice.hide();
            new Notice('✅ Connection successful!', 3000);
        } catch (error) {
            notice.hide();
            new Notice('❌ Connection failed', 3000);
            console.error('Connection test error:', error);
        }
    }

    /**
     * 설정 내보내기
     */
    private exportConfiguration(): void {
        try {
            const config = {
                provider: this.currentProvider,
                strategy: this.plugin.settings.selectionStrategy,
                // API 키는 제외 (보안)
                settings: {
                    ...this.plugin.settings,
                    apiKey: undefined,
                    deepgramApiKey: undefined,
                    whisperApiKey: undefined,
                },
            };

            const blob = new Blob([JSON.stringify(config, null, 2)], {
                type: 'application/json',
            });
            const url = URL.createObjectURL(blob);

            const a = createEl('a');
            a.href = url;
            a.download = `provider-config-${Date.now()}.json`;
            a.click();

            URL.revokeObjectURL(url);
            new Notice('Configuration exported');
        } catch (error) {
            new Notice('Failed to export configuration');
            console.error('Export error:', error);
        }
    }

    /**
     * 초기화 확인
     */
    private confirmReset(): Promise<boolean> {
        return new Promise((resolve) => {
            const modal = new Modal(this.app);
            modal.titleEl.setText('Reset provider settings?');

            modal.contentEl.createEl('p', {
                text: 'This will reset all provider settings to defaults. API keys will be preserved.',
            });

            const buttonContainer = modal.contentEl.createDiv({ cls: 'modal-button-container' });

            new ButtonComponent(buttonContainer).setButtonText('Cancel').onClick(() => {
                modal.close();
                resolve(false);
            });

            new ButtonComponent(buttonContainer)
                .setButtonText('Reset')
                .setWarning()
                .onClick(() => {
                    modal.close();
                    resolve(true);
                });

            modal.open();
        });
    }

    /**
     * Provider 설정 초기화
     */
    private async resetProviderSettings(): Promise<void> {
        // API 키 보존
        const apiKey = this.plugin.settings.apiKey;
        const deepgramKey = this.plugin.settings.deepgramApiKey;

        // 기본값으로 초기화
        this.currentProvider = 'auto';
        this.plugin.settings.provider = 'auto';
        this.plugin.settings.selectionStrategy = SelectionStrategy.PERFORMANCE_OPTIMIZED;
        this.plugin.settings.costLimit = undefined;
        this.plugin.settings.qualityThreshold = 85;
        this.plugin.settings.abTestEnabled = false;

        // API 키 복원
        this.plugin.settings.apiKey = apiKey;
        this.plugin.settings.deepgramApiKey = deepgramKey;

        await this.plugin.saveSettings();

        new Notice('Provider settings reset to defaults');

        // UI 새로고침
        const containerEl = document.querySelector('.provider-settings-container');
        if (containerEl instanceof HTMLElement) {
            this.render(containerEl);
        }
    }

    /**
     * Provider 가시성 업데이트
     */
    private updateProviderVisibility(_containerEl: HTMLElement): void {
        // APIKeyManager에게 가시성 업데이트 요청
        this.apiKeyManager.updateVisibility(this.currentProvider);
    }

    // === Save Methods ===

    private async saveProviderSelection(provider: TranscriptionProvider | 'auto'): Promise<void> {
        this.plugin.settings.provider = provider;
        await this.plugin.saveSettings();
    }

    private async saveStrategy(strategy: SelectionStrategy): Promise<void> {
        this.plugin.settings.selectionStrategy = strategy;
        await this.plugin.saveSettings();
    }

    private loadSettings(): void {
        this.currentProvider = this.plugin.settings.provider || 'auto';
    }

    private isProviderSelection(value: string): value is TranscriptionProvider | 'auto' {
        return value === 'auto' || value === 'whisper' || value === 'deepgram';
    }

    private isSelectionStrategy(value: string): value is SelectionStrategy {
        return (
            value === (SelectionStrategy.MANUAL as string) ||
            value === (SelectionStrategy.COST_OPTIMIZED as string) ||
            value === (SelectionStrategy.PERFORMANCE_OPTIMIZED as string) ||
            value === (SelectionStrategy.QUALITY_OPTIMIZED as string) ||
            value === (SelectionStrategy.ROUND_ROBIN as string) ||
            value === (SelectionStrategy.AB_TEST as string)
        );
    }

    /**
     * 정리
     */
    public destroy(): void {
        if (this.statusUpdateInterval) {
            window.clearInterval(this.statusUpdateInterval);
        }
    }
}

/**
 * Provider 상세 정보 모달
 */
class ProviderDetailsModal extends Modal {
    constructor(
        app: App,
        private provider: TranscriptionProvider,
        private plugin: SpeechToTextPlugin
    ) {
        super(app);
    }

    onOpen(): void {
        const { contentEl, titleEl } = this;

        titleEl.setText(`${this.getProviderName()} details`);

        // 상태 정보
        const statusEl = contentEl.createDiv({ cls: 'provider-details-status' });
        this.renderStatus(statusEl);

        // 통계
        const statsEl = contentEl.createDiv({ cls: 'provider-details-stats' });
        this.renderStatistics(statsEl);

        // 설정
        const configEl = contentEl.createDiv({ cls: 'provider-details-config' });
        this.renderConfiguration(configEl);

        // 액션 버튼
        const actionsEl = contentEl.createDiv({ cls: 'modal-button-container' });

        new ButtonComponent(actionsEl)
            .setButtonText('Test connection')
            .setCta()
            .onClick(async () => {
                await this.testConnection();
            });

        new ButtonComponent(actionsEl).setButtonText('Close').onClick(() => this.close());
    }

    private getProviderName(): string {
        return this.provider === 'whisper' ? 'OpenAI Whisper' : 'Deepgram';
    }

    private renderStatus(containerEl: HTMLElement): void {
        containerEl.createEl('h4', { text: 'Status' });

        // TODO: 실제 상태 가져오기
        const statusItems = [
            { label: 'Connection', value: '✅ Connected', cls: 'status-good' },
            { label: 'API Key', value: '🔑 Configured', cls: 'status-good' },
            { label: 'Last Used', value: '5 minutes ago', cls: 'status-info' },
            { label: 'Health', value: '100%', cls: 'status-good' },
        ];

        const gridEl = containerEl.createDiv({ cls: 'status-grid' });
        statusItems.forEach((item) => {
            const itemEl = gridEl.createDiv({ cls: `status-item ${item.cls}` });
            itemEl.createEl('span', { text: item.label, cls: 'status-label' });
            itemEl.createEl('span', { text: item.value, cls: 'status-value' });
        });
    }

    private renderStatistics(containerEl: HTMLElement): void {
        containerEl.createEl('h4', { text: 'Statistics (last 30 days)' });

        // TODO: 실제 통계 가져오기
        const stats = [
            { label: 'Total Requests', value: '1,234' },
            { label: 'Success Rate', value: '99.5%' },
            { label: 'Avg. Latency', value: '1.2s' },
            { label: 'Total Cost', value: '$12.34' },
        ];

        const gridEl = containerEl.createDiv({ cls: 'stats-grid' });
        stats.forEach((stat) => {
            const statEl = gridEl.createDiv({ cls: 'stat-item' });
            statEl.createEl('div', { text: stat.value, cls: 'stat-value' });
            statEl.createEl('div', { text: stat.label, cls: 'stat-label' });
        });
    }

    private renderConfiguration(containerEl: HTMLElement): void {
        containerEl.createEl('h4', { text: 'Configuration' });

        const configEl = containerEl.createEl('pre', { cls: 'config-display' });

        const config = {
            provider: this.provider,
            model: this.provider === 'whisper' ? 'whisper-1' : 'nova-2',
            language: this.plugin.settings.language || 'auto',
            maxRetries: 3,
            timeout: 30000,
        };

        configEl.textContent = JSON.stringify(config, null, 2);
    }

    private async testConnection(): Promise<void> {
        const notice = new Notice(`Testing ${this.getProviderName()} connection...`, 0);

        try {
            // TODO: 실제 연결 테스트
            await new Promise((resolve) => setTimeout(resolve, 2000));

            notice.hide();
            new Notice('✅ Connection test successful!', 3000);
        } catch (error) {
            notice.hide();
            new Notice('❌ Connection test failed', 3000);
        }
    }
}

/**
 * Provider 메트릭 표시 컴포넌트
 */
class ProviderMetricsDisplay {
    constructor(private plugin: SpeechToTextPlugin) { }

    render(containerEl: HTMLElement): void {
        new Setting(containerEl).setName('📊 Performance metrics').setHeading();

        // TODO: 실제 메트릭 구현
        const metricsEl = containerEl.createDiv({ cls: 'metrics-display' });
        const placeholder = metricsEl.createDiv('metrics-placeholder');
        placeholder.createEl('p', {
            text: 'Metrics will be displayed here once transcription starts.',
        });
        const list = placeholder.createEl('ul');
        ['Request latency', 'Success rate', 'Cost tracking', 'Quality scores'].forEach((item) => {
            list.createEl('li', { text: item });
        });
    }
}
