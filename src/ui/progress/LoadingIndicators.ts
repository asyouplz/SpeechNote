import { createIconElement } from '../../utils/common/helpers';

/**
 * 로딩 인디케이터 컴포넌트 모음
 * - 스피너 애니메이션
 * - 펄스 효과
 * - 스켈레톤 로더
 * - 상태별 아이콘
 */

export interface LoadingIndicatorOptions {
    type: 'spinner' | 'pulse' | 'skeleton' | 'dots';
    size?: 'small' | 'medium' | 'large';
    color?: string;
    message?: string;
    ariaLabel?: string;
    lines?: number;
    lineHeight?: string;
    spacing?: string;
    animated?: boolean;
}

/**
 * 스피너 로더 컴포넌트
 */
export class SpinnerLoader {
    private element: HTMLElement | null = null;
    private options: LoadingIndicatorOptions;

    constructor(options: Partial<LoadingIndicatorOptions> = {}) {
        this.options = {
            type: 'spinner',
            size: 'medium',
            ...options,
        };
    }

    create(): HTMLElement {
        this.element = createEl('div');
        this.element.className = `sn-loading-spinner sn-loading-spinner--${this.options.size}`;
        this.element.setAttribute('role', 'status');
        this.element.setAttribute('aria-label', this.options.ariaLabel || 'Loading');

        const spinnerGlyph = createEl('div');
        spinnerGlyph.className = 'sn-loading-spinner__glyph';
        this.element.appendChild(spinnerGlyph);

        if (this.options.message) {
            const messageEl = createEl('span');
            messageEl.className = 'sn-loading-message';
            messageEl.textContent = this.options.message;
            this.element.appendChild(messageEl);
        }

        // 스크린 리더용 라이브 영역
        const srOnly = createEl('span');
        srOnly.className = 'sn-sr-only';
        srOnly.setAttribute('aria-live', 'polite');
        srOnly.textContent = this.options.message || 'Loading data';
        this.element.appendChild(srOnly);

        return this.element;
    }

    updateMessage(message: string) {
        if (!this.element) return;

        const messageEl = this.element.querySelector('.sn-loading-message');
        const srOnly = this.element.querySelector('.sn-sr-only');

        if (messageEl) {
            messageEl.textContent = message;
        }
        if (srOnly) {
            srOnly.textContent = message;
        }
    }

    destroy() {
        this.element?.remove();
        this.element = null;
    }
}

/**
 * 펄스 로더 컴포넌트
 */
export class PulseLoader {
    private element: HTMLElement | null = null;
    private options: LoadingIndicatorOptions;

    constructor(options: Partial<LoadingIndicatorOptions> = {}) {
        this.options = {
            type: 'pulse',
            size: 'medium',
            ...options,
        };
    }

    create(): HTMLElement {
        this.element = createEl('div');
        this.element.className = `sn-loading-pulse sn-loading-pulse--${this.options.size}`;
        this.element.setAttribute('role', 'status');
        this.element.setAttribute('aria-label', this.options.ariaLabel || 'Loading');

        // 펄스 요소들
        for (let i = 0; i < 3; i++) {
            const pulse = createEl('div');
            pulse.className = `sn-pulse-dot sn-pulse-dot--${i + 1}`;
            this.element.appendChild(pulse);
        }

        if (this.options.message) {
            const messageEl = createEl('span');
            messageEl.className = 'sn-loading-message';
            messageEl.textContent = this.options.message;
            this.element.appendChild(messageEl);
        }

        return this.element;
    }

    destroy() {
        this.element?.remove();
        this.element = null;
    }
}

/**
 * 스켈레톤 로더 컴포넌트
 */
export class SkeletonLoader {
    private element: HTMLElement | null = null;
    private options: {
        lines?: number;
        lineHeight?: string;
        spacing?: string;
        animated?: boolean;
    };

    constructor(
        options: {
            lines?: number;
            lineHeight?: string;
            spacing?: string;
            animated?: boolean;
        } = {}
    ) {
        this.options = {
            lines: 3,
            lineHeight: '20px',
            spacing: '10px',
            animated: true,
            ...options,
        };
    }

    create(): HTMLElement {
        this.element = createEl('div');
        this.element.className = 'sn-loading-skeleton';
        this.element.setAttribute('role', 'status');
        this.element.setAttribute('aria-label', 'Loading content');

        const lineCount = this.options.lines ?? 3;
        const heightModifier = this.getLineHeightModifier(this.options.lineHeight);
        const spacingModifier = this.getSpacingModifier(this.options.spacing);

        if (heightModifier) {
            this.element.classList.add(heightModifier);
        }
        if (spacingModifier) {
            this.element.classList.add(spacingModifier);
        }

        for (let i = 0; i < lineCount; i++) {
            const line = createEl('div');
            const classes = ['sn-skeleton-line'];
            if (this.options.animated !== false) {
                classes.push('skeleton-animated');
            }
            line.className = classes.join(' ');

            this.element.appendChild(line);
        }

        return this.element;
    }

    destroy() {
        this.element?.remove();
        this.element = null;
    }

    private getLineHeightModifier(lineHeight?: string): string {
        const value = this.normalizeToken(lineHeight);
        switch (value) {
            case 'sm':
            case 'small':
            case 'compact':
            case '12px':
            case '14px':
            case '0.75rem':
            case '0.875rem':
                return 'sn-loading-skeleton--height-sm';
            case 'lg':
            case 'large':
            case 'comfortable':
            case '24px':
            case '28px':
            case '1.5rem':
                return 'sn-loading-skeleton--height-lg';
            default:
                return 'sn-loading-skeleton--height-md';
        }
    }

    private getSpacingModifier(spacing?: string): string {
        const value = this.normalizeToken(spacing);
        switch (value) {
            case 'none':
            case '0':
            case '0px':
            case '0rem':
                return 'sn-loading-skeleton--spacing-none';
            case 'sm':
            case 'small':
            case 'compact':
            case '6px':
            case '0.375rem':
                return 'sn-loading-skeleton--spacing-sm';
            case 'lg':
            case 'large':
            case 'comfortable':
            case '16px':
            case '1rem':
                return 'sn-loading-skeleton--spacing-lg';
            default:
                return 'sn-loading-skeleton--spacing-md';
        }
    }

    private normalizeToken(value?: string): string | undefined {
        if (!value) return undefined;
        return value.trim().toLowerCase();
    }
}

/**
 * 도트 로더 컴포넌트
 */
export class DotsLoader {
    private element: HTMLElement | null = null;
    private options: LoadingIndicatorOptions;

    constructor(options: Partial<LoadingIndicatorOptions> = {}) {
        this.options = {
            type: 'dots',
            size: 'medium',
            ...options,
        };
    }

    create(): HTMLElement {
        this.element = createEl('div');
        this.element.className = `sn-loading-dots sn-loading-dots--${this.options.size}`;
        this.element.setAttribute('role', 'status');
        this.element.setAttribute('aria-label', this.options.ariaLabel || 'Loading');

        const dotsContainer = createEl('div');
        dotsContainer.className = 'sn-dots-container';

        for (let i = 0; i < 3; i++) {
            const dot = createEl('span');
            dot.className = 'sn-dot';
            dotsContainer.appendChild(dot);
        }

        this.element.appendChild(dotsContainer);

        if (this.options.message) {
            const messageEl = createEl('span');
            messageEl.className = 'sn-loading-message';
            messageEl.textContent = this.options.message;
            this.element.appendChild(messageEl);
        }

        return this.element;
    }

    destroy() {
        this.element?.remove();
        this.element = null;
    }
}

/**
 * 상태 아이콘 컴포넌트
 */
export class StatusIcon {
    private element: HTMLElement | null = null;
    private type: 'success' | 'error' | 'warning' | 'info';
    private message?: string;

    constructor(type: 'success' | 'error' | 'warning' | 'info', message?: string) {
        this.type = type;
        this.message = message;
    }

    create(): HTMLElement {
        this.element = createEl('div');
        this.element.className = `sn-status-icon sn-status-icon--${this.type}`;
        this.element.setAttribute('role', 'status');

        const icon = this.getIcon();
        const iconEl = createEl('div');
        iconEl.className = 'sn-status-icon__icon';
        iconEl.appendChild(icon);

        this.element.appendChild(iconEl);

        if (this.message) {
            const messageEl = createEl('span');
            messageEl.className = 'sn-status-icon__message';
            messageEl.textContent = this.message;
            this.element.appendChild(messageEl);
        }

        // ARIA 라벨 설정
        const ariaLabel = this.getAriaLabel();
        this.element.setAttribute('aria-label', ariaLabel);

        return this.element;
    }

    private getIcon(): HTMLElement {
        const iconMap = {
            success: 'check',
            error: 'x',
            warning: 'alert-triangle',
            info: 'info',
        } as const;

        return createIconElement(iconMap[this.type]);
    }

    private getAriaLabel(): string {
        const labels = {
            success: 'Success',
            error: 'Error',
            warning: 'Warning',
            info: 'Info',
        };

        const baseLabel = labels[this.type];
        return this.message ? `${baseLabel}: ${this.message}` : baseLabel;
    }

    updateMessage(message: string) {
        if (!this.element) return;

        const messageEl = this.element.querySelector('.sn-status-icon__message');
        if (messageEl) {
            messageEl.textContent = message;
        } else {
            const newMessageEl = createEl('span');
            newMessageEl.className = 'sn-status-icon__message';
            newMessageEl.textContent = message;
            this.element.appendChild(newMessageEl);
        }

        this.element.setAttribute('aria-label', `${this.getAriaLabel()}: ${message}`);
    }

    destroy() {
        this.element?.remove();
        this.element = null;
    }
}

/**
 * 로딩 인디케이터 팩토리
 */
export class LoadingIndicatorFactory {
    static create(options: LoadingIndicatorOptions): HTMLElement {
        switch (options.type) {
            case 'spinner':
                return new SpinnerLoader(options).create();
            case 'pulse':
                return new PulseLoader(options).create();
            case 'skeleton':
                return new SkeletonLoader(options).create();
            case 'dots':
                return new DotsLoader(options).create();
            default:
                return new SpinnerLoader(options).create();
        }
    }
}
