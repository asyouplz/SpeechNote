/**
 * 로딩 인디케이터 컴포넌트 모음
 * - 스피너 애니메이션
 * - 펄스 효과
 * - 스켈레톤 로더
 * - 상태별 아이콘
 */

import { EventManager } from '../../application/EventManager';

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
        
        // 스피너 SVG
        const svg = `
            <svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
                <circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" 
                        stroke-width="4" opacity="0.3"/>
                <circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" 
                        stroke-width="4" stroke-dasharray="90" stroke-dashoffset="60"
                        stroke-linecap="round">
                    <animateTransform
                        attributeName="transform"
                        type="rotate"
                        from="0 25 25"
                        to="360 25 25"
                        dur="1s"
                        repeatCount="indefinite"/>
                </circle>
            </svg>
        `;
        
        this.element.innerHTML = svg;
        
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
            pulse.className = 'pulse-dot';
            pulse.style.animationDelay = `${i * 0.15}s`;
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
        
        for (let i = 0; i < (this.options.lines || 3); i++) {
            const line = document.createElement('div');
            line.className = `skeleton-line ${this.options.animated ? 'skeleton-animated' : ''}`;
            line.style.height = this.options.lineHeight || '20px';
            line.style.marginBottom = this.options.spacing || '10px';
            
            // 마지막 줄은 짧게
            if (i === (this.options.lines || 3) - 1) {
                line.style.width = '70%';
            }
            
            this.element.appendChild(line);
        }
        
        return this.element;
    }

    destroy() {
        this.element?.remove();
        this.element = null;
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
        iconEl.innerHTML = icon;
        
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

    private getIcon(): string {
        const icons = {
            success: `
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                    <path d="M8 12L11 15L16 9" stroke="currentColor" stroke-width="2" 
                          stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `,
            error: `
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                    <path d="M15 9L9 15M9 9L15 15" stroke="currentColor" stroke-width="2" 
                          stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `,
            warning: `
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 3L2 21H22L12 3Z" stroke="currentColor" stroke-width="2" 
                          stroke-linejoin="round"/>
                    <path d="M12 9V13" stroke="currentColor" stroke-width="2" 
                          stroke-linecap="round"/>
                    <circle cx="12" cy="17" r="0.5" fill="currentColor"/>
                </svg>
            `,
            info: `
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                    <path d="M12 11V16" stroke="currentColor" stroke-width="2" 
                          stroke-linecap="round"/>
                    <circle cx="12" cy="8" r="0.5" fill="currentColor"/>
                </svg>
            `
        };
        
        return icons[this.type];
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