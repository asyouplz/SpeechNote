# UX 개선 가이드 - Speech to Text 플러그인

## 1. 사용자 인터페이스 베스트 프랙티스

### 1.1 옵시디언 플러그인 UI 가이드라인

#### 네이티브 통합
- **옵시디언 디자인 시스템 준수**
  - CSS 변수 활용: `--background-primary`, `--text-normal`, `--interactive-accent` 등
  - 옵시디언 기본 컴포넌트 활용: `Modal`, `Setting`, `Notice` 클래스
  - 테마 호환성: 라이트/다크 테마 자동 적응

#### 일관된 상호작용 패턴
```typescript
// 권장: 옵시디언 스타일 모달
class TranscriptionModal extends Modal {
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: '음성 변환' });
        // 옵시디언 네이티브 요소 사용
    }
}

// 권장: 표준 설정 인터페이스
new Setting(containerEl)
    .setName('API Key')
    .setDesc('OpenAI API 키를 입력하세요')
    .addText(text => text
        .setPlaceholder('sk-...')
        .setValue(this.settings.apiKey));
```

### 1.2 일관된 디자인 시스템

#### 컴포넌트 계층 구조
```
1. Primary Actions (주요 작업)
   - 음성 파일 선택
   - 변환 시작
   - 텍스트 삽입

2. Secondary Actions (보조 작업)
   - 설정 변경
   - 형식 옵션
   - 기록 보기

3. Tertiary Actions (부가 기능)
   - 캐시 초기화
   - 로그 보기
   - 도움말
```

#### 색상 및 타이포그래피
```css
/* 상태별 색상 가이드 */
.status-idle { color: var(--text-muted); }
.status-processing { color: var(--interactive-accent); }
.status-success { color: var(--text-success); }
.status-error { color: var(--text-error); }

/* 텍스트 계층 */
.heading-primary { font-size: 1.2em; font-weight: 600; }
.heading-secondary { font-size: 1em; font-weight: 500; }
.body-text { font-size: 0.9em; }
.caption { font-size: 0.8em; color: var(--text-muted); }
```

### 1.3 직관적인 레이아웃 설계

#### 시각적 계층 구조
```
┌─────────────────────────────────┐
│  Header (제목/상태)              │
├─────────────────────────────────┤
│  Primary Content Area           │
│  ┌───────────┬─────────────┐    │
│  │ 파일 선택  │ 옵션 패널   │    │
│  │           │             │    │
│  └───────────┴─────────────┘    │
├─────────────────────────────────┤
│  Action Bar (주요 버튼)          │
└─────────────────────────────────┘
```

#### 그룹핑 및 여백
- **관련 요소 그룹화**: 기능별로 섹션 구분
- **적절한 여백**: 8px 그리드 시스템 활용
- **시각적 구분**: 보더, 배경색으로 영역 구분

### 1.4 피드백 메커니즘

#### 즉각적 피드백
```typescript
// 시각적 피드백
class FeedbackManager {
    showProgress(message: string, progress: number) {
        // 프로그레스 바 표시
        this.updateProgressBar(progress);
        this.updateStatusText(message);
    }

    showSuccess(message: string) {
        new Notice(message, 3000);
        this.element.addClass('success-state');
    }

    showError(error: Error) {
        new Notice(`오류: ${error.message}`, 5000);
        this.element.addClass('error-state');
    }
}
```

#### 상태 표시자
- **로딩 상태**: 스피너, 프로그레스 바
- **성공 상태**: 체크 아이콘, 녹색 표시
- **오류 상태**: 경고 아이콘, 빨간색 표시
- **대기 상태**: 펄스 애니메이션

## 2. 접근성 개선 권장사항

### 2.1 키보드 네비게이션
```typescript
// Tab 순서 관리
element.setAttribute('tabindex', '0');

// 단축키 지원
this.registerDomEvent(document, 'keydown', (evt: KeyboardEvent) => {
    if (evt.key === 'Enter' && evt.ctrlKey) {
        this.startTranscription();
    }
});
```

### 2.2 스크린 리더 지원
```html
<!-- ARIA 레이블 -->
<button aria-label="음성 파일 선택" aria-describedby="file-help">
    파일 선택
</button>
<span id="file-help" class="sr-only">
    m4a, mp3, wav 형식 지원
</span>

<!-- 라이브 영역 -->
<div aria-live="polite" aria-atomic="true">
    <span>변환 진행률: 45%</span>
</div>
```

### 2.3 포커스 관리
```typescript
class FocusManager {
    trapFocus(container: HTMLElement) {
        const focusableElements = container.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
        
        container.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey && document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                } else if (!e.shiftKey && document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        });
    }
}
```

## 3. 반응형 디자인

### 3.1 모바일 최적화
```css
/* 모바일 레이아웃 */
@media (max-width: 768px) {
    .file-picker-modal {
        width: 100%;
        height: 100%;
        max-width: none;
        max-height: none;
    }
    
    .file-browser-toolbar {
        flex-direction: column;
        gap: 10px;
    }
    
    .tab-header {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
    }
}
```

### 3.2 터치 인터페이스
```typescript
// 터치 제스처 지원
element.addEventListener('touchstart', handleTouchStart, { passive: true });
element.addEventListener('touchmove', handleTouchMove, { passive: true });
element.addEventListener('touchend', handleTouchEnd);

// 더블탭 방지
let lastTap = 0;
element.addEventListener('touchend', (e) => {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;
    if (tapLength < 500 && tapLength > 0) {
        e.preventDefault();
    }
    lastTap = currentTime;
});
```

## 4. 애니메이션 및 트랜지션

### 4.1 부드러운 전환
```css
/* 마이크로 인터랙션 */
.button {
    transition: all 0.2s ease;
    transform: translateY(0);
}

.button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.button:active {
    transform: translateY(0);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* 페이드 애니메이션 */
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

.modal-content {
    animation: fadeIn 0.3s ease;
}
```

### 4.2 스켈레톤 로딩
```typescript
class SkeletonLoader {
    show() {
        return `
            <div class="skeleton-container">
                <div class="skeleton-line"></div>
                <div class="skeleton-line short"></div>
                <div class="skeleton-line"></div>
            </div>
        `;
    }
}
```

## 5. 에러 처리 UX

### 5.1 사용자 친화적 에러 메시지
```typescript
const errorMessages = {
    API_KEY_MISSING: {
        title: 'API 키가 필요합니다',
        message: 'OpenAI API 키를 설정에서 입력해주세요.',
        action: '설정 열기',
        callback: () => this.openSettings()
    },
    FILE_TOO_LARGE: {
        title: '파일 크기 초과',
        message: '파일이 25MB를 초과합니다. 더 작은 파일을 선택해주세요.',
        action: '다른 파일 선택',
        callback: () => this.selectAnotherFile()
    },
    NETWORK_ERROR: {
        title: '네트워크 오류',
        message: '인터넷 연결을 확인하고 다시 시도해주세요.',
        action: '재시도',
        callback: () => this.retry()
    }
};
```

### 5.2 복구 가능한 오류 처리
```typescript
class ErrorRecovery {
    async handleError(error: Error) {
        // 자동 재시도 로직
        if (this.isRetryableError(error)) {
            const shouldRetry = await this.askUserForRetry();
            if (shouldRetry) {
                return this.retryWithBackoff();
            }
        }
        
        // 대체 옵션 제공
        this.offerAlternatives(error);
    }
}
```

## 6. 성능 최적화된 UI

### 6.1 가상 스크롤링
```typescript
class VirtualScroll {
    renderVisibleItems(items: any[], container: HTMLElement) {
        const scrollTop = container.scrollTop;
        const containerHeight = container.clientHeight;
        const itemHeight = 40;
        
        const startIndex = Math.floor(scrollTop / itemHeight);
        const endIndex = Math.ceil((scrollTop + containerHeight) / itemHeight);
        
        const visibleItems = items.slice(startIndex, endIndex);
        this.renderItems(visibleItems, startIndex * itemHeight);
    }
}
```

### 6.2 디바운싱 및 쓰로틀링
```typescript
// 검색 입력 디바운싱
const debounce = (func: Function, wait: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
};

const searchInput = debounce((query: string) => {
    this.performSearch(query);
}, 300);

// 스크롤 이벤트 쓰로틀링
const throttle = (func: Function, limit: number) => {
    let inThrottle: boolean;
    return (...args: any[]) => {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};
```

## 7. 사용자 설정 및 개인화

### 7.1 설정 그룹화
```typescript
interface SettingsGroups {
    general: {
        language: string;
        autoInsert: boolean;
        insertPosition: 'cursor' | 'end' | 'beginning';
    };
    advanced: {
        apiKey: string;
        maxFileSize: number;
        enableCache: boolean;
    };
    appearance: {
        theme: 'auto' | 'light' | 'dark';
        compactMode: boolean;
        showStatusBar: boolean;
    };
}
```

### 7.2 설정 프리셋
```typescript
const presets = {
    quickNote: {
        autoInsert: true,
        insertPosition: 'cursor',
        timestampFormat: 'none'
    },
    detailedTranscription: {
        autoInsert: false,
        insertPosition: 'end',
        timestampFormat: 'inline'
    },
    meeting: {
        autoInsert: true,
        insertPosition: 'end',
        timestampFormat: 'sidebar',
        addSpeakerLabels: true
    }
};
```

## 8. 도움말 및 온보딩

### 8.1 툴팁 시스템
```typescript
class TooltipManager {
    addTooltip(element: HTMLElement, content: string) {
        element.setAttribute('data-tooltip', content);
        element.addEventListener('mouseenter', this.showTooltip);
        element.addEventListener('mouseleave', this.hideTooltip);
    }
    
    showContextualHelp(feature: string) {
        const helpContent = this.getHelpContent(feature);
        this.displayHelp(helpContent);
    }
}
```

### 8.2 초기 사용자 가이드
```typescript
class OnboardingFlow {
    steps = [
        {
            element: '.api-key-setting',
            title: 'API 키 설정',
            content: 'OpenAI API 키를 입력하여 시작하세요'
        },
        {
            element: '.file-picker',
            title: '파일 선택',
            content: '음성 파일을 드래그하거나 클릭하여 선택하세요'
        },
        {
            element: '.transcribe-button',
            title: '변환 시작',
            content: '이 버튼을 클릭하여 음성을 텍스트로 변환합니다'
        }
    ];
    
    start() {
        this.showStep(0);
    }
}
```

## 9. 실시간 피드백

### 9.1 진행 상황 표시
```typescript
class ProgressIndicator {
    updateProgress(current: number, total: number) {
        const percentage = (current / total) * 100;
        
        this.progressBar.style.width = `${percentage}%`;
        this.progressText.textContent = `${Math.round(percentage)}%`;
        
        // 단계별 메시지
        if (percentage < 30) {
            this.statusText.textContent = '파일 업로드 중...';
        } else if (percentage < 70) {
            this.statusText.textContent = '음성 분석 중...';
        } else {
            this.statusText.textContent = '텍스트 생성 중...';
        }
    }
}
```

### 9.2 실시간 검증
```typescript
class RealTimeValidation {
    validateApiKey(key: string): ValidationResult {
        if (!key) {
            return { valid: false, message: 'API 키를 입력해주세요' };
        }
        if (!key.startsWith('sk-')) {
            return { valid: false, message: 'API 키는 "sk-"로 시작해야 합니다' };
        }
        if (key.length < 40) {
            return { valid: false, message: 'API 키가 너무 짧습니다' };
        }
        return { valid: true, message: '유효한 API 키 형식입니다' };
    }
}
```

## 10. 모범 사례 체크리스트

### 필수 구현 사항
- [ ] 모든 인터랙티브 요소에 키보드 접근 가능
- [ ] ARIA 레이블 및 역할 적절히 사용
- [ ] 색상 대비 4.5:1 이상 유지
- [ ] 에러 메시지 명확하고 실행 가능
- [ ] 로딩 상태 시각적 표시
- [ ] 터치 타겟 최소 44x44px
- [ ] 포커스 인디케이터 명확히 표시

### 권장 구현 사항
- [ ] 애니메이션 감소 옵션 제공
- [ ] 다크/라이트 테마 자동 전환
- [ ] 실행 취소/다시 실행 기능
- [ ] 컨텍스트 메뉴 지원
- [ ] 드래그 앤 드롭 지원
- [ ] 자동 저장 및 복구
- [ ] 사용자 정의 단축키

### 향상된 사용성
- [ ] 스마트 기본값 제공
- [ ] 최근 사용 항목 표시
- [ ] 배치 작업 지원
- [ ] 진행률 저장 및 재개
- [ ] 오프라인 모드 지원
- [ ] 성능 모니터링 대시보드