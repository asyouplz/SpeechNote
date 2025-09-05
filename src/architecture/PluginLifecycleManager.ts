import { Plugin, App, WorkspaceLeaf } from 'obsidian';
import { Logger } from '../infrastructure/logging/Logger';

/**
 * 플러그인 생명주기 단계 정의
 */
export enum LifecyclePhase {
    UNINITIALIZED = 'uninitialized',
    INITIALIZING = 'initializing',
    SERVICES_READY = 'services_ready',
    UI_READY = 'ui_ready',
    READY = 'ready',
    SHUTTING_DOWN = 'shutting_down',
    SHUTDOWN = 'shutdown'
}

/**
 * 초기화 작업 인터페이스
 */
export interface InitializationTask {
    name: string;
    phase: LifecyclePhase;
    priority: number;
    execute: () => Promise<void>;
    rollback?: () => Promise<void>;
    dependencies?: string[];
}

/**
 * 플러그인 생명주기 관리자
 * 플러그인의 초기화, 종료 과정을 체계적으로 관리
 */
export class PluginLifecycleManager {
    private currentPhase: LifecyclePhase = LifecyclePhase.UNINITIALIZED;
    private tasks: Map<string, InitializationTask> = new Map();
    private completedTasks: Set<string> = new Set();
    private logger: Logger;
    private cleanupHandlers: Array<() => Promise<void>> = [];

    constructor(
        private app: App,
        private plugin: Plugin
    ) {
        this.logger = new Logger('LifecycleManager');
    }

    /**
     * 현재 생명주기 단계 반환
     */
    public getCurrentPhase(): LifecyclePhase {
        return this.currentPhase;
    }

    /**
     * 초기화 작업 등록
     */
    public registerTask(task: InitializationTask): void {
        this.tasks.set(task.name, task);
        this.logger.debug(`Registered task: ${task.name} for phase ${task.phase}`);
    }

    /**
     * 정리 핸들러 등록
     */
    public registerCleanupHandler(handler: () => Promise<void>): void {
        this.cleanupHandlers.push(handler);
    }

    /**
     * 플러그인 초기화 실행
     */
    public async initialize(): Promise<void> {
        this.logger.info('Starting plugin initialization');
        this.currentPhase = LifecyclePhase.INITIALIZING;

        try {
            // Phase 1: Core Services
            await this.executePhase(LifecyclePhase.INITIALIZING);
            this.currentPhase = LifecyclePhase.SERVICES_READY;

            // Phase 2: UI Components (Workspace가 준비된 후)
            if (this.app.workspace.layoutReady) {
                await this.initializeUI();
            } else {
                this.app.workspace.onLayoutReady(async () => {
                    await this.initializeUI();
                });
            }

        } catch (error) {
            this.logger.error('Initialization failed', error instanceof Error ? error : undefined);
            await this.rollback();
            throw error;
        }
    }

    /**
     * UI 초기화
     */
    private async initializeUI(): Promise<void> {
        try {
            await this.executePhase(LifecyclePhase.UI_READY);
            this.currentPhase = LifecyclePhase.READY;
            this.logger.info('Plugin initialization completed');
        } catch (error) {
            this.logger.error('UI initialization failed', error instanceof Error ? error : undefined);
            // UI 실패는 전체 롤백하지 않고 graceful degradation
            this.handleUIInitializationError(error);
        }
    }

    /**
     * 특정 단계의 작업들 실행
     */
    private async executePhase(phase: LifecyclePhase): Promise<void> {
        const phaseTasks = Array.from(this.tasks.values())
            .filter(task => task.phase === phase)
            .sort((a, b) => a.priority - b.priority);

        for (const task of phaseTasks) {
            await this.executeTask(task);
        }
    }

    /**
     * 개별 작업 실행
     */
    private async executeTask(task: InitializationTask): Promise<void> {
        // 의존성 확인
        if (task.dependencies) {
            for (const dep of task.dependencies) {
                if (!this.completedTasks.has(dep)) {
                    throw new Error(`Task ${task.name} depends on ${dep} which is not completed`);
                }
            }
        }

        try {
            this.logger.debug(`Executing task: ${task.name}`);
            await task.execute();
            this.completedTasks.add(task.name);
            this.logger.debug(`Completed task: ${task.name}`);
        } catch (error) {
            this.logger.error(`Task ${task.name} failed`, error instanceof Error ? error : undefined);
            throw new TaskExecutionError(task.name, error);
        }
    }

    /**
     * UI 초기화 실패 처리
     */
    private handleUIInitializationError(error: any): void {
        this.logger.warn('UI initialization failed, running in degraded mode');
        // StatusBar나 SettingsTab 없이도 기본 기능은 동작하도록
        this.currentPhase = LifecyclePhase.READY;
    }

    /**
     * 초기화 롤백
     */
    private async rollback(): Promise<void> {
        this.logger.info('Rolling back initialization');
        
        const completedTasksList = Array.from(this.completedTasks)
            .reverse()
            .map(name => this.tasks.get(name))
            .filter(task => task && task.rollback);

        for (const task of completedTasksList) {
            if (task?.rollback) {
                try {
                    await task.rollback();
                    this.logger.debug(`Rolled back task: ${task.name}`);
                } catch (error) {
                    this.logger.error(`Failed to rollback task ${task.name}`, error instanceof Error ? error : undefined);
                }
            }
        }

        this.completedTasks.clear();
        this.currentPhase = LifecyclePhase.UNINITIALIZED;
    }

    /**
     * 플러그인 종료
     */
    public async shutdown(): Promise<void> {
        this.logger.info('Starting plugin shutdown');
        this.currentPhase = LifecyclePhase.SHUTTING_DOWN;

        // 정리 핸들러 실행
        for (const handler of this.cleanupHandlers.reverse()) {
            try {
                await handler();
            } catch (error) {
                this.logger.error('Cleanup handler failed', error instanceof Error ? error : undefined);
            }
        }

        // 초기화된 작업들 롤백
        await this.rollback();
        
        this.currentPhase = LifecyclePhase.SHUTDOWN;
        this.logger.info('Plugin shutdown completed');
    }

    /**
     * 작업이 실행 가능한지 확인
     */
    public canExecuteTask(taskName: string): boolean {
        const task = this.tasks.get(taskName);
        if (!task) return false;

        // 의존성 확인
        if (task.dependencies) {
            return task.dependencies.every(dep => this.completedTasks.has(dep));
        }

        return true;
    }

    /**
     * 특정 단계에 도달했는지 확인
     */
    public hasReachedPhase(phase: LifecyclePhase): boolean {
        const phaseOrder = [
            LifecyclePhase.UNINITIALIZED,
            LifecyclePhase.INITIALIZING,
            LifecyclePhase.SERVICES_READY,
            LifecyclePhase.UI_READY,
            LifecyclePhase.READY
        ];

        const currentIndex = phaseOrder.indexOf(this.currentPhase);
        const targetIndex = phaseOrder.indexOf(phase);

        return currentIndex >= targetIndex;
    }
}

/**
 * 작업 실행 에러
 */
export class TaskExecutionError extends Error {
    constructor(
        public taskName: string,
        public originalError: any
    ) {
        super(`Task ${taskName} failed: ${originalError?.message || originalError}`);
        this.name = 'TaskExecutionError';
    }
}