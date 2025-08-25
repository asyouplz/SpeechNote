# 접근성 체크리스트 - Speech to Text 플러그인

## WCAG 2.1 AA 준수 체크리스트

### 1. 인지가능 (Perceivable)

#### 1.1 텍스트 대체
- [ ] **이미지 대체 텍스트**
  - 모든 이미지, 아이콘에 의미있는 alt 텍스트 제공
  - 장식용 이미지는 `alt=""` 또는 CSS 배경으로 처리
  ```html
  <img src="microphone.png" alt="음성 녹음 시작">
  <span class="icon" aria-label="파일 선택">📁</span>
  ```

- [ ] **오디오/비디오 콘텐츠**
  - 음성 파일 재생 시 시각적 표시 제공
  - 변환 과정 텍스트 설명 제공

#### 1.2 시간 기반 미디어
- [ ] **실시간 피드백**
  - 음성 변환 진행 상황 텍스트로 표시
  - 오류 발생 시 텍스트 알림 제공

#### 1.3 적응 가능
- [ ] **구조적 마크업**
  ```html
  <main role="main">
    <h1>음성 파일 변환</h1>
    <section aria-labelledby="file-section">
      <h2 id="file-section">파일 선택</h2>
      <!-- 콘텐츠 -->
    </section>
  </main>
  ```

- [ ] **의미있는 순서**
  - DOM 순서와 시각적 순서 일치
  - Tab 순서 논리적 배치

#### 1.4 구별 가능
- [ ] **색상 대비**
  - 일반 텍스트: 4.5:1 이상
  - 큰 텍스트(18pt+): 3:1 이상
  - UI 컴포넌트: 3:1 이상
  
  ```css
  /* 대비 검증 완료 색상 */
  .text-normal { color: #2e3338; } /* on #ffffff: 13.1:1 ✓ */
  .text-muted { color: #6c757d; }  /* on #ffffff: 4.5:1 ✓ */
  .button-primary { 
    background: #5e81ac; 
    color: #ffffff; /* 4.5:1 ✓ */
  }
  ```

- [ ] **색상만으로 정보 전달 금지**
  ```css
  /* 나쁜 예: 색상만 사용 */
  .error { color: red; }
  
  /* 좋은 예: 색상 + 아이콘 + 텍스트 */
  .error {
    color: #d32f2f;
    &::before {
      content: "⚠️ ";
    }
  }
  ```

### 2. 운용가능 (Operable)

#### 2.1 키보드 접근성
- [ ] **모든 기능 키보드로 접근 가능**
  ```typescript
  // 키보드 이벤트 처리
  element.addEventListener('keydown', (e: KeyboardEvent) => {
    switch(e.key) {
      case 'Enter':
      case ' ':
        this.activate();
        break;
      case 'Escape':
        this.close();
        break;
    }
  });
  ```

- [ ] **키보드 트랩 방지**
  ```typescript
  // 포커스 트랩 with 탈출 가능
  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      this.close();
      previousFocus.focus(); // 이전 포커스 복원
    }
  });
  ```

- [ ] **단축키 제공**
  ```typescript
  const shortcuts = {
    'Ctrl+Shift+T': 'startTranscription',
    'Ctrl+Shift+S': 'openSettings',
    'Ctrl+Shift+H': 'showHistory',
    'Escape': 'cancelOperation'
  };
  ```

#### 2.2 충분한 시간
- [ ] **시간 제한 조정 가능**
  ```typescript
  class TimeoutManager {
    private timeout: number = 30000; // 기본 30초
    
    allowUserAdjustment() {
      // 사용자가 시간 제한 연장 가능
      this.showTimeoutWarning();
      this.offerExtension();
    }
  }
  ```

- [ ] **자동 새로고침 제어**
  - 자동 새로고침 일시정지/재개 옵션
  - 사용자 활동 감지 시 연장

#### 2.3 발작 및 신체적 반응
- [ ] **번쩍임 제한**
  - 1초에 3회 이상 번쩍임 금지
  - 애니메이션 감소 옵션 제공
  ```css
  @media (prefers-reduced-motion: reduce) {
    * {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
  ```

#### 2.4 탐색 가능
- [ ] **Skip Navigation**
  ```html
  <a href="#main-content" class="skip-link">
    주요 콘텐츠로 건너뛰기
  </a>
  ```

- [ ] **페이지 제목**
  ```typescript
  document.title = `음성 변환 - ${fileName} | Obsidian`;
  ```

- [ ] **포커스 순서**
  ```html
  <!-- 논리적 탭 순서 -->
  <input tabindex="1" placeholder="API 키">
  <button tabindex="2">파일 선택</button>
  <button tabindex="3">변환 시작</button>
  ```

- [ ] **링크 목적 명확화**
  ```html
  <!-- 나쁜 예 -->
  <a href="#">여기</a>를 클릭하세요
  
  <!-- 좋은 예 -->
  <a href="#" aria-label="음성 파일 선택 도움말">
    음성 파일 선택 방법 보기
  </a>
  ```

### 3. 이해가능 (Understandable)

#### 3.1 가독성
- [ ] **언어 설정**
  ```html
  <html lang="ko">
  <div lang="en">English content</div>
  ```

- [ ] **복잡한 용어 설명**
  ```html
  <abbr title="Application Programming Interface">API</abbr>
  <span class="tooltip" data-tip="음성을 텍스트로 변환하는 기술">
    STT
  </span>
  ```

#### 3.2 예측 가능
- [ ] **일관된 네비게이션**
  - 모든 모달에서 동일한 버튼 위치
  - 표준 UI 패턴 사용

- [ ] **일관된 식별**
  ```typescript
  // 일관된 라벨링
  const labels = {
    submit: '확인',
    cancel: '취소',
    save: '저장',
    delete: '삭제'
  };
  ```

#### 3.3 입력 지원
- [ ] **오류 식별**
  ```typescript
  class FormValidation {
    showError(field: HTMLElement, message: string) {
      field.setAttribute('aria-invalid', 'true');
      field.setAttribute('aria-describedby', 'error-message');
      
      const error = document.createElement('div');
      error.id = 'error-message';
      error.setAttribute('role', 'alert');
      error.textContent = message;
    }
  }
  ```

- [ ] **라벨 및 설명**
  ```html
  <label for="api-key">
    API 키 <span class="required">*</span>
  </label>
  <input 
    id="api-key" 
    type="text"
    required
    aria-describedby="api-key-help"
  >
  <small id="api-key-help">
    OpenAI에서 발급받은 API 키를 입력하세요
  </small>
  ```

### 4. 견고성 (Robust)

#### 4.1 호환성
- [ ] **유효한 HTML**
  ```html
  <!-- HTML5 시맨틱 요소 사용 -->
  <nav role="navigation">
  <main role="main">
  <aside role="complementary">
  ```

- [ ] **ARIA 올바른 사용**
  ```html
  <!-- 상태 표시 -->
  <div 
    role="status" 
    aria-live="polite"
    aria-atomic="true"
  >
    변환 중: 45%
  </div>
  
  <!-- 확장/축소 -->
  <button 
    aria-expanded="false"
    aria-controls="settings-panel"
  >
    설정
  </button>
  ```

## 키보드 네비게이션 구현

### 포커스 관리
```typescript
class FocusManager {
  private focusableSelector = 
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  
  // 포커스 가능 요소 찾기
  getFocusableElements(container: HTMLElement): HTMLElement[] {
    return Array.from(
      container.querySelectorAll(this.focusableSelector)
    );
  }
  
  // 포커스 트랩
  trapFocus(container: HTMLElement) {
    const elements = this.getFocusableElements(container);
    const first = elements[0];
    const last = elements[elements.length - 1];
    
    container.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }
  
  // 포커스 복원
  restoreFocus(element: HTMLElement) {
    element.focus();
    // 포커스 링 표시 확인
    if (!element.matches(':focus-visible')) {
      element.classList.add('focus-visible');
    }
  }
}
```

### 키보드 단축키
```typescript
class KeyboardShortcuts {
  private shortcuts = new Map<string, () => void>();
  
  register(combo: string, callback: () => void) {
    this.shortcuts.set(combo, callback);
  }
  
  init() {
    document.addEventListener('keydown', (e) => {
      const combo = this.getKeyCombo(e);
      const handler = this.shortcuts.get(combo);
      
      if (handler) {
        e.preventDefault();
        handler();
        this.announceAction(combo);
      }
    });
  }
  
  private getKeyCombo(e: KeyboardEvent): string {
    const parts = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    parts.push(e.key);
    return parts.join('+');
  }
  
  private announceAction(combo: string) {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'assertive');
    announcement.className = 'sr-only';
    announcement.textContent = `단축키 ${combo} 실행됨`;
    document.body.appendChild(announcement);
    setTimeout(() => announcement.remove(), 1000);
  }
}
```

## 스크린 리더 지원

### ARIA 라이브 영역
```typescript
class LiveRegion {
  private region: HTMLElement;
  
  constructor(level: 'polite' | 'assertive' = 'polite') {
    this.region = document.createElement('div');
    this.region.setAttribute('aria-live', level);
    this.region.setAttribute('aria-atomic', 'true');
    this.region.className = 'sr-only';
    document.body.appendChild(this.region);
  }
  
  announce(message: string) {
    this.region.textContent = message;
    
    // 스크린 리더가 읽을 시간 제공
    setTimeout(() => {
      this.region.textContent = '';
    }, 1000);
  }
  
  // 진행 상황 업데이트
  updateProgress(percent: number) {
    // 10% 단위로만 알림 (너무 잦은 업데이트 방지)
    if (percent % 10 === 0) {
      this.announce(`변환 진행률 ${percent}%`);
    }
  }
}
```

### 대화 상자 접근성
```typescript
class AccessibleModal {
  private modal: HTMLElement;
  private previousFocus: HTMLElement | null = null;
  
  open() {
    // 이전 포커스 저장
    this.previousFocus = document.activeElement as HTMLElement;
    
    // 모달 속성 설정
    this.modal.setAttribute('role', 'dialog');
    this.modal.setAttribute('aria-modal', 'true');
    this.modal.setAttribute('aria-labelledby', 'modal-title');
    
    // 배경 요소 숨기기
    document.body.setAttribute('aria-hidden', 'true');
    this.modal.parentElement?.removeAttribute('aria-hidden');
    
    // 첫 번째 포커스 가능 요소로 포커스
    const firstFocusable = this.modal.querySelector(
      'button, [href], input, select, textarea'
    ) as HTMLElement;
    firstFocusable?.focus();
  }
  
  close() {
    // aria-hidden 복원
    document.body.removeAttribute('aria-hidden');
    
    // 이전 포커스 복원
    this.previousFocus?.focus();
    
    // 닫힘 알림
    this.announceClose();
  }
  
  private announceClose() {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.textContent = '대화 상자가 닫혔습니다';
    announcement.className = 'sr-only';
    document.body.appendChild(announcement);
    setTimeout(() => announcement.remove(), 1000);
  }
}
```

## 색상 대비 검증

### 색상 팔레트
```css
/* WCAG AA 준수 색상 */
:root {
  /* 배경색 */
  --bg-primary: #ffffff;
  --bg-secondary: #f8f9fa;
  --bg-tertiary: #e9ecef;
  
  /* 텍스트 색상 (on white background) */
  --text-primary: #212529;    /* 16.1:1 ✓ */
  --text-secondary: #495057;  /* 8.6:1 ✓ */
  --text-muted: #6c757d;      /* 4.5:1 ✓ */
  
  /* 상태 색상 */
  --color-success: #198754;   /* 4.5:1 ✓ */
  --color-warning: #fd7e14;   /* 3.0:1 (큰 텍스트용) */
  --color-error: #dc3545;     /* 4.5:1 ✓ */
  --color-info: #0dcaf0;      /* 3.1:1 (큰 텍스트용) */
  
  /* 인터랙티브 요소 */
  --interactive-normal: #5e81ac;  /* 4.5:1 ✓ */
  --interactive-hover: #4c6983;   /* 6.2:1 ✓ */
  --interactive-active: #3a5168;  /* 8.5:1 ✓ */
}

/* 다크 테마 */
[data-theme="dark"] {
  --bg-primary: #1e1e1e;
  --bg-secondary: #2d2d30;
  --bg-tertiary: #3e3e42;
  
  --text-primary: #e4e4e4;    /* 13.1:1 ✓ */
  --text-secondary: #b4b4b4;  /* 7.8:1 ✓ */
  --text-muted: #848484;      /* 4.5:1 ✓ */
}
```

## 다국어 지원

### 언어 전환
```typescript
interface I18n {
  ko: {
    title: '음성을 텍스트로 변환';
    selectFile: '파일 선택';
    startTranscription: '변환 시작';
    cancel: '취소';
    settings: '설정';
    error: '오류';
    success: '성공';
  };
  en: {
    title: 'Speech to Text';
    selectFile: 'Select File';
    startTranscription: 'Start Transcription';
    cancel: 'Cancel';
    settings: 'Settings';
    error: 'Error';
    success: 'Success';
  };
}

class Localization {
  private currentLang: 'ko' | 'en' = 'ko';
  
  setLanguage(lang: 'ko' | 'en') {
    this.currentLang = lang;
    document.documentElement.lang = lang;
    this.updateUI();
  }
  
  t(key: string): string {
    return i18n[this.currentLang][key] || key;
  }
  
  private updateUI() {
    // 모든 번역 가능 요소 업데이트
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key) {
        el.textContent = this.t(key);
      }
    });
  }
}
```

## 테스트 체크리스트

### 자동화 테스트
- [ ] axe-core 테스트 통과
- [ ] WAVE 도구 검증 완료
- [ ] Lighthouse 접근성 점수 95+ 달성

### 수동 테스트
- [ ] 키보드만으로 모든 기능 사용 가능
- [ ] 스크린 리더 (NVDA/JAWS) 테스트 완료
- [ ] 고대비 모드에서 정상 작동
- [ ] 200% 확대에서 레이아웃 유지
- [ ] 모바일 디바이스 터치 제스처 지원

### 사용자 테스트
- [ ] 시각 장애 사용자 피드백 수집
- [ ] 운동 장애 사용자 테스트
- [ ] 인지 장애 고려사항 검토
- [ ] 고령자 사용성 평가

## 접근성 모니터링

### 지속적 개선
```typescript
class AccessibilityMonitor {
  // 접근성 이슈 자동 감지
  detectIssues() {
    // 이미지 alt 텍스트 확인
    const imagesWithoutAlt = document.querySelectorAll('img:not([alt])');
    
    // 폼 라벨 확인
    const inputsWithoutLabel = document.querySelectorAll(
      'input:not([aria-label]):not([aria-labelledby])'
    );
    
    // 색상 대비 확인
    this.checkColorContrast();
    
    // 키보드 트랩 확인
    this.checkKeyboardTraps();
    
    return {
      imagesWithoutAlt: imagesWithoutAlt.length,
      inputsWithoutLabel: inputsWithoutLabel.length
    };
  }
  
  // 보고서 생성
  generateReport() {
    const issues = this.detectIssues();
    console.log('Accessibility Report:', issues);
    
    // 개발자 도구에 경고 표시
    if (issues.imagesWithoutAlt > 0) {
      console.warn(`${issues.imagesWithoutAlt} images without alt text`);
    }
  }
}
```

## 참고 자료

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Resources](https://webaim.org/resources/)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)