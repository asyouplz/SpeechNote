/**
 * UI 이벤트 핸들러
 * - 파일 선택 이벤트
 * - 드래그 앤 드롭 이벤트
 * - 검증 실패 이벤트
 * - 진행 상태 이벤트
 */
export class EventHandlers {
    private eventListeners: Map<string, Set<Function>> = new Map();
    private eventHistory: EventHistoryEntry[] = [];
    private readonly MAX_HISTORY_SIZE = 100;

    constructor() {
        this.initializeEventTypes();
    }

    /**
     * 이벤트 타입 초기화
     */
    private initializeEventTypes() {
        const eventTypes = [
            'file:selected',
            'file:removed',
            'file:validated',
            'file:validation-failed',
            'drag:enter',
            'drag:leave',
            'drag:over',
            'drag:drop',
            'progress:start',
            'progress:update',
            'progress:complete',
            'progress:error',
            'modal:open',
            'modal:close',
            'error:occurred'
        ];

        eventTypes.forEach(type => {
            this.eventListeners.set(type, new Set());
        });
    }

    /**
     * 이벤트 리스너 등록
     */
    on(eventType: string, callback: Function): () => void {
        if (!this.eventListeners.has(eventType)) {
            this.eventListeners.set(eventType, new Set());
        }
        
        this.eventListeners.get(eventType)!.add(callback);
        
        // 언등록 함수 반환
        return () => {
            this.off(eventType, callback);
        };
    }

    /**
     * 이벤트 리스너 제거
     */
    off(eventType: string, callback: Function) {
        const listeners = this.eventListeners.get(eventType);
        if (listeners) {
            listeners.delete(callback);
        }
    }

    /**
     * 한 번만 실행되는 이벤트 리스너
     */
    once(eventType: string, callback: Function): () => void {
        const wrapper = (...args: any[]) => {
            callback(...args);
            this.off(eventType, wrapper);
        };
        
        return this.on(eventType, wrapper);
    }

    /**
     * 이벤트 발생
     */
    emit(eventType: string, data?: any) {
        // 이벤트 기록
        this.recordEvent(eventType, data);
        
        // 리스너 실행
        const listeners = this.eventListeners.get(eventType);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event handler for ${eventType}:`, error);
                    this.emit('error:occurred', {
                        originalEvent: eventType,
                        error: error
                    });
                }
            });
        }
    }

    /**
     * 이벤트 기록
     */
    private recordEvent(eventType: string, data: any) {
        this.eventHistory.push({
            type: eventType,
            data: data,
            timestamp: Date.now()
        });
        
        // 히스토리 크기 제한
        if (this.eventHistory.length > this.MAX_HISTORY_SIZE) {
            this.eventHistory.shift();
        }
    }

    /**
     * 파일 선택 이벤트 처리
     */
    handleFileSelection(file: any) {
        this.emit('file:selected', {
            file: file,
            timestamp: Date.now()
        });
    }

    /**
     * 파일 제거 이벤트 처리
     */
    handleFileRemoval(file: any) {
        this.emit('file:removed', {
            file: file,
            timestamp: Date.now()
        });
    }

    /**
     * 파일 검증 성공 이벤트
     */
    handleValidationSuccess(file: any, validation: any) {
        this.emit('file:validated', {
            file: file,
            validation: validation,
            timestamp: Date.now()
        });
    }

    /**
     * 파일 검증 실패 이벤트
     */
    handleValidationFailure(file: any, errors: string[]) {
        this.emit('file:validation-failed', {
            file: file,
            errors: errors,
            timestamp: Date.now()
        });
    }

    /**
     * 드래그 이벤트 설정
     */
    setupDragEvents(element: HTMLElement, handlers: DragEventHandlers) {
        // 드래그 진입
        element.addEventListener('dragenter', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            this.emit('drag:enter', { event: e });
            
            if (handlers.onDragEnter) {
                handlers.onDragEnter(e);
            }
        });

        // 드래그 떠남
        element.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            this.emit('drag:leave', { event: e });
            
            if (handlers.onDragLeave) {
                handlers.onDragLeave(e);
            }
        });

        // 드래그 오버
        element.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            this.emit('drag:over', { event: e });
            
            if (handlers.onDragOver) {
                handlers.onDragOver(e);
            }
        });

        // 드롭
        element.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const files = this.extractFilesFromDragEvent(e);
            
            this.emit('drag:drop', { 
                event: e,
                files: files 
            });
            
            if (handlers.onDrop) {
                handlers.onDrop(e, files);
            }
        });
    }

    /**
     * 드래그 이벤트에서 파일 추출
     */
    private extractFilesFromDragEvent(e: DragEvent): File[] {
        const files: File[] = [];
        
        if (e.dataTransfer?.files) {
            for (let i = 0; i < e.dataTransfer.files.length; i++) {
                files.push(e.dataTransfer.files[i]);
            }
        }
        
        return files;
    }

    /**
     * 진행 상태 이벤트
     */
    emitProgress(progress: number, message?: string) {
        this.emit('progress:update', {
            progress: progress,
            message: message,
            timestamp: Date.now()
        });
    }

    /**
     * 진행 시작
     */
    startProgress(message?: string) {
        this.emit('progress:start', {
            message: message,
            timestamp: Date.now()
        });
    }

    /**
     * 진행 완료
     */
    completeProgress(message?: string) {
        this.emit('progress:complete', {
            message: message,
            timestamp: Date.now()
        });
    }

    /**
     * 진행 중 에러
     */
    errorProgress(error: any, message?: string) {
        this.emit('progress:error', {
            error: error,
            message: message,
            timestamp: Date.now()
        });
    }

    /**
     * 키보드 이벤트 설정
     */
    setupKeyboardShortcuts(element: HTMLElement, shortcuts: KeyboardShortcuts) {
        element.addEventListener('keydown', (e) => {
            const key = this.getKeyCombo(e);
            
            if (shortcuts[key]) {
                e.preventDefault();
                shortcuts[key](e);
            }
        });
    }

    /**
     * 키 조합 생성
     */
    private getKeyCombo(e: KeyboardEvent): string {
        const parts: string[] = [];
        
        if (e.ctrlKey) parts.push('Ctrl');
        if (e.metaKey) parts.push('Cmd');
        if (e.altKey) parts.push('Alt');
        if (e.shiftKey) parts.push('Shift');
        
        parts.push(e.key);
        
        return parts.join('+');
    }

    /**
     * 모든 리스너 제거
     */
    removeAllListeners(eventType?: string) {
        if (eventType) {
            this.eventListeners.get(eventType)?.clear();
        } else {
            this.eventListeners.forEach(listeners => listeners.clear());
        }
    }

    /**
     * 이벤트 히스토리 가져오기
     */
    getEventHistory(eventType?: string): EventHistoryEntry[] {
        if (eventType) {
            return this.eventHistory.filter(entry => entry.type === eventType);
        }
        return [...this.eventHistory];
    }

    /**
     * 이벤트 히스토리 초기화
     */
    clearEventHistory() {
        this.eventHistory = [];
    }

    /**
     * 디바운스된 이벤트 핸들러 생성
     */
    debounce<T extends (...args: any[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void {
        let timeout: NodeJS.Timeout | null = null;
        
        return (...args: Parameters<T>) => {
            if (timeout) {
                clearTimeout(timeout);
            }
            timeout = setTimeout(() => func(...args), wait);
        };
    }

    /**
     * 쓰로틀된 이벤트 핸들러 생성
     */
    throttle<T extends (...args: any[]) => void>(func: T, limit: number): (...args: Parameters<T>) => void {
        let inThrottle = false;
        
        return (...args: Parameters<T>) => {
            if (!inThrottle) {
                func(...args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

// 타입 정의
interface EventHistoryEntry {
    type: string;
    data: any;
    timestamp: number;
}

interface DragEventHandlers {
    onDragEnter?: (e: DragEvent) => void;
    onDragLeave?: (e: DragEvent) => void;
    onDragOver?: (e: DragEvent) => void;
    onDrop?: (e: DragEvent, files: File[]) => void;
}

interface KeyboardShortcuts {
    [key: string]: (e: KeyboardEvent) => void;
}

// 이벤트 타입 정의
export type FileEvent = {
    file: any;
    timestamp: number;
};

export type ValidationEvent = {
    file: any;
    validation?: any;
    errors?: string[];
    timestamp: number;
};

export type ProgressEvent = {
    progress?: number;
    message?: string;
    error?: any;
    timestamp: number;
};

export type DragDropEvent = {
    event: DragEvent;
    files?: File[];
};
