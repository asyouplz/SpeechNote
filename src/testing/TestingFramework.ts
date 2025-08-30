import { App, Plugin, WorkspaceLeaf } from 'obsidian';
import { DependencyContainer } from '../architecture/DependencyContainer';

/**
 * 모의 객체 생성 유틸리티
 */
export class MockFactory {
    /**
     * App 모의 객체 생성
     */
    static createMockApp(): Partial<App> {
        return {
            vault: {
                getFiles: jest.fn().mockReturnValue([]),
                create: jest.fn(),
                read: jest.fn(),
                modify: jest.fn(),
                delete: jest.fn(),
                rename: jest.fn(),
                getAbstractFileByPath: jest.fn()
            } as any,
            workspace: {
                getActiveViewOfType: jest.fn(),
                openLinkText: jest.fn(),
                onLayoutReady: jest.fn((callback) => callback()),
                layoutReady: true,
                activeLeaf: null as any
            } as any,
            metadataCache: {
                getFileCache: jest.fn(),
                getCache: jest.fn()
            } as any
        };
    }

    /**
     * Plugin 모의 객체 생성
     */
    static createMockPlugin(): Partial<Plugin> {
        return {
            app: MockFactory.createMockApp() as App,
            manifest: { version: '1.0.0' } as any,
            addCommand: jest.fn(),
            addSettingTab: jest.fn(),
            addStatusBarItem: jest.fn().mockReturnValue({
                setText: jest.fn(),
                remove: jest.fn()
            }),
            loadData: jest.fn().mockResolvedValue({}),
            saveData: jest.fn().mockResolvedValue(undefined),
            registerEvent: jest.fn(),
            registerInterval: jest.fn()
        };
    }

    /**
     * StatusBar 아이템 모의 객체 생성
     */
    static createMockStatusBarItem(): HTMLElement {
        const element = document.createElement('div');
        (element as any).setText = jest.fn();
        (element as any).remove = jest.fn();
        return element;
    }

    /**
     * Editor 모의 객체 생성
     */
    static createMockEditor() {
        return {
            getValue: jest.fn().mockReturnValue(''),
            setValue: jest.fn(),
            getLine: jest.fn().mockReturnValue(''),
            setLine: jest.fn(),
            lastLine: jest.fn().mockReturnValue(0),
            replaceSelection: jest.fn(),
            getCursor: jest.fn().mockReturnValue({ line: 0, ch: 0 }),
            setCursor: jest.fn(),
            getSelection: jest.fn().mockReturnValue(''),
            somethingSelected: jest.fn().mockReturnValue(false)
        };
    }
}

/**
 * 테스트 환경 설정
 */
export class TestEnvironment {
    private container: DependencyContainer;
    private mockApp: Partial<App>;
    private mockPlugin: Partial<Plugin>;

    constructor() {
        this.container = new DependencyContainer();
        this.mockApp = MockFactory.createMockApp();
        this.mockPlugin = MockFactory.createMockPlugin();
    }

    /**
     * 테스트 환경 설정
     */
    async setup(): Promise<void> {
        // 의존성 등록
        this.container.registerInstance('App', this.mockApp);
        this.container.registerInstance('Plugin', this.mockPlugin);
        
        // 기본 서비스 모의 객체 등록
        this.registerMockServices();
    }

    /**
     * 모의 서비스 등록
     */
    private registerMockServices(): void {
        // Logger 모의 객체
        this.container.registerSingleton('Logger', () => ({
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        }));

        // StateManager 모의 객체
        this.container.registerSingleton('StateManager', () => ({
            getState: jest.fn().mockReturnValue({ status: 'idle' }),
            setState: jest.fn(),
            subscribe: jest.fn().mockReturnValue(() => {}),
            reset: jest.fn()
        }));

        // EventManager 모의 객체
        this.container.registerSingleton('EventManager', () => ({
            emit: jest.fn(),
            on: jest.fn(),
            off: jest.fn(),
            removeAllListeners: jest.fn()
        }));
    }

    /**
     * 테스트 환경 정리
     */
    async teardown(): Promise<void> {
        this.container.dispose();
        jest.clearAllMocks();
    }

    /**
     * 의존성 컨테이너 반환
     */
    getContainer(): DependencyContainer {
        return this.container;
    }

    /**
     * 모의 App 반환
     */
    getMockApp(): Partial<App> {
        return this.mockApp;
    }

    /**
     * 모의 Plugin 반환
     */
    getMockPlugin(): Partial<Plugin> {
        return this.mockPlugin;
    }
}

/**
 * 테스트 헬퍼 함수
 */
export class TestHelpers {
    /**
     * 비동기 작업 대기
     */
    static async waitFor(
        condition: () => boolean,
        timeout: number = 5000,
        interval: number = 100
    ): Promise<void> {
        const startTime = Date.now();
        
        while (!condition()) {
            if (Date.now() - startTime > timeout) {
                throw new Error('Timeout waiting for condition');
            }
            await new Promise(resolve => setTimeout(resolve, interval));
        }
    }

    /**
     * 이벤트 발생 대기
     */
    static waitForEvent(
        eventManager: any,
        eventName: string,
        timeout: number = 5000
    ): Promise<any> {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`Timeout waiting for event: ${eventName}`));
            }, timeout);

            const handler = (data: any) => {
                clearTimeout(timer);
                resolve(data);
            };

            eventManager.once(eventName, handler);
        });
    }

    /**
     * 에러 발생 확인
     */
    static async expectError(
        fn: () => Promise<any>,
        errorMessage?: string
    ): Promise<void> {
        let errorThrown = false;
        
        try {
            await fn();
        } catch (error: any) {
            errorThrown = true;
            if (errorMessage && !error.message.includes(errorMessage)) {
                throw new Error(`Expected error message to include "${errorMessage}", but got: ${error.message}`);
            }
        }

        if (!errorThrown) {
            throw new Error('Expected function to throw an error');
        }
    }

    /**
     * 상태 변경 시뮬레이션
     */
    static simulateStateChange(
        stateManager: any,
        states: Array<{ status: string; delay?: number }>
    ): Promise<void> {
        return states.reduce(async (promise, state) => {
            await promise;
            if (state.delay) {
                await new Promise(resolve => setTimeout(resolve, state.delay));
            }
            stateManager.setState({ status: state.status });
        }, Promise.resolve());
    }
}

/**
 * 통합 테스트 유틸리티
 */
export class IntegrationTestUtils {
    /**
     * 플러그인 초기화 테스트
     */
    static async testPluginInitialization(
        pluginClass: any,
        options: { expectSuccess: boolean } = { expectSuccess: true }
    ): Promise<void> {
        const env = new TestEnvironment();
        await env.setup();

        const plugin = new pluginClass();
        plugin.app = env.getMockApp() as App;

        if (options.expectSuccess) {
            await plugin.onload();
            expect(plugin.isLoaded).toBe(true);
        } else {
            await TestHelpers.expectError(() => plugin.onload());
        }

        await env.teardown();
    }

    /**
     * UI 컴포넌트 테스트
     */
    static async testUIComponent(
        componentClass: any,
        setupFn?: (component: any) => void
    ): Promise<any> {
        const env = new TestEnvironment();
        await env.setup();

        const component = new componentClass(
            env.getMockApp(),
            env.getMockPlugin()
        );

        if (setupFn) {
            setupFn(component);
        }

        await component.initialize();

        return { component, env };
    }

    /**
     * 서비스 테스트
     */
    static async testService(
        serviceClass: any,
        dependencies: Record<string, any> = {}
    ): Promise<any> {
        const env = new TestEnvironment();
        await env.setup();

        // 의존성 등록
        Object.entries(dependencies).forEach(([key, value]) => {
            env.getContainer().registerInstance(key, value);
        });

        const service = env.getContainer().resolve(serviceClass);

        return { service, env };
    }
}