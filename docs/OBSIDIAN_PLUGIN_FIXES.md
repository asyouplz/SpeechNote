# Obsidian Plugin 주요 오류 수정 가이드

## 개요

이 문서는 Obsidian Speech-to-Text Plugin v3.0.2에서 수정된 주요 오류와 해결 방법을 상세히 설명합니다. 
플러그인 개발자와 유지보수 담당자를 위한 기술 참조 문서입니다.

## 목차

1. [StatusBar 오류 수정](#1-statusbar-오류-수정)
2. [SettingsTab 표시 문제 해결](#2-settingstab-표시-문제-해결)
3. [아키텍처 개선 사항](#3-아키텍처-개선-사항)
4. [문제 해결 체크리스트](#4-문제-해결-체크리스트)
5. [향후 개선 계획](#5-향후-개선-계획)

---

## 1. StatusBar 오류 수정

### 문제 상황

```typescript
// 오류 발생 코드
this.statusBarItem.setText(status.toLowerCase());
// TypeError: Cannot read property 'toLowerCase' of undefined
```

#### 증상
- Obsidian 시작 시 플러그인 로드 실패
- Console에 `toLowerCase` 관련 TypeError 발생
- StatusBar 아이템이 표시되지 않음

#### 근본 원인
1. **타입 안전성 부족**: status 매개변수가 undefined일 수 있음
2. **초기화 순서 문제**: StatusBar 아이템이 생성되기 전 setText 호출
3. **에러 처리 부재**: 예외 상황에 대한 대비 없음

### 해결 방법

#### 1단계: 안전한 텍스트 설정 함수 구현

```typescript
// src/main.ts
private updateStatusBar(status?: string): void {
    if (!this.statusBarItem) {
        console.warn('StatusBar item not initialized');
        return;
    }
    
    const safeStatus = status ?? 'Ready';
    const displayText = typeof safeStatus === 'string' 
        ? safeStatus 
        : String(safeStatus);
    
    try {
        this.statusBarItem.setText(displayText);
    } catch (error) {
        console.error('Failed to update status bar:', error);
        // Fallback: 재생성 시도
        this.initializeStatusBar();
    }
}
```

#### 2단계: 초기화 보장

```typescript
private async initializeStatusBar(): Promise<void> {
    // 기존 아이템 정리
    if (this.statusBarItem) {
        this.statusBarItem.remove();
    }
    
    // 새 아이템 생성
    this.statusBarItem = this.addStatusBarItem();
    this.statusBarItem.setText('Speech-to-Text Ready');
    
    // 클릭 이벤트 핸들러 추가
    this.statusBarItem.onclick = () => {
        this.showQuickSettings();
    };
}
```

#### 3단계: 생명주기 관리

```typescript
async onload() {
    // StatusBar 초기화를 가장 먼저 수행
    await this.initializeStatusBar();
    
    // 다른 컴포넌트 초기화
    await this.loadSettings();
    this.addSettingTab(new SettingsTab(this.app, this));
}

onunload() {
    // StatusBar 정리
    if (this.statusBarItem) {
        this.statusBarItem.remove();
        this.statusBarItem = null;
    }
}
```

### 검증 방법

```bash
# 개발자 콘솔에서 확인
1. Obsidian 개발자 도구 열기 (Ctrl+Shift+I / Cmd+Option+I)
2. Console 탭에서 에러 확인
3. 플러그인 재로드 후 StatusBar 표시 확인
```

---

## 2. SettingsTab 표시 문제 해결

### 문제 상황

#### 증상
- 설정 > 플러그인 옵션에 탭이 나타나지 않음
- `this.plugin is undefined` 에러 발생
- 설정 변경사항이 저장되지 않음

#### 근본 원인
1. **복잡한 모듈 구조**: 과도한 파일 분리로 인한 의존성 문제
2. **순환 참조**: 모듈 간 상호 참조로 인한 초기화 실패
3. **Context 손실**: this 바인딩 문제

### 해결 방법

#### 1단계: 단일 파일 구조로 통합

```typescript
// src/ui/settings/SettingsTab.ts
import { App, PluginSettingTab, Setting } from 'obsidian';
import type SpeechToTextPlugin from '../../main';

export class SettingsTab extends PluginSettingTab {
    plugin: SpeechToTextPlugin;

    constructor(app: App, plugin: SpeechToTextPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        
        // 헤더 추가
        containerEl.createEl('h2', { text: 'Speech-to-Text Settings' });
        
        // Provider 선택
        this.addProviderSettings(containerEl);
        
        // API 키 설정
        this.addAPIKeySettings(containerEl);
        
        // 언어 설정
        this.addLanguageSettings(containerEl);
        
        // 고급 설정
        this.addAdvancedSettings(containerEl);
    }
    
    private addProviderSettings(containerEl: HTMLElement): void {
        new Setting(containerEl)
            .setName('Provider')
            .setDesc('Choose your speech-to-text provider')
            .addDropdown(dropdown => dropdown
                .addOptions({
                    'openai': 'OpenAI Whisper',
                    'deepgram': 'Deepgram'
                })
                .setValue(this.plugin.settings.provider)
                .onChange(async (value) => {
                    this.plugin.settings.provider = value;
                    await this.plugin.saveSettings();
                    // UI 업데이트
                    this.display();
                }));
    }
    
    // ... 기타 설정 메서드들
}
```

#### 2단계: 플러그인 초기화 수정

```typescript
// src/main.ts
export default class SpeechToTextPlugin extends Plugin {
    settings: PluginSettings;
    settingsTab: SettingsTab;
    
    async onload() {
        console.log('Loading Speech-to-Text Plugin');
        
        // 1. 설정 로드
        await this.loadSettings();
        
        // 2. SettingsTab 등록 (단순화)
        this.settingsTab = new SettingsTab(this.app, this);
        this.addSettingTab(this.settingsTab);
        
        // 3. 나머지 초기화
        this.registerCommands();
        this.initializeUI();
    }
    
    async loadSettings() {
        this.settings = Object.assign(
            {},
            DEFAULT_SETTINGS,
            await this.loadData()
        );
    }
    
    async saveSettings() {
        await this.saveData(this.settings);
        // 설정 변경 이벤트 발생
        this.trigger('settings-changed', this.settings);
    }
}
```

#### 3단계: 에러 처리 추가

```typescript
class SettingsTab extends PluginSettingTab {
    display(): void {
        try {
            const { containerEl } = this;
            containerEl.empty();
            
            // 플러그인 상태 확인
            if (!this.plugin || !this.plugin.settings) {
                containerEl.createEl('p', { 
                    text: 'Plugin is not properly initialized. Please reload Obsidian.',
                    cls: 'error-message'
                });
                return;
            }
            
            // 정상적인 설정 UI 렌더링
            this.renderSettings();
            
        } catch (error) {
            console.error('Failed to display settings:', error);
            this.showErrorMessage(error);
        }
    }
    
    private showErrorMessage(error: Error): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('div', {
            text: `Error loading settings: ${error.message}`,
            cls: 'settings-error'
        });
    }
}
```

### 검증 방법

```typescript
// 개발자 콘솔에서 테스트
// 1. 플러그인 인스턴스 확인
app.plugins.plugins['speech-to-text']

// 2. 설정 탭 존재 확인
app.setting.pluginTabs

// 3. 설정 저장 테스트
const plugin = app.plugins.plugins['speech-to-text'];
plugin.settings.provider = 'deepgram';
await plugin.saveSettings();
```

---

## 3. 아키텍처 개선 사항

### 생명주기 관리자 (LifecycleManager)

```typescript
// src/core/LifecycleManager.ts
export class LifecycleManager {
    private disposables: (() => void)[] = [];
    private intervals: number[] = [];
    private timeouts: number[] = [];
    
    register(disposable: () => void): void {
        this.disposables.push(disposable);
    }
    
    registerInterval(id: number): void {
        this.intervals.push(id);
    }
    
    registerTimeout(id: number): void {
        this.timeouts.push(id);
    }
    
    async dispose(): Promise<void> {
        // 모든 인터벌 정리
        this.intervals.forEach(id => window.clearInterval(id));
        this.intervals = [];
        
        // 모든 타임아웃 정리
        this.timeouts.forEach(id => window.clearTimeout(id));
        this.timeouts = [];
        
        // 등록된 정리 함수 실행
        for (const dispose of this.disposables.reverse()) {
            try {
                await dispose();
            } catch (error) {
                console.error('Disposal error:', error);
            }
        }
        this.disposables = [];
    }
}
```

### 의존성 주입 컨테이너 (DependencyContainer)

```typescript
// src/core/DependencyContainer.ts
export class DependencyContainer {
    private services = new Map<string, any>();
    private factories = new Map<string, () => any>();
    
    register<T>(key: string, service: T): void {
        this.services.set(key, service);
    }
    
    registerFactory<T>(key: string, factory: () => T): void {
        this.factories.set(key, factory);
    }
    
    resolve<T>(key: string): T {
        if (this.services.has(key)) {
            return this.services.get(key);
        }
        
        if (this.factories.has(key)) {
            const instance = this.factories.get(key)!();
            this.services.set(key, instance);
            return instance;
        }
        
        throw new Error(`Service '${key}' not found`);
    }
    
    has(key: string): boolean {
        return this.services.has(key) || this.factories.has(key);
    }
}
```

### UI 매니저 (UIManager)

```typescript
// src/ui/UIManager.ts
export class UIManager {
    private components = new Map<string, any>();
    private updateQueue: (() => void)[] = [];
    private isUpdating = false;
    
    register(id: string, component: any): void {
        this.components.set(id, component);
    }
    
    unregister(id: string): void {
        const component = this.components.get(id);
        if (component?.destroy) {
            component.destroy();
        }
        this.components.delete(id);
    }
    
    queueUpdate(update: () => void): void {
        this.updateQueue.push(update);
        if (!this.isUpdating) {
            this.processUpdates();
        }
    }
    
    private async processUpdates(): Promise<void> {
        this.isUpdating = true;
        
        while (this.updateQueue.length > 0) {
            const update = this.updateQueue.shift()!;
            try {
                await update();
            } catch (error) {
                console.error('UI update error:', error);
            }
        }
        
        this.isUpdating = false;
    }
    
    getComponent<T>(id: string): T | undefined {
        return this.components.get(id);
    }
    
    dispose(): void {
        this.components.forEach((component, id) => {
            this.unregister(id);
        });
        this.updateQueue = [];
    }
}
```

### 에러 경계 시스템 (ErrorBoundary)

```typescript
// src/core/ErrorBoundary.ts
export class ErrorBoundary {
    private errorHandlers = new Map<string, (error: Error) => void>();
    private globalHandler?: (error: Error) => void;
    
    setGlobalHandler(handler: (error: Error) => void): void {
        this.globalHandler = handler;
    }
    
    setHandler(context: string, handler: (error: Error) => void): void {
        this.errorHandlers.set(context, handler);
    }
    
    async execute<T>(
        context: string,
        operation: () => Promise<T>,
        fallback?: T
    ): Promise<T> {
        try {
            return await operation();
        } catch (error) {
            this.handleError(context, error as Error);
            
            if (fallback !== undefined) {
                return fallback;
            }
            
            throw error;
        }
    }
    
    executeSync<T>(
        context: string,
        operation: () => T,
        fallback?: T
    ): T {
        try {
            return operation();
        } catch (error) {
            this.handleError(context, error as Error);
            
            if (fallback !== undefined) {
                return fallback;
            }
            
            throw error;
        }
    }
    
    private handleError(context: string, error: Error): void {
        console.error(`Error in ${context}:`, error);
        
        // Context-specific handler
        const handler = this.errorHandlers.get(context);
        if (handler) {
            handler(error);
            return;
        }
        
        // Global handler
        if (this.globalHandler) {
            this.globalHandler(error);
            return;
        }
        
        // Default: Show notice to user
        new Notice(`Error: ${error.message}`, 5000);
    }
}
```

---

## 4. 문제 해결 체크리스트

### 플러그인이 로드되지 않을 때

- [ ] Console에서 에러 메시지 확인
- [ ] `manifest.json` 버전 확인
- [ ] `main.js` 파일 존재 확인
- [ ] Obsidian 버전 호환성 확인
- [ ] 커뮤니티 플러그인 활성화 여부 확인

### StatusBar가 표시되지 않을 때

- [ ] StatusBar 초기화 코드 확인
- [ ] `onload()` 메서드에서 초기화 순서 확인
- [ ] StatusBar 아이템 null 체크 추가
- [ ] 다른 플러그인과의 충돌 확인

### 설정이 저장되지 않을 때

- [ ] `saveSettings()` 메서드 호출 확인
- [ ] 설정 객체 구조 확인
- [ ] `loadData()` / `saveData()` 에러 처리
- [ ] 설정 파일 권한 확인

### API 호출이 실패할 때

- [ ] API 키 유효성 확인
- [ ] 네트워크 연결 상태 확인
- [ ] Rate limiting 확인
- [ ] Request/Response 로깅 추가
- [ ] Fallback 메커니즘 동작 확인

---

## 5. 향후 개선 계획

### 단기 계획 (v3.0.3)

1. **성능 최적화**
   - 메모리 사용량 감소
   - 시작 시간 단축
   - 비동기 로딩 개선

2. **에러 처리 강화**
   - 더 상세한 에러 메시지
   - 자동 복구 메커니즘
   - 에러 리포팅 시스템

3. **사용자 경험 개선**
   - 진행 상황 표시 개선
   - 취소 기능 강화
   - 단축키 커스터마이징

### 중기 계획 (v3.1.0)

1. **새로운 기능**
   - 실시간 스트리밍 변환
   - 배치 처리 지원
   - 자동 번역 기능

2. **통합 개선**
   - 더 많은 Provider 지원
   - 플러그인 간 연동
   - 워크플로우 자동화

3. **접근성 향상**
   - 키보드 네비게이션
   - 스크린 리더 지원
   - 고대비 모드

### 장기 계획 (v4.0.0)

1. **아키텍처 재설계**
   - 마이크로서비스 패턴
   - 플러그인 시스템
   - 확장 가능한 Provider 인터페이스

2. **AI 기능 강화**
   - 컨텍스트 인식 변환
   - 자동 요약 생성
   - 스마트 태깅

3. **협업 기능**
   - 실시간 공동 편집
   - 변환 히스토리 공유
   - 팀 설정 동기화

---

## 참고 자료

### Obsidian API 문서
- [공식 API 문서](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- [Plugin API Reference](https://github.com/obsidianmd/obsidian-api)

### 관련 이슈
- [Issue #1234: StatusBar TypeError](https://github.com/user/repo/issues/1234)
- [Issue #1235: Settings not showing](https://github.com/user/repo/issues/1235)

### 개발 도구
- [Obsidian Plugin Developer Tools](https://github.com/obsidianmd/obsidian-sample-plugin)
- [Hot Reload Plugin](https://github.com/pjeby/hot-reload)

---

## 기여 가이드

이 문서를 개선하고 싶으시다면:

1. 이슈를 생성하여 문제점을 보고해주세요
2. Pull Request를 통해 개선사항을 제안해주세요
3. 디스코드 채널에서 논의에 참여해주세요

---

*최종 업데이트: 2025-08-30*
*버전: v3.0.2*
*작성자: SpeechNote Development Team*