import { App, Plugin, Notice, TFile, Modal, MarkdownView, Menu } from 'obsidian';
import { SpeechToTextSettings, DEFAULT_SETTINGS } from './domain/models/Settings';
import { TranscriptionService } from './core/transcription/TranscriptionService';
import { WhisperService } from './infrastructure/api/WhisperService';
import { AudioProcessor } from './core/transcription/AudioProcessor';
import { TextFormatter } from './core/transcription/TextFormatter';
import { SettingsManager } from './infrastructure/storage/SettingsManager';
import { Logger } from './infrastructure/logging/Logger';
import { ErrorHandler } from './utils/ErrorHandler';
import { StateManager } from './application/StateManager';
import { EventManager } from './application/EventManager';
import { EditorService } from './application/EditorService';
import { TextInsertionHandler } from './application/TextInsertionHandler';
import { FormatOptionsModal } from './ui/formatting/FormatOptions';
import { SettingsTab } from './ui/settings/SettingsTab';

export default class SpeechToTextPlugin extends Plugin {
    settings!: SpeechToTextSettings;
    private transcriptionService!: TranscriptionService;
    private settingsManager!: SettingsManager;
    private stateManager!: StateManager;
    private eventManager!: EventManager;
    private editorService!: EditorService;
    private textInsertionHandler!: TextInsertionHandler;
    private logger!: Logger;
    private errorHandler!: ErrorHandler;

    async onload() {
        console.log('Loading Speech-to-Text plugin');
        
        try {
            // Initialize services
            await this.initializeServices();
            
            // Register commands
            this.registerCommands();
            
            // Register context menu items
            this.registerContextMenu();
            
            // Add settings tab
            this.addSettingTab(new SettingsTab(this.app, this));
            
            // Register event handlers
            this.registerEventHandlers();
            
            // Add status bar item after a short delay to ensure workspace is ready
            this.app.workspace.onLayoutReady(() => {
                this.createStatusBarItem();
            });
            
            new Notice('Speech-to-Text plugin loaded successfully');
        } catch (error) {
            console.error('Failed to load Speech-to-Text plugin:', error);
            new Notice('Failed to load Speech-to-Text plugin. Check console for details.');
        }
    }

    onunload() {
        console.log('Unloading Speech-to-Text plugin');
        
        // Clean up resources
        this.cleanupEventHandlers();
        this.cancelPendingOperations();
        
        // Clean up editor services
        if (this.editorService) {
            this.editorService.destroy();
        }
        if (this.textInsertionHandler) {
            this.textInsertionHandler.destroy();
        }
    }

    private async initializeServices() {
        // Load settings
        await this.loadSettings();
        
        // Initialize core services
        this.logger = new Logger('SpeechToText');
        this.errorHandler = new ErrorHandler(this.logger);
        this.settingsManager = new SettingsManager(this);
        this.stateManager = new StateManager();
        this.eventManager = new EventManager();
        
        // Initialize editor services
        this.editorService = new EditorService(
            this.app,
            this.eventManager,
            this.logger
        );
        
        this.textInsertionHandler = new TextInsertionHandler(
            this.editorService,
            this.eventManager,
            this.logger
        );
        
        // Initialize transcription services
        const whisperService = new WhisperService(
            this.settings.apiKey,
            this.logger
        );
        
        const audioProcessor = new AudioProcessor(
            this.app.vault,
            this.logger
        );
        
        const textFormatter = new TextFormatter(this.settings);
        
        this.transcriptionService = new TranscriptionService(
            whisperService,
            audioProcessor,
            textFormatter,
            this.eventManager,
            this.logger
        );
    }

    private registerContextMenu() {
        // Register context menu for audio files
        this.registerEvent(
            this.app.workspace.on('file-menu', (menu, file) => {
                // Check if the file exists and is an audio file
                if (!file || !(file instanceof TFile)) {
                    return;
                }
                
                const audioExtensions = ['m4a', 'mp3', 'wav', 'mp4', 'webm', 'ogg'];
                if (audioExtensions.includes(file.extension.toLowerCase())) {
                    menu.addItem((item) => {
                        item
                            .setTitle('Transcribe audio file')
                            .setIcon('microphone')
                            .onClick(async () => {
                                await this.transcribeFile(file);
                            });
                    });
                }
            })
        );
    }

    private registerCommands() {
        // Command: Transcribe audio file
        this.addCommand({
            id: 'transcribe-audio-file',
            name: 'Transcribe audio file',
            callback: () => {
                this.showAudioFilePicker();
            }
        });

        // Command: Transcribe from clipboard
        this.addCommand({
            id: 'transcribe-from-clipboard',
            name: 'Transcribe audio from clipboard',
            callback: async () => {
                new Notice('Clipboard transcription not yet implemented');
            }
        });

        // Command: Show formatting options
        this.addCommand({
            id: 'show-format-options',
            name: 'Show text formatting options',
            callback: () => {
                this.showFormatOptions();
            }
        });

        // Command: Show transcription history
        this.addCommand({
            id: 'show-transcription-history',
            name: 'Show transcription history',
            callback: () => {
                new Notice('Transcription history not yet implemented');
            }
        });

        // Command: Cancel current transcription
        this.addCommand({
            id: 'cancel-transcription',
            name: 'Cancel current transcription',
            callback: () => {
                this.transcriptionService.cancel();
                new Notice('Transcription cancelled');
            }
        });

        // Command: Undo last insertion
        this.addCommand({
            id: 'undo-insertion',
            name: 'Undo last text insertion',
            callback: async () => {
                const success = await this.editorService.undo();
                if (success) {
                    new Notice('Text insertion undone');
                } else {
                    new Notice('Nothing to undo');
                }
            }
        });

        // Command: Redo last insertion
        this.addCommand({
            id: 'redo-insertion',
            name: 'Redo last text insertion',
            callback: async () => {
                const success = await this.editorService.redo();
                if (success) {
                    new Notice('Text insertion redone');
                } else {
                    new Notice('Nothing to redo');
                }
            }
        });
    }

    private registerEventHandlers() {
        // Listen to transcription events
        this.eventManager.on('transcription:start', (data) => {
            this.stateManager.setState({ status: 'processing' });
            new Notice(`Transcribing: ${data.fileName}`);
        });

        this.eventManager.on('transcription:complete', async (data) => {
            this.stateManager.setState({ status: 'completed' });
            new Notice('Transcription completed successfully');
            
            // Auto-insert if enabled
            if (this.settings.autoInsert && data.text) {
                await this.insertTranscriptionWithOptions(data.text);
            }
        });

        this.eventManager.on('transcription:error', (data) => {
            this.stateManager.setState({ status: 'error', error: data.error });
            new Notice(`Transcription failed: ${data.error.message}`);
        });

        this.eventManager.on('transcription:progress', (data) => {
            this.stateManager.setState({ progress: data.progress });
        });

        // Listen to editor events
        this.eventManager.on('editor:text-inserted', (data) => {
            this.logger.debug('Text inserted into editor', data);
        });

        this.eventManager.on('editor:text-replaced', (data) => {
            this.logger.debug('Text replaced in editor', data);
        });
    }

    private cleanupEventHandlers() {
        this.eventManager.removeAllListeners();
    }

    private cancelPendingOperations() {
        if (this.transcriptionService) {
            this.transcriptionService.cancel();
        }
    }

    private createStatusBarItem() {
        try {
            // Ensure the app workspace is ready
            if (!this.app.workspace) {
                console.warn('Workspace not ready, skipping status bar creation');
                return;
            }

            // Create status bar item - addStatusBarItem() doesn't take parameters
            const statusBarItem = this.addStatusBarItem();
            
            // Ensure statusBarItem exists before using it
            if (!statusBarItem) {
                console.warn('Failed to create status bar item');
                return;
            }
            
            // Set initial text as empty
            statusBarItem.textContent = '';
            
            // Helper function to safely update text
            const updateStatusText = (text: string) => {
                if (statusBarItem) {
                    try {
                        // Ensure text is a string
                        const safeText = text ? String(text) : '';
                        // Direct text update using textContent
                        statusBarItem.textContent = safeText;
                    } catch (e) {
                        console.warn('Failed to update status bar text:', e);
                    }
                }
            };
            
            // Update status bar based on state
            this.stateManager.subscribe((state) => {
                if (!statusBarItem) {
                    return;
                }
                
                switch (state.status) {
                    case 'idle':
                        updateStatusText('');
                        break;
                    case 'processing':
                        updateStatusText('🎙️ Transcribing...');
                        break;
                    case 'completed':
                        updateStatusText('✅ Transcription complete');
                        // Clear after 3 seconds
                        setTimeout(() => {
                            if (this.stateManager.getState().status === 'completed') {
                                updateStatusText('');
                            }
                        }, 3000);
                        break;
                    case 'error':
                        updateStatusText('❌ Transcription failed');
                        // Clear after 3 seconds
                        setTimeout(() => {
                            if (this.stateManager.getState().status === 'error') {
                                updateStatusText('');
                            }
                        }, 3000);
                        break;
                    default:
                        updateStatusText('');
                        break;
                }
            });
            
            console.log('Status bar item created successfully');
        } catch (error) {
            console.error('Error creating status bar item:', error);
            // Continue without status bar - non-critical feature
        }
    }

    private async showAudioFilePicker() {
        // Get all audio files in vault
        const audioFiles = this.app.vault.getFiles().filter(file => 
            file.extension === 'm4a' || 
            file.extension === 'mp3' || 
            file.extension === 'wav' ||
            file.extension === 'mp4'
        );

        if (audioFiles.length === 0) {
            new Notice('No audio files found in vault');
            return;
        }

        // Show file picker modal
        new AudioFilePickerModal(this.app, audioFiles, async (file) => {
            await this.transcribeFile(file);
        }).open();
    }

    private async transcribeFile(file: TFile) {
        try {
            // Check if API key is configured
            if (!this.settings.apiKey) {
                new Notice('Please configure your OpenAI API key in settings');
                return;
            }

            // Start transcription
            const result = await this.transcriptionService.transcribe(file);
            
            // Show format options or insert directly
            if (this.settings.showFormatOptions) {
                this.showFormatOptionsWithText(result.text);
            } else {
                await this.insertTranscriptionWithOptions(result.text);
            }
            
        } catch (error) {
            this.errorHandler.handle(error);
        }
    }

    private async insertTranscriptionWithOptions(text: string) {
        // Use TextInsertionHandler with current settings
        const options = {
            mode: this.settings.insertPosition === 'cursor' ? 'cursor' as const :
                  this.settings.insertPosition === 'end' ? 'append' as const :
                  this.settings.insertPosition === 'beginning' ? 'prepend' as const : 'cursor' as const,
            format: this.settings.textFormat || 'plain' as const,
            addTimestamp: this.settings.addTimestamp || false,
            timestampFormat: this.settings.timestampFormat,
            language: this.settings.language,
            createNewNote: !this.editorService.hasActiveEditor()
        };

        const success = await this.textInsertionHandler.insertText(text, options);
        
        if (!success) {
            // Fallback to old method
            await this.insertTranscriptionLegacy(text);
        }
    }

    private async insertTranscriptionLegacy(text: string) {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        
        if (!activeView) {
            new Notice('No active editor found. Opening new note...');
            const newFile = await this.app.vault.create(
                `Transcription ${new Date().toISOString()}.md`,
                text
            );
            await this.app.workspace.openLinkText(newFile.path, '', true);
            return;
        }

        const editor = activeView.editor;
        const position = this.settings.insertPosition;

        switch (position) {
            case 'cursor':
                editor.replaceSelection(text);
                break;
            case 'end':
                const lastLine = editor.lastLine();
                const lastLineText = editor.getLine(lastLine);
                editor.setLine(lastLine, lastLineText + '\n\n' + text);
                break;
            case 'beginning':
                const firstLineText = editor.getLine(0);
                editor.setLine(0, text + '\n\n' + firstLineText);
                break;
        }
    }

    private showFormatOptions() {
        // Show format options with empty text (for manual entry)
        this.showFormatOptionsWithText('');
    }

    private showFormatOptionsWithText(text: string) {
        const modal = new FormatOptionsModal(
            this.app,
            {
                mode: 'cursor',
                format: this.settings.textFormat || 'plain',
                addTimestamp: this.settings.addTimestamp || false,
                language: this.settings.language
            },
            async (options) => {
                // Apply formatting and insert
                if (text) {
                    await this.textInsertionHandler.insertText(text, options);
                } else {
                    new Notice('No text to insert');
                }
            },
            () => {
                // Cancelled
                this.logger.debug('Format options cancelled');
            }
        );
        modal.open();
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

// Audio File Picker Modal
class AudioFilePickerModal extends Modal {
    private files: TFile[];
    private onChoose: (file: TFile) => void;

    constructor(app: App, files: TFile[], onChoose: (file: TFile) => void) {
        super(app);
        this.files = files;
        this.onChoose = onChoose;
    }

    onOpen() {
        const { contentEl } = this;
        
        contentEl.createEl('h2', { text: 'Select an audio file to transcribe' });
        
        const listEl = contentEl.createEl('div', { cls: 'speech-to-text-file-list' });
        
        this.files.forEach(file => {
            const itemEl = listEl.createEl('div', { 
                cls: 'speech-to-text-file-item',
                text: file.path 
            });
            
            itemEl.addEventListener('click', () => {
                this.onChoose(file);
                this.close();
            });
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}