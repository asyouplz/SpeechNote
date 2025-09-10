import { Plugin, Notice, PluginSettingTab, App, MarkdownView, Modal, Setting, ButtonComponent, TFile } from 'obsidian';

// 기본 설정 인터페이스
interface SpeechToTextSettings {
    provider: string;
    apiKey: string;
    whisperApiKey: string;
    deepgramApiKey: string;
    language: string;
    enableCache: boolean;
    insertPosition: 'cursor' | 'end' | 'beginning';
    textFormat: string;
    addTimestamp: boolean;
    timestampFormat: string;
    autoInsert: boolean;
    showFormatOptions: boolean;
    selectionStrategy: string;
    costLimit: number;
    qualityThreshold: number;
    abTestEnabled: boolean;
    abTestSplit: number;
}

const DEFAULT_SETTINGS: SpeechToTextSettings = {
    provider: 'auto',
    apiKey: '',
    whisperApiKey: '',
    deepgramApiKey: '',
    language: 'auto',
    enableCache: true,
    insertPosition: 'cursor',
    textFormat: 'plain',
    addTimestamp: false,
    timestampFormat: 'YYYY-MM-DD HH:mm:ss',
    autoInsert: true,
    showFormatOptions: false,
    selectionStrategy: 'performance_optimized',
    costLimit: 10,
    qualityThreshold: 0.9,
    abTestEnabled: false,
    abTestSplit: 0.5
};

// 메인 플러그인 클래스
export default class SpeechToTextPlugin extends Plugin {
    settings: SpeechToTextSettings = DEFAULT_SETTINGS;
    statusBarItem: HTMLElement | null = null;
    stateManager: any;
    eventManager: any;
    editorService: any;
    textInsertionHandler: any;
    transcriptionService: any;
    logger: any;
    errorHandler: any;
    settingsManager: any;

    async onload() {
        console.log('Loading Speech-to-Text plugin');
        
        try {
            // 1. 설정 먼저 로드
            await this.loadSettings();
            
            // 2. 서비스 초기화
            await this.initializeServices();
            
            // 3. 명령어 등록
            this.registerCommands();
            
            // 4. 설정 탭 등록 - 올바른 방식으로
            this.addSettingTab(new SpeechToTextSettingTab(this.app, this));
            
            // 5. 이벤트 핸들러 등록
            this.registerEventHandlers();
            
            // 6. UI가 준비된 후 StatusBar 생성
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
        
        // StatusBar 아이템 제거
        if (this.statusBarItem) {
            this.statusBarItem.remove();
        }
        
        // 이벤트 핸들러 정리
        this.cleanupEventHandlers();
        
        // 서비스 정리
        if (this.editorService) {
            this.editorService.destroy();
        }
        if (this.textInsertionHandler) {
            this.textInsertionHandler.destroy();
        }
    }

    async initializeServices() {
        // 임시 구현 - 실제 서비스는 나중에 구현
        this.stateManager = {
            subscribe: (callback: Function) => {
                // 상태 관리자 구독 로직
            },
            setState: (state: any) => {
                // 상태 설정 로직
            }
        };
        
        this.eventManager = {
            on: (event: string, callback: Function) => {
                // 이벤트 리스너 등록
            },
            removeAllListeners: () => {
                // 모든 리스너 제거
            }
        };
    }

    registerCommands() {
        // 명령어 등록
        this.addCommand({
            id: 'transcribe-audio',
            name: 'Transcribe audio file',
            callback: () => {
                this.showAudioFilePicker();
            }
        });

        this.addCommand({
            id: 'show-settings',
            name: 'Open Speech-to-Text settings',
            callback: () => {
                // @ts-ignore - 옵시디언 내부 API
                this.app.setting.open();
                // @ts-ignore
                this.app.setting.openTabById(this.manifest.id);
            }
        });
    }

    registerEventHandlers() {
        // 이벤트 핸들러 등록
        this.eventManager.on('transcription:start', (data: any) => {
            this.updateStatusBar('🎙️ Transcribing...');
        });

        this.eventManager.on('transcription:complete', (data: any) => {
            this.updateStatusBar('✅ Complete');
            setTimeout(() => this.updateStatusBar(''), 3000);
        });

        this.eventManager.on('transcription:error', (data: any) => {
            this.updateStatusBar('❌ Error');
            setTimeout(() => this.updateStatusBar(''), 3000);
        });
    }

    cleanupEventHandlers() {
        if (this.eventManager) {
            this.eventManager.removeAllListeners();
        }
    }

    /**
     * StatusBar 아이템 생성 - 올바른 방식
     */
    createStatusBarItem() {
        try {
            if (!this.app.workspace) {
                console.warn('Workspace not ready, skipping status bar creation');
                return;
            }

            // addStatusBarItem()은 HTMLElement를 반환
            this.statusBarItem = this.addStatusBarItem();
            
            if (!this.statusBarItem) {
                console.warn('Failed to create status bar item');
                return;
            }

            // 초기 텍스트 설정
            this.statusBarItem.setText('Speech-to-Text Ready');
            
            // 클릭 이벤트 추가 (선택사항)
            this.statusBarItem.onClickEvent(() => {
                new Notice('Speech-to-Text: Click to start recording');
            });

            // 상태 관리자 구독
            if (this.stateManager) {
                this.stateManager.subscribe((state: any) => {
                    this.updateStatusBarFromState(state);
                });
            }
        } catch (error) {
            console.error('Error creating status bar item:', error);
        }
    }

    /**
     * StatusBar 텍스트 업데이트 - 올바른 방식
     */
    updateStatusBar(text: string) {
        if (this.statusBarItem) {
            // HTMLElement의 setText 메서드 사용 (옵시디언이 확장한 메서드)
            // 또는 textContent/innerText 직접 사용
            if ('setText' in this.statusBarItem) {
                (this.statusBarItem as any).setText(text);
            } else {
                // Fallback: DOM API 직접 사용
                (this.statusBarItem as HTMLElement).textContent = text;
            }
        }
    }

    updateStatusBarFromState(state: any) {
        if (!this.statusBarItem) return;

        switch (state.status) {
            case 'idle':
                this.updateStatusBar('');
                break;
            case 'processing':
                this.updateStatusBar('🎙️ Transcribing...');
                break;
            case 'completed':
                this.updateStatusBar('✅ Complete');
                setTimeout(() => this.updateStatusBar(''), 3000);
                break;
            case 'error':
                this.updateStatusBar('❌ Error');
                setTimeout(() => this.updateStatusBar(''), 3000);
                break;
        }
    }

    async showAudioFilePicker() {
        const audioFiles = this.app.vault.getFiles().filter(
            file => ['m4a', 'mp3', 'wav', 'mp4'].includes(file.extension)
        );

        if (audioFiles.length === 0) {
            new Notice('No audio files found in vault');
            return;
        }

        new AudioFilePickerModal(this.app, audioFiles, async (file) => {
            await this.transcribeFile(file);
        }).open();
    }

    async transcribeFile(file: TFile) {
        new Notice(`Transcribing ${file.name}...`);
        // 실제 transcription 로직은 나중에 구현
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

// 설정 탭 클래스 - 올바른 구현
class SpeechToTextSettingTab extends PluginSettingTab {
    plugin: SpeechToTextPlugin;

    constructor(app: App, plugin: SpeechToTextPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        
        // 설정 헤더
        containerEl.createEl('h2', { text: 'Speech-to-Text 설정' });
        containerEl.createEl('p', { 
            text: '음성을 텍스트로 변환하는 플러그인 설정을 구성합니다.',
            cls: 'setting-item-description'
        });

        // Provider 설정
        new Setting(containerEl)
            .setName('Provider')
            .setDesc('음성 인식 서비스 제공자를 선택하세요')
            .addDropdown(dropdown => dropdown
                .addOption('auto', '자동 선택')
                .addOption('whisper', 'OpenAI Whisper')
                .addOption('deepgram', 'Deepgram')
                .setValue(this.plugin.settings.provider)
                .onChange(async (value) => {
                    this.plugin.settings.provider = value;
                    await this.plugin.saveSettings();
                    this.display(); // 화면 새로고침
                }));

        // Whisper API Key (provider가 whisper 또는 auto일 때만 표시)
        if (this.plugin.settings.provider === 'whisper' || this.plugin.settings.provider === 'auto') {
            new Setting(containerEl)
                .setName('OpenAI Whisper API Key')
                .setDesc('OpenAI API 키를 입력하세요')
                .addText(text => {
                    text.setPlaceholder('sk-...')
                        .setValue(this.maskApiKey(this.plugin.settings.whisperApiKey))
                        .onChange(async (value) => {
                            if (!value.includes('***')) {
                                this.plugin.settings.whisperApiKey = value;
                                await this.plugin.saveSettings();
                            }
                        });
                    text.inputEl.type = 'password';
                })
                .addButton(button => button
                    .setButtonText('표시/숨기기')
                    .onClick(() => {
                        const input = containerEl.querySelector('.setting-item:has([placeholder="sk-..."]) input') as HTMLInputElement;
                        if (input) {
                            input.type = input.type === 'password' ? 'text' : 'password';
                            if (input.type === 'text') {
                                input.value = this.plugin.settings.whisperApiKey;
                            } else {
                                input.value = this.maskApiKey(this.plugin.settings.whisperApiKey);
                            }
                        }
                    }));
        }

        // Deepgram API Key (provider가 deepgram 또는 auto일 때만 표시)
        if (this.plugin.settings.provider === 'deepgram' || this.plugin.settings.provider === 'auto') {
            new Setting(containerEl)
                .setName('Deepgram API Key')
                .setDesc('Deepgram API 키를 입력하세요')
                .addText(text => {
                    text.setPlaceholder('Enter your Deepgram API key')
                        .setValue(this.maskApiKey(this.plugin.settings.deepgramApiKey))
                        .onChange(async (value) => {
                            if (!value.includes('***')) {
                                this.plugin.settings.deepgramApiKey = value;
                                await this.plugin.saveSettings();
                            }
                        });
                    text.inputEl.type = 'password';
                });
        }

        // 언어 설정
        new Setting(containerEl)
            .setName('언어')
            .setDesc('음성 인식 언어를 선택하세요')
            .addDropdown(dropdown => dropdown
                .addOption('auto', '자동 감지')
                .addOption('ko', '한국어')
                .addOption('en', 'English')
                .addOption('ja', '日本語')
                .addOption('zh', '中文')
                .setValue(this.plugin.settings.language)
                .onChange(async (value) => {
                    this.plugin.settings.language = value;
                    await this.plugin.saveSettings();
                }));

        // 텍스트 삽입 위치
        new Setting(containerEl)
            .setName('텍스트 삽입 위치')
            .setDesc('변환된 텍스트를 삽입할 위치를 선택하세요')
            .addDropdown(dropdown => dropdown
                .addOption('cursor', '커서 위치')
                .addOption('end', '문서 끝')
                .addOption('beginning', '문서 시작')
                .setValue(this.plugin.settings.insertPosition)
                .onChange(async (value: string) => {
                    this.plugin.settings.insertPosition = value as "cursor" | "end" | "beginning";
                    await this.plugin.saveSettings();
                }));

        // 캐시 활성화
        new Setting(containerEl)
            .setName('캐시 사용')
            .setDesc('음성 인식 결과를 캐시하여 성능을 향상시킵니다')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableCache)
                .onChange(async (value) => {
                    this.plugin.settings.enableCache = value;
                    await this.plugin.saveSettings();
                }));

        // 타임스탬프 추가
        new Setting(containerEl)
            .setName('타임스탬프 추가')
            .setDesc('변환된 텍스트에 타임스탬프를 추가합니다')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.addTimestamp)
                .onChange(async (value) => {
                    this.plugin.settings.addTimestamp = value;
                    await this.plugin.saveSettings();
                }));

        // 설정 내보내기/가져오기 버튼
        const buttonContainer = containerEl.createDiv('setting-item');
        
        new ButtonComponent(buttonContainer)
            .setButtonText('설정 내보내기')
            .onClick(() => this.exportSettings());
        
        new ButtonComponent(buttonContainer)
            .setButtonText('설정 가져오기')
            .onClick(() => this.importSettings());
        
        new ButtonComponent(buttonContainer)
            .setButtonText('기본값으로 초기화')
            .setWarning()
            .onClick(() => this.resetSettings());
    }

    maskApiKey(key: string): string {
        if (!key || key.length < 10) return '';
        return key.substring(0, 5) + '***' + key.substring(key.length - 4);
    }

    async exportSettings() {
        const settings = { ...this.plugin.settings };
        delete (settings as any).whisperApiKey;
        delete (settings as any).deepgramApiKey;
        
        const json = JSON.stringify(settings, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `speech-to-text-settings-${Date.now()}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        new Notice('설정을 내보냈습니다');
    }

    async importSettings() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            
            try {
                const text = await file.text();
                const settings = JSON.parse(text);
                
                // API 키는 보존
                const currentWhisperKey = this.plugin.settings.whisperApiKey;
                const currentDeepgramKey = this.plugin.settings.deepgramApiKey;
                
                Object.assign(this.plugin.settings, settings);
                
                this.plugin.settings.whisperApiKey = currentWhisperKey;
                this.plugin.settings.deepgramApiKey = currentDeepgramKey;
                
                await this.plugin.saveSettings();
                this.display();
                new Notice('설정을 가져왔습니다');
            } catch (error) {
                new Notice('설정 가져오기 실패');
                console.error(error);
            }
        };
        
        input.click();
    }

    async resetSettings() {
        if (confirm('모든 설정을 기본값으로 초기화하시겠습니까?')) {
            this.plugin.settings = Object.assign({}, DEFAULT_SETTINGS);
            await this.plugin.saveSettings();
            this.display();
            new Notice('설정이 초기화되었습니다');
        }
    }
}

// 오디오 파일 선택 모달
class AudioFilePickerModal extends Modal {
    files: TFile[];
    onChoose: (file: TFile) => void;

    constructor(app: App, files: TFile[], onChoose: (file: TFile) => void) {
        super(app);
        this.files = files;
        this.onChoose = onChoose;
    }

    onOpen() {
        const { contentEl } = this;
        
        contentEl.createEl('h2', { text: 'Select an audio file to transcribe' });
        
        const fileList = contentEl.createEl('div', { cls: 'speech-to-text-file-list' });
        
        this.files.forEach(file => {
            const fileItem = fileList.createEl('div', {
                cls: 'speech-to-text-file-item',
                text: file.path
            });
            
            fileItem.addEventListener('click', () => {
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