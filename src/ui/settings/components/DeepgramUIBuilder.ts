/**
 * Deepgram UI 빌더
 * UI 컴포넌트 생성과 렌더링 책임 분리
 */

import { UI_CONSTANTS, CONFIG_CONSTANTS } from '../../../config/DeepgramConstants';
import { DeepgramModel } from '../../../config/DeepgramModelRegistry';

export class DeepgramUIBuilder {
    private containerEl: HTMLElement;

    constructor(containerEl: HTMLElement) {
        this.containerEl = containerEl;
    }

    /**
     * 섹션 헤더 생성
     */
    public createHeader(text: string): HTMLElement {
        return this.containerEl.createEl('h4', { text });
    }

    /**
     * 설명 텍스트 생성
     */
    public createDescription(text: string): HTMLElement {
        const descEl = this.containerEl.createEl('p', { 
            text,
            cls: UI_CONSTANTS.CLASSES.SETTING_DESCRIPTION
        });
        descEl.addClass(UI_CONSTANTS.STYLES.DESCRIPTION_MARGIN);
        return descEl;
    }

    /**
     * 경고 박스 생성
     */
    public createWarning(text: string): HTMLElement {
        const warningEl = this.containerEl.createEl('div', {
            cls: UI_CONSTANTS.CLASSES.WARNING,
            text
        });
        warningEl.addClass(UI_CONSTANTS.STYLES.WARNING_BOX);
        return warningEl;
    }

    /**
     * 모델 정보 카드 생성
     */
    public createModelInfoCard(model: DeepgramModel): HTMLElement {
        // 기존 정보 제거
        this.removeElement(`.${UI_CONSTANTS.CLASSES.MODEL_INFO}`);

        // 모델 정보 컨테이너
        const infoContainer = this.containerEl.createEl('div', { 
            cls: UI_CONSTANTS.CLASSES.MODEL_INFO 
        });
        infoContainer.addClass(UI_CONSTANTS.STYLES.INFO_CONTAINER);

        // 모델 설명
        infoContainer.createEl('p', { 
            text: model.description,
            cls: UI_CONSTANTS.CLASSES.MODEL_DESCRIPTION
        });

        // 성능 지표
        this.createMetricsRow(infoContainer, model);

        // 지원 언어
        this.createLanguagesRow(infoContainer, model);

        return infoContainer;
    }

    /**
     * 성능 지표 행 생성
     */
    private createMetricsRow(container: HTMLElement, model: DeepgramModel): void {
        const metricsEl = container.createEl('div', { 
            cls: UI_CONSTANTS.CLASSES.MODEL_METRICS 
        });
        metricsEl.addClass(UI_CONSTANTS.STYLES.METRICS_ROW);
        
        metricsEl.createEl('span', { 
            text: `Accuracy: ${model.performance.accuracy}%`
        });
        metricsEl.createEl('span', { 
            text: `Speed: ${model.performance.speed}`
        });
        metricsEl.createEl('span', { 
            text: `Latency: ${model.performance.latency}`
        });
    }

    /**
     * 지원 언어 행 생성
     */
    private createLanguagesRow(container: HTMLElement, model: DeepgramModel): void {
        const langEl = container.createEl('div', { 
            cls: UI_CONSTANTS.CLASSES.SUPPORTED_LANGUAGES 
        });
        langEl.addClass(UI_CONSTANTS.STYLES.LANGUAGES_ROW);
        langEl.createEl('span', { 
            text: `Supported languages: ${model.languages.join(', ')}`
        });
    }

    /**
     * 비용 추정 컨테이너 생성
     */
    public createCostEstimationContainer(): HTMLElement {
        const costContainer = this.containerEl.createEl('div', { 
            cls: UI_CONSTANTS.CLASSES.COST_ESTIMATION 
        });
        costContainer.addClass(UI_CONSTANTS.STYLES.COST_CONTAINER);
        
        costContainer.createEl('h5', { text: UI_CONSTANTS.MESSAGES.COST_HEADER });
        
        return costContainer;
    }

    /**
     * 비용 상세 정보 업데이트
     */
    public updateCostDetails(container: HTMLElement, model: DeepgramModel | null, monthlyCost?: number): void {
        // 기존 내용 제거
        const detailsEl = container.querySelector(`.${UI_CONSTANTS.CLASSES.COST_DETAILS}`) || 
                         container.createEl('div', { cls: UI_CONSTANTS.CLASSES.COST_DETAILS });
        
        detailsEl.empty();
        
        if (!model) {
            detailsEl.createEl('p', { 
                text: 'Select a model to see cost estimation',
                cls: UI_CONSTANTS.CLASSES.WARNING
            });
            return;
        }

        const costInfo = detailsEl.createEl('div');
        
        // 분당 비용
        costInfo.createEl('p', { 
            text: `Cost per minute: $${model.pricing.perMinute}`
        });
        
        // 예상 월 비용
        if (monthlyCost !== undefined) {
            const dailyMinutes = CONFIG_CONSTANTS.COST_ESTIMATION.DAILY_MINUTES;
            costInfo.createEl('p', { 
                text: `Estimated monthly cost (${dailyMinutes} min/day): $${monthlyCost.toFixed(2)}`
            });
        }
    }

    /**
     * 예산 경고 추가
     */
    public addBudgetWarning(container: HTMLElement, monthlyCost: number, budget: number): void {
        if (monthlyCost > budget) {
            const warningEl = container.querySelector(`.budget-warning`) ||
                            container.createEl('p', { cls: 'budget-warning' });
            warningEl.textContent = `⚠️ Exceeds monthly budget of $${budget}`;
            warningEl.classList.add(UI_CONSTANTS.CLASSES.WARNING);
        }
    }

    /**
     * 에러 컨테이너 생성
     */
    public createErrorContainer(error: unknown): HTMLElement {
        const errorContainer = this.containerEl.createEl('div', {
            cls: UI_CONSTANTS.CLASSES.WARNING
        });
        errorContainer.addClass(UI_CONSTANTS.STYLES.ERROR_CONTAINER);
        
        errorContainer.createEl('h5', { text: UI_CONSTANTS.MESSAGES.FALLBACK_ERROR_TITLE });
        errorContainer.createEl('p', { 
            text: UI_CONSTANTS.MESSAGES.FALLBACK_ERROR_DESC
        });
        
        if (error instanceof Error) {
            const details = errorContainer.createEl('details');
            details.createEl('summary', { text: 'Error details' });
            details.createEl('pre', { 
                text: error.message,
                cls: UI_CONSTANTS.CLASSES.ERROR_DETAILS
            }).addClass(UI_CONSTANTS.STYLES.ERROR_DETAILS);
        }

        return errorContainer;
    }

    /**
     * 특정 섹션 컨테이너 생성
     */
    public createSection(className: string, title?: string): HTMLElement {
        const section = this.containerEl.createEl('div', { cls: className });
        if (title) {
            section.createEl('h5', { text: title });
        }
        return section;
    }

    /**
     * 요소 제거
     */
    public removeElement(selector: string): void {
        const element = this.containerEl.querySelector(selector);
        if (element) {
            element.remove();
        }
    }

    /**
     * 컨테이너 초기화
     */
    public clearContainer(): void {
        this.containerEl.empty();
    }
}
