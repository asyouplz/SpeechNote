/**
 * 진행률 바 컴포넌트
 * - 파일 업로드 진행률
 * - API 처리 진행률
 * - 전체 작업 진행률
 * - 예상 남은 시간 표시
 */

import { EventManager } from '../../application/EventManager';

export interface ProgressBarOptions {
    min?: number;
    max?: number;
    value?: number;
    label?: string;
    showPercentage?: boolean;
    showTimeRemaining?: boolean;
    animated?: boolean;
    color?: 'primary' | 'success' | 'warning' | 'error';
    size?: 'small' | 'medium' | 'large';
    striped?: boolean;
    indeterminate?: boolean;
}

export interface ProgressStep {
    id: string;
    label: string;
    weight: number; // 전체 진행률에서 차지하는 비중 (0-1)
    status: 'pending' | 'active' | 'completed' | 'error';
}

/**
 * 진행률 바 컴포넌트
 */
export class ProgressBar {
    private element: HTMLElement | null = null;
    private progressFill: HTMLElement | null = null;
    private labelElement: HTMLElement | null = null;
    private percentageElement: HTMLElement | null = null;
    private timeRemainingElement: HTMLElement | null = null;
    private options: ProgressBarOptions;
    private startTime = 0;
    private currentValue = 0;
    private animationFrame: number | null = null;
    private eventManager: EventManager;

    constructor(options: ProgressBarOptions = {}) {
        this.options = {
            min: 0,
            max: 100,
            value: 0,
            showPercentage: true,
            showTimeRemaining: false,
            animated: true,
            color: 'primary',
            size: 'medium',
            striped: false,
            indeterminate: false,
            ...options
        };
        
        this.currentValue = this.options.value || 0;
        this.eventManager = EventManager.getInstance();
    }

    create(container: HTMLElement): HTMLElement {
        this.element = createEl('div', {
            cls: `progress-bar progress-bar--${this.options.size} progress-bar--${this.options.color}`
        });
        this.element.setAttribute('role', 'progressbar');
        this.element.setAttribute('aria-valuemin', String(this.options.min));
        this.element.setAttribute('aria-valuemax', String(this.options.max));
        this.element.setAttribute('aria-valuenow', String(this.currentValue));

        if (this.options.label) {
            this.element.setAttribute('aria-label', this.options.label);
        }

        // 라벨
        if (this.options.label) {
            this.labelElement = createEl('div', {
                cls: 'progress-bar__label',
                text: this.options.label
            });
            this.element.appendChild(this.labelElement);
        }

        // 진행률 바 컨테이너
        const barContainer = createEl('div', { cls: 'progress-bar__container' });

        // 진행률 채우기
        this.progressFill = createEl('div', { cls: 'progress-bar__fill' });
        
        if (this.options.striped) {
            this.progressFill.classList.add('progress-bar__fill--striped');
        }
        
        if (this.options.indeterminate) {
            this.progressFill.classList.add('progress-bar__fill--indeterminate');
        } else {
            this.updateProgress(this.currentValue);
        }
        
        barContainer.appendChild(this.progressFill);
        this.element.appendChild(barContainer);

        // 정보 표시 영역
        const infoContainer = createEl('div', { cls: 'progress-bar__info' });

        // 퍼센트 표시
        if (this.options.showPercentage && !this.options.indeterminate) {
            this.percentageElement = createEl('span', {
                cls: 'progress-bar__percentage',
                text: '0%'
            });
            infoContainer.appendChild(this.percentageElement);
        }

        // 예상 시간 표시
        if (this.options.showTimeRemaining && !this.options.indeterminate) {
            this.timeRemainingElement = createEl('span', {
                cls: 'progress-bar__time-remaining',
                text: '계산 중...'
            });
            infoContainer.appendChild(this.timeRemainingElement);
        }
        
        if (infoContainer.children.length > 0) {
            this.element.appendChild(infoContainer);
        }
        
        container.appendChild(this.element);
        
        return this.element;
    }

    /**
     * 진행률 업데이트
     */
    updateProgress(value: number, animate = true) {
        if (!this.progressFill || this.options.indeterminate) return;
        
        const clampedValue = Math.max(this.options.min || 0, Math.min(this.options.max || 100, value));
        const percentage = ((clampedValue - (this.options.min || 0)) / ((this.options.max || 100) - (this.options.min || 0))) * 100;
        
        if (animate && this.options.animated) {
            this.animateToValue(clampedValue, percentage);
        } else {
            this.setProgressImmediate(clampedValue, percentage);
        }
        
        // 이벤트 발생
        this.eventManager.emit('progress:update', {
            value: clampedValue,
            percentage,
            min: this.options.min,
            max: this.options.max
        });
    }

    /**
     * 즉시 진행률 설정
     */
    private setProgressImmediate(value: number, percentage: number) {
        if (!this.progressFill) return;
        
        this.currentValue = value;
        this.progressFill.style.setProperty('--sn-progress-width', `${percentage}%`);
        
        if (this.element) {
            this.element.setAttribute('aria-valuenow', String(value));
        }
        
        if (this.percentageElement) {
            this.percentageElement.textContent = `${Math.round(percentage)}%`;
        }
        
        this.updateTimeRemaining(percentage);
    }

    /**
     * 애니메이션으로 진행률 업데이트
     */
    private animateToValue(targetValue: number, _targetPercentage: number) {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        const startValue = this.currentValue;
        const startTime = performance.now();
        const duration = 300; // ms
        
        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (easeInOutQuad)
            const eased = progress < 0.5
                ? 2 * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            
            const currentValue = startValue + (targetValue - startValue) * eased;
            const currentPercentage = ((currentValue - (this.options.min || 0)) / ((this.options.max || 100) - (this.options.min || 0))) * 100;
            
            this.setProgressImmediate(currentValue, currentPercentage);
            
            if (progress < 1) {
                this.animationFrame = requestAnimationFrame(animate);
            }
        };
        
        this.animationFrame = requestAnimationFrame(animate);
    }

    /**
     * 예상 남은 시간 업데이트
     */
    private updateTimeRemaining(percentage: number) {
        if (!this.timeRemainingElement || percentage === 0) return;
        
        if (!this.startTime) {
            this.startTime = Date.now();
            this.timeRemainingElement.textContent = '계산 중...';
            return;
        }
        
        const elapsed = Date.now() - this.startTime;
        const estimatedTotal = (elapsed / percentage) * 100;
        const remaining = estimatedTotal - elapsed;
        
        if (remaining > 0) {
            this.timeRemainingElement.textContent = `남은 시간: ${this.formatTime(remaining)}`;
        } else {
            this.timeRemainingElement.textContent = '거의 완료...';
        }
    }

    /**
     * 시간 포맷팅
     */
    private formatTime(milliseconds: number): string {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}시간 ${minutes % 60}분`;
        } else if (minutes > 0) {
            return `${minutes}분 ${seconds % 60}초`;
        } else {
            return `${seconds}초`;
        }
    }

    /**
     * 진행률 초기화
     */
    reset() {
        this.currentValue = this.options.min || 0;
        this.startTime = 0;
        
        if (this.progressFill) {
            this.progressFill.style.setProperty('--sn-progress-width', '0%');
        }
        
        if (this.percentageElement) {
            this.percentageElement.textContent = '0%';
        }
        
        if (this.timeRemainingElement) {
            this.timeRemainingElement.textContent = '';
        }
        
        if (this.element) {
            this.element.setAttribute('aria-valuenow', String(this.options.min || 0));
        }
    }

    /**
     * 색상 변경
     */
    setColor(color: 'primary' | 'success' | 'warning' | 'error') {
        if (!this.element) return;
        
        // 기존 색상 클래스 제거
        this.element.classList.remove(
            'progress-bar--primary',
            'progress-bar--success',
            'progress-bar--warning',
            'progress-bar--error'
        );
        
        // 새 색상 클래스 추가
        this.element.classList.add(`progress-bar--${color}`);
        this.options.color = color;
    }

    /**
     * 라벨 업데이트
     */
    setLabel(label: string) {
        if (!this.labelElement) {
            this.labelElement = createEl('div', { cls: 'progress-bar__label' });
            this.element?.insertBefore(this.labelElement, this.element.firstChild);
        }

        this.labelElement.textContent = label;
        this.element?.setAttribute('aria-label', label);
    }

    /**
     * Indeterminate 모드 토글
     */
    setIndeterminate(indeterminate: boolean) {
        this.options.indeterminate = indeterminate;
        
        if (!this.progressFill) return;
        
        if (indeterminate) {
            this.progressFill.classList.add('progress-bar__fill--indeterminate');
            this.progressFill.removeAttribute('style');
            
            if (this.percentageElement) {
                this.percentageElement.classList.add('sn-hidden');
            }
            if (this.timeRemainingElement) {
                this.timeRemainingElement.classList.add('sn-hidden');
            }
        } else {
            this.progressFill.classList.remove('progress-bar__fill--indeterminate');
            this.updateProgress(this.currentValue);
            
            if (this.percentageElement) {
                this.percentageElement.classList.remove('sn-hidden');
            }
            if (this.timeRemainingElement) {
                this.timeRemainingElement.classList.remove('sn-hidden');
            }
        }
    }

    /**
     * 컴포넌트 제거
     */
    destroy() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        this.element?.remove();
        this.element = null;
        this.progressFill = null;
        this.labelElement = null;
        this.percentageElement = null;
        this.timeRemainingElement = null;
    }
}

/**
 * 다단계 진행률 바
 */
export class MultiStepProgressBar {
    private element: HTMLElement | null = null;
    private steps: ProgressStep[] = [];
    private currentStepIndex = -1;
    private overallProgress = 0;
    private progressBar: ProgressBar;
    private stepsContainer: HTMLElement | null = null;
    private eventManager: EventManager;

    constructor(steps: ProgressStep[]) {
        this.steps = steps;
        this.progressBar = new ProgressBar({
            showPercentage: true,
            showTimeRemaining: true,
            animated: true
        });
        this.eventManager = EventManager.getInstance();
    }

    create(container: HTMLElement): HTMLElement {
        this.element = createEl('div', { cls: 'multi-step-progress' });

        // 단계 표시
        this.stepsContainer = createEl('div', { cls: 'multi-step-progress__steps' });

        this.steps.forEach((step, index) => {
            const stepEl = createEl('div', { cls: 'step' });
            stepEl.setAttribute('data-step-id', step.id);

            const stepNumber = createEl('span', {
                cls: 'step__number',
                text: String(index + 1)
            });

            const stepLabel = createEl('span', {
                cls: 'step__label',
                text: step.label
            });

            stepEl.appendChild(stepNumber);
            stepEl.appendChild(stepLabel);

            this.stepsContainer!.appendChild(stepEl);

            // 단계 사이 연결선
            if (index < this.steps.length - 1) {
                const connector = createEl('div', { cls: 'step-connector' });
                this.stepsContainer!.appendChild(connector);
            }
        });

        this.element.appendChild(this.stepsContainer);

        // 전체 진행률 바
        const progressContainer = createEl('div', { cls: 'multi-step-progress__bar' });
        this.progressBar.create(progressContainer);
        this.element.appendChild(progressContainer);
        
        container.appendChild(this.element);
        
        return this.element;
    }

    /**
     * 단계 시작
     */
    startStep(stepId: string) {
        const stepIndex = this.steps.findIndex(s => s.id === stepId);
        if (stepIndex === -1) return;
        
        this.currentStepIndex = stepIndex;
        const step = this.steps[stepIndex];
        
        // 이전 단계들을 완료로 표시
        for (let i = 0; i < stepIndex; i++) {
            this.updateStepStatus(this.steps[i].id, 'completed');
        }
        
        // 현재 단계를 활성화
        this.updateStepStatus(stepId, 'active');
        
        // 전체 진행률 계산
        this.calculateOverallProgress();
        
        // 라벨 업데이트
        this.progressBar.setLabel(step.label);
        
        // 이벤트 발생
        this.eventManager.emit('step:start', { stepId, step });
    }

    /**
     * 단계 완료
     */
    completeStep(stepId: string, progress = 100) {
        const step = this.steps.find(s => s.id === stepId);
        if (!step) return;
        
        step.status = 'completed';
        this.updateStepStatus(stepId, 'completed');
        
        // 전체 진행률 계산
        this.calculateOverallProgress(progress);
        
        // 이벤트 발생
        this.eventManager.emit('step:complete', { stepId, step });
        
        // 다음 단계 자동 시작
        const nextIndex = this.currentStepIndex + 1;
        if (nextIndex < this.steps.length) {
            setTimeout(() => {
                this.startStep(this.steps[nextIndex].id);
            }, 300);
        }
    }

    /**
     * 단계 상태 업데이트
     */
    private updateStepStatus(stepId: string, status: ProgressStep['status']) {
        const step = this.steps.find(s => s.id === stepId);
        if (!step) return;
        
        step.status = status;
        
        const stepEl = this.stepsContainer?.querySelector(`[data-step-id="${stepId}"]`);
        if (stepEl) {
            stepEl.className = `step step--${status}`;
            
            // ARIA 속성 업데이트
            switch (status) {
                case 'completed':
                    stepEl.setAttribute('aria-label', `${step.label} 완료`);
                    break;
                case 'active':
                    stepEl.setAttribute('aria-label', `${step.label} 진행 중`);
                    stepEl.setAttribute('aria-current', 'step');
                    break;
                case 'error':
                    stepEl.setAttribute('aria-label', `${step.label} 오류`);
                    break;
            }
        }
    }

    /**
     * 전체 진행률 계산
     */
    private calculateOverallProgress(currentStepProgress = 0) {
        let totalProgress = 0;
        
        this.steps.forEach((step, index) => {
            if (step.status === 'completed') {
                totalProgress += step.weight * 100;
            } else if (index === this.currentStepIndex) {
                totalProgress += step.weight * currentStepProgress;
            }
        });
        
        this.overallProgress = totalProgress;
        this.progressBar.updateProgress(this.overallProgress);
    }

    /**
     * 오류 처리
     */
    setError(stepId: string, error: string) {
        this.updateStepStatus(stepId, 'error');
        this.progressBar.setColor('error');
        this.progressBar.setLabel(`오류: ${error}`);
        
        // 이벤트 발생
        this.eventManager.emit('step:error', { stepId, error });
    }

    /**
     * 초기화
     */
    reset() {
        this.currentStepIndex = -1;
        this.overallProgress = 0;
        
        this.steps.forEach(step => {
            step.status = 'pending';
            this.updateStepStatus(step.id, 'pending');
        });
        
        this.progressBar.reset();
        this.progressBar.setColor('primary');
    }

    /**
     * 컴포넌트 제거
     */
    destroy() {
        this.progressBar.destroy();
        this.element?.remove();
        this.element = null;
        this.stepsContainer = null;
    }
}
