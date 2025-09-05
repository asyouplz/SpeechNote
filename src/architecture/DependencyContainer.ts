import { App } from 'obsidian';
import { Logger } from '../infrastructure/logging/Logger';

/**
 * 서비스 생명주기 타입
 */
export enum ServiceLifetime {
    SINGLETON = 'singleton',
    TRANSIENT = 'transient',
    SCOPED = 'scoped'
}

/**
 * 서비스 등록 정보
 */
interface ServiceRegistration {
    factory: (container: DependencyContainer) => any;
    lifetime: ServiceLifetime;
    instance?: any;
}

/**
 * 의존성 주입 컨테이너
 * 플러그인의 모든 서비스와 컴포넌트를 관리
 */
export class DependencyContainer {
    private services: Map<string | symbol, ServiceRegistration> = new Map();
    private scopedInstances: Map<string | symbol, any> = new Map();
    private logger: Logger;

    constructor() {
        this.logger = new Logger('DependencyContainer');
    }

    /**
     * 서비스 등록
     */
    public register<T>(
        token: string | symbol,
        factory: (container: DependencyContainer) => T,
        lifetime: ServiceLifetime = ServiceLifetime.SINGLETON
    ): void {
        this.services.set(token, {
            factory,
            lifetime,
            instance: undefined
        });
        this.logger.debug(`Registered service: ${String(token)} with lifetime: ${lifetime}`);
    }

    /**
     * 싱글톤 서비스 등록 (편의 메서드)
     */
    public registerSingleton<T>(
        token: string | symbol,
        factory: (container: DependencyContainer) => T
    ): void {
        this.register(token, factory, ServiceLifetime.SINGLETON);
    }

    /**
     * Transient 서비스 등록 (편의 메서드)
     */
    public registerTransient<T>(
        token: string | symbol,
        factory: (container: DependencyContainer) => T
    ): void {
        this.register(token, factory, ServiceLifetime.TRANSIENT);
    }

    /**
     * 인스턴스 직접 등록
     */
    public registerInstance<T>(token: string | symbol, instance: T): void {
        this.services.set(token, {
            factory: () => instance,
            lifetime: ServiceLifetime.SINGLETON,
            instance: instance
        });
        this.logger.debug(`Registered instance: ${String(token)}`);
    }

    /**
     * 서비스 해결
     */
    public resolve<T>(token: string | symbol): T {
        const registration = this.services.get(token);
        if (!registration) {
            throw new Error(`Service ${String(token)} not registered`);
        }

        switch (registration.lifetime) {
            case ServiceLifetime.SINGLETON:
                return this.resolveSingleton<T>(token, registration);
            
            case ServiceLifetime.TRANSIENT:
                return this.resolveTransient<T>(registration);
            
            case ServiceLifetime.SCOPED:
                return this.resolveScoped<T>(token, registration);
            
            default:
                throw new Error(`Unknown lifetime: ${registration.lifetime}`);
        }
    }

    /**
     * 서비스 존재 여부 확인
     */
    public has(token: string | symbol): boolean {
        return this.services.has(token);
    }

    /**
     * 옵셔널 해결 (없으면 undefined 반환)
     */
    public tryResolve<T>(token: string | symbol): T | undefined {
        try {
            return this.resolve<T>(token);
        } catch {
            return undefined;
        }
    }

    /**
     * 싱글톤 해결
     */
    private resolveSingleton<T>(token: string | symbol, registration: ServiceRegistration): T {
        if (!registration.instance) {
            registration.instance = registration.factory(this);
            this.logger.debug(`Created singleton instance: ${String(token)}`);
        }
        return registration.instance;
    }

    /**
     * Transient 해결
     */
    private resolveTransient<T>(registration: ServiceRegistration): T {
        return registration.factory(this);
    }

    /**
     * Scoped 해결
     */
    private resolveScoped<T>(token: string | symbol, registration: ServiceRegistration): T {
        if (!this.scopedInstances.has(token)) {
            const instance = registration.factory(this);
            this.scopedInstances.set(token, instance);
            this.logger.debug(`Created scoped instance: ${String(token)}`);
        }
        return this.scopedInstances.get(token);
    }

    /**
     * 새로운 스코프 시작
     */
    public beginScope(): DependencyContainer {
        const scopedContainer = new DependencyContainer();
        
        // 부모 컨테이너의 서비스 등록 정보 복사
        this.services.forEach((registration, token) => {
            scopedContainer.services.set(token, registration);
        });

        return scopedContainer;
    }

    /**
     * 스코프 종료
     */
    public endScope(): void {
        this.scopedInstances.clear();
        this.logger.debug('Scope ended, cleared scoped instances');
    }

    /**
     * 모든 서비스 정리
     */
    public dispose(): void {
        // Disposable 인터페이스를 구현한 서비스들 정리
        this.services.forEach((registration, token) => {
            if (registration.instance && typeof registration.instance.dispose === 'function') {
                try {
                    registration.instance.dispose();
                    this.logger.debug(`Disposed service: ${String(token)}`);
                } catch (error) {
                    this.logger.error(`Failed to dispose service ${String(token)}`, error instanceof Error ? error : undefined);
                }
            }
        });

        this.services.clear();
        this.scopedInstances.clear();
        this.logger.info('All services disposed');
    }

    /**
     * 서비스 토큰 생성 헬퍼
     */
    public static createToken<T>(name: string): symbol {
        return Symbol.for(name);
    }
}

/**
 * 서비스 토큰 정의
 */
export const ServiceTokens = {
    App: Symbol.for('App'),
    Plugin: Symbol.for('Plugin'),
    Logger: Symbol.for('Logger'),
    EventManager: Symbol.for('EventManager'),
    StateManager: Symbol.for('StateManager'),
    EditorService: Symbol.for('EditorService'),
    TranscriptionService: Symbol.for('TranscriptionService'),
    SettingsManager: Symbol.for('SettingsManager'),
    ErrorHandler: Symbol.for('ErrorHandler'),
    NotificationService: Symbol.for('NotificationService'),
    StatusBarManager: Symbol.for('StatusBarManager'),
    SettingsTabManager: Symbol.for('SettingsTabManager')
};

/**
 * Disposable 인터페이스
 */
export interface IDisposable {
    dispose(): void;
}