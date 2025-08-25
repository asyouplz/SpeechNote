# Phase 3 UX 개선 권장사항

## 1. 사용자 인터페이스 개선 가이드

### 1.1 옵시디언 디자인 시스템 통합

#### 개선 대상 컴포넌트
- FilePickerModal.ts
- ProgressIndicator.ts
- NotificationSystem.ts
- SettingsTab.ts

#### 구현 방안

```typescript
// 옵시디언 CSS 변수 활용 예제
class ThemeAwareComponent {
    private applyTheme(element: HTMLElement) {
        // 옵시디언 네이티브 변수 사용
        element.style.setProperty('background-color', 'var(--background-primary)');
        element.style.setProperty('color', 'var(--text-normal)');
        element.style.setProperty('border-color', 'var(--background-modifier-border)');
        
        // 상태별 색상
        const statusColors = {
            idle: 'var(--text-muted)',
            processing: 'var(--interactive-accent)',
            success: 'var(--text-success)',
            error: 'var(--text-error)'
        };
    }
    
    // 다크/라이트 테마 자동 감지
    private setupThemeListener() {
        const observer = new MutationObserver(() => {
            const isDark = document.body.classList.contains('theme-dark');
            this.onThemeChange(isDark);
        });
        
        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['class']
        });
    }
}
```

### 1.2 일관된 컴포넌트 계층 구조

#### 버튼 우선순위 시스템

```typescript
enum ButtonPriority {
    PRIMARY = 'mod-cta',           // 주요 동작 (변환 시작)
    SECONDARY = 'mod-secondary',    // 보조 동작 (설정)
    TERTIARY = '',                  // 부가 기능 (취소)
    DANGER = 'mod-warning'          // 위험 동작 (삭제)
}

class ButtonFactory {
    static create(
        container: HTMLElement,
        text: string,
        priority: ButtonPriority,
        onClick: () => void
    ): HTMLButtonElement {
        const button = container.createEl('button', {
            text,
            cls: `button ${priority}`
        });
        
        // 접근성 속성 자동 추가
        button.setAttribute('role', 'button');
        button.setAttribute('aria-label', text);
        
        button.addEventListener('click', onClick);
        return button;
    }
}
```

### 1.3 피드백 메커니즘 강화

#### 상태 표시 시스템

```typescript
class EnhancedProgressIndicator extends ProgressIndicator {
    private statusHistory: StatusEntry[] = [];
    private currentStatus: Status = Status.IDLE;
    
    // 상태 전환 애니메이션
    private transitionToStatus(newStatus: Status, message: string) {
        const oldStatus = this.currentStatus;
        this.currentStatus = newStatus;
        
        // 상태 기록
        this.statusHistory.push({
            from: oldStatus,
            to: newStatus,
            message,
            timestamp: Date.now()
        });
        
        // 시각적 피드백
        this.animateStatusChange(oldStatus, newStatus);
        
        // 청각적 피드백 (스크린 리더)
        this.announceStatus(newStatus, message);
    }
    
    private animateStatusChange(from: Status, to: Status) {
        const element = this.getStatusElement();
        
        // 페이드 전환
        element.style.opacity = '0';
        
        setTimeout(() => {
            element.className = `status status-${to}`;
            element.style.opacity = '1';
        }, 150);
        
        // 진동 피드백 (모바일)
        if ('vibrate' in navigator) {
            navigator.vibrate(50);
        }
    }
    
    private announceStatus(status: Status, message: string) {
        const announcement = document.createElement('div');
        announcement.setAttribute('role', 'status');
        announcement.setAttribute('aria-live', 'polite');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        setTimeout(() => announcement.remove(), 1000);
    }
}
```

## 2. 접근성 개선 구현

### 2.1 키보드 네비게이션 강화

```typescript
class AccessibleFilePickerModal extends FilePickerModal {
    private focusableElements: HTMLElement[] = [];
    private currentFocusIndex = 0;
    
    onOpen() {
        super.onOpen();
        this.setupAccessibility();
    }
    
    private setupAccessibility() {
        // ARIA 속성 설정
        this.modalEl.setAttribute('role', 'dialog');
        this.modalEl.setAttribute('aria-modal', 'true');
        this.modalEl.setAttribute('aria-labelledby', 'modal-title');
        
        // 포커스 가능 요소 수집
        this.collectFocusableElements();
        
        // 키보드 네비게이션
        this.setupKeyboardNavigation();
        
        // 포커스 트랩
        this.trapFocus();
    }
    
    private setupKeyboardNavigation() {
        this.modalEl.addEventListener('keydown', (e: KeyboardEvent) => {
            switch(e.key) {
                case 'Tab':
                    e.preventDefault();
                    this.navigateFocus(e.shiftKey ? -1 : 1);
                    break;
                case 'Escape':
                    this.close();
                    break;
                case 'Enter':
                    if (e.target instanceof HTMLButtonElement) {
                        e.target.click();
                    }
                    break;
                case 'ArrowUp':
                case 'ArrowDown':
                    if (this.isInFileList(e.target as HTMLElement)) {
                        e.preventDefault();
                        this.navigateFileList(e.key === 'ArrowUp' ? -1 : 1);
                    }
                    break;
            }
        });
    }
    
    private trapFocus() {
        const firstElement = this.focusableElements[0];
        const lastElement = this.focusableElements[this.focusableElements.length - 1];
        
        // 첫 번째 요소로 포커스
        firstElement?.focus();
        
        // 포커스 순환
        lastElement?.addEventListener('keydown', (e) => {
            if (e.key === 'Tab' && !e.shiftKey) {
                e.preventDefault();
                firstElement.focus();
            }
        });
        
        firstElement?.addEventListener('keydown', (e) => {
            if (e.key === 'Tab' && e.shiftKey) {
                e.preventDefault();
                lastElement.focus();
            }
        });
    }
}
```

### 2.2 스크린 리더 지원

```typescript
class ScreenReaderSupport {
    // 라이브 영역 생성
    static createLiveRegion(level: 'polite' | 'assertive' = 'polite'): HTMLElement {
        const region = document.createElement('div');
        region.setAttribute('aria-live', level);
        region.setAttribute('aria-atomic', 'true');
        region.className = 'sr-only';
        document.body.appendChild(region);
        return region;
    }
    
    // 진행 상황 알림
    static announceProgress(percent: number, message?: string) {
        const region = this.createLiveRegion('polite');
        
        // 10% 단위로만 알림 (과도한 알림 방지)
        if (percent % 10 === 0) {
            region.textContent = message || `진행률 ${percent}%`;
        }
        
        setTimeout(() => region.remove(), 1000);
    }
    
    // 에러 알림
    static announceError(error: string) {
        const region = this.createLiveRegion('assertive');
        region.textContent = `오류: ${error}`;
        setTimeout(() => region.remove(), 3000);
    }
    
    // 작업 완료 알림
    static announceCompletion(message: string) {
        const region = this.createLiveRegion('polite');
        region.textContent = message;
        setTimeout(() => region.remove(), 2000);
    }
}
```

### 2.3 포커스 관리

```typescript
class FocusManager {
    private previousFocus: HTMLElement | null = null;
    private focusStack: HTMLElement[] = [];
    
    // 포커스 저장
    saveFocus() {
        this.previousFocus = document.activeElement as HTMLElement;
        this.focusStack.push(this.previousFocus);
    }
    
    // 포커스 복원
    restoreFocus() {
        const element = this.focusStack.pop() || this.previousFocus;
        element?.focus();
        
        // 포커스 링 표시 확인
        if (!element?.matches(':focus-visible')) {
            element?.classList.add('focus-visible');
        }
    }
    
    // 포커스 이동
    moveFocus(element: HTMLElement) {
        this.saveFocus();
        element.focus();
        
        // 스크롤 인투 뷰
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }
    
    // 포커스 가능 요소 찾기
    findFocusableElements(container: HTMLElement): HTMLElement[] {
        const selector = `
            button:not([disabled]),
            [href]:not([disabled]),
            input:not([disabled]),
            select:not([disabled]),
            textarea:not([disabled]),
            [tabindex]:not([tabindex="-1"]):not([disabled])
        `;
        
        return Array.from(container.querySelectorAll(selector));
    }
}
```

## 3. 성능 최적화 구현

### 3.1 가상 스크롤링

```typescript
class VirtualFileList {
    private itemHeight = 40;
    private visibleItems = 10;
    private scrollTop = 0;
    private items: any[] = [];
    
    render(container: HTMLElement, items: any[]) {
        this.items = items;
        
        // 컨테이너 설정
        container.style.height = `${this.visibleItems * this.itemHeight}px`;
        container.style.overflow = 'auto';
        container.style.position = 'relative';
        
        // 가상 높이 설정
        const virtualHeight = items.length * this.itemHeight;
        const scrollContainer = container.createDiv({
            cls: 'virtual-scroll-container'
        });
        scrollContainer.style.height = `${virtualHeight}px`;
        
        // 스크롤 이벤트
        container.addEventListener('scroll', () => {
            this.handleScroll(container);
        });
        
        // 초기 렌더링
        this.renderVisibleItems(container);
    }
    
    private handleScroll(container: HTMLElement) {
        this.scrollTop = container.scrollTop;
        requestAnimationFrame(() => {
            this.renderVisibleItems(container);
        });
    }
    
    private renderVisibleItems(container: HTMLElement) {
        const startIndex = Math.floor(this.scrollTop / this.itemHeight);
        const endIndex = Math.min(
            startIndex + this.visibleItems + 2,
            this.items.length
        );
        
        // 기존 아이템 제거
        container.querySelectorAll('.file-item').forEach(el => el.remove());
        
        // 보이는 아이템만 렌더링
        for (let i = startIndex; i < endIndex; i++) {
            const item = this.items[i];
            const element = this.createFileItem(item);
            element.style.position = 'absolute';
            element.style.top = `${i * this.itemHeight}px`;
            element.style.height = `${this.itemHeight}px`;
            container.appendChild(element);
        }
    }
    
    private createFileItem(item: any): HTMLElement {
        const element = document.createElement('div');
        element.className = 'file-item';
        element.textContent = item.name;
        return element;
    }
}
```

### 3.2 디바운싱/쓰로틀링

```typescript
class OptimizedEventHandlers {
    // 검색 입력 디바운싱
    private debouncedSearch = debounce((query: string) => {
        this.performSearch(query);
    }, 300);
    
    // 스크롤 쓰로틀링
    private throttledScroll = throttle(() => {
        this.handleScroll();
    }, 100);
    
    // 리사이즈 디바운싱
    private debouncedResize = debounce(() => {
        this.handleResize();
    }, 250);
    
    setupEventListeners() {
        // 검색 입력
        this.searchInput.addEventListener('input', (e) => {
            const query = (e.target as HTMLInputElement).value;
            this.debouncedSearch(query);
        });
        
        // 스크롤
        this.container.addEventListener('scroll', () => {
            this.throttledScroll();
        });
        
        // 윈도우 리사이즈
        window.addEventListener('resize', () => {
            this.debouncedResize();
        });
    }
}

// 유틸리티 함수
function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    
    return (...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

function throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    
    return (...args: Parameters<T>) => {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}
```

### 3.3 레이지 로딩

```typescript
class LazyLoadManager {
    private observer: IntersectionObserver;
    private loadedComponents = new Set<string>();
    
    constructor() {
        this.observer = new IntersectionObserver(
            (entries) => this.handleIntersection(entries),
            {
                rootMargin: '50px',
                threshold: 0.01
            }
        );
    }
    
    // 컴포넌트 지연 로딩
    observeComponent(element: HTMLElement, componentName: string) {
        element.setAttribute('data-component', componentName);
        this.observer.observe(element);
    }
    
    private async handleIntersection(entries: IntersectionObserverEntry[]) {
        for (const entry of entries) {
            if (entry.isIntersecting) {
                const element = entry.target as HTMLElement;
                const componentName = element.dataset.component;
                
                if (componentName && !this.loadedComponents.has(componentName)) {
                    await this.loadComponent(element, componentName);
                    this.loadedComponents.add(componentName);
                    this.observer.unobserve(element);
                }
            }
        }
    }
    
    private async loadComponent(element: HTMLElement, name: string) {
        // 로딩 표시
        element.classList.add('loading');
        
        try {
            // 동적 임포트
            const module = await import(`../components/${name}`);
            const Component = module.default;
            
            // 컴포넌트 초기화
            new Component(element);
            
            // 로딩 완료
            element.classList.remove('loading');
            element.classList.add('loaded');
        } catch (error) {
            console.error(`Failed to load component: ${name}`, error);
            element.classList.add('error');
        }
    }
}
```

## 4. 반응형 디자인 구현

### 4.1 모바일 최적화

```typescript
class ResponsiveModal extends Modal {
    private isMobile = false;
    private touchStartX = 0;
    private touchStartY = 0;
    
    onOpen() {
        super.onOpen();
        this.detectDevice();
        this.setupResponsiveLayout();
        
        if (this.isMobile) {
            this.setupTouchGestures();
        }
    }
    
    private detectDevice() {
        this.isMobile = window.matchMedia('(max-width: 768px)').matches;
        
        // 디바이스 변경 감지
        window.matchMedia('(max-width: 768px)').addListener((e) => {
            this.isMobile = e.matches;
            this.updateLayout();
        });
    }
    
    private setupResponsiveLayout() {
        if (this.isMobile) {
            // 모바일 레이아웃
            this.modalEl.addClass('mobile-modal');
            this.modalEl.style.width = '100%';
            this.modalEl.style.height = '100%';
            this.modalEl.style.maxWidth = 'none';
            this.modalEl.style.borderRadius = '0';
            
            // 하단 시트 스타일
            this.modalEl.style.position = 'fixed';
            this.modalEl.style.bottom = '0';
            this.modalEl.style.transform = 'translateY(0)';
        } else {
            // 데스크톱 레이아웃
            this.modalEl.removeClass('mobile-modal');
            this.modalEl.style.width = '600px';
            this.modalEl.style.height = 'auto';
            this.modalEl.style.maxWidth = '90vw';
        }
    }
    
    private setupTouchGestures() {
        // 스와이프 다운으로 닫기
        this.modalEl.addEventListener('touchstart', (e) => {
            this.touchStartY = e.touches[0].clientY;
        });
        
        this.modalEl.addEventListener('touchmove', (e) => {
            const deltaY = e.touches[0].clientY - this.touchStartY;
            
            // 아래로 스와이프
            if (deltaY > 0) {
                this.modalEl.style.transform = `translateY(${deltaY}px)`;
            }
        });
        
        this.modalEl.addEventListener('touchend', (e) => {
            const deltaY = e.changedTouches[0].clientY - this.touchStartY;
            
            // 100px 이상 스와이프시 닫기
            if (deltaY > 100) {
                this.close();
            } else {
                // 원위치로 복귀
                this.modalEl.style.transform = 'translateY(0)';
            }
        });
    }
}
```

### 4.2 적응형 레이아웃

```css
/* 반응형 그리드 시스템 */
.file-picker-modal {
    --columns: 3;
    --gap: 1rem;
}

.file-grid {
    display: grid;
    grid-template-columns: repeat(var(--columns), 1fr);
    gap: var(--gap);
}

/* 태블릿 */
@media (max-width: 1024px) {
    .file-picker-modal {
        --columns: 2;
    }
}

/* 모바일 */
@media (max-width: 768px) {
    .file-picker-modal {
        --columns: 1;
        --gap: 0.5rem;
    }
    
    .modal-container {
        width: 100% !important;
        height: 100% !important;
        max-width: none !important;
        border-radius: 0 !important;
    }
    
    .tab-header {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        white-space: nowrap;
    }
    
    .button-group {
        flex-direction: column;
        width: 100%;
    }
    
    .button {
        width: 100%;
        margin: 0.25rem 0;
    }
}

/* 터치 디바이스 최적화 */
@media (hover: none) {
    .button,
    .clickable {
        min-height: 44px;
        min-width: 44px;
    }
    
    .file-item {
        padding: 12px;
        border-bottom: 1px solid var(--background-modifier-border);
    }
}

/* 다크 모드 지원 */
@media (prefers-color-scheme: dark) {
    :root {
        --background-primary: #1e1e1e;
        --text-normal: #e4e4e4;
    }
}

/* 애니메이션 감소 */
@media (prefers-reduced-motion: reduce) {
    * {
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
    }
}
```

## 5. 구현 우선순위

### Phase 1 (필수 - 1주)
1. **접근성 기본 구현**
   - ARIA 레이블 추가
   - 키보드 네비게이션
   - 포커스 관리

2. **성능 최적화 기본**
   - 디바운싱/쓰로틀링
   - 메모리 누수 방지

### Phase 2 (중요 - 2주)
1. **반응형 디자인**
   - 모바일 레이아웃
   - 터치 제스처

2. **피드백 시스템**
   - 상태 표시 개선
   - 에러 메시지 개선

### Phase 3 (향상 - 3주)
1. **고급 최적화**
   - 가상 스크롤링
   - 레이지 로딩

2. **사용자 경험 개선**
   - 애니메이션
   - 마이크로 인터랙션

## 6. 테스트 체크리스트

### 접근성 테스트
- [ ] 키보드만으로 모든 기능 사용 가능
- [ ] 스크린 리더 호환성 (NVDA, JAWS)
- [ ] 색상 대비 4.5:1 이상
- [ ] 포커스 인디케이터 명확

### 성능 테스트
- [ ] 초기 로딩 시간 < 2초
- [ ] 상호작용 응답 시간 < 100ms
- [ ] 메모리 사용량 안정적
- [ ] 1000개 파일 목록 스크롤 부드러움

### 반응형 테스트
- [ ] 320px ~ 1920px 해상도 지원
- [ ] 터치 제스처 정상 작동
- [ ] 화면 회전시 레이아웃 유지
- [ ] 다크/라이트 테마 전환

## 7. 코드 예제 및 패턴

### 컴포넌트 템플릿

```typescript
import { AutoDisposable } from '../utils/memory/MemoryManager';
import { ScreenReaderSupport } from '../utils/accessibility/ScreenReader';
import { FocusManager } from '../utils/accessibility/FocusManager';

export class AccessibleComponent extends AutoDisposable {
    private focusManager: FocusManager;
    private container: HTMLElement;
    
    constructor(container: HTMLElement) {
        super();
        this.container = container;
        this.focusManager = new FocusManager();
        this.init();
    }
    
    private init() {
        this.setupAccessibility();
        this.setupEventListeners();
        this.setupResponsive();
    }
    
    private setupAccessibility() {
        // ARIA 속성
        this.container.setAttribute('role', 'region');
        this.container.setAttribute('aria-label', 'Component Name');
        
        // 키보드 네비게이션
        this.eventManager.add(this.container, 'keydown', (e) => {
            this.handleKeyboard(e as KeyboardEvent);
        });
        
        // 포커스 관리
        const focusableElements = this.focusManager.findFocusableElements(this.container);
        this.focusManager.setupTrap(this.container, focusableElements);
    }
    
    private setupEventListeners() {
        // 디바운스된 이벤트
        const debouncedResize = debounce(() => this.handleResize(), 250);
        this.eventManager.add(window, 'resize', debouncedResize);
        
        // 쓰로틀된 이벤트
        const throttledScroll = throttle(() => this.handleScroll(), 100);
        this.eventManager.add(this.container, 'scroll', throttledScroll);
    }
    
    private setupResponsive() {
        // 미디어 쿼리 감지
        const mobileQuery = window.matchMedia('(max-width: 768px)');
        this.handleMediaChange(mobileQuery);
        
        mobileQuery.addListener((e) => this.handleMediaChange(e));
    }
    
    private handleKeyboard(e: KeyboardEvent) {
        switch(e.key) {
            case 'Escape':
                this.close();
                break;
            case 'Tab':
                this.focusManager.handleTab(e);
                break;
        }
    }
    
    private handleMediaChange(query: MediaQueryList | MediaQueryListEvent) {
        if (query.matches) {
            this.container.addClass('mobile-view');
        } else {
            this.container.removeClass('mobile-view');
        }
    }
    
    protected onDispose() {
        // 자동 정리됨
    }
}
```

## 8. 참고 자료 및 도구

### 개발 도구
- [axe DevTools](https://www.deque.com/axe/devtools/) - 접근성 테스트
- [Lighthouse](https://developers.google.com/web/tools/lighthouse) - 성능 분석
- [WAVE](https://wave.webaim.org/) - 웹 접근성 평가

### 디자인 리소스
- [Obsidian Theme Documentation](https://docs.obsidian.md/Themes/App+themes/Build+a+theme)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Material Design Guidelines](https://material.io/design)

### 테스트 프레임워크
- Jest - 단위 테스트
- Playwright - E2E 테스트
- Pa11y - 접근성 자동화 테스트

## 결론

Phase 3 UX 개선을 위한 구체적인 구현 가이드를 제공했습니다. 우선순위에 따라 단계적으로 구현하시면, 사용자 경험이 크게 향상될 것입니다.

핵심 개선 영역:
1. **접근성**: 모든 사용자가 편리하게 사용
2. **성능**: 빠르고 부드러운 인터랙션
3. **반응형**: 다양한 디바이스 지원
4. **일관성**: 옵시디언 디자인 시스템 준수

다음 단계:
1. 제공된 코드 템플릿을 기반으로 컴포넌트 리팩토링
2. 접근성 테스트 도구로 검증
3. 실제 사용자 피드백 수집 및 반영