/**
 * 드래그 앤 드롭 영역 컴포넌트
 * - 파일 드래그 앤 드롭 지원
 * - 시각적 피드백 제공
 * - 파일 형식 필터링
 */
export class DragDropZone {
    private container: HTMLElement | null = null;
    private dropZone: HTMLElement | null = null;
    private fileCallback: ((files: File[]) => void) | null = null;
    private acceptedFormats: string[] = [];
    private isDragging = false;
    private dragCounter = 0;

    constructor(acceptedFormats?: string[]) {
        this.acceptedFormats = acceptedFormats || ['m4a', 'mp3', 'wav', 'mp4', 'webm', 'ogg'];
    }

    /**
     * 컴포넌트 마운트
     */
    mount(container: HTMLElement) {
        this.container = container;
        this.createDropZone();
        this.attachEventListeners();
    }

    /**
     * 컴포넌트 언마운트
     */
    unmount() {
        this.detachEventListeners();
        this.dropZone?.remove();
        this.container = null;
        this.dropZone = null;
    }

    /**
     * 드롭 영역 생성
     */
    private createDropZone() {
        if (!this.container) return;

        this.dropZone = this.container.createDiv('drag-drop-zone');

        // 아이콘
        const iconContainer = this.dropZone.createDiv('drop-zone-icon');
        iconContainer.appendChild(this.createUploadIcon());

        // 메인 텍스트
        const mainText = this.dropZone.createDiv('drop-zone-text');
        mainText.createEl('h3', { text: '파일을 여기에 드롭하세요' });

        // 서브 텍스트
        const subText = mainText.createEl('p', { cls: 'drop-zone-subtext' });
        subText.setText('또는 클릭하여 파일 선택');

        // 지원 형식 표시
        const formats = mainText.createEl('p', { cls: 'drop-zone-formats' });
        formats.setText(`지원 형식: ${this.acceptedFormats.map((f) => `.${f}`).join(', ')}`);

        // 숨겨진 파일 입력
        const fileInput = this.dropZone.createEl('input', {
            type: 'file',
            cls: 'drop-zone-input',
        });
        fileInput.accept = this.acceptedFormats.map((f) => `.${f}`).join(',');
        fileInput.multiple = true;

        // 클릭 이벤트
        this.dropZone.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            const target = e.target;
            if (target instanceof HTMLInputElement && target.files && target.files.length > 0) {
                this.handleFiles(Array.from(target.files));
            }
        });
    }

    /**
     * 이벤트 리스너 연결
     */
    private attachEventListeners() {
        if (!this.dropZone) return;

        // 드래그 이벤트
        this.dropZone.addEventListener('dragenter', this.handleDragEnter);
        this.dropZone.addEventListener('dragleave', this.handleDragLeave);
        this.dropZone.addEventListener('dragover', this.handleDragOver);
        this.dropZone.addEventListener('drop', this.handleDrop);

        // 전체 문서에 대한 드래그 방지
        document.addEventListener('dragover', this.preventDefaultDrag);
        document.addEventListener('drop', this.preventDefaultDrag);
    }

    /**
     * 이벤트 리스너 해제
     */
    private detachEventListeners() {
        if (!this.dropZone) return;

        this.dropZone.removeEventListener('dragenter', this.handleDragEnter);
        this.dropZone.removeEventListener('dragleave', this.handleDragLeave);
        this.dropZone.removeEventListener('dragover', this.handleDragOver);
        this.dropZone.removeEventListener('drop', this.handleDrop);

        document.removeEventListener('dragover', this.preventDefaultDrag);
        document.removeEventListener('drop', this.preventDefaultDrag);
    }

    /**
     * 드래그 진입 처리
     */
    private readonly handleDragEnter = (e: DragEvent): void => {
        e.preventDefault();
        e.stopPropagation();

        this.dragCounter++;

        if (e.dataTransfer?.items) {
            const hasValidFile = this.hasValidFiles(e.dataTransfer);
            if (hasValidFile) {
                this.setDragging(true);
            }
        }
    };

    /**
     * 드래그 떠남 처리
     */
    private readonly handleDragLeave = (e: DragEvent): void => {
        e.preventDefault();
        e.stopPropagation();

        this.dragCounter--;

        if (this.dragCounter === 0) {
            this.setDragging(false);
        }
    };

    /**
     * 드래그 오버 처리
     */
    private readonly handleDragOver = (e: DragEvent): void => {
        e.preventDefault();
        e.stopPropagation();

        if (e.dataTransfer) {
            e.dataTransfer.dropEffect = 'copy';
        }
    };

    /**
     * 드롭 처리
     */
    private readonly handleDrop = (e: DragEvent): void => {
        e.preventDefault();
        e.stopPropagation();

        this.dragCounter = 0;
        this.setDragging(false);

        const files = this.getFilesFromEvent(e);
        if (files.length > 0) {
            this.handleFiles(files);
        }
    };

    /**
     * 기본 드래그 동작 방지
     */
    private readonly preventDefaultDrag = (e: Event): void => {
        e.preventDefault();
    };

    /**
     * 드래그 상태 설정
     */
    private setDragging(isDragging: boolean) {
        this.isDragging = isDragging;

        if (this.dropZone) {
            if (isDragging) {
                this.dropZone.addClass('dragging');
                this.showDragOverlay();
            } else {
                this.dropZone.removeClass('dragging');
                this.hideDragOverlay();
            }
        }
    }

    /**
     * 드래그 오버레이 표시
     */
    private showDragOverlay() {
        if (!this.dropZone) return;

        const existingOverlay = this.dropZone.querySelector('.drag-overlay');
        let overlay: HTMLElement;
        if (existingOverlay instanceof HTMLElement) {
            overlay = existingOverlay;
        } else {
            overlay = this.dropZone.createDiv('drag-overlay');
            const content = overlay.createDiv('drag-overlay-content');
            const icon = content.createDiv('drag-overlay-icon');
            icon.appendChild(this.createDropIcon());
            content.createDiv('drag-overlay-text').setText('파일을 여기에 놓으세요');
        }
        overlay.addClass('active');
    }

    /**
     * 드래그 오버레이 숨기기
     */
    private hideDragOverlay() {
        const overlay = this.dropZone?.querySelector('.drag-overlay');
        if (overlay instanceof HTMLElement) {
            overlay.removeClass('active');
        }
    }

    /**
     * 이벤트에서 파일 추출
     */
    private getFilesFromEvent(e: DragEvent): File[] {
        const files: File[] = [];

        if (e.dataTransfer?.files) {
            for (let i = 0; i < e.dataTransfer.files.length; i++) {
                const file = e.dataTransfer.files[i];
                if (this.isValidFile(file)) {
                    files.push(file);
                }
            }
        }

        return files;
    }

    /**
     * 유효한 파일 확인
     */
    private hasValidFiles(dataTransfer: DataTransfer): boolean {
        if (!dataTransfer.items) return false;

        for (let i = 0; i < dataTransfer.items.length; i++) {
            const item = dataTransfer.items[i];
            if (item.kind === 'file') {
                // 타입 체크 (브라우저가 지원하는 경우)
                if (item.type) {
                    const isAudio =
                        item.type.startsWith('audio/') || item.type.startsWith('video/');
                    if (isAudio) return true;
                }
                return true; // 타입을 알 수 없어도 일단 허용
            }
        }

        return false;
    }

    /**
     * 파일 유효성 검사
     */
    private isValidFile(file: File): boolean {
        const extension = this.getFileExtension(file.name);
        return this.acceptedFormats.includes(extension.toLowerCase());
    }

    /**
     * 파일 확장자 추출
     */
    private getFileExtension(filename: string): string {
        const parts = filename.split('.');
        return parts.length > 1 ? parts[parts.length - 1] : '';
    }

    /**
     * 파일 처리
     */
    private handleFiles(files: File[]) {
        const validFiles = files.filter((file) => this.isValidFile(file));

        if (validFiles.length === 0) {
            this.showError('유효한 오디오 파일이 없습니다');
            return;
        }

        if (this.fileCallback) {
            this.fileCallback(validFiles);
        }

        // 시각적 피드백
        this.showSuccess(`${validFiles.length}개 파일 선택됨`);
    }

    /**
     * 성공 메시지 표시
     */
    private showSuccess(message: string) {
        this.showMessage(message, 'success');
    }

    /**
     * 오류 메시지 표시
     */
    private showError(message: string) {
        this.showMessage(message, 'error');
    }

    /**
     * 메시지 표시
     */
    private showMessage(message: string, type: 'success' | 'error') {
        if (!this.dropZone) return;

        const messageEl = this.dropZone.createDiv(`drop-zone-message ${type}`);
        messageEl.setText(message);

        setTimeout(() => {
            messageEl.remove();
        }, 3000);
    }

    /**
     * 파일 드롭 콜백 설정
     */
    onFilesDropped(callback: (files: File[]) => void) {
        this.fileCallback = callback;
    }

    /**
     * 업로드 아이콘 SVG
     */
    private createUploadIcon(): SVGElement {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '64');
        svg.setAttribute('height', '64');
        svg.setAttribute('viewBox', '0 0 64 64');
        svg.setAttribute('fill', 'none');

        const paths = [
            'M42.667 42.667L32 32L21.333 42.667',
            'M32 32V56',
            'M54.373 46.373C56.871 43.875 58.667 40.617 58.667 37.333C58.667 30.707 53.293 25.333 46.667 25.333C45.827 25.333 45.013 25.44 44.24 25.64C41.795 18.747 35.488 13.333 28 13.333C18.427 13.333 10.667 21.093 10.667 30.667C10.667 31.947 10.827 33.187 11.12 34.373C6.88 35.92 4 39.947 4 44.667C4 50.56 8.773 55.333 14.667 55.333',
        ];

        paths.forEach((d) => {
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', d);
            path.setAttribute('stroke', 'currentColor');
            path.setAttribute('stroke-width', '2');
            path.setAttribute('stroke-linecap', 'round');
            path.setAttribute('stroke-linejoin', 'round');
            svg.appendChild(path);
        });

        return svg;
    }

    /**
     * 드롭 아이콘 SVG
     */
    private createDropIcon(): SVGElement {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '48');
        svg.setAttribute('height', '48');
        svg.setAttribute('viewBox', '0 0 48 48');
        svg.setAttribute('fill', 'none');

        const pathData = ['M8 30L24 14L40 30', 'M24 14V38'];

        pathData.forEach((d) => {
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', d);
            path.setAttribute('stroke', 'currentColor');
            path.setAttribute('stroke-width', '3');
            path.setAttribute('stroke-linecap', 'round');
            path.setAttribute('stroke-linejoin', 'round');
            svg.appendChild(path);
        });

        return svg;
    }

    /**
     * 수락 형식 설정
     */
    setAcceptedFormats(formats: string[]) {
        this.acceptedFormats = formats;

        // UI 업데이트
        const formatsEl = this.dropZone?.querySelector('.drop-zone-formats');
        if (formatsEl instanceof HTMLElement) {
            formatsEl.setText(`지원 형식: ${formats.map((f) => `.${f}`).join(', ')}`);
        }

        const input = this.dropZone?.querySelector('.drop-zone-input');
        if (input instanceof HTMLInputElement) {
            input.accept = formats.map((f) => `.${f}`).join(',');
        }
    }
}
