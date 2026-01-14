import { requestUrl } from 'obsidian';

/**
 * BatchRequestManager - Phase 4 Performance Optimization
 * 
 * API 요청 배치 처리를 통한 네트워크 최적화
 * - 여러 요청을 하나로 묶어 처리
 * - 네트워크 오버헤드 감소
 * - 서버 부하 감소
 */

export interface BatchRequest<T = unknown> {
    id: string;
    endpoint: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    params?: unknown;
    body?: unknown;
    headers?: Record<string, string>;
    priority: 'high' | 'normal' | 'low';
    resolve: (value: T) => void;
    reject: (error: Error) => void;
    timestamp: number;
    retries?: number;
}

export interface BatchOptions {
    maxBatchSize?: number;
    batchDelay?: number;
    maxRetries?: number;
    enableCompression?: boolean;
    priorityQueuing?: boolean;
}

export interface BatchResponse {
    id: string;
    success: boolean;
    data?: unknown;
    error?: string;
}

export interface BatchStats {
    totalRequests: number;
    batchedRequests: number;
    batches: number;
    averageBatchSize: number;
    networkSavings: number;
}

type AnyBatch = BatchRequest<unknown>;

export class BatchRequestManager {
    private queues = new Map<string, AnyBatch[]>();
    private timers = new Map<string, number>();
    private stats: BatchStats = {
        totalRequests: 0,
        batchedRequests: 0,
        batches: 0,
        averageBatchSize: 0,
        networkSavings: 0
    };
    
    private readonly maxBatchSize: number;
    private readonly batchDelay: number;
    private readonly maxRetries: number;
    private readonly enableCompression: boolean;
    private readonly priorityQueuing: boolean;

    constructor(options: BatchOptions = {}) {
        this.maxBatchSize = options.maxBatchSize ?? 10;
        this.batchDelay = options.batchDelay ?? 50;
        this.maxRetries = options.maxRetries ?? 3;
        this.enableCompression = options.enableCompression ?? false;
        this.priorityQueuing = options.priorityQueuing ?? true;
    }

    private normalizeError(error: unknown): Error {
        return error instanceof Error ? error : new Error('Unknown error');
    }

    /**
     * 요청을 배치 큐에 추가
     */
    addRequest<T>(
        endpoint: string,
        method: 'GET' | 'POST' | 'PUT' | 'DELETE',
        params?: unknown,
        options: {
            body?: unknown;
            headers?: Record<string, string>;
            priority?: 'high' | 'normal' | 'low';
        } = {}
    ): Promise<T> {
        return new Promise((resolve, reject) => {
            const request: AnyBatch = {
                id: this.generateRequestId(),
                endpoint,
                method,
                params,
                body: options.body,
                headers: options.headers,
                priority: options.priority || 'normal',
                resolve: (value: unknown) => resolve(value as T),
                reject,
                timestamp: Date.now(),
                retries: 0
            };

            this.enqueueRequest(request);
            this.stats.totalRequests++;
        });
    }

    /**
     * 요청을 큐에 추가하고 배치 처리 스케줄
     */
    private enqueueRequest(request: AnyBatch): void {
        const batchKey = this.getBatchKey(request);
        
        if (!this.queues.has(batchKey)) {
            this.queues.set(batchKey, []);
        }
        
        const queue = this.queues.get(batchKey)!;
        queue.push(request);

        // 우선순위 정렬
        if (this.priorityQueuing) {
            this.sortByPriority(queue);
        }

        // 배치 처리 스케줄
        this.scheduleBatch(batchKey);

        // 최대 크기 도달 시 즉시 처리
        if (queue.length >= this.maxBatchSize) {
            this.processBatchImmediately(batchKey);
        }
    }

    /**
     * 배치 처리 스케줄링
     */
    private scheduleBatch(batchKey: string): void {
        // 이미 스케줄된 경우 스킵
        if (this.timers.has(batchKey)) return;

        const timer = window.setTimeout(() => {
            void this.processBatch(batchKey);
            this.timers.delete(batchKey);
        }, this.batchDelay);

        this.timers.set(batchKey, timer);
    }

    /**
     * 즉시 배치 처리
     */
    private processBatchImmediately(batchKey: string): void {
        const timer = this.timers.get(batchKey);
        if (timer) {
            clearTimeout(timer);
            this.timers.delete(batchKey);
        }
        void this.processBatch(batchKey);
    }

    /**
     * 배치 처리 실행
     */
    private async processBatch(batchKey: string): Promise<void> {
        const queue = this.queues.get(batchKey);
        if (!queue || queue.length === 0) return;

        // 큐에서 배치 추출
        const batch = queue.splice(0, this.maxBatchSize);
        
        if (queue.length === 0) {
            this.queues.delete(batchKey);
        }

        try {
            // 배치 요청 전송
            const responses = await this.sendBatchRequest(batch);
            
            // 통계 업데이트
            this.updateStats(batch.length);

            // 응답 처리
            this.processBatchResponses(batch, responses);
        } catch (error) {
            // 배치 실패 시 재시도 또는 개별 처리
            this.handleBatchError(batch, this.normalizeError(error));
        }
    }

    /**
     * 배치 요청 전송
     */
    private async sendBatchRequest(batch: AnyBatch[]): Promise<BatchResponse[]> {
        const batchPayload = {
            requests: batch.map(req => ({
                id: req.id,
                method: req.method,
                endpoint: req.endpoint,
                params: req.params,
                body: req.body,
                headers: req.headers
            }))
        };

        // 압축 옵션
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'X-Batch-Request': 'true'
        };

        if (this.enableCompression) {
            headers['Content-Encoding'] = 'gzip';
        }

        const response = await requestUrl({
            url: '/api/batch',
            method: 'POST',
            headers,
            body: JSON.stringify(batchPayload)
        });

        if (response.status < 200 || response.status >= 300) {
            throw new Error(`Batch request failed with status ${response.status}`);
        }

        const data = response.json ?? (response.text ? JSON.parse(response.text) : {});
        return data.responses || [];
    }

    /**
     * 배치 응답 처리
     */
    private processBatchResponses(
        batch: AnyBatch[],
        responses: BatchResponse[]
    ): void {
        const responseMap = new Map(
            responses.map(res => [res.id, res])
        );

        batch.forEach(request => {
            const response = responseMap.get(request.id);
            
            if (!response) {
                request.reject(new Error('No response received'));
                return;
            }

            if (response.success) {
                request.resolve(response.data);
            } else {
                request.reject(new Error(response.error || 'Request failed'));
            }
        });
    }

    /**
     * 배치 에러 처리
     */
    private handleBatchError(batch: AnyBatch[], error: Error): void {
        batch.forEach(request => {
            if (request.retries! < this.maxRetries) {
                // 재시도
                request.retries!++;
                this.enqueueRequest(request);
            } else {
                // 최종 실패
                request.reject(error);
            }
        });
    }

    /**
     * 배치 키 생성 (같은 엔드포인트끼리 묶기)
     */
    private getBatchKey(request: AnyBatch): string {
        // 메서드와 엔드포인트 기준으로 그룹화
        const baseEndpoint = request.endpoint.split('?')[0];
        return `${request.method}:${baseEndpoint}`;
    }

    /**
     * 요청 ID 생성
     */
    private generateRequestId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 우선순위별 정렬
     */
    private sortByPriority(queue: BatchRequest<unknown>[]): void {
        const priorityOrder = { high: 0, normal: 1, low: 2 };
        
        queue.sort((a, b) => {
            const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
            if (priorityDiff !== 0) return priorityDiff;
            return a.timestamp - b.timestamp;
        });
    }

    /**
     * 통계 업데이트
     */
    private updateStats(batchSize: number): void {
        this.stats.batchedRequests += batchSize;
        this.stats.batches++;
        this.stats.averageBatchSize = 
            this.stats.batchedRequests / this.stats.batches;
        this.stats.networkSavings = 
            this.stats.batchedRequests - this.stats.batches;
    }

    /**
     * 통계 조회
     */
    getStats(): BatchStats {
        return { ...this.stats };
    }

    /**
     * 대기 중인 요청 수
     */
    getPendingCount(): number {
        let count = 0;
        for (const queue of this.queues.values()) {
            count += queue.length;
        }
        return count;
    }

    /**
     * 모든 대기 중인 요청 처리
     */
    async flush(): Promise<void> {
        const promises: Promise<void>[] = [];
        
        for (const batchKey of this.queues.keys()) {
            promises.push(this.processBatch(batchKey));
        }
        
        await Promise.all(promises);
    }

    /**
     * 정리
     */
    destroy(): void {
        // 타이머 정리
        for (const timer of this.timers.values()) {
            clearTimeout(timer);
        }
        this.timers.clear();
        
        // 대기 중인 요청 거부
        for (const queue of this.queues.values()) {
            queue.forEach(request => {
                request.reject(new Error('BatchRequestManager destroyed'));
            });
        }
        this.queues.clear();
    }
}

/**
 * 전역 배치 매니저 인스턴스
 */
export const batchManager = new BatchRequestManager({
    maxBatchSize: 10,
    batchDelay: 50,
    maxRetries: 3,
    enableCompression: true,
    priorityQueuing: true
});

/**
 * 배치 요청 헬퍼 함수
 */
export function batchRequest<T>(
    endpoint: string,
    options: {
        method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
        params?: unknown;
        body?: unknown;
        priority?: 'high' | 'normal' | 'low';
    } = {}
): Promise<T> {
    return batchManager.addRequest<T>(
        endpoint,
        options.method || 'GET',
        options.params,
        {
            body: options.body,
            priority: options.priority
        }
    );
}
