/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison -- Type guard pattern uses string comparison with enum values for type narrowing */

import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import type SpeechToTextPlugin from '../../main';
import { DeepgramSettings } from './components/DeepgramSettings';
import { SelectionStrategy } from '../../infrastructure/api/providers/ITranscriber';
import { ConfirmationModal } from '../modals/ConfirmationModal';

/**
 * 간소화된 설정 탭 UI
 * 핵심 기능만 포함하여 안정성을 높인 버전
 */
export class SettingsTab extends PluginSettingTab {
    plugin: SpeechToTextPlugin;

    constructor(app: App, plugin: SpeechToTextPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        if (!containerEl) {
            this.debug('SettingsTab display called without container element');
            return;
        }

        this.debug('=== SettingsTab display() called ===');
        this.debug('Container element:', containerEl);
        this.debug('Container element exists:', !!containerEl);
        this.debug('Container element type:', containerEl?.constructor?.name);
        this.debug('Plugin instance:', this.plugin);
        this.debug('Plugin instance exists:', !!this.plugin);
        this.debug('Plugin settings object:', this.plugin?.settings);
        this.debug(
            'Plugin settings keys:',
            this.plugin?.settings ? Object.keys(this.plugin.settings) : 'N/A'
        );

        // Check if container is visible
        if (containerEl) {
            this.debug('Container parent element:', containerEl.parentElement);
            this.debug('Container is connected to DOM:', containerEl.isConnected);
            this.debug('Container display style:', window.getComputedStyle(containerEl).display);
        }

        // Clear existing content
        containerEl.empty();

        // Add main title
        new Setting(containerEl).setName('Speech note').setHeading();
        this.debug('Title setting created');

        // Add debug info section at the top
        const debugSection = containerEl.createEl('details', { cls: 'speech-to-text-debug' });
        debugSection.createEl('summary', { text: 'Debug information' });
        debugSection.createEl('pre', {
            text: JSON.stringify(
                {
                    pluginExists: !!this.plugin,
                    settingsExists: !!this.plugin?.settings,
                    apiKey: this.plugin?.settings?.apiKey ? 'Set (hidden)' : 'Not set',
                    language: this.plugin?.settings?.language || 'Not set',
                    autoInsert: this.plugin?.settings?.autoInsert,
                    insertPosition: this.plugin?.settings?.insertPosition,
                    model: this.plugin?.settings?.model,
                    timestamp: new Date().toISOString(),
                },
                null,
                2
            ),
        });
        this.debug('Debug section added');

        try {
            // API Settings Section
            this.debug('Creating API section...');
            this.createApiSection(containerEl);
            this.debug('API section created');

            // General Settings Section
            this.debug('Creating General section...');
            this.createGeneralSection(containerEl);
            this.debug('General section created');

            // Audio Settings Section
            this.debug('Creating Audio section...');
            this.createAudioSection(containerEl);
            this.debug('Audio section created');

            // Advanced Settings Section
            this.debug('Creating Advanced section...');
            this.createAdvancedSection(containerEl);
            this.debug('Advanced section created');

            // Support Section
            this.debug('Creating Support section...');
            this.createSupportSection(containerEl);
            this.debug('Support section created');

            this.debug('=== Settings tab rendered successfully ===');
            this.debug('Total child elements:', containerEl.children.length);
        } catch (error) {
            console.error('=== Error displaying settings ===');
            console.error('Error details:', error);
            console.error('Error stack:', error instanceof Error ? error.stack : 'N/A');

            containerEl.empty();
            new Setting(containerEl).setName('Error').setHeading();
            containerEl.createEl('p', {
                text: 'Error loading settings. Please reload the plugin.',
                cls: 'mod-warning',
            });
            containerEl.createEl('pre', {
                text: `Error: ${error instanceof Error ? error.message : String(error)}`,
                cls: 'error-details',
            });
        }
    }

    private createApiSection(containerEl: HTMLElement): void {
        new Setting(containerEl).setName('API').setHeading();

        // Provider 선택 섹션
        const providerContainer = containerEl.createEl('div', { cls: 'provider-selection' });
        this.createProviderSelection(providerContainer);

        // Provider별 설정 컨테이너
        const settingsContainer = containerEl.createEl('div', { cls: 'provider-settings' });

        // 선택된 Provider에 따라 동적으로 설정 표시
        const currentProvider = this.plugin.settings.provider || 'auto';
        this.renderProviderSettings(settingsContainer, currentProvider);
    }

    private createProviderSelection(containerEl: HTMLElement): void {
        this.debug('=== createProviderSelection called ===');
        this.debug('Creating Setting instance...');

        try {
            const setting = new Setting(containerEl);
            this.debug('Setting instance created:', setting);
            this.debug('Setting element:', setting.settingEl);
            this.debug('Setting element in DOM:', setting.settingEl?.isConnected);

            setting
                .setName('Transcription provider')
                .setDesc('Select the speech-to-text provider')
                .addDropdown((dropdown) => {
                    this.debug('Dropdown callback called');
                    this.debug('Dropdown component:', dropdown);

                    dropdown
                        .addOption('auto', 'Auto (intelligent selection)')
                        .addOption('whisper', 'OpenAI Whisper')
                        .addOption('deepgram', 'Deepgram')
                        .setValue(this.plugin.settings.provider || 'auto')
                        .onChange(async (value) => {
                            this.debug('Provider dropdown changed to:', value);
                            if (!this.isProviderValue(value)) {
                                return;
                            }
                            this.plugin.settings.provider = value;
                            await this.plugin.saveSettings();

                            // Provider별 설정 UI 업데이트
                            const settingsContainer =
                                containerEl.parentElement?.querySelector('.provider-settings');
                            this.debug('Settings container found:', !!settingsContainer);

                            if (settingsContainer instanceof HTMLElement) {
                                this.debug('Updating provider settings UI for:', value);
                                this.renderProviderSettings(settingsContainer, value);
                            } else {
                                console.error('Could not find .provider-settings container');
                            }

                            // Provider 정보 업데이트
                            const infoEl = containerEl.querySelector('.provider-info');
                            if (infoEl instanceof HTMLElement) {
                                this.updateProviderInfo(infoEl, value);
                            }

                            new Notice(`Provider changed to: ${value}`);
                        });

                    this.debug('Dropdown setup complete');
                    this.debug('Dropdown element:', dropdown.selectEl);
                    this.debug('Dropdown options:', dropdown.selectEl?.options.length);
                });

            this.debug('Provider selection setting created successfully');
            this.debug('=== createProviderSelection completed ===');
        } catch (error) {
            console.error('Error creating provider selection:', error);
            console.error('Error stack:', error instanceof Error ? error.stack : 'N/A');
        }

        // Provider 설명
        const infoEl = containerEl.createEl('div', { cls: 'provider-info' });
        infoEl.addClass('sn-info-box');
        this.updateProviderInfo(infoEl, this.plugin.settings.provider || 'auto');
    }

    private renderProviderSettings(
        containerEl: HTMLElement,
        provider: 'auto' | 'whisper' | 'deepgram'
    ): void {
        this.debug('=== renderProviderSettings called ===');
        this.debug('Provider:', provider);
        this.debug('Container element:', containerEl);

        // 컨테이너를 비우기 전에 상태 저장
        const wasConnected = containerEl.isConnected;
        containerEl.empty();

        this.debug('Container cleared, still connected:', wasConnected);

        try {
            switch (provider) {
                case 'auto':
                    this.debug('Rendering auto provider settings');
                    this.renderAutoProviderSettings(containerEl);
                    break;
                case 'whisper':
                    this.debug('Rendering whisper settings');
                    this.renderWhisperSettings(containerEl);
                    break;
                case 'deepgram':
                    this.debug('Rendering deepgram settings');
                    this.renderDeepgramSettings(containerEl);
                    break;
                default:
                    console.warn('Unknown provider:', provider);
                    containerEl.createEl('p', {
                        text: `Unknown provider: ${String(provider)}`,
                        cls: 'mod-warning',
                    });
            }
        } catch (error) {
            console.error('Error rendering provider settings:', error);
            containerEl.createEl('p', {
                text: 'Error loading provider settings',
                cls: 'mod-warning',
            });
        }

        this.debug('Final container children:', containerEl.children.length);
        this.debug('=== renderProviderSettings completed ===');
    }

    private renderAutoProviderSettings(containerEl: HTMLElement): void {
        new Setting(containerEl).setName('Automatic provider selection').setHeading();

        // Selection Strategy
        new Setting(containerEl)
            .setName('Selection strategy')
            .setDesc('How to choose between available providers')
            .addDropdown((dropdown) => {
                dropdown
                    .addOption('cost_optimized', 'Cost optimized')
                    .addOption('performance_optimized', 'Performance optimized')
                    .addOption('quality_optimized', 'Quality optimized')
                    .addOption('round_robin', 'Round robin')
                    .addOption('ab_test', 'A/B testing')
                    .setValue(
                        this.plugin.settings.selectionStrategy ||
                            SelectionStrategy.PERFORMANCE_OPTIMIZED
                    )
                    .onChange(async (value) => {
                        if (this.isSelectionStrategy(value)) {
                            this.plugin.settings.selectionStrategy = value;
                            await this.plugin.saveSettings();
                        }
                    });
            });

        // Fallback 전략
        new Setting(containerEl)
            .setName('Fallback strategy')
            .setDesc('What to do when primary provider fails')
            .addDropdown((dropdown) => {
                dropdown
                    .addOption('auto', 'Automatic fallback')
                    .addOption('manual', 'Ask user')
                    .addOption('none', 'No fallback')
                    .setValue(this.plugin.settings.fallbackStrategy || 'auto')
                    .onChange(async (value) => {
                        if (this.isFallbackStrategy(value)) {
                            this.plugin.settings.fallbackStrategy = value;
                            await this.plugin.saveSettings();
                        }
                    });
            });

        // API Keys for both providers
        new Setting(containerEl).setName('Provider API keys').setHeading();
        containerEl.createEl('p', {
            text: 'Configure API keys for each provider to enable automatic selection',
            cls: 'setting-item-description',
        });

        // Whisper API Key
        this.renderWhisperApiKey(containerEl);

        // Deepgram API Key
        this.renderDeepgramApiKey(containerEl);
    }

    private renderWhisperSettings(containerEl: HTMLElement): void {
        new Setting(containerEl).setName('Whisper').setHeading();

        // Whisper API Key
        this.renderWhisperApiKey(containerEl);

        // API Endpoint
        new Setting(containerEl)
            .setName('API endpoint')
            .setDesc('OpenAI API endpoint (leave the default unless using a custom endpoint)')
            .addText((text) =>
                text
                    .setPlaceholder('https://api.openai.com/v1')
                    .setValue(this.plugin.settings.apiEndpoint || 'https://api.openai.com/v1')
                    .onChange(async (value) => {
                        this.plugin.settings.apiEndpoint = value || 'https://api.openai.com/v1';
                        await this.plugin.saveSettings();
                    })
            );
    }

    private renderDeepgramSettings(containerEl: HTMLElement): void {
        this.debug('=== renderDeepgramSettings called ===');
        this.debug('Container element:', containerEl);
        this.debug('Container is connected:', containerEl.isConnected);
        this.debug('Container children before:', containerEl.children.length);

        // 먼저 컨테이너를 비웁니다
        containerEl.empty();

        // Deepgram 전용 컨테이너 생성
        const deepgramContainer = containerEl.createEl('div', {
            cls: 'deepgram-settings-container',
        });

        this.debug('Deepgram container created:', deepgramContainer);

        try {
            // Deepgram 설정 컴포넌트 사용
            const deepgramSettings = new DeepgramSettings(this.plugin, deepgramContainer);
            this.debug('DeepgramSettings instance created');

            deepgramSettings.render();
            this.debug('DeepgramSettings.render() completed');
        } catch (error) {
            console.error('Error rendering Deepgram settings:', error);
            deepgramContainer.createEl('p', {
                text: 'Error loading Deepgram settings.',
                cls: 'mod-warning',
            });
        }

        this.debug('Container children after:', containerEl.children.length);
        this.debug('=== renderDeepgramSettings completed ===');
    }

    private renderWhisperApiKey(containerEl: HTMLElement): void {
        new Setting(containerEl)
            .setName('OpenAI API key')
            .setDesc('Enter your OpenAI API key for Whisper transcription')
            .addText((text) => {
                text.setPlaceholder('sk-...')
                    .setValue(this.maskApiKey(this.plugin.settings.apiKey || ''))
                    .onChange(async (value) => {
                        if (value && !value.includes('*')) {
                            this.plugin.settings.apiKey = value;
                            this.plugin.settings.whisperApiKey = value; // 호환성을 위해 양쪽에 저장
                            await this.plugin.saveSettings();

                            text.setValue(this.maskApiKey(value));
                            new Notice('OpenAI API key saved.');
                        }
                    });

                text.inputEl.type = 'password';

                text.inputEl.addEventListener('focus', () => {
                    if (this.plugin.settings.apiKey) {
                        text.setValue(this.plugin.settings.apiKey);
                    }
                });

                text.inputEl.addEventListener('blur', () => {
                    if (this.plugin.settings.apiKey) {
                        text.setValue(this.maskApiKey(this.plugin.settings.apiKey));
                    }
                });
            });
    }

    private renderDeepgramApiKey(containerEl: HTMLElement): void {
        new Setting(containerEl)
            .setName('Deepgram API key')
            .setDesc('Enter your Deepgram API key for transcription')
            .addText((text) => {
                text.setPlaceholder('Enter Deepgram API key...')
                    .setValue(this.maskApiKey(this.plugin.settings.deepgramApiKey || ''))
                    .onChange(async (value) => {
                        if (value && !value.includes('*')) {
                            this.plugin.settings.deepgramApiKey = value;
                            await this.plugin.saveSettings();

                            text.setValue(this.maskApiKey(value));
                            new Notice('Deepgram API key saved.');
                        }
                    });

                text.inputEl.type = 'password';

                text.inputEl.addEventListener('focus', () => {
                    if (this.plugin.settings.deepgramApiKey) {
                        text.setValue(this.plugin.settings.deepgramApiKey);
                    }
                });

                text.inputEl.addEventListener('blur', () => {
                    if (this.plugin.settings.deepgramApiKey) {
                        text.setValue(this.maskApiKey(this.plugin.settings.deepgramApiKey));
                    }
                });
            });
    }

    private updateProviderInfo(
        infoEl: HTMLElement,
        provider: 'auto' | 'whisper' | 'deepgram'
    ): void {
        infoEl.empty();

        const descriptions = {
            auto: '🤖 Intelligent selection between providers based on your configured strategy. Automatically chooses the best provider for each request.',
            whisper:
                '🎯 OpenAI Whisper - high-quality transcription with support for multiple languages. Best for general-purpose transcription.',
            deepgram:
                '⚡ Deepgram - fast, accurate transcription with advanced AI features. Best for real-time processing and speaker diarization.',
        };

        infoEl.createEl('p', { text: descriptions[provider] });
    }

    private createGeneralSection(containerEl: HTMLElement): void {
        new Setting(containerEl).setName('Transcription').setHeading();

        // Language setting
        new Setting(containerEl)
            .setName('Language')
            .setDesc('Primary language for transcription')
            .addDropdown((dropdown) =>
                dropdown
                    .addOption('auto', 'Auto-detect')
                    .addOption('en', 'English')
                    .addOption('ko', '한국어')
                    .addOption('ja', '日本語')
                    .addOption('zh', '中文')
                    .addOption('es', 'Español')
                    .addOption('fr', 'Français')
                    .addOption('de', 'Deutsch')
                    .setValue(this.plugin.settings.language || 'auto')
                    .onChange(async (value) => {
                        this.plugin.settings.language = value;
                        await this.plugin.saveSettings();
                    })
            );

        // Auto-insert setting
        new Setting(containerEl)
            .setName('Auto-insert transcription')
            .setDesc('Automatically insert transcribed text into the active note')
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.autoInsert || false)
                    .onChange(async (value) => {
                        this.plugin.settings.autoInsert = value;
                        await this.plugin.saveSettings();
                    })
            );

        // Insert position
        new Setting(containerEl)
            .setName('Insert position')
            .setDesc('Where to insert transcribed text')
            .addDropdown((dropdown) =>
                dropdown
                    .addOption('cursor', 'At cursor position')
                    .addOption('end', 'At end of note')
                    .addOption('beginning', 'At beginning of note')
                    .setValue(this.plugin.settings.insertPosition || 'cursor')
                    .onChange(async (value) => {
                        if (this.isInsertPosition(value)) {
                            this.plugin.settings.insertPosition = value;
                            await this.plugin.saveSettings();
                        }
                    })
            );

        // Show format options
        new Setting(containerEl)
            .setName('Show format options')
            .setDesc('Show formatting options before inserting text')
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.showFormatOptions || false)
                    .onChange(async (value) => {
                        this.plugin.settings.showFormatOptions = value;
                        await this.plugin.saveSettings();
                    })
            );
    }

    private createAudioSection(containerEl: HTMLElement): void {
        new Setting(containerEl).setName('Audio').setHeading();

        // Model selection - Provider에 따라 다르게 표시
        const provider = this.plugin.settings.provider || 'auto';
        if (provider === 'whisper' || provider === 'auto') {
            new Setting(containerEl)
                .setName('Whisper model')
                .setDesc('Select the Whisper model to use')
                .addDropdown((dropdown) =>
                    dropdown
                        .addOption('whisper-1', 'Whisper v1 (default)')
                        .setValue(this.plugin.settings.model || 'whisper-1')
                        .onChange(async (value) => {
                            this.plugin.settings.model = value;
                            await this.plugin.saveSettings();
                        })
                );
        }

        // Temperature setting
        new Setting(containerEl)
            .setName('Temperature')
            .setDesc(
                'Sampling temperature (0-1). Lower values make output more focused and deterministic'
            )
            .addText((text) =>
                text
                    .setPlaceholder('0.0')
                    .setValue(String(this.plugin.settings.temperature || 0))
                    .onChange(async (value) => {
                        const temp = parseFloat(value);
                        if (!isNaN(temp) && temp >= 0 && temp <= 1) {
                            this.plugin.settings.temperature = temp;
                            await this.plugin.saveSettings();
                        }
                    })
            );

        // Add timestamp
        new Setting(containerEl)
            .setName('Add timestamp')
            .setDesc('Add timestamp to transcribed text')
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.addTimestamp || false)
                    .onChange(async (value) => {
                        this.plugin.settings.addTimestamp = value;
                        await this.plugin.saveSettings();
                    })
            );
    }

    private createAdvancedSection(containerEl: HTMLElement): void {
        new Setting(containerEl).setName('Advanced').setHeading();

        // Enable cache
        new Setting(containerEl)
            .setName('Enable cache')
            .setDesc('Cache transcription results to avoid re-processing')
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.enableCache !== false)
                    .onChange(async (value) => {
                        this.plugin.settings.enableCache = value;
                        await this.plugin.saveSettings();
                    })
            );

        // Debug mode
        new Setting(containerEl)
            .setName('Debug mode')
            .setDesc('Enable debug logging in console')
            .addToggle((toggle) =>
                toggle.setValue(this.plugin.settings.debugMode || false).onChange(async (value) => {
                    this.plugin.settings.debugMode = value;
                    await this.plugin.saveSettings();

                    if (value) {
                        new Notice('Debug mode enabled. Check console for logs.');
                    }
                })
            );

        // Reset settings button
        new Setting(containerEl)
            .setName('Reset to defaults')
            .setDesc('Reset all settings to their default values')
            .addButton((button) =>
                button
                    .setButtonText('Reset')
                    .setWarning()
                    .onClick(() => {
                        new ConfirmationModal(
                            this.app,
                            'Reset settings',
                            'Are you sure you want to reset all settings to defaults?',
                            async () => {
                                // Import default settings
                                const { DEFAULT_SETTINGS } = await import(
                                    '../../domain/models/Settings'
                                );
                                this.plugin.settings = { ...DEFAULT_SETTINGS };
                                await this.plugin.saveSettings();

                                // Refresh the display
                                this.display();
                                new Notice('Settings reset to defaults');
                            }
                        ).open();
                    })
            );
    }

    private createSupportSection(containerEl: HTMLElement): void {
        // 구분선 추가
        containerEl.createEl('hr', { cls: 'speech-to-text-separator' });

        new Setting(containerEl).setName('Support').setHeading();

        // 감사 메시지
        containerEl.createEl('p', {
            text: 'Thank you for using speech-to-text! Your support helps keep this plugin free and actively maintained.',
            cls: 'setting-item-description',
        });

        // Buy me a coffee 버튼
        new Setting(containerEl)
            .setName('Support development')
            .setDesc('If you find this plugin helpful, consider buying me a coffee ☕')
            .addButton((button) =>
                button
                    .setButtonText('☕ buy me a coffee')
                    .setCta()
                    .onClick(() => {
                        window.open('https://buymeacoffee.com/asyouplz', '_blank');
                    })
            );
    }

    private isProviderValue(value: string): value is 'auto' | 'whisper' | 'deepgram' {
        return value === 'auto' || value === 'whisper' || value === 'deepgram';
    }

    private isSelectionStrategy(value: string): value is SelectionStrategy {
        return (
            value === SelectionStrategy.MANUAL ||
            value === SelectionStrategy.COST_OPTIMIZED ||
            value === SelectionStrategy.PERFORMANCE_OPTIMIZED ||
            value === SelectionStrategy.QUALITY_OPTIMIZED ||
            value === SelectionStrategy.ROUND_ROBIN ||
            value === SelectionStrategy.AB_TEST
        );
    }

    private isFallbackStrategy(value: string): value is 'auto' | 'manual' | 'none' {
        return value === 'auto' || value === 'manual' || value === 'none';
    }

    private isInsertPosition(value: string): value is 'cursor' | 'end' | 'beginning' {
        return value === 'cursor' || value === 'end' || value === 'beginning';
    }

    private debug(...args: unknown[]): void {
        if (this.plugin.settings?.debugMode) {
            console.debug('[SettingsTab]', ...args);
        }
    }

    private maskApiKey(key: string): string {
        if (!key || key.length < 10) {
            return '';
        }

        // Show first 7 and last 4 characters
        const visibleStart = 7;
        const visibleEnd = 4;

        if (key.length <= visibleStart + visibleEnd) {
            return key;
        }

        const masked = '*'.repeat(key.length - visibleStart - visibleEnd);
        return key.substring(0, visibleStart) + masked + key.substring(key.length - visibleEnd);
    }
}
/* eslint-enable @typescript-eslint/no-unsafe-enum-comparison -- re-enable after SettingsTab type guards */
