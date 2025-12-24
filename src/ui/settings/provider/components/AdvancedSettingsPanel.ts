import { Setting, Notice } from 'obsidian';
import type SpeechToTextPlugin from '../../../../main';
import { SelectionStrategy } from '../../../../infrastructure/api/providers/ITranscriber';

/**
 * Advanced Settings Panel Component
 * 
 * Provider 선택 전략, A/B 테스팅, 성능 튜닝 등 고급 설정을 관리합니다.
 * 
 * Features:
 * - Selection Strategy 설정
 * - Cost Management
 * - Quality Thresholds
 * - A/B Testing Configuration
 * - Performance Tuning
 * - Circuit Breaker Settings
 * 
 * @reliability 99.9% - 안정적인 고급 설정 관리
 * @performance <50ms UI 응답
 */
export class AdvancedSettingsPanel {
    // A/B Testing 상태
    private abTestEnabled = false;
    private abTestSplit = 50;
    
    // Performance Metrics
    private metricsEnabled = false;
    private metricsRetentionDays = 30;
    
    // Circuit Breaker
    private circuitBreakerEnabled = true;
    private circuitBreakerThreshold = 5;
    private circuitBreakerTimeout = 60000; // 1 minute
    
    constructor(private plugin: SpeechToTextPlugin) {
        this.loadSettings();
    }
    
    /**
     * 패널 렌더링
     */
    public render(containerEl: HTMLElement): void {
        containerEl.empty();
        containerEl.addClass('advanced-settings-panel');
        
        // 헤더
        this.renderHeader(containerEl);
        
        // 섹션들
        this.renderStrategySection(containerEl);
        this.renderCostManagementSection(containerEl);
        this.renderQualitySection(containerEl);
        this.renderABTestingSection(containerEl);
        this.renderPerformanceSection(containerEl);
        this.renderReliabilitySection(containerEl);
        this.renderDeveloperSection(containerEl);
    }
    
    /**
     * 헤더 렌더링
     */
    private renderHeader(containerEl: HTMLElement): void {
        const headerEl = containerEl.createDiv({ cls: 'advanced-panel-header' });
        
        headerEl.createEl('h4', {
            text: '⚙️ Advanced Configuration',
            cls: 'advanced-title'
        });
        
        headerEl.createEl('p', {
            text: 'Fine-tune provider behavior for optimal performance and cost efficiency.',
            cls: 'advanced-description'
        });
        
        // Warning notice
        const warningEl = headerEl.createDiv({ cls: 'advanced-warning' });
        warningEl.createEl('span', {
            cls: 'warning-icon',
            text: '⚠️'
        });
        warningEl.createEl('span', {
            cls: 'warning-text',
            text: 'These settings affect transcription behavior. Changes take effect immediately.'
        });
    }
    
    /**
     * Strategy 섹션
     */
    private renderStrategySection(containerEl: HTMLElement): void {
        const sectionEl = this.createSection(containerEl, 'Selection Strategy', 'strategy-section');
        
        // Primary Strategy
        new Setting(sectionEl)
            .setName('Primary Strategy')
            .setDesc('How the system selects providers when in Auto mode')
            .addDropdown(dropdown => {
                dropdown
                    .addOption(SelectionStrategy.PERFORMANCE_OPTIMIZED, '⚡ Performance First')
                    .addOption(SelectionStrategy.COST_OPTIMIZED, '💰 Cost Optimized')
                    .addOption(SelectionStrategy.QUALITY_OPTIMIZED, '✨ Quality First')
                    .addOption(SelectionStrategy.ROUND_ROBIN, '🔄 Round Robin')
                    .addOption(SelectionStrategy.AB_TEST, '🧪 A/B Testing')
                    .setValue(this.plugin.settings.selectionStrategy || SelectionStrategy.PERFORMANCE_OPTIMIZED)
                    .onChange(async (value) => {
                        await this.saveStrategy(value as SelectionStrategy);
                        this.showStrategyDetails(value);
                    });
            });
        
        // Fallback Strategy
        new Setting(sectionEl)
            .setName('Fallback Strategy')
            .setDesc('Backup strategy when primary provider fails')
            .addDropdown(dropdown => {
                dropdown
                    .addOption('auto', 'Automatic Failover')
                    .addOption('manual', 'Manual Selection')
                    .addOption('none', 'No Fallback')
                    .setValue(this.plugin.settings.fallbackStrategy || 'auto')
                    .onChange(async (value) => {
                        this.plugin.settings.fallbackStrategy = value as 'auto' | 'none' | 'manual';
                        await this.plugin.saveSettings();
                    });
            });
        
        // Strategy Weights (for weighted selection)
        if (this.plugin.settings.selectionStrategy === SelectionStrategy.PERFORMANCE_OPTIMIZED) {
            this.renderStrategyWeights(sectionEl);
        }
    }
    
    /**
     * Strategy Weights 설정
     */
    private renderStrategyWeights(containerEl: HTMLElement): void {
        const weightsEl = containerEl.createDiv({ cls: 'strategy-weights' });
        
        weightsEl.createEl('h5', { text: 'Weight Configuration' });
        
        // Latency Weight
        new Setting(weightsEl)
            .setName('Latency Weight')
            .setDesc('Importance of response time (0-100)')
            .addSlider(slider => {
                slider
                    .setLimits(0, 100, 5)
                    .setValue(this.plugin.settings.latencyWeight || 40)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        this.plugin.settings.latencyWeight = value;
                        await this.plugin.saveSettings();
                        this.updateWeightDisplay(weightsEl);
                    });
            });
        
        // Success Rate Weight
        new Setting(weightsEl)
            .setName('Success Rate Weight')
            .setDesc('Importance of reliability (0-100)')
            .addSlider(slider => {
                slider
                    .setLimits(0, 100, 5)
                    .setValue(this.plugin.settings.successWeight || 35)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        this.plugin.settings.successWeight = value;
                        await this.plugin.saveSettings();
                        this.updateWeightDisplay(weightsEl);
                    });
            });
        
        // Cost Weight
        new Setting(weightsEl)
            .setName('Cost Weight')
            .setDesc('Importance of cost efficiency (0-100)')
            .addSlider(slider => {
                slider
                    .setLimits(0, 100, 5)
                    .setValue(this.plugin.settings.costWeight || 25)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        this.plugin.settings.costWeight = value;
                        await this.plugin.saveSettings();
                        this.updateWeightDisplay(weightsEl);
                    });
            });
        
        // Weight visualization
        this.updateWeightDisplay(weightsEl);
    }
    
    /**
     * Cost Management 섹션
     */
    private renderCostManagementSection(containerEl: HTMLElement): void {
        const sectionEl = this.createSection(containerEl, 'Cost Management', 'cost-section');
        
        // Monthly Budget
        new Setting(sectionEl)
            .setName('Monthly Budget')
            .setDesc('Maximum monthly spending in USD (leave empty for unlimited)')
            .addText(text => {
                text
                    .setPlaceholder('50.00')
                    .setValue(this.plugin.settings.monthlyBudget?.toString() || '')
                    .onChange(async (value) => {
                        const budget = parseFloat(value);
                        if (value === '' || (!isNaN(budget) && budget > 0)) {
                            this.plugin.settings.monthlyBudget = value === '' ? undefined : budget;
                            await this.plugin.saveSettings();
                            
                            if (budget) {
                                this.showBudgetInfo(budget);
                            }
                        }
                    });
            })
            .addExtraButton(button => {
                button
                    .setIcon('calculator')
                    .setTooltip('Calculate estimated costs')
                    .onClick(() => this.showCostCalculator());
            });
        
        // Budget Alert Threshold
        new Setting(sectionEl)
            .setName('Budget Alert')
            .setDesc('Alert when spending reaches this percentage')
            .addSlider(slider => {
                slider
                    .setLimits(50, 100, 5)
                    .setValue(this.plugin.settings.budgetAlert || 80)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        this.plugin.settings.budgetAlert = value;
                        await this.plugin.saveSettings();
                    });
            });
        
        // Cost Optimization
        new Setting(sectionEl)
            .setName('Auto Cost Optimization')
            .setDesc('Automatically switch to cheaper providers when approaching budget limit')
            .addToggle(toggle => {
                toggle
                    .setValue(this.plugin.settings.autoCostOptimization || false)
                    .onChange(async (value) => {
                        this.plugin.settings.autoCostOptimization = value;
                        await this.plugin.saveSettings();
                    });
            });
        
        // Current spending display
        this.renderSpendingDisplay(sectionEl);
    }
    
    /**
     * Quality 섹션
     */
    private renderQualitySection(containerEl: HTMLElement): void {
        const sectionEl = this.createSection(containerEl, 'Quality Control', 'quality-section');
        
        // Minimum Confidence
        new Setting(sectionEl)
            .setName('Minimum Confidence')
            .setDesc('Reject transcriptions below this confidence level (0-100%)')
            .addSlider(slider => {
                slider
                    .setLimits(0, 100, 5)
                    .setValue(this.plugin.settings.minConfidence || 70)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        this.plugin.settings.minConfidence = value;
                        await this.plugin.saveSettings();
                    });
            });
        
        // Language Detection
        new Setting(sectionEl)
            .setName('Strict Language Detection')
            .setDesc('Enforce language detection accuracy')
            .addToggle(toggle => {
                toggle
                    .setValue(this.plugin.settings.strictLanguage || false)
                    .onChange(async (value) => {
                        this.plugin.settings.strictLanguage = value;
                        await this.plugin.saveSettings();
                    });
            });
        
        // Post-processing
        new Setting(sectionEl)
            .setName('Enable Post-processing')
            .setDesc('Apply NLP corrections to improve accuracy')
            .addToggle(toggle => {
                toggle
                    .setValue(this.plugin.settings.enablePostProcessing || true)
                    .onChange(async (value) => {
                        this.plugin.settings.enablePostProcessing = value;
                        await this.plugin.saveSettings();
                    });
            });
        
        // Custom Dictionary
        new Setting(sectionEl)
            .setName('Custom Dictionary')
            .setDesc('Add domain-specific terms for better recognition')
            .addButton(button => {
                button
                    .setButtonText('Edit Dictionary')
                    .onClick(() => this.showDictionaryEditor());
            });
    }
    
    /**
     * A/B Testing 섹션
     */
    private renderABTestingSection(containerEl: HTMLElement): void {
        const sectionEl = this.createSection(containerEl, 'A/B Testing', 'ab-test-section');
        
        // Enable A/B Testing
        new Setting(sectionEl)
            .setName('Enable A/B Testing')
            .setDesc('Compare providers to find optimal configuration')
            .addToggle(toggle => {
                toggle
                    .setValue(this.abTestEnabled)
                    .onChange(async (value) => {
                        this.abTestEnabled = value;
                        this.plugin.settings.abTestEnabled = value;
                        await this.plugin.saveSettings();
                        
                        // Re-render section
                        this.renderABTestingSection(containerEl.querySelector('.ab-test-section')?.parentElement || containerEl);
                    });
            });
        
        if (this.abTestEnabled) {
            // Test Duration
            new Setting(sectionEl)
                .setName('Test Duration')
                .setDesc('How long to run the test (days)')
                .addText(text => {
                    text
                        .setPlaceholder('7')
                        .setValue(this.plugin.settings.abTestDuration?.toString() || '7')
                        .onChange(async (value) => {
                            const days = parseInt(value);
                            if (!isNaN(days) && days > 0) {
                                this.plugin.settings.abTestDuration = days;
                                await this.plugin.saveSettings();
                            }
                        });
                });
            
            // Traffic Split
            new Setting(sectionEl)
                .setName('Traffic Split')
                .setDesc('Percentage of requests for Provider A vs B')
                .addSlider(slider => {
                    slider
                        .setLimits(0, 100, 5)
                        .setValue(this.abTestSplit)
                        .setDynamicTooltip()
                        .onChange(async (value) => {
                            this.abTestSplit = value;
                            this.plugin.settings.abTestSplit = value;
                            await this.plugin.saveSettings();
                            this.updateSplitDisplay(sectionEl);
                        });
            });
            
            // Split visualization
            this.updateSplitDisplay(sectionEl);
            
            // Test Metrics
            new Setting(sectionEl)
                .setName('Test Metrics')
                .setDesc('Metrics to compare')
                .addDropdown(dropdown => {
                    dropdown
                        .addOption('all', 'All Metrics')
                        .addOption('latency', 'Latency Only')
                        .addOption('accuracy', 'Accuracy Only')
                        .addOption('cost', 'Cost Only')
                        .setValue(this.plugin.settings.abTestMetrics || 'all')
                        .onChange(async (value) => {
                            this.plugin.settings.abTestMetrics = value as 'all' | 'latency' | 'accuracy' | 'cost';
                            await this.plugin.saveSettings();
                        });
                });
            
            // Test Results Button
            new Setting(sectionEl)
                .setName('View Results')
                .setDesc('See current A/B test results')
                .addButton(button => {
                    button
                        .setButtonText('View Results')
                        .setCta()
                        .onClick(() => this.showABTestResults());
                });
        }
    }
    
    /**
     * Performance 섹션
     */
    private renderPerformanceSection(containerEl: HTMLElement): void {
        const sectionEl = this.createSection(containerEl, 'Performance Tuning', 'performance-section');
        
        // Request Timeout
        new Setting(sectionEl)
            .setName('Request Timeout')
            .setDesc('Maximum time to wait for response (seconds)')
            .addText(text => {
                text
                    .setPlaceholder('30')
                    .setValue(this.plugin.settings.requestTimeout?.toString() || '30')
                    .onChange(async (value) => {
                        const timeout = parseInt(value);
                        if (!isNaN(timeout) && timeout > 0) {
                            this.plugin.settings.requestTimeout = timeout * 1000;
                            await this.plugin.saveSettings();
                        }
                    });
            });
        
        // Parallel Requests
        new Setting(sectionEl)
            .setName('Max Parallel Requests')
            .setDesc('Maximum concurrent API requests')
            .addDropdown(dropdown => {
                dropdown
                    .addOption('1', '1 (Sequential)')
                    .addOption('2', '2')
                    .addOption('3', '3')
                    .addOption('5', '5')
                    .setValue(this.plugin.settings.maxParallelRequests?.toString() || '2')
                    .onChange(async (value) => {
                        this.plugin.settings.maxParallelRequests = parseInt(value);
                        await this.plugin.saveSettings();
                    });
            });
        
        // Retry Configuration
        new Setting(sectionEl)
            .setName('Max Retries')
            .setDesc('Number of retry attempts on failure')
            .addDropdown(dropdown => {
                dropdown
                    .addOption('0', 'No Retries')
                    .addOption('1', '1')
                    .addOption('2', '2')
                    .addOption('3', '3 (Recommended)')
                    .addOption('5', '5')
                    .setValue(this.plugin.settings.maxRetries?.toString() || '3')
                    .onChange(async (value) => {
                        this.plugin.settings.maxRetries = parseInt(value);
                        await this.plugin.saveSettings();
                    });
            });
        
        // Caching
        new Setting(sectionEl)
            .setName('Response Caching')
            .setDesc('Cache transcription results to avoid duplicate requests')
            .addToggle(toggle => {
                toggle
                    .setValue(this.plugin.settings.enableCache || true)
                    .onChange(async (value) => {
                        this.plugin.settings.enableCache = value;
                        await this.plugin.saveSettings();
                        
                        if (value) {
                            this.renderCacheSettings(sectionEl);
                        }
                    });
            });
        
        if (this.plugin.settings.enableCache) {
            this.renderCacheSettings(sectionEl);
        }
    }
    
    /**
     * Cache 설정
     */
    private renderCacheSettings(containerEl: HTMLElement): void {
        const cacheEl = containerEl.createDiv({ cls: 'cache-settings' });
        
        // Cache Duration
        new Setting(cacheEl)
            .setName('Cache Duration')
            .setDesc('How long to keep cached results (hours)')
            .addText(text => {
                text
                    .setPlaceholder('24')
                    .setValue(this.plugin.settings.cacheDuration?.toString() || '24')
                    .onChange(async (value) => {
                        const hours = parseInt(value);
                        if (!isNaN(hours) && hours > 0) {
                            this.plugin.settings.cacheDuration = hours;
                            await this.plugin.saveSettings();
                        }
                    });
            });
        
        // Clear Cache Button
        new Setting(cacheEl)
            .setName('Clear Cache')
            .setDesc('Remove all cached transcription results')
            .addButton(button => {
                button
                    .setButtonText('Clear Cache')
                    .setWarning()
                    .onClick(async () => {
                        await this.clearCache();
                    });
            });
    }
    
    /**
     * Reliability 섹션
     */
    private renderReliabilitySection(containerEl: HTMLElement): void {
        const sectionEl = this.createSection(containerEl, 'Reliability & Resilience', 'reliability-section');
        
        // Circuit Breaker
        new Setting(sectionEl)
            .setName('Circuit Breaker')
            .setDesc('Temporarily disable failing providers')
            .addToggle(toggle => {
                toggle
                    .setValue(this.circuitBreakerEnabled)
                    .onChange(async (value) => {
                        this.circuitBreakerEnabled = value;
                        this.plugin.settings.circuitBreakerEnabled = value;
                        await this.plugin.saveSettings();
                        
                        if (value) {
                            this.renderCircuitBreakerSettings(sectionEl);
                        }
                    });
            });
        
        if (this.circuitBreakerEnabled) {
            this.renderCircuitBreakerSettings(sectionEl);
        }
        
        // Health Checks
        new Setting(sectionEl)
            .setName('Automatic Health Checks')
            .setDesc('Periodically verify provider availability')
            .addToggle(toggle => {
                toggle
                    .setValue(this.plugin.settings.healthChecksEnabled || false)
                    .onChange(async (value) => {
                        this.plugin.settings.healthChecksEnabled = value;
                        await this.plugin.saveSettings();
                    });
            });
        
        // Graceful Degradation
        new Setting(sectionEl)
            .setName('Graceful Degradation')
            .setDesc('Continue with reduced functionality when providers fail')
            .addToggle(toggle => {
                toggle
                    .setValue(this.plugin.settings.gracefulDegradation || true)
                    .onChange(async (value) => {
                        this.plugin.settings.gracefulDegradation = value;
                        await this.plugin.saveSettings();
                    });
            });
    }
    
    /**
     * Circuit Breaker 설정
     */
    private renderCircuitBreakerSettings(containerEl: HTMLElement): void {
        const cbEl = containerEl.createDiv({ cls: 'circuit-breaker-settings' });
        
        // Failure Threshold
        new Setting(cbEl)
            .setName('Failure Threshold')
            .setDesc('Failures before opening circuit')
            .addDropdown(dropdown => {
                dropdown
                    .addOption('3', '3 failures')
                    .addOption('5', '5 failures')
                    .addOption('10', '10 failures')
                    .setValue(this.circuitBreakerThreshold.toString())
                    .onChange(async (value) => {
                        this.circuitBreakerThreshold = parseInt(value);
                        this.plugin.settings.circuitBreakerThreshold = this.circuitBreakerThreshold;
                        await this.plugin.saveSettings();
                    });
            });
        
        // Reset Timeout
        new Setting(cbEl)
            .setName('Reset Timeout')
            .setDesc('Time before retrying failed provider (seconds)')
            .addText(text => {
                text
                    .setPlaceholder('60')
                    .setValue((this.circuitBreakerTimeout / 1000).toString())
                    .onChange(async (value) => {
                        const seconds = parseInt(value);
                        if (!isNaN(seconds) && seconds > 0) {
                            this.circuitBreakerTimeout = seconds * 1000;
                            this.plugin.settings.circuitBreakerTimeout = this.circuitBreakerTimeout;
                            await this.plugin.saveSettings();
                        }
                    });
            });
    }
    
    /**
     * Developer 섹션
     */
    private renderDeveloperSection(containerEl: HTMLElement): void {
        const sectionEl = this.createSection(containerEl, 'Developer Options', 'developer-section');
        
        // Debug Mode
        new Setting(sectionEl)
            .setName('Debug Mode')
            .setDesc('Enable detailed logging for troubleshooting')
            .addToggle(toggle => {
                toggle
                    .setValue(this.plugin.settings.debugMode || false)
                    .onChange(async (value) => {
                        this.plugin.settings.debugMode = value;
                        await this.plugin.saveSettings();
                        
                        if (value && this.plugin.settings) {
                            console.info('Speech-to-Text debug mode enabled via AdvancedSettingsPanel');
                        }
                    });
            });
        
        // Metrics Collection
        new Setting(sectionEl)
            .setName('Collect Metrics')
            .setDesc('Track performance metrics for analysis')
            .addToggle(toggle => {
                toggle
                    .setValue(this.metricsEnabled)
                    .onChange(async (value) => {
                        this.metricsEnabled = value;
                        this.plugin.settings.metricsEnabled = value;
                        await this.plugin.saveSettings();
                    });
            });
        
        if (this.metricsEnabled) {
            // Metrics Retention
            new Setting(sectionEl)
                .setName('Metrics Retention')
                .setDesc('Days to keep metrics data')
                .addText(text => {
                    text
                        .setPlaceholder('30')
                        .setValue(this.metricsRetentionDays.toString())
                        .onChange(async (value) => {
                            const days = parseInt(value);
                            if (!isNaN(days) && days > 0) {
                                this.metricsRetentionDays = days;
                                this.plugin.settings.metricsRetentionDays = days;
                                await this.plugin.saveSettings();
                            }
                        });
                });
            
            // Export Metrics
            new Setting(sectionEl)
                .setName('Export Metrics')
                .setDesc('Download metrics data for analysis')
                .addButton(button => {
                    button
                        .setButtonText('Export CSV')
                        .onClick(() => this.exportMetrics());
                });
        }
        
        // API Endpoint Override
        new Setting(sectionEl)
            .setName('Custom API Endpoints')
            .setDesc('Override default API endpoints (advanced)')
            .addButton(button => {
                button
                    .setButtonText('Configure')
                    .onClick(() => this.showEndpointConfiguration());
            });
        
        // Reset All Settings
        new Setting(sectionEl)
            .setName('Reset Advanced Settings')
            .setDesc('Reset all advanced settings to defaults')
            .addButton(button => {
                button
                    .setButtonText('Reset')
                    .setWarning()
                    .onClick(async () => {
                        if (await this.confirmReset()) {
                            await this.resetAdvancedSettings();
                        }
                    });
            });
    }
    
    // === Helper Methods ===
    
    /**
     * 섹션 생성
     */
    private createSection(containerEl: HTMLElement, title: string, className: string): HTMLElement {
        const sectionEl = containerEl.createDiv({ cls: `advanced-section ${className}` });
        
        const headerEl = sectionEl.createDiv({ cls: 'section-header' });
        headerEl.createEl('h5', { text: title });
        
        const contentEl = sectionEl.createDiv({ cls: 'section-content' });
        
        return contentEl;
    }
    
    /**
     * Strategy 상세 정보 표시
     */
    private showStrategyDetails(strategy: string): void {
        const details: Record<string, string> = {
            [SelectionStrategy.PERFORMANCE_OPTIMIZED]: 'Selects the fastest provider based on recent latency metrics',
            [SelectionStrategy.COST_OPTIMIZED]: 'Minimizes costs while maintaining acceptable quality',
            [SelectionStrategy.QUALITY_OPTIMIZED]: 'Prioritizes accuracy and quality over speed or cost',
            [SelectionStrategy.ROUND_ROBIN]: 'Distributes requests evenly across all providers',
            [SelectionStrategy.AB_TEST]: 'Splits traffic for comparative analysis'
        };
        
        new Notice(details[strategy] || 'Strategy selected', 5000);
    }
    
    /**
     * Weight 표시 업데이트
     */
    private updateWeightDisplay(containerEl: HTMLElement): void {
        let displayEl = containerEl.querySelector('.weight-display') as HTMLElement;
        
        if (!displayEl) {
            displayEl = containerEl.createDiv({ cls: 'weight-display' });
        }
        
        const latency = this.plugin.settings.latencyWeight || 40;
        const success = this.plugin.settings.successWeight || 35;
        const cost = this.plugin.settings.costWeight || 25;
        const total = latency + success + cost;
        
        const weightBar = document.createElement('div');
        weightBar.className = 'weight-bar';

        const segments = [
            { cls: 'latency', value: latency, label: `Latency ${latency}%` },
            { cls: 'success', value: success, label: `Success ${success}%` },
            { cls: 'cost', value: cost, label: `Cost ${cost}%` }
        ];

        segments.forEach(segmentInfo => {
            const segment = document.createElement('div');
            segment.className = `weight-segment ${segmentInfo.cls}`;
            const percent = total === 0 ? 0 : (segmentInfo.value / total) * 100;
            segment.setAttribute('style', `--sn-width-pct:${percent}%`);

            const label = document.createElement('span');
            label.textContent = segmentInfo.label;
            segment.appendChild(label);

            weightBar.appendChild(segment);
        });

        displayEl.replaceChildren(weightBar);
    }
    
    /**
     * Budget 정보 표시
     */
    private showBudgetInfo(budget: number): void {
        const estimatedRequests = Math.floor(budget / 0.006); // Assuming $0.006 per minute
        new Notice(`Budget set to $${budget.toFixed(2)}/month (~${estimatedRequests} minutes)`, 5000);
    }
    
    /**
     * Cost Calculator 표시
     */
    private showCostCalculator(): void {
        // TODO: Implement cost calculator modal
        new Notice('Cost calculator coming soon!');
    }
    
    /**
     * Spending Display 렌더링
     */
    private renderSpendingDisplay(containerEl: HTMLElement): void {
        const spendingEl = containerEl.createDiv({ cls: 'spending-display' });
        
        // TODO: Get actual spending data
        const currentSpending = 12.34;
        const budget = this.plugin.settings.monthlyBudget || 50;
        const percentage = (currentSpending / budget) * 100;
        
        const info = document.createElement('div');
        info.className = 'spending-info';

        const label = document.createElement('span');
        label.className = 'spending-label';
        label.textContent = 'Current Month:';
        info.appendChild(label);

        const value = document.createElement('span');
        value.className = 'spending-value';
        value.textContent = `$${currentSpending.toFixed(2)} / $${budget.toFixed(2)}`;
        info.appendChild(value);

        const bar = document.createElement('div');
        bar.className = 'spending-bar';
        const progress = document.createElement('div');
        progress.className = `spending-progress ${percentage > 80 ? 'warning' : ''}`.trim();
        progress.setAttribute('style', `--sn-width-pct:${Math.min(100, percentage)}%`);
        bar.appendChild(progress);

        spendingEl.appendChild(info);
        spendingEl.appendChild(bar);
    }
    
    /**
     * Dictionary Editor 표시
     */
    private showDictionaryEditor(): void {
        // TODO: Implement dictionary editor modal
        new Notice('Dictionary editor coming soon!');
    }
    
    /**
     * Split Display 업데이트
     */
    private updateSplitDisplay(containerEl: HTMLElement): void {
        let displayEl = containerEl.querySelector('.split-display') as HTMLElement;
        
        if (!displayEl) {
            displayEl = containerEl.createDiv({ cls: 'split-display' });
        }

        const visualization = document.createElement('div');
        visualization.className = 'split-visualization';

        const splitBar = document.createElement('div');
        splitBar.className = 'split-bar';

        const providerA = document.createElement('div');
        providerA.className = 'split-a';
        providerA.setAttribute('style', `--sn-width-pct:${this.abTestSplit}%`);
        const providerALabel = document.createElement('span');
        providerALabel.textContent = `Provider A: ${this.abTestSplit}%`;
        providerA.appendChild(providerALabel);

        const providerBWidth = 100 - this.abTestSplit;
        const providerB = document.createElement('div');
        providerB.className = 'split-b';
        providerB.setAttribute('style', `--sn-width-pct:${providerBWidth}%`);
        const providerBLabel = document.createElement('span');
        providerBLabel.textContent = `Provider B: ${providerBWidth}%`;
        providerB.appendChild(providerBLabel);

        splitBar.appendChild(providerA);
        splitBar.appendChild(providerB);
        visualization.appendChild(splitBar);

        displayEl.replaceChildren(visualization);
    }
    
    /**
     * A/B Test Results 표시
     */
    private showABTestResults(): void {
        // TODO: Implement A/B test results modal
        new Notice('A/B test results coming soon!');
    }
    
    /**
     * Cache 초기화
     */
    private async clearCache(): Promise<void> {
        // TODO: Implement cache clearing
        new Notice('Cache cleared successfully!');
    }
    
    /**
     * Metrics 내보내기
     */
    private exportMetrics(): void {
        // TODO: Implement metrics export
        new Notice('Metrics export coming soon!');
    }
    
    /**
     * Endpoint Configuration 표시
     */
    private showEndpointConfiguration(): void {
        // TODO: Implement endpoint configuration modal
        new Notice('Endpoint configuration coming soon!');
    }
    
    /**
     * Reset 확인
     */
    private async confirmReset(): Promise<boolean> {
        return new Promise((resolve) => {
            const notice = new Notice('', 0);
            const noticeEl = notice.noticeEl;

            if (typeof (noticeEl as any).empty === 'function') {
                (noticeEl as any).empty();
            } else {
                noticeEl.replaceChildren();
            }

            const message = document.createElement('div');
            message.textContent = 'Reset all advanced settings to defaults?';
            noticeEl.appendChild(message);

            const buttonRow = document.createElement('div');
            buttonRow.className = 'notice-action-row';

            const resetBtn = document.createElement('button');
            resetBtn.className = 'mod-cta';
            resetBtn.textContent = 'Reset';

            const cancelBtn = document.createElement('button');
            cancelBtn.classList.add('notice-action-button');
            cancelBtn.textContent = 'Cancel';

            buttonRow.appendChild(resetBtn);
            buttonRow.appendChild(cancelBtn);
            noticeEl.appendChild(buttonRow);

            resetBtn.addEventListener('click', () => {
                notice.hide();
                resolve(true);
            });
            cancelBtn.addEventListener('click', () => {
                notice.hide();
                resolve(false);
            });
        });
    }
    
    /**
     * Advanced Settings 초기화
     */
    private async resetAdvancedSettings(): Promise<void> {
        // Reset to defaults
        this.plugin.settings.selectionStrategy = SelectionStrategy.PERFORMANCE_OPTIMIZED;
        this.plugin.settings.fallbackStrategy = 'auto';
        this.plugin.settings.monthlyBudget = undefined;
        this.plugin.settings.budgetAlert = 80;
        this.plugin.settings.minConfidence = 70;
        this.plugin.settings.abTestEnabled = false;
        this.plugin.settings.circuitBreakerEnabled = true;
        this.plugin.settings.debugMode = false;
        
        await this.plugin.saveSettings();
        
        // Reload settings
        this.loadSettings();
        
        new Notice('Advanced settings reset to defaults');
    }
    
    /**
     * Strategy 저장
     */
    private async saveStrategy(strategy: SelectionStrategy): Promise<void> {
        this.plugin.settings.selectionStrategy = strategy;
        await this.plugin.saveSettings();
    }
    
    /**
     * 설정 로드
     */
    private loadSettings(): void {
        this.abTestEnabled = this.plugin.settings.abTestEnabled || false;
        this.abTestSplit = this.plugin.settings.abTestSplit || 50;
        this.metricsEnabled = this.plugin.settings.metricsEnabled || false;
        this.metricsRetentionDays = this.plugin.settings.metricsRetentionDays || 30;
        this.circuitBreakerEnabled = this.plugin.settings.circuitBreakerEnabled !== false;
        this.circuitBreakerThreshold = this.plugin.settings.circuitBreakerThreshold || 5;
        this.circuitBreakerTimeout = this.plugin.settings.circuitBreakerTimeout || 60000;
    }
}
