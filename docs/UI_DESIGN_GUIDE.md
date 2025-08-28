# UI 설계 가이드: Multi-Provider 설정 UI

## 📚 학습 목표

이 가이드를 통해 다음을 학습하게 됩니다:

1. **Progressive Disclosure 패턴** 적용하기
2. **반응형 UI 컴포넌트** 설계하기
3. **접근성(Accessibility)** 구현하기
4. **테스트 가능한 UI 구조** 만들기

## 🎓 핵심 개념 이해하기

### 1. Progressive Disclosure란?

Progressive Disclosure는 사용자에게 정보를 단계적으로 제공하는 UX 패턴입니다.

```typescript
// 예시: 3단계 Progressive Disclosure
interface UILevels {
    basic: "모든 사용자가 필요한 핵심 기능";
    advanced: "경험 있는 사용자를 위한 추가 옵션";
    expert: "전문가를 위한 세부 설정";
}
```

**왜 중요한가?**
- 초보자를 압도하지 않음
- 고급 사용자에게 필요한 기능 제공
- 인지 부하 감소

### 2. State Management Pattern

UI 상태를 효과적으로 관리하는 패턴입니다.

```typescript
// Observer 패턴을 활용한 상태 관리
class UIState {
    private state: Settings;
    private listeners: Set<Listener>;
    
    setState(newState: Partial<Settings>) {
        this.state = { ...this.state, ...newState };
        this.notify();
    }
}
```

**핵심 원칙:**
- Single Source of Truth
- Immutable Updates
- Reactive Updates

### 3. Component Composition

작고 재사용 가능한 컴포넌트로 UI를 구성합니다.

```typescript
// Single Responsibility Principle
class ApiKeyInput {
    // 오직 API 키 입력만 담당
}

class ValidationButton {
    // 오직 검증 기능만 담당
}
```

## 🛠️ 구현 체크리스트

### Phase 1: 기본 UI 구현

- [ ] **Provider 선택 드롭다운**
  - Auto, Whisper, Deepgram 옵션
  - 선택에 따른 동적 UI 업데이트
  
- [ ] **API 키 입력 필드**
  - 마스킹/토글 기능
  - 실시간 형식 검증
  - 저장 피드백

### Phase 2: 고급 기능 추가

- [ ] **Selection Strategy**
  - 비용/성능/품질 최적화 옵션
  - 전략별 설명 툴팁
  
- [ ] **A/B Testing**
  - 활성화 토글
  - 트래픽 분할 슬라이더
  - 결과 비교 뷰

### Phase 3: 메트릭 및 분석

- [ ] **실시간 메트릭**
  - 성공률 표시
  - 평균 응답 시간
  - 비용 추적
  
- [ ] **비교 차트**
  - Provider별 성능 비교
  - 시각적 표현

## 💡 베스트 프랙티스

### 1. 사용자 피드백

```typescript
// 즉각적인 피드백 제공
async function validateApiKey(key: string) {
    showLoadingState();
    const result = await validate(key);
    showResult(result);
}
```

### 2. 에러 처리

```typescript
// 사용자 친화적인 에러 메시지
try {
    await saveSettings();
    showSuccess("Settings saved!");
} catch (error) {
    showError("Failed to save. Please try again.");
    console.error(error); // 개발자를 위한 상세 로그
}
```

### 3. 접근성

```html
<!-- ARIA 속성 활용 -->
<input 
    aria-label="API Key"
    aria-describedby="api-key-help"
    aria-invalid={!isValid}
/>
```

## 🧪 테스트 전략

### 1. Unit Tests

```typescript
describe('ProviderSettings', () => {
    it('should validate API key format', () => {
        const validator = new ApiKeyValidator();
        expect(validator.validate('sk-123')).toBe(true);
        expect(validator.validate('invalid')).toBe(false);
    });
});
```

### 2. Integration Tests

```typescript
describe('Settings Integration', () => {
    it('should save provider selection', async () => {
        const settings = new ProviderSettings(mockPlugin);
        await settings.selectProvider('deepgram');
        expect(mockPlugin.settings.provider).toBe('deepgram');
    });
});
```

### 3. E2E Tests

```typescript
describe('User Flow', () => {
    it('should configure multi-provider setup', async () => {
        // 1. Open settings
        await openSettings();
        
        // 2. Select provider
        await selectProvider('auto');
        
        // 3. Enter API keys
        await enterApiKey('whisper', 'sk-...');
        await enterApiKey('deepgram', '...');
        
        // 4. Verify configuration
        await verifyConnection();
    });
});
```

## 📝 연습 문제

### 문제 1: Progressive Disclosure 구현

다음 요구사항을 만족하는 UI를 설계하세요:
- 기본: Provider 선택과 API 키만 표시
- 고급: Strategy 선택 추가
- 전문가: 메트릭과 A/B 테스팅 추가

### 문제 2: State Management

다음 시나리오를 처리하는 상태 관리를 구현하세요:
- Provider 변경 시 관련 설정 업데이트
- API 키 검증 상태 추적
- 메트릭 실시간 업데이트

### 문제 3: Error Handling

다음 에러 상황을 처리하세요:
- 잘못된 API 키 형식
- 네트워크 오류
- 저장 실패

## 🎯 학습 확인

다음 질문에 답해보세요:

1. **Progressive Disclosure를 사용하는 이유는?**
   - 힌트: 사용자 경험과 복잡성 관리

2. **컴포넌트를 작게 나누는 이유는?**
   - 힌트: 재사용성과 테스트 가능성

3. **상태 관리가 중요한 이유는?**
   - 힌트: 예측 가능성과 디버깅

## 📚 추가 학습 자료

1. **Design Patterns**
   - Observer Pattern
   - Strategy Pattern
   - Factory Pattern

2. **UI/UX Principles**
   - Nielsen's Heuristics
   - Material Design Guidelines
   - Apple Human Interface Guidelines

3. **Testing**
   - Jest Testing Framework
   - React Testing Library
   - Cypress E2E Testing

## 🚀 다음 단계

1. 제공된 코드를 실행하고 테스트
2. 자신만의 개선사항 추가
3. 사용자 피드백 수집 및 반영
4. 성능 최적화 진행

---

## 💬 질문과 토론

이해가 안 되는 부분이 있다면:

1. 코드의 특정 부분을 지적하기
2. 구체적인 시나리오 제시
3. 대안적인 접근 방법 제안

학습은 반복과 실습을 통해 이루어집니다. 천천히, 그러나 꾸준히 진행하세요! 🎓