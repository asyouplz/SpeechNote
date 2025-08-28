/**
 * 접근성 향상을 위한 유틸리티 및 컴포넌트
 * 
 * WCAG 2.1 레벨 AA 준수
 * - 키보드 네비게이션
 * - 스크린 리더 지원
 * - 고대비 모드
 * - 포커스 관리
 */

/**
 * 접근성 관리자
 */
export class AccessibilityManager {
    private focusTrap: FocusTrap | null = null;
    private announcer: ScreenReaderAnnouncer;
    private keyboardNav: KeyboardNavigationManager;
    
    constructor(private container: HTMLElement) {
        this.announcer = new ScreenReaderAnnouncer(container);
        this.keyboardNav = new KeyboardNavigationManager(container);
    }
    
    /**
     * 접근성 기능 초기화
     */
    initialize(): void {
        this.setupAriaRegions();
        this.setupKeyboardShortcuts();
        this.setupFocusManagement();
        this.setupHighContrastMode();
    }
    
    /**
     * ARIA 영역 설정
     */
    private setupAriaRegions(): void {
        // 메인 영역
        this.container.setAttribute('role', 'main');
        this.container.setAttribute('aria-label', '설정 패널');
        
        // 라이브 리전 생성
        this.announcer.createLiveRegion();
        
        // 네비게이션 랜드마크
        const nav = this.container.querySelector('.settings-nav');
        if (nav) {
            nav.setAttribute('role', 'navigation');
            nav.setAttribute('aria-label', '설정 네비게이션');
        }
    }
    
    /**
     * 키보드 단축키 설정
     */
    private setupKeyboardShortcuts(): void {
        this.keyboardNav.registerShortcut('Alt+S', () => {
            this.announcer.announce('설정 저장');
            // 저장 로직
        });
        
        this.keyboardNav.registerShortcut('Alt+R', () => {
            this.announcer.announce('설정 초기화');
            // 초기화 로직
        });
        
        this.keyboardNav.registerShortcut('Escape', () => {
            this.announcer.announce('설정 패널 닫기');
            // 닫기 로직
        });
    }
    
    /**
     * 포커스 관리 설정
     */
    private setupFocusManagement(): void {
        // 포커스 트랩 생성
        this.focusTrap = new FocusTrap(this.container);
        
        // 초기 포커스 설정
        const firstFocusable = this.container.querySelector<HTMLElement>(
            'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (firstFocusable) {
            firstFocusable.focus();
        }
    }
    
    /**
     * 고대비 모드 설정
     */
    private setupHighContrastMode(): void {
        const prefersHighContrast = window.matchMedia('(prefers-contrast: high)');
        
        if (prefersHighContrast.matches) {
            this.container.classList.add('high-contrast');
        }
        
        prefersHighContrast.addEventListener('change', (e) => {
            if (e.matches) {
                this.container.classList.add('high-contrast');
            } else {
                this.container.classList.remove('high-contrast');
            }
        });
    }
    
    /**
     * 정리
     */
    destroy(): void {
        this.focusTrap?.destroy();
        this.keyboardNav.destroy();
        this.announcer.destroy();
    }
}

/**
 * 스크린 리더 알림 관리자
 */
export class ScreenReaderAnnouncer {
    private liveRegion: HTMLElement | null = null;
    private announcementQueue: string[] = [];
    private isProcessing = false;
    
    constructor(private container: HTMLElement) {}
    
    /**
     * 라이브 리전 생성
     */
    createLiveRegion(): void {
        if (this.liveRegion) return;
        
        this.liveRegion = document.createElement('div');
        this.liveRegion.className = 'sr-only';
        this.liveRegion.setAttribute('aria-live', 'polite');
        this.liveRegion.setAttribute('aria-atomic', 'true');
        this.liveRegion.setAttribute('role', 'status');
        
        this.container.appendChild(this.liveRegion);
    }
    
    /**
     * 알림 발송
     */
    announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
        if (!this.liveRegion) {
            this.createLiveRegion();
        }
        
        this.announcementQueue.push(message);
        
        if (priority === 'assertive') {
            this.liveRegion!.setAttribute('aria-live', 'assertive');
        }
        
        this.processQueue();
    }
    
    /**
     * 큐 처리
     */
    private async processQueue(): Promise<void> {
        if (this.isProcessing || this.announcementQueue.length === 0) return;
        
        this.isProcessing = true;
        
        while (this.announcementQueue.length > 0) {
            const message = this.announcementQueue.shift()!;
            
            if (this.liveRegion) {
                this.liveRegion.textContent = message;
                
                // 스크린 리더가 읽을 시간 확보
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // 메시지 초기화
                this.liveRegion.textContent = '';
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        this.isProcessing = false;
        
        // 기본값으로 복원
        this.liveRegion?.setAttribute('aria-live', 'polite');
    }
    
    /**
     * 정리
     */
    destroy(): void {
        this.liveRegion?.remove();
        this.liveRegion = null;
        this.announcementQueue = [];
    }
}

/**
 * 키보드 네비게이션 관리자
 */
export class KeyboardNavigationManager {
    private shortcuts = new Map<string, () => void>();
    private focusableElements: HTMLElement[] = [];
    private currentFocusIndex = 0;
    private keyHandler: (e: KeyboardEvent) => void;
    
    constructor(private container: HTMLElement) {
        this.keyHandler = this.handleKeyPress.bind(this);
        this.initialize();
    }
    
    /**
     * 초기화
     */
    private initialize(): void {
        this.updateFocusableElements();
        this.container.addEventListener('keydown', this.keyHandler);
        
        // 포커스 가능 요소 변경 감지
        const observer = new MutationObserver(() => {
            this.updateFocusableElements();
        });
        
        observer.observe(this.container, {
            childList: true,
            subtree: true
        });
    }
    
    /**
     * 포커스 가능 요소 업데이트
     */
    private updateFocusableElements(): void {
        const selector = `
            a[href],
            button:not([disabled]),
            input:not([disabled]),
            select:not([disabled]),
            textarea:not([disabled]),
            [tabindex]:not([tabindex="-1"])
        `;
        
        this.focusableElements = Array.from(
            this.container.querySelectorAll<HTMLElement>(selector)
        );
    }
    
    /**
     * 키 입력 처리
     */
    private handleKeyPress(e: KeyboardEvent): void {
        // 단축키 처리
        const shortcut = this.getShortcutKey(e);
        if (this.shortcuts.has(shortcut)) {
            e.preventDefault();
            this.shortcuts.get(shortcut)!();
            return;
        }
        
        // 탭 네비게이션 개선
        if (e.key === 'Tab') {
            this.handleTabNavigation(e);
        }
        
        // 화살표 키 네비게이션
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            this.handleArrowNavigation(e);
        }
        
        // Home/End 키
        if (e.key === 'Home' || e.key === 'End') {
            this.handleHomeEndNavigation(e);
        }
    }
    
    /**
     * 탭 네비게이션 처리
     */
    private handleTabNavigation(e: KeyboardEvent): void {
        if (this.focusableElements.length === 0) return;
        
        const currentElement = document.activeElement as HTMLElement;
        const currentIndex = this.focusableElements.indexOf(currentElement);
        
        if (currentIndex === -1) return;
        
        if (e.shiftKey) {
            // 역방향
            this.currentFocusIndex = currentIndex === 0 
                ? this.focusableElements.length - 1 
                : currentIndex - 1;
        } else {
            // 정방향
            this.currentFocusIndex = (currentIndex + 1) % this.focusableElements.length;
        }
        
        // 섹션 건너뛰기 링크 제공
        if (this.focusableElements[this.currentFocusIndex].hasAttribute('data-skip-link')) {
            // 스킵 링크 표시
            this.showSkipLink();
        }
    }
    
    /**
     * 화살표 키 네비게이션 처리
     */
    private handleArrowNavigation(e: KeyboardEvent): void {
        const currentElement = document.activeElement as HTMLElement;
        
        // 라디오 버튼 그룹
        if (currentElement.getAttribute('role') === 'radio') {
            this.handleRadioGroupNavigation(e);
            return;
        }
        
        // 탭 리스트
        if (currentElement.getAttribute('role') === 'tab') {
            this.handleTabListNavigation(e);
            return;
        }
        
        // 메뉴
        if (currentElement.getAttribute('role') === 'menuitem') {
            this.handleMenuNavigation(e);
            return;
        }
    }
    
    /**
     * Home/End 키 네비게이션 처리
     */
    private handleHomeEndNavigation(e: KeyboardEvent): void {
        e.preventDefault();
        
        if (e.key === 'Home') {
            this.focusableElements[0]?.focus();
            this.currentFocusIndex = 0;
        } else {
            const lastIndex = this.focusableElements.length - 1;
            this.focusableElements[lastIndex]?.focus();
            this.currentFocusIndex = lastIndex;
        }
    }
    
    /**
     * 라디오 그룹 네비게이션
     */
    private handleRadioGroupNavigation(e: KeyboardEvent): void {
        const currentRadio = document.activeElement as HTMLInputElement;
        const radioGroup = this.container.querySelectorAll<HTMLInputElement>(
            `input[type="radio"][name="${currentRadio.name}"]`
        );
        
        const radios = Array.from(radioGroup);
        const currentIndex = radios.indexOf(currentRadio);
        
        let newIndex = currentIndex;
        
        switch (e.key) {
            case 'ArrowUp':
            case 'ArrowLeft':
                newIndex = currentIndex === 0 ? radios.length - 1 : currentIndex - 1;
                break;
            case 'ArrowDown':
            case 'ArrowRight':
                newIndex = (currentIndex + 1) % radios.length;
                break;
        }
        
        if (newIndex !== currentIndex) {
            e.preventDefault();
            radios[newIndex].focus();
            radios[newIndex].checked = true;
        }
    }
    
    /**
     * 탭 리스트 네비게이션
     */
    private handleTabListNavigation(e: KeyboardEvent): void {
        const currentTab = document.activeElement as HTMLElement;
        const tabList = currentTab.closest('[role="tablist"]');
        if (!tabList) return;
        
        const tabs = Array.from(tabList.querySelectorAll<HTMLElement>('[role="tab"]'));
        const currentIndex = tabs.indexOf(currentTab);
        
        let newIndex = currentIndex;
        
        switch (e.key) {
            case 'ArrowLeft':
                newIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1;
                break;
            case 'ArrowRight':
                newIndex = (currentIndex + 1) % tabs.length;
                break;
        }
        
        if (newIndex !== currentIndex) {
            e.preventDefault();
            tabs[newIndex].focus();
            tabs[newIndex].click();
        }
    }
    
    /**
     * 메뉴 네비게이션
     */
    private handleMenuNavigation(e: KeyboardEvent): void {
        // 메뉴 항목 네비게이션 로직
    }
    
    /**
     * 스킵 링크 표시
     */
    private showSkipLink(): void {
        const skipLink = this.container.querySelector('.skip-link');
        if (skipLink) {
            skipLink.classList.add('visible');
            setTimeout(() => skipLink.classList.remove('visible'), 3000);
        }
    }
    
    /**
     * 단축키 문자열 생성
     */
    private getShortcutKey(e: KeyboardEvent): string {
        const parts = [];
        if (e.ctrlKey) parts.push('Ctrl');
        if (e.altKey) parts.push('Alt');
        if (e.shiftKey) parts.push('Shift');
        if (e.metaKey) parts.push('Meta');
        parts.push(e.key);
        return parts.join('+');
    }
    
    /**
     * 단축키 등록
     */
    registerShortcut(shortcut: string, handler: () => void): void {
        this.shortcuts.set(shortcut, handler);
    }
    
    /**
     * 단축키 제거
     */
    unregisterShortcut(shortcut: string): void {
        this.shortcuts.delete(shortcut);
    }
    
    /**
     * 정리
     */
    destroy(): void {
        this.container.removeEventListener('keydown', this.keyHandler);
        this.shortcuts.clear();
    }
}

/**
 * 포커스 트랩
 */
export class FocusTrap {
    private firstFocusable: HTMLElement | null = null;
    private lastFocusable: HTMLElement | null = null;
    private trapHandler: (e: KeyboardEvent) => void;
    
    constructor(private container: HTMLElement) {
        this.trapHandler = this.handleTrap.bind(this);
        this.activate();
    }
    
    /**
     * 활성화
     */
    activate(): void {
        this.updateFocusableElements();
        document.addEventListener('keydown', this.trapHandler);
    }
    
    /**
     * 포커스 가능 요소 업데이트
     */
    private updateFocusableElements(): void {
        const focusableElements = this.container.querySelectorAll<HTMLElement>(
            'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length > 0) {
            this.firstFocusable = focusableElements[0];
            this.lastFocusable = focusableElements[focusableElements.length - 1];
        }
    }
    
    /**
     * 트랩 처리
     */
    private handleTrap(e: KeyboardEvent): void {
        if (e.key !== 'Tab') return;
        
        if (!this.firstFocusable || !this.lastFocusable) return;
        
        if (e.shiftKey) {
            // 역방향
            if (document.activeElement === this.firstFocusable) {
                e.preventDefault();
                this.lastFocusable.focus();
            }
        } else {
            // 정방향
            if (document.activeElement === this.lastFocusable) {
                e.preventDefault();
                this.firstFocusable.focus();
            }
        }
    }
    
    /**
     * 비활성화
     */
    deactivate(): void {
        document.removeEventListener('keydown', this.trapHandler);
    }
    
    /**
     * 정리
     */
    destroy(): void {
        this.deactivate();
    }
}

/**
 * ARIA 헬퍼
 */
export class AriaHelper {
    /**
     * 로딩 상태 설정
     */
    static setLoadingState(element: HTMLElement, isLoading: boolean): void {
        element.setAttribute('aria-busy', String(isLoading));
        
        if (isLoading) {
            element.setAttribute('aria-label', '로딩 중...');
        } else {
            element.removeAttribute('aria-label');
        }
    }
    
    /**
     * 유효성 상태 설정
     */
    static setValidationState(
        element: HTMLElement,
        isValid: boolean,
        errorMessage?: string
    ): void {
        element.setAttribute('aria-invalid', String(!isValid));
        
        if (!isValid && errorMessage) {
            const errorId = `error-${Date.now()}`;
            element.setAttribute('aria-describedby', errorId);
            
            const errorEl = document.createElement('div');
            errorEl.id = errorId;
            errorEl.className = 'sr-only';
            errorEl.textContent = errorMessage;
            element.parentElement?.appendChild(errorEl);
        }
    }
    
    /**
     * 확장/축소 상태 설정
     */
    static setExpandedState(element: HTMLElement, isExpanded: boolean): void {
        element.setAttribute('aria-expanded', String(isExpanded));
    }
    
    /**
     * 선택 상태 설정
     */
    static setSelectedState(element: HTMLElement, isSelected: boolean): void {
        element.setAttribute('aria-selected', String(isSelected));
    }
    
    /**
     * 비활성화 상태 설정
     */
    static setDisabledState(element: HTMLElement, isDisabled: boolean): void {
        element.setAttribute('aria-disabled', String(isDisabled));
        
        if (element instanceof HTMLButtonElement || 
            element instanceof HTMLInputElement ||
            element instanceof HTMLSelectElement ||
            element instanceof HTMLTextAreaElement) {
            element.disabled = isDisabled;
        }
    }
}

/**
 * 스크린 리더 전용 클래스
 */
export const SR_ONLY_STYLES = `
    .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border-width: 0;
    }
    
    .sr-only-focusable:active,
    .sr-only-focusable:focus {
        position: static;
        width: auto;
        height: auto;
        padding: inherit;
        margin: inherit;
        overflow: visible;
        clip: auto;
        white-space: normal;
    }
`;