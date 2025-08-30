import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import type SpeechToTextPlugin from '../../main';
import { DeepgramSettings } from './components/DeepgramSettings';

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
        
        // Enhanced debugging
        console.log('=== SettingsTab display() called ===');
        console.log('Container element:', containerEl);
        console.log('Container element exists:', !!containerEl);
        console.log('Container element type:', containerEl?.constructor?.name);
        console.log('Plugin instance:', this.plugin);
        console.log('Plugin instance exists:', !!this.plugin);
        console.log('Plugin settings object:', this.plugin?.settings);
        console.log('Plugin settings keys:', this.plugin?.settings ? Object.keys(this.plugin.settings) : 'N/A');
        
        // Check if container is visible
        if (containerEl) {
            console.log('Container parent element:', containerEl.parentElement);
            console.log('Container is connected to DOM:', containerEl.isConnected);
            console.log('Container display style:', window.getComputedStyle(containerEl).display);
        }
        
        // Clear existing content
        containerEl.empty();
        
        // Add main title
        const titleEl = containerEl.createEl('h2', { text: 'Speech to Text Settings' });
        console.log('Title element created:', titleEl);
        
        // Add debug info section at the top
        const debugSection = containerEl.createEl('details', { cls: 'speech-to-text-debug' });
        const debugSummary = debugSection.createEl('summary', { text: 'Debug Information' });
        const debugContent = debugSection.createEl('pre', { 
            text: JSON.stringify({
                pluginExists: !!this.plugin,
                settingsExists: !!this.plugin?.settings,
                apiKey: this.plugin?.settings?.apiKey ? 'Set (hidden)' : 'Not set',
                language: this.plugin?.settings?.language || 'Not set',
                autoInsert: this.plugin?.settings?.autoInsert,
                insertPosition: this.plugin?.settings?.insertPosition,
                model: this.plugin?.settings?.model,
                timestamp: new Date().toISOString()
            }, null, 2)
        });
        console.log('Debug section added');
        
        try {
            // API Settings Section
            console.log('Creating API section...');
            this.createApiSection(containerEl);
            console.log('API section created');
            
            // General Settings Section
            console.log('Creating General section...');
            this.createGeneralSection(containerEl);
            console.log('General section created');
            
            // Audio Settings Section
            console.log('Creating Audio section...');
            this.createAudioSection(containerEl);
            console.log('Audio section created');
            
            // Advanced Settings Section
            console.log('Creating Advanced section...');
            this.createAdvancedSection(containerEl);
            console.log('Advanced section created');
            
            console.log('=== Settings tab rendered successfully ===');
            console.log('Total child elements:', containerEl.children.length);
            
        } catch (error) {
            console.error('=== Error displaying settings ===');
            console.error('Error details:', error);
            console.error('Error stack:', error instanceof Error ? error.stack : 'N/A');
            
            containerEl.empty();
            containerEl.createEl('h2', { text: 'Settings Error' });
            containerEl.createEl('p', { 
                text: 'Error loading settings. Please reload the plugin.',
                cls: 'mod-warning'
            });
            containerEl.createEl('pre', { 
                text: `Error: ${error instanceof Error ? error.message : String(error)}`,
                cls: 'error-details'
            });
        }
    }

    private createApiSection(containerEl: HTMLElement): void {
        containerEl.createEl('h3', { text: 'API Configuration' });
        
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
        console.log('=== createProviderSelection called ===');
        console.log('Creating Setting instance...');
        
        try {
            const setting = new Setting(containerEl);
            console.log('Setting instance created:', setting);
            console.log('Setting element:', setting.settingEl);
            console.log('Setting element in DOM:', setting.settingEl?.isConnected);
            
            setting
                .setName('Transcription Provider')
                .setDesc('Select the speech-to-text provider')
                .addDropdown(dropdown => {
                    console.log('Dropdown callback called');
                    console.log('Dropdown component:', dropdown);
                    
                    dropdown
                    .addOption('auto', 'Auto (Intelligent Selection)')
                    .addOption('whisper', 'OpenAI Whisper')
                    .addOption('deepgram', 'Deepgram')
                    .setValue(this.plugin.settings.provider || 'auto')
                    .onChange(async (value) => {
                        console.log('Provider dropdown changed to:', value);
                        this.plugin.settings.provider = value as 'auto' | 'whisper' | 'deepgram';
                        await this.plugin.saveSettings();
                        
                        // Provider별 설정 UI 업데이트
                        const settingsContainer = containerEl.parentElement?.querySelector('.provider-settings') as HTMLElement;
                        console.log('Settings container found:', !!settingsContainer);
                        
                        if (settingsContainer) {
                            console.log('Updating provider settings UI for:', value);
                            this.renderProviderSettings(settingsContainer, value as 'auto' | 'whisper' | 'deepgram');
                        } else {
                            console.error('Could not find .provider-settings container');
                        }
                        
                        // Provider 정보 업데이트
                        const infoEl = containerEl.querySelector('.provider-info') as HTMLElement;
                        if (infoEl) {
                            this.updateProviderInfo(infoEl, value as 'auto' | 'whisper' | 'deepgram');
                        }
                        
                        new Notice(`Provider changed to: ${value}`);
                    });
                    
                    console.log('Dropdown setup complete');
                    console.log('Dropdown element:', dropdown.selectEl);
                    console.log('Dropdown options:', dropdown.selectEl?.options.length);
                });
            
            console.log('Provider selection setting created successfully');
            console.log('=== createProviderSelection completed ===');
        } catch (error) {
            console.error('Error creating provider selection:', error);
            console.error('Error stack:', error instanceof Error ? error.stack : 'N/A');
        }
        
        // Provider 설명
        const infoEl = containerEl.createEl('div', { cls: 'provider-info' });
        infoEl.style.cssText = 'margin: 10px 0; padding: 10px; background: var(--background-secondary); border-radius: 4px;';
        this.updateProviderInfo(infoEl, this.plugin.settings.provider || 'auto');
    }
    
    private renderProviderSettings(containerEl: HTMLElement, provider: 'auto' | 'whisper' | 'deepgram'): void {
        console.log('=== renderProviderSettings called ===');
        console.log('Provider:', provider);
        console.log('Container element:', containerEl);
        
        // 컨테이너를 비우기 전에 상태 저장
        const wasConnected = containerEl.isConnected;
        containerEl.empty();
        
        console.log('Container cleared, still connected:', wasConnected);
        
        try {
            switch (provider) {
                case 'auto':
                    console.log('Rendering auto provider settings');
                    this.renderAutoProviderSettings(containerEl);
                    break;
                case 'whisper':
                    console.log('Rendering whisper settings');
                    this.renderWhisperSettings(containerEl);
                    break;
                case 'deepgram':
                    console.log('Rendering deepgram settings');
                    this.renderDeepgramSettings(containerEl);
                    break;
                default:
                    console.warn('Unknown provider:', provider);
                    containerEl.createEl('p', {
                        text: `Unknown provider: ${provider}`,
                        cls: 'mod-warning'
                    });
            }
        } catch (error) {
            console.error('Error rendering provider settings:', error);
            containerEl.createEl('p', {
                text: 'Error loading provider settings',
                cls: 'mod-warning'
            });
        }
        
        console.log('Final container children:', containerEl.children.length);
        console.log('=== renderProviderSettings completed ===');
    }
    
    private renderAutoProviderSettings(containerEl: HTMLElement): void {
        containerEl.createEl('h4', { text: 'Automatic Provider Selection' });
        
        // Selection Strategy
        new Setting(containerEl)
            .setName('Selection Strategy')
            .setDesc('How to choose between available providers')
            .addDropdown(dropdown => {
                dropdown
                    .addOption('cost_optimized', 'Cost Optimized')
                    .addOption('performance_optimized', 'Performance Optimized')
                    .addOption('quality_optimized', 'Quality Optimized')
                    .addOption('balanced', 'Balanced')
                    .setValue(this.plugin.settings.selectionStrategy || 'performance_optimized')
                    .onChange(async (value) => {
                        this.plugin.settings.selectionStrategy = value as any;
                        await this.plugin.saveSettings();
                    });
            });
        
        // Fallback 전략
        new Setting(containerEl)
            .setName('Fallback Strategy')
            .setDesc('What to do when primary provider fails')
            .addDropdown(dropdown => {
                dropdown
                    .addOption('auto', 'Automatic Fallback')
                    .addOption('manual', 'Ask User')
                    .addOption('none', 'No Fallback')
                    .setValue(this.plugin.settings.fallbackStrategy || 'auto')
                    .onChange(async (value) => {
                        this.plugin.settings.fallbackStrategy = value as 'auto' | 'manual' | 'none';
                        await this.plugin.saveSettings();
                    });
            });
        
        // API Keys for both providers
        containerEl.createEl('h5', { text: 'Provider API Keys' });
        containerEl.createEl('p', { 
            text: 'Configure API keys for each provider to enable automatic selection',
            cls: 'setting-item-description'
        });
        
        // Whisper API Key
        this.renderWhisperApiKey(containerEl);
        
        // Deepgram API Key  
        this.renderDeepgramApiKey(containerEl);
    }
    
    private renderWhisperSettings(containerEl: HTMLElement): void {
        containerEl.createEl('h4', { text: 'OpenAI Whisper Configuration' });
        
        // Whisper API Key
        this.renderWhisperApiKey(containerEl);
        
        // API Endpoint
        new Setting(containerEl)
            .setName('API Endpoint')
            .setDesc('OpenAI API endpoint (leave default unless using custom endpoint)')
            .addText(text => text
                .setPlaceholder('https://api.openai.com/v1')
                .setValue(this.plugin.settings.apiEndpoint || 'https://api.openai.com/v1')
                .onChange(async (value) => {
                    this.plugin.settings.apiEndpoint = value || 'https://api.openai.com/v1';
                    await this.plugin.saveSettings();
                }));
    }
    
    private renderDeepgramSettings(containerEl: HTMLElement): void {
        console.log('=== renderDeepgramSettings called ===');
        console.log('Container element:', containerEl);
        console.log('Container is connected:', containerEl.isConnected);
        console.log('Container children before:', containerEl.children.length);
        
        // 먼저 컨테이너를 비웁니다
        containerEl.empty();
        
        // Deepgram 전용 컨테이너 생성
        const deepgramContainer = containerEl.createEl('div', {
            cls: 'deepgram-settings-container'
        });
        
        console.log('Deepgram container created:', deepgramContainer);
        
        try {
            // Deepgram 설정 컴포넌트 사용
            const deepgramSettings = new DeepgramSettings(this.plugin, deepgramContainer);
            console.log('DeepgramSettings instance created');
            
            deepgramSettings.render();
            console.log('DeepgramSettings.render() completed');
            
        } catch (error) {
            console.error('Error rendering Deepgram settings:', error);
            deepgramContainer.createEl('p', {
                text: 'Error loading Deepgram settings',
                cls: 'mod-warning'
            });
        }
        
        console.log('Container children after:', containerEl.children.length);
        console.log('=== renderDeepgramSettings completed ===');
    }
    
    private renderWhisperApiKey(containerEl: HTMLElement): void {
        new Setting(containerEl)
            .setName('OpenAI API Key')
            .setDesc('Enter your OpenAI API key for Whisper transcription')
            .addText(text => {
                text
                    .setPlaceholder('sk-...')
                    .setValue(this.maskApiKey(this.plugin.settings.apiKey || ''))
                    .onChange(async (value) => {
                        if (value && !value.includes('*')) {
                            this.plugin.settings.apiKey = value;
                            this.plugin.settings.whisperApiKey = value; // 호환성을 위해 양쪽에 저장
                            await this.plugin.saveSettings();
                            
                            text.setValue(this.maskApiKey(value));
                            new Notice('OpenAI API key saved');
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
            .setName('Deepgram API Key')
            .setDesc('Enter your Deepgram API key for transcription')
            .addText(text => {
                text
                    .setPlaceholder('Enter Deepgram API key...')
                    .setValue(this.maskApiKey(this.plugin.settings.deepgramApiKey || ''))
                    .onChange(async (value) => {
                        if (value && !value.includes('*')) {
                            this.plugin.settings.deepgramApiKey = value;
                            await this.plugin.saveSettings();
                            
                            text.setValue(this.maskApiKey(value));
                            new Notice('Deepgram API key saved');
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
    
    private updateProviderInfo(infoEl: HTMLElement, provider: 'auto' | 'whisper' | 'deepgram'): void {
        infoEl.empty();
        
        const descriptions = {
            auto: '🤖 Intelligent selection between providers based on your configured strategy. Automatically chooses the best provider for each request.',
            whisper: '🎯 OpenAI Whisper - High-quality transcription with support for multiple languages. Best for general-purpose transcription.',
            deepgram: '⚡ Deepgram - Fast, accurate transcription with advanced AI features. Best for real-time processing and speaker diarization.'
        };
        
        infoEl.createEl('p', { text: descriptions[provider] });
    }

    private createGeneralSection(containerEl: HTMLElement): void {
        containerEl.createEl('h3', { text: 'General Settings' });
        
        // Language setting
        new Setting(containerEl)
            .setName('Language')
            .setDesc('Primary language for transcription')
            .addDropdown(dropdown => dropdown
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
                }));
        
        // Auto-insert setting
        new Setting(containerEl)
            .setName('Auto-insert transcription')
            .setDesc('Automatically insert transcribed text into the active note')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoInsert || false)
                .onChange(async (value) => {
                    this.plugin.settings.autoInsert = value;
                    await this.plugin.saveSettings();
                }));
        
        // Insert position
        new Setting(containerEl)
            .setName('Insert position')
            .setDesc('Where to insert transcribed text')
            .addDropdown(dropdown => dropdown
                .addOption('cursor', 'At cursor position')
                .addOption('end', 'At end of note')
                .addOption('beginning', 'At beginning of note')
                .setValue(this.plugin.settings.insertPosition || 'cursor')
                .onChange(async (value) => {
                    this.plugin.settings.insertPosition = value as 'cursor' | 'end' | 'beginning';
                    await this.plugin.saveSettings();
                }));
        
        // Show format options
        new Setting(containerEl)
            .setName('Show format options')
            .setDesc('Show formatting options before inserting text')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showFormatOptions || false)
                .onChange(async (value) => {
                    this.plugin.settings.showFormatOptions = value;
                    await this.plugin.saveSettings();
                }));
    }

    private createAudioSection(containerEl: HTMLElement): void {
        containerEl.createEl('h3', { text: 'Audio Settings' });
        
        // Model selection - Provider에 따라 다르게 표시
        const provider = this.plugin.settings.provider || 'auto';
        if (provider === 'whisper' || provider === 'auto') {
            new Setting(containerEl)
                .setName('Whisper Model')
                .setDesc('Select the Whisper model to use')
                .addDropdown(dropdown => dropdown
                    .addOption('whisper-1', 'Whisper v1 (Default)')
                    .setValue(this.plugin.settings.model || 'whisper-1')
                    .onChange(async (value) => {
                        this.plugin.settings.model = value;
                        await this.plugin.saveSettings();
                    }));
        }
        
        // Temperature setting
        new Setting(containerEl)
            .setName('Temperature')
            .setDesc('Sampling temperature (0-1). Lower values make output more focused and deterministic')
            .addText(text => text
                .setPlaceholder('0.0')
                .setValue(String(this.plugin.settings.temperature || 0))
                .onChange(async (value) => {
                    const temp = parseFloat(value);
                    if (!isNaN(temp) && temp >= 0 && temp <= 1) {
                        this.plugin.settings.temperature = temp;
                        await this.plugin.saveSettings();
                    }
                }));
        
        // Add timestamp
        new Setting(containerEl)
            .setName('Add timestamp')
            .setDesc('Add timestamp to transcribed text')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.addTimestamp || false)
                .onChange(async (value) => {
                    this.plugin.settings.addTimestamp = value;
                    await this.plugin.saveSettings();
                }));
    }

    private createAdvancedSection(containerEl: HTMLElement): void {
        containerEl.createEl('h3', { text: 'Advanced Settings' });
        
        // Enable cache
        new Setting(containerEl)
            .setName('Enable cache')
            .setDesc('Cache transcription results to avoid re-processing')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableCache !== false)
                .onChange(async (value) => {
                    this.plugin.settings.enableCache = value;
                    await this.plugin.saveSettings();
                }));
        
        // Debug mode
        new Setting(containerEl)
            .setName('Debug mode')
            .setDesc('Enable debug logging in console')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.debugMode || false)
                .onChange(async (value) => {
                    this.plugin.settings.debugMode = value;
                    await this.plugin.saveSettings();
                    
                    if (value) {
                        new Notice('Debug mode enabled. Check console for logs.');
                    }
                }));
        
        // Reset settings button
        new Setting(containerEl)
            .setName('Reset to defaults')
            .setDesc('Reset all settings to their default values')
            .addButton(button => button
                .setButtonText('Reset')
                .setWarning()
                .onClick(async () => {
                    const confirmed = confirm('Are you sure you want to reset all settings to defaults?');
                    if (confirmed) {
                        // Import default settings
                        const { DEFAULT_SETTINGS } = await import('../../domain/models/Settings');
                        this.plugin.settings = { ...DEFAULT_SETTINGS };
                        await this.plugin.saveSettings();
                        
                        // Refresh the display
                        this.display();
                        new Notice('Settings reset to defaults');
                    }
                }));
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