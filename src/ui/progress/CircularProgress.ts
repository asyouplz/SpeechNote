/**
 * 원형 진행률 표시 컴포넌트
 * 
 * SVG 기반의 원형 진행률 표시기를 제공합니다.
 */

export interface CircularProgressOptions {
    size?: number;
    strokeWidth?: number;
    progress?: number;
    showPercentage?: boolean;
    color?: string;
    backgroundColor?: string;
    animated?: boolean;
    animationDuration?: number;
    clockwise?: boolean;
}

export class CircularProgress {
    protected element: HTMLElement | null = null;
    protected svg: SVGElement | null = null;
    protected progressCircle: SVGPathElement | null = null;
    protected backgroundCircle: SVGPathElement | null = null;
    protected percentageText: SVGTextElement | null = null;
    protected options: Required<CircularProgressOptions>;
    protected currentProgress: number = 0;
    protected animationFrame: number | null = null;

    constructor(options: CircularProgressOptions = {}) {
        this.options = {
            size: 100,
            strokeWidth: 8,
            progress: 0,
            showPercentage: true,
            color: 'var(--interactive-accent)',
            backgroundColor: 'var(--background-modifier-border)',
            animated: true,
            animationDuration: 500,
            clockwise: true,
            ...options
        };
        
        this.currentProgress = this.options.progress;
    }

    create(container: HTMLElement): HTMLElement {
        this.element = document.createElement('div');
        this.element.className = 'circular-progress';
        this.element.style.width = `${this.options.size}px`;
        this.element.style.height = `${this.options.size}px`;
        
        // SVG 생성
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.setAttribute('width', String(this.options.size));
        this.svg.setAttribute('height', String(this.options.size));
        this.svg.setAttribute('viewBox', `0 0 ${this.options.size} ${this.options.size}`);
        
        const center = this.options.size / 2;
        const radius = center - this.options.strokeWidth / 2;
        const circumference = 2 * Math.PI * radius;
        
        // 배경 원
        this.backgroundCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        this.backgroundCircle.setAttribute('cx', String(center));
        this.backgroundCircle.setAttribute('cy', String(center));
        this.backgroundCircle.setAttribute('r', String(radius));
        this.backgroundCircle.setAttribute('fill', 'none');
        this.backgroundCircle.setAttribute('stroke', this.options.backgroundColor);
        this.backgroundCircle.setAttribute('stroke-width', String(this.options.strokeWidth));
        
        // 진행률 원
        this.progressCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        this.progressCircle.setAttribute('cx', String(center));
        this.progressCircle.setAttribute('cy', String(center));
        this.progressCircle.setAttribute('r', String(radius));
        this.progressCircle.setAttribute('fill', 'none');
        this.progressCircle.setAttribute('stroke', this.options.color);
        this.progressCircle.setAttribute('stroke-width', String(this.options.strokeWidth));
        this.progressCircle.setAttribute('stroke-linecap', 'round');
        this.progressCircle.setAttribute('stroke-dasharray', String(circumference));
        
        // 회전 방향 설정
        if (this.options.clockwise) {
            this.progressCircle.setAttribute('transform', `rotate(-90 ${center} ${center})`);
        } else {
            this.progressCircle.setAttribute('transform', `rotate(90 ${center} ${center}) scale(1, -1)`);
        }
        
        // 초기 진행률 설정
        const offset = circumference - (this.currentProgress / 100) * circumference;
        this.progressCircle.setAttribute('stroke-dashoffset', String(offset));
        
        // 애니메이션 설정
        if (this.options.animated) {
            this.progressCircle.style.transition = `stroke-dashoffset ${this.options.animationDuration}ms ease-in-out`;
        }
        
        this.svg.appendChild(this.backgroundCircle);
        this.svg.appendChild(this.progressCircle);
        
        // 퍼센트 텍스트
        if (this.options.showPercentage) {
            this.percentageText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            this.percentageText.setAttribute('x', String(center));
            this.percentageText.setAttribute('y', String(center));
            this.percentageText.setAttribute('text-anchor', 'middle');
            this.percentageText.setAttribute('dominant-baseline', 'middle');
            this.percentageText.setAttribute('font-size', String(this.options.size / 4));
            this.percentageText.setAttribute('fill', 'var(--text-normal)');
            this.percentageText.textContent = `${Math.round(this.currentProgress)}%`;
            this.svg.appendChild(this.percentageText);
        }
        
        this.element.appendChild(this.svg);
        
        // ARIA 속성
        this.element.setAttribute('role', 'progressbar');
        this.element.setAttribute('aria-valuenow', String(this.currentProgress));
        this.element.setAttribute('aria-valuemin', '0');
        this.element.setAttribute('aria-valuemax', '100');
        
        container.appendChild(this.element);
        
        return this.element;
    }

    /**
     * 진행률 업데이트
     */
    updateProgress(progress: number, animate: boolean = true): void {
        if (!this.progressCircle) return;
        
        const clampedProgress = Math.min(100, Math.max(0, progress));
        
        if (animate && this.options.animated) {
            this.animateProgress(clampedProgress);
        } else {
            this.setProgressImmediate(clampedProgress);
        }
    }

    /**
     * 즉시 진행률 설정
     */
    private setProgressImmediate(progress: number): void {
        if (!this.progressCircle) return;
        
        this.currentProgress = progress;
        
        const center = this.options.size / 2;
        const radius = center - this.options.strokeWidth / 2;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (progress / 100) * circumference;
        
        this.progressCircle.setAttribute('stroke-dashoffset', String(offset));
        
        if (this.percentageText) {
            this.percentageText.textContent = `${Math.round(progress)}%`;
        }
        
        if (this.element) {
            this.element.setAttribute('aria-valuenow', String(progress));
        }
    }

    /**
     * 애니메이션으로 진행률 업데이트
     */
    private animateProgress(targetProgress: number): void {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        const startProgress = this.currentProgress;
        const startTime = performance.now();
        const duration = this.options.animationDuration;
        
        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function
            const eased = this.easeInOutQuad(progress);
            
            const currentValue = startProgress + (targetProgress - startProgress) * eased;
            this.setProgressImmediate(currentValue);
            
            if (progress < 1) {
                this.animationFrame = requestAnimationFrame(animate);
            }
        };
        
        this.animationFrame = requestAnimationFrame(animate);
    }

    /**
     * Easing 함수
     */
    private easeInOutQuad(t: number): number {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    /**
     * 색상 변경
     */
    setColor(color: string): void {
        this.options.color = color;
        if (this.progressCircle) {
            this.progressCircle.setAttribute('stroke', color);
        }
    }

    /**
     * 배경색 변경
     */
    setBackgroundColor(color: string): void {
        this.options.backgroundColor = color;
        if (this.backgroundCircle) {
            this.backgroundCircle.setAttribute('stroke', color);
        }
    }

    /**
     * 퍼센트 표시 토글
     */
    togglePercentage(show: boolean): void {
        this.options.showPercentage = show;
        
        if (this.percentageText) {
            this.percentageText.style.display = show ? 'block' : 'none';
        }
    }

    /**
     * 초기화
     */
    reset(): void {
        this.updateProgress(0, false);
    }

    /**
     * 정리
     */
    destroy(): void {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        this.element?.remove();
        this.element = null;
        this.svg = null;
        this.progressCircle = null;
        this.backgroundCircle = null;
        this.percentageText = null;
    }
}

/**
 * 반원형 진행률 표시 컴포넌트
 */
export class SemiCircularProgress extends CircularProgress {
    create(container: HTMLElement): HTMLElement {
        this.element = document.createElement('div');
        this.element.className = 'semi-circular-progress';
        this.element.style.width = `${this.options.size}px`;
        this.element.style.height = `${this.options.size / 2}px`;
        
        // SVG 생성
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.setAttribute('width', String(this.options.size));
        this.svg.setAttribute('height', String(this.options.size / 2));
        this.svg.setAttribute('viewBox', `0 0 ${this.options.size} ${this.options.size / 2}`);
        
        const center = this.options.size / 2;
        const radius = center - this.options.strokeWidth / 2;
        const circumference = Math.PI * radius; // 반원이므로 PI * r
        
        // 배경 반원
        this.backgroundCircle = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const backgroundPath = this.describeArc(center, center, radius, 0, 180);
        this.backgroundCircle.setAttribute('d', backgroundPath);
        this.backgroundCircle.setAttribute('fill', 'none');
        this.backgroundCircle.setAttribute('stroke', this.options.backgroundColor);
        this.backgroundCircle.setAttribute('stroke-width', String(this.options.strokeWidth));
        
        // 진행률 반원
        this.progressCircle = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this.progressCircle.setAttribute('d', backgroundPath);
        this.progressCircle.setAttribute('fill', 'none');
        this.progressCircle.setAttribute('stroke', this.options.color);
        this.progressCircle.setAttribute('stroke-width', String(this.options.strokeWidth));
        this.progressCircle.setAttribute('stroke-linecap', 'round');
        this.progressCircle.setAttribute('stroke-dasharray', String(circumference));
        
        // 초기 진행률 설정
        const offset = circumference - (this.currentProgress / 100) * circumference;
        this.progressCircle.setAttribute('stroke-dashoffset', String(offset));
        
        // 애니메이션 설정
        if (this.options.animated) {
            this.progressCircle.style.transition = `stroke-dashoffset ${this.options.animationDuration}ms ease-in-out`;
        }
        
        this.svg.appendChild(this.backgroundCircle);
        this.svg.appendChild(this.progressCircle);
        
        // 퍼센트 텍스트
        if (this.options.showPercentage) {
            this.percentageText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            this.percentageText.setAttribute('x', String(center));
            this.percentageText.setAttribute('y', String(center - 10));
            this.percentageText.setAttribute('text-anchor', 'middle');
            this.percentageText.setAttribute('font-size', String(this.options.size / 5));
            this.percentageText.setAttribute('fill', 'var(--text-normal)');
            this.percentageText.textContent = `${Math.round(this.currentProgress)}%`;
            this.svg.appendChild(this.percentageText);
        }
        
        this.element.appendChild(this.svg);
        
        // ARIA 속성
        this.element.setAttribute('role', 'progressbar');
        this.element.setAttribute('aria-valuenow', String(this.currentProgress));
        this.element.setAttribute('aria-valuemin', '0');
        this.element.setAttribute('aria-valuemax', '100');
        
        container.appendChild(this.element);
        
        return this.element;
    }

    /**
     * 호 경로 생성
     */
    private describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number): string {
        const start = this.polarToCartesian(x, y, radius, endAngle);
        const end = this.polarToCartesian(x, y, radius, startAngle);
        const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
        
        return [
            'M', start.x, start.y,
            'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y
        ].join(' ');
    }

    /**
     * 극좌표를 직교좌표로 변환
     */
    private polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number): { x: number; y: number } {
        const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
        
        return {
            x: centerX + (radius * Math.cos(angleInRadians)),
            y: centerY + (radius * Math.sin(angleInRadians))
        };
    }
}