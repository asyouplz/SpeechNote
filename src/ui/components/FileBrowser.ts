import { App, TFile } from 'obsidian';
import { createIconElement } from '../../utils/common/helpers';

/**
 * 파일 브라우저 컴포넌트
 * - Vault 내 오디오 파일 탐색
 * - 폴더 구조 표시
 * - 파일 필터링 및 정렬
 */
export class FileBrowser {
    private app: App;
    private container: HTMLElement | null = null;
    private acceptedFormats: string[];
    private fileCallback: ((file: TFile) => void) | null = null;
    private currentPath = '/';
    private sortBy: 'name' | 'date' | 'size' = 'name';
    private sortOrder: 'asc' | 'desc' = 'asc';
    private searchQuery = '';

    constructor(app: App, acceptedFormats?: string[]) {
        this.app = app;
        this.acceptedFormats = acceptedFormats || ['m4a', 'mp3', 'wav', 'mp4', 'webm', 'ogg'];
    }

    /**
     * 컴포넌트 마운트
     */
    mount(container: HTMLElement) {
        this.container = container;
        this.render();
    }

    /**
     * 컴포넌트 언마운트
     */
    unmount() {
        this.container?.empty();
        this.container = null;
    }

    /**
     * 렌더링
     */
    private render() {
        if (!this.container) return;

        this.container.empty();
        this.container.addClass('sn-file-browser');

        // 툴바
        this.createToolbar();

        // 파일 목록
        this.createFileList();
    }

    /**
     * 툴바 생성
     */
    private createToolbar() {
        if (!this.container) return;

        const toolbar = this.container.createDiv('sn-file-browser-toolbar');

        // 검색 박스
        const searchContainer = toolbar.createDiv('sn-search-container');
        const searchInput = searchContainer.createEl('input', {
            type: 'text',
            placeholder: 'Search files...',
            cls: 'sn-search-input',
        });

        searchInput.addEventListener('input', (e) => {
            const target = e.target;
            if (target instanceof HTMLInputElement) {
                this.searchQuery = target.value;
                this.createFileList();
            }
        });

        // 정렬 옵션
        const sortContainer = toolbar.createDiv('sn-sort-container');

        // 정렬 기준 선택
        const sortSelect = sortContainer.createEl('select', { cls: 'sn-sort-select' });
        sortSelect.createEl('option', { value: 'name', text: 'Name' });
        sortSelect.createEl('option', { value: 'date', text: 'Modified' });
        sortSelect.createEl('option', { value: 'size', text: 'Size' });
        sortSelect.value = this.sortBy;

        sortSelect.addEventListener('change', (e) => {
            const target = e.target;
            if (target instanceof HTMLSelectElement) {
                const value = target.value;
                if (value === 'name' || value === 'date' || value === 'size') {
                    this.sortBy = value;
                    this.createFileList();
                }
            }
        });

        // 정렬 순서 토글
        const sortOrderBtn = sortContainer.createEl('button', {
            cls: 'sn-sort-order-btn',
            title: 'Toggle sort order',
        });
        sortOrderBtn.setText(this.sortOrder === 'asc' ? '↑' : '↓');

        sortOrderBtn.addEventListener('click', () => {
            this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
            sortOrderBtn.setText(this.sortOrder === 'asc' ? '↑' : '↓');
            this.createFileList();
        });

        // 새로고침 버튼
        const refreshBtn = toolbar.createEl('button', {
            cls: 'sn-refresh-btn',
            title: 'Refresh file list',
        });
        refreshBtn.appendChild(this.createRefreshIcon());
        refreshBtn.addEventListener('click', () => this.render());
    }

    /**
     * 파일 목록 생성
     */
    private createFileList() {
        if (!this.container) return;

        // 기존 목록 제거
        const existingList = this.container.querySelector('.sn-file-browser-list');
        if (existingList) {
            existingList.remove();
        }

        const listContainer = this.container.createDiv('sn-file-browser-list');

        // 오디오 파일 가져오기
        const audioFiles = this.getAudioFiles();

        if (audioFiles.length === 0) {
            listContainer.createDiv({
                cls: 'sn-empty-state',
                text: 'No audio files found.',
            });
            return;
        }

        // 폴더별로 그룹화
        const filesByFolder = this.groupFilesByFolder(audioFiles);

        // 폴더와 파일 렌더링
        filesByFolder.forEach((files, folderPath) => {
            if (files.length === 0) return;

            // 폴더 헤더
            const folderHeader = listContainer.createDiv('sn-folder-header');
            folderHeader.createEl('span', {
                cls: 'sn-folder-icon',
                text: '📁',
            });
            folderHeader.createEl('span', {
                cls: 'sn-folder-name',
                text: folderPath || 'Root',
            });
            folderHeader.createEl('span', {
                cls: 'sn-folder-count',
                text: `(${files.length})`,
            });

            // 폴더 토글
            let isExpanded = true;
            const fileList = listContainer.createDiv('sn-folder-files');

            folderHeader.addEventListener('click', () => {
                isExpanded = !isExpanded;
                if (isExpanded) {
                    fileList.show();
                    folderHeader.removeClass('sn-is-collapsed');
                } else {
                    fileList.hide();
                    folderHeader.addClass('sn-is-collapsed');
                }
            });

            // 파일 렌더링
            files.forEach((file) => {
                this.createFileItem(fileList, file);
            });
        });
    }

    /**
     * 파일 아이템 생성
     */
    private createFileItem(container: HTMLElement, file: TFile) {
        const fileItem = container.createDiv('sn-file-item');

        // 파일 아이콘
        const icon = fileItem.createDiv('sn-file-icon');
        icon.setText(this.getFileIcon(file.extension));

        // 파일 정보
        const fileInfo = fileItem.createDiv('sn-file-info');

        // 파일명
        const fileName = fileInfo.createDiv('sn-file-name');
        fileName.setText(file.basename);

        // 파일 메타데이터
        const fileMeta = fileInfo.createDiv('sn-file-meta');
        fileMeta.createEl('span', {
            cls: 'sn-file-size',
            text: this.formatFileSize(file.stat.size),
        });
        fileMeta.createEl('span', {
            cls: 'sn-file-date',
            text: this.formatDate(file.stat.mtime),
        });
        fileMeta.createEl('span', {
            cls: 'sn-file-ext',
            text: `.${file.extension}`,
        });

        // 클릭 이벤트
        fileItem.addEventListener('click', () => {
            this.selectFile(file);
            fileItem.addClass('sn-is-selected');

            // 다른 선택 해제
            container.querySelectorAll('.sn-file-item').forEach((item) => {
                if (item !== fileItem) {
                    item.removeClass('sn-is-selected');
                }
            });
        });

        // 더블클릭으로 즉시 선택
        fileItem.addEventListener('dblclick', () => {
            if (this.fileCallback) {
                this.fileCallback(file);
            }
        });

        // 호버 시 전체 경로 툴팁
        fileItem.title = file.path;
    }

    /**
     * 오디오 파일 가져오기
     */
    private getAudioFiles(): TFile[] {
        let files = this.app.vault
            .getFiles()
            .filter((file) => this.acceptedFormats.includes(file.extension.toLowerCase()));

        // 검색 필터 적용
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            files = files.filter(
                (file) =>
                    file.basename.toLowerCase().includes(query) ||
                    file.path.toLowerCase().includes(query)
            );
        }

        // 정렬
        files.sort((a, b) => {
            let comparison = 0;

            switch (this.sortBy) {
                case 'name':
                    comparison = a.basename.localeCompare(b.basename);
                    break;
                case 'date':
                    comparison = b.stat.mtime - a.stat.mtime;
                    break;
                case 'size':
                    comparison = b.stat.size - a.stat.size;
                    break;
            }

            return this.sortOrder === 'asc' ? comparison : -comparison;
        });

        return files;
    }

    /**
     * 폴더별로 파일 그룹화
     */
    private groupFilesByFolder(files: TFile[]): Map<string, TFile[]> {
        const grouped = new Map<string, TFile[]>();

        files.forEach((file) => {
            const folderPath = file.parent?.path || '';
            const existingFiles = grouped.get(folderPath);
            if (existingFiles) {
                existingFiles.push(file);
            } else {
                grouped.set(folderPath, [file]);
            }
        });

        // 폴더 경로로 정렬
        return new Map([...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0])));
    }

    /**
     * 파일 선택
     */
    private selectFile(_file: TFile) {
        // 선택 표시 (시각적 피드백은 이미 처리됨)
        // 필요시 추가 로직
    }

    /**
     * 파일 선택 콜백 설정
     */
    onFileSelected(callback: (file: TFile) => void) {
        this.fileCallback = callback;
    }

    /**
     * 파일 크기 포맷팅
     */
    private formatFileSize(bytes: number): string {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    /**
     * 날짜 포맷팅
     */
    private formatDate(timestamp: number): string {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) {
            const hours = Math.floor(diff / (1000 * 60 * 60));
            if (hours === 0) {
                const minutes = Math.floor(diff / (1000 * 60));
                if (minutes === 0) {
                    return 'Just now';
                }
                return `${minutes} min ago`;
            }
            return `${hours} hr ago`;
        } else if (days === 1) {
            return 'Yesterday';
        } else if (days < 7) {
            return `${days} days ago`;
        } else if (days < 30) {
            const weeks = Math.floor(days / 7);
            return `${weeks} weeks ago`;
        } else if (days < 365) {
            const months = Math.floor(days / 30);
            return `${months} months ago`;
        } else {
            return date.toLocaleDateString();
        }
    }

    /**
     * 파일 아이콘 가져오기
     */
    private getFileIcon(extension: string): string {
        const icons: Record<string, string> = {
            m4a: '🎵',
            mp3: '🎵',
            wav: '🎵',
            mp4: '🎬',
            webm: '🎬',
            ogg: '🎵',
        };

        return icons[extension.toLowerCase()] || '📄';
    }

    /**
     * 새로고침 아이콘
     */
    private createRefreshIcon(): HTMLElement {
        return createIconElement('refresh-cw');
    }
}
