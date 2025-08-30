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