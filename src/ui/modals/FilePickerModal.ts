import { App, Modal, TFile, Setting, Notice } from 'obsidian';
import { FileValidator } from '../components/FileValidator';
import { FileBrowser } from '../components/FileBrowser';
import { DragDropZone } from '../components/DragDropZone';
import { RecentFiles } from '../components/RecentFiles';
import { ProgressIndicator } from '../components/ProgressIndicator';
import { EventHandlers } from '../components/EventHandlers';
import { ILogger } from '../../infrastructure/logging/Logger';
import type { SpeechToTextSettings } from '../../domain/models/Settings';

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
 * 고급 파일 선택 모달
 * - 드래그 앤 드롭 지원
 * - 파일 검증
 * - 최근 사용 파일
 * - 진행 상태 표시
 */
export class FilePickerModal extends Modal {
    private readonly options: Required<FilePickerOptions>;
    private readonly onChoose: (files: FilePickerResult[]) => void;
    private readonly onCancel: () => void;
    private readonly logger?: ILogger;
    private readonly legacyFileHandler?: (file: File) => Promise<void> | void;

    private validator: FileValidator;
    private fileBrowser: FileBrowser;
    private dragDropZone?: DragDropZone;
    private recentFiles?: RecentFiles;
    private progressIndicator: ProgressIndicator;
    private eventHandlers: EventHandlers;

    private selectedFiles: TFile[] = [];
    private validationResults: Map<string, ValidationResult> = new Map();

    constructor(
        app: App,
        optionsOrHandler: FilePickerOptions | ((file: File) => Promise<void> | void),
        onChooseOrSettings?: ((files: FilePickerResult[]) => void) | SpeechToTextSettings,
        onCancel?: () => void,
        logger?: ILogger
    ) {
        super(app);
        if (typeof optionsOrHandler === 'function') {
            const settings = onChooseOrSettings as SpeechToTextSettings | undefined;
            const maxFileSizeMb = typeof settings?.maxFileSize === 'number' ? settings.maxFileSize : 25;
            this.options = this.mergeOptions({
                title: '오디오 파일 선택',
                accept: ['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm'],
                maxFileSize: maxFileSizeMb * 1024 * 1024,
                multiple: false,
                showRecentFiles: false,
                enableDragDrop: true
            });
            this.onChoose = () => undefined;
            this.onCancel = () => undefined;
            this.legacyFileHandler = optionsOrHandler;
            this.logger = undefined;
        } else {
            this.options = this.mergeOptions(optionsOrHandler);
            this.onChoose = onChooseOrSettings as (files: FilePickerResult[]) => void;
            this.onCancel = onCancel ?? (() => undefined);
            this.logger = logger;
        }

        // 컴포넌트 초기화
        this.validator = new FileValidator(this.options.maxFileSize, this.options.accept);
        this.fileBrowser = new FileBrowser(app, this.options.accept);
        this.progressIndicator = new ProgressIndicator();
        this.eventHandlers = new EventHandlers();

        if (this.options.enableDragDrop) {
            this.dragDropZone = new DragDropZone();
        }

        if (this.options.showRecentFiles) {
            this.recentFiles = new RecentFiles(app);
        }

        // 모달 클래스 추가
        this.modalEl?.classList?.add('file-picker-modal');
        this.modalEl?.classList?.add('speech-to-text-modal');
    }

    async onChooseFile(file: File): Promise<void> {
        if (this.legacyFileHandler) {
            await this.legacyFileHandler(file);
            return;
        }
        await this.handleDroppedFiles([file]);
    }

    private normalizeError(error: unknown): Error {
        return error instanceof Error ? error : new Error('Unknown error');
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        // 헤더
        this.createHeader(contentEl);

        // 드래그 앤 드롭 영역
        if (this.options.enableDragDrop && this.dragDropZone) {
            this.createDragDropSection(contentEl);
        }

        // 탭 컨테이너
        const tabContainer = contentEl.createDiv('file-picker-tabs');
        
        // 탭 헤더
        const tabHeader = tabContainer.createDiv('tab-header');
        const browseTab = this.createTab(tabHeader, 'Browse', true);
        const recentTab = this.options.showRecentFiles 
            ? this.createTab(tabHeader, 'Recent', false) 
            : null;

        // 탭 콘텐츠
        const tabContent = tabContainer.createDiv('tab-content');
        const browseContent = this.createBrowseContent(tabContent);
        const recentContent = this.options.showRecentFiles 
            ? this.createRecentContent(tabContent) 
            : null;

        // 탭 전환 이벤트
        this.setupTabSwitching(browseTab, browseContent, recentTab, recentContent);

        // 선택된 파일 섹션
        this.createSelectedFilesSection(contentEl);

        // 진행 상태 표시
        this.progressIndicator.mount(contentEl);

        // 버튼 영역
        this.createFooter(contentEl);

        // 키보드 내비게이션 설정
        this.setupKeyboardNavigation();
    }

    private createHeader(container: HTMLElement) {
        const header = container.createDiv('file-picker-header');
        header.createEl('h2', { text: this.options.title });
        
        const subtitle = header.createEl('p', { cls: 'file-picker-subtitle' });
        if (this.options.accept.length > 0) {
            subtitle.setText(`지원 형식: ${this.options.accept.map(ext => `.${ext}`).join(', ')}`);
        }
        
        if (this.options.maxFileSize > 0) {
            const sizeLimit = this.formatFileSize(this.options.maxFileSize);
            subtitle.appendText(` | 최대 크기: ${sizeLimit}`);
        }
    }

    private createDragDropSection(container: HTMLElement) {
        if (!this.dragDropZone) return;

        const dropSection = container.createDiv('drag-drop-section');
        
        this.dragDropZone.mount(dropSection);
        this.dragDropZone.onFilesDropped(async (files) => {
            await this.handleDroppedFiles(files);
        });
    }

    private createBrowseContent(container: HTMLElement): HTMLElement {
        const browseContent = container.createDiv('browse-content active');
        
        // 파일 브라우저 마운트
        this.fileBrowser.mount(browseContent);
        
        // 파일 선택 이벤트
        this.fileBrowser.onFileSelected((file) => {
            void this.handleFileSelection(file);
        });

        return browseContent;
    }

    private createRecentContent(container: HTMLElement): HTMLElement {
        const recentContent = container.createDiv('recent-content');
        
        if (this.recentFiles) {
            this.recentFiles.mount(recentContent);
            
            // 최근 파일 선택 이벤트
            this.recentFiles.onFileSelected((file) => {
                void this.handleFileSelection(file);
            });
        }

        return recentContent;
    }

    private createSelectedFilesSection(container: HTMLElement) {
        const section = container.createDiv('selected-files-section');
        section.createEl('h3', { text: '선택된 파일' });
        
        const fileList = section.createDiv('selected-files-list');
        this.updateSelectedFilesList(fileList);
    }

    private updateSelectedFilesList(container: HTMLElement) {
        container.empty();

        if (this.selectedFiles.length === 0) {
            container.createEl('p', { 
                text: '선택된 파일이 없습니다',
                cls: 'no-files-message' 
            });
            return;
        }

        this.selectedFiles.forEach(file => {
            const fileItem = container.createDiv('selected-file-item');
            
            // 파일 정보
            const fileInfo = fileItem.createDiv('file-info');
            fileInfo.createEl('span', { text: file.name, cls: 'file-name' });
            fileInfo.createEl('span', { 
                text: this.formatFileSize(file.stat.size), 
                cls: 'file-size' 
            });

            // 검증 상태
            const validation = this.validationResults.get(file.path);
            if (validation) {
                const statusIcon = fileItem.createDiv('validation-status');
                if (validation.valid) {
                    statusIcon.addClass('valid');
                    statusIcon.setText('✓');
                } else {
                    statusIcon.addClass('invalid');
                    statusIcon.setText('✗');
                    statusIcon.title = validation.errors?.join('\n') || '';
                }
            }

            // 제거 버튼
            const removeBtn = fileItem.createEl('button', { 
                text: '제거',
                cls: 'remove-file-btn' 
            });
            removeBtn.onclick = () => {
                this.removeFile(file);
                this.updateSelectedFilesList(container);
            };
        });
    }

    private createFooter(container: HTMLElement) {
        const footer = container.createDiv('file-picker-footer');
        
        new Setting(footer)
            .addButton(btn => btn
                .setButtonText('취소')
                .onClick(() => {
                    this.onCancel();
                    this.close();
                }))
            .addButton(btn => btn
                .setButtonText(`선택 (${this.selectedFiles.length})`)
                .setCta()
                .setDisabled(this.selectedFiles.length === 0)
                .onClick(async () => {
                    await this.processSelectedFiles();
                }));
    }

    private async handleFileSelection(file: TFile) {
        // 중복 체크
        if (this.selectedFiles.some(f => f.path === file.path)) {
            new Notice('이미 선택된 파일입니다');
            return;
        }

        // 다중 선택이 비활성화된 경우
        if (!this.options.multiple && this.selectedFiles.length > 0) {
            this.selectedFiles = [];
            this.validationResults.clear();
        }

        // 파일 검증
        const validation = await this.validateFile(file);
        this.validationResults.set(file.path, validation);

        if (!validation.valid) {
            const errors = validation.errors?.join('\n') || '알 수 없는 오류';
            new Notice(`파일 검증 실패:\n${errors}`);
            return;
        }

        // 경고가 있는 경우
        if (validation.warnings && validation.warnings.length > 0) {
            const warnings = validation.warnings.join('\n');
            new Notice(`경고:\n${warnings}`);
        }

        this.selectedFiles.push(file);
        this.refreshUI();
    }

    private async handleDroppedFiles(files: File[]) {
        this.progressIndicator.show('파일 처리 중...');

        for (const file of files) {
            // Obsidian Vault에서 파일 찾기
            const vaultFile = this.findVaultFile(file.name);
            if (vaultFile) {
                await this.handleFileSelection(vaultFile);
            } else {
                new Notice(`Vault에서 파일을 찾을 수 없습니다: ${file.name}`);
            }
        }

        this.progressIndicator.hide();
    }

    private async validateFile(file: TFile): Promise<ValidationResult> {
        try {
            // ArrayBuffer 읽기 (선택적)
            const buffer = await this.app.vault.readBinary(file);
            return await this.validator.validate(file, buffer);
        } catch (error) {
            const normalizedError = this.normalizeError(error);
            this.logger?.error('File validation failed', normalizedError);
            return {
                valid: false,
                errors: [{ code: 'VALIDATION_ERROR', message: `검증 실패: ${normalizedError.message}` }]
            };
        }
    }

    private processSelectedFiles() {
        if (this.selectedFiles.length === 0) {
            new Notice('선택된 파일이 없습니다');
            return;
        }

        this.progressIndicator.show('파일 처리 중...', true);
        
        const results: FilePickerResult[] = [];
        
        for (let i = 0; i < this.selectedFiles.length; i++) {
            const file = this.selectedFiles[i];
            const validation = this.validationResults.get(file.path);
            
            if (validation && validation.valid) {
                results.push({ file, validation });
            }
            
            this.progressIndicator.update((i + 1) / this.selectedFiles.length * 100);
        }

        this.progressIndicator.hide();
        
        if (results.length > 0) {
            // 최근 파일 저장
            if (this.recentFiles) {
                results.forEach(r => this.recentFiles!.addRecentFile(r.file));
            }
            
            this.onChoose(results);
            this.close();
        } else {
            new Notice('유효한 파일이 없습니다');
        }
    }

    private removeFile(file: TFile) {
        const index = this.selectedFiles.indexOf(file);
        if (index > -1) {
            this.selectedFiles.splice(index, 1);
            this.validationResults.delete(file.path);
            this.refreshUI();
        }
    }

    private findVaultFile(fileName: string): TFile | null {
        return this.app.vault.getFiles().find(f => f.name === fileName) || null;
    }

    private createTab(container: HTMLElement, label: string, active: boolean): HTMLElement {
        const tab = container.createDiv({
            cls: `tab-button ${active ? 'active' : ''}`,
            text: label
        });
        return tab;
    }

    private setupTabSwitching(
        browseTab: HTMLElement, 
        browseContent: HTMLElement,
        recentTab: HTMLElement | null, 
        recentContent: HTMLElement | null
    ) {
        browseTab.onclick = () => {
            browseTab.addClass('active');
            browseContent.addClass('active');
            
            if (recentTab && recentContent) {
                recentTab.removeClass('active');
                recentContent.removeClass('active');
            }
        };

        if (recentTab && recentContent) {
            recentTab.onclick = () => {
                recentTab.addClass('active');
                recentContent.addClass('active');
                browseTab.removeClass('active');
                browseContent.removeClass('active');
            };
        }
    }

    private setupKeyboardNavigation() {
        this.modalEl.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.onCancel();
                this.close();
            }
            
            if (e.key === 'Enter' && this.selectedFiles.length > 0) {
                void this.processSelectedFiles();
            }
        });
    }

    private refreshUI() {
        const selectedSection = this.modalEl.querySelector('.selected-files-list');
        if (selectedSection instanceof HTMLElement) {
            this.updateSelectedFilesList(selectedSection);
        }
        
        // 버튼 상태 업데이트
        const submitBtn = this.modalEl.querySelector('.mod-cta');
        if (submitBtn instanceof HTMLButtonElement) {
            submitBtn.disabled = this.selectedFiles.length === 0;
            submitBtn.setText(`선택 (${this.selectedFiles.length})`);
        }
    }

    private mergeOptions(options: FilePickerOptions): Required<FilePickerOptions> {
        return {
            title: options.title || '오디오 파일 선택',
            accept: options.accept || ['m4a', 'mp3', 'wav', 'mp4'],
            maxFileSize: options.maxFileSize || 25 * 1024 * 1024, // 25MB
            multiple: options.multiple ?? false,
            showRecentFiles: options.showRecentFiles ?? true,
            enableDragDrop: options.enableDragDrop ?? true
        };
    }

    private formatFileSize(bytes: number): string {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
        
        // 컴포넌트 정리
        this.dragDropZone?.unmount();
        this.fileBrowser.unmount();
        this.recentFiles?.unmount();
        this.progressIndicator.unmount();
    }
}
