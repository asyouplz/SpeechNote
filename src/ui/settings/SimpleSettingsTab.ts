import { App, PluginSettingTab, Setting } from 'obsidian';
import type SpeechToTextPlugin from '../../main';

/**
 * 단순화된 설정 탭 - 문제 해결을 위한 최소 버전
 */
export class SimpleSettingsTab extends PluginSettingTab {
    plugin: SpeechToTextPlugin;

    constructor(app: App, plugin: SpeechToTextPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        if (!containerEl) {
            this.debug('SimpleSettingsTab display called without container element');
            return;
        }

        this.debug('=== SimpleSettingsTab display() called ===');
        containerEl.empty();

        // 제목
        containerEl.createEl('h2', { text: 'Speech to text settings' });

        // Provider 선택 드롭다운 - 가장 중요한 기능
        containerEl.createEl('h3', { text: 'API configuration' });

        try {
            this.debug('Creating provider dropdown...');

            // Provider 선택
            new Setting(containerEl)
                .setName('Transcription provider')
                .setDesc('Select the speech-to-text provider')
                .addDropdown((dropdown) => {
                    this.debug('Adding options to dropdown...');
                    dropdown
                        .addOption('auto', 'Auto (intelligent selection)')
                        .addOption('whisper', 'OpenAI Whisper')
                        .addOption('deepgram', 'Deepgram')
                        .setValue(this.plugin.settings.provider || 'auto')
                        .onChange(async (value) => {
                            this.debug('Provider changed to:', value);
                            if (this.isProviderValue(value)) {
                                this.plugin.settings.provider = value;
                                await this.plugin.saveSettings();
                                // UI 새로고침
                                this.display();
                            }
                        });
                    this.debug('Dropdown created successfully');
                });

            // 선택된 Provider에 따라 API 키 표시
            const provider = this.plugin.settings.provider || 'auto';
            this.debug('Current provider:', provider);

            // Auto 모드일 때는 양쪽 API 키 모두 표시
            if (provider === 'auto' || provider === 'whisper') {
                new Setting(containerEl)
                    .setName('OpenAI API key')
                    .setDesc('Enter your OpenAI API key for Whisper')
                    .addText((text) =>
                        text
                            .setPlaceholder('sk-...')
                            .setValue(this.plugin.settings.apiKey || '')
                            .onChange(async (value) => {
                                this.plugin.settings.apiKey = value;
                                this.plugin.settings.whisperApiKey = value;
                                await this.plugin.saveSettings();
                            })
                    );
            }

            if (provider === 'auto' || provider === 'deepgram') {
                new Setting(containerEl)
                    .setName('Deepgram API key')
                    .setDesc('Enter your Deepgram API key')
                    .addText((text) =>
                        text
                            .setPlaceholder('Enter Deepgram API key...')
                            .setValue(this.plugin.settings.deepgramApiKey || '')
                            .onChange(async (value) => {
                                this.plugin.settings.deepgramApiKey = value;
                                await this.plugin.saveSettings();
                            })
                    );

                // Deepgram 모델 선택
                if (provider === 'deepgram') {
                    new Setting(containerEl)
                        .setName('Deepgram model')
                        .setDesc('Select the Deepgram model to use')
                        .addDropdown((dropdown) =>
                            dropdown
                                .addOption('nova-2', 'Nova 2 (premium)')
                                .addOption('nova', 'Nova (standard)')
                                .addOption('enhanced', 'Enhanced')
                                .addOption('base', 'Base (economy)')
                                .setValue(
                                    this.plugin.settings.transcription?.deepgram?.model || 'nova-2'
                                )
                                .onChange(async (value) => {
                                    if (!this.plugin.settings.transcription) {
                                        this.plugin.settings.transcription = {};
                                    }
                                    if (!this.plugin.settings.transcription.deepgram) {
                                        this.plugin.settings.transcription.deepgram = {
                                            enabled: true,
                                        };
                                    }
                                    this.plugin.settings.transcription.deepgram.model = value;
                                    await this.plugin.saveSettings();
                                })
                        );
                }
            }

            // 기본 설정들
            containerEl.createEl('h3', { text: 'General settings' });

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
                        .setValue(this.plugin.settings.language || 'auto')
                        .onChange(async (value) => {
                            this.plugin.settings.language = value;
                            await this.plugin.saveSettings();
                        })
                );

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

            // 디버그 정보
            containerEl.createEl('h3', { text: 'Debug information' });

            const debugInfo = {
                provider: this.plugin.settings.provider,
                hasWhisperKey: !!this.plugin.settings.apiKey,
                hasDeepgramKey: !!this.plugin.settings.deepgramApiKey,
                language: this.plugin.settings.language,
                model: this.plugin.settings.model,
                deepgramModel: this.plugin.settings.transcription?.deepgram?.model,
            };

            containerEl.createEl('pre', {
                text: JSON.stringify(debugInfo, null, 2),
                cls: 'debug-info',
            });

            this.debug('=== SimpleSettingsTab rendered successfully ===');
        } catch (error) {
            console.error('Error in SimpleSettingsTab:', error);
            containerEl.createEl('p', {
                text: `Error: ${error}`,
                cls: 'mod-warning',
            });
        }
    }

    private debug(...args: unknown[]): void {
        if (this.plugin.settings?.debugMode) {
            console.debug('[SimpleSettingsTab]', ...args);
        }
    }

    private isProviderValue(value: string): value is 'auto' | 'whisper' | 'deepgram' {
        return value === 'auto' || value === 'whisper' || value === 'deepgram';
    }
}
