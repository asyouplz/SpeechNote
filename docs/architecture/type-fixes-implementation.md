# TypeScript 타입 에러 수정 구현 가이드

## 즉시 적용 가능한 수정 사항

### 1. SettingsAPI.ts (Line 265)
```typescript
// 현재 문제
} catch (e) {  // e는 암시적 any 타입

// 수정
} catch (e: unknown) {
    const error = e instanceof Error ? e : new Error(String(e));
    // 또는
} catch (e) {
    const error = e as Error;
```

### 2. ProgressTracker.ts (Line 567, 637)
```typescript
// 문제 1: 'cancel' 이벤트가 정의되지 않음
// 수정: on 메서드 오버로드에 추가
on(event: 'cancel', listener: () => void): Unsubscribe;

// 문제 2: removeAllListeners 메서드 없음
// 수정: 메서드 추가
removeAllListeners(): void {
    this.emitter.removeAllListeners();
}
```

### 3. AudioSettings.ts (Line 44)
```typescript
// 현재: string을 "whisper-1"에 할당
// 수정: 타입 단언 또는 타입 가드 사용
model: settings.model as "whisper-1"
// 또는
model: settings.model === "whisper-1" ? settings.model : "whisper-1"
```

### 4. GeneralSettings.ts (Line 33, 77)
```typescript
// InsertPosition 타입 문제
import { InsertPosition, TimestampFormat } from '../types';

// 수정: 타입 단언 또는 검증
insertPosition: validateInsertPosition(settings.insertPosition),
timestampFormat: settings.timestampFormat as TimestampFormat
```

### 5. SelectionStrategy 타입 충돌 해결

#### 옵션 1: Optional 필드 기본값 제공
```typescript
// Settings 인터페이스에서
selectionStrategy: SelectionStrategy; // optional 제거

// 기본값 설정에서
selectionStrategy: SelectionStrategy.PERFORMANCE_OPTIMIZED
```

#### 옵션 2: Nullish Coalescing 사용
```typescript
// 사용 시점에서
const strategy = settings.selectionStrategy ?? SelectionStrategy.PERFORMANCE_OPTIMIZED;
```

#### 옵션 3: 타입 가드 함수 사용
```typescript
function getValidStrategy(value?: SelectionStrategy): SelectionStrategy {
    return value ?? SelectionStrategy.PERFORMANCE_OPTIMIZED;
}
```

### 6. EnhancedSettingsTab.ts (Line 31)
```typescript
// ResourceManager import 추가
import { ResourceManager } from '../../types/resources';
// 또는 기존 경로에서 import
import { ResourceManager } from '../../infrastructure/resources/ResourceManager';
```

### 7. SettingsTabOptimized.ts 문제들

#### Line 20: AutoDisposable 구현
```typescript
// extends 대신 implements 사용
class SettingsTabOptimized extends PluginSettingTab {
    private resourceManager = new ResourceManager();
    
    // AutoDisposable 패턴 수동 구현
    async dispose(): Promise<void> {
        await this.resourceManager.disposeAll();
    }
}
```

#### Line 73, 105: Error 타입 처리
```typescript
// unknown을 Error로 변환
} catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Settings error:', errorMessage);
}
```

#### Line 95: Promise 중첩 해결
```typescript
// async 함수가 Promise를 반환하는 문제
saveSettings: async () => {  // Promise<void> 반환
    await this.saveSettings();
}
// 또는
saveSettings: () => this.saveSettings()  // 직접 반환
```

### 8. ProviderSettings 관련 수정

모든 ProviderSettings 파일에서:
```typescript
// SelectionStrategy undefined 처리
import { getSelectionStrategy } from '../../types/strategy';

// 사용
const strategy = getSelectionStrategy(settings.selectionStrategy);
```

### 9. AsyncTaskCoordinator.ts (Line 278)
```typescript
// CancellablePromise to Promise 변환
const promise = task as unknown as Promise<T>;
// 또는 적절한 타입 정의
interface CancellablePromise<T> extends Promise<T> {
    cancel?: () => void;
}
```

## 전역 타입 정의 추가

`src/types/globals.d.ts` 파일 생성:
```typescript
// 전역 타입 선언
declare global {
    // Unsubscribe 타입 전역 사용
    type Unsubscribe = () => void;
    
    // SelectionStrategy 기본값
    const DEFAULT_SELECTION_STRATEGY: SelectionStrategy;
}

// 모듈 확장
declare module '*.md' {
    const content: string;
    export default content;
}

export {};
```

## tsconfig.json 권장 설정

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": false, // 클래스 필드 초기화 완화
    "noImplicitThis": true,
    "useUnknownInCatchVariables": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": false, // undefined 허용
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": false, // 배열 접근 완화
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": false
  }
}
```

## 빠른 수정 스크립트

```bash
#!/bin/bash
# fix-types.sh

# 1. any 타입 파라미터 수정
find src -name "*.ts" -exec sed -i '' 's/} catch (e)/} catch (e: unknown)/g' {} \;

# 2. SelectionStrategy import 추가
find src -name "*.ts" -exec sed -i '' '1s/^/import { SelectionStrategy } from "..\/types\/strategy";\n/' {} \;

# 3. TypeScript 컴파일 체크
npx tsc --noEmit

# 4. 남은 에러 출력
npx tsc --noEmit 2>&1 | grep error | wc -l
```

## 우선순위별 수정 순서

### 높음 (즉시 수정)
1. ✅ Unsubscribe 타입 정의 및 적용
2. ✅ EventEmitter 상속 → Composition 변경
3. ⏳ SelectionStrategy optional 처리
4. ⏳ catch 블록 any 타입 수정

### 중간 (1-2일 내)
5. ⏳ ResourceManager import 수정
6. ⏳ AutoDisposable 패턴 구현
7. ⏳ Promise 중첩 해결
8. ⏳ 타입 단언 최소화

### 낮음 (점진적 개선)
9. ⏳ 타입 가드 함수 추가
10. ⏳ 전역 타입 정의 정리
11. ⏳ tsconfig 최적화
12. ⏳ 테스트 커버리지 추가

## 검증 명령어

```bash
# 타입 체크
npx tsc --noEmit

# 특정 파일만 체크
npx tsc --noEmit src/infrastructure/api/SettingsAPI.ts

# 에러 카운트
npx tsc --noEmit 2>&1 | grep error | wc -l

# 에러 타입별 그룹화
npx tsc --noEmit 2>&1 | grep error | cut -d: -f2 | sort | uniq -c
```