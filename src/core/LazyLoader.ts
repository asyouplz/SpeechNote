/**
 * LazyLoader - Phase 4 Performance Optimization
 *
 * 동적 모듈 로딩을 통한 번들 사이즈 최적화
 * - 초기 로딩 시간 단축
 * - 메모리 사용량 감소
 * - 코드 스플리팅 지원
 */

export interface LazyLoadOptions {
    preload?: boolean;
    timeout?: number;
    fallback?: unknown;
    onError?: (error: Error) => void;
    onLoad?: (module: unknown) => void;
}

import { requestUrl } from 'obsidian';

export interface LoadingState {
    isLoading: boolean;
    error?: Error;
    module?: unknown;
}

function normalizeError(error: unknown): Error {
    return error instanceof Error ? error : new Error('Unknown error');
}

export class LazyLoader {
    private static loadedModules = new Map<string, unknown>();
    private static loadingPromises = new Map<string, Promise<unknown>>();
    private static preloadQueue = new Set<string>();
    private static loadingStates = new Map<string, LoadingState>();

    /**
     * 모듈을 동적으로 로드
     */
    static async loadModule<T>(modulePath: string, options: LazyLoadOptions = {}): Promise<T> {
        // 이미 로드된 모듈 반환
        if (this.loadedModules.has(modulePath)) {
            return this.loadedModules.get(modulePath) as T;
        }

        // 현재 로딩 중인 경우 기존 Promise 반환
        if (this.loadingPromises.has(modulePath)) {
            return this.loadingPromises.get(modulePath) as Promise<T>;
        }

        // 로딩 상태 업데이트
        this.updateLoadingState(modulePath, { isLoading: true });

        // 타임아웃 설정
        const timeoutMs = options.timeout || 30000;
        const loadPromise = this.performLoad<T>(modulePath, options);

        const timeoutPromise = new Promise<T>((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Module loading timeout: ${modulePath}`));
            }, timeoutMs);
        });

        // 로딩 Promise 저장
        const promise = Promise.race([loadPromise, timeoutPromise]);
        this.loadingPromises.set(modulePath, promise);

        try {
            const module = await promise;
            this.loadedModules.set(modulePath, module);
            this.updateLoadingState(modulePath, {
                isLoading: false,
                module,
            });

            if (options.onLoad) {
                options.onLoad(module);
            }

            return module;
        } catch (error) {
            this.updateLoadingState(modulePath, {
                isLoading: false,
                error: normalizeError(error),
            });

            if (options.onError) {
                options.onError(normalizeError(error));
            }

            if (options.fallback !== undefined) {
                return options.fallback as T;
            }

            throw error;
        } finally {
            this.loadingPromises.delete(modulePath);
        }
    }

    /**
     * 실제 모듈 로딩 수행
     */
    private static async performLoad<T>(modulePath: string, _options: LazyLoadOptions): Promise<T> {
        try {
            // 동적 import를 통한 모듈 로드
            const module = await this.dynamicImport(modulePath);
            const resolved = (module as { default?: unknown }).default ?? module;
            return resolved as T;
        } catch (error) {
            console.error(`Failed to load module: ${modulePath}`, error);
            throw error;
        }
    }

    /**
     * 동적 import 래퍼 (컴포넌트별 최적화)
     */
    private static dynamicImport(modulePath: string): Promise<unknown> {
        // UI 컴포넌트 매핑
        const moduleMap: Record<string, () => Promise<unknown>> = {
            // Dashboard components (낮은 우선순위)
            StatisticsDashboard: () => import('../ui/dashboard/StatisticsDashboard'),

            // Settings components (중간 우선순위)
            AdvancedSettings: () => import('../ui/settings/components/AdvancedSettings'),
            ShortcutSettings: () => import('../ui/settings/components/ShortcutSettings'),
            AudioSettings: () => import('../ui/settings/components/AudioSettings'),

            // Modal components (높은 우선순위)
            FilePickerModal: () => import('../ui/modals/FilePickerModal'),

            // Progress components
            CircularProgress: () => import('../ui/progress/CircularProgress'),
            ProgressBar: () => import('../ui/progress/ProgressBar'),

            // Notification components
            NotificationSystem: () => import('../ui/notifications/NotificationSystem'),
        };

        const importFn = moduleMap[modulePath];
        if (!importFn) {
            throw new Error(`Unknown module: ${modulePath}`);
        }

        return importFn();
    }

    /**
     * 여러 모듈을 미리 로드 (백그라운드)
     */
    static preloadModules(modulePaths: string[]): void {
        modulePaths.forEach((path) => {
            if (!this.loadedModules.has(path) && !this.preloadQueue.has(path)) {
                this.preloadQueue.add(path);
            }
        });

        // Idle 시간에 백그라운드 로드
        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => void this.processPreloadQueue());
        } else {
            setTimeout(() => void this.processPreloadQueue(), 1000);
        }
    }

    /**
     * Preload 큐 처리
     */
    private static async processPreloadQueue(): Promise<void> {
        for (const modulePath of this.preloadQueue) {
            try {
                await this.loadModule(modulePath, { preload: true });
                this.preloadQueue.delete(modulePath);
            } catch (error) {
                console.warn(`Failed to preload module: ${modulePath}`, error);
            }
        }
    }

    /**
     * 리소스 프리로딩 (link prefetch)
     */
    static preloadResources(resources: string[]): void {
        if (typeof fetch !== 'function') {
            return;
        }

        resources.forEach((resource) => {
            void requestUrl({ url: resource, method: 'GET' }).catch((error) => {
                console.warn(`Failed to preload resource: ${resource}`, error);
            });
        });
    }

    /**
     * 모듈 언로드 (메모리 절약)
     */
    static unloadModule(modulePath: string): void {
        this.loadedModules.delete(modulePath);
        this.loadingStates.delete(modulePath);
    }

    /**
     * 모든 로드된 모듈 언로드
     */
    static unloadAll(): void {
        this.loadedModules.clear();
        this.loadingPromises.clear();
        this.preloadQueue.clear();
        this.loadingStates.clear();
    }

    /**
     * 로딩 상태 업데이트
     */
    private static updateLoadingState(modulePath: string, state: LoadingState): void {
        this.loadingStates.set(modulePath, state);
    }

    /**
     * 로딩 상태 조회
     */
    static getLoadingState(modulePath: string): LoadingState | undefined {
        return this.loadingStates.get(modulePath);
    }

    /**
     * 모듈 로드 여부 확인
     */
    static isLoaded(modulePath: string): boolean {
        return this.loadedModules.has(modulePath);
    }

    /**
     * 로드된 모듈 통계
     */
    static getStats(): {
        loadedCount: number;
        loadingCount: number;
        preloadCount: number;
        totalMemory: number;
    } {
        return {
            loadedCount: this.loadedModules.size,
            loadingCount: this.loadingPromises.size,
            preloadCount: this.preloadQueue.size,
            totalMemory: this.estimateMemoryUsage(),
        };
    }

    /**
     * 메모리 사용량 추정
     */
    private static estimateMemoryUsage(): number {
        // 간단한 추정: 각 모듈당 평균 50KB
        return this.loadedModules.size * 50 * 1024;
    }
}

/**
 * React-style lazy loading wrapper
 */
export function lazy<T>(loader: () => Promise<{ default: T }>): () => Promise<T> {
    let component: T | null = null;

    return async () => {
        if (!component) {
            const module = await loader();
            component = module.default;
        }
        return component;
    };
}

/**
 * Suspense-like loading boundary
 */
export class LoadingBoundary {
    private loading = new Set<Promise<unknown>>();

    async wrap<T>(promise: Promise<T>): Promise<T> {
        this.loading.add(promise);

        try {
            const result = await promise;
            return result;
        } finally {
            this.loading.delete(promise);
        }
    }

    get isLoading(): boolean {
        return this.loading.size > 0;
    }

    async waitForAll(): Promise<void> {
        await Promise.all(Array.from(this.loading));
    }
}
