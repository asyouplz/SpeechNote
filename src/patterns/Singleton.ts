/**
 * Singleton 패턴 구현
 * 전역적으로 단일 인스턴스만 존재해야 하는 서비스들을 위한 패턴
 */

/**
 * Singleton 베이스 클래스
 */
export abstract class Singleton {
    private static instances = new Map<string, unknown>();

    /**
     * 인스턴스 획득
     */
    protected static getInstance<T extends Singleton>(
        this: new (...args: unknown[]) => T,
        ...args: unknown[]
    ): T {
        const className = this.name;

        if (!Singleton.instances.has(className)) {
            const instance = new this(...args);
            Singleton.instances.set(className, instance);
        }

        return Singleton.instances.get(className) as T;
    }

    /**
     * 인스턴스 존재 여부 확인
     */
    protected static hasInstance(className: string): boolean {
        return Singleton.instances.has(className);
    }

    /**
     * 인스턴스 제거 (테스트용)
     */
    protected static clearInstance(className: string): void {
        Singleton.instances.delete(className);
    }

    /**
     * 모든 인스턴스 제거 (테스트용)
     */
    protected static clearAllInstances(): void {
        Singleton.instances.clear();
    }
}

/**
 * 함수형 Singleton 팩토리
 */
export function createSingleton<T>(factory: () => T): () => T {
    let instance: T | undefined;

    return () => {
        if (instance === undefined) {
            instance = factory();
        }
        return instance;
    };
}

/**
 * 클래스 데코레이터를 사용한 Singleton 패턴
 */
/* eslint-disable @typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-argument */
export function SingletonDecorator<T extends new (...args: any[]) => object>(constructor: T): T {
    let instance: InstanceType<T>;

    return class extends constructor {
        constructor(...args: any[]) {
            if (instance) {
                return instance;
            }
            super(...args);
            instance = this as InstanceType<T>;
        }
    } as T;
}
/* eslint-enable @typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-argument */

/**
 * 비동기 Singleton 팩토리
 */
export function createAsyncSingleton<T>(factory: () => Promise<T>): () => Promise<T> {
    let instance: Promise<T> | undefined;

    return () => {
        if (instance === undefined) {
            instance = factory();
        }
        return instance;
    };
}

/**
 * 지연 초기화 Singleton
 */
export class LazySingleton<T> {
    private instance?: T;
    private isInitialized = false;

    constructor(private factory: () => T) {}

    getInstance(): T {
        if (!this.isInitialized) {
            this.instance = this.factory();
            this.isInitialized = true;
        }
        if (this.instance === undefined) {
            throw new Error('LazySingleton factory returned undefined instance');
        }
        return this.instance;
    }

    isInstantiated(): boolean {
        return this.isInitialized;
    }

    reset(): void {
        this.instance = undefined;
        this.isInitialized = false;
    }
}

/**
 * 스레드 안전 Singleton (브라우저 환경에서는 단일 스레드이지만 동시성 처리용)
 */
export class ThreadSafeSingleton<T> {
    private instance?: T;
    private initPromise?: Promise<T>;

    constructor(private factory: () => T | Promise<T>) {}

    getInstance(): Promise<T> {
        if (this.instance) {
            return Promise.resolve(this.instance);
        }

        if (!this.initPromise) {
            this.initPromise = Promise.resolve(this.factory()).then((inst) => {
                this.instance = inst;
                return inst;
            });
        }

        return this.initPromise;
    }

    hasInstance(): boolean {
        return this.instance !== undefined;
    }

    reset(): void {
        this.instance = undefined;
        this.initPromise = undefined;
    }
}
