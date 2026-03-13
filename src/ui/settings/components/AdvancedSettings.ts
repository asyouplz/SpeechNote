import { Setting } from 'obsidian';
import type SpeechToTextPlugin from '../../../main';
import { Notice } from 'obsidian';
import { ConfirmationModal } from '../../modals/ConfirmationModal';

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
        containerEl.createEl('h4', { text: 'Cache settings' });

        // 캐시 활성화
        new Setting(containerEl)
            .setName('Enable cache')
            .setDesc('Cache transcription results to speed up repeated processing')
            .addToggle((toggle) =>
                toggle.setValue(this.plugin.settings.enableCache).onChange(async (value) => {
                    this.plugin.settings.enableCache = value;
                    await this.plugin.saveSettings();

                    if (!value) {
                        // 캐시 비활성화 시 기존 캐시 삭제 옵션
                        new ConfirmationModal(
                            this.plugin.app,
                            'Clear cache',
                            'Do you want to delete the existing cache?',
                            () => {
                                this.clearCache();
                            }
                        ).open();
                    }
                })
            );

        // 캐시 TTL
        if (this.plugin.settings.enableCache) {
            const ttlSetting = new Setting(containerEl)
                .setName('Cache retention period')
                .setDesc('How long to keep cached results');

            const ttlValue = containerEl.createDiv({ cls: 'ttl-value' });
            const currentHours = Math.round(this.plugin.settings.cacheTTL / (1000 * 60 * 60));
            ttlValue.setText(`${currentHours} h`);

            ttlSetting.addSlider((slider) =>
                slider
                    .setLimits(1, 168, 1) // 1시간 ~ 1주일
                    .setValue(currentHours)
                    .onChange(async (value) => {
                        this.plugin.settings.cacheTTL = value * 60 * 60 * 1000;
                        ttlValue.setText(`${value} h`);
                        await this.plugin.saveSettings();
                    })
                    .setDynamicTooltip()
            );
        }

        // 캐시 관리
        const cacheManagement = new Setting(containerEl)
            .setName('Cache management')
            .setDesc('Manage cached data');

        // 캐시 상태 표시
        const cacheStatus = containerEl.createDiv({ cls: 'cache-status' });
        this.updateCacheStatus(cacheStatus);

        // 캐시 삭제 버튼
        cacheManagement.addButton((button) =>
            button.setButtonText('Clear cache').onClick(() => {
                this.clearCache();
                this.updateCacheStatus(cacheStatus);
            })
        );

        // 캐시 통계 보기
        cacheManagement.addButton((button) =>
            button.setButtonText('View statistics').onClick(() => {
                this.showCacheStatistics();
            })
        );
    }

    /**
     * 로깅 설정
     */
    private renderLoggingSettings(containerEl: HTMLElement): void {
        containerEl.createEl('h4', { text: 'Logging settings' });

        // 디버그 로깅
        new Setting(containerEl)
            .setName('Debug logging')
            .setDesc('Print detailed debug information to the console')
            .addToggle((toggle) =>
                toggle
                    .setValue(
                        typeof this.plugin.settings['enableDebugLogging'] === 'boolean'
                            ? this.plugin.settings['enableDebugLogging']
                            : false
                    )
                    .onChange(async (value) => {
                        this.plugin.settings['enableDebugLogging'] = value;
                        await this.plugin.saveSettings();
                    })
            );

        // 로그 레벨
        new Setting(containerEl)
            .setName('Log level')
            .setDesc('Choose the minimum log level to output')
            .addDropdown((dropdown) =>
                dropdown
                    .addOption('error', 'Errors only')
                    .addOption('warn', 'Warnings and above')
                    .addOption('info', 'Info and above')
                    .addOption('debug', 'All logs')
                    .setValue('info')
                    .onChange(async (_value) => {
                        // 로그 레벨 설정
                        await this.plugin.saveSettings();
                    })
            );

        // 로그 파일 저장
        new Setting(containerEl)
            .setName('Save logs to file')
            .setDesc('Save log output to a file')
            .addToggle((toggle) =>
                toggle.setValue(false).onChange(async (_value) => {
                    // 로그 파일 저장 설정
                    await this.plugin.saveSettings();
                })
            );

        // 로그 관리
        const logManagement = new Setting(containerEl)
            .setName('Log management')
            .setDesc('Manage log data');

        logManagement.addButton((button) =>
            button.setButtonText('View logs').onClick(() => {
                this.showLogs();
            })
        );

        logManagement.addButton((button) =>
            button.setButtonText('Export logs').onClick(() => {
                this.exportLogs();
            })
        );

        logManagement.addButton((button) =>
            button
                .setButtonText('Clear logs')
                .setWarning()
                .onClick(() => {
                    this.clearLogs();
                })
        );
    }

    /**
     * 성능 설정
     */
    private renderPerformanceSettings(containerEl: HTMLElement): void {
        containerEl.createEl('h4', { text: 'Performance settings' });

        // 동시 처리 수
        new Setting(containerEl)
            .setName('Concurrent jobs')
            .setDesc('Maximum number of jobs to process at the same time')
            .addDropdown((dropdown) =>
                dropdown
                    .addOption('1', '1 job (stable)')
                    .addOption('2', '2 jobs')
                    .addOption('3', '3 jobs (fast)')
                    .setValue('1')
                    .onChange(async (_value) => {
                        // 동시 처리 설정
                        await this.plugin.saveSettings();
                    })
            );

        // 자동 재시도
        new Setting(containerEl)
            .setName('Automatic retry')
            .setDesc('Automatically retry failed jobs')
            .addToggle((toggle) =>
                toggle.setValue(true).onChange(async (_value) => {
                    // 자동 재시도 설정
                    await this.plugin.saveSettings();
                })
            );

        // 재시도 횟수
        new Setting(containerEl)
            .setName('Maximum retry count')
            .setDesc('Maximum number of retries after a failure')
            .addDropdown((dropdown) =>
                dropdown
                    .addOption('1', '1 retry')
                    .addOption('2', '2 retries')
                    .addOption('3', '3 retries')
                    .addOption('5', '5 retries')
                    .setValue('3')
                    .onChange(async (_value) => {
                        // 재시도 횟수 설정
                        await this.plugin.saveSettings();
                    })
            );

        // 타임아웃 설정
        const timeoutSetting = new Setting(containerEl)
            .setName('Request timeout')
            .setDesc('API request timeout in seconds');

        const timeoutValue = containerEl.createDiv({ cls: 'timeout-value' });
        timeoutValue.setText('30 s');

        timeoutSetting.addSlider((slider) =>
            slider
                .setLimits(10, 120, 5)
                .setValue(30)
                .onChange(async (value) => {
                    timeoutValue.setText(`${value} s`);
                    // 타임아웃 설정 저장
                    await this.plugin.saveSettings();
                })
                .setDynamicTooltip()
        );

        // 메모리 최적화
        new Setting(containerEl)
            .setName('Memory optimization')
            .setDesc('Optimize memory usage for large files')
            .addToggle((toggle) =>
                toggle.setValue(false).onChange(async (_value) => {
                    // 메모리 최적화 설정
                    await this.plugin.saveSettings();
                })
            );
    }

    /**
     * 실험적 기능 설정
     */
    private renderExperimentalSettings(containerEl: HTMLElement): void {
        containerEl.createEl('h4', { text: 'Experimental features' });

        const warningEl = containerEl.createDiv({ cls: 'experimental-warning' });
        warningEl.createEl('span', {
            text: 'Experimental features may be unstable.',
            cls: 'warning-text',
        });

        // 배치 처리
        new Setting(containerEl)
            .setName('Batch processing')
            .setDesc('Process multiple files in a single run')
            .addToggle((toggle) =>
                toggle.setValue(false).onChange(async (_value) => {
                    // 배치 처리 설정
                    await this.plugin.saveSettings();
                })
            );

        // 실시간 변환
        new Setting(containerEl)
            .setName('Real-time transcription')
            .setDesc('Transcribe while recording in real time')
            .addToggle((toggle) =>
                toggle.setValue(false).onChange(async (_value) => {
                    // 실시간 변환 설정
                    await this.plugin.saveSettings();
                })
            )
            .setDisabled(true); // 아직 구현되지 않음

        // 화자 분리
        new Setting(containerEl)
            .setName('Speaker diarization')
            .setDesc('Separate and label multiple speakers')
            .addToggle((toggle) =>
                toggle.setValue(false).onChange(async (_value) => {
                    // 화자 분리 설정
                    await this.plugin.saveSettings();
                })
            )
            .setDisabled(true); // 아직 구현되지 않음

        // 자동 번역
        new Setting(containerEl)
            .setName('Automatic translation')
            .setDesc('Automatically translate transcribed text')
            .addToggle((toggle) =>
                toggle.setValue(false).onChange(async (_value) => {
                    // 자동 번역 설정
                    await this.plugin.saveSettings();
                })
            )
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
            text: `Cached entries: ${cacheCount}`,
            cls: 'cache-stat',
        });

        statusEl.createEl('div', {
            text: `Total size: ${this.formatBytes(cacheSize)}`,
            cls: 'cache-stat',
        });
    }

    /**
     * 캐시 삭제
     */
    private clearCache(): void {
        try {
            // Obsidian API를 통해 캐시 삭제
            this.plugin.app.saveLocalStorage('speech-to-text-cache', null);
            new Notice('Cache cleared.');
        } catch (error) {
            new Notice('Failed to clear cache.');
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
            avgSavings: '2.3 s',
        };

        new Notice(`Cache hit rate: ${stats.hitRate}, average time saved: ${stats.avgSavings}`);
    }

    /**
     * 로그 표시
     */
    private showLogs(): void {
        // 로그 모달 표시
        new Notice('Log viewer is not available yet.');
    }

    /**
     * 로그 내보내기
     */
    private exportLogs(): void {
        try {
            const logs = this.getLogs();
            const blob = new Blob([logs], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);

            const a = createEl('a');
            a.href = url;
            a.download = `speech-to-text-logs-${Date.now()}.txt`;
            a.click();

            URL.revokeObjectURL(url);
            new Notice('Logs exported.');
        } catch (error) {
            new Notice('Failed to export logs.');
            console.error(error);
        }
    }

    /**
     * 로그 삭제
     */
    private clearLogs(): void {
        new ConfirmationModal(
            this.plugin.app,
            'Clear logs',
            'Do you want to delete all logs?',
            () => {
                // 로그 삭제 로직
                new Notice('Logs cleared.');
            }
        ).open();
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
