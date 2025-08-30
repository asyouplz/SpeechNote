import { Plugin, App, Notice, MarkdownView } from 'obsidian';
import { DependencyContainer, ServiceTokens } from './architecture/DependencyContainer';
import { PluginLifecycleManager, LifecyclePhase, InitializationTask } from './architecture/PluginLifecycleManager';
import { ErrorBoundary } from './architecture/ErrorBoundary';
import { StatusBarManager } from './ui/managers/StatusBarManager';
import { SettingsTabManager } from './ui/managers/SettingsTabManager';
import { Logger } from './infrastructure/logging/Logger';
import { ErrorHandler } from './utils/ErrorHandler';
import { SettingsManager } from './infrastructure/storage/SettingsManager';
import { StateManager } from './application/StateManager';
import { EventManager } from './application/EventManager';
import { EditorService } from './application/EditorService';
import { TextInsertionHandler } from './application/TextInsertionHandler';
import { TranscriptionService } from './core/transcription/TranscriptionService';
import { WhisperService } from './infrastructure/api/WhisperService';
import { AudioProcessor } from './core/transcription/AudioProcessor';
import { TextFormatter } from './core/transcription/TextFormatter';
import { FilePickerModal } from './ui/modals/FilePickerModal';
import { FormatOptionsModal } from './ui/formatting/FormatOptions';
import { DEFAULT_SETTINGS } from './domain/models/Settings';

/**
 * 리팩토링된 Speech to Text 플러그인
 * 체계적인 아키텍처와 에러 처리를 통한 안정성 향상
 */
export default class SpeechToTextPlugin extends Plugin {
    // 아키텍처 컴포넌트
    private container!: DependencyContainer;
    private lifecycleManager!: PluginLifecycleManager;
    private errorBoundary!: ErrorBoundary;
    
    // UI 관리자
    private statusBarManager?: StatusBarManager;
    private settingsTabManager?: SettingsTabManager;
    
    // 핵심 서비스
    private logger!: Logger;
    private settingsManager!: SettingsManager;
    private stateManager!: StateManager;
    private eventManager!: EventManager;
    private editorService!: EditorService;
    private transcriptionService!: TranscriptionService;
    
    // 설정
    public settings: any;
    public manifest = { version: "1.0.0" };

    /**
     * 플러그인 로드
     */
    async onload() {
        console.log('Loading Speech-to-Text plugin (Refactored)');
        
        try {
            // 아키텍처 컴포넌트 초기화
            this.initializeArchitecture();
            
            // 생명주기 작업 등록
            this.registerLifecycleTasks();
            
            // 플러그인 초기화 실행
            await this.lifecycleManager.initialize();
            
            console.log('Speech-to-Text plugin loaded successfully');
            new Notice('Speech-to-Text plugin loaded successfully');
        } catch (error) {
            console.error('Failed to load Speech-to-Text plugin:', error);
            new Notice('Failed to load Speech-to-Text plugin. Check console for details.');
            
            // 최소 기능 모드로 폴백
            await this.fallbackToMinimalMode();
        }
    }

    /**
     * 플러그인 언로드
     */
    async onunload() {
        console.log('Unloading Speech-to-Text plugin');
        
        if (this.lifecycleManager) {
            await this.lifecycleManager.shutdown();
        }
        
        if (this.container) {
            this.container.dispose();
        }
        
        console.log('Speech-to-Text plugin unloaded');
    }

    /**
     * 아키텍처 컴포넌트 초기화
     */
    private initializeArchitecture(): void {
        // 의존성 컨테이너 생성
        this.container = new DependencyContainer();
        
        // 에러 경계 생성
        this.errorBoundary = new ErrorBoundary();
        
        // 생명주기 관리자 생성
        this.lifecycleManager = new PluginLifecycleManager(this.app, this);
        
        // 기본 서비스 등록
        this.registerCoreServices();
    }

    /**
     * 핵심 서비스 등록
     */
    private registerCoreServices(): void {
        // App과 Plugin 인스턴스 등록
        this.container.registerInstance(ServiceTokens.App, this.app);
        this.container.registerInstance(ServiceTokens.Plugin, this);
        
        // Logger
        this.container.registerSingleton(ServiceTokens.Logger, () => {
            return new Logger('SpeechToText');
        });
        
        // ErrorHandler
        this.container.registerSingleton(ServiceTokens.ErrorHandler, (container) => {
            const logger = container.resolve<Logger>(ServiceTokens.Logger);
            return new ErrorHandler(logger);
        });
        
        // StateManager
        this.container.registerSingleton(ServiceTokens.StateManager, () => {
            return new StateManager();
        });
        
        // EventManager
        this.container.registerSingleton(ServiceTokens.EventManager, () => {
            return new EventManager();
        });
        
        // SettingsManager
        this.container.registerSingleton(ServiceTokens.SettingsManager, () => {
            return new SettingsManager(this);
        });
    }

    /**
     * 생명주기 작업 등록
     */
    private registerLifecycleTasks(): void {
        // Phase 1: Core Services 초기화
        this.lifecycleManager.registerTask({
            name: 'LoadSettings',
            phase: LifecyclePhase.INITIALIZING,
            priority: 1,
            execute: async () => {
                await this.loadSettings();
            }
        });

        this.lifecycleManager.registerTask({
            name: 'InitializeCoreServices',
            phase: LifecyclePhase.INITIALIZING,
            priority: 2,
            execute: async () => {
                await this.initializeCoreServices();
            },
            dependencies: ['LoadSettings']
        });

        this.lifecycleManager.registerTask({
            name: 'RegisterCommands',
            phase: LifecyclePhase.INITIALIZING,
            priority: 3,
            execute: async () => {
                this.registerCommands();
            },
            dependencies: ['InitializeCoreServices']
        });

        this.lifecycleManager.registerTask({
            name: 'RegisterEventHandlers',
            phase: LifecyclePhase.INITIALIZING,
            priority: 4,
            execute: async () => {
                this.registerEventHandlers();
            },
            dependencies: ['InitializeCoreServices']
        });

        // Phase 2: UI Components (Workspace 준비 후)
        this.lifecycleManager.registerTask({
            name: 'InitializeStatusBar',
            phase: LifecyclePhase.UI_READY,
            priority: 1,
            execute: async () => {
                await this.initializeStatusBar();
            }
        });

        this.lifecycleManager.registerTask({
            name: 'InitializeSettingsTab',
            phase: LifecyclePhase.UI_READY,
            priority: 2,
            execute: async () => {
                await this.initializeSettingsTab();
            }
        });

        // 정리 핸들러 등록
        this.lifecycleManager.registerCleanupHandler(async () => {
            await this.cleanupServices();
        });
    }

    /**
     * 설정 로드
     */
    private async loadSettings(): Promise<void> {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        this.logger = this.container.resolve<Logger>(ServiceTokens.Logger);
        this.logger.info('Settings loaded');
    }

    /**
     * 핵심 서비스 초기화
     */
    private async initializeCoreServices(): Promise<void> {
        // 서비스 인스턴스 가져오기
        this.logger = this.container.resolve<Logger>(ServiceTokens.Logger);
        this.settingsManager = this.container.resolve<SettingsManager>(ServiceTokens.SettingsManager);
        this.stateManager = this.container.resolve<StateManager>(ServiceTokens.StateManager);
        this.eventManager = this.container.resolve<EventManager>(ServiceTokens.EventManager);
        
        // EditorService 초기화
        this.editorService = new EditorService(
            this.app,
            this.eventManager,
            this.logger
        );
        this.container.registerInstance(ServiceTokens.EditorService, this.editorService);
        
        // TranscriptionService 초기화
        const whisperService = new WhisperService(this.settings.apiKey, this.logger);
        const audioProcessor = new AudioProcessor(this.app.vault, this.logger);
        const textFormatter = new TextFormatter(this.settings);
        
        this.transcriptionService = new TranscriptionService(
            whisperService,
            audioProcessor,
            textFormatter,
            this.eventManager,
            this.logger
        );
        this.container.registerInstance(ServiceTokens.TranscriptionService, this.transcriptionService);
        
        this.logger.info('Core services initialized');
    }

    /**
     * StatusBar 초기화
     */
    private async initializeStatusBar(): Promise<void> {
        await this.errorBoundary.wrap(async () => {
            this.statusBarManager = new StatusBarManager(this, this.stateManager);
            await this.statusBarManager.initialize();
            this.container.registerInstance(ServiceTokens.StatusBarManager, this.statusBarManager);
            this.logger.info('StatusBar initialized');
        }, { component: 'StatusBarManager', operation: 'initialize' });
    }

    /**
     * SettingsTab 초기화
     */
    private async initializeSettingsTab(): Promise<void> {
        await this.errorBoundary.wrap(async () => {
            this.settingsTabManager = new SettingsTabManager(this.app, this);
            await this.settingsTabManager.initialize();
            this.container.registerInstance(ServiceTokens.SettingsTabManager, this.settingsTabManager);
            this.logger.info('SettingsTab initialized');
        }, { component: 'SettingsTabManager', operation: 'initialize' });
    }

    /**
     * 명령어 등록
     */
    private registerCommands(): void {
        // 오디오 파일 변환
        this.addCommand({
            id: 'transcribe-audio',
            name: 'Transcribe audio file',
            callback: () => {
                this.errorBoundary.wrap(
                    () => this.showAudioFilePicker(),
                    { component: 'Command', operation: 'transcribe-audio' }
                );
            }
        });

        // 클립보드 변환
        this.addCommand({
            id: 'transcribe-clipboard',
            name: 'Transcribe audio from clipboard',
            callback: async () => {
                await this.errorBoundary.wrap(
                    async () => {
                        new Notice('Clipboard transcription not yet implemented');
                    },
                    { component: 'Command', operation: 'transcribe-clipboard' }
                );
            }
        });

        // 텍스트 포맷 옵션
        this.addCommand({
            id: 'show-format-options',
            name: 'Show text formatting options',
            callback: () => {
                this.errorBoundary.wrap(
                    () => this.showFormatOptions(),
                    { component: 'Command', operation: 'show-format-options' }
                );
            }
        });

        // 변환 취소
        this.addCommand({
            id: 'cancel-transcription',
            name: 'Cancel current transcription',
            callback: () => {
                this.errorBoundary.wrap(
                    () => {
                        this.transcriptionService.cancel();
                        new Notice('Transcription cancelled');
                    },
                    { component: 'Command', operation: 'cancel-transcription' }
                );
            }
        });

        this.logger.debug('Commands registered');
    }

    /**
     * 이벤트 핸들러 등록
     */
    private registerEventHandlers(): void {
        // 변환 시작
        this.eventManager.on('transcription:start', (data) => {
            this.stateManager.setState({ status: 'processing' });
            new Notice(`Transcribing: ${data.fileName}`);
        });

        // 변환 완료
        this.eventManager.on('transcription:complete', async (data) => {
            this.stateManager.setState({ status: 'completed' });
            new Notice('Transcription completed successfully');
            
            if (this.settings.autoInsert && data.text) {
                await this.insertTranscription(data.text);
            }
        });

        // 변환 에러
        this.eventManager.on('transcription:error', (data) => {
            this.stateManager.setState({ status: 'error', error: data.error });
            new Notice(`Transcription failed: ${data.error.message}`);
        });

        // 진행 상황
        this.eventManager.on('transcription:progress', (data) => {
            this.stateManager.setState({ progress: data.progress });
        });

        this.logger.debug('Event handlers registered');
    }

    /**
     * 오디오 파일 선택기 표시
     */
    private async showAudioFilePicker(): Promise<void> {
        const audioFiles = this.app.vault.getFiles().filter(file => 
            ['m4a', 'mp3', 'wav', 'mp4'].includes(file.extension)
        );

        if (audioFiles.length === 0) {
            new Notice('No audio files found in vault');
            return;
        }

        new FilePickerModal(this.app, audioFiles, async (file) => {
            await this.transcribeFile(file);
        }).open();
    }

    /**
     * 파일 변환
     */
    private async transcribeFile(file: any): Promise<void> {
        if (!this.settings.apiKey) {
            new Notice('Please configure your API key in settings');
            return;
        }

        try {
            const result = await this.transcriptionService.transcribe(file);
            
            if (this.settings.showFormatOptions) {
                this.showFormatOptionsWithText(result.text);
            } else {
                await this.insertTranscription(result.text);
            }
        } catch (error) {
            this.errorBoundary.handleError(
                error as Error,
                { component: 'TranscriptionService', operation: 'transcribe' }
            );
        }
    }

    /**
     * 포맷 옵션 표시
     */
    private showFormatOptions(): void {
        this.showFormatOptionsWithText('');
    }

    /**
     * 텍스트와 함께 포맷 옵션 표시
     */
    private showFormatOptionsWithText(text: string): void {
        new FormatOptionsModal(
            this.app,
            {
                mode: 'cursor',
                format: this.settings.textFormat || 'plain',
                addTimestamp: this.settings.addTimestamp || false,
                language: this.settings.language
            },
            async (options) => {
                if (text) {
                    await this.insertTranscription(text);
                } else {
                    new Notice('No text to insert');
                }
            },
            () => {
                this.logger.debug('Format options cancelled');
            }
        ).open();
    }

    /**
     * 변환 텍스트 삽입
     */
    private async insertTranscription(text: string): Promise<void> {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        
        if (!activeView) {
            // 새 노트 생성
            const fileName = `Transcription ${new Date().toISOString()}.md`;
            const file = await this.app.vault.create(fileName, text);
            await this.app.workspace.openLinkText(file.path, '', true);
            return;
        }

        const editor = activeView.editor;
        
        switch (this.settings.insertPosition) {
            case 'cursor':
                editor.replaceSelection(text);
                break;
            case 'end':
                const lastLine = editor.lastLine();
                const currentText = editor.getLine(lastLine);
                editor.setLine(lastLine, currentText + '\n\n' + text);
                break;
            case 'beginning':
                const firstLineText = editor.getLine(0);
                editor.setLine(0, text + '\n\n' + firstLineText);
                break;
        }
    }

    /**
     * 서비스 정리
     */
    private async cleanupServices(): Promise<void> {
        // StatusBar 정리
        if (this.statusBarManager) {
            this.statusBarManager.dispose();
        }

        // SettingsTab은 Plugin이 자동 정리

        // 이벤트 정리
        if (this.eventManager) {
            this.eventManager.removeAllListeners();
        }

        // EditorService 정리
        if (this.editorService) {
            this.editorService.destroy();
        }

        this.logger.info('Services cleaned up');
    }

    /**
     * 최소 기능 모드로 폴백
     */
    private async fallbackToMinimalMode(): Promise<void> {
        console.log('Falling back to minimal mode');
        
        // 최소한의 명령어만 등록
        this.addCommand({
            id: 'transcribe-audio-minimal',
            name: 'Transcribe audio file (Minimal)',
            callback: () => {
                new Notice('Plugin is running in minimal mode. Please restart Obsidian.');
            }
        });
    }

    /**
     * 설정 저장
     */
    async saveSettings(): Promise<void> {
        await this.saveData(this.settings);
    }
}