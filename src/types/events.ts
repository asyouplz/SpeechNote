/**
 * 통합 이벤트 시스템 타입 정의
 * 
 * 모든 이벤트 기반 API에서 사용할 표준화된 타입
 */

/**
 * 구독 해제 함수 타입
 */
export type Unsubscribe = () => void;

/**
 * 이벤트 리스너 타입
 */
export type EventListener<T = any> = (...args: T[]) => void | Promise<void>;

/**
 * 이벤트 맵 타입
 */
export type EventMap = Record<string, any[]>;

/**
 * 타입 안전한 이벤트 이미터 인터페이스
 */
export interface ITypedEventEmitter<TEvents extends EventMap> {
    on<K extends keyof TEvents>(
        event: K,
        listener: (...args: TEvents[K]) => void
    ): Unsubscribe;
    
    once<K extends keyof TEvents>(
        event: K,
        listener: (...args: TEvents[K]) => void
    ): Unsubscribe;
    
    off<K extends keyof TEvents>(
        event: K,
        listener: (...args: TEvents[K]) => void
    ): void;
    
    emit<K extends keyof TEvents>(
        event: K,
        ...args: TEvents[K]
    ): void;
    
    removeAllListeners(event?: keyof TEvents): void;
}

/**
 * 이벤트 이미터 어댑터 베이스 클래스
 */
export abstract class EventEmitterAdapter<TEvents extends EventMap> 
    implements ITypedEventEmitter<TEvents> {
    
    protected abstract emitter: any;
    
    on<K extends keyof TEvents>(
        event: K,
        listener: (...args: TEvents[K]) => void
    ): Unsubscribe {
        this.emitter.on(event as string, listener);
        return () => this.emitter.off(event as string, listener);
    }
    
    once<K extends keyof TEvents>(
        event: K,
        listener: (...args: TEvents[K]) => void
    ): Unsubscribe {
        const wrapper = (...args: TEvents[K]) => {
            listener(...args);
            this.off(event, wrapper);
        };
        return this.on(event, wrapper);
    }
    
    off<K extends keyof TEvents>(
        event: K,
        listener: (...args: TEvents[K]) => void
    ): void {
        this.emitter.off(event as string, listener);
    }
    
    emit<K extends keyof TEvents>(
        event: K,
        ...args: TEvents[K]
    ): void {
        this.emitter.emit(event as string, ...args);
    }
    
    removeAllListeners(event?: keyof TEvents): void {
        if (event) {
            this.emitter.removeAllListeners(event as string);
        } else {
            this.emitter.removeAllListeners();
        }
    }
}

/**
 * 이벤트 매니저 - 글로벌 이벤트 관리
 */
export class EventManager {
    private static instance: EventManager;
    private eventEmitters = new Map<string, ITypedEventEmitter<any>>();
    
    static getInstance(): EventManager {
        if (!EventManager.instance) {
            EventManager.instance = new EventManager();
        }
        return EventManager.instance;
    }
    
    register(id: string, emitter: ITypedEventEmitter<any>): void {
        this.eventEmitters.set(id, emitter);
    }
    
    unregister(id: string): void {
        const emitter = this.eventEmitters.get(id);
        if (emitter) {
            emitter.removeAllListeners();
            this.eventEmitters.delete(id);
        }
    }
    
    get(id: string): ITypedEventEmitter<any> | undefined {
        return this.eventEmitters.get(id);
    }
    
    dispose(): void {
        for (const emitter of this.eventEmitters.values()) {
            emitter.removeAllListeners();
        }
        this.eventEmitters.clear();
    }
}