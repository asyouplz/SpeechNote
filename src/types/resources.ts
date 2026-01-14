/**
 * 통합 리소스 관리 타입 정의
 *
 * 메모리 관리와 리소스 해제를 위한 표준 패턴
 */

/**
 * Disposable 인터페이스 - 리소스 해제 패턴
 */
export interface IDisposable {
    dispose(): void | Promise<void>;
    readonly isDisposed: boolean;
}

/**
 * 리소스 관리자 인터페이스
 */
export interface IResourceManager {
    add<T extends IDisposable>(resource: T): T;
    remove(resource: IDisposable): boolean;
    disposeAll(): Promise<void>;
    readonly size: number;
}

/**
 * 자동 정리 가능한 베이스 클래스
 */
export abstract class AutoDisposable implements IDisposable {
    private _isDisposed = false;
    protected resourceManager: ResourceManager;

    constructor() {
        this.resourceManager = new ResourceManager();
    }

    get isDisposed(): boolean {
        return this._isDisposed;
    }

    /**
     * 리소스 추가 및 자동 관리
     */
    protected addResource<T extends IDisposable>(resource: T): T {
        return this.resourceManager.add(resource);
    }

    /**
     * 리소스 해제
     */
    async dispose(): Promise<void> {
        if (this._isDisposed) return;

        this._isDisposed = true;
        await this.onDispose();
        await this.resourceManager.disposeAll();
    }

    /**
     * 서브클래스에서 구현할 정리 로직
     */
    protected abstract onDispose(): void | Promise<void>;
}

/**
 * 리소스 매니저 구현
 */
export class ResourceManager implements IResourceManager {
    private resources = new Set<IDisposable>();

    add<T extends IDisposable>(resource: T): T {
        this.resources.add(resource);
        return resource;
    }

    remove(resource: IDisposable): boolean {
        return this.resources.delete(resource);
    }

    async disposeAll(): Promise<void> {
        const promises: Promise<void>[] = [];

        for (const resource of this.resources) {
            const result = resource.dispose();
            if (result instanceof Promise) {
                promises.push(result);
            }
        }

        await Promise.all(promises);
        this.resources.clear();
    }

    get size(): number {
        return this.resources.size;
    }
}

/**
 * WeakRef 기반 리소스 트래커
 */
export class WeakResourceTracker {
    private resources = new Map<string, WeakRef<IDisposable>>();
    private cleanupInterval: NodeJS.Timeout | null = null;

    constructor(cleanupIntervalMs = 60000) {
        this.startCleanup(cleanupIntervalMs);
    }

    track(id: string, resource: IDisposable): void {
        this.resources.set(id, new WeakRef(resource));
    }

    get(id: string): IDisposable | undefined {
        const ref = this.resources.get(id);
        if (!ref) return undefined;

        const resource = ref.deref();
        if (!resource) {
            this.resources.delete(id);
            return undefined;
        }

        return resource;
    }

    private startCleanup(intervalMs: number): void {
        this.cleanupInterval = setInterval(() => {
            for (const [id, ref] of this.resources) {
                if (!ref.deref()) {
                    this.resources.delete(id);
                }
            }
        }, intervalMs);
    }

    dispose(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        this.resources.clear();
    }
}

/**
 * 리소스 풀 - 재사용 가능한 리소스 관리
 */
export class ResourcePool<T extends IDisposable> {
    private available: T[] = [];
    private inUse = new Set<T>();

    constructor(private factory: () => T | Promise<T>, private maxSize = 10, private minSize = 2) {
        void this.initialize();
    }

    private async initialize(): Promise<void> {
        for (let i = 0; i < this.minSize; i++) {
            const resource = await this.factory();
            this.available.push(resource);
        }
    }

    async acquire(): Promise<T> {
        let resource = this.available.pop();

        if (!resource) {
            if (this.inUse.size < this.maxSize) {
                resource = await this.factory();
            } else {
                // 대기 로직 구현 필요
                throw new Error('Resource pool exhausted');
            }
        }

        this.inUse.add(resource);
        return resource;
    }

    release(resource: T): void {
        if (this.inUse.delete(resource)) {
            if (!resource.isDisposed) {
                this.available.push(resource);
            }
        }
    }

    async dispose(): Promise<void> {
        const allResources = [...this.available, ...this.inUse];
        await Promise.all(allResources.map((r) => r.dispose()));
        this.available = [];
        this.inUse.clear();
    }
}
