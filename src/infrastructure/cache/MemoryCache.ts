/**
 * MemoryCache - Phase 4 Performance Optimization
 *
 * LRU (Least Recently Used) 캐시 구현
 * - 메모리 효율적인 캐싱
 * - TTL (Time To Live) 지원
 * - 자동 만료 및 정리
 */

export interface CacheEntry<T> {
    data: T;
    timestamp: number;
    accessCount: number;
    size?: number;
}

export interface CacheOptions {
    maxSize?: number; // 최대 항목 수
    maxMemory?: number; // 최대 메모리 (bytes)
    ttl?: number; // Time To Live (ms)
    onEvict?: <T>(key: string, value: CacheEntry<T>) => void;
}

export interface CacheStats {
    hits: number;
    misses: number;
    evictions: number;
    size: number;
    memoryUsage: number;
    hitRate: number;
}

export class MemoryCache<T = unknown> {
    private cache = new Map<string, CacheEntry<T>>();
    private accessOrder: string[] = [];
    private stats: CacheStats = {
        hits: 0,
        misses: 0,
        evictions: 0,
        size: 0,
        memoryUsage: 0,
        hitRate: 0,
    };

    private readonly maxSize: number;
    private readonly maxMemory: number;
    private readonly ttl: number;
    private readonly onEvict?: <T>(key: string, value: CacheEntry<T>) => void;
    private cleanupInterval?: number;

    constructor(options: CacheOptions = {}) {
        this.maxSize = options.maxSize || 100;
        this.maxMemory = options.maxMemory || 10 * 1024 * 1024; // 10MB
        this.ttl = options.ttl || 5 * 60 * 1000; // 5분
        this.onEvict = options.onEvict;

        // 주기적인 만료 항목 정리
        this.startCleanup();
    }

    /**
     * 캐시에서 값 가져오기
     */
    get(key: string): T | undefined {
        const entry = this.cache.get(key);

        if (!entry) {
            this.stats.misses++;
            this.updateHitRate();
            return undefined;
        }

        // TTL 체크
        if (this.isExpired(entry)) {
            this.delete(key);
            this.stats.misses++;
            this.updateHitRate();
            return undefined;
        }

        // LRU 업데이트
        this.updateAccessOrder(key);
        entry.accessCount++;

        this.stats.hits++;
        this.updateHitRate();

        return entry.data;
    }

    /**
     * 캐시에 값 저장
     */
    set(key: string, data: T, _ttl?: number): void {
        const size = this.estimateSize(data);

        // 메모리 제한 체크
        if (size > this.maxMemory) {
            console.warn(`Cache entry too large: ${key} (${size} bytes)`);
            return;
        }

        // 기존 항목 삭제
        if (this.cache.has(key)) {
            this.delete(key);
        }

        // 공간 확보
        this.makeSpace(size);

        // 새 항목 추가
        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            accessCount: 0,
            size,
        };

        this.cache.set(key, entry);
        this.accessOrder.push(key);
        this.stats.size++;
        this.stats.memoryUsage += size;
    }

    /**
     * 캐시에서 값 삭제
     */
    delete(key: string): boolean {
        const entry = this.cache.get(key);
        if (!entry) return false;

        this.cache.delete(key);
        this.accessOrder = this.accessOrder.filter((k) => k !== key);

        this.stats.size--;
        this.stats.memoryUsage -= entry.size || 0;

        if (this.onEvict) {
            this.onEvict(key, entry);
        }

        return true;
    }

    /**
     * 캐시 전체 삭제
     */
    clear(): void {
        this.cache.clear();
        this.accessOrder = [];
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0,
            size: 0,
            memoryUsage: 0,
            hitRate: 0,
        };
    }

    /**
     * 패턴 매칭으로 캐시 무효화
     */
    invalidate(pattern: string | RegExp): number {
        let count = 0;
        const regex =
            typeof pattern === 'string' ? new RegExp(pattern.replace(/\*/g, '.*')) : pattern;

        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.delete(key);
                count++;
            }
        }

        return count;
    }

    /**
     * 캐시 키 존재 확인
     */
    has(key: string): boolean {
        const entry = this.cache.get(key);
        if (!entry) return false;

        if (this.isExpired(entry)) {
            this.delete(key);
            return false;
        }

        return true;
    }

    /**
     * 모든 캐시 키 반환
     */
    keys(): string[] {
        return Array.from(this.cache.keys());
    }

    /**
     * 캐시 통계 반환
     */
    getStats(): CacheStats {
        return { ...this.stats };
    }

    /**
     * 캐시 상태 덤프 (디버깅용)
     */
    dump(): Record<string, unknown> {
        const entries: Record<string, unknown> = {};

        for (const [key, entry] of this.cache.entries()) {
            entries[key] = {
                timestamp: entry.timestamp,
                accessCount: entry.accessCount,
                size: entry.size,
                age: Date.now() - entry.timestamp,
                data: entry.data,
            };
        }

        return {
            stats: this.getStats(),
            entries,
            config: {
                maxSize: this.maxSize,
                maxMemory: this.maxMemory,
                ttl: this.ttl,
            },
        };
    }

    /**
     * 공간 확보 (LRU 정책)
     */
    private makeSpace(requiredSize: number): void {
        // 크기 제한 체크
        while (this.cache.size >= this.maxSize) {
            this.evictLRU();
        }

        // 메모리 제한 체크
        while (this.stats.memoryUsage + requiredSize > this.maxMemory) {
            if (!this.evictLRU()) break;
        }
    }

    /**
     * LRU 항목 제거
     */
    private evictLRU(): boolean {
        if (this.accessOrder.length === 0) return false;

        const key = this.accessOrder[0];
        this.delete(key);
        this.stats.evictions++;

        return true;
    }

    /**
     * 접근 순서 업데이트
     */
    private updateAccessOrder(key: string): void {
        const index = this.accessOrder.indexOf(key);
        if (index > -1) {
            this.accessOrder.splice(index, 1);
        }
        this.accessOrder.push(key);
    }

    /**
     * 만료 여부 확인
     */
    private isExpired(entry: CacheEntry<T>): boolean {
        return Date.now() - entry.timestamp > this.ttl;
    }

    /**
     * 데이터 크기 추정
     */
    private estimateSize(data: unknown): number {
        try {
            const str = JSON.stringify(data);
            return str.length * 2; // UTF-16 기준
        } catch {
            return 1024; // 기본값 1KB
        }
    }

    /**
     * Hit rate 업데이트
     */
    private updateHitRate(): void {
        const total = this.stats.hits + this.stats.misses;
        this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
    }

    /**
     * 주기적인 만료 항목 정리
     */
    private startCleanup(): void {
        this.cleanupInterval = window.setInterval(() => {
            for (const [key, entry] of this.cache.entries()) {
                if (this.isExpired(entry)) {
                    this.delete(key);
                }
            }
        }, 60000); // 1분마다
    }

    /**
     * 정리 작업 중지
     */
    destroy(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.clear();
    }
}

/**
 * 전역 캐시 인스턴스
 */
export const globalCache = new MemoryCache({
    maxSize: 200,
    maxMemory: 20 * 1024 * 1024, // 20MB
    ttl: 10 * 60 * 1000, // 10분
});

/**
 * 캐시 데코레이터
 */
export function Cacheable(options: { ttl?: number; key?: string } = {}) {
    return function (target: object, propertyName: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: unknown[]) {
            const cacheKey =
                options.key || `${target.constructor.name}.${propertyName}:${JSON.stringify(args)}`;

            // 캐시 확인
            const cached = globalCache.get(cacheKey);
            if (cached !== undefined) {
                return cached;
            }

            // 원본 메서드 실행
            const result = await originalMethod.apply(this, args);

            // 결과 캐싱
            globalCache.set(cacheKey, result, options.ttl);

            return result;
        };

        return descriptor;
    };
}
