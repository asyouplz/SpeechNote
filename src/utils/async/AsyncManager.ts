/**
 * 비동기 작업 관리 유틸리티
 * - Promise 체이닝 개선
 * - 취소 가능한 Promise
 * - 동시성 제어
 * - 재시도 로직
 */

/**
 * 취소 가능한 Promise 래퍼
 */
export class CancellablePromise<T> {
    private promise: Promise<T>;
    private cancelled = false;
    private abortController: AbortController;
    private onCancel?: () => void;

    constructor(
        executor: (
            resolve: (value: T) => void,
            reject: (reason?: any) => void,
            signal: AbortSignal
        ) => void,
        onCancel?: () => void
    ) {
        this.abortController = new AbortController();
        this.onCancel = onCancel;

        this.promise = new Promise<T>((resolve, reject) => {
            executor(
                (value) => {
                    if (!this.cancelled) {
                        resolve(value);
                    }
                },
                (reason) => {
                    if (!this.cancelled) {
                        reject(reason);
                    }
                },
                this.abortController.signal
            );
        });
    }

    /**
     * Promise 실행
     */
    then<TResult1 = T, TResult2 = never>(
        onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
        onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
    ): Promise<TResult1 | TResult2> {
        return this.promise.then(onfulfilled, onrejected);
    }

    /**
     * 에러 처리
     */
    catch<TResult = never>(
        onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null
    ): Promise<T | TResult> {
        return this.promise.catch(onrejected);
    }

    /**
     * Finally 처리
     */
    finally(onfinally?: (() => void) | undefined | null): Promise<T> {
        return this.promise.finally(onfinally);
    }

    /**
     * 작업 취소
     */
    cancel(): void {
        if (!this.cancelled) {
            this.cancelled = true;
            this.abortController.abort();
            this.onCancel?.();
        }
    }

    /**
     * 취소 여부 확인
     */
    isCancelled(): boolean {
        return this.cancelled;
    }
}

/**
 * 동시성 제어를 위한 세마포어
 */
export class Semaphore {
    private permits: number;
    private waitQueue: Array<() => void> = [];

    constructor(permits: number) {
        this.permits = permits;
    }

    /**
     * 허가 획득
     */
    async acquire(): Promise<void> {
        if (this.permits > 0) {
            this.permits--;
            return Promise.resolve();
        }

        return new Promise<void>((resolve) => {
            this.waitQueue.push(resolve);
        });
    }

    /**
     * 허가 반환
     */
    release(): void {
        this.permits++;
        
        if (this.waitQueue.length > 0 && this.permits > 0) {
            this.permits--;
            const resolve = this.waitQueue.shift();
            resolve?.();
        }
    }

    /**
     * 세마포어를 사용한 작업 실행
     */
    async execute<T>(fn: () => Promise<T>): Promise<T> {
        await this.acquire();
        try {
            return await fn();
        } finally {
            this.release();
        }
    }
}

/**
 * 재시도 옵션
 */
export interface RetryOptions {
    maxAttempts?: number;
    delay?: number;
    maxDelay?: number;
    backoff?: 'linear' | 'exponential';
    shouldRetry?: (error: any, attempt: number) => boolean;
    onRetry?: (error: any, attempt: number) => void;
}

/**
 * 재시도 가능한 비동기 작업
 */
export async function retryAsync<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const {
        maxAttempts = 3,
        delay = 1000,
        maxDelay = 30000,
        backoff = 'exponential',
        shouldRetry = () => true,
        onRetry
    } = options;

    let lastError: any;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            if (attempt === maxAttempts || !shouldRetry(error, attempt)) {
                throw error;
            }

            onRetry?.(error, attempt);

            const currentDelay = backoff === 'exponential'
                ? Math.min(delay * Math.pow(2, attempt - 1), maxDelay)
                : delay;

            await sleep(currentDelay);
        }
    }

    throw lastError;
}

/**
 * 타임아웃이 있는 Promise
 */
export function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutError?: Error
): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) => {
            setTimeout(() => {
                reject(timeoutError || new Error(`Operation timed out after ${timeoutMs}ms`));
            }, timeoutMs);
        })
    ]);
}

/**
 * 디바운스된 비동기 함수
 */
export function debounceAsync<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    delay: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
    let timeoutId: number | null = null;
    let lastPromise: Promise<ReturnType<T>> | null = null;

    return (...args: Parameters<T>): Promise<ReturnType<T>> => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        lastPromise = new Promise((resolve, reject) => {
            timeoutId = window.setTimeout(async () => {
                try {
                    const result = await fn(...args);
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            }, delay);
        });

        return lastPromise;
    };
}

/**
 * 쓰로틀된 비동기 함수
 */
export function throttleAsync<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    limit: number
): (...args: Parameters<T>) => Promise<ReturnType<T> | void> {
    let inThrottle = false;
    let lastResult: ReturnType<T>;

    return async (...args: Parameters<T>): Promise<ReturnType<T> | void> => {
        if (!inThrottle) {
            inThrottle = true;
            
            try {
                lastResult = await fn(...args);
                return lastResult;
            } finally {
                setTimeout(() => {
                    inThrottle = false;
                }, limit);
            }
        }
        
        return lastResult;
    };
}

/**
 * Promise 배치 처리
 */
export async function batchPromises<T>(
    items: T[],
    batchSize: number,
    processor: (item: T) => Promise<any>
): Promise<any[]> {
    const results: any[] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(processor));
        results.push(...batchResults);
    }
    
    return results;
}

/**
 * Promise 순차 처리
 */
export async function sequentialPromises<T, R>(
    items: T[],
    processor: (item: T, index: number) => Promise<R>
): Promise<R[]> {
    const results: R[] = [];
    
    for (let i = 0; i < items.length; i++) {
        results.push(await processor(items[i], i));
    }
    
    return results;
}

/**
 * Promise 파이프라인
 */
export class PromisePipeline<T> {
    private value: Promise<T>;

    constructor(initial: T | Promise<T>) {
        this.value = Promise.resolve(initial);
    }

    /**
     * 변환 적용
     */
    pipe<R>(fn: (value: T) => R | Promise<R>): PromisePipeline<R> {
        const newValue = this.value.then(fn);
        return new PromisePipeline(newValue);
    }

    /**
     * 조건부 변환
     */
    pipeIf<R>(
        condition: boolean | ((value: T) => boolean | Promise<boolean>),
        fn: (value: T) => R | Promise<R>
    ): PromisePipeline<T | R> {
        const newValue = this.value.then(async (value) => {
            const shouldApply = typeof condition === 'function'
                ? await condition(value)
                : condition;
            
            return shouldApply ? await fn(value) : value;
        });
        
        return new PromisePipeline(newValue);
    }

    /**
     * 에러 처리
     */
    catch(fn: (error: any) => T | Promise<T>): PromisePipeline<T> {
        const newValue = this.value.catch(fn);
        return new PromisePipeline(newValue);
    }

    /**
     * 최종 값 반환
     */
    async resolve(): Promise<T> {
        return this.value;
    }
}

/**
 * Sleep 유틸리티
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Promise 결과 래핑
 */
export type PromiseResult<T> = 
    | { status: 'fulfilled'; value: T }
    | { status: 'rejected'; reason: any };

/**
 * 모든 Promise 결과 수집 (실패 포함)
 */
export async function allSettled<T>(
    promises: Promise<T>[]
): Promise<PromiseResult<T>[]> {
    return Promise.allSettled(promises).then(results =>
        results.map(result => {
            if (result.status === 'fulfilled') {
                return { status: 'fulfilled', value: result.value };
            } else {
                return { status: 'rejected', reason: result.reason };
            }
        })
    );
}

/**
 * 비동기 작업 큐
 */
export class AsyncQueue<T> {
    private queue: Array<() => Promise<T>> = [];
    private running = false;
    private concurrency: number;
    private active = 0;

    constructor(concurrency: number = 1) {
        this.concurrency = concurrency;
    }

    /**
     * 작업 추가
     */
    add(task: () => Promise<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            this.queue.push(async () => {
                try {
                    const result = await task();
                    resolve(result);
                    return result;
                } catch (error) {
                    reject(error);
                    throw error;
                }
            });

            if (!this.running) {
                this.run();
            }
        });
    }

    /**
     * 큐 실행
     */
    private async run(): Promise<void> {
        this.running = true;

        while (this.queue.length > 0 && this.active < this.concurrency) {
            const task = this.queue.shift();
            if (task) {
                this.active++;
                task().finally(() => {
                    this.active--;
                    if (this.queue.length > 0) {
                        this.run();
                    } else if (this.active === 0) {
                        this.running = false;
                    }
                });
            }
        }

        if (this.queue.length === 0 && this.active === 0) {
            this.running = false;
        }
    }

    /**
     * 큐 클리어
     */
    clear(): void {
        this.queue = [];
    }

    /**
     * 큐 크기
     */
    size(): number {
        return this.queue.length;
    }
}