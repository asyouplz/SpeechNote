/**
 * Phase 3 API 인터페이스 정의
 * 
 * 이 파일은 Phase 3 UX 개선을 위한 모든 API 인터페이스를 정의합니다.
 */

// ============================================================================
// 설정 관리 API
// ============================================================================

/**
 * 설정 스키마
 */
export interface SettingsSchema {
    version: string;
    general: GeneralSettings;
    api: ApiSettings;
    audio: AudioSettings;
    advanced: AdvancedSettings;
    shortcuts: ShortcutSettings;
    [key: string]: unknown;
}

export interface GeneralSettings {
    language: LanguageCode;
    theme: 'light' | 'dark' | 'auto';
    autoSave: boolean;
    saveInterval: number; // milliseconds
    notifications: {
        enabled: boolean;
        sound: boolean;
        position: NotificationPosition;
    };
}

export interface ApiSettings {
    provider: 'openai' | 'azure' | 'custom';
    endpoint?: string;
    model: string;
    maxTokens: number;
    temperature: number;
    apiKey?: string; // 암호화된 상태로만 저장
}

export interface AudioSettings {
    format: 'mp3' | 'm4a' | 'wav' | 'webm';
    quality: 'low' | 'medium' | 'high' | 'lossless';
    sampleRate: 8000 | 16000 | 22050 | 44100 | 48000;
    channels: 1 | 2;
    language: string;
    enhanceAudio: boolean;
}

export interface AdvancedSettings {
    cache: {
        enabled: boolean;
        maxSize: number; // bytes
        ttl: number; // milliseconds
    };
    performance: {
        maxConcurrency: number;
        chunkSize: number; // bytes
        timeout: number; // milliseconds
        useWebWorkers: boolean;
    };
    debug: {
        enabled: boolean;
        logLevel: 'error' | 'warn' | 'info' | 'debug';
        saveLogsToFile: boolean;
    };
}

export interface ShortcutSettings {
    startTranscription: string;
    stopTranscription: string;
    pauseTranscription: string;
    openSettings: string;
    openFilePicker: string;
}

/**
 * 설정 관리 API
 */
export interface ISettingsAPI {
    // 설정 조회
    get<K extends keyof SettingsSchema>(key: K): Promise<SettingsSchema[K]>;
    getAll(): Promise<SettingsSchema>;
    getDefault<K extends keyof SettingsSchema>(key: K): SettingsSchema[K];
    
    // 설정 저장
    set<K extends keyof SettingsSchema>(key: K, value: SettingsSchema[K]): Promise<void>;
    update(updates: Partial<SettingsSchema>): Promise<void>;
    
    // 설정 검증
    validate(settings: Partial<SettingsSchema>): ValidationResult;
    validateField<K extends keyof SettingsSchema>(key: K, value: SettingsSchema[K]): ValidationResult;
    
    // 설정 마이그레이션
    migrate(fromVersion: string, toVersion: string): Promise<void>;
    needsMigration(): boolean;
    
    // 설정 내보내기/가져오기
    export(options?: ExportOptions): Promise<Blob>;
    import(file: File, options?: ImportOptions): Promise<ImportResult>;
    
    // 설정 초기화
    reset(scope?: ResetScope): Promise<void>;
    
    // 이벤트 리스너
    on(event: string, listener: (...args: unknown[]) => void): Unsubscribe;
}

// 설정 관련 타입
export type LanguageCode = 'en' | 'ko' | 'ja' | 'zh' | 'es' | 'fr' | 'de' | 'auto';
export type ResetScope = 'all' | keyof SettingsSchema | Array<keyof SettingsSchema>;
export type SettingsChangeListener = (
    key: string,
    newValue: unknown,
    oldValue: unknown
) => void;
export type Unsubscribe = () => void;

export interface ExportOptions {
    includeApiKeys?: boolean;
    compress?: boolean;
    encrypt?: boolean;
    password?: string;
}

export interface ImportOptions {
    merge?: boolean;
    overwrite?: boolean;
    validate?: boolean;
    password?: string;
}

export interface ImportResult {
    success: boolean;
    imported: Partial<SettingsSchema>;
    errors?: string[];
    warnings?: string[];
}

export interface ValidationResult {
    valid: boolean;
    errors?: ValidationError[];
    warnings?: ValidationWarning[];
}

export interface ValidationError {
    field: string;
    message: string;
    code: string;
}

export interface ValidationWarning {
    field: string;
    message: string;
    suggestion?: string;
}

// ============================================================================
// 진행 상태 API
// ============================================================================

/**
 * 작업 옵션
 */
export interface TaskOptions {
    priority?: TaskPriority;
    cancellable?: boolean;
    timeout?: number;
    retryOptions?: RetryOptions;
    metadata?: Record<string, unknown>;
}

export type TaskPriority = 'low' | 'normal' | 'high' | 'critical';

export interface RetryOptions {
    maxAttempts: number;
    delay: number;
    maxDelay: number;
    backoff: 'linear' | 'exponential';
    shouldRetry?: (error: unknown, attempt: number) => boolean;
}

/**
 * 작업 상태
 */
export interface TaskStatus {
    id: string;
    name: string;
    status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
    progress: number;
    message?: string;
    startTime?: number;
    endTime?: number;
    eta?: number;
    error?: Error;
    result?: unknown;
}

/**
 * 진행률 데이터
 */
export interface ProgressData {
    taskId: string;
    overall: number;
    current: number;
    total: number;
    percentage?: number;
    message?: string;
    eta?: number;
    speed?: number;
    steps?: StepProgress[];
}

export interface StepProgress {
    id: string;
    name: string;
    progress: number;
    status: 'pending' | 'running' | 'completed' | 'failed';
    message?: string;
}

/**
 * 진행 상태 API
 */
export interface IProgressAPI {
    // 작업 시작
    startTask(taskId: string, name: string, options?: TaskOptions): IProgressTracker;
    
    // 작업 제어
    pauseTask(taskId: string): Promise<void>;
    resumeTask(taskId: string): Promise<void>;
    cancelTask(taskId: string): Promise<void>;
    
    // 상태 조회
    getTaskStatus(taskId: string): TaskStatus | undefined;
    getAllTasks(): TaskStatus[];
    getActiveTasks(): TaskStatus[];
    getQueuedTasks(): TaskStatus[];
    
    // 작업 정리
    clearCompleted(): void;
    clearAll(): void;
    
    // 이벤트 리스너
    on(event: 'task:start', listener: (taskId: string) => void): Unsubscribe;
    on(event: 'task:complete', listener: (taskId: string, result: unknown) => void): Unsubscribe;
    on(event: 'task:error', listener: (taskId: string, error: Error) => void): Unsubscribe;
    on(event: 'task:cancel', listener: (taskId: string) => void): Unsubscribe;
}

/**
 * 진행률 추적기
 */
export interface IProgressTracker {
    // 진행률 업데이트
    update(progress: number, message?: string): void;
    updateStep(stepId: string, progress: number, message?: string): void;
    increment(delta?: number): void;
    
    // 상태 변경
    setStatus(status: 'running' | 'paused' | 'completed' | 'failed'): void;
    setMessage(message: string): void;
    setTotal(total: number): void;
    
    // 단계 관리
    addStep(stepId: string, name: string, weight?: number): void;
    completeStep(stepId: string): void;
    failStep(stepId: string, error?: Error): void;
    
    // ETA 및 속도
    getETA(): number | undefined;
    getRemainingTime(): number | undefined;
    getSpeed(): number | undefined;
    getElapsedTime(): number;
    
    // 이벤트 리스너
    on(event: 'progress', listener: (data: ProgressData) => void): Unsubscribe;
    on(event: 'complete', listener: (result?: unknown) => void): Unsubscribe;
    on(event: 'error', listener: (error: Error) => void): Unsubscribe;
    on(event: 'pause', listener: () => void): Unsubscribe;
    on(event: 'resume', listener: () => void): Unsubscribe;
    
    // 제어
    pause(): void;
    resume(): void;
    cancel(): void;
}

// ============================================================================
// 알림 시스템 API
// ============================================================================

/**
 * 알림 옵션
 */
export interface NotificationOptions {
    type: NotificationType;
    title?: string;
    message: string;
    duration?: number; // 0 = 자동으로 닫히지 않음
    position?: NotificationPosition;
    closable?: boolean;
    icon?: boolean | string;
    sound?: boolean | string;
    actions?: NotificationAction[];
    progress?: number;
    persistent?: boolean;
    priority?: NotificationPriority;
    metadata?: Record<string, unknown>;
}

export type NotificationType = 'success' | 'error' | 'warning' | 'info';
export type NotificationPosition = 
    | 'top-right' 
    | 'top-left' 
    | 'bottom-right' 
    | 'bottom-left' 
    | 'top-center' 
    | 'bottom-center';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface NotificationAction {
    label: string;
    callback: () => void | Promise<void>;
    style?: 'primary' | 'secondary' | 'danger' | 'link';
    closeOnClick?: boolean;
}

/**
 * 알림 설정
 */
export interface NotificationConfig {
    defaultPosition?: NotificationPosition;
    defaultDuration?: number;
    maxNotifications?: number;
    soundEnabled?: boolean;
    stackNotifications?: boolean;
    animationDuration?: number;
    rateLimit?: {
        maxPerMinute?: number;
        maxPerType?: Record<NotificationType, number>;
    };
}

/**
 * 확인 대화상자 옵션
 */
export interface ConfirmOptions {
    title?: string;
    confirmText?: string;
    cancelText?: string;
    confirmStyle?: 'primary' | 'danger';
    defaultAction?: 'confirm' | 'cancel';
}

/**
 * 입력 대화상자 옵션
 */
export interface PromptOptions extends ConfirmOptions {
    defaultValue?: string;
    placeholder?: string;
    validator?: (value: string) => boolean | string;
    multiline?: boolean;
}

/**
 * 진행률 알림 옵션
 */
export interface ProgressNotificationOptions extends NotificationOptions {
    showPercentage?: boolean;
    showETA?: boolean;
    showSpeed?: boolean;
    updateInterval?: number;
    progress?: number;
}

/**
 * 진행률 알림 인터페이스
 */
export interface IProgressNotification {
    update(progress: number, message?: string): void;
    complete(message?: string): void;
    error(message: string): void;
    close(): void;
}

/**
 * 알림 시스템 API
 */
export interface INotificationAPI {
    // 기본 알림
    show(options: NotificationOptions): string;
    success(message: string, options?: Partial<NotificationOptions>): string;
    error(message: string, options?: Partial<NotificationOptions>): string;
    warning(message: string, options?: Partial<NotificationOptions>): string;
    info(message: string, options?: Partial<NotificationOptions>): string;
    
    // 알림 제어
    dismiss(notificationId: string): void;
    dismissAll(): void;
    dismissByType(type: NotificationType): void;
    update(notificationId: string, options: Partial<NotificationOptions>): void;
    
    // 대화상자
    confirm(message: string, options?: ConfirmOptions): Promise<boolean>;
    prompt(message: string, options?: PromptOptions): Promise<string | null>;
    alert(message: string, title?: string): Promise<void>;
    
    // 진행률 알림
    showProgress(
        message: string,
        options?: ProgressNotificationOptions
    ): IProgressNotification;
    
    // 설정
    configure(config: NotificationConfig): void;
    getConfig(): NotificationConfig;
    setDefaultPosition(position: NotificationPosition): void;
    setSound(enabled: boolean): void;
    setSoundFile(type: NotificationType, soundUrl: string): void;
    
    // 상태 조회
    getActiveNotifications(): NotificationOptions[];
    getNotificationById(id: string): NotificationOptions | undefined;
    
    // 이벤트 리스너
    on(event: 'show', listener: (notification: NotificationOptions) => void): Unsubscribe;
    on(event: 'dismiss', listener: (id: string) => void): Unsubscribe;
    on(event: 'action', listener: (id: string, action: string) => void): Unsubscribe;
}

// ============================================================================
// 메모리 관리 API
// ============================================================================

/**
 * 메모리 정보
 */
export interface MemoryInfo {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
    usage: number; // percentage
}

/**
 * 리소스 정보
 */
export interface ResourceInfo {
    timers: number;
    intervals: number;
    listeners: number;
    observers: number;
    disposables: number;
}

/**
 * 메모리 관리 API
 */
export interface IMemoryAPI {
    // 모니터링
    startMonitoring(interval?: number): void;
    stopMonitoring(): void;
    getMemoryInfo(): MemoryInfo;
    getResourceInfo(): ResourceInfo;
    
    // 임계치 설정
    setThreshold(bytes: number): void;
    setWarningLevel(percentage: number): void;
    
    // 정리
    forceGarbageCollection(): void;
    clearCache(): void;
    clearUnusedResources(): void;
    
    // 이벤트 리스너
    on(event: 'high-memory', listener: (info: MemoryInfo) => void): Unsubscribe;
    on(event: 'memory-leak', listener: (details: unknown) => void): Unsubscribe;
}

// ============================================================================
// 비동기 작업 관리 API
// ============================================================================

/**
 * 비동기 작업 옵션
 */
export interface AsyncTaskOptions {
    priority?: TaskPriority;
    timeout?: number;
    cancellable?: boolean;
    retryable?: boolean;
    retryOptions?: RetryOptions;
}

/**
 * 비동기 작업 API
 */
export interface IAsyncAPI {
    // 작업 실행
    execute<T>(
        taskId: string,
        taskFn: (progress?: IProgressReporter) => Promise<T>,
        options?: AsyncTaskOptions
    ): Promise<T>;
    
    // 동시성 제어
    setConcurrency(max: number): void;
    getConcurrency(): number;
    getQueueSize(): number;
    
    // 작업 제어
    cancel(taskId: string): void;
    cancelAll(): void;
    pause(taskId: string): void;
    resume(taskId: string): void;
    
    // 작업 조회
    isRunning(taskId: string): boolean;
    getRunningTasks(): string[];
    getQueuedTasks(): string[];
}

/**
 * 진행률 리포터
 */
export interface IProgressReporter {
    report(progress: number, message?: string): void;
    reportStep(step: string, progress: number): void;
}

// ============================================================================
// 공통 타입
// ============================================================================

/**
 * 이벤트 이미터 인터페이스
 */
export interface IEventEmitter<T extends Record<string, unknown[]>> {
    on<K extends keyof T>(event: K, listener: (...args: T[K]) => void): Unsubscribe;
    once<K extends keyof T>(event: K, listener: (...args: T[K]) => void): Unsubscribe;
    off<K extends keyof T>(event: K, listener: (...args: T[K]) => void): void;
    emit<K extends keyof T>(event: K, ...args: T[K]): void;
    removeAllListeners(event?: keyof T): void;
}

/**
 * Disposable 인터페이스
 */
export interface IDisposable {
    dispose(): void;
    isDisposed(): boolean;
}

/**
 * 취소 토큰
 */
export interface ICancellationToken {
    isCancelled(): boolean;
    cancel(): void;
    onCancelled(callback: () => void): void;
}

// ============================================================================
// 팩토리 함수
// ============================================================================

/**
 * API 인스턴스 생성 팩토리
 */
export interface IAPIFactory {
    createSettingsAPI(): ISettingsAPI;
    createProgressAPI(): IProgressAPI;
    createNotificationAPI(): INotificationAPI;
    createMemoryAPI(): IMemoryAPI;
    createAsyncAPI(): IAsyncAPI;
}

/**
 * 싱글톤 API 매니저
 */
export interface IAPIManager {
    settings: ISettingsAPI;
    progress: IProgressAPI;
    notifications: INotificationAPI;
    memory: IMemoryAPI;
    async: IAsyncAPI;
    
    initialize(): Promise<void>;
    dispose(): void;
}
