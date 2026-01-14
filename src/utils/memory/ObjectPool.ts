/**
 * ObjectPool - Phase 4 Performance Optimization
 *
 * 재사용 가능한 객체 풀 구현
 * - 가비지 컬렉션 압력 감소
 * - 메모리 할당/해제 오버헤드 감소
 * - 예측 가능한 메모리 사용량
 */

export interface PoolOptions<T> {
    factory: () => T;
    reset: (obj: T) => void;
    validate?: (obj: T) => boolean;
    minSize?: number;
    maxSize?: number;
    growthStrategy?: 'linear' | 'exponential';
    shrinkStrategy?: 'aggressive' | 'conservative';
    idleTimeout?: number;
}

export interface PoolStats {
    available: number;
    inUse: number;
    total: number;
    created: number;
    destroyed: number;
    reused: number;
    hitRate: number;
}

export class ObjectPool<T> {
    private available: T[] = [];
    private inUse = new Set<T>();
    private readonly factory: () => T;
    private readonly reset: (obj: T) => void;
    private readonly validate?: (obj: T) => boolean;
    private readonly minSize: number;
    private readonly maxSize: number;
    private readonly growthStrategy: 'linear' | 'exponential';
    private readonly shrinkStrategy: 'aggressive' | 'conservative';
    private readonly idleTimeout: number;

    private stats = {
        created: 0,
        destroyed: 0,
        reused: 0,
        acquires: 0,
    };

    private shrinkTimer?: number;
    private lastShrinkTime = Date.now();

    constructor(options: PoolOptions<T>) {
        this.factory = options.factory;
        this.reset = options.reset;
        this.validate = options.validate;
        this.minSize = options.minSize || 5;
        this.maxSize = options.maxSize || 100;
        this.growthStrategy = options.growthStrategy || 'linear';
        this.shrinkStrategy = options.shrinkStrategy || 'conservative';
        this.idleTimeout = options.idleTimeout || 60000; // 1분

        // 초기 객체 생성
        this.preallocate();

        // 주기적인 크기 조정
        this.scheduleShrink();
    }

    /**
     * 풀에서 객체 획득
     */
    acquire(): T {
        this.stats.acquires++;

        // 사용 가능한 객체 찾기
        let obj = this.findAvailableObject();

        if (!obj) {
            // 새 객체 생성
            obj = this.createObject();
        } else {
            this.stats.reused++;
        }

        this.inUse.add(obj);
        return obj;
    }

    /**
     * 객체를 풀로 반환
     */
    release(obj: T): void {
        if (!this.inUse.has(obj)) {
            console.warn('Attempting to release object not from pool');
            return;
        }

        this.inUse.delete(obj);

        // 객체 초기화
        try {
            this.reset(obj);

            // 유효성 검사
            if (this.validate && !this.validate(obj)) {
                this.destroyObject(obj);
                return;
            }

            // 풀 크기 제한 확인
            if (this.available.length < this.maxSize) {
                this.available.push(obj);
            } else {
                this.destroyObject(obj);
            }
        } catch (error) {
            console.error('Error resetting object:', error);
            this.destroyObject(obj);
        }
    }

    /**
     * 여러 객체 한번에 획득
     */
    acquireBatch(count: number): T[] {
        const batch: T[] = [];

        for (let i = 0; i < count; i++) {
            batch.push(this.acquire());
        }

        return batch;
    }

    /**
     * 여러 객체 한번에 반환
     */
    releaseBatch(objects: T[]): void {
        objects.forEach((obj) => this.release(obj));
    }

    /**
     * 사용 가능한 객체 찾기
     */
    private findAvailableObject(): T | null {
        while (this.available.length > 0) {
            const obj = this.available.pop()!;

            // 유효성 검사
            if (!this.validate || this.validate(obj)) {
                return obj;
            }

            // 유효하지 않은 객체 제거
            this.destroyObject(obj);
        }

        return null;
    }

    /**
     * 새 객체 생성
     */
    private createObject(): T {
        const obj = this.factory();
        this.stats.created++;
        return obj;
    }

    /**
     * 객체 제거
     */
    private destroyObject(obj: T): void {
        // 객체가 IDisposable 인터페이스를 구현하는 경우
        const disposable = obj as { dispose?: () => void };
        if (typeof disposable.dispose === 'function') {
            disposable.dispose();
        }

        this.stats.destroyed++;
    }

    /**
     * 초기 객체 사전 할당
     */
    private preallocate(): void {
        for (let i = 0; i < this.minSize; i++) {
            this.available.push(this.createObject());
        }
    }

    /**
     * 풀 크기 증가
     */
    private grow(): void {
        const currentSize = this.available.length + this.inUse.size;

        if (currentSize >= this.maxSize) return;

        let growthAmount: number;

        if (this.growthStrategy === 'exponential') {
            growthAmount = Math.min(currentSize, this.maxSize - currentSize);
        } else {
            growthAmount = Math.min(this.minSize, this.maxSize - currentSize);
        }

        for (let i = 0; i < growthAmount; i++) {
            this.available.push(this.createObject());
        }
    }

    /**
     * 풀 크기 축소
     */
    private shrink(): void {
        const currentSize = this.available.length + this.inUse.size;

        if (currentSize <= this.minSize) return;

        const now = Date.now();
        const timeSinceLastShrink = now - this.lastShrinkTime;

        // 너무 자주 축소하지 않도록
        if (timeSinceLastShrink < this.idleTimeout) return;

        let shrinkAmount: number;

        if (this.shrinkStrategy === 'aggressive') {
            // 사용하지 않는 모든 객체 제거 (최소 크기까지)
            shrinkAmount = Math.max(0, this.available.length - this.minSize);
        } else {
            // 절반만 제거
            shrinkAmount = Math.floor(this.available.length / 2);
        }

        for (let i = 0; i < shrinkAmount; i++) {
            const obj = this.available.pop();
            if (obj) {
                this.destroyObject(obj);
            }
        }

        this.lastShrinkTime = now;
    }

    /**
     * 주기적인 크기 조정 스케줄
     */
    private scheduleShrink(): void {
        this.shrinkTimer = window.setInterval(() => {
            if (this.available.length > this.minSize) {
                this.shrink();
            }
        }, this.idleTimeout);
    }

    /**
     * 풀 초기화
     */
    clear(): void {
        // 사용 중인 객체 경고
        if (this.inUse.size > 0) {
            console.warn(`Clearing pool with ${this.inUse.size} objects still in use`);
        }

        // 모든 객체 제거
        [...this.available, ...this.inUse].forEach((obj) => {
            this.destroyObject(obj);
        });

        this.available = [];
        this.inUse.clear();

        // 최소 크기로 재생성
        this.preallocate();
    }

    /**
     * 통계 반환
     */
    getStats(): PoolStats {
        const total = this.available.length + this.inUse.size;
        const hitRate = this.stats.acquires > 0 ? this.stats.reused / this.stats.acquires : 0;

        return {
            available: this.available.length,
            inUse: this.inUse.size,
            total,
            created: this.stats.created,
            destroyed: this.stats.destroyed,
            reused: this.stats.reused,
            hitRate,
        };
    }

    /**
     * 풀 정리
     */
    destroy(): void {
        if (this.shrinkTimer) {
            clearInterval(this.shrinkTimer);
        }

        this.clear();
    }
}

/**
 * 타입별 풀 매니저
 */
export class PoolManager {
    // Using any here to allow heterogeneous pool types under one registry
    // without complex type gymnastics.
    private static pools = new Map<string, ObjectPool<any>>();

    /**
     * 풀 등록
     */
    static register<T>(name: string, options: PoolOptions<T>): ObjectPool<T> {
        if (this.pools.has(name)) {
            console.warn(`Pool '${name}' already exists`);
            return this.pools.get(name)! as ObjectPool<T>;
        }

        const pool = new ObjectPool(options);
        this.pools.set(name, pool);
        return pool;
    }

    /**
     * 풀 가져오기
     */
    static get<T>(name: string): ObjectPool<T> | undefined {
        return this.pools.get(name) as ObjectPool<T> | undefined;
    }

    /**
     * 풀 제거
     */
    static unregister(name: string): void {
        const pool = this.pools.get(name);
        if (pool) {
            pool.destroy();
            this.pools.delete(name);
        }
    }

    /**
     * 모든 풀 통계
     */
    static getAllStats(): Record<string, PoolStats> {
        const stats: Record<string, PoolStats> = {};

        this.pools.forEach((pool, name) => {
            stats[name] = pool.getStats();
        });

        return stats;
    }

    /**
     * 모든 풀 정리
     */
    static destroyAll(): void {
        this.pools.forEach((pool) => pool.destroy());
        this.pools.clear();
    }
}

/**
 * 일반적인 객체 풀 사전 정의
 */

// ArrayBuffer 풀
export const bufferPool = new ObjectPool<ArrayBuffer>({
    factory: () => new ArrayBuffer(1024 * 1024), // 1MB
    reset: (buffer) => {
        // ArrayBuffer는 리셋 불가, 새 뷰로 덮어쓰기만 가능
        new Uint8Array(buffer).fill(0);
    },
    minSize: 5,
    maxSize: 20,
});

// Object 풀
export const objectPool = new ObjectPool<Record<string, unknown>>({
    factory: () => ({}),
    reset: (obj) => {
        // 모든 속성 제거
        for (const key in obj) {
            delete obj[key];
        }
    },
    minSize: 10,
    maxSize: 100,
});

// Array 풀
export const arrayPool = new ObjectPool<unknown[]>({
    factory: () => [],
    reset: (arr) => {
        arr.length = 0;
    },
    minSize: 10,
    maxSize: 50,
});

// Map 풀
export const mapPool = new ObjectPool<Map<unknown, unknown>>({
    factory: () => new Map(),
    reset: (map) => {
        map.clear();
    },
    minSize: 5,
    maxSize: 30,
});

// Set 풀
export const setPool = new ObjectPool<Set<unknown>>({
    factory: () => new Set(),
    reset: (set) => {
        set.clear();
    },
    minSize: 5,
    maxSize: 30,
});
