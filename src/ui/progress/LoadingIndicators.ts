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
            ...options
        };
    }

    create(): HTMLElement {
        this.element = document.createElement('div');
        this.element.className = `loading-spinner loading-spinner--${this.options.size}`;
        this.element.setAttribute('role', 'status');
        this.element.setAttribute('aria-label', this.options.ariaLabel || '로딩 중');
        
        this.element.appendChild(this.createSpinnerSvg());
        
        if (this.options.message) {
            const messageEl = document.createElement('span');
            messageEl.className = 'loading-message';
            messageEl.textContent = this.options.message;
            this.element.appendChild(messageEl);
        }
        
        // 스크린 리더용 라이브 영역
        const srOnly = document.createElement('span');
        srOnly.className = 'sr-only';
        srOnly.setAttribute('aria-live', 'polite');
        srOnly.textContent = this.options.message || '데이터를 불러오는 중입니다';
        this.element.appendChild(srOnly);
        
        return this.element;
    }

    updateMessage(message: string) {
        if (!this.element) return;
        
        const messageEl = this.element.querySelector('.loading-message');
        const srOnly = this.element.querySelector('.sr-only');
        
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

    private createSpinnerSvg(): SVGElement {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 50 50');

        const background = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        background.setAttribute('cx', '25');
        background.setAttribute('cy', '25');
        background.setAttribute('r', '20');
        background.setAttribute('fill', 'none');
        background.setAttribute('stroke', 'currentColor');
        background.setAttribute('stroke-width', '4');
        background.setAttribute('opacity', '0.3');
        svg.appendChild(background);

        const arc = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        arc.setAttribute('cx', '25');
        arc.setAttribute('cy', '25');
        arc.setAttribute('r', '20');
        arc.setAttribute('fill', 'none');
        arc.setAttribute('stroke', 'currentColor');
        arc.setAttribute('stroke-width', '4');
        arc.setAttribute('stroke-dasharray', '90');
        arc.setAttribute('stroke-dashoffset', '60');
        arc.setAttribute('stroke-linecap', 'round');

        const animate = document.createElementNS('http://www.w3.org/2000/svg', 'animateTransform');
        animate.setAttribute('attributeName', 'transform');
        animate.setAttribute('type', 'rotate');
        animate.setAttribute('from', '0 25 25');
        animate.setAttribute('to', '360 25 25');
        animate.setAttribute('dur', '1s');
        animate.setAttribute('repeatCount', 'indefinite');
        arc.appendChild(animate);

        svg.appendChild(arc);

        return svg;
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
            ...options
        };
    }

    create(): HTMLElement {
        this.element = document.createElement('div');
        this.element.className = `loading-pulse loading-pulse--${this.options.size}`;
        this.element.setAttribute('role', 'status');
        this.element.setAttribute('aria-label', this.options.ariaLabel || '로딩 중');
        
        // 펄스 요소들
        for (let i = 0; i < 3; i++) {
            const pulse = document.createElement('div');
            pulse.className = `pulse-dot pulse-dot--${i + 1}`;
            this.element.appendChild(pulse);
        }
        
        if (this.options.message) {
            const messageEl = document.createElement('span');
            messageEl.className = 'loading-message';
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

    constructor(options: {
        lines?: number;
        lineHeight?: string;
        spacing?: string;
        animated?: boolean;
    } = {}) {
        this.options = {
            lines: 3,
            lineHeight: '20px',
            spacing: '10px',
            animated: true,
            ...options
        };
    }

    create(): HTMLElement {
        this.element = document.createElement('div');
        this.element.className = 'loading-skeleton';
        this.element.setAttribute('role', 'status');
        this.element.setAttribute('aria-label', '콘텐츠를 불러오는 중');
        
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
            const line = document.createElement('div');
            const classes = ['skeleton-line'];
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
                return 'loading-skeleton--height-sm';
            case 'lg':
            case 'large':
            case 'comfortable':
            case '24px':
            case '28px':
            case '1.5rem':
                return 'loading-skeleton--height-lg';
            default:
                return 'loading-skeleton--height-md';
        }
    }

    private getSpacingModifier(spacing?: string): string {
        const value = this.normalizeToken(spacing);
        switch (value) {
            case 'none':
            case '0':
            case '0px':
            case '0rem':
                return 'loading-skeleton--spacing-none';
            case 'sm':
            case 'small':
            case 'compact':
            case '6px':
            case '0.375rem':
                return 'loading-skeleton--spacing-sm';
            case 'lg':
            case 'large':
            case 'comfortable':
            case '16px':
            case '1rem':
                return 'loading-skeleton--spacing-lg';
            default:
                return 'loading-skeleton--spacing-md';
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
            ...options
        };
    }

    create(): HTMLElement {
        this.element = document.createElement('div');
        this.element.className = `loading-dots loading-dots--${this.options.size}`;
        this.element.setAttribute('role', 'status');
        this.element.setAttribute('aria-label', this.options.ariaLabel || '로딩 중');
        
        const dotsContainer = document.createElement('div');
        dotsContainer.className = 'dots-container';
        
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('span');
            dot.className = 'dot';
            dotsContainer.appendChild(dot);
        }
        
        this.element.appendChild(dotsContainer);
        
        if (this.options.message) {
            const messageEl = document.createElement('span');
            messageEl.className = 'loading-message';
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
        this.element = document.createElement('div');
        this.element.className = `status-icon status-icon--${this.type}`;
        this.element.setAttribute('role', 'status');
        
        const icon = this.getIcon();
        const iconEl = document.createElement('div');
        iconEl.className = 'status-icon__icon';
        iconEl.appendChild(icon);
        
        this.element.appendChild(iconEl);
        
        if (this.message) {
            const messageEl = document.createElement('span');
            messageEl.className = 'status-icon__message';
            messageEl.textContent = this.message;
            this.element.appendChild(messageEl);
        }
        
        // ARIA 라벨 설정
        const ariaLabel = this.getAriaLabel();
        this.element.setAttribute('aria-label', ariaLabel);
        
        return this.element;
    }

    private getIcon(): SVGElement {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');

        if (this.type === 'warning') {
            const triangle = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            triangle.setAttribute('d', 'M12 3L2 21H22L12 3Z');
            triangle.setAttribute('stroke', 'currentColor');
            triangle.setAttribute('stroke-width', '2');
            triangle.setAttribute('stroke-linejoin', 'round');
            svg.appendChild(triangle);

            const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            line.setAttribute('d', 'M12 9V13');
            line.setAttribute('stroke', 'currentColor');
            line.setAttribute('stroke-width', '2');
            line.setAttribute('stroke-linecap', 'round');
            svg.appendChild(line);

            const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            dot.setAttribute('cx', '12');
            dot.setAttribute('cy', '17');
            dot.setAttribute('r', '0.5');
            dot.setAttribute('fill', 'currentColor');
            svg.appendChild(dot);
            return svg;
        }

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', '12');
        circle.setAttribute('cy', '12');
        circle.setAttribute('r', '10');
        circle.setAttribute('stroke', 'currentColor');
        circle.setAttribute('stroke-width', '2');
        svg.appendChild(circle);

        if (this.type === 'success') {
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', 'M8 12L11 15L16 9');
            path.setAttribute('stroke', 'currentColor');
            path.setAttribute('stroke-width', '2');
            path.setAttribute('stroke-linecap', 'round');
            path.setAttribute('stroke-linejoin', 'round');
            svg.appendChild(path);
        } else if (this.type === 'error') {
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', 'M15 9L9 15M9 9L15 15');
            path.setAttribute('stroke', 'currentColor');
            path.setAttribute('stroke-width', '2');
            path.setAttribute('stroke-linecap', 'round');
            path.setAttribute('stroke-linejoin', 'round');
            svg.appendChild(path);
        } else if (this.type === 'info') {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            line.setAttribute('d', 'M12 11V16');
            line.setAttribute('stroke', 'currentColor');
            line.setAttribute('stroke-width', '2');
            line.setAttribute('stroke-linecap', 'round');
            svg.appendChild(line);

            const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            dot.setAttribute('cx', '12');
            dot.setAttribute('cy', '8');
            dot.setAttribute('r', '0.5');
            dot.setAttribute('fill', 'currentColor');
            svg.appendChild(dot);
        }

        return svg;
    }

    private getAriaLabel(): string {
        const labels = {
            success: '성공',
            error: '오류',
            warning: '경고',
            info: '정보'
        };
        
        const baseLabel = labels[this.type];
        return this.message ? `${baseLabel}: ${this.message}` : baseLabel;
    }

    updateMessage(message: string) {
        if (!this.element) return;
        
        const messageEl = this.element.querySelector('.status-icon__message');
        if (messageEl) {
            messageEl.textContent = message;
        } else {
            const newMessageEl = document.createElement('span');
            newMessageEl.className = 'status-icon__message';
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
                return new SkeletonLoader(options as any).create();
            case 'dots':
                return new DotsLoader(options).create();
            default:
                return new SpinnerLoader(options).create();
        }
    }
}
