/**
 * 메모리 관리 유틸리티
 * - 메모리 누수 방지
 * - 자동 정리 메커니즘
 * - WeakMap/WeakSet 활용
 * - 리소스 추적
 */

/**
 * 자동 정리 가능한 리소스 인터페이스
 */
export interface Disposable {
    dispose(): void;
}

/**
 * 리소스 관리자
 */
export class ResourceManager {
    private resources = new Set<Disposable>();
    private timers = new Set<number>();
    private intervals = new Set<number>();
    private listeners = new Map<EventTarget, Map<string, EventListener>>();
    private observers = new Set<MutationObserver | IntersectionObserver | ResizeObserver>();
    private abortControllers = new Set<AbortController>();
    
    /**
     * Disposable 리소스 추가
     */
    add(resource: Disposable): void {
        this.resources.add(resource);
    }

    /**
     * 타이머 추가
     */
    addTimer(timerId: number): void {
        this.timers.add(timerId);
    }

    /**
     * 인터벌 추가
     */
    addInterval(intervalId: number): void {
        this.intervals.add(intervalId);
    }

    /**
     * 이벤트 리스너 추가
     */
    addEventListener(
        target: EventTarget,
        type: string,
        listener: EventListener,
        options?: boolean | AddEventListenerOptions
    ): void {
        target.addEventListener(type, listener, options);
        
        if (!this.listeners.has(target)) {
            this.listeners.set(target, new Map());
        }
        this.listeners.get(target)!.set(type, listener);
    }

    /**
     * Observer 추가
     */
    addObserver(observer: MutationObserver | IntersectionObserver | ResizeObserver): void {
        this.observers.add(observer);
    }

    /**
     * AbortController 추가
     */
    addAbortController(controller: AbortController): void {
        this.abortControllers.add(controller);
    }

    /**
     * 특정 리소스 제거
     */
    remove(resource: Disposable): void {
        if (this.resources.has(resource)) {
            resource.dispose();
            this.resources.delete(resource);
        }
    }

    /**
     * 모든 리소스 정리
     */
    dispose(): void {
        // Disposable 리소스 정리
        this.resources.forEach(resource => {
            try {
                resource.dispose();
            } catch (error) {
                console.error('Error disposing resource:', error);
            }
        });
        this.resources.clear();

        // 타이머 정리
        this.timers.forEach(timerId => {
            clearTimeout(timerId);
        });
        this.timers.clear();

        // 인터벌 정리
        this.intervals.forEach(intervalId => {
            clearInterval(intervalId);
        });
        this.intervals.clear();

        // 이벤트 리스너 정리
        this.listeners.forEach((events, target) => {
            events.forEach((listener, type) => {
                try {
                    target.removeEventListener(type, listener);
                } catch (error) {
                    console.error('Error removing event listener:', error);
                }
            });
        });
        this.listeners.clear();

        // Observer 정리
        this.observers.forEach(observer => {
            try {
                observer.disconnect();
            } catch (error) {
                console.error('Error disconnecting observer:', error);
            }
        });
        this.observers.clear();

        // AbortController 정리
        this.abortControllers.forEach(controller => {
            try {
                controller.abort();
            } catch (error) {
                console.error('Error aborting controller:', error);
            }
        });
        this.abortControllers.clear();
    }
}

/**
 * WeakMap 기반 캐시
 */
export class WeakCache<K extends object, V> {
    private cache = new WeakMap<K, { value: V; timestamp: number }>();
    private ttl: number;

    constructor(ttl: number = Infinity) {
        this.ttl = ttl;
    }

    /**
     * 캐시 설정
     */
    set(key: K, value: V): void {
        this.cache.set(key, {
            value,
            timestamp: Date.now()
        });
    }

    /**
     * 캐시 가져오기
     */
    get(key: K): V | undefined {
        const entry = this.cache.get(key);
        
        if (!entry) {
            return undefined;
        }

        if (this.ttl !== Infinity && Date.now() - entry.timestamp > this.ttl) {
            this.cache.delete(key);
            return undefined;
        }

        return entry.value;
    }

    /**
     * 캐시 확인
     */
    has(key: K): boolean {
        return this.cache.has(key);
    }

    /**
     * 캐시 삭제
     */
    delete(key: K): boolean {
        return this.cache.delete(key);
    }
}

/**
 * DOM 요소 참조 관리자
 */
export class DOMReferenceManager {
    private elements = new Map<string, WeakRef<HTMLElement>>();
    private cleanupRegistry = new FinalizationRegistry((id: string) => {
        console.debug(`Element with id ${id} was garbage collected`);
    });

    /**
     * 요소 참조 추가
     */
    addElement(id: string, element: HTMLElement): void {
        const ref = new WeakRef(element);
        this.elements.set(id, ref);
        this.cleanupRegistry.register(element, id);
    }

    /**
     * 요소 참조 가져오기
     */
    getElement(id: string): HTMLElement | undefined {
        const ref = this.elements.get(id);
        return ref?.deref();
    }

    /**
     * 요소 참조 제거
     */
    removeElement(id: string): void {
        this.elements.delete(id);
    }
}

/**
 * 메모리 사용량 모니터
 */
export class MemoryMonitor {
    private static instance: MemoryMonitor;
    private monitoring = false;
    private interval: number | null = null;
    private threshold = 50 * 1024 * 1024; // 50MB
    private callbacks = new Set<(info: MemoryInfo) => void>();

    private constructor() {}

    static getInstance(): MemoryMonitor {
        if (!this.instance) {
            this.instance = new MemoryMonitor();
        }
        return this.instance;
    }

    /**
     * 모니터링 시작
     */
    start(intervalMs: number = 5000): void {
        if (this.monitoring) return;
        
        this.monitoring = true;
        this.interval = window.setInterval(() => {
            this.check();
        }, intervalMs);
    }

    /**
     * 모니터링 중지
     */
    stop(): void {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.monitoring = false;
    }

    /**
     * 메모리 체크
     */
    private async check(): Promise<void> {
        if ('memory' in performance) {
            const memory = (performance as any).memory;
            const info: MemoryInfo = {
                usedJSHeapSize: memory.usedJSHeapSize,
                totalJSHeapSize: memory.totalJSHeapSize,
                jsHeapSizeLimit: memory.jsHeapSizeLimit,
                usage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
            };

            // 임계치 초과 시 경고
            if (memory.usedJSHeapSize > this.threshold) {
                console.warn('High memory usage detected:', info);
            }

            // 콜백 실행
            this.callbacks.forEach(callback => callback(info));
        }
    }

    /**
     * 메모리 사용량 리스너 추가
     */
    onMemoryChange(callback: (info: MemoryInfo) => void): () => void {
        this.callbacks.add(callback);
        return () => this.callbacks.delete(callback);
    }

    /**
     * 임계치 설정
     */
    setThreshold(bytes: number): void {
        this.threshold = bytes;
    }
}

interface MemoryInfo {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
    usage: number;
}

/**
 * 이벤트 리스너 매니저
 */
export class EventListenerManager {
    private listeners = new Map<string, Set<EventListenerEntry>>();
    private delegatedListeners = new Map<string, DelegatedListener>();

    /**
     * 이벤트 리스너 추가
     */
    add(
        target: EventTarget,
        type: string,
        listener: EventListener,
        options?: boolean | AddEventListenerOptions
    ): () => void {
        const entry: EventListenerEntry = { target, type, listener, options };
        const key = this.getKey(target, type);
        
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }
        
        const entries = this.listeners.get(key)!;
        
        // 중복 방지
        const exists = Array.from(entries).some(e => 
            e.listener === listener && 
            JSON.stringify(e.options) === JSON.stringify(options)
        );
        
        if (!exists) {
            entries.add(entry);
            target.addEventListener(type, listener, options);
        }
        
        // 제거 함수 반환
        return () => this.remove(target, type, listener);
    }

    /**
     * 이벤트 위임 추가
     */
    addDelegated(
        container: HTMLElement,
        type: string,
        selector: string,
        handler: (event: Event, element: HTMLElement) => void
    ): () => void {
        const key = this.getKey(container, type);
        
        if (!this.delegatedListeners.has(key)) {
            const listener = (event: Event) => {
                const target = event.target as HTMLElement;
                const element = target.closest(selector) as HTMLElement;
                
                if (element && container.contains(element)) {
                    handler(event, element);
                }
            };
            
            container.addEventListener(type, listener, true);
            this.delegatedListeners.set(key, { container, type, listener });
        }
        
        return () => this.removeDelegated(container, type);
    }

    /**
     * 이벤트 리스너 제거
     */
    remove(target: EventTarget, type: string, listener: EventListener): void {
        const key = this.getKey(target, type);
        const entries = this.listeners.get(key);
        
        if (entries) {
            const entry = Array.from(entries).find(e => e.listener === listener);
            if (entry) {
                target.removeEventListener(type, listener, entry.options);
                entries.delete(entry);
                
                if (entries.size === 0) {
                    this.listeners.delete(key);
                }
            }
        }
    }

    /**
     * 위임된 리스너 제거
     */
    removeDelegated(container: HTMLElement, type: string): void {
        const key = this.getKey(container, type);
        const delegated = this.delegatedListeners.get(key);
        
        if (delegated) {
            container.removeEventListener(type, delegated.listener, true);
            this.delegatedListeners.delete(key);
        }
    }

    /**
     * 모든 리스너 제거
     */
    removeAll(): void {
        // 일반 리스너 제거
        this.listeners.forEach(entries => {
            entries.forEach(entry => {
                entry.target.removeEventListener(entry.type, entry.listener, entry.options);
            });
        });
        this.listeners.clear();

        // 위임된 리스너 제거
        this.delegatedListeners.forEach(delegated => {
            delegated.container.removeEventListener(delegated.type, delegated.listener, true);
        });
        this.delegatedListeners.clear();
    }

    /**
     * 키 생성
     */
    private getKey(target: EventTarget, type: string): string {
        if (target instanceof Element) {
            return `${target.tagName}#${target.id || 'no-id'}.${type}`;
        }
        return `${target.constructor.name}.${type}`;
    }
}

interface EventListenerEntry {
    target: EventTarget;
    type: string;
    listener: EventListener;
    options?: boolean | AddEventListenerOptions;
}

interface DelegatedListener {
    container: HTMLElement;
    type: string;
    listener: EventListener;
}

/**
 * 자동 정리 클래스 베이스
 */
export abstract class AutoDisposable implements Disposable {
    protected resourceManager = new ResourceManager();
    protected eventManager = new EventListenerManager();
    private disposed = false;

    /**
     * 리소스 정리
     */
    dispose(): void {
        if (this.disposed) return;
        
        this.disposed = true;
        this.resourceManager.dispose();
        this.eventManager.removeAll();
        this.onDispose();
    }

    /**
     * 서브클래스에서 구현할 정리 로직
     */
    protected abstract onDispose(): void;

    /**
     * 정리 여부 확인
     */
    isDisposed(): boolean {
        return this.disposed;
    }
}