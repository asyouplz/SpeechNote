import { App, TFile } from 'obsidian';

interface RecentFileEntry {
    path: string;
    timestamp: number;
}

/**
 * 최근 사용 파일 컴포넌트
 * - 최근 사용한 오디오 파일 목록 표시
 * - 로컬 스토리지에 기록 저장
 * - 빠른 접근 제공
 */
export class RecentFiles {
    private app: App;
    private container: HTMLElement | null = null;
    private fileCallback: ((file: TFile) => void) | null = null;
    private readonly STORAGE_KEY = 'speech-to-text-recent-files';
    private readonly MAX_RECENT_FILES = 10;
    private recentFiles: RecentFileEntry[] = [];

    constructor(app: App) {
        this.app = app;
        this.loadRecentFiles();
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
        this.container.addClass('recent-files');

        // 헤더
        const header = this.container.createDiv('recent-files-header');
        header.createEl('h3', { text: '최근 사용 파일' });
        
        // 초기화 버튼
        const clearBtn = header.createEl('button', {
            cls: 'clear-recent-btn',
            text: '초기화',
            title: '최근 사용 목록 초기화'
        });
        clearBtn.addEventListener('click', () => {
            this.clearRecentFiles();
        });

        // 파일 목록
        this.renderFileList();
    }

    /**
     * 파일 목록 렌더링
     */
    private renderFileList() {
        if (!this.container) return;

        // 기존 목록 제거
        const existingList = this.container.querySelector('.recent-files-list');
        if (existingList) {
            existingList.remove();
        }

        const listContainer = this.container.createDiv('recent-files-list');
        
        // 유효한 파일만 필터링
        const validFiles = this.getValidRecentFiles();
        
        if (validFiles.length === 0) {
            listContainer.createDiv({
                cls: 'empty-state',
                text: '최근 사용한 파일이 없습니다'
            });
            return;
        }

        // 파일 아이템 생성
        validFiles.forEach((entry, index) => {
            const file = this.app.vault.getAbstractFileByPath(entry.path);
            if (file instanceof TFile) {
                this.createFileItem(listContainer, file, entry, index + 1);
            }
        });
    }

    /**
     * 파일 아이템 생성
     */
    private createFileItem(
        container: HTMLElement, 
        file: TFile, 
        entry: RecentFileEntry, 
        order: number
    ) {
        const fileItem = container.createDiv('recent-file-item');
        
        // 순서 번호
        const orderBadge = fileItem.createDiv('file-order');
        orderBadge.setText(order.toString());
        
        // 파일 아이콘
        const icon = fileItem.createDiv('file-icon');
        icon.setText(this.getFileIcon(file.extension));
        
        // 파일 정보
        const fileInfo = fileItem.createDiv('file-info');
        
        // 파일명
        const fileName = fileInfo.createDiv('file-name');
        fileName.setText(file.basename);
        
        // 파일 경로와 시간
        const fileMeta = fileInfo.createDiv('file-meta');
        
        // 경로 (폴더명만)
        if (file.parent) {
            fileMeta.createEl('span', {
                cls: 'file-path',
                text: file.parent.path,
                title: file.path
            });
        }
        
        // 사용 시간
        fileMeta.createEl('span', {
            cls: 'file-time',
            text: this.formatRelativeTime(entry.timestamp)
        });
        
        // 파일 크기
        fileMeta.createEl('span', {
            cls: 'file-size',
            text: this.formatFileSize(file.stat.size)
        });

        // 액션 버튼들
        const actions = fileItem.createDiv('file-actions');
        
        // 선택 버튼
        const selectBtn = actions.createEl('button', {
            cls: 'select-btn',
            title: '파일 선택'
        });
        selectBtn.appendChild(this.createSelectIcon());
        selectBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.fileCallback) {
                this.fileCallback(file);
            }
        });
        
        // 제거 버튼
        const removeBtn = actions.createEl('button', {
            cls: 'remove-btn',
            title: '목록에서 제거'
        });
        removeBtn.appendChild(this.createRemoveIcon());
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeRecentFile(entry.path);
        });

        // 클릭 이벤트
        fileItem.addEventListener('click', () => {
            if (this.fileCallback) {
                this.fileCallback(file);
            }
        });

        // 파일이 존재하지 않는 경우 표시
        if (!this.app.vault.getAbstractFileByPath(entry.path)) {
            fileItem.addClass('file-not-found');
            fileName.setText(`${file.basename} (찾을 수 없음)`);
        }
    }

    /**
     * 최근 파일 추가
     */
    addRecentFile(file: TFile) {
        // 기존 항목 제거 (중복 방지)
        this.recentFiles = this.recentFiles.filter(entry => entry.path !== file.path);
        
        // 새 항목 추가 (맨 앞에)
        this.recentFiles.unshift({
            path: file.path,
            timestamp: Date.now()
        });
        
        // 최대 개수 제한
        if (this.recentFiles.length > this.MAX_RECENT_FILES) {
            this.recentFiles = this.recentFiles.slice(0, this.MAX_RECENT_FILES);
        }
        
        this.saveRecentFiles();
        this.render();
    }

    /**
     * 최근 파일 제거
     */
    private removeRecentFile(path: string) {
        this.recentFiles = this.recentFiles.filter(entry => entry.path !== path);
        this.saveRecentFiles();
        this.render();
    }

    /**
     * 최근 파일 목록 초기화
     */
    private clearRecentFiles() {
        this.recentFiles = [];
        this.saveRecentFiles();
        this.render();
    }

    /**
     * 유효한 최근 파일 가져오기
     */
    private getValidRecentFiles(): RecentFileEntry[] {
        return this.recentFiles.filter(entry => {
            const file = this.app.vault.getAbstractFileByPath(entry.path);
            return file instanceof TFile;
        });
    }

    /**
     * Obsidian API를 통해 최근 파일 로드
     */
    private loadRecentFiles() {
        try {
            if (typeof this.app.loadLocalStorage !== 'function') {
                this.recentFiles = [];
                return;
            }
            const stored = this.app.loadLocalStorage(this.STORAGE_KEY);
            if (stored) {
                this.recentFiles = JSON.parse(stored);
            }
        } catch (error) {
            console.error('Failed to load recent files:', error);
            this.recentFiles = [];
        }
    }

    /**
     * Obsidian API를 통해 최근 파일 저장
     */
    private saveRecentFiles() {
        try {
            if (typeof this.app.saveLocalStorage !== 'function') {
                return;
            }
            this.app.saveLocalStorage(this.STORAGE_KEY, JSON.stringify(this.recentFiles));
        } catch (error) {
            console.error('Failed to save recent files:', error);
        }
    }

    /**
     * 파일 선택 콜백 설정
     */
    onFileSelected(callback: (file: TFile) => void) {
        this.fileCallback = callback;
    }

    /**
     * 상대 시간 포맷팅
     */
    private formatRelativeTime(timestamp: number): string {
        const now = Date.now();
        const diff = now - timestamp;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (seconds < 60) {
            return '방금 전';
        } else if (minutes < 60) {
            return `${minutes}분 전`;
        } else if (hours < 24) {
            return `${hours}시간 전`;
        } else if (days === 1) {
            return '어제';
        } else if (days < 7) {
            return `${days}일 전`;
        } else if (days < 30) {
            const weeks = Math.floor(days / 7);
            return `${weeks}주 전`;
        } else {
            const date = new Date(timestamp);
            return date.toLocaleDateString();
        }
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
     * 파일 아이콘 가져오기
     */
    private getFileIcon(extension: string): string {
        const icons: Record<string, string> = {
            'm4a': '🎵',
            'mp3': '🎵',
            'wav': '🎵',
            'mp4': '🎬',
            'webm': '🎬',
            'ogg': '🎵'
        };
        
        return icons[extension.toLowerCase()] || '📄';
    }

    /**
     * 선택 아이콘
     */
    private createSelectIcon(): SVGElement {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '16');
        svg.setAttribute('height', '16');
        svg.setAttribute('viewBox', '0 0 16 16');
        svg.setAttribute('fill', 'none');

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M6 12L2 8L3.4 6.6L6 9.2L12.6 2.6L14 4L6 12Z');
        path.setAttribute('fill', 'currentColor');
        svg.appendChild(path);

        return svg;
    }

    /**
     * 제거 아이콘
     */
    private createRemoveIcon(): SVGElement {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '16');
        svg.setAttribute('height', '16');
        svg.setAttribute('viewBox', '0 0 16 16');
        svg.setAttribute('fill', 'none');

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M12 4L4 12M4 4L12 12');
        path.setAttribute('stroke', 'currentColor');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('stroke-linecap', 'round');
        svg.appendChild(path);

        return svg;
    }

    /**
     * 최근 파일 목록 가져오기
     */
    getRecentFilesList(): RecentFileEntry[] {
        return [...this.recentFiles];
    }
}
