/**
 * Factory 패턴 구현
 * 객체 생성 로직을 캡슐화하는 패턴
 */

/**
 * 팩토리 인터페이스
 */
export interface IFactory<T, P = any> {
    create(params?: P): T;
}

/**
 * 비동기 팩토리 인터페이스
 */
export interface IAsyncFactory<T, P = any> {
    create(params?: P): Promise<T>;
}

/**
 * 추상 팩토리 인터페이스
 */
export interface IAbstractFactory<T extends Record<string, any>> {
    create<K extends keyof T>(type: K, params?: any): T[K];
}

/**
 * 레지스트리 기반 팩토리
 */
export class RegistryFactory<T> implements IFactory<T, string> {
    private registry = new Map<string, () => T>();
    
    /**
     * 생성자 등록
     */
    register(type: string, creator: () => T): void {
        this.registry.set(type, creator);
    }
    
    /**
     * 생성자 등록 해제
     */
    unregister(type: string): void {
        this.registry.delete(type);
    }
    
    /**
     * 객체 생성
     */
    create(type: string): T {
        const creator = this.registry.get(type);
        if (!creator) {
            throw new Error(`No creator registered for type: ${type}`);
        }
        return creator();
    }
    
    /**
     * 등록된 타입 확인
     */
    hasType(type: string): boolean {
        return this.registry.has(type);
    }
    
    /**
     * 등록된 모든 타입 반환
     */
    getTypes(): string[] {
        return Array.from(this.registry.keys());
    }
}

/**
 * 파라미터화된 팩토리
 */
export class ParameterizedFactory<T, P = any> implements IFactory<T, P> {
    constructor(
        private creator: (params?: P) => T
    ) {}
    
    create(params?: P): T {
        return this.creator(params);
    }
}

/**
 * 조건부 팩토리
 */
export class ConditionalFactory<T> {
    private conditions: Array<{
        predicate: (params: any) => boolean;
        creator: (params: any) => T;
    }> = [];
    
    private defaultCreator?: (params: any) => T;
    
    /**
     * 조건 추가
     */
    addCondition(
        predicate: (params: any) => boolean,
        creator: (params: any) => T
    ): this {
        this.conditions.push({ predicate, creator });
        return this;
    }
    
    /**
     * 기본 생성자 설정
     */
    setDefault(creator: (params: any) => T): this {
        this.defaultCreator = creator;
        return this;
    }
    
    /**
     * 객체 생성
     */
    create(params?: any): T {
        for (const { predicate, creator } of this.conditions) {
            if (predicate(params)) {
                return creator(params);
            }
        }
        
        if (this.defaultCreator) {
            return this.defaultCreator(params);
        }
        
        throw new Error('No matching condition and no default creator');
    }
}

/**
 * 풀 기반 팩토리
 */
export class PoolFactory<T> {
    private pool: T[] = [];
    private inUse = new Set<T>();
    
    constructor(
        private creator: () => T,
        private resetter?: (item: T) => void,
        private maxSize = 10
    ) {}
    
    /**
     * 객체 획득
     */
    acquire(): T {
        let item: T;
        
        if (this.pool.length > 0) {
            item = this.pool.pop()!;
        } else {
            item = this.creator();
        }
        
        this.inUse.add(item);
        return item;
    }
    
    /**
     * 객체 반환
     */
    release(item: T): void {
        if (!this.inUse.has(item)) {
            return;
        }
        
        this.inUse.delete(item);
        
        if (this.resetter) {
            this.resetter(item);
        }
        
        if (this.pool.length < this.maxSize) {
            this.pool.push(item);
        }
    }
    
    /**
     * 풀 상태 확인
     */
    getStats(): {
        poolSize: number;
        inUseSize: number;
        available: number;
    } {
        return {
            poolSize: this.pool.length,
            inUseSize: this.inUse.size,
            available: this.pool.length
        };
    }
    
    /**
     * 풀 초기화
     */
    clear(): void {
        this.pool = [];
        this.inUse.clear();
    }
}

/**
 * 빌더 패턴과 결합된 팩토리
 */
export class BuilderFactory<T> {
    private builders = new Map<string, () => IBuilder<T>>();
    
    /**
     * 빌더 등록
     */
    registerBuilder(type: string, builder: () => IBuilder<T>): void {
        this.builders.set(type, builder);
    }
    
    /**
     * 빌더 생성
     */
    createBuilder(type: string): IBuilder<T> {
        const builderCreator = this.builders.get(type);
        if (!builderCreator) {
            throw new Error(`No builder registered for type: ${type}`);
        }
        return builderCreator();
    }
    
    /**
     * 객체 생성 (빌더를 통해)
     */
    create(type: string, configurator?: (builder: IBuilder<T>) => void): T {
        const builder = this.createBuilder(type);
        if (configurator) {
            configurator(builder);
        }
        return builder.build();
    }
}

/**
 * 빌더 인터페이스
 */
export interface IBuilder<T> {
    build(): T;
}

/**
 * 프로토타입 팩토리
 */
export class PrototypeFactory<T extends { clone(): T }> {
    private prototypes = new Map<string, T>();
    
    /**
     * 프로토타입 등록
     */
    registerPrototype(type: string, prototype: T): void {
        this.prototypes.set(type, prototype);
    }
    
    /**
     * 객체 생성 (복제)
     */
    create(type: string): T {
        const prototype = this.prototypes.get(type);
        if (!prototype) {
            throw new Error(`No prototype registered for type: ${type}`);
        }
        return prototype.clone();
    }
}

/**
 * 함수형 팩토리 생성 헬퍼
 */
export function createFactory<T, P = void>(
    creator: (params: P) => T
): (params: P) => T {
    return (params: P) => creator(params);
}

/**
 * 메모이제이션된 팩토리
 */
export class MemoizedFactory<T, P = any> {
    private cache = new Map<string, T>();
    
    constructor(
        private creator: (params: P) => T,
        private keyGenerator: (params: P) => string = JSON.stringify
    ) {}
    
    create(params: P): T {
        const key = this.keyGenerator(params);
        
        if (!this.cache.has(key)) {
            this.cache.set(key, this.creator(params));
        }
        
        return this.cache.get(key)!;
    }
    
    clearCache(): void {
        this.cache.clear();
    }
    
    getCacheSize(): number {
        return this.cache.size;
    }
}