import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import type SpeechToTextPlugin from '../../main';

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
        
        // Clear existing content
        containerEl.empty();
        
        // Add main title
        containerEl.createEl('h2', { text: 'Speech to Text Settings' });
        
        try {
            // API Settings Section
            this.createApiSection(containerEl);
            
            // General Settings Section
            this.createGeneralSection(containerEl);
            
            // Audio Settings Section
            this.createAudioSection(containerEl);
            
            // Advanced Settings Section
            this.createAdvancedSection(containerEl);
            
        } catch (error) {
            console.error('Error displaying settings:', error);
            containerEl.empty();
            containerEl.createEl('p', { 
                text: 'Error loading settings. Please reload the plugin.',
                cls: 'mod-warning'
            });
        }
    }

    private createApiSection(containerEl: HTMLElement): void {
        containerEl.createEl('h3', { text: 'API Configuration' });
        
        // API Key setting
        new Setting(containerEl)
            .setName('OpenAI API Key')
            .setDesc('Enter your OpenAI API key for Whisper transcription')
            .addText(text => {
                text
                    .setPlaceholder('sk-...')
                    .setValue(this.maskApiKey(this.plugin.settings.apiKey || ''))
                    .onChange(async (value) => {
                        // Only update if it's a new key (not masked)
                        if (value && !value.includes('*')) {
                            this.plugin.settings.apiKey = value;
                            await this.plugin.saveSettings();
                            
                            // Re-display to show masked version
                            text.setValue(this.maskApiKey(value));
                            new Notice('API key saved');
                        }
                    });
                
                // Add input type password for security
                text.inputEl.type = 'password';
                
                // Show actual value on focus
                text.inputEl.addEventListener('focus', () => {
                    if (this.plugin.settings.apiKey) {
                        text.setValue(this.plugin.settings.apiKey);
                    }
                });
                
                // Mask on blur
                text.inputEl.addEventListener('blur', () => {
                    if (this.plugin.settings.apiKey) {
                        text.setValue(this.maskApiKey(this.plugin.settings.apiKey));
                    }
                });
            });
            
        // API Endpoint (if custom endpoint is supported)
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
        
        // Model selection
        new Setting(containerEl)
            .setName('Whisper Model')
            .setDesc('Select the Whisper model to use (larger models are more accurate but slower)')
            .addDropdown(dropdown => dropdown
                .addOption('whisper-1', 'Whisper v1 (Default)')
                .setValue(this.plugin.settings.model || 'whisper-1')
                .onChange(async (value) => {
                    this.plugin.settings.model = value;
                    await this.plugin.saveSettings();
                }));
        
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