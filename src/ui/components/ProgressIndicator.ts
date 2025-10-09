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

        this.progressElement = this.container.createDiv('progress-indicator');
        this.progressElement.addClass('sn-hidden');
        this.progressElement.addClass('sn-fade');
        this.progressElement.addClass('sn-fade-hidden');
        
        // 오버레이
        const overlay = this.progressElement.createDiv('progress-overlay');
        
        // 컨테이너
        const content = this.progressElement.createDiv('progress-content');
        
        // 스피너
        const spinner = content.createDiv('progress-spinner');
        spinner.appendChild(this.getSpinnerSVG());
        
        // 진행률 바 컨테이너
        const barContainer = content.createDiv('progress-bar-container');
        barContainer.addClass('sn-hidden');
        
        // 진행률 바
        const progressBar = barContainer.createDiv('progress-bar');
        const progressFill = progressBar.createDiv('progress-fill');
        const progressText = progressBar.createDiv('progress-text');
        progressText.setText('0%');
        
        // 메시지
        const message = content.createDiv('progress-message');
        message.setText('처리 중...');
        
        // 취소 버튼
        const cancelBtn = content.createEl('button', {
            cls: 'progress-cancel-btn',
            text: '취소'
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
    show(message?: string, showProgressBar: boolean = false, cancellable: boolean = false) {
        if (!this.progressElement) return;
        
        this.isVisible = true;
        this.currentProgress = 0;
        
        // 요소 표시
        this.progressElement.removeClass('sn-hidden');
        this.progressElement.addClass('sn-flex');
        
        // 메시지 설정
        if (message) {
            const messageEl = this.progressElement.querySelector('.progress-message') as HTMLElement;
            if (messageEl) {
                messageEl.setText(message);
            }
        }
        
        // 진행률 바 표시/숨김
        const barContainer = this.progressElement.querySelector('.progress-bar-container') as HTMLElement;
        const spinner = this.progressElement.querySelector('.progress-spinner') as HTMLElement;
        
        if (showProgressBar) {
            barContainer.removeClass('sn-hidden');
            spinner.addClass('sn-hidden');
            spinner.removeClass('is-spinning');
            this.update(0);
        } else {
            barContainer.addClass('sn-hidden');
            spinner.removeClass('sn-hidden');
            this.startSpinnerAnimation();
        }
        
        // 취소 버튼 표시/숨김
        const cancelBtn = this.progressElement.querySelector('.progress-cancel-btn') as HTMLElement;
        cancelBtn.toggleClass('sn-hidden', !cancellable);
        
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
        const progressFill = this.progressElement.querySelector('.progress-fill') as HTMLElement;
        const progressText = this.progressElement.querySelector('.progress-text') as HTMLElement;
        
        if (progressFill && progressText) {
            progressFill.style.width = `${this.currentProgress}%`;
            progressText.setText(`${Math.round(this.currentProgress)}%`);
            
            // 진행률에 따른 색상 변경
            if (this.currentProgress < 30) {
                progressFill.removeClass('progress-warning', 'progress-success');
            } else if (this.currentProgress < 70) {
                progressFill.addClass('progress-warning');
                progressFill.removeClass('progress-success');
            } else {
                progressFill.removeClass('progress-warning');
                progressFill.addClass('progress-success');
            }
        }
        
        // 메시지 업데이트
        if (message) {
            const messageEl = this.progressElement.querySelector('.progress-message') as HTMLElement;
            if (messageEl) {
                messageEl.setText(message);
            }
        }
    }

    /**
     * 진행률 업데이트 (부드러운 애니메이션)
     */
    animateProgress(targetProgress: number, duration: number = 500) {
        if (!this.isVisible || !this.progressElement) return;
        
        const startProgress = this.currentProgress;
        const startTime = performance.now();
        
        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // 이징 함수 (easeInOutQuad)
            const eased = progress < 0.5
                ? 2 * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            
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
        
        const messageEl = this.progressElement.querySelector('.progress-message') as HTMLElement;
        if (messageEl) {
            messageEl.setText(message);
        }
    }

    /**
     * 에러 상태 표시
     */
    showError(message: string) {
        if (!this.progressElement) return;
        
        this.show(message, false, false);
        
        const content = this.progressElement.querySelector('.progress-content') as HTMLElement;
        if (content) {
            content.addClass('error');
            
            // 스피너를 에러 아이콘으로 변경
            const spinner = content.querySelector('.progress-spinner') as HTMLElement;
            if (spinner) {
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
        
        const content = this.progressElement.querySelector('.progress-content') as HTMLElement;
        if (content) {
            content.addClass('success');
            
            // 스피너를 성공 아이콘으로 변경
            const spinner = content.querySelector('.progress-spinner') as HTMLElement;
            if (spinner) {
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
        const spinner = this.progressElement?.querySelector('.progress-spinner') as HTMLElement;
        if (spinner) {
            spinner.addClass('is-spinning');
        }
    }

    /**
     * 스피너 애니메이션 중지
     */
    private stopSpinnerAnimation() {
        const spinner = this.progressElement?.querySelector('.progress-spinner') as HTMLElement;
        if (spinner) {
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
    private getSpinnerSVG(): SVGElement {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '40');
        svg.setAttribute('height', '40');
        svg.setAttribute('viewBox', '0 0 40 40');

        const background = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        background.setAttribute('cx', '20');
        background.setAttribute('cy', '20');
        background.setAttribute('r', '18');
        background.setAttribute('stroke', 'currentColor');
        background.setAttribute('stroke-width', '3');
        background.setAttribute('fill', 'none');
        background.setAttribute('opacity', '0.2');
        svg.appendChild(background);

        const arc = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        arc.setAttribute('cx', '20');
        arc.setAttribute('cy', '20');
        arc.setAttribute('r', '18');
        arc.setAttribute('stroke', 'currentColor');
        arc.setAttribute('stroke-width', '3');
        arc.setAttribute('fill', 'none');
        arc.setAttribute('stroke-dasharray', '80');
        arc.setAttribute('stroke-dashoffset', '60');
        arc.setAttribute('stroke-linecap', 'round');
        svg.appendChild(arc);

        return svg;
    }

    /**
     * 성공 아이콘
     */
    private getSuccessIcon(): SVGElement {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '40');
        svg.setAttribute('height', '40');
        svg.setAttribute('viewBox', '0 0 40 40');

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', '20');
        circle.setAttribute('cy', '20');
        circle.setAttribute('r', '18');
        circle.setAttribute('stroke', 'currentColor');
        circle.setAttribute('stroke-width', '3');
        circle.setAttribute('fill', 'none');
        svg.appendChild(circle);

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M12 20L17 25L28 14');
        path.setAttribute('stroke', 'currentColor');
        path.setAttribute('stroke-width', '3');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        path.setAttribute('fill', 'none');
        svg.appendChild(path);

        return svg;
    }

    /**
     * 에러 아이콘
     */
    private getErrorIcon(): SVGElement {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '40');
        svg.setAttribute('height', '40');
        svg.setAttribute('viewBox', '0 0 40 40');

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', '20');
        circle.setAttribute('cy', '20');
        circle.setAttribute('r', '18');
        circle.setAttribute('stroke', 'currentColor');
        circle.setAttribute('stroke-width', '3');
        circle.setAttribute('fill', 'none');
        svg.appendChild(circle);

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M14 14L26 26M26 14L14 26');
        path.setAttribute('stroke', 'currentColor');
        path.setAttribute('stroke-width', '3');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        path.setAttribute('fill', 'none');
        svg.appendChild(path);

        return svg;
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
