import { App, Modal, TFile, Setting, Notice } from 'obsidian';
import { FileValidator } from '../components/FileValidator';
import { FileBrowser } from '../components/FileBrowser';
import { DragDropZone } from '../components/DragDropZone';
import { RecentFiles } from '../components/RecentFiles';
import { ProgressIndicator } from '../components/ProgressIndicator';
import { EventHandlers } from '../components/EventHandlers';
import { ILogger } from '../../infrastructure/logging/Logger';
import { EventListenerManager } from '../../utils/memory/MemoryManager';
import { debounceAsync } from '../../utils/async/AsyncManager';

export interface FilePickerOptions {
    title?: string;
    accept?: string[];
    maxFileSize?: number;
    multiple?: boolean;
    showRecentFiles?: boolean;
    enableDragDrop?: boolean;
}

export interface FilePickerResult {
    file: TFile;
    validation: ValidationResult;
}

export interface ValidationError {
    code: string;
    message: string;
    field?: string;
}

export interface ValidationWarning {
    code: string;
    message: string;
}

export interface ValidationResult {
    valid: boolean;
    errors?: ValidationError[];
    warnings?: ValidationWarning[];
    metadata?: FileMetadata;
}

export interface FileMetadata {
    path: string;
    name: string;
    extension: string;
    size: number;
    sizeFormatted: string;
    created: Date;
    modified: Date;
}

/**
 * 리팩토링된 파일 선택 모달
 * - AutoDisposable 패턴 적용
 * - 메서드 분리로 복잡도 감소
 * - 이벤트 관리 개선
 */
export class FilePickerModalRefactored extends Modal {
    // Dependencies
    private readonly options: Required<FilePickerOptions>;
    private readonly onChoose: (files: FilePickerResult[]) => void;
    private readonly onCancel: () => void;
    private readonly logger?: ILogger;

    // Components
    private components: FilePickerComponents;

    // State
    private state: FilePickerState;

    // Memory Management
    private disposables: AutoDisposableManager;
    private eventManager: EventListenerManager;

    constructor(
        app: App,
        options: FilePickerOptions,
        onChoose: (files: FilePickerResult[]) => void,
        onCancel: () => void,
        logger?: ILogger
    ) {
        super(app);
        this.options = this.mergeOptions(options);
        this.onChoose = onChoose;
        this.onCancel = onCancel;
        this.logger = logger;

        // Initialize memory management
        this.disposables = new AutoDisposableManager();
        this.eventManager = new EventListenerManager();

        // Initialize components
        this.components = this.initializeComponents();

        // Initialize state
        this.state = this.initializeState();

        // Setup modal
        this.setupModal();
    }

    private normalizeError(error: unknown): Error {
        return error instanceof Error ? error : new Error('Unknown error');
    }

    /**
     * 컴포넌트 초기화 - 단일 책임
     */
    private initializeComponents(): FilePickerComponents {
        const components = {
            validator: new FileValidator(this.options.maxFileSize, this.options.accept),
            fileBrowser: new FileBrowser(this.app, this.options.accept),
            progressIndicator: new ProgressIndicator(),
            eventHandlers: new EventHandlers(),
            dragDropZone: this.options.enableDragDrop ? new DragDropZone() : undefined,
            recentFiles: this.options.showRecentFiles ? new RecentFiles(this.app) : undefined,
        };

        // Register disposables
        Object.values(components).forEach((component) => {
            if (component && 'dispose' in component && typeof component.dispose === 'function') {
                this.disposables.add(component);
            }
        });

        return components;
    }

    /**
     * 상태 초기화 - 단일 책임
     */
    private initializeState(): FilePickerState {
        return {
            selectedFiles: [],
            validationResults: new Map(),
            isProcessing: false,
            activeTab: 'browse',
        };
    }

    /**
     * 모달 설정 - 단일 책임
     */
    private setupModal(): void {
        this.modalEl.addClass('file-picker-modal', 'speech-to-text-modal');
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        const uiBuilder = new FilePickerUIBuilder(
            contentEl,
            this.options,
            this.components,
            this.eventManager
        );

        // Build UI sections
        uiBuilder.buildHeader();
        uiBuilder.buildDragDropSection();

        const tabContainer = uiBuilder.buildTabContainer();
        this.setupTabHandlers(tabContainer);

        uiBuilder.buildSelectedFilesSection((container) => {
            this.updateSelectedFilesList(container);
        });

        uiBuilder.buildProgressSection();
        uiBuilder.buildFooter(
            () => this.handleCancel(),
            () => {
                void this.handleSubmit();
            },
            this.state.selectedFiles.length
        );

        // Setup event handlers
        this.setupEventHandlers();
        this.setupKeyboardNavigation();
    }

    /**
     * 탭 핸들러 설정 - 분리된 관심사
     */
    private setupTabHandlers(tabContainer: TabContainer): void {
        const { browseTab, browseContent, recentTab, recentContent } = tabContainer;

        // Browse tab events
        this.components.fileBrowser.onFileSelected((file: TFile) => {
            void this.handleFileSelection(file);
        });

        // Recent tab events
        if (this.components.recentFiles && recentTab && recentContent) {
            this.components.recentFiles.onFileSelected((file: TFile) => {
                void this.handleFileSelection(file);
            });

            // Tab switching
            this.eventManager.add(browseTab, 'click', () => {
                this.switchTab('browse', { browseTab, browseContent, recentTab, recentContent });
            });

            this.eventManager.add(recentTab, 'click', () => {
                this.switchTab('recent', { browseTab, browseContent, recentTab, recentContent });
            });
        }
    }

    /**
     * 탭 전환 - 단순화된 로직
     */
    private switchTab(tab: 'browse' | 'recent', elements: TabContainer): void {
        const { browseTab, browseContent, recentTab, recentContent } = elements;

        // Remove all active classes
        [browseTab, browseContent, recentTab, recentContent].forEach((el) => {
            el?.removeClass('active');
        });

        // Add active class to selected tab
        if (tab === 'browse') {
            browseTab.addClass('active');
            browseContent.addClass('active');
        } else if (recentTab && recentContent) {
            recentTab.addClass('active');
            recentContent.addClass('active');
        }

        this.state.activeTab = tab;
    }

    /**
     * 이벤트 핸들러 설정 - 중앙 집중식 관리
     */
    private setupEventHandlers(): void {
        // Drag and drop
        if (this.components.dragDropZone) {
            this.components.dragDropZone.onFilesDropped((files) => {
                void this.handleDroppedFiles(files);
            });
        }

        // File browser
        this.components.fileBrowser.onFileSelected((file: TFile) => {
            void this.handleFileSelection(file);
        });

        // Recent files
        if (this.components.recentFiles) {
            this.components.recentFiles.onFileSelected((file: TFile) => {
                void this.handleFileSelection(file);
            });
        }
    }

    /**
     * 키보드 내비게이션 설정
     */
    private setupKeyboardNavigation(): void {
        const handler = (event: Event) => {
            if (!(event instanceof KeyboardEvent)) return;

            if (event.key === 'Escape') {
                this.handleCancel();
            } else if (event.key === 'Enter' && !this.state.isProcessing) {
                if (this.state.selectedFiles.length > 0) {
                    void this.handleSubmit();
                }
            }
        };

        this.eventManager.add(this.modalEl, 'keydown', handler);
    }

    /**
     * 파일 선택 처리 - 디바운스 적용
     */
    private handleFileSelection = debounceAsync(async (file: TFile) => {
        try {
            // Check for duplicates
            if (this.state.selectedFiles.some((f) => f.path === file.path)) {
                new Notice('이미 선택된 파일입니다');
                return;
            }

            // Handle single selection mode
            if (!this.options.multiple && this.state.selectedFiles.length > 0) {
                this.clearSelection();
            }

            // Validate file
            const validation = await this.validateFile(file);
            this.state.validationResults.set(file.path, validation);

            if (!validation.valid) {
                this.showValidationError(validation);
                return;
            }

            // Show warnings if any
            if (validation.warnings?.length) {
                this.showValidationWarnings(validation);
            }

            // Add file to selection
            this.state.selectedFiles.push(file);
            this.refreshUI();
        } catch (error) {
            const normalizedError = this.normalizeError(error);
            this.logger?.error('File selection failed', normalizedError);
            new Notice(`파일 선택 실패: ${normalizedError.message}`);
        }
    }, 300);

    /**
     * 드롭된 파일 처리 - 배치 처리 최적화
     */
    private async handleDroppedFiles(files: File[]): Promise<void> {
        if (this.state.isProcessing) return;

        this.state.isProcessing = true;
        this.components.progressIndicator.show('파일 처리 중...');

        try {
            const results = await Promise.allSettled(
                files.map((file) => this.processDroppedFile(file))
            );

            const successful = results.filter((r) => r.status === 'fulfilled').length;
            const failed = results.filter((r) => r.status === 'rejected').length;

            if (failed > 0) {
                new Notice(`${failed}개 파일 처리 실패`);
            }

            if (successful > 0) {
                this.refreshUI();
            }
        } finally {
            this.state.isProcessing = false;
            this.components.progressIndicator.hide();
        }
    }

    /**
     * 개별 드롭 파일 처리
     */
    private async processDroppedFile(file: File): Promise<void> {
        const vaultFile = this.findVaultFile(file.name);
        if (!vaultFile) {
            throw new Error(`Vault에서 파일을 찾을 수 없습니다: ${file.name}`);
        }

        await this.handleFileSelection(vaultFile);
    }

    /**
     * 파일 검증 - 분리된 검증 로직
     */
    private async validateFile(file: TFile): Promise<ValidationResult> {
        try {
            const buffer = await this.app.vault.readBinary(file);
            return this.components.validator.validate(file, buffer);
        } catch (error) {
            const normalizedError = this.normalizeError(error);
            this.logger?.error('File validation failed', normalizedError);
            return {
                valid: false,
                errors: [
                    { code: 'VALIDATION_ERROR', message: `검증 실패: ${normalizedError.message}` },
                ],
            };
        }
    }

    /**
     * 선택된 파일 목록 업데이트 - UI 로직 분리
     */
    private updateSelectedFilesList(container: HTMLElement): void {
        container.empty();

        if (this.state.selectedFiles.length === 0) {
            this.renderEmptyState(container);
            return;
        }

        const listRenderer = new SelectedFilesListRenderer(
            container,
            this.state.selectedFiles,
            this.state.validationResults,
            (file) => this.removeFile(file)
        );

        listRenderer.render();
    }

    /**
     * 빈 상태 렌더링
     */
    private renderEmptyState(container: HTMLElement): void {
        container.createEl('p', {
            text: '선택된 파일이 없습니다',
            cls: 'no-files-message',
        });
    }

    /**
     * 파일 제거
     */
    private removeFile(file: TFile): void {
        const index = this.state.selectedFiles.indexOf(file);
        if (index > -1) {
            this.state.selectedFiles.splice(index, 1);
            this.state.validationResults.delete(file.path);
            this.refreshUI();
        }
    }

    /**
     * 선택 초기화
     */
    private clearSelection(): void {
        this.state.selectedFiles = [];
        this.state.validationResults.clear();
    }

    /**
     * 제출 처리 - 비동기 최적화
     */
    private handleSubmit(): void {
        if (this.state.isProcessing || this.state.selectedFiles.length === 0) {
            return;
        }

        this.state.isProcessing = true;
        this.components.progressIndicator.show('파일 처리 중...', true);

        try {
            const results = this.processSelectedFiles();

            if (results.length > 0) {
                this.saveRecentFiles(results);
                this.onChoose(results);
                this.close();
            } else {
                new Notice('유효한 파일이 없습니다');
            }
        } catch (error) {
            const normalizedError = this.normalizeError(error);
            this.logger?.error('Submit failed', normalizedError);
            new Notice(`처리 실패: ${normalizedError.message}`);
        } finally {
            this.state.isProcessing = false;
            this.components.progressIndicator.hide();
        }
    }

    /**
     * 선택된 파일 처리
     */
    private processSelectedFiles(): FilePickerResult[] {
        const results: FilePickerResult[] = [];
        const total = this.state.selectedFiles.length;

        for (let i = 0; i < total; i++) {
            const file = this.state.selectedFiles[i];
            const validation = this.state.validationResults.get(file.path);

            if (validation?.valid) {
                results.push({ file, validation });
            }

            this.components.progressIndicator.update(((i + 1) / total) * 100);
        }

        return results;
    }

    /**
     * 최근 파일 저장
     */
    private saveRecentFiles(results: FilePickerResult[]): void {
        if (this.components.recentFiles) {
            for (const result of results) {
                this.components.recentFiles.addRecentFile(result.file);
            }
        }
    }

    /**
     * 취소 처리
     */
    private handleCancel(): void {
        this.onCancel();
        this.close();
    }

    /**
     * UI 새로고침 - 최적화된 업데이트
     */
    private refreshUI(): void {
        requestAnimationFrame(() => {
            // Update selected files list
            const listContainer = this.modalEl.querySelector('.selected-files-list');
            if (listContainer instanceof HTMLElement) {
                this.updateSelectedFilesList(listContainer);
            }

            // Update submit button
            const submitBtn = this.modalEl.querySelector('.mod-cta');
            if (submitBtn instanceof HTMLButtonElement) {
                submitBtn.disabled = this.state.selectedFiles.length === 0;
                submitBtn.setText(`선택 (${this.state.selectedFiles.length})`);
            }
        });
    }

    /**
     * 검증 에러 표시
     */
    private showValidationError(validation: ValidationResult): void {
        const errors =
            validation.errors?.map((error) => error.message).join('\n') || '알 수 없는 오류';
        new Notice(`파일 검증 실패:\n${errors}`);
    }

    /**
     * 검증 경고 표시
     */
    private showValidationWarnings(validation: ValidationResult): void {
        const warnings = validation.warnings?.map((warning) => warning.message).join('\n') || '';
        if (warnings) {
            new Notice(`경고:\n${warnings}`);
        }
    }

    /**
     * Vault 파일 찾기
     */
    private findVaultFile(fileName: string): TFile | null {
        return this.app.vault.getFiles().find((f) => f.name === fileName) || null;
    }

    /**
     * 옵션 병합
     */
    private mergeOptions(options: FilePickerOptions): Required<FilePickerOptions> {
        return {
            title: options.title || '오디오 파일 선택',
            accept: options.accept || ['m4a', 'mp3', 'wav', 'mp4'],
            maxFileSize: options.maxFileSize || 25 * 1024 * 1024, // 25MB
            multiple: options.multiple ?? false,
            showRecentFiles: options.showRecentFiles ?? true,
            enableDragDrop: options.enableDragDrop ?? true,
        };
    }

    onClose() {
        // Dispose all resources
        this.disposables.dispose();
        this.eventManager.removeAll();

        // Clear state
        this.state.selectedFiles = [];
        this.state.validationResults.clear();

        // Clear content
        this.contentEl.empty();
    }
}

/**
 * 컴포넌트 타입 정의
 */
interface FilePickerComponents {
    validator: FileValidator;
    fileBrowser: FileBrowser;
    progressIndicator: ProgressIndicator;
    eventHandlers: EventHandlers;
    dragDropZone?: DragDropZone;
    recentFiles?: RecentFiles;
}

/**
 * 상태 타입 정의
 */
interface FilePickerState {
    selectedFiles: TFile[];
    validationResults: Map<string, ValidationResult>;
    isProcessing: boolean;
    activeTab: 'browse' | 'recent';
}

/**
 * 탭 컨테이너 타입
 */
interface TabContainer {
    browseTab: HTMLElement;
    browseContent: HTMLElement;
    recentTab: HTMLElement | null;
    recentContent: HTMLElement | null;
}

/**
 * UI 빌더 클래스 - UI 구성 로직 분리
 */
class FilePickerUIBuilder {
    constructor(
        private container: HTMLElement,
        private options: Required<FilePickerOptions>,
        private components: FilePickerComponents,
        private eventManager: EventListenerManager
    ) {}

    buildHeader(): void {
        const header = this.container.createDiv('file-picker-header');
        header.createEl('h2', { text: this.options.title });

        const subtitle = header.createEl('p', { cls: 'file-picker-subtitle' });
        this.buildSubtitle(subtitle);
    }

    private buildSubtitle(subtitle: HTMLElement): void {
        const parts: string[] = [];

        if (this.options.accept.length > 0) {
            parts.push(`지원 형식: ${this.options.accept.map((ext) => `.${ext}`).join(', ')}`);
        }

        if (this.options.maxFileSize > 0) {
            parts.push(`최대 크기: ${this.formatFileSize(this.options.maxFileSize)}`);
        }

        subtitle.setText(parts.join(' | '));
    }

    buildDragDropSection(): void {
        if (!this.options.enableDragDrop || !this.components.dragDropZone) return;

        const dropSection = this.container.createDiv('drag-drop-section');
        this.components.dragDropZone.mount(dropSection);
    }

    buildTabContainer(): TabContainer {
        const tabContainer = this.container.createDiv('file-picker-tabs');
        const tabHeader = tabContainer.createDiv('tab-header');

        const browseTab = this.createTab(tabHeader, 'Browse', true);
        const recentTab = this.options.showRecentFiles
            ? this.createTab(tabHeader, 'Recent', false)
            : null;

        const tabContent = tabContainer.createDiv('tab-content');
        const browseContent = this.createBrowseContent(tabContent);
        const recentContent = this.options.showRecentFiles
            ? this.createRecentContent(tabContent)
            : null;

        return { browseTab, browseContent, recentTab, recentContent };
    }

    private createTab(container: HTMLElement, label: string, active: boolean): HTMLElement {
        return container.createDiv({
            cls: `tab-button ${active ? 'active' : ''}`,
            text: label,
        });
    }

    private createBrowseContent(container: HTMLElement): HTMLElement {
        const content = container.createDiv('browse-content active');
        this.components.fileBrowser.mount(content);
        return content;
    }

    private createRecentContent(container: HTMLElement): HTMLElement {
        const content = container.createDiv('recent-content');
        if (this.components.recentFiles) {
            this.components.recentFiles.mount(content);
        }
        return content;
    }

    buildSelectedFilesSection(updateCallback: (container: HTMLElement) => void): void {
        const section = this.container.createDiv('selected-files-section');
        section.createEl('h3', { text: '선택된 파일' });

        const fileList = section.createDiv('selected-files-list');
        updateCallback(fileList);
    }

    buildProgressSection(): void {
        this.components.progressIndicator.mount(this.container);
    }

    buildFooter(onCancel: () => void, onSubmit: () => void, fileCount: number): void {
        const footer = this.container.createDiv('file-picker-footer');

        new Setting(footer)
            .addButton((btn) => btn.setButtonText('취소').onClick(onCancel))
            .addButton((btn) =>
                btn
                    .setButtonText(`선택 (${fileCount})`)
                    .setCta()
                    .setDisabled(fileCount === 0)
                    .onClick(onSubmit)
            );
    }

    private formatFileSize(bytes: number): string {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
}

/**
 * 선택된 파일 목록 렌더러
 */
class SelectedFilesListRenderer {
    constructor(
        private container: HTMLElement,
        private files: TFile[],
        private validationResults: Map<string, ValidationResult>,
        private onRemove: (file: TFile) => void
    ) {}

    render(): void {
        this.files.forEach((file) => this.renderFileItem(file));
    }

    private renderFileItem(file: TFile): void {
        const fileItem = this.container.createDiv('selected-file-item');

        this.renderFileInfo(fileItem, file);
        this.renderValidationStatus(fileItem, file);
        this.renderRemoveButton(fileItem, file);
    }

    private renderFileInfo(container: HTMLElement, file: TFile): void {
        const fileInfo = container.createDiv('file-info');
        fileInfo.createEl('span', { text: file.name, cls: 'file-name' });
        fileInfo.createEl('span', {
            text: this.formatFileSize(file.stat.size),
            cls: 'file-size',
        });
    }

    private renderValidationStatus(container: HTMLElement, file: TFile): void {
        const validation = this.validationResults.get(file.path);
        if (!validation) return;

        const statusIcon = container.createDiv('validation-status');

        if (validation.valid) {
            statusIcon.addClass('valid');
            statusIcon.setText('✓');
        } else {
            statusIcon.addClass('invalid');
            statusIcon.setText('✗');
            statusIcon.title = validation.errors?.map((error) => error.message).join('\n') || '';
        }
    }

    private renderRemoveButton(container: HTMLElement, file: TFile): void {
        const removeBtn = container.createEl('button', {
            text: '제거',
            cls: 'remove-file-btn',
        });

        removeBtn.onclick = () => this.onRemove(file);
    }

    private formatFileSize(bytes: number): string {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
}

/**
 * 자동 정리 매니저
 */
class AutoDisposableManager {
    private disposables: Set<{ dispose: () => void }> = new Set();

    add(disposable: unknown): void {
        if (disposable && typeof (disposable as { dispose?: unknown }).dispose === 'function') {
            this.disposables.add(disposable as { dispose: () => void });
        }
    }

    dispose(): void {
        this.disposables.forEach((disposable) => {
            try {
                disposable.dispose();
            } catch (error) {
                console.error('Error disposing resource:', error);
            }
        });
        this.disposables.clear();
    }
}
