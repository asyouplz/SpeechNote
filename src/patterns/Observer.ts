/**
 * Observer 패턴 구현
 * 이벤트 기반 통신을 위한 패턴
 */

/**
 * 이벤트 타입 정의
 */
export type EventMap = Record<string, unknown>;

/**
 * 이벤트 리스너 타입
 */
export type EventListener<T = unknown> = (data: T) => void | Promise<void>;

type AnyEventListener = (data: unknown) => void | Promise<void>;

/**
 * 구독 해제 함수
 */
export type Unsubscribe = () => void;

/**
 * Observer 인터페이스
 */
export interface IObserver<T> {
    update(data: T): void | Promise<void>;
}

/**
 * Observable 인터페이스
 */
export interface IObservable<T> {
    subscribe(observer: IObserver<T>): Unsubscribe;
    unsubscribe(observer: IObserver<T>): void;
    notify(data: T): void;
}

/**
 * 강화된 EventEmitter 클래스
 */
export class EventEmitter<T extends EventMap = EventMap> {
    private events = new Map<keyof T, Set<AnyEventListener>>();
    private onceEvents = new Map<keyof T, Set<AnyEventListener>>();
    
    /**
     * 이벤트 리스너 등록
     */
    on<K extends keyof T>(event: K, listener: EventListener<T[K]>): Unsubscribe {
        const listeners = this.events.get(event) ?? new Set<AnyEventListener>();
        listeners.add(listener as AnyEventListener);
        this.events.set(event, listeners);
        
        return () => this.off(event, listener);
    }
    
    /**
     * 일회성 이벤트 리스너 등록
     */
    once<K extends keyof T>(event: K, listener: EventListener<T[K]>): Unsubscribe {
        const listeners = this.onceEvents.get(event) ?? new Set<AnyEventListener>();
        listeners.add(listener as AnyEventListener);
        this.onceEvents.set(event, listeners);
        
        return () => this.off(event, listener);
    }
    
    /**
     * 이벤트 리스너 제거
     */
    off<K extends keyof T>(event: K, listener: EventListener<T[K]>): void {
        this.events.get(event)?.delete(listener as AnyEventListener);
        this.onceEvents.get(event)?.delete(listener as AnyEventListener);
    }
    
    /**
     * 이벤트 발생
     */
    emit<K extends keyof T>(event: K, data: T[K]): void {
        // 일반 리스너 실행
        this.events.get(event)?.forEach(listener => {
            try {
                void listener(data);
            } catch (error) {
                console.error(`Error in event listener for ${String(event)}:`, error);
            }
        });
        
        // 일회성 리스너 실행 및 제거
        const onceListeners = this.onceEvents.get(event);
        if (onceListeners) {
            onceListeners.forEach(listener => {
                try {
                    void listener(data);
                } catch (error) {
                    console.error(`Error in once listener for ${String(event)}:`, error);
                }
            });
            this.onceEvents.delete(event);
        }
    }
    
    /**
     * 비동기 이벤트 발생
     */
    async emitAsync<K extends keyof T>(event: K, data: T[K]): Promise<void> {
        const promises: Promise<void>[] = [];
        
        // 일반 리스너 실행
        this.events.get(event)?.forEach(listener => {
            promises.push(
                Promise.resolve(listener(data)).catch(error => {
                    console.error(`Error in async event listener for ${String(event)}:`, error);
                })
            );
        });
        
        // 일회성 리스너 실행
        const onceListeners = this.onceEvents.get(event);
        if (onceListeners) {
            onceListeners.forEach(listener => {
                promises.push(
                    Promise.resolve(listener(data)).catch(error => {
                        console.error(`Error in async once listener for ${String(event)}:`, error);
                    })
                );
            });
            this.onceEvents.delete(event);
        }
        
        await Promise.all(promises);
    }
    
    /**
     * 특정 이벤트의 모든 리스너 제거
     */
    removeAllListeners<K extends keyof T>(event?: K): void {
        if (event) {
            this.events.delete(event);
            this.onceEvents.delete(event);
        } else {
            this.events.clear();
            this.onceEvents.clear();
        }
    }
    
    /**
     * 리스너 개수 확인
     */
    listenerCount<K extends keyof T>(event: K): number {
        const normalCount = this.events.get(event)?.size || 0;
        const onceCount = this.onceEvents.get(event)?.size || 0;
        return normalCount + onceCount;
    }
    
    /**
     * 이벤트 이름 목록
     */
    eventNames(): (keyof T)[] {
        const names = new Set([
            ...this.events.keys(),
            ...this.onceEvents.keys()
        ]);
        return Array.from(names);
    }
}

/**
 * Subject 클래스 (Observable 구현)
 */
export class Subject<T> implements IObservable<T> {
    private observers = new Set<IObserver<T>>();
    
    subscribe(observer: IObserver<T>): Unsubscribe {
        this.observers.add(observer);
        return () => this.unsubscribe(observer);
    }
    
    unsubscribe(observer: IObserver<T>): void {
        this.observers.delete(observer);
    }
    
    notify(data: T): void {
        this.observers.forEach(observer => {
            try {
                void observer.update(data);
            } catch (error) {
                console.error('Error notifying observer:', error);
            }
        });
    }
    
    async notifyAsync(data: T): Promise<void> {
        const promises = Array.from(this.observers).map(observer =>
            Promise.resolve(observer.update(data)).catch(error => {
                console.error('Error notifying observer:', error);
            })
        );
        await Promise.all(promises);
    }
    
    getObserverCount(): number {
        return this.observers.size;
    }
    
    clearObservers(): void {
        this.observers.clear();
    }
}

/**
 * BehaviorSubject - 현재 값을 저장하는 Subject
 */
export class BehaviorSubject<T> extends Subject<T> {
    constructor(private value: T) {
        super();
    }
    
    getValue(): T {
        return this.value;
    }
    
    next(value: T): void {
        this.value = value;
        this.notify(value);
    }
    
    subscribe(observer: IObserver<T>): Unsubscribe {
        // 구독 시 현재 값을 즉시 전달
        void observer.update(this.value);
        return super.subscribe(observer);
    }
}

/**
 * 함수형 Observer 생성
 */
export function createObserver<T>(
    updateFn: (data: T) => void | Promise<void>
): IObserver<T> {
    return {
        update: updateFn
    };
}
