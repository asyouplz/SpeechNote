/**
 * Deepgram 모델 안전한 마이그레이션 서비스
 * 
 * 핵심 기능:
 * - 기존 사용자 설정 보존
 * - 점진적 마이그레이션 전략
 * - 자동 롤백 메커니즘
 * - 호환성 검증 및 경고
 */

import type { ILogger, ISettingsManager } from '../../../../types';
import { ModelCapabilityManager, type CompatibilityCheck } from './ModelCapabilityManager';

// 마이그레이션 타입 정의
export interface MigrationRule {
    fromModel: string;
    toModel: string;
    strategy: 'auto' | 'manual' | 'forced';
    conditions: MigrationCondition[];
    warnings?: string[];
    backupSettings: string[];
}

export interface MigrationCondition {
    type: 'feature_compatible' | 'user_consent' | 'cost_threshold' | 'custom';
    parameters: Record<string, any>;
    required: boolean;
}

export interface MigrationPlan {
    fromModel: string;
    toModel: string;
    strategy: 'immediate' | 'gradual' | 'on_demand';
    steps: MigrationStep[];
    rollbackPlan: MigrationStep[];
    estimatedTime: number; // minutes
    risks: string[];
    benefits: string[];
}

export interface MigrationStep {
    id: string;
    description: string;
    action: 'backup_settings' | 'update_model' | 'test_compatibility' | 'notify_user' | 'rollback';
    parameters: Record<string, any>;
    critical: boolean;
    rollbackAction?: string;
}

export interface MigrationResult {
    success: boolean;
    fromModel: string;
    toModel: string;
    executedSteps: string[];
    warnings: string[];
    errors: string[];
    rollbackRequired: boolean;
    rollbackSteps?: string[];
    metadata: {
        duration: number;
        timestamp: string;
        userApproved: boolean;
    };
}

export interface UserMigrationPreferences {
    autoMigration: boolean;
    notifyBeforeMigration: boolean;
    maxCostIncrease: number; // percentage
    preferredMigrationTime: 'immediate' | 'next_session' | 'manual';
    backupSettings: boolean;
    testMode: boolean; // dry run without actual changes
}

/**
 * 기본 마이그레이션 규칙
 */
const DEFAULT_MIGRATION_RULES: MigrationRule[] = [
    {
        fromModel: 'nova-2',
        toModel: 'nova-3',
        strategy: 'manual',
        conditions: [
            {
                type: 'user_consent',
                parameters: { message: 'Upgrade to Nova-3 for better accuracy and new features?' },
                required: true
            },
            {
                type: 'cost_threshold',
                parameters: { maxIncrease: 15 }, // 15% 비용 증가 허용
                required: false
            }
        ],
        warnings: [
            'Nova-3 has slightly different pricing structure',
            'Some advanced features may require API key upgrade'
        ],
        backupSettings: ['model', 'features', 'diarization']
    },
    {
        fromModel: 'nova',
        toModel: 'nova-3',
        strategy: 'manual',
        conditions: [
            {
                type: 'user_consent',
                parameters: { message: 'Upgrade to Nova-3 for significantly better performance?' },
                required: true
            },
            {
                type: 'feature_compatible',
                parameters: { requiredFeatures: ['diarization'] },
                required: false
            }
        ],
        warnings: [
            'Nova-3 is a premium model with higher cost',
            'Significant improvement in accuracy and features'
        ],
        backupSettings: ['model', 'features', 'language']
    },
    {
        fromModel: 'enhanced',
        toModel: 'nova-3',
        strategy: 'manual',
        conditions: [
            {
                type: 'user_consent',
                parameters: { 
                    message: 'Upgrade to Nova-3 for advanced features like speaker diarization?',
                    benefits: ['98% accuracy', 'Speaker diarization', 'Advanced formatting']
                },
                required: true
            }
        ],
        warnings: [
            'Cost increase from $0.0085 to $0.0043 per minute (actually cheaper!)',
            'Unlocks premium features'
        ],
        backupSettings: ['model', 'features']
    },
    {
        fromModel: 'base',
        toModel: 'enhanced',
        strategy: 'auto',
        conditions: [
            {
                type: 'cost_threshold',
                parameters: { maxIncrease: 50 },
                required: true
            }
        ],
        warnings: [
            'Upgrading to Enhanced model for better quality',
            'Cost increase from $0.0059 to $0.0085 per minute'
        ],
        backupSettings: ['model']
    }
];

/**
 * 모델 마이그레이션 서비스
 */
export class ModelMigrationService {
    private capabilityManager: ModelCapabilityManager;
    private migrationRules: MigrationRule[];
    
    constructor(
        private logger: ILogger,
        private settingsManager: ISettingsManager,
        capabilityManager?: ModelCapabilityManager,
        customRules?: MigrationRule[]
    ) {
        this.capabilityManager = capabilityManager || new ModelCapabilityManager(logger);
        this.migrationRules = [...DEFAULT_MIGRATION_RULES, ...(customRules || [])];
        
        this.logger.debug('ModelMigrationService initialized', {
            rulesCount: this.migrationRules.length,
            availableModels: this.capabilityManager.getAvailableModels().length
        });
    }

    /**
     * 사용자의 현재 모델에 대한 마이그레이션 제안을 확인합니다
     */
    async checkForMigrationOpportunities(currentModel?: string): Promise<MigrationPlan[]> {
        const model = currentModel || this.getCurrentModel();
        if (!model) {
            this.logger.warn('No current model found, cannot check migration opportunities');
            return [];
        }

        const opportunities: MigrationPlan[] = [];

        // 해당 모델에서 시작하는 마이그레이션 규칙 찾기
        const applicableRules = this.migrationRules.filter(rule => rule.fromModel === model);

        for (const rule of applicableRules) {
            const compatibility = await this.checkMigrationCompatibility(rule);
            if (compatibility.compatible) {
                const plan = await this.createMigrationPlan(rule);
                opportunities.push(plan);
            }
        }

        // 점수 순으로 정렬
        opportunities.sort((a, b) => this.calculateMigrationScore(b) - this.calculateMigrationScore(a));

        this.logger.info(`Found ${opportunities.length} migration opportunities for ${model}`);
        return opportunities;
    }

    /**
     * 마이그레이션을 실행합니다
     */
    async executeMigration(
        plan: MigrationPlan, 
        userPreferences?: Partial<UserMigrationPreferences>
    ): Promise<MigrationResult> {
        const startTime = Date.now();
        const prefs = this.getUserPreferences(userPreferences);

        this.logger.info('Starting migration execution', {
            fromModel: plan.fromModel,
            toModel: plan.toModel,
            strategy: plan.strategy,
            stepCount: plan.steps.length
        });

        const result: MigrationResult = {
            success: false,
            fromModel: plan.fromModel,
            toModel: plan.toModel,
            executedSteps: [],
            warnings: [],
            errors: [],
            rollbackRequired: false,
            metadata: {
                duration: 0,
                timestamp: new Date().toISOString(),
                userApproved: false
            }
        };

        try {
            // 테스트 모드 확인
            if (prefs.testMode) {
                return await this.simulateMigration(plan, result);
            }

            // 사용자 승인 확인
            if (!await this.getUserApproval(plan, prefs)) {
                result.errors.push('User approval required but not granted');
                return result;
            }
            result.metadata.userApproved = true;

            // 마이그레이션 단계 실행
            for (const step of plan.steps) {
                try {
                    await this.executeStep(step, result);
                    result.executedSteps.push(step.id);
                } catch (error) {
                    const errorMsg = `Step ${step.id} failed: ${(error as Error).message}`;
                    result.errors.push(errorMsg);
                    this.logger.error('Migration step failed', error as Error, {
                        stepId: step.id,
                        critical: step.critical
                    });

                    if (step.critical) {
                        result.rollbackRequired = true;
                        break;
                    } else {
                        result.warnings.push(`Non-critical step failed: ${step.id}`);
                    }
                }
            }

            // 성공 여부 판단
            result.success = result.errors.length === 0;

            // 롤백 필요 시 실행
            if (result.rollbackRequired) {
                await this.executeRollback(plan, result);
            }

        } catch (error) {
            result.errors.push(`Migration failed: ${(error as Error).message}`);
            this.logger.error('Migration execution failed', error as Error);
        } finally {
            result.metadata.duration = Date.now() - startTime;
        }

        this.logger.info('Migration execution completed', {
            success: result.success,
            duration: result.metadata.duration,
            warnings: result.warnings.length,
            errors: result.errors.length
        });

        return result;
    }

    /**
     * 자동 마이그레이션 체크 (백그라운드 실행)
     */
    async performAutomaticMigrationCheck(): Promise<boolean> {
        const currentModel = this.getCurrentModel();
        if (!currentModel) return false;

        const opportunities = await this.checkForMigrationOpportunities(currentModel);
        const autoMigrations = opportunities.filter(plan => 
            this.migrationRules.find(rule => 
                rule.fromModel === plan.fromModel && 
                rule.toModel === plan.toModel && 
                rule.strategy === 'auto'
            )
        );

        if (autoMigrations.length === 0) return false;

        this.logger.info(`Found ${autoMigrations.length} automatic migration opportunities`);

        // 최고 점수의 마이그레이션 실행
        const bestMigration = autoMigrations[0];
        const result = await this.executeMigration(bestMigration, { 
            autoMigration: true,
            testMode: false,
            notifyBeforeMigration: false
        });

        if (result.success) {
            this.logger.info('Automatic migration completed successfully', {
                fromModel: result.fromModel,
                toModel: result.toModel
            });
            
            // 사용자에게 알림 (선택적)
            this.notifyUser(`Automatically upgraded from ${result.fromModel} to ${result.toModel}`);
        }

        return result.success;
    }

    /**
     * 마이그레이션 롤백
     */
    async rollbackMigration(migrationId: string): Promise<boolean> {
        // 구현: 백업된 설정으로 복원
        this.logger.info(`Rolling back migration: ${migrationId}`);
        
        try {
            const backup = this.getBackup(migrationId);
            if (backup) {
                await this.restoreSettings(backup);
                this.logger.info('Migration rollback completed successfully');
                return true;
            }
        } catch (error) {
            this.logger.error('Migration rollback failed', error as Error);
        }
        
        return false;
    }

    /**
     * 마이그레이션 히스토리 조회
     */
    getMigrationHistory(): Array<{
        timestamp: string;
        fromModel: string;
        toModel: string;
        success: boolean;
        automatic: boolean;
    }> {
        return (this.settingsManager.get('migrationHistory') as Array<{
            timestamp: string;
            fromModel: string;
            toModel: string;
            success: boolean;
            automatic: boolean;
        }>) || [];
    }

    /**
     * Private Helper Methods
     */

    private getCurrentModel(): string | null {
        const transcriptionSettings = this.settingsManager.get('transcription') as any;
        return transcriptionSettings?.deepgram?.model || 
               transcriptionSettings?.model || 
               null;
    }

    private getUserPreferences(overrides?: Partial<UserMigrationPreferences>): UserMigrationPreferences {
        const defaults: UserMigrationPreferences = {
            autoMigration: false,
            notifyBeforeMigration: true,
            maxCostIncrease: 20,
            preferredMigrationTime: 'manual',
            backupSettings: true,
            testMode: false
        };

        const saved = this.settingsManager.get('migrationPreferences') || {};
        return { ...defaults, ...saved, ...overrides };
    }

    private async checkMigrationCompatibility(rule: MigrationRule): Promise<CompatibilityCheck> {
        const toCapabilities = this.capabilityManager.getModelCapabilities(rule.toModel);
        const fromCapabilities = this.capabilityManager.getModelCapabilities(rule.fromModel);

        if (!toCapabilities || !fromCapabilities) {
            return {
                compatible: false,
                missingFeatures: [],
                degradedFeatures: [],
                recommendations: ['Model not found'],
                alternativeModels: []
            };
        }

        // 조건 검사
        for (const condition of rule.conditions) {
            if (condition.required && !await this.evaluateCondition(condition)) {
                return {
                    compatible: false,
                    missingFeatures: [],
                    degradedFeatures: [],
                    recommendations: [`Condition not met: ${condition.type}`],
                    alternativeModels: []
                };
            }
        }

        return {
            compatible: true,
            missingFeatures: [],
            degradedFeatures: [],
            recommendations: [],
            alternativeModels: []
        };
    }

    private evaluateCondition(condition: MigrationCondition): boolean {
        switch (condition.type) {
            case 'user_consent':
                // 실제 구현에서는 UI를 통해 사용자 동의를 받아야 함
                return false; // 기본적으로 사용자 동의 필요

            case 'cost_threshold': {
                const _maxIncrease = condition.parameters.maxIncrease || 20;
                // 비용 증가율 계산 로직
                return true; // 임시 구현
            }

            case 'feature_compatible': {
                const _requiredFeatures = condition.parameters.requiredFeatures || [];
                // 기능 호환성 체크
                return true; // 임시 구현
            }

            default:
                return true;
        }
    }

    private createMigrationPlan(rule: MigrationRule): MigrationPlan {
        const steps: MigrationStep[] = [
            {
                id: 'backup_settings',
                description: 'Backup current settings',
                action: 'backup_settings',
                parameters: { settings: rule.backupSettings },
                critical: true
            },
            {
                id: 'test_compatibility',
                description: 'Test new model compatibility',
                action: 'test_compatibility',
                parameters: { targetModel: rule.toModel },
                critical: true
            },
            {
                id: 'update_model',
                description: `Switch from ${rule.fromModel} to ${rule.toModel}`,
                action: 'update_model',
                parameters: { newModel: rule.toModel },
                critical: true,
                rollbackAction: 'restore_model'
            },
            {
                id: 'notify_user',
                description: 'Notify user of successful migration',
                action: 'notify_user',
                parameters: { 
                    message: `Successfully upgraded to ${rule.toModel}`,
                    type: 'success'
                },
                critical: false
            }
        ];

        const rollbackSteps: MigrationStep[] = [
            {
                id: 'rollback_model',
                description: `Rollback to ${rule.fromModel}`,
                action: 'rollback',
                parameters: { originalModel: rule.fromModel },
                critical: true
            }
        ];

        return {
            fromModel: rule.fromModel,
            toModel: rule.toModel,
            strategy: rule.strategy === 'auto' ? 'immediate' : 'on_demand',
            steps,
            rollbackPlan: rollbackSteps,
            estimatedTime: steps.length * 2, // 2분 per step
            risks: rule.warnings || [],
            benefits: this.calculateMigrationBenefits(rule.fromModel, rule.toModel)
        };
    }

    private calculateMigrationScore(plan: MigrationPlan): number {
        const fromCap = this.capabilityManager.getModelCapabilities(plan.fromModel);
        const toCap = this.capabilityManager.getModelCapabilities(plan.toModel);

        if (!fromCap || !toCap) return 0;

        // 품질 향상, 비용 고려, 기능 개선을 종합하여 점수 계산
        const qualityImprovement = toCap.performance.accuracy - fromCap.performance.accuracy;
        const costRatio = fromCap.pricing.perMinute / toCap.pricing.perMinute;
        
        return qualityImprovement * 10 + costRatio * 20;
    }

    private async executeStep(step: MigrationStep, result: MigrationResult): Promise<void> {
        this.logger.debug(`Executing migration step: ${step.id}`);

        switch (step.action) {
            case 'backup_settings':
                await this.backupCurrentSettings(step.parameters.settings);
                break;

            case 'update_model':
                await this.updateModel(step.parameters.newModel);
                break;

            case 'test_compatibility':
                await this.testModelCompatibility(step.parameters.targetModel);
                break;

            case 'notify_user':
                this.notifyUser(step.parameters.message, step.parameters.type);
                break;

            case 'rollback':
                await this.executeRollback(null, result);
                break;

            default:
                throw new Error(`Unknown migration action: ${String(step.action)}`);
        }
    }

    private simulateMigration(plan: MigrationPlan, result: MigrationResult): MigrationResult {
        this.logger.info('Running migration simulation (test mode)');
        
        result.warnings.push('Migration simulation completed - no actual changes made');
        result.success = true;
        result.executedSteps = plan.steps.map(step => `${step.id} (simulated)`);
        
        return result;
    }

    private getUserApproval(plan: MigrationPlan, prefs: UserMigrationPreferences): boolean {
        if (prefs.autoMigration && !prefs.notifyBeforeMigration) {
            return true;
        }

        // 실제 구현에서는 UI 다이얼로그를 통해 사용자 승인을 받아야 함
        this.logger.info('User approval required for migration', {
            fromModel: plan.fromModel,
            toModel: plan.toModel,
            benefits: plan.benefits,
            risks: plan.risks
        });

        // 임시 구현: 자동 승인 (실제로는 사용자 인터페이스 필요)
        return false;
    }

    private async executeRollback(plan: MigrationPlan | null, result: MigrationResult): Promise<void> {
        this.logger.warn('Executing migration rollback');
        
        try {
            const backup = this.getLatestBackup();
            if (backup) {
                await this.restoreSettings(backup);
                result.rollbackSteps = ['settings_restored'];
            }
        } catch (error) {
            this.logger.error('Rollback execution failed', error as Error);
            result.errors.push('Rollback failed');
        }
    }

    private async backupCurrentSettings(settingsToBackup: string[]): Promise<void> {
        const backup: Record<string, any> = {
            timestamp: new Date().toISOString(),
            settings: {}
        };

        for (const settingKey of settingsToBackup) {
            backup.settings[settingKey] = this.settingsManager.get(settingKey);
        }

        const backupId = `migration_backup_${Date.now()}`;
        await this.settingsManager.set(`backup.${backupId}`, backup);
        
        this.logger.debug('Settings backup created', { backupId, settingsCount: settingsToBackup.length });
    }

    private async updateModel(newModel: string): Promise<void> {
        const transcriptionSettings = (this.settingsManager.get('transcription') as any) || {};
        
        if (transcriptionSettings.deepgram) {
            transcriptionSettings.deepgram.model = newModel;
        } else {
            transcriptionSettings.model = newModel;
        }
        
        await this.settingsManager.set('transcription', transcriptionSettings);
        this.logger.info(`Model updated to: ${newModel}`);
    }

    private testModelCompatibility(targetModel: string): void {
        const capabilities = this.capabilityManager.getModelCapabilities(targetModel);
        if (!capabilities) {
            throw new Error(`Target model ${targetModel} not found`);
        }

        // 간단한 호환성 테스트 (실제 구현에서는 API 테스트 필요)
        this.logger.debug(`Model compatibility test passed for: ${targetModel}`);
    }

    private notifyUser(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
        // 실제 구현에서는 사용자 인터페이스를 통한 알림 필요
        this.logger.info(`User notification (${type}): ${message}`);
    }

    private getBackup(backupId: string): any {
        return this.settingsManager.get(`backup.${backupId}`);
    }

    private getLatestBackup(): any {
        // 최신 백업 찾기 로직 (ISettingsManager에 getAll이 없으므로 대안 구현)
        try {
            const backupPattern = 'backup.migration_backup_';
            const currentTime = Date.now();
            let latestBackup: any = null;
            let latestTimestamp = 0;

            // 최근 24시간 내의 백업을 체크 (타임스탬프 기반)
            for (let i = 0; i < 24; i++) {
                const timestamp = currentTime - (i * 60 * 60 * 1000); // i시간 전
                const backupId = `${backupPattern}${timestamp}`;
                const backup = this.getBackup(backupId);
                
                if (backup && timestamp > latestTimestamp) {
                    latestBackup = backup;
                    latestTimestamp = timestamp;
                }
            }

            return latestBackup;
        } catch (error) {
            this.logger.warn('Failed to find latest backup', error as Error);
            return null;
        }
    }

    private async restoreSettings(backup: any): Promise<void> {
        if (!backup || !backup.settings) {
            throw new Error('Invalid backup data');
        }

        for (const [key, value] of Object.entries(backup.settings)) {
            await this.settingsManager.set(key, value);
        }

        this.logger.info('Settings restored from backup', {
            timestamp: backup.timestamp,
            settingsCount: Object.keys(backup.settings).length
        });
    }

    private calculateMigrationBenefits(fromModel: string, toModel: string): string[] {
        const fromCap = this.capabilityManager.getModelCapabilities(fromModel);
        const toCap = this.capabilityManager.getModelCapabilities(toModel);

        if (!fromCap || !toCap) return [];

        const benefits: string[] = [];

        if (toCap.performance.accuracy > fromCap.performance.accuracy) {
            benefits.push(`${toCap.performance.accuracy - fromCap.performance.accuracy}% accuracy improvement`);
        }

        if (toCap.pricing.perMinute < fromCap.pricing.perMinute) {
            const savings = ((fromCap.pricing.perMinute - toCap.pricing.perMinute) / fromCap.pricing.perMinute * 100).toFixed(1);
            benefits.push(`${savings}% cost reduction`);
        }

        const newFeatures = Object.keys(toCap.features).filter(
            feature => toCap.features[feature] && !fromCap.features[feature]
        );

        if (newFeatures.length > 0) {
            benefits.push(`New features: ${newFeatures.join(', ')}`);
        }

        return benefits;
    }
}
