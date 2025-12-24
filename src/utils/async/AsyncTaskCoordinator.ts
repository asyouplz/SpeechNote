/**
 * 비동기 작업 조정자
 * - 동시성 제어
 * - 작업 취소 관리
 * - 진행률 추적
 * - 우선순위 큐
 */

import { 
    CancellablePromise, 
    Semaphore,
    withTimeout,
    retryAsync
} from './AsyncManager';
import { EventEmitter } from 'events';

/**
 * 작업 옵션
 */
export interface TaskOptions {
    priority?: number;
    timeout?: number;
    retryCount?: number;
    retryDelay?: number;
    cancellable?: boolean;
    metadata?: Record<string, unknown>;
}

/**
 * 작업 상태
 */
export enum TaskStatus {
    PENDING = 'pending',
    RUNNING = 'running',
    COMPLETED = 'completed',
    FAILED = 'failed',
    CANCELLED = 'cancelled'
}

/**
 * 작업 결과
 */
export interface TaskResult<T> {
    taskId: string;
    status: TaskStatus;
    result?: T;
    error?: Error;
    duration?: number;
    metadata?: Record<string, unknown>;
}

/**
 * 진행률 리포터
 */
export class ProgressReporter extends EventEmitter {
    private progress = 0;
    private message = '';
    private subTasks: Map<string, number> = new Map();

    constructor(private taskId: string) {
        super();
    }

    /**
     * 진행률 업데이트
     */
    update(progress: number, message?: string): void {
        this.progress = Math.min(100, Math.max(0, progress));
        if (message) {
            this.message = message;
        }

        this.emit('progress', {
            taskId: this.taskId,
            progress: this.progress,
            message: this.message,
            timestamp: Date.now()
        });
    }

    /**
     * 서브태스크 진행률 업데이트
     */
    updateSubTask(subTaskId: string, progress: number): void {
        this.subTasks.set(subTaskId, progress);
        
        // Calculate overall progress
        if (this.subTasks.size > 0) {
            const total = Array.from(this.subTasks.values()).reduce((a, b) => a + b, 0);
            const average = total / this.subTasks.size;
            this.update(average);
        }
    }

    /**
     * 메시지 설정
     */
    setMessage(message: string): void {
        this.message = message;
        this.emit('message', {
            taskId: this.taskId,
            message: this.message,
            timestamp: Date.now()
        });
    }

    /**
     * 현재 진행률 가져오기
     */
    getProgress(): number {
        return this.progress;
    }

    /**
     * 완료 처리
     */
    complete(): void {
        this.update(100, 'Completed');
        this.emit('complete', {
            taskId: this.taskId,
            timestamp: Date.now()
        });
    }
}

/**
 * 취소 토큰
 */
export class CancellationToken {
    private cancelled = false;
    private callbacks: Set<() => void> = new Set();
    private reason?: string;

    /**
     * 취소 여부 확인
     */
    isCancelled(): boolean {
        return this.cancelled;
    }

    /**
     * 취소 처리
     */
    cancel(reason?: string): void {
        if (this.cancelled) return;

        this.cancelled = true;
        this.reason = reason;

        // Execute callbacks
        this.callbacks.forEach(callback => {
            try {
                callback();
            } catch (error) {
                console.error('Error in cancellation callback:', error);
            }
        });

        this.callbacks.clear();
    }

    /**
     * 취소 시 콜백 등록
     */
    onCancelled(callback: () => void): () => void {
        if (this.cancelled) {
            // Already cancelled, execute immediately
            callback();
            return () => {};
        }

        this.callbacks.add(callback);
        return () => this.callbacks.delete(callback);
    }

    /**
     * 취소 이유 가져오기
     */
    getReason(): string | undefined {
        return this.reason;
    }

    /**
     * 취소 확인 및 예외 발생
     */
    throwIfCancelled(): void {
        if (this.cancelled) {
            throw new CancellationError(this.reason || 'Task was cancelled');
        }
    }
}

/**
 * 취소 에러
 */
export class CancellationError extends Error {
    constructor(message = 'Task was cancelled') {
        super(message);
        this.name = 'CancellationError';
    }
}

/**
 * 비동기 작업
 */
class AsyncTask<T> {
    private status: TaskStatus = TaskStatus.PENDING;
    private startTime?: number;
    private endTime?: number;
    private result?: T;
    private error?: Error;
    private cancellablePromise?: CancellablePromise<T>;

    constructor(
        public readonly id: string,
        private taskFn: (progress: ProgressReporter, token: CancellationToken) => Promise<T>,
        private options: TaskOptions = {}
    ) {}

    /**
     * 작업 실행
     */
    async run(
        progressReporter: ProgressReporter,
        cancellationToken: CancellationToken
    ): Promise<T> {
        if (this.status !== TaskStatus.PENDING) {
            throw new Error(`Task ${this.id} has already been executed`);
        }

        this.status = TaskStatus.RUNNING;
        this.startTime = Date.now();

        try {
            // Check cancellation before starting
            cancellationToken.throwIfCancelled();

            // Create cancellable promise
            this.cancellablePromise = new CancellablePromise<T>(
                async (resolve, reject, _signal) => {
                    try {
                        // Setup cancellation handler
                        const unsubscribe = cancellationToken.onCancelled(() => {
                            reject(new CancellationError());
                        });

                        // Execute task with retry logic
                        let result: T;
                        
                        if (this.options.retryCount && this.options.retryCount > 0) {
                            result = await retryAsync(
                                () => this.executeTask(progressReporter, cancellationToken),
                                {
                                    maxAttempts: this.options.retryCount,
                                    delay: this.options.retryDelay || 1000,
                                    shouldRetry: (error) => {
                                        // Don't retry on cancellation
                                        return !(error instanceof CancellationError);
                                    }
                                }
                            );
                        } else {
                            result = await this.executeTask(progressReporter, cancellationToken);
                        }

                        // Cleanup
                        unsubscribe();
                        resolve(result);

                    } catch (error) {
                        reject(error);
                    }
                }
            );

            // Apply timeout if specified
            let promise: Promise<T> = this.cancellablePromise as unknown as Promise<T>;
            
            if (this.options.timeout) {
                promise = withTimeout(
                    promise,
                    this.options.timeout,
                    new Error(`Task ${this.id} timed out after ${this.options.timeout}ms`)
                );
            }

            // Wait for result
            this.result = await promise;
            this.status = TaskStatus.COMPLETED;
            progressReporter.complete();

            return this.result;

        } catch (error) {
            if (error instanceof CancellationError) {
                this.status = TaskStatus.CANCELLED;
            } else {
                this.status = TaskStatus.FAILED;
                this.error = error as Error;
            }
            throw error;

        } finally {
            this.endTime = Date.now();
        }
    }

    /**
     * 실제 작업 실행
     */
    private async executeTask(
        progressReporter: ProgressReporter,
        cancellationToken: CancellationToken
    ): Promise<T> {
        return await this.taskFn(progressReporter, cancellationToken);
    }

    /**
     * 작업 취소
     */
    cancel(): void {
        if (this.cancellablePromise && this.status === TaskStatus.RUNNING) {
            this.cancellablePromise.cancel();
            this.status = TaskStatus.CANCELLED;
        }
    }

    /**
     * 작업 상태 가져오기
     */
    getStatus(): TaskStatus {
        return this.status;
    }

    /**
     * 작업 결과 가져오기
     */
    getResult(): TaskResult<T> {
        return {
            taskId: this.id,
            status: this.status,
            result: this.result,
            error: this.error,
            duration: this.endTime && this.startTime
                ? this.endTime - this.startTime
                : undefined,
            metadata: this.options.metadata
        };
    }
}

/**
 * 동시성 관리자
 */
export class ConcurrencyManager {
    private semaphore: Semaphore;
    private priorityQueue: PriorityQueue<() => void>;
    private activeCount = 0;

    constructor(private maxConcurrency: number = 3) {
        this.semaphore = new Semaphore(maxConcurrency);
        this.priorityQueue = new PriorityQueue();
    }

    /**
     * 슬롯 획득
     */
    async acquire(priority = 0): Promise<void> {
        return new Promise((resolve) => {
            this.priorityQueue.enqueue(resolve, priority);
            this.processQueue();
        });
    }

    /**
     * 슬롯 반환
     */
    release(): void {
        this.semaphore.release();
        this.activeCount--;
        this.processQueue();
    }

    /**
     * 큐 처리
     */
    private async processQueue(): Promise<void> {
        while (!this.priorityQueue.isEmpty() && this.activeCount < this.maxConcurrency) {
            const task = this.priorityQueue.dequeue();
            if (task) {
                this.activeCount++;
                await this.semaphore.acquire();
                task();
            }
        }
    }

    /**
     * 활성 작업 수
     */
    getActiveCount(): number {
        return this.activeCount;
    }

    /**
     * 대기 중인 작업 수
     */
    getPendingCount(): number {
        return this.priorityQueue.size();
    }
}

/**
 * 우선순위 큐
 */
class PriorityQueue<T> {
    private heap: Array<{ priority: number; item: T }> = [];

    enqueue(item: T, priority = 0): void {
        this.heap.push({ priority, item });
        this.bubbleUp(this.heap.length - 1);
    }

    dequeue(): T | undefined {
        if (this.heap.length === 0) return undefined;

        const result = this.heap[0];
        const end = this.heap.pop()!;

        if (this.heap.length > 0) {
            this.heap[0] = end;
            this.sinkDown(0);
        }

        return result.item;
    }

    isEmpty(): boolean {
        return this.heap.length === 0;
    }

    size(): number {
        return this.heap.length;
    }

    private bubbleUp(index: number): void {
        const element = this.heap[index];

        while (index > 0) {
            const parentIndex = Math.floor((index - 1) / 2);
            const parent = this.heap[parentIndex];

            if (element.priority <= parent.priority) break;

            this.heap[index] = parent;
            index = parentIndex;
        }

        this.heap[index] = element;
    }

    private sinkDown(index: number): void {
        const element = this.heap[index];
        const length = this.heap.length;

        let searching = true;
        while (searching) {
            const leftChildIndex = 2 * index + 1;
            const rightChildIndex = 2 * index + 2;
            let swap = -1;

            if (leftChildIndex < length) {
                const leftChild = this.heap[leftChildIndex];
                if (leftChild.priority > element.priority) {
                    swap = leftChildIndex;
                }
            }

            if (rightChildIndex < length) {
                const rightChild = this.heap[rightChildIndex];
                if (rightChild.priority > element.priority &&
                    rightChild.priority > this.heap[leftChildIndex].priority) {
                    swap = rightChildIndex;
                }
            }

            if (swap === -1) {
                searching = false;
                continue;
            }

            this.heap[index] = this.heap[swap];
            index = swap;
        }

        this.heap[index] = element;
    }
}

/**
 * 비동기 작업 조정자
 */
export class AsyncTaskCoordinator extends EventEmitter {
    private tasks: Map<string, AsyncTask<unknown>> = new Map();
    private concurrencyManager: ConcurrencyManager;
    private cancellationTokens: Map<string, CancellationToken> = new Map();
    private progressReporters: Map<string, ProgressReporter> = new Map();
    private taskCounter = 0;

    constructor(maxConcurrency = 3) {
        super();
        this.concurrencyManager = new ConcurrencyManager(maxConcurrency);
    }

    /**
     * 작업 실행
     */
    async execute<T>(
        taskFn: (progress: ProgressReporter, token: CancellationToken) => Promise<T>,
        options: TaskOptions = {}
    ): Promise<TaskResult<T>> {
        const taskId = this.generateTaskId();

        // Wait for slot
        await this.concurrencyManager.acquire(options.priority || 0);

        // Create task components
        const cancellationToken = new CancellationToken();
        const progressReporter = new ProgressReporter(taskId);
        const task = new AsyncTask(taskId, taskFn, options);

        // Store references
        this.tasks.set(taskId, task);
        this.cancellationTokens.set(taskId, cancellationToken);
        this.progressReporters.set(taskId, progressReporter);

        // Setup event forwarding
        this.setupEventForwarding(taskId, progressReporter);

        try {
            // Emit task started event
            this.emit('taskStarted', {
                taskId,
                metadata: options.metadata,
                timestamp: Date.now()
            });

            // Run task
            await task.run(progressReporter, cancellationToken);

            // Emit task completed event
            const taskResult = task.getResult();
            this.emit('taskCompleted', taskResult);

            return taskResult;

        } catch (error) {
            // Emit task failed/cancelled event
            const taskResult = task.getResult();
            
            if (error instanceof CancellationError) {
                this.emit('taskCancelled', taskResult);
            } else {
                this.emit('taskFailed', taskResult);
            }

            throw error;

        } finally {
            // Cleanup
            this.cleanup(taskId);
            this.concurrencyManager.release();
        }
    }

    /**
     * 작업 취소
     */
    cancel(taskId: string, reason?: string): boolean {
        const token = this.cancellationTokens.get(taskId);
        const task = this.tasks.get(taskId);

        if (token && task) {
            token.cancel(reason);
            task.cancel();
            return true;
        }

        return false;
    }

    /**
     * 모든 작업 취소
     */
    cancelAll(reason?: string): void {
        this.cancellationTokens.forEach((token, taskId) => {
            this.cancel(taskId, reason);
        });
    }

    /**
     * 작업 상태 가져오기
     */
    getTaskStatus(taskId: string): TaskStatus | undefined {
        const task = this.tasks.get(taskId);
        return task?.getStatus();
    }

    /**
     * 모든 작업 상태 가져오기
     */
    getAllTaskStatuses(): Map<string, TaskStatus> {
        const statuses = new Map<string, TaskStatus>();
        
        this.tasks.forEach((task, id) => {
            statuses.set(id, task.getStatus());
        });

        return statuses;
    }

    /**
     * 진행률 가져오기
     */
    getProgress(taskId: string): number | undefined {
        const reporter = this.progressReporters.get(taskId);
        return reporter?.getProgress();
    }

    /**
     * 통계 가져오기
     */
    getStatistics(): {
        total: number;
        running: number;
        completed: number;
        failed: number;
        cancelled: number;
        pending: number;
    } {
        const stats = {
            total: this.tasks.size,
            running: 0,
            completed: 0,
            failed: 0,
            cancelled: 0,
            pending: 0
        };

        this.tasks.forEach(task => {
            const status = task.getStatus();
            switch (status) {
                case TaskStatus.RUNNING:
                    stats.running++;
                    break;
                case TaskStatus.COMPLETED:
                    stats.completed++;
                    break;
                case TaskStatus.FAILED:
                    stats.failed++;
                    break;
                case TaskStatus.CANCELLED:
                    stats.cancelled++;
                    break;
                case TaskStatus.PENDING:
                    stats.pending++;
                    break;
            }
        });

        return stats;
    }

    /**
     * 작업 ID 생성
     */
    private generateTaskId(): string {
        return `task-${++this.taskCounter}-${Date.now()}`;
    }

    /**
     * 이벤트 전달 설정
     */
    private setupEventForwarding(taskId: string, progressReporter: ProgressReporter): void {
        progressReporter.on('progress', (data) => {
            this.emit('progress', data);
        });

        progressReporter.on('message', (data) => {
            this.emit('message', data);
        });

        progressReporter.on('complete', (data) => {
            this.emit('complete', data);
        });
    }

    /**
     * 정리
     */
    private cleanup(taskId: string): void {
        // Remove references
        this.tasks.delete(taskId);
        this.cancellationTokens.delete(taskId);
        
        // Remove progress reporter and its listeners
        const progressReporter = this.progressReporters.get(taskId);
        if (progressReporter) {
            progressReporter.removeAllListeners();
            this.progressReporters.delete(taskId);
        }
    }

    /**
     * 모든 리소스 정리
     */
    dispose(): void {
        // Cancel all running tasks
        this.cancelAll('Coordinator is being disposed');

        // Clear all references
        this.tasks.clear();
        this.cancellationTokens.clear();
        this.progressReporters.clear();

        // Remove all event listeners
        this.removeAllListeners();
    }
}
