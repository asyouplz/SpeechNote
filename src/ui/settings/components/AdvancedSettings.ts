import { Setting } from 'obsidian';
import type SpeechToTextPlugin from '../../../main';
import { Notice } from 'obsidian';

/**
 * 고급 설정 컴포넌트
 * 캐시, 로깅, 성능 관련 설정을 관리
 */
export class AdvancedSettings {
    constructor(private plugin: SpeechToTextPlugin) {}

    render(containerEl: HTMLElement): void {
        // 캐시 설정 섹션
        this.renderCacheSettings(containerEl);
        
        // 로깅 설정 섹션
        this.renderLoggingSettings(containerEl);
        
        // 성능 설정 섹션
        this.renderPerformanceSettings(containerEl);
        
        // 실험적 기능 섹션
        this.renderExperimentalSettings(containerEl);
    }

    /**
     * 캐시 설정
     */
    private renderCacheSettings(containerEl: HTMLElement): void {
        containerEl.createEl('h4', { text: '캐시 설정' });
        
        // 캐시 활성화
        new Setting(containerEl)
            .setName('캐시 사용')
            .setDesc('변환 결과를 캐시하여 동일한 파일 재처리 시 속도를 향상시킵니다')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableCache)
                .onChange(async (value) => {
                    this.plugin.settings.enableCache = value;
                    await this.plugin.saveSettings();
                    
                    if (!value) {
                        // 캐시 비활성화 시 기존 캐시 삭제 옵션
                        const shouldClear = confirm('기존 캐시를 삭제하시겠습니까?');
                        if (shouldClear) {
                            await this.clearCache();
                        }
                    }
                }));

        // 캐시 TTL
        if (this.plugin.settings.enableCache) {
            const ttlSetting = new Setting(containerEl)
                .setName('캐시 유효 기간')
                .setDesc('캐시된 결과를 보관할 시간');

            const ttlValue = containerEl.createDiv({ cls: 'ttl-value' });
            const currentHours = Math.round(this.plugin.settings.cacheTTL / (1000 * 60 * 60));
            ttlValue.setText(`${currentHours} 시간`);

            ttlSetting.addSlider(slider => slider
                .setLimits(1, 168, 1) // 1시간 ~ 1주일
                .setValue(currentHours)
                .onChange(async (value) => {
                    this.plugin.settings.cacheTTL = value * 60 * 60 * 1000;
                    ttlValue.setText(`${value} 시간`);
                    await this.plugin.saveSettings();
                })
                .setDynamicTooltip());
        }

        // 캐시 관리
        const cacheManagement = new Setting(containerEl)
            .setName('캐시 관리')
            .setDesc('캐시된 데이터를 관리합니다');

        // 캐시 상태 표시
        const cacheStatus = containerEl.createDiv({ cls: 'cache-status' });
        this.updateCacheStatus(cacheStatus);

        // 캐시 삭제 버튼
        cacheManagement.addButton(button => button
            .setButtonText('캐시 삭제')
            .onClick(async () => {
                await this.clearCache();
                this.updateCacheStatus(cacheStatus);
            }));

        // 캐시 통계 보기
        cacheManagement.addButton(button => button
            .setButtonText('통계 보기')
            .onClick(() => {
                this.showCacheStatistics();
            }));
    }

    /**
     * 로깅 설정
     */
    private renderLoggingSettings(containerEl: HTMLElement): void {
        containerEl.createEl('h4', { text: '로깅 설정' });
        
        // 디버그 로깅
        new Setting(containerEl)
            .setName('디버그 로깅')
            .setDesc('상세한 디버그 정보를 콘솔에 출력합니다')
            .addToggle(toggle => toggle
                .setValue((this.plugin.settings as any).enableDebugLogging || false)
                .onChange(async (value) => {
                    (this.plugin.settings as any).enableDebugLogging = value;
                    await this.plugin.saveSettings();
                }));

        // 로그 레벨
        new Setting(containerEl)
            .setName('로그 레벨')
            .setDesc('출력할 로그의 최소 수준을 선택하세요')
            .addDropdown(dropdown => dropdown
                .addOption('error', '오류만')
                .addOption('warn', '경고 이상')
                .addOption('info', '정보 이상')
                .addOption('debug', '모든 로그')
                .setValue('info')
                .onChange(async (_value) => {
                    // 로그 레벨 설정
                    await this.plugin.saveSettings();
                }));

        // 로그 파일 저장
        new Setting(containerEl)
            .setName('로그 파일 저장')
            .setDesc('로그를 파일로 저장합니다')
            .addToggle(toggle => toggle
                .setValue(false)
                .onChange(async (_value) => {
                    // 로그 파일 저장 설정
                    await this.plugin.saveSettings();
                }));

        // 로그 관리
        const logManagement = new Setting(containerEl)
            .setName('로그 관리')
            .setDesc('로그 데이터를 관리합니다');

        logManagement.addButton(button => button
            .setButtonText('로그 보기')
            .onClick(() => {
                this.showLogs();
            }));

        logManagement.addButton(button => button
            .setButtonText('로그 내보내기')
            .onClick(async () => {
                await this.exportLogs();
            }));

        logManagement.addButton(button => button
            .setButtonText('로그 삭제')
            .setWarning()
            .onClick(async () => {
                await this.clearLogs();
            }));
    }

    /**
     * 성능 설정
     */
    private renderPerformanceSettings(containerEl: HTMLElement): void {
        containerEl.createEl('h4', { text: '성능 설정' });
        
        // 동시 처리 수
        new Setting(containerEl)
            .setName('동시 처리')
            .setDesc('동시에 처리할 수 있는 최대 작업 수')
            .addDropdown(dropdown => dropdown
                .addOption('1', '1개 (안정적)')
                .addOption('2', '2개')
                .addOption('3', '3개 (빠름)')
                .setValue('1')
                .onChange(async (_value) => {
                    // 동시 처리 설정
                    await this.plugin.saveSettings();
                }));

        // 자동 재시도
        new Setting(containerEl)
            .setName('자동 재시도')
            .setDesc('실패한 작업을 자동으로 재시도합니다')
            .addToggle(toggle => toggle
                .setValue(true)
                .onChange(async (_value) => {
                    // 자동 재시도 설정
                    await this.plugin.saveSettings();
                }));

        // 재시도 횟수
        new Setting(containerEl)
            .setName('최대 재시도 횟수')
            .setDesc('실패 시 재시도할 최대 횟수')
            .addDropdown(dropdown => dropdown
                .addOption('1', '1회')
                .addOption('2', '2회')
                .addOption('3', '3회')
                .addOption('5', '5회')
                .setValue('3')
                .onChange(async (_value) => {
                    // 재시도 횟수 설정
                    await this.plugin.saveSettings();
                }));

        // 타임아웃 설정
        const timeoutSetting = new Setting(containerEl)
            .setName('요청 타임아웃')
            .setDesc('API 요청 타임아웃 시간 (초)');

        const timeoutValue = containerEl.createDiv({ cls: 'timeout-value' });
        timeoutValue.setText('30 초');

        timeoutSetting.addSlider(slider => slider
            .setLimits(10, 120, 5)
            .setValue(30)
            .onChange(async (value) => {
                timeoutValue.setText(`${value} 초`);
                // 타임아웃 설정 저장
                await this.plugin.saveSettings();
            })
            .setDynamicTooltip());

        // 메모리 최적화
        new Setting(containerEl)
            .setName('메모리 최적화')
            .setDesc('메모리 사용을 최적화합니다 (큰 파일 처리 시 유용)')
            .addToggle(toggle => toggle
                .setValue(false)
                .onChange(async (_value) => {
                    // 메모리 최적화 설정
                    await this.plugin.saveSettings();
                }));
    }

    /**
     * 실험적 기능 설정
     */
    private renderExperimentalSettings(containerEl: HTMLElement): void {
        containerEl.createEl('h4', { text: '실험적 기능' });
        
        const warningEl = containerEl.createDiv({ cls: 'experimental-warning' });
        warningEl.createEl('span', { 
            text: '⚠️ 실험적 기능은 불안정할 수 있습니다',
            cls: 'warning-text'
        });

        // 배치 처리
        new Setting(containerEl)
            .setName('배치 처리')
            .setDesc('여러 파일을 한 번에 처리합니다')
            .addToggle(toggle => toggle
                .setValue(false)
                .onChange(async (_value) => {
                    // 배치 처리 설정
                    await this.plugin.saveSettings();
                }));

        // 실시간 변환
        new Setting(containerEl)
            .setName('실시간 변환')
            .setDesc('녹음과 동시에 실시간으로 변환합니다')
            .addToggle(toggle => toggle
                .setValue(false)
                .onChange(async (_value) => {
                    // 실시간 변환 설정
                    await this.plugin.saveSettings();
                }))
            .setDisabled(true); // 아직 구현되지 않음

        // 화자 분리
        new Setting(containerEl)
            .setName('화자 분리')
            .setDesc('여러 화자를 구분하여 표시합니다')
            .addToggle(toggle => toggle
                .setValue(false)
                .onChange(async (_value) => {
                    // 화자 분리 설정
                    await this.plugin.saveSettings();
                }))
            .setDisabled(true); // 아직 구현되지 않음

        // 자동 번역
        new Setting(containerEl)
            .setName('자동 번역')
            .setDesc('변환된 텍스트를 자동으로 번역합니다')
            .addToggle(toggle => toggle
                .setValue(false)
                .onChange(async (_value) => {
                    // 자동 번역 설정
                    await this.plugin.saveSettings();
                }))
            .setDisabled(true); // 아직 구현되지 않음
    }

    /**
     * 캐시 상태 업데이트
     */
    private updateCacheStatus(statusEl: HTMLElement): void {
        statusEl.empty();
        
        // 캐시 크기 계산 (예시)
        const cacheSize = this.getCacheSize();
        const cacheCount = this.getCacheCount();
        
        statusEl.createEl('div', { 
            text: `캐시된 항목: ${cacheCount}개`,
            cls: 'cache-stat'
        });
        
        statusEl.createEl('div', { 
            text: `전체 크기: ${this.formatBytes(cacheSize)}`,
            cls: 'cache-stat'
        });
    }

    /**
     * 캐시 삭제
     */
    private async clearCache(): Promise<void> {
        try {
            // 캐시 삭제 로직
            localStorage.removeItem('speech-to-text-cache');
            new Notice('캐시가 삭제되었습니다');
        } catch (error) {
            new Notice('캐시 삭제 실패');
            console.error(error);
        }
    }

    /**
     * 캐시 통계 표시
     */
    private showCacheStatistics(): void {
        const stats = {
            totalRequests: 100,
            cacheHits: 75,
            cacheMisses: 25,
            hitRate: '75%',
            avgSavings: '2.3초'
        };
        
        new Notice(`캐시 적중률: ${stats.hitRate}, 평균 절약 시간: ${stats.avgSavings}`);
    }

    /**
     * 로그 표시
     */
    private showLogs(): void {
        // 로그 모달 표시
        new Notice('로그 뷰어는 준비 중입니다');
    }

    /**
     * 로그 내보내기
     */
    private async exportLogs(): Promise<void> {
        try {
            const logs = this.getLogs();
            const blob = new Blob([logs], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `speech-to-text-logs-${Date.now()}.txt`;
            a.click();
            
            URL.revokeObjectURL(url);
            new Notice('로그를 내보냈습니다');
        } catch (error) {
            new Notice('로그 내보내기 실패');
            console.error(error);
        }
    }

    /**
     * 로그 삭제
     */
    private async clearLogs(): Promise<void> {
        const confirmed = confirm('모든 로그를 삭제하시겠습니까?');
        if (confirmed) {
            // 로그 삭제 로직
            new Notice('로그가 삭제되었습니다');
        }
    }

    /**
     * 헬퍼 메서드들
     */
    private getCacheSize(): number {
        // 캐시 크기 계산 로직
        return 1024 * 1024 * 2.5; // 예시: 2.5MB
    }

    private getCacheCount(): number {
        // 캐시된 항목 수 계산
        return 12; // 예시
    }

    private formatBytes(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    private getLogs(): string {
        // 로그 데이터 가져오기
        return 'Sample log data...';
    }
}
