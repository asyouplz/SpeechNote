import { createIconElement } from '../../utils/common/helpers';

/**
 * 진행 상태 표시 컴포넌트
 * - 로딩 스피너
 * - 진행률 바
 * - 상태 메시지
 * - 취소 기능
 */
export class ProgressIndicator {
    private container: HTMLElement | null = null;
    private progressElement: HTMLElement | null = null;
    private isVisible = false;
    private currentProgress = 0;
    private cancelCallback: (() => void) | null = null;
    private animationFrame: number | null = null;

    /**
     * 컴포넌트 마운트
     */
    mount(container: HTMLElement) {
        this.container = container;
        this.createProgressElement();
    }

    /**
     * 컴포넌트 언마운트
     */
    unmount() {
        this.hide();
        this.progressElement?.remove();
        this.container = null;
        this.progressElement = null;
    }

    /**
     * 진행 상태 요소 생성
     */
    private createProgressElement() {
        if (!this.container) return;

        this.progressElement = this.container.createDiv('sn-progress-indicator');
        this.progressElement.addClass('sn-hidden');
        this.progressElement.addClass('sn-fade');
        this.progressElement.addClass('sn-fade-hidden');

        // 오버레이
        this.progressElement.createDiv('sn-progress-overlay');

        // 컨테이너
        const content = this.progressElement.createDiv('sn-progress-content');

        // 스피너
        const spinner = content.createDiv('sn-progress-spinner');
        spinner.appendChild(this.getSpinnerElement());

        // 진행률 바 컨테이너
        const barContainer = content.createDiv('sn-progress-bar-container');
        barContainer.addClass('sn-hidden');

        // 진행률 바
        const progressBar = barContainer.createDiv('sn-progress-bar');
        progressBar.createDiv('sn-progress-fill');
        const progressText = progressBar.createDiv('sn-progress-text');
        progressText.setText('0%');

        // 메시지
        const message = content.createDiv('sn-progress-message');
        message.setText('Processing...');

        // 취소 버튼
        const cancelBtn = content.createEl('button', {
            cls: 'sn-progress-cancel-btn',
            text: 'Cancel',
        });
        cancelBtn.addClass('sn-hidden');
        cancelBtn.addEventListener('click', () => {
            if (this.cancelCallback) {
                this.cancelCallback();
            }
            this.hide();
        });
    }

    /**
     * 진행 상태 표시
     */
    show(message?: string, showProgressBar = false, cancellable = false) {
        if (!this.progressElement) return;

        this.isVisible = true;
        this.currentProgress = 0;

        // 요소 표시
        this.progressElement.removeClass('sn-hidden');
        this.progressElement.addClass('sn-flex');

        // 메시지 설정
        if (message) {
            const namespacedMessageEl = this.progressElement.querySelector('.sn-progress-message');
            if (namespacedMessageEl instanceof HTMLElement) {
                namespacedMessageEl.setText(message);
            }
        }

        // 진행률 바 표시/숨김
        const barContainer = this.progressElement.querySelector('.sn-progress-bar-container');
        const spinner = this.progressElement.querySelector('.sn-progress-spinner');

        if (showProgressBar) {
            if (barContainer instanceof HTMLElement) {
                barContainer.removeClass('sn-hidden');
            }
            if (spinner instanceof HTMLElement) {
                spinner.addClass('sn-hidden');
                spinner.removeClass('is-spinning');
            }
            this.update(0);
        } else {
            if (barContainer instanceof HTMLElement) {
                barContainer.addClass('sn-hidden');
            }
            if (spinner instanceof HTMLElement) {
                spinner.removeClass('sn-hidden');
            }
            this.startSpinnerAnimation();
        }

        // 취소 버튼 표시/숨김
        const cancelBtn = this.progressElement.querySelector('.sn-progress-cancel-btn');
        if (cancelBtn instanceof HTMLElement) {
            cancelBtn.toggleClass('sn-hidden', !cancellable);
        }

        // 페이드인 애니메이션
        this.fadeIn();
    }

    /**
     * 진행 상태 숨기기
     */
    hide() {
        if (!this.progressElement) return;

        this.isVisible = false;
        this.stopSpinnerAnimation();

        // 페이드아웃 애니메이션
        this.fadeOut(() => {
            if (this.progressElement) {
                this.progressElement.addClass('sn-hidden');
                this.progressElement.removeClass('sn-flex');
            }
        });
    }

    /**
     * 진행률 업데이트
     */
    update(progress: number, message?: string) {
        if (!this.isVisible || !this.progressElement) return;

        this.currentProgress = Math.min(100, Math.max(0, progress));

        // 진행률 바 업데이트
        const progressFill = this.progressElement.querySelector('.sn-progress-fill');
        const progressText = this.progressElement.querySelector('.sn-progress-text');

        if (progressFill instanceof HTMLElement && progressText instanceof HTMLElement) {
            progressFill.setAttribute('style', `--sn-progress-width:${this.currentProgress}%`);
            progressText.setText(`${Math.round(this.currentProgress)}%`);

            // 진행률에 따른 색상 변경
            if (this.currentProgress < 30) {
                progressFill.removeClass('is-warning', 'is-success');
            } else if (this.currentProgress < 70) {
                progressFill.addClass('is-warning');
                progressFill.removeClass('is-success');
            } else {
                progressFill.removeClass('is-warning');
                progressFill.addClass('is-success');
            }
        }

        // 메시지 업데이트
        if (message) {
            const messageEl = this.progressElement.querySelector('.sn-progress-message');
            if (messageEl instanceof HTMLElement) {
                messageEl.setText(message);
            }
        }
    }

    /**
     * 진행률 업데이트 (부드러운 애니메이션)
     */
    animateProgress(targetProgress: number, duration = 500) {
        if (!this.isVisible || !this.progressElement) return;

        const startProgress = this.currentProgress;
        const startTime = performance.now();

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // 이징 함수 (easeInOutQuad)
            const eased =
                progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;

            const currentValue = startProgress + (targetProgress - startProgress) * eased;
            this.update(currentValue);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }

    /**
     * 메시지 설정
     */
    setMessage(message: string) {
        if (!this.progressElement) return;

        const messageEl = this.progressElement.querySelector('.sn-progress-message');
        if (messageEl instanceof HTMLElement) {
            messageEl.setText(message);
        }
    }

    /**
     * 에러 상태 표시
     */
    showError(message: string) {
        if (!this.progressElement) return;

        this.show(message, false, false);

        const content = this.progressElement.querySelector('.sn-progress-content');
        if (content instanceof HTMLElement) {
            content.addClass('is-error');

            // 스피너를 에러 아이콘으로 변경
            const spinner = content.querySelector('.sn-progress-spinner');
            if (spinner instanceof HTMLElement) {
                spinner.replaceChildren(this.getErrorIcon());
            }
        }

        // 3초 후 자동 숨김
        setTimeout(() => this.hide(), 3000);
    }

    /**
     * 성공 상태 표시
     */
    showSuccess(message: string) {
        if (!this.progressElement) return;

        this.show(message, false, false);

        const content = this.progressElement.querySelector('.sn-progress-content');
        if (content instanceof HTMLElement) {
            content.addClass('is-success');

            // 스피너를 성공 아이콘으로 변경
            const spinner = content.querySelector('.sn-progress-spinner');
            if (spinner instanceof HTMLElement) {
                spinner.replaceChildren(this.getSuccessIcon());
            }
        }

        // 2초 후 자동 숨김
        setTimeout(() => this.hide(), 2000);
    }

    /**
     * 취소 콜백 설정
     */
    onCancel(callback: () => void) {
        this.cancelCallback = callback;
    }

    /**
     * 스피너 애니메이션 시작
     */
    private startSpinnerAnimation() {
        const spinner = this.progressElement?.querySelector('.sn-progress-spinner');
        if (spinner instanceof HTMLElement) {
            spinner.addClass('is-spinning');
        }
    }

    /**
     * 스피너 애니메이션 중지
     */
    private stopSpinnerAnimation() {
        const spinner = this.progressElement?.querySelector('.sn-progress-spinner');
        if (spinner instanceof HTMLElement) {
            spinner.removeClass('is-spinning');
        }
    }

    /**
     * 페이드인 애니메이션
     */
    private fadeIn() {
        if (!this.progressElement) return;

        this.progressElement.removeClass('sn-fade-hidden');
        requestAnimationFrame(() => {
            this.progressElement?.addClass('sn-fade-visible');
        });
    }

    /**
     * 페이드아웃 애니메이션
     */
    private fadeOut(callback?: () => void) {
        if (!this.progressElement) return;

        this.progressElement.removeClass('sn-fade-visible');
        this.progressElement.addClass('sn-fade-hidden');

        setTimeout(() => {
            if (callback) {
                callback();
            }
        }, 300);
    }

    /**
     * 스피너 SVG
     */
    private getSpinnerElement(): HTMLElement {
        const spinner = createEl('div', { cls: 'sn-progress-spinner__glyph' });
        spinner.setAttribute('aria-hidden', 'true');
        return spinner;
    }

    /**
     * 성공 아이콘
     */
    private getSuccessIcon(): HTMLElement {
        return createIconElement('check');
    }

    /**
     * 에러 아이콘
     */
    private getErrorIcon(): HTMLElement {
        return createIconElement('x');
    }

    /**
     * 현재 진행률 가져오기
     */
    getProgress(): number {
        return this.currentProgress;
    }

    /**
     * 표시 상태 확인
     */
    isShowing(): boolean {
        return this.isVisible;
    }
}
