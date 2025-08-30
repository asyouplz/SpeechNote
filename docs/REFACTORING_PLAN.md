# 🔧 Speech-to-Text 플러그인 리팩토링 계획

## 📋 개요

이 문서는 Obsidian Speech-to-Text 플러그인의 체계적인 리팩토링 계획을 제시합니다.

## 🎯 목표

1. **안정성 향상**: StatusBar 및 SettingsTab 오류 해결
2. **유지보수성 개선**: 체계적인 아키텍처 도입
3. **확장성 확보**: 의존성 주입 및 모듈화
4. **테스트 가능성**: 단위 테스트 가능한 구조

## 📊 현재 문제점

### 1. StatusBar 오류
- **증상**: `addStatusBarItem()` 호출 시 toLowerCase 관련 오류
- **원인**: 
  - Workspace 초기화 타이밍 문제
  - 타입 불일치 또는 null 참조
  - 생명주기 관리 부재

### 2. SettingsTab 미표시
- **증상**: 플러그인 설정에 탭이 나타나지 않음
- **원인**:
  - 초기화 순서 문제
  - 에러로 인한 등록 실패
  - 의존성 누락

## 🏗️ 아키텍처 개선 사항

### 1. 생명주기 관리 (✅ 구현 완료)

**파일**: `src/architecture/PluginLifecycleManager.ts`

```typescript
- 단계별 초기화 (INITIALIZING → SERVICES_READY → UI_READY → READY)
- 의존성 기반 작업 실행
- 롤백 메커니즘
- 정리 핸들러 관리
```

### 2. 의존성 주입 (✅ 구현 완료)

**파일**: `src/architecture/DependencyContainer.ts`

```typescript
- 서비스 생명주기 관리 (Singleton, Transient, Scoped)
- 자동 의존성 해결
- 타입 안전 보장
- 리소스 자동 정리
```

### 3. UI 컴포넌트 관리 (✅ 구현 완료)

**StatusBarManager**: `src/ui/managers/StatusBarManager.ts`
```typescript
- 안전한 StatusBar 생성
- 에러 처리 및 폴백
- 상태 구독 및 자동 업데이트
- 리소스 정리
```

**SettingsTabManager**: `src/ui/managers/SettingsTabManager.ts`
```typescript
- 환경 검증 후 생성
- 폴백 UI 제공
- 에러 복구 메커니즘
```

### 4. 에러 처리 전략 (✅ 구현 완료)

**파일**: `src/architecture/ErrorBoundary.ts`

```typescript
- 전역 에러 캐칭
- 복구 전략 시스템
- 에러 심각도 분류
- 사용자 알림 관리
```

## 📝 마이그레이션 단계

### Phase 1: 준비 (1-2시간)
1. ✅ 백업 생성
2. ✅ 새 아키텍처 파일 생성
3. ✅ 테스트 프레임워크 설정

### Phase 2: 핵심 리팩토링 (2-3시간)
1. ⏳ main.js를 main-refactored.ts로 교체
2. ⏳ 기존 컴포넌트를 새 관리자로 래핑
3. ⏳ 의존성 주입 적용

### Phase 3: UI 컴포넌트 마이그레이션 (1-2시간)
1. ⏳ StatusBar를 StatusBarManager로 교체
2. ⏳ SettingsTab을 SettingsTabManager로 교체
3. ⏳ 에러 경계 적용

### Phase 4: 테스트 및 검증 (1-2시간)
1. ⏳ 단위 테스트 작성
2. ⏳ 통합 테스트 실행
3. ⏳ 수동 테스트

### Phase 5: 정리 (30분-1시간)
1. ⏳ 이전 코드 제거
2. ⏳ 문서 업데이트
3. ⏳ 릴리스 준비

## 🔄 구체적인 변경 사항

### 1. main.js → main-refactored.ts

**Before:**
```javascript
class Z extends p.Plugin {
    async onload() {
        // 직접 초기화
        this.createStatusBarItem();
        this.addSettingTab(new Q(this.app, this));
    }
}
```

**After:**
```typescript
export default class SpeechToTextPlugin extends Plugin {
    private lifecycleManager: PluginLifecycleManager;
    private statusBarManager: StatusBarManager;
    private settingsTabManager: SettingsTabManager;

    async onload() {
        // 생명주기 관리자를 통한 초기화
        await this.lifecycleManager.initialize();
    }
}
```

### 2. StatusBar 처리

**Before:**
```javascript
createStatusBarItem() {
    let e = this.addStatusBarItem();
    e.setText("text"); // TypeError 가능
}
```

**After:**
```typescript
class StatusBarManager {
    async initialize() {
        // 환경 검증
        if (!this.plugin.app.workspace) return;
        
        // 안전한 생성
        this.createStatusBarItem();
        
        // 에러 처리
        if (!this.statusBarItem) {
            this.logger.warn('StatusBar creation failed');
            return;
        }
    }
}
```

### 3. SettingsTab 처리

**Before:**
```javascript
this.addSettingTab(new Q(this.app, this));
```

**After:**
```typescript
class SettingsTabManager {
    async initialize() {
        // 환경 검증
        if (!this.validateEnvironment()) return;
        
        // 안전한 생성
        const tab = this.createSafeSettingsTab();
        
        // 폴백 처리
        if (!tab) {
            this.tryCreateFallbackSettingsTab();
            return;
        }
        
        // 등록
        this.registerSettingsTab(tab);
    }
}
```

## 🧪 테스트 전략

### 단위 테스트

```typescript
describe('StatusBarManager', () => {
    it('should handle missing workspace gracefully', async () => {
        const manager = new StatusBarManager(mockPlugin, mockStateManager);
        await manager.initialize();
        expect(manager.isAvailable()).toBe(false);
    });

    it('should create status bar item when workspace is ready', async () => {
        mockPlugin.app.workspace = mockWorkspace;
        const manager = new StatusBarManager(mockPlugin, mockStateManager);
        await manager.initialize();
        expect(manager.isAvailable()).toBe(true);
    });
});
```

### 통합 테스트

```typescript
describe('Plugin Initialization', () => {
    it('should initialize without errors', async () => {
        const plugin = new SpeechToTextPlugin();
        await plugin.onload();
        expect(plugin.lifecycleManager.getCurrentPhase()).toBe(LifecyclePhase.READY);
    });

    it('should handle UI failures gracefully', async () => {
        // StatusBar 실패 시뮬레이션
        mockPlugin.addStatusBarItem = jest.fn().mockImplementation(() => {
            throw new Error('StatusBar error');
        });
        
        const plugin = new SpeechToTextPlugin();
        await plugin.onload();
        
        // 플러그인은 여전히 동작해야 함
        expect(plugin.lifecycleManager.hasReachedPhase(LifecyclePhase.SERVICES_READY)).toBe(true);
    });
});
```

## 📈 성공 지표

1. **에러 해결**
   - ✅ StatusBar toLowerCase 오류 없음
   - ✅ SettingsTab 정상 표시
   - ✅ 콘솔 에러 0개

2. **안정성**
   - ✅ Graceful degradation 구현
   - ✅ 에러 복구 가능
   - ✅ 리소스 정리 완벽

3. **성능**
   - ✅ 초기화 시간 < 500ms
   - ✅ 메모리 누수 없음
   - ✅ 이벤트 리스너 정리

4. **유지보수성**
   - ✅ 테스트 커버리지 > 80%
   - ✅ 타입 안전성 100%
   - ✅ 문서화 완료

## 🚀 실행 명령

```bash
# 1. 의존성 설치
npm install

# 2. TypeScript 컴파일
npm run build

# 3. 테스트 실행
npm test

# 4. 개발 모드 실행
npm run dev

# 5. 프로덕션 빌드
npm run build:prod
```

## 📚 참고 자료

- [Obsidian Plugin API](https://github.com/obsidianmd/obsidian-api)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Jest Testing](https://jestjs.io/docs/getting-started)
- [Dependency Injection in TypeScript](https://www.typescriptlang.org/docs/handbook/decorators.html)

## 🔍 트러블슈팅

### 문제: StatusBar가 여전히 생성되지 않음
**해결책:**
1. Obsidian 재시작
2. 플러그인 재설치
3. 콘솔 로그 확인
4. workspace.onLayoutReady 콜백 확인

### 문제: SettingsTab이 표시되지 않음
**해결책:**
1. 플러그인 설정 초기화
2. 다른 플러그인과 충돌 확인
3. Obsidian 버전 확인
4. 폴백 UI 동작 확인

### 문제: 메모리 누수
**해결책:**
1. 이벤트 리스너 정리 확인
2. dispose 메서드 구현 확인
3. 순환 참조 제거
4. WeakMap 사용 고려

## ✅ 체크리스트

- [x] 아키텍처 설계 완료
- [x] 생명주기 관리자 구현
- [x] 의존성 컨테이너 구현
- [x] StatusBarManager 구현
- [x] SettingsTabManager 구현
- [x] ErrorBoundary 구현
- [x] 테스트 프레임워크 구현
- [ ] main.js 리팩토링
- [ ] 기존 컴포넌트 마이그레이션
- [ ] 테스트 작성
- [ ] 문서 업데이트
- [ ] 최종 검증

## 📝 노트

이 리팩토링은 점진적으로 진행되며, 각 단계에서 플러그인이 계속 동작할 수 있도록 설계되었습니다. 
문제 발생 시 이전 버전으로 롤백 가능합니다.