/**
 * Deepgram 비용 계산 서비스
 * 비용 추정 및 예산 관리 로직 분리
 */

import { CONFIG_CONSTANTS } from '../../../config/DeepgramConstants';
import { DeepgramModel } from '../../../config/DeepgramModelRegistry';
import { DeepgramLogger } from '../helpers/DeepgramLogger';

export interface CostEstimation {
    perMinute: number;
    daily: number;
    monthly: number;
    exceeedsBudget: boolean;
}

export class DeepgramCostCalculator {
    private logger: DeepgramLogger;

    constructor() {
        this.logger = DeepgramLogger.getInstance();
    }

    /**
     * 비용 추정 계산
     */
    public calculateEstimation(
        model: DeepgramModel | null,
        monthlyBudget?: number
    ): CostEstimation | null {
        if (!model) {
            this.logger.debug('No model selected for cost calculation');
            return null;
        }

        const { DAILY_MINUTES, DAYS_PER_MONTH } = CONFIG_CONSTANTS.COST_ESTIMATION;

        const perMinute = model.pricing.perMinute;
        const daily = perMinute * DAILY_MINUTES;
        const monthly = daily * DAYS_PER_MONTH;
        const exceeedsBudget = monthlyBudget ? monthly > monthlyBudget : false;

        this.logger.debug(`Cost calculated for ${model.name}:`, {
            perMinute,
            daily,
            monthly,
            exceeedsBudget,
        });

        return {
            perMinute,
            daily,
            monthly,
            exceeedsBudget,
        };
    }

    /**
     * 사용량 기반 비용 계산
     */
    public calculateCostByUsage(model: DeepgramModel, durationInMinutes: number): number {
        const cost = model.pricing.perMinute * durationInMinutes;

        this.logger.debug(`Usage cost calculated: ${durationInMinutes} minutes = $${cost}`);

        return cost;
    }

    /**
     * 예산 대비 사용 가능 시간 계산
     */
    public calculateAvailableMinutes(model: DeepgramModel, budget: number): number {
        const minutes = budget / model.pricing.perMinute;

        this.logger.debug(`Available minutes for budget $${budget}: ${minutes.toFixed(2)}`);

        return minutes;
    }

    /**
     * 여러 모델 비용 비교
     */
    public compareModelCosts(
        models: DeepgramModel[],
        durationInMinutes: number
    ): Map<string, number> {
        const comparison = new Map<string, number>();

        models.forEach((model) => {
            const cost = this.calculateCostByUsage(model, durationInMinutes);
            comparison.set(model.id, cost);
        });

        return comparison;
    }

    /**
     * 비용 효율성 점수 계산 (0-100)
     */
    public calculateEfficiencyScore(model: DeepgramModel, maxAcceptablePrice: number): number {
        if (model.pricing.perMinute > maxAcceptablePrice) {
            return 0;
        }

        // 가격 대비 정확도 비율
        const priceRatio = 1 - model.pricing.perMinute / maxAcceptablePrice;
        const accuracyRatio = model.performance.accuracy / 100;

        // 가중 평균 (정확도 70%, 가격 30%)
        const score = (accuracyRatio * 0.7 + priceRatio * 0.3) * 100;

        this.logger.debug(`Efficiency score for ${model.name}: ${score.toFixed(2)}`);

        return Math.round(score);
    }
}
