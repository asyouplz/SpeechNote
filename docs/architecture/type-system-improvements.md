# TypeScript 타입 시스템 아키텍처 개선 가이드

## 개요
이 문서는 SpeechNote 프로젝트의 TypeScript 타입 시스템 개선 방안을 제시합니다.

## 1. 현재 문제점 분석

### 1.1 이벤트 시스템 타입 불일치
- **문제**: `Unsubscribe` 타입과 EventEmitter의 메서드 시그니처 충돌
- **원인**: 인터페이스는 `() => void` 반환을 요구하나, EventEmitter는 `this` 반환
- **영향**: 41개 타입 에러 중 주요 원인

### 1.2 SelectionStrategy 타입 충돌
- **문제**: enum과 optional 필드의 타입 불일치
- **원인**: `SelectionStrategy | undefined` 타입에서 enum 값 할당 실패
- **영향**: Provider 설정 관련 컴포넌트에서 다수 에러 발생

### 1.3 인터페이스 구현 불완전
- **문제**: 클래스가 인터페이스 계약 미충족
- **원인**: 메서드 시그니처 불일치, 누락된 메서드
- **영향**: API 계층 전반적 타입 안전성 저하

### 1.4 리소스 관리 패턴 불일치
- **문제**: Disposable 패턴 구현 일관성 부족
- **원인**: 통일된 베이스 클래스 부재
- **영향**: 메모리 누수 위험, 리소스 정리 불완전

## 2. 아키텍처 개선 방안

### 2.1 이벤트 시스템 통합 (`src/types/events.ts`)

#### 핵심 설계 원칙
1. **Composition over Inheritance**: EventEmitter 상속 대신 포함
2. **타입 안전성**: 제네릭 기반 타입 안전한 이벤트 맵
3. **일관된 반환 타입**: 모든 구독 메서드는 `Unsubscribe` 반환

#### 구현 패턴
```typescript
// 타입 안전한 이벤트 이미터
export interface ITypedEventEmitter<TEvents extends EventMap> {
    on<K extends keyof TEvents>(
        event: K,
        listener: (...args: TEvents[K]) => void
    ): Unsubscribe;
}

// 어댑터 패턴 적용
export abstract class EventEmitterAdapter<TEvents> {
    protected emitter = new EventEmitter();
    
    on(...): Unsubscribe {
        this.emitter.on(event, listener);
        return () => this.emitter.off(event, listener);
    }
}
```

### 2.2 리소스 관리 통합 (`src/types/resources.ts`)

#### 핵심 설계 원칙
1. **명확한 생명주기**: 생성-사용-해제 패턴 표준화
2. **자동 정리**: AutoDisposable 베이스 클래스 제공
3. **리소스 추적**: WeakRef 기반 메모리 효율적 추적

#### 구현 패턴
```typescript
// Disposable 인터페이스
export interface IDisposable {
    dispose(): void | Promise<void>;
    readonly isDisposed: boolean;
}

// 자동 정리 베이스 클래스
export abstract class AutoDisposable implements IDisposable {
    protected resourceManager = new ResourceManager();
    
    async dispose(): Promise<void> {
        await this.onDispose();
        await this.resourceManager.disposeAll();
    }
}

// 리소스 풀 패턴
export class ResourcePool<T extends IDisposable> {
    async acquire(): Promise<T>;
    release(resource: T): void;
}
```

### 2.3 전략 패턴 타입 개선 (`src/types/strategy.ts`)

#### 핵심 설계 원칙
1. **Const Assertion**: enum 대신 const assertion 사용
2. **타입 가드**: 런타임 타입 검증 제공
3. **기본값 처리**: 안전한 기본값 헬퍼 함수

#### 구현 패턴
```typescript
// Const assertion 기반 타입 정의
export const SelectionStrategyValues = {
    MANUAL: 'manual',
    COST_OPTIMIZED: 'cost_optimized',
    // ...
} as const;

export type SelectionStrategy = 
    typeof SelectionStrategyValues[keyof typeof SelectionStrategyValues];

// 타입 가드 및 기본값 헬퍼
export function getSelectionStrategy(
    value: unknown,
    defaultStrategy = SelectionStrategyValues.PERFORMANCE_OPTIMIZED
): SelectionStrategy {
    return isValidSelectionStrategy(value) ? value : defaultStrategy;
}
```

## 3. 마이그레이션 전략

### 3.1 단계별 접근
1. **Phase 1**: 새 타입 시스템 파일 생성 (완료)
2. **Phase 2**: 핵심 API 클래스 수정 (진행 중)
3. **Phase 3**: UI 컴포넌트 타입 수정
4. **Phase 4**: 테스트 및 검증

### 3.2 호환성 유지
- 기존 API 시그니처 최대한 보존
- Deprecated 패턴으로 점진적 이관
- 타입 별칭으로 임시 호환성 제공

### 3.3 검증 체크리스트
- [ ] TypeScript 컴파일 에러 0개
- [ ] 런타임 타입 검증 테스트
- [ ] 메모리 누수 테스트
- [ ] API 호환성 테스트

## 4. 의존성 관리 전략

### 4.1 모듈 의존성 그래프
```
src/types/
├── events.ts (기본)
├── resources.ts (기본)
├── strategy.ts (도메인)
└── phase3-api.ts (통합)
    ├── imports: events, resources
    └── exports: 모든 API 인터페이스
```

### 4.2 순환 의존성 방지
- 인터페이스와 구현 분리
- 타입만 포함하는 파일 별도 관리
- import type 적극 활용

## 5. 타입 안전성 확보 방안

### 5.1 컴파일 타임 검증
- Strict mode 활성화
- No implicit any 규칙
- Exact optional property types

### 5.2 런타임 검증
- 타입 가드 함수 제공
- Zod/io-ts 같은 런타임 검증 라이브러리 고려
- API 경계에서 검증 강화

### 5.3 문서화 및 예제
- 각 타입별 사용 예제 제공
- JSDoc 주석으로 의도 명확화
- 타입 테스트 파일 작성

## 6. 성능 고려사항

### 6.1 타입 추론 최적화
- 과도한 제네릭 사용 자제
- Union 타입 크기 제한
- 조건부 타입 복잡도 관리

### 6.2 번들 크기 최적화
- 타입 전용 import 사용
- Tree shaking 가능한 구조
- 불필요한 타입 export 제거

## 7. 향후 개선 방향

### 7.1 단기 (1-2주)
- [x] 핵심 타입 시스템 파일 생성
- [ ] API 클래스 마이그레이션
- [ ] 컴파일 에러 해결

### 7.2 중기 (1-2개월)
- [ ] 전체 코드베이스 타입 개선
- [ ] 타입 테스트 커버리지 80%
- [ ] 문서화 완성

### 7.3 장기 (3-6개월)
- [ ] 타입 시스템 자동화 도구 도입
- [ ] CI/CD 타입 체크 강화
- [ ] 타입 성능 모니터링

## 8. 팀 가이드라인

### 8.1 코딩 컨벤션
- 인터페이스는 `I` 접두사 사용
- 타입은 PascalCase
- enum 대신 const assertion 선호

### 8.2 리뷰 체크리스트
- [ ] 타입 안전성 검증
- [ ] any 타입 사용 최소화
- [ ] 타입 가드 제공 여부
- [ ] 문서화 완성도

## 9. 트러블슈팅

### 9.1 일반적인 문제와 해결
1. **"Type 'X' is not assignable to type 'Y'"**
   - 타입 가드 사용
   - 타입 단언 최소화
   - Union 타입 narrowing

2. **"Property does not exist on type"**
   - Optional chaining 사용
   - 타입 정의 확인
   - 인터페이스 확장

3. **순환 의존성**
   - 타입 전용 파일 분리
   - import type 사용
   - 의존성 역전

## 10. 참고 자료

- [TypeScript 공식 문서](https://www.typescriptlang.org/docs/)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)
- [Effective TypeScript](https://effectivetypescript.com/)
- [Type-Level TypeScript](https://type-level-typescript.com/)