/**
 * Phase 3 UX 개선 패턴 및 예제 코드
 * 
 * 이 파일은 Phase 3 UX 개선을 위한 실제 구현 패턴과 예제를 제공합니다.
 * 각 패턴은 즉시 사용 가능한 형태로 제공됩니다.
 */

import { Modal, App, Setting, Notice } from 'obsidian';

// ============================================================================
// 1. 접근성 패턴
// ============================================================================

/**
 * 접근 가능한 모달 베이스 클래스
 * WCAG 2.1 AA 기준 준수
 */
export abstract class AccessibleModal extends Modal {
    private previousFocus: HTMLElement | null = null;
    private focusableElements: HTMLElement[] = [];
    private currentFocusIndex = 0;

    constructor(app: App) {
        super(app);
        this.modalEl.addClass('accessible-modal');
    }

    onOpen(): void {
        // 이전 포커스 저장
        this.previousFocus = document.activeElement as HTMLElement;
        
        // ARIA 속성 설정
        this.setupAccessibility();
        
        // 키보드 네비게이션 설정
        this.setupKeyboardNavigation();
        
        // 포커스 트랩 설정
        this.setupFocusTrap();
        
        // 스크린 리더 알림
        this.announceModalOpen();
    }

    onClose(): void {
        // 포커스 복원
        this.previousFocus?.focus();
        
        // 스크린 리더 알림
        this.announceModalClose();
        
        // 정리
        this.cleanup();
    }

    private setupAccessibility(): void {
        this.modalEl.setAttribute('role', 'dialog');
        this.modalEl.setAttribute('aria-modal', 'true');
        this.modalEl.setAttribute('aria-labelledby', 'modal-title');
        
        // 배경 요소 숨기기 (스크린 리더)
        document.body.setAttribute('aria-hidden', 'true');
        this.modalEl.parentElement?.removeAttribute('aria-hidden');
    }

    private setupKeyboardNavigation(): void {
        this.modalEl.addEventListener('keydown', (e: KeyboardEvent) => {
            switch(e.key) {
                case 'Tab':
                    e.preventDefault();
                    this.handleTabNavigation(e.shiftKey);
                    break;
                case 'Escape':
                    this.close();
                    break;
                case 'Home':
                    e.preventDefault();
                    this.focusFirst();
                    break;
                case 'End':
                    e.preventDefault();
                    this.focusLast();
                    break;
            }
        });
    }

    private setupFocusTrap(): void {
        // 포커스 가능한 요소 수집
        const selector = `
            button:not([disabled]),
            [href]:not([disabled]),
            input:not([disabled]),
            select:not([disabled]),
            textarea:not([disabled]),
            [tabindex]:not([tabindex="-1"]):not([disabled])
        `;
        
        this.focusableElements = Array.from(
            this.modalEl.querySelectorAll(selector)
        );
        
        // 첫 번째 요소로 포커스
        if (this.focusableElements.length > 0) {
            this.focusableElements[0].focus();
        }
    }

    private handleTabNavigation(reverse: boolean): void {
        if (this.focusableElements.length === 0) return;
        
        const activeElement = document.activeElement;
        const currentIndex = this.focusableElements.indexOf(activeElement as HTMLElement);
        
        let nextIndex: number;
        if (reverse) {
            nextIndex = currentIndex <= 0 
                ? this.focusableElements.length - 1 
                : currentIndex - 1;
        } else {
            nextIndex = currentIndex >= this.focusableElements.length - 1 
                ? 0 
                : currentIndex + 1;
        }
        
        this.focusableElements[nextIndex].focus();
    }

    private focusFirst(): void {
        this.focusableElements[0]?.focus();
    }

    private focusLast(): void {
        this.focusableElements[this.focusableElements.length - 1]?.focus();
    }

    private announceModalOpen(): void {
        this.announce('대화 상자가 열렸습니다', 'polite');
    }

    private announceModalClose(): void {
        this.announce('대화 상자가 닫혔습니다', 'polite');
    }

    protected announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
        const announcement = document.createElement('div');
        announcement.setAttribute('role', 'status');
        announcement.setAttribute('aria-live', priority);
        announcement.className = 'sr-only';
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        setTimeout(() => announcement.remove(), 1000);
    }

    private cleanup(): void {
        document.body.removeAttribute('aria-hidden');
        this.focusableElements = [];
        this.currentFocusIndex = 0;
    }
}

// ============================================================================
// 2. 성능 최적화 패턴
// ============================================================================

/**
 * 가상 스크롤 구현
 * 대량의 리스트 아이템을 효율적으로 렌더링
 */
export class VirtualScrollList<T> {
    private container: HTMLElement;
    private items: T[] = [];
    private itemHeight: number;
    private visibleCount: number;
    private scrollTop = 0;
    private renderItem: (item: T, index: number) => HTMLElement;
    
    constructor(
        container: HTMLElement,
        itemHeight: number,
        renderItem: (item: T, index: number) => HTMLElement
    ) {
        this.container = container;
        this.itemHeight = itemHeight;
        this.renderItem = renderItem;
        
        // 보이는 아이템 수 계산
        this.visibleCount = Math.ceil(container.clientHeight / itemHeight) + 2;
        
        this.setupScrollListener();
    }

    setItems(items: T[]): void {
        this.items = items;
        this.render();
    }

    private setupScrollListener(): void {
        let rafId: number | null = null;
        
        this.container.addEventListener('scroll', () => {
            if (rafId !== null) {
                cancelAnimationFrame(rafId);
            }
            
            rafId = requestAnimationFrame(() => {
                this.scrollTop = this.container.scrollTop;
                this.render();
                rafId = null;
            });
        });
    }

    private render(): void {
        // 가상 컨테이너 높이 설정
        const totalHeight = this.items.length * this.itemHeight;
        
        // 스크롤 컨테이너
        let scrollContainer = this.container.querySelector('.virtual-scroll-container') as HTMLElement;
        if (!scrollContainer) {
            scrollContainer = this.container.createDiv('virtual-scroll-container');
        }
        scrollContainer.style.height = `${totalHeight}px`;
        scrollContainer.style.position = 'relative';
        
        // 보이는 범위 계산
        const startIndex = Math.floor(this.scrollTop / this.itemHeight);
        const endIndex = Math.min(
            startIndex + this.visibleCount,
            this.items.length
        );
        
        // 기존 아이템 제거
        this.container.querySelectorAll('.virtual-item').forEach(el => el.remove());
        
        // 보이는 아이템만 렌더링
        for (let i = startIndex; i < endIndex; i++) {
            const item = this.items[i];
            const element = this.renderItem(item, i);
            element.addClass('virtual-item');
            element.style.position = 'absolute';
            element.style.top = `${i * this.itemHeight}px`;
            element.style.height = `${this.itemHeight}px`;
            element.style.width = '100%';
            scrollContainer.appendChild(element);
        }
    }

    scrollToIndex(index: number): void {
        const scrollTop = index * this.itemHeight;
        this.container.scrollTop = scrollTop;
    }
}

/**
 * 디바운스/쓰로틀 유틸리티
 */
export class PerformanceUtils {
    /**
     * 디바운스 함수
     * 연속적인 호출을 지연시켜 마지막 호출만 실행
     */
    static debounce<T extends (...args: any[]) => any>(
        func: T,
        wait: number
    ): (...args: Parameters<T>) => void {
        let timeout: NodeJS.Timeout;
        
        return function debounced(...args: Parameters<T>) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    }

    /**
     * 쓰로틀 함수
     * 일정 시간 간격으로만 함수 실행
     */
    static throttle<T extends (...args: any[]) => any>(
        func: T,
        limit: number
    ): (...args: Parameters<T>) => void {
        let inThrottle: boolean;
        let lastFunc: NodeJS.Timeout;
        let lastRan: number;
        
        return function throttled(...args: Parameters<T>) {
            if (!inThrottle) {
                func(...args);
                lastRan = Date.now();
                inThrottle = true;
            } else {
                clearTimeout(lastFunc);
                lastFunc = setTimeout(() => {
                    if ((Date.now() - lastRan) >= limit) {
                        func(...args);
                        lastRan = Date.now();
                    }
                }, Math.max(limit - (Date.now() - lastRan), 0));
            }
        };
    }

    /**
     * RequestIdleCallback 래퍼
     * 브라우저가 유휴 상태일 때 작업 실행
     */
    static whenIdle(callback: () => void, timeout = 1000): void {
        if ('requestIdleCallback' in window) {
            requestIdleCallback(callback, { timeout });
        } else {
            setTimeout(callback, 0);
        }
    }

    /**
     * 청크 단위 처리
     * 대량 데이터를 나누어 처리
     */
    static async processInChunks<T>(
        items: T[],
        processor: (item: T) => Promise<void>,
        chunkSize = 10
    ): Promise<void> {
        for (let i = 0; i < items.length; i += chunkSize) {
            const chunk = items.slice(i, i + chunkSize);
            await Promise.all(chunk.map(processor));
            
            // UI 업데이트 기회 제공
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }
}

// ============================================================================
// 3. 반응형 디자인 패턴
// ============================================================================

/**
 * 반응형 컴포넌트 베이스
 */
export class ResponsiveComponent {
    protected container: HTMLElement;
    protected isMobile = false;
    protected isTablet = false;
    protected isDesktop = false;
    
    private resizeObserver: ResizeObserver;
    private mediaQueries: Map<string, MediaQueryList> = new Map();

    constructor(container: HTMLElement) {
        this.container = container;
        this.setupMediaQueries();
        this.setupResizeObserver();
        this.updateLayout();
    }

    private setupMediaQueries(): void {
        const queries = {
            mobile: '(max-width: 768px)',
            tablet: '(min-width: 769px) and (max-width: 1024px)',
            desktop: '(min-width: 1025px)'
        };

        Object.entries(queries).forEach(([key, query]) => {
            const mq = window.matchMedia(query);
            this.mediaQueries.set(key, mq);
            
            // 리스너 추가
            mq.addListener(() => this.updateLayout());
        });
    }

    private setupResizeObserver(): void {
        this.resizeObserver = new ResizeObserver(
            PerformanceUtils.debounce(() => {
                this.updateLayout();
            }, 250)
        );
        
        this.resizeObserver.observe(this.container);
    }

    protected updateLayout(): void {
        // 현재 뷰포트 상태 업데이트
        this.isMobile = this.mediaQueries.get('mobile')?.matches ?? false;
        this.isTablet = this.mediaQueries.get('tablet')?.matches ?? false;
        this.isDesktop = this.mediaQueries.get('desktop')?.matches ?? false;
        
        // 클래스 업데이트
        this.container.classList.toggle('mobile-view', this.isMobile);
        this.container.classList.toggle('tablet-view', this.isTablet);
        this.container.classList.toggle('desktop-view', this.isDesktop);
        
        // 하위 클래스에서 구현
        this.onLayoutChange();
    }

    protected onLayoutChange(): void {
        // 하위 클래스에서 오버라이드
    }

    destroy(): void {
        this.resizeObserver.disconnect();
        this.mediaQueries.forEach(mq => {
            // MediaQueryList의 removeListener는 deprecated이므로
            // 새로운 방식으로 처리 필요
        });
    }
}

/**
 * 터치 제스처 지원
 */
export class TouchGestureHandler {
    private element: HTMLElement;
    private touchStartX = 0;
    private touchStartY = 0;
    private touchEndX = 0;
    private touchEndY = 0;
    
    constructor(element: HTMLElement) {
        this.element = element;
        this.setupTouchListeners();
    }

    private setupTouchListeners(): void {
        // 터치 시작
        this.element.addEventListener('touchstart', (e) => {
            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY;
        }, { passive: true });
        
        // 터치 이동
        this.element.addEventListener('touchmove', (e) => {
            // 스크롤 방지가 필요한 경우
            if (this.shouldPreventScroll(e)) {
                e.preventDefault();
            }
        }, { passive: false });
        
        // 터치 종료
        this.element.addEventListener('touchend', (e) => {
            this.touchEndX = e.changedTouches[0].clientX;
            this.touchEndY = e.changedTouches[0].clientY;
            this.handleGesture();
        }, { passive: true });
    }

    private shouldPreventScroll(e: TouchEvent): boolean {
        // 수평 스와이프가 더 큰 경우 스크롤 방지
        const deltaX = Math.abs(e.touches[0].clientX - this.touchStartX);
        const deltaY = Math.abs(e.touches[0].clientY - this.touchStartY);
        return deltaX > deltaY;
    }

    private handleGesture(): void {
        const deltaX = this.touchEndX - this.touchStartX;
        const deltaY = this.touchEndY - this.touchStartY;
        const threshold = 50; // 최소 스와이프 거리
        
        // 수평 스와이프
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > threshold) {
            if (deltaX > 0) {
                this.onSwipeRight();
            } else {
                this.onSwipeLeft();
            }
        }
        
        // 수직 스와이프
        if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > threshold) {
            if (deltaY > 0) {
                this.onSwipeDown();
            } else {
                this.onSwipeUp();
            }
        }
    }

    // 오버라이드할 메서드들
    protected onSwipeLeft(): void {}
    protected onSwipeRight(): void {}
    protected onSwipeUp(): void {}
    protected onSwipeDown(): void {}
}

// ============================================================================
// 4. 피드백 시스템 패턴
// ============================================================================

/**
 * 향상된 알림 시스템
 */
export class EnhancedNotification {
    private static queue: NotificationItem[] = [];
    private static isProcessing = false;
    
    interface NotificationItem {
        message: string;
        type: 'info' | 'success' | 'warning' | 'error';
        duration?: number;
        action?: {
            label: string;
            callback: () => void;
        };
    }

    static show(item: NotificationItem): void {
        this.queue.push(item);
        this.processQueue();
    }

    private static async processQueue(): Promise<void> {
        if (this.isProcessing || this.queue.length === 0) return;
        
        this.isProcessing = true;
        const item = this.queue.shift()!;
        
        // 알림 표시
        const notification = this.createNotification(item);
        document.body.appendChild(notification);
        
        // 애니메이션
        await this.animateIn(notification);
        
        // 대기
        await new Promise(resolve => 
            setTimeout(resolve, item.duration || 3000)
        );
        
        // 제거
        await this.animateOut(notification);
        notification.remove();
        
        this.isProcessing = false;
        
        // 다음 알림 처리
        if (this.queue.length > 0) {
            this.processQueue();
        }
    }

    private static createNotification(item: NotificationItem): HTMLElement {
        const notification = document.createElement('div');
        notification.className = `enhanced-notification notification-${item.type}`;
        
        // 아이콘
        const icon = document.createElement('span');
        icon.className = 'notification-icon';
        icon.textContent = this.getIcon(item.type);
        notification.appendChild(icon);
        
        // 메시지
        const message = document.createElement('span');
        message.className = 'notification-message';
        message.textContent = item.message;
        notification.appendChild(message);
        
        // 액션 버튼
        if (item.action) {
            const button = document.createElement('button');
            button.className = 'notification-action';
            button.textContent = item.action.label;
            button.onclick = item.action.callback;
            notification.appendChild(button);
        }
        
        // 닫기 버튼
        const closeBtn = document.createElement('button');
        closeBtn.className = 'notification-close';
        closeBtn.textContent = '×';
        closeBtn.onclick = () => {
            this.animateOut(notification).then(() => notification.remove());
        };
        notification.appendChild(closeBtn);
        
        // 접근성
        notification.setAttribute('role', 'alert');
        notification.setAttribute('aria-live', 'polite');
        
        return notification;
    }

    private static getIcon(type: string): string {
        const icons = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '❌'
        };
        return icons[type] || 'ℹ️';
    }

    private static async animateIn(element: HTMLElement): Promise<void> {
        element.style.opacity = '0';
        element.style.transform = 'translateY(-20px)';
        element.style.transition = 'all 0.3s ease-out';
        
        await new Promise(resolve => setTimeout(resolve, 10));
        
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
        
        await new Promise(resolve => setTimeout(resolve, 300));
    }

    private static async animateOut(element: HTMLElement): Promise<void> {
        element.style.opacity = '0';
        element.style.transform = 'translateY(-20px)';
        
        await new Promise(resolve => setTimeout(resolve, 300));
    }
}

/**
 * 진행 상태 매니저
 */
export class ProgressManager {
    private container: HTMLElement;
    private progressBar: HTMLElement | null = null;
    private statusText: HTMLElement | null = null;
    private currentProgress = 0;
    private targetProgress = 0;
    private animationId: number | null = null;

    constructor(container: HTMLElement) {
        this.container = container;
        this.createProgressUI();
    }

    private createProgressUI(): void {
        const wrapper = this.container.createDiv('progress-wrapper');
        
        // 진행률 바
        const barContainer = wrapper.createDiv('progress-bar-container');
        this.progressBar = barContainer.createDiv('progress-bar-fill');
        
        // 상태 텍스트
        this.statusText = wrapper.createDiv('progress-status');
        this.statusText.textContent = '준비 중...';
    }

    setProgress(percent: number, message?: string): void {
        this.targetProgress = Math.min(100, Math.max(0, percent));
        
        if (message) {
            this.statusText!.textContent = message;
        }
        
        this.animateProgress();
    }

    private animateProgress(): void {
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
        }
        
        const animate = () => {
            const diff = this.targetProgress - this.currentProgress;
            
            if (Math.abs(diff) < 0.1) {
                this.currentProgress = this.targetProgress;
            } else {
                // 부드러운 애니메이션
                this.currentProgress += diff * 0.1;
            }
            
            // UI 업데이트
            this.progressBar!.style.width = `${this.currentProgress}%`;
            
            // 색상 변경
            if (this.currentProgress < 30) {
                this.progressBar!.className = 'progress-bar-fill progress-start';
            } else if (this.currentProgress < 70) {
                this.progressBar!.className = 'progress-bar-fill progress-middle';
            } else {
                this.progressBar!.className = 'progress-bar-fill progress-end';
            }
            
            // 계속 애니메이션
            if (Math.abs(this.targetProgress - this.currentProgress) > 0.1) {
                this.animationId = requestAnimationFrame(animate);
            } else {
                this.animationId = null;
                
                // 완료시 콜백
                if (this.currentProgress >= 100) {
                    this.onComplete();
                }
            }
        };
        
        this.animationId = requestAnimationFrame(animate);
    }

    private onComplete(): void {
        this.statusText!.textContent = '완료!';
        
        // 자동 숨김
        setTimeout(() => {
            this.hide();
        }, 1000);
    }

    show(): void {
        this.container.style.display = 'block';
        this.setProgress(0, '시작 중...');
    }

    hide(): void {
        this.container.style.opacity = '0';
        setTimeout(() => {
            this.container.style.display = 'none';
            this.container.style.opacity = '1';
            this.reset();
        }, 300);
    }

    reset(): void {
        this.currentProgress = 0;
        this.targetProgress = 0;
        this.progressBar!.style.width = '0%';
        this.statusText!.textContent = '준비 중...';
    }
}

// ============================================================================
// 5. 통합 예제: 향상된 파일 선택기
// ============================================================================

/**
 * 모든 패턴을 적용한 파일 선택기
 */
export class EnhancedFilePicker extends AccessibleModal {
    private virtualList: VirtualScrollList<FileItem>;
    private progressManager: ProgressManager;
    private searchDebounced: () => void;
    private touchHandler: TouchGestureHandler;
    
    interface FileItem {
        name: string;
        path: string;
        size: number;
        modified: Date;
    }

    constructor(app: App) {
        super(app);
        
        // 반응형 설정
        this.modalEl.addClass('enhanced-file-picker');
        this.setupResponsive();
    }

    onOpen(): void {
        super.onOpen();
        
        const { contentEl } = this;
        contentEl.empty();
        
        // 제목
        const title = contentEl.createEl('h2', { 
            text: '파일 선택',
            attr: { id: 'modal-title' }
        });
        
        // 검색 바
        this.createSearchBar(contentEl);
        
        // 파일 목록 (가상 스크롤)
        this.createFileList(contentEl);
        
        // 진행 상태
        const progressContainer = contentEl.createDiv('progress-container');
        this.progressManager = new ProgressManager(progressContainer);
        
        // 액션 버튼
        this.createActions(contentEl);
        
        // 터치 제스처 (모바일)
        if (this.isMobile()) {
            this.setupTouchGestures();
        }
    }

    private createSearchBar(container: HTMLElement): void {
        const searchBar = container.createDiv('search-bar');
        
        const input = searchBar.createEl('input', {
            type: 'text',
            placeholder: '파일 검색...',
            attr: {
                'aria-label': '파일 검색',
                'role': 'searchbox'
            }
        });
        
        // 디바운스된 검색
        this.searchDebounced = PerformanceUtils.debounce(() => {
            this.performSearch(input.value);
        }, 300);
        
        input.addEventListener('input', this.searchDebounced);
    }

    private createFileList(container: HTMLElement): void {
        const listContainer = container.createDiv('file-list-container');
        listContainer.style.height = '400px';
        listContainer.style.overflow = 'auto';
        
        // 가상 스크롤 설정
        this.virtualList = new VirtualScrollList<FileItem>(
            listContainer,
            40,
            (item, index) => this.renderFileItem(item, index)
        );
        
        // 샘플 데이터 로드
        this.loadFiles();
    }

    private renderFileItem(item: FileItem, index: number): HTMLElement {
        const element = document.createElement('div');
        element.className = 'file-item';
        element.setAttribute('role', 'option');
        element.setAttribute('aria-selected', 'false');
        element.tabIndex = 0;
        
        // 파일 정보
        const name = element.createDiv('file-name');
        name.textContent = item.name;
        
        const meta = element.createDiv('file-meta');
        meta.textContent = `${this.formatSize(item.size)} • ${this.formatDate(item.modified)}`;
        
        // 클릭 이벤트
        element.addEventListener('click', () => {
            this.selectFile(item);
        });
        
        // 키보드 이벤트
        element.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.selectFile(item);
            }
        });
        
        return element;
    }

    private createActions(container: HTMLElement): void {
        const actions = container.createDiv('modal-actions');
        
        // 취소 버튼
        const cancelBtn = actions.createEl('button', {
            text: '취소',
            cls: 'btn-secondary'
        });
        cancelBtn.addEventListener('click', () => this.close());
        
        // 선택 버튼
        const selectBtn = actions.createEl('button', {
            text: '선택',
            cls: 'btn-primary'
        });
        selectBtn.addEventListener('click', () => this.confirmSelection());
    }

    private setupResponsive(): void {
        const mobileQuery = window.matchMedia('(max-width: 768px)');
        
        const handleMobileChange = (e: MediaQueryList | MediaQueryListEvent) => {
            if (e.matches) {
                this.modalEl.addClass('mobile-modal');
            } else {
                this.modalEl.removeClass('mobile-modal');
            }
        };
        
        handleMobileChange(mobileQuery);
        mobileQuery.addListener(handleMobileChange);
    }

    private setupTouchGestures(): void {
        this.touchHandler = new class extends TouchGestureHandler {
            constructor(element: HTMLElement, private modal: EnhancedFilePicker) {
                super(element);
            }
            
            protected onSwipeDown(): void {
                // 아래로 스와이프시 닫기
                this.modal.close();
            }
        }(this.modalEl, this);
    }

    private async loadFiles(): Promise<void> {
        this.progressManager.show();
        this.progressManager.setProgress(0, '파일 목록 로딩 중...');
        
        // 시뮬레이션
        const files: FileItem[] = [];
        for (let i = 0; i < 1000; i++) {
            files.push({
                name: `File ${i + 1}.md`,
                path: `/path/to/file${i + 1}.md`,
                size: Math.random() * 1000000,
                modified: new Date()
            });
            
            // 진행률 업데이트
            if (i % 100 === 0) {
                this.progressManager.setProgress((i / 1000) * 100);
                await new Promise(resolve => setTimeout(resolve, 10));
            }
        }
        
        this.virtualList.setItems(files);
        this.progressManager.setProgress(100, '완료!');
        
        setTimeout(() => {
            this.progressManager.hide();
        }, 500);
    }

    private performSearch(query: string): void {
        // 검색 로직
        this.announce(`"${query}" 검색 중...`, 'polite');
        
        // 검색 결과 필터링 및 업데이트
        // ...
    }

    private selectFile(file: FileItem): void {
        // 파일 선택 로직
        this.announce(`${file.name} 선택됨`, 'polite');
        
        // UI 업데이트
        // ...
    }

    private confirmSelection(): void {
        // 선택 확인 로직
        EnhancedNotification.show({
            message: '파일이 선택되었습니다',
            type: 'success',
            duration: 2000
        });
        
        this.close();
    }

    private formatSize(bytes: number): string {
        const sizes = ['B', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
    }

    private formatDate(date: Date): string {
        return date.toLocaleDateString('ko-KR');
    }

    private isMobile(): boolean {
        return window.matchMedia('(max-width: 768px)').matches;
    }
}

// ============================================================================
// 6. CSS 스타일 (styles.css에 추가)
// ============================================================================

const styles = `
/* 접근성 스타일 */
.sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
}

.focus-visible:focus {
    outline: 2px solid var(--interactive-accent);
    outline-offset: 2px;
}

/* 가상 스크롤 */
.virtual-scroll-container {
    position: relative;
    overflow: auto;
}

.virtual-item {
    position: absolute;
    width: 100%;
}

/* 진행률 바 */
.progress-wrapper {
    margin: 1rem 0;
}

.progress-bar-container {
    height: 4px;
    background: var(--background-modifier-border);
    border-radius: 2px;
    overflow: hidden;
}

.progress-bar-fill {
    height: 100%;
    transition: width 0.3s ease, background-color 0.3s ease;
}

.progress-start {
    background: var(--text-muted);
}

.progress-middle {
    background: var(--interactive-accent);
}

.progress-end {
    background: var(--text-success);
}

/* 알림 시스템 */
.enhanced-notification {
    position: fixed;
    top: 20px;
    right: 20px;
    min-width: 300px;
    padding: 1rem;
    background: var(--background-primary);
    border: 1px solid var(--background-modifier-border);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    z-index: 10000;
}

.notification-success {
    border-left: 4px solid var(--text-success);
}

.notification-error {
    border-left: 4px solid var(--text-error);
}

.notification-warning {
    border-left: 4px solid var(--text-warning);
}

/* 반응형 모달 */
@media (max-width: 768px) {
    .mobile-modal {
        position: fixed !important;
        bottom: 0 !important;
        left: 0 !important;
        right: 0 !important;
        width: 100% !important;
        max-width: none !important;
        border-radius: 16px 16px 0 0 !important;
        max-height: 90vh;
        animation: slideUp 0.3s ease-out;
    }
}

@keyframes slideUp {
    from {
        transform: translateY(100%);
    }
    to {
        transform: translateY(0);
    }
}

/* 터치 최적화 */
@media (hover: none) {
    .btn-primary,
    .btn-secondary,
    .file-item {
        min-height: 44px;
        display: flex;
        align-items: center;
    }
}
`;

export { styles };