# 메모리 관리 가이드

## 1. 개요

이 가이드는 SpeechNote 프로젝트의 메모리 관리 베스트 프랙티스를 제공합니다. JavaScript/TypeScript 환경에서 메모리 누수를 방지하고 효율적인 리소스 관리를 위한 패턴과 기법을 다룹니다.

## 2. 핵심 원칙

### 2.1 자동 정리 원칙
모든 리소스는 생성 시점에 정리 방법을 정의해야 합니다.

```typescript
// ✅ 좋은 예
class Component extends AutoDisposable {
    private timer: number;
    
    constructor() {
        super();
        this.timer = setInterval(() => {}, 1000);
        this.resourceManager.addTimer(this.timer);
    }
    
    onDispose(): void {
        // 자동으로 정리됨
    }
}

// ❌ 나쁜 예
class Component {
    private timer: number;
    
    constructor() {
        this.timer = setInterval(() => {}, 1000);
        // 정리 방법 없음!
    }
}
```

### 2.2 약한 참조 원칙
가능한 경우 WeakMap, WeakSet을 사용하여 자동 가비지 컬렉션을 활용합니다.

```typescript
// ✅ 좋은 예
class Cache {
    private cache = new WeakMap<object, any>();
    
    set(key: object, value: any): void {
        this.cache.set(key, value);
        // key가 GC되면 자동으로 정리됨
    }
}

// ❌ 나쁜 예
class Cache {
    private cache = new Map<object, any>();
    
    set(key: object, value: any): void {
        this.cache.set(key, value);
        // 명시적으로 삭제하지 않으면 메모리 누수
    }
}
```

## 3. AutoDisposable 패턴

### 3.1 기본 사용법

```typescript
import { AutoDisposable } from '@/utils/memory/MemoryManager';

export class MyComponent extends AutoDisposable {
    private subscription: Subscription;
    private domElement: HTMLElement;
    
    constructor() {
        super();
        
        // 리소스 생성
        this.setupSubscriptions();
        this.createDomElements();
    }
    
    private setupSubscriptions(): void {
        // 이벤트 리스너 자동 관리
        this.eventManager.add(
            window,
            'resize',
            this.handleResize.bind(this)
        );
        
        // Observable 구독
        this.subscription = someObservable.subscribe(data => {
            this.handleData(data);
        });
        
        // 구독을 리소스 매니저에 추가
        this.resourceManager.add({
            dispose: () => this.subscription.unsubscribe()
        });
    }
    
    private createDomElements(): void {
        this.domElement = document.createElement('div');
        document.body.appendChild(this.domElement);
        
        // DOM 정리 등록
        this.resourceManager.add({
            dispose: () => this.domElement.remove()
        });
    }
    
    protected onDispose(): void {
        // 추가 정리 로직 (선택사항)
        console.log('Component disposed');
    }
    
    private handleResize(): void {
        // 리사이즈 처리
    }
    
    private handleData(data: any): void {
        // 데이터 처리
    }
}

// 사용
const component = new MyComponent();

// 정리
component.dispose(); // 모든 리소스 자동 정리
```

### 3.2 중첩된 컴포넌트

```typescript
class ParentComponent extends AutoDisposable {
    private childComponents: ChildComponent[] = [];
    
    constructor() {
        super();
        this.createChildren();
    }
    
    private createChildren(): void {
        for (let i = 0; i < 10; i++) {
            const child = new ChildComponent();
            this.childComponents.push(child);
            
            // 자식 컴포넌트를 리소스로 등록
            this.resourceManager.add(child);
        }
    }
    
    protected onDispose(): void {
        // 부모가 dispose되면 모든 자식도 자동 dispose
    }
}
```

## 4. 이벤트 리스너 관리

### 4.1 EventListenerManager 사용

```typescript
import { EventListenerManager } from '@/utils/memory/MemoryManager';

class UIComponent {
    private eventManager = new EventListenerManager();
    
    constructor(private container: HTMLElement) {
        this.setupEvents();
    }
    
    private setupEvents(): void {
        // 일반 이벤트 리스너
        const removeClick = this.eventManager.add(
            this.container,
            'click',
            (e) => this.handleClick(e)
        );
        
        // 옵션과 함께
        this.eventManager.add(
            window,
            'scroll',
            (e) => this.handleScroll(e),
            { passive: true }
        );
        
        // 이벤트 위임
        this.eventManager.addDelegated(
            this.container,
            'click',
            '.button',
            (event, element) => {
                console.log('Button clicked:', element);
            }
        );
    }
    
    private handleClick(e: Event): void {
        // 클릭 처리
    }
    
    private handleScroll(e: Event): void {
        // 스크롤 처리
    }
    
    dispose(): void {
        // 모든 이벤트 리스너 한 번에 제거
        this.eventManager.removeAll();
    }
}
```

### 4.2 이벤트 위임 패턴

```typescript
// 많은 요소에 개별 리스너 대신 위임 사용
class ListView {
    private eventManager = new EventListenerManager();
    
    constructor(private container: HTMLElement) {
        this.setupDelegation();
    }
    
    private setupDelegation(): void {
        // ❌ 나쁜 예: 각 아이템에 리스너
        // items.forEach(item => {
        //     item.addEventListener('click', handler);
        // });
        
        // ✅ 좋은 예: 이벤트 위임
        this.eventManager.addDelegated(
            this.container,
            'click',
            '.list-item',
            (event, element) => {
                const itemId = element.dataset.id;
                this.handleItemClick(itemId);
            }
        );
    }
    
    private handleItemClick(itemId: string): void {
        console.log('Item clicked:', itemId);
    }
}
```

## 5. 타이머와 인터벌 관리

### 5.1 ResourceManager를 통한 관리

```typescript
class AnimationComponent extends AutoDisposable {
    private animationFrame: number;
    
    constructor() {
        super();
        this.startAnimation();
        this.startTimer();
    }
    
    private startAnimation(): void {
        const animate = () => {
            // 애니메이션 로직
            this.animationFrame = requestAnimationFrame(animate);
            this.resourceManager.addTimer(this.animationFrame);
        };
        animate();
    }
    
    private startTimer(): void {
        // setTimeout
        const timerId = setTimeout(() => {
            console.log('Delayed action');
        }, 1000);
        this.resourceManager.addTimer(timerId);
        
        // setInterval
        const intervalId = setInterval(() => {
            console.log('Repeated action');
        }, 5000);
        this.resourceManager.addInterval(intervalId);
    }
    
    protected onDispose(): void {
        // 모든 타이머 자동 정리
    }
}
```

## 6. DOM 참조 관리

### 6.1 WeakRef 사용

```typescript
import { DOMReferenceManager } from '@/utils/memory/MemoryManager';

class DOMController {
    private domManager = new DOMReferenceManager();
    
    registerElement(id: string, element: HTMLElement): void {
        // WeakRef로 저장 - 요소가 DOM에서 제거되면 자동 GC
        this.domManager.addElement(id, element);
    }
    
    getElement(id: string): HTMLElement | undefined {
        // 요소가 여전히 존재하는지 확인
        return this.domManager.getElement(id);
    }
    
    updateElement(id: string): void {
        const element = this.getElement(id);
        if (element) {
            // 요소가 존재할 때만 업데이트
            element.textContent = 'Updated';
        } else {
            console.log('Element was garbage collected');
        }
    }
}
```

### 6.2 DOM 클린업

```typescript
class ModalComponent extends AutoDisposable {
    private modalEl: HTMLElement;
    private backdrop: HTMLElement;
    
    constructor() {
        super();
        this.createModal();
    }
    
    private createModal(): void {
        // 모달 생성
        this.modalEl = document.createElement('div');
        this.modalEl.className = 'modal';
        
        this.backdrop = document.createElement('div');
        this.backdrop.className = 'backdrop';
        
        document.body.appendChild(this.backdrop);
        document.body.appendChild(this.modalEl);
        
        // DOM 정리 등록
        this.resourceManager.add({
            dispose: () => {
                this.modalEl.remove();
                this.backdrop.remove();
            }
        });
    }
    
    protected onDispose(): void {
        // 추가 정리 (이벤트 발생 등)
        this.emit('closed');
    }
}
```

## 7. 비동기 작업 관리

### 7.1 취소 가능한 Promise

```typescript
import { CancellablePromise } from '@/utils/async/AsyncManager';

class DataFetcher extends AutoDisposable {
    private fetchPromise?: CancellablePromise<any>;
    
    async fetchData(): Promise<void> {
        // 이전 요청 취소
        if (this.fetchPromise) {
            this.fetchPromise.cancel();
        }
        
        this.fetchPromise = new CancellablePromise(
            async (resolve, reject, signal) => {
                try {
                    const response = await fetch('/api/data', { signal });
                    const data = await response.json();
                    resolve(data);
                } catch (error) {
                    if (signal.aborted) {
                        reject(new Error('Cancelled'));
                    } else {
                        reject(error);
                    }
                }
            }
        );
        
        // 리소스로 등록
        this.resourceManager.add({
            dispose: () => this.fetchPromise?.cancel()
        });
        
        try {
            const data = await this.fetchPromise;
            console.log('Data received:', data);
        } catch (error) {
            if (error.message === 'Cancelled') {
                console.log('Request was cancelled');
            } else {
                console.error('Error:', error);
            }
        }
    }
    
    protected onDispose(): void {
        // 진행 중인 요청 취소
        this.fetchPromise?.cancel();
    }
}
```

### 7.2 AbortController 관리

```typescript
class APIClient extends AutoDisposable {
    private abortController?: AbortController;
    
    async makeRequest(url: string): Promise<any> {
        // 새 요청마다 새 컨트롤러
        this.abortController = new AbortController();
        this.resourceManager.addAbortController(this.abortController);
        
        try {
            const response = await fetch(url, {
                signal: this.abortController.signal
            });
            return await response.json();
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Request aborted');
            } else {
                throw error;
            }
        }
    }
    
    cancelRequest(): void {
        this.abortController?.abort();
    }
    
    protected onDispose(): void {
        // 모든 진행 중인 요청 취소
    }
}
```

## 8. 메모리 모니터링

### 8.1 MemoryMonitor 사용

```typescript
import { MemoryMonitor } from '@/utils/memory/MemoryManager';

class Application {
    private memoryMonitor = MemoryMonitor.getInstance();
    
    constructor() {
        this.setupMonitoring();
    }
    
    private setupMonitoring(): void {
        // 임계치 설정 (100MB)
        this.memoryMonitor.setThreshold(100 * 1024 * 1024);
        
        // 메모리 변경 리스너
        const unsubscribe = this.memoryMonitor.onMemoryChange((info) => {
            console.log(`Memory usage: ${info.usage.toFixed(2)}%`);
            
            if (info.usage > 80) {
                this.handleHighMemoryUsage();
            }
        });
        
        // 모니터링 시작 (5초마다 체크)
        this.memoryMonitor.start(5000);
    }
    
    private handleHighMemoryUsage(): void {
        console.warn('High memory usage detected!');
        
        // 캐시 정리
        this.clearCaches();
        
        // 가비지 컬렉션 힌트
        if (global.gc) {
            global.gc();
        }
    }
    
    private clearCaches(): void {
        // 애플리케이션 캐시 정리
    }
    
    dispose(): void {
        this.memoryMonitor.stop();
    }
}
```

## 9. 캐싱 전략

### 9.1 WeakCache 사용

```typescript
import { WeakCache } from '@/utils/memory/MemoryManager';

class DataCache {
    // TTL 10분
    private cache = new WeakCache<object, any>(10 * 60 * 1000);
    
    async getData(key: object): Promise<any> {
        // 캐시 확인
        const cached = this.cache.get(key);
        if (cached) {
            return cached;
        }
        
        // 데이터 로드
        const data = await this.loadData(key);
        
        // 캐시 저장
        this.cache.set(key, data);
        
        return data;
    }
    
    private async loadData(key: object): Promise<any> {
        // 실제 데이터 로드 로직
        return fetch(`/api/data/${key.id}`).then(r => r.json());
    }
}
```

### 9.2 LRU 캐시 구현

```typescript
class LRUCache<K, V> {
    private cache = new Map<K, V>();
    private maxSize: number;
    
    constructor(maxSize: number = 100) {
        this.maxSize = maxSize;
    }
    
    get(key: K): V | undefined {
        const value = this.cache.get(key);
        if (value !== undefined) {
            // 최근 사용으로 이동
            this.cache.delete(key);
            this.cache.set(key, value);
        }
        return value;
    }
    
    set(key: K, value: V): void {
        // 기존 키 삭제 (순서 변경을 위해)
        if (this.cache.has(key)) {
            this.cache.delete(key);
        }
        
        // 크기 제한 확인
        if (this.cache.size >= this.maxSize) {
            // 가장 오래된 항목 제거
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        // 새 항목 추가
        this.cache.set(key, value);
    }
    
    clear(): void {
        this.cache.clear();
    }
}
```

## 10. 베스트 프랙티스

### 10.1 컴포넌트 생명주기

```typescript
class BestPracticeComponent extends AutoDisposable {
    private static readonly DEBOUNCE_DELAY = 300;
    private static readonly MAX_RETRIES = 3;
    
    constructor() {
        super();
        
        // 1. 초기화는 constructor에서
        this.initialize();
    }
    
    private async initialize(): Promise<void> {
        // 2. 비동기 초기화는 별도 메서드로
        try {
            await this.loadResources();
            this.setupEventHandlers();
            this.startBackgroundTasks();
        } catch (error) {
            this.handleInitError(error);
        }
    }
    
    private async loadResources(): Promise<void> {
        // 3. 리소스 로딩
    }
    
    private setupEventHandlers(): void {
        // 4. 이벤트 핸들러는 메모리 관리자 사용
        this.eventManager.add(/* ... */);
    }
    
    private startBackgroundTasks(): void {
        // 5. 백그라운드 작업 시작
    }
    
    protected onDispose(): void {
        // 6. 정리는 자동으로
    }
}
```

### 10.2 에러 처리와 메모리

```typescript
class SafeComponent extends AutoDisposable {
    async performOperation(): Promise<void> {
        const resources: Disposable[] = [];
        
        try {
            // 리소스 할당
            const resource1 = await this.allocateResource1();
            resources.push(resource1);
            
            const resource2 = await this.allocateResource2();
            resources.push(resource2);
            
            // 작업 수행
            await this.doWork(resource1, resource2);
            
        } catch (error) {
            // 에러 처리
            console.error('Operation failed:', error);
            throw error;
            
        } finally {
            // 항상 정리
            resources.forEach(r => r.dispose());
        }
    }
}
```

### 10.3 성능 최적화

```typescript
class OptimizedComponent extends AutoDisposable {
    private renderScheduled = false;
    
    // 1. 렌더링 배치 처리
    scheduleRender(): void {
        if (this.renderScheduled) return;
        
        this.renderScheduled = true;
        requestAnimationFrame(() => {
            this.render();
            this.renderScheduled = false;
        });
    }
    
    // 2. 디바운싱
    private handleInput = debounce((value: string) => {
        this.processInput(value);
    }, 300);
    
    // 3. 쓰로틀링
    private handleScroll = throttle(() => {
        this.updateScrollPosition();
    }, 100);
    
    // 4. 메모이제이션
    private memoizedComputation = memoize((input: string) => {
        return this.expensiveComputation(input);
    });
}
```

## 11. 문제 해결

### 11.1 메모리 누수 진단

```typescript
class MemoryLeakDetector {
    private objectCounts = new Map<string, number>();
    
    trackObject(type: string): void {
        const count = this.objectCounts.get(type) || 0;
        this.objectCounts.set(type, count + 1);
    }
    
    untrackObject(type: string): void {
        const count = this.objectCounts.get(type) || 0;
        if (count > 0) {
            this.objectCounts.set(type, count - 1);
        }
    }
    
    getReport(): Map<string, number> {
        return new Map(this.objectCounts);
    }
    
    detectLeaks(): string[] {
        const leaks: string[] = [];
        
        this.objectCounts.forEach((count, type) => {
            if (count > 100) {
                leaks.push(`Possible leak: ${type} (${count} instances)`);
            }
        });
        
        return leaks;
    }
}
```

### 11.2 일반적인 메모리 누수 패턴

```typescript
// ❌ 문제: 이벤트 리스너 미제거
class BadComponent {
    constructor() {
        window.addEventListener('resize', this.handleResize);
    }
    
    handleResize = () => {
        // 화살표 함수는 this를 바인딩하여 메모리 누수 발생
    }
}

// ✅ 해결: AutoDisposable 사용
class GoodComponent extends AutoDisposable {
    constructor() {
        super();
        this.eventManager.add(window, 'resize', () => this.handleResize());
    }
    
    private handleResize(): void {
        // 자동으로 정리됨
    }
}

// ❌ 문제: 순환 참조
class Parent {
    child: Child;
    constructor() {
        this.child = new Child(this);
    }
}

class Child {
    constructor(public parent: Parent) {}
}

// ✅ 해결: WeakMap 사용
class BetterParent {
    private static childMap = new WeakMap<BetterParent, Child>();
    
    constructor() {
        const child = new Child();
        BetterParent.childMap.set(this, child);
    }
}
```

## 12. 체크리스트

### 12.1 컴포넌트 개발 체크리스트

- [ ] AutoDisposable 상속 또는 수동 dispose 구현
- [ ] 모든 이벤트 리스너를 EventListenerManager로 관리
- [ ] 타이머와 인터벌을 ResourceManager에 등록
- [ ] DOM 요소 참조는 WeakRef 사용 고려
- [ ] 비동기 작업은 취소 가능하게 구현
- [ ] 에러 경계 구현
- [ ] 메모리 집약적 작업은 Web Worker 고려
- [ ] 큰 데이터는 가상 스크롤링 적용
- [ ] 캐시는 크기 제한과 TTL 설정
- [ ] 개발 환경에서 메모리 프로파일링 수행

### 12.2 코드 리뷰 체크리스트

- [ ] dispose 메서드가 모든 리소스를 정리하는가?
- [ ] 이벤트 리스너가 제거되는가?
- [ ] 타이머가 정리되는가?
- [ ] 순환 참조가 없는가?
- [ ] 큰 객체가 적절히 해제되는가?
- [ ] 비동기 작업이 취소 가능한가?
- [ ] 에러 시 리소스가 정리되는가?
- [ ] 메모리 사용량이 시간에 따라 증가하지 않는가?

## 13. 도구와 디버깅

### 13.1 Chrome DevTools

```javascript
// 메모리 프로파일링
// 1. Performance 탭에서 Memory 체크
// 2. 녹화 시작 및 작업 수행
// 3. 메모리 사용량 분석

// 힙 스냅샷
// 1. Memory 탭 열기
// 2. Take heap snapshot
// 3. 작업 수행 후 다시 스냅샷
// 4. 비교 분석

// 메모리 누수 감지
// 1. 3-snapshot 기법 사용
//    - 초기 스냅샷
//    - 작업 수행 후 스냅샷
//    - 가비지 컬렉션 후 스냅샷
// 2. Retained size 증가 확인
```

### 13.2 프로그래밍 방식 모니터링

```typescript
class PerformanceMonitor {
    static measureMemory(): void {
        if (performance.memory) {
            console.log({
                usedJSHeapSize: `${(performance.memory.usedJSHeapSize / 1048576).toFixed(2)} MB`,
                totalJSHeapSize: `${(performance.memory.totalJSHeapSize / 1048576).toFixed(2)} MB`,
                jsHeapSizeLimit: `${(performance.memory.jsHeapSizeLimit / 1048576).toFixed(2)} MB`
            });
        }
    }
    
    static trackObjectCreation<T>(
        ClassName: new (...args: any[]) => T
    ): new (...args: any[]) => T {
        let instanceCount = 0;
        
        return class extends ClassName {
            constructor(...args: any[]) {
                super(...args);
                instanceCount++;
                console.log(`${ClassName.name} instances: ${instanceCount}`);
            }
        };
    }
}
```

## 14. 결론

효과적인 메모리 관리는 애플리케이션의 성능과 안정성에 필수적입니다. 이 가이드에서 제시한 패턴과 기법을 따르면:

1. **메모리 누수 방지**: AutoDisposable 패턴으로 자동 정리
2. **성능 향상**: 효율적인 리소스 사용과 캐싱
3. **유지보수성**: 명확한 생명주기 관리
4. **안정성**: 에러 상황에서도 리소스 정리 보장

지속적인 모니터링과 프로파일링을 통해 메모리 사용을 최적화하고, 사용자에게 부드러운 경험을 제공할 수 있습니다.