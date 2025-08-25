/**
 * 이벤트 매니저 - Observer 패턴을 활용한 중앙 이벤트 관리
 * 
 * 애플리케이션 전체의 이벤트를 관리하고 컴포넌트 간 통신을 담당합니다.
 */

import { EventEmitter, type EventMap, type EventListener, type Unsubscribe } from '../patterns/Observer';
import { SingletonDecorator } from '../patterns/Singleton';
import type { ILogger } from '../types';

/**
 * 애플리케이션 이벤트 맵 정의
 */
export interface AppEventMap extends EventMap {
    // Transcription 이벤트
    'transcription:start': { fileName: string; fileSize: number };
    'transcription:complete': { text: string; duration: number; autoInsert?: boolean; options?: any };
    'transcription:error': { error: Error; fileName?: string };
    'transcription:progress': { progress: number; message?: string };
    'transcription:cancelled': { fileName?: string };
    
    // Editor 이벤트
    'editor:changed': { editor: any };
    'editor:active': { view: any; editor: any };
    'editor:text-inserted': { text: string; position?: any; options?: any };
    'editor:text-replaced': { oldText: string; newText: string };
    'editor:note-created': { file: any; content: string };
    
    // Text 처리 이벤트
    'text:inserted': { text: string; options: any };
    'text:preview': { text: string; options: any };
    'text:formatted': { originalText: string; formattedText: string };
    
    // File 이벤트
    'file:selected': { file: any };
    'file:uploaded': { file: any; size: number };
    'file:validated': { file: any; valid: boolean; errors?: string[] };
    
    // Settings 이벤트
    'settings:changed': { key: string; value: any };
    'settings:loaded': { settings: any };
    'settings:saved': { settings: any };
    
    // State 이벤트
    'state:changed': { state: any; previousState: any };
    'state:error': { error: Error };
    
    // UI 이벤트
    'ui:modal-opened': { modalType: string };
    'ui:modal-closed': { modalType: string };
    'ui:notification': { message: string; type: 'info' | 'warning' | 'error' | 'success' };
    
    // Cache 이벤트
    'cache:hit': { key: string };
    'cache:miss': { key: string };
    'cache:cleared': {};
    
    // Network 이벤트
    'network:request-start': { url: string; method: string };
    'network:request-complete': { url: string; status: number };
    'network:request-error': { url: string; error: Error };
}

/**
 * 강화된 이벤트 매니저 클래스
 * Singleton 패턴 적용으로 전역적으로 단일 인스턴스 보장
 */
@SingletonDecorator
export class EventManager extends EventEmitter<AppEventMap> {
    private logger?: ILogger;
    private eventStats = new Map<keyof AppEventMap, number>();
    private eventHistory: EventHistoryEntry[] = [];
    private readonly maxHistorySize = 100;
    private isDebugMode = false;
    
    constructor(logger?: ILogger) {
        super();
        this.logger = logger;
    }
    
    /**
     * 이벤트 발생 (오버라이드 - 로깅 및 통계 추가)
     */
    emit<K extends keyof AppEventMap>(event: K, data: AppEventMap[K]): void {
        // 통계 업데이트
        this.updateStats(event);
        
        // 히스토리 기록
        this.recordHistory(event, data);
        
        // 디버그 로깅
        if (this.isDebugMode && this.logger) {
            this.logger.debug(`Event emitted: ${String(event)}`, data);
        }
        
        // 부모 클래스의 emit 호출
        super.emit(event, data);
    }
    
    /**
     * 비동기 이벤트 발생 (오버라이드)
     */
    async emitAsync<K extends keyof AppEventMap>(event: K, data: AppEventMap[K]): Promise<void> {
        // 통계 업데이트
        this.updateStats(event);
        
        // 히스토리 기록
        this.recordHistory(event, data);
        
        // 디버그 로깅
        if (this.isDebugMode && this.logger) {
            this.logger.debug(`Async event emitted: ${String(event)}`, data);
        }
        
        // 부모 클래스의 emitAsync 호출
        await super.emitAsync(event, data);
    }
    
    /**
     * 이벤트 리스너 등록 (타입 안전성 강화)
     */
    on<K extends keyof AppEventMap>(
        event: K, 
        listener: EventListener<AppEventMap[K]>
    ): Unsubscribe {
        if (this.isDebugMode && this.logger) {
            this.logger.debug(`Listener registered for: ${String(event)}`);
        }
        
        return super.on(event, listener);
    }
    
    /**
     * 일회성 이벤트 리스너 등록
     */
    once<K extends keyof AppEventMap>(
        event: K, 
        listener: EventListener<AppEventMap[K]>
    ): Unsubscribe {
        if (this.isDebugMode && this.logger) {
            this.logger.debug(`Once listener registered for: ${String(event)}`);
        }
        
        return super.once(event, listener);
    }
    
    /**
     * 이벤트 체인 생성
     */
    chain<K extends keyof AppEventMap, K2 extends keyof AppEventMap>(
        sourceEvent: K,
        targetEvent: K2,
        transformer?: (data: AppEventMap[K]) => AppEventMap[K2]
    ): Unsubscribe {
        return this.on(sourceEvent, (data) => {
            const transformedData = transformer ? transformer(data) : data as any;
            this.emit(targetEvent, transformedData);
        });
    }
    
    /**
     * 이벤트 필터링
     */
    filter<K extends keyof AppEventMap>(
        event: K,
        predicate: (data: AppEventMap[K]) => boolean,
        listener: EventListener<AppEventMap[K]>
    ): Unsubscribe {
        return this.on(event, (data) => {
            if (predicate(data)) {
                listener(data);
            }
        });
    }
    
    /**
     * 이벤트 디바운싱
     */
    debounce<K extends keyof AppEventMap>(
        event: K,
        wait: number,
        listener: EventListener<AppEventMap[K]>
    ): Unsubscribe {
        let timeoutId: ReturnType<typeof setTimeout> | null = null;
        
        return this.on(event, (data) => {
            if (timeoutId !== null) {
                clearTimeout(timeoutId);
            }
            
            timeoutId = setTimeout(() => {
                listener(data);
                timeoutId = null;
            }, wait);
        });
    }
    
    /**
     * 이벤트 쓰로틀링
     */
    throttle<K extends keyof AppEventMap>(
        event: K,
        limit: number,
        listener: EventListener<AppEventMap[K]>
    ): Unsubscribe {
        let inThrottle = false;
        
        return this.on(event, (data) => {
            if (!inThrottle) {
                listener(data);
                inThrottle = true;
                setTimeout(() => {
                    inThrottle = false;
                }, limit);
            }
        });
    }
    
    /**
     * 이벤트 통계 업데이트
     */
    private updateStats(event: keyof AppEventMap): void {
        const count = this.eventStats.get(event) || 0;
        this.eventStats.set(event, count + 1);
    }
    
    /**
     * 이벤트 히스토리 기록
     */
    private recordHistory<K extends keyof AppEventMap>(event: K, data: AppEventMap[K]): void {
        const entry: EventHistoryEntry = {
            event: String(event),
            data: this.isDebugMode ? data : undefined, // 디버그 모드에서만 데이터 저장
            timestamp: Date.now()
        };
        
        this.eventHistory.push(entry);
        
        // 히스토리 크기 제한
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory.shift();
        }
    }
    
    /**
     * 이벤트 통계 조회
     */
    getStats(): Map<keyof AppEventMap, number> {
        return new Map(this.eventStats);
    }
    
    /**
     * 이벤트 히스토리 조회
     */
    getHistory(): EventHistoryEntry[] {
        return [...this.eventHistory];
    }
    
    /**
     * 특정 이벤트의 통계 조회
     */
    getEventStats(event: keyof AppEventMap): number {
        return this.eventStats.get(event) || 0;
    }
    
    /**
     * 통계 초기화
     */
    clearStats(): void {
        this.eventStats.clear();
    }
    
    /**
     * 히스토리 초기화
     */
    clearHistory(): void {
        this.eventHistory = [];
    }
    
    /**
     * 디버그 모드 설정
     */
    setDebugMode(enabled: boolean): void {
        this.isDebugMode = enabled;
        if (this.logger) {
            this.logger.info(`Event manager debug mode: ${enabled ? 'enabled' : 'disabled'}`);
        }
    }
    
    /**
     * 이벤트 매니저 상태 조회
     */
    getStatus(): EventManagerStatus {
        return {
            totalEvents: this.eventNames().length,
            totalListeners: this.eventNames().reduce((sum, event) => 
                sum + this.listenerCount(event), 0
            ),
            totalEmitted: Array.from(this.eventStats.values()).reduce((sum, count) => 
                sum + count, 0
            ),
            debugMode: this.isDebugMode,
            historySize: this.eventHistory.length
        };
    }
    
    /**
     * 리소스 정리
     */
    destroy(): void {
        this.removeAllListeners();
        this.clearStats();
        this.clearHistory();
        
        if (this.logger) {
            this.logger.debug('EventManager destroyed');
        }
    }
}

/**
 * 이벤트 히스토리 엔트리
 */
interface EventHistoryEntry {
    event: string;
    data?: any;
    timestamp: number;
}

/**
 * 이벤트 매니저 상태
 */
interface EventManagerStatus {
    totalEvents: number;
    totalListeners: number;
    totalEmitted: number;
    debugMode: boolean;
    historySize: number;
}

/**
 * 전역 이벤트 매니저 인스턴스 생성 헬퍼
 */
export function createEventManager(logger?: ILogger): EventManager {
    return new EventManager(logger);
}