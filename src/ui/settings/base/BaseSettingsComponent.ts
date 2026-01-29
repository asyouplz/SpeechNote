import { App, Setting, Notice } from 'obsidian';
import type SpeechToTextPlugin from '../../../main';

/**
 * Base Settings Component
 *
 * 모든 설정 컴포넌트의 기본 클래스
 * DRY 원칙을 적용하여 공통 기능을 추상화
 */
export abstract class BaseSettingsComponent {
    protected isInitialized = false;
    protected containerEl: HTMLElement | null = null;
    protected disposables: (() => void)[] = [];

    constructor(protected plugin: SpeechToTextPlugin, protected app?: App) {}

    /**
     * 컴포넌트 렌더링
     * Template Method 패턴 적용
     */
    public render(containerEl: HTMLElement): void {
        this.containerEl = containerEl;
        this.beforeRender(containerEl);
        this.doRender(containerEl);
        this.afterRender(containerEl);
        this.isInitialized = true;
    }

    /**
     * 렌더링 전 처리
     */
    protected beforeRender(containerEl: HTMLElement): void {
        containerEl.empty();
        this.cleanup();
    }

    /**
     * 실제 렌더링 로직 (하위 클래스에서 구현)
     */
    protected abstract doRender(containerEl: HTMLElement): void;

    /**
     * 렌더링 후 처리
     */
    protected afterRender(containerEl: HTMLElement): void {
        // 접근성 속성 추가
        this.applyAccessibility(containerEl);
    }

    /**
     * 섹션 생성 헬퍼
     */
    protected createSection(
        containerEl: HTMLElement,
        title: string,
        description?: string,
        className?: string
    ): HTMLElement {
        const sectionEl = containerEl.createDiv({
            cls: `settings-section ${className || ''}`.trim(),
        });

        const headerEl = sectionEl.createDiv({ cls: 'section-header' });

        const titleEl = headerEl.createEl('h4', {
            text: title,
            cls: 'section-title',
        });
        titleEl.setAttribute('id', `section-${title.toLowerCase().replace(/\s+/g, '-')}`);

        if (description) {
            headerEl.createEl('p', {
                text: description,
                cls: 'section-description',
            });
        }

        const contentEl = sectionEl.createDiv({ cls: 'section-content' });
        contentEl.setAttribute('aria-labelledby', titleEl.id);

        return contentEl;
    }

    /**
     * 설정 항목 생성 헬퍼
     */
    protected createSetting(containerEl: HTMLElement, name: string, desc: string): Setting {
        const setting = new Setting(containerEl).setName(name).setDesc(desc);

        // 접근성 속성 추가
        const settingEl = setting.settingEl;
        settingEl.setAttribute('role', 'group');
        settingEl.setAttribute('aria-label', name);

        return setting;
    }

    /**
     * 알림 표시 (중복 제거)
     */
    protected showNotice(message: string, duration = 5000): void {
        new Notice(message, duration);
    }

    /**
     * 에러 처리 래퍼
     */
    protected async withErrorHandling<T>(
        operation: () => Promise<T>,
        errorMessage = '작업 중 오류가 발생했습니다'
    ): Promise<T | null> {
        try {
            return await operation();
        } catch (error) {
            console.error(error);
            this.showNotice(errorMessage);
            return null;
        }
    }

    /**
     * 접근성 개선
     */
    protected applyAccessibility(containerEl: HTMLElement): void {
        // ARIA 라이브 리전 추가
        const liveRegion = containerEl.querySelector('.live-region');
        if (!liveRegion) {
            const region = containerEl.createDiv({ cls: 'sr-only live-region' });
            region.setAttribute('aria-live', 'polite');
            region.setAttribute('aria-atomic', 'true');
        }

        // 포커스 관리
        this.setupKeyboardNavigation(containerEl);
    }

    /**
     * 키보드 네비게이션 설정
     */
    protected setupKeyboardNavigation(containerEl: HTMLElement): void {
        const focusableElements = containerEl.querySelectorAll(
            'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length === 0) return;

        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Tab') {
                // Tab navigation is handled by browser
                return;
            }

            if (e.key === 'Escape') {
                // ESC 키로 설정 탭 닫기
                const closeButton = document.querySelector('.modal-close-button');
                if (closeButton instanceof HTMLElement) {
                    closeButton.click();
                }
            }
        };

        containerEl.addEventListener('keydown', handler);
        this.disposables.push(() => containerEl.removeEventListener('keydown', handler));
    }

    /**
     * 설정 저장 헬퍼
     */
    protected async saveSettings(): Promise<void> {
        await this.plugin.saveSettings();
        this.showNotice('설정이 저장되었습니다');
    }

    /**
     * 정리
     */
    public cleanup(): void {
        this.disposables.forEach((dispose) => dispose());
        this.disposables = [];
        this.isInitialized = false;
    }

    /**
     * 컴포넌트 파괴
     */
    public destroy(): void {
        this.cleanup();
        this.containerEl = null;
    }
}

/**
 * 설정 값 검증 헬퍼
 */
export class SettingsValidator {
    /**
     * 숫자 범위 검증
     */
    static validateRange(value: number, min: number, max: number): boolean {
        return !isNaN(value) && value >= min && value <= max;
    }

    /**
     * 문자열 길이 검증
     */
    static validateLength(value: string, minLength: number, maxLength?: number): boolean {
        const length = value.length;
        return length >= minLength && (maxLength === undefined || length <= maxLength);
    }

    /**
     * 이메일 검증
     */
    static validateEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * URL 검증
     */
    static validateUrl(url: string): boolean {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * API 키 형식 검증
     */
    static validateApiKeyFormat(key: string, pattern: RegExp): boolean {
        return pattern.test(key);
    }
}

/**
 * 설정 상태 관리
 */
export class SettingsState<T = unknown> {
    private state: T;
    private listeners: Set<(state: T) => void> = new Set();

    constructor(initialState: T) {
        this.state = initialState;
    }

    /**
     * 상태 가져오기
     */
    public get(): T {
        return this.state;
    }

    /**
     * 상태 설정
     */
    public set(newState: T | ((prev: T) => T)): void {
        const prevState = this.state;

        if (this.isStateUpdater(newState)) {
            this.state = newState(prevState);
        } else {
            this.state = newState;
        }

        if (prevState !== this.state) {
            this.notifyListeners();
        }
    }

    /**
     * 상태 변경 구독
     */
    public subscribe(listener: (state: T) => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    /**
     * 리스너에게 알림
     */
    private notifyListeners(): void {
        this.listeners.forEach((listener) => listener(this.state));
    }

    private isStateUpdater(value: T | ((prev: T) => T)): value is (prev: T) => T {
        return typeof value === 'function';
    }

    /**
     * 정리
     */
    public destroy(): void {
        this.listeners.clear();
    }
}
