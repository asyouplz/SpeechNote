/**
 * 고급 통합 예제 (Advanced Integration Examples)
 * 
 * Speech-to-Text 플러그인의 고급 기능과 통합 방법을 보여줍니다.
 */

import { Plugin, TFile, MarkdownView, Modal, Setting, App } from 'obsidian';
import type { 
    IWhisperService, 
    ILogger,
    WhisperOptions,
    WhisperResponse
} from '../../src/types';

/**
 * 예제 1: 커스텀 명령어 생성
 */
class CustomTranscriptionCommands {
    constructor(
        private plugin: Plugin,
        private whisperService: IWhisperService,
        private logger: ILogger
    ) {
        this.registerCommands();
    }
    
    private registerCommands(): void {
        // 빠른 변환 명령어
        this.plugin.addCommand({
            id: 'quick-transcribe',
            name: 'Quick Transcribe Last Recording',
            callback: async () => {
                const lastRecording = await this.getLastRecording();
                if (lastRecording) {
                    await this.quickTranscribe(lastRecording);
                }
            },
            hotkeys: [
                {
                    modifiers: ['Mod', 'Shift'],
                    key: 't'
                }
            ]
        });
        
        // 언어별 변환 명령어
        const languages = ['ko', 'en', 'ja', 'zh'];
        languages.forEach(lang => {
            this.plugin.addCommand({
                id: `transcribe-${lang}`,
                name: `Transcribe in ${this.getLanguageName(lang)}`,
                callback: () => this.transcribeInLanguage(lang)
            });
        });
        
        // 포맷별 삽입 명령어
        this.plugin.addCommand({
            id: 'transcribe-as-quote',
            name: 'Transcribe and Insert as Quote',
            callback: () => this.transcribeWithFormat('quote')
        });
        
        this.plugin.addCommand({
            id: 'transcribe-as-bullet',
            name: 'Transcribe and Insert as Bullet List',
            callback: () => this.transcribeWithFormat('bullet')
        });
    }
    
    private async quickTranscribe(file: TFile): Promise<void> {
        try {
            const buffer = await this.plugin.app.vault.readBinary(file);
            const response = await this.whisperService.transcribe(buffer, {
                language: 'auto',
                temperature: 0.2 // 낮은 온도로 일관성 향상
            });
            
            // 바로 삽입
            const activeView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
            if (activeView) {
                activeView.editor.replaceSelection(response.text);
            }
        } catch (error) {
            this.logger.error('Quick transcribe failed', error as Error);
        }
    }
    
    private async getLastRecording(): Promise<TFile | null> {
        const files = this.plugin.app.vault.getFiles()
            .filter(f => this.isAudioFile(f))
            .sort((a, b) => b.stat.mtime - a.stat.mtime);
        
        return files[0] || null;
    }
    
    private isAudioFile(file: TFile): boolean {
        const audioExtensions = ['m4a', 'mp3', 'wav', 'mp4', 'ogg', 'webm'];
        return audioExtensions.includes(file.extension.toLowerCase());
    }
    
    private getLanguageName(code: string): string {
        const names: Record<string, string> = {
            'ko': 'Korean',
            'en': 'English',
            'ja': 'Japanese',
            'zh': 'Chinese'
        };
        return names[code] || code;
    }
    
    private async transcribeInLanguage(language: string): Promise<void> {
        // 파일 선택 모달 표시
        const modal = new AudioFilePickerModal(
            this.plugin.app,
            async (file) => {
                const buffer = await this.plugin.app.vault.readBinary(file);
                const response = await this.whisperService.transcribe(buffer, {
                    language
                });
                this.insertText(response.text);
            }
        );
        modal.open();
    }
    
    private async transcribeWithFormat(format: string): Promise<void> {
        // 구현...
    }
    
    private insertText(text: string): void {
        const activeView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
        if (activeView) {
            activeView.editor.replaceSelection(text);
        }
    }
}

/**
 * 예제 2: 커스텀 UI 모달
 */
class TranscriptionOptionsModal extends Modal {
    private result: WhisperOptions = {
        language: 'auto',
        temperature: 0.5,
        responseFormat: 'json'
    };
    private onSubmit: (options: WhisperOptions) => void;
    
    constructor(
        app: App,
        onSubmit: (options: WhisperOptions) => void
    ) {
        super(app);
        this.onSubmit = onSubmit;
    }
    
    onOpen() {
        const { contentEl } = this;
        
        contentEl.createEl('h2', { text: 'Transcription Options' });
        
        // 언어 선택
        new Setting(contentEl)
            .setName('Language')
            .setDesc('Select transcription language')
            .addDropdown(dropdown => dropdown
                .addOptions({
                    'auto': 'Auto-detect',
                    'ko': 'Korean',
                    'en': 'English',
                    'ja': 'Japanese',
                    'zh': 'Chinese'
                })
                .setValue(this.result.language || 'auto')
                .onChange(value => {
                    this.result.language = value;
                })
            );
        
        // 온도 설정
        new Setting(contentEl)
            .setName('Temperature')
            .setDesc('Creativity level (0=consistent, 1=creative)')
            .addSlider(slider => slider
                .setLimits(0, 1, 0.1)
                .setValue(this.result.temperature || 0.5)
                .setDynamicTooltip()
                .onChange(value => {
                    this.result.temperature = value;
                })
            );
        
        // 응답 형식
        new Setting(contentEl)
            .setName('Response Format')
            .setDesc('Choose output format')
            .addDropdown(dropdown => dropdown
                .addOptions({
                    'json': 'JSON',
                    'text': 'Plain Text',
                    'verbose_json': 'Detailed JSON with timestamps'
                })
                .setValue(this.result.responseFormat || 'json')
                .onChange(value => {
                    this.result.responseFormat = value as any;
                })
            );
        
        // 프롬프트
        new Setting(contentEl)
            .setName('Context Prompt')
            .setDesc('Provide context for better accuracy')
            .addTextArea(text => text
                .setPlaceholder('Previous conversation or technical terms...')
                .onChange(value => {
                    this.result.prompt = value;
                })
            );
        
        // 버튼
        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText('Cancel')
                .onClick(() => {
                    this.close();
                })
            )
            .addButton(btn => btn
                .setButtonText('Start Transcription')
                .setCta()
                .onClick(() => {
                    this.close();
                    this.onSubmit(this.result);
                })
            );
    }
    
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

/**
 * 예제 3: 실시간 모니터링 대시보드
 */
class TranscriptionDashboard {
    private containerEl: HTMLElement;
    private stats = {
        totalTranscriptions: 0,
        totalDuration: 0,
        totalCharacters: 0,
        averageProcessingTime: 0,
        languageStats: new Map<string, number>(),
        errorCount: 0
    };
    
    constructor(
        private eventManager: any,
        private logger: ILogger
    ) {
        this.createDashboard();
        this.setupEventListeners();
    }
    
    private createDashboard(): void {
        // 대시보드 컨테이너 생성
        this.containerEl = document.createElement('div');
        this.containerEl.className = 'transcription-dashboard';
        this.containerEl.innerHTML = `
            <div class="dashboard-header">
                <h3>Transcription Statistics</h3>
                <button class="reset-btn">Reset</button>
            </div>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value" id="total-transcriptions">0</div>
                    <div class="stat-label">Total Transcriptions</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" id="total-duration">0m</div>
                    <div class="stat-label">Total Audio Duration</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" id="total-characters">0</div>
                    <div class="stat-label">Characters Transcribed</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" id="avg-time">0s</div>
                    <div class="stat-label">Avg Processing Time</div>
                </div>
            </div>
            <div class="language-chart" id="language-chart"></div>
            <div class="recent-activity" id="recent-activity">
                <h4>Recent Activity</h4>
                <ul id="activity-list"></ul>
            </div>
        `;
        
        // 스타일 추가
        this.addStyles();
        
        // 리셋 버튼 이벤트
        const resetBtn = this.containerEl.querySelector('.reset-btn') as HTMLButtonElement;
        resetBtn.onclick = () => this.resetStats();
    }
    
    private setupEventListeners(): void {
        // 변환 완료 이벤트
        this.eventManager.on('transcription:complete', (data: any) => {
            this.stats.totalTranscriptions++;
            this.stats.totalDuration += data.duration || 0;
            this.stats.totalCharacters += data.text.length;
            
            // 언어별 통계
            const lang = data.language || 'unknown';
            this.stats.languageStats.set(
                lang,
                (this.stats.languageStats.get(lang) || 0) + 1
            );
            
            // UI 업데이트
            this.updateDashboard();
            
            // 활동 로그 추가
            this.addActivityLog({
                time: new Date(),
                type: 'success',
                message: `Transcribed ${data.duration}s of audio (${lang})`
            });
        });
        
        // 에러 이벤트
        this.eventManager.on('transcription:error', (data: any) => {
            this.stats.errorCount++;
            
            this.addActivityLog({
                time: new Date(),
                type: 'error',
                message: `Error: ${data.error.message}`
            });
        });
        
        // 진행 상황 이벤트
        this.eventManager.on('transcription:progress', (data: any) => {
            this.updateProgressIndicator(data.progress);
        });
    }
    
    private updateDashboard(): void {
        // 통계 업데이트
        document.getElementById('total-transcriptions')!.textContent = 
            this.stats.totalTranscriptions.toString();
        
        document.getElementById('total-duration')!.textContent = 
            this.formatDuration(this.stats.totalDuration);
        
        document.getElementById('total-characters')!.textContent = 
            this.formatNumber(this.stats.totalCharacters);
        
        document.getElementById('avg-time')!.textContent = 
            this.stats.totalTranscriptions > 0
                ? `${(this.stats.averageProcessingTime / this.stats.totalTranscriptions).toFixed(1)}s`
                : '0s';
        
        // 언어 차트 업데이트
        this.updateLanguageChart();
    }
    
    private updateLanguageChart(): void {
        const chartEl = document.getElementById('language-chart')!;
        
        // 간단한 막대 차트
        const total = Array.from(this.stats.languageStats.values())
            .reduce((sum, count) => sum + count, 0);
        
        let html = '<h4>Language Distribution</h4><div class="bars">';
        
        this.stats.languageStats.forEach((count, lang) => {
            const percentage = (count / total) * 100;
            html += `
                <div class="bar-row">
                    <span class="lang-label">${lang}</span>
                    <div class="bar-container">
                        <div class="bar" style="width: ${percentage}%"></div>
                    </div>
                    <span class="count">${count}</span>
                </div>
            `;
        });
        
        html += '</div>';
        chartEl.innerHTML = html;
    }
    
    private addActivityLog(entry: {
        time: Date;
        type: 'success' | 'error' | 'info';
        message: string;
    }): void {
        const listEl = document.getElementById('activity-list')!;
        const li = document.createElement('li');
        li.className = `activity-item activity-${entry.type}`;
        li.innerHTML = `
            <span class="time">${entry.time.toLocaleTimeString()}</span>
            <span class="message">${entry.message}</span>
        `;
        
        // 최신 항목을 위에 추가
        listEl.insertBefore(li, listEl.firstChild);
        
        // 최대 10개 항목만 유지
        while (listEl.children.length > 10) {
            listEl.removeChild(listEl.lastChild!);
        }
    }
    
    private updateProgressIndicator(progress: number): void {
        // 진행 상황 표시기 업데이트
        let progressEl = document.getElementById('progress-indicator');
        if (!progressEl) {
            progressEl = document.createElement('div');
            progressEl.id = 'progress-indicator';
            progressEl.className = 'progress-indicator';
            this.containerEl.appendChild(progressEl);
        }
        
        progressEl.innerHTML = `
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
            <span class="progress-text">${Math.round(progress)}%</span>
        `;
        
        if (progress >= 100) {
            setTimeout(() => progressEl?.remove(), 2000);
        }
    }
    
    private resetStats(): void {
        this.stats = {
            totalTranscriptions: 0,
            totalDuration: 0,
            totalCharacters: 0,
            averageProcessingTime: 0,
            languageStats: new Map(),
            errorCount: 0
        };
        this.updateDashboard();
        document.getElementById('activity-list')!.innerHTML = '';
    }
    
    private formatDuration(seconds: number): string {
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        }
        return `${minutes}m`;
    }
    
    private formatNumber(num: number): string {
        if (num >= 1000000) {
            return `${(num / 1000000).toFixed(1)}M`;
        }
        if (num >= 1000) {
            return `${(num / 1000).toFixed(1)}K`;
        }
        return num.toString();
    }
    
    private addStyles(): void {
        const style = document.createElement('style');
        style.textContent = `
            .transcription-dashboard {
                padding: 20px;
                background: var(--background-primary);
                border-radius: 8px;
                margin: 20px 0;
            }
            
            .dashboard-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
            }
            
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 15px;
                margin-bottom: 30px;
            }
            
            .stat-card {
                background: var(--background-secondary);
                padding: 15px;
                border-radius: 6px;
                text-align: center;
            }
            
            .stat-value {
                font-size: 24px;
                font-weight: bold;
                color: var(--text-accent);
            }
            
            .stat-label {
                font-size: 12px;
                color: var(--text-muted);
                margin-top: 5px;
            }
            
            .bar-row {
                display: flex;
                align-items: center;
                margin: 10px 0;
            }
            
            .lang-label {
                width: 60px;
                font-size: 12px;
            }
            
            .bar-container {
                flex: 1;
                height: 20px;
                background: var(--background-modifier-border);
                border-radius: 3px;
                margin: 0 10px;
                overflow: hidden;
            }
            
            .bar {
                height: 100%;
                background: var(--interactive-accent);
                transition: width 0.3s ease;
            }
            
            .activity-item {
                display: flex;
                justify-content: space-between;
                padding: 8px;
                margin: 5px 0;
                border-radius: 4px;
                background: var(--background-secondary);
            }
            
            .activity-success {
                border-left: 3px solid var(--text-success);
            }
            
            .activity-error {
                border-left: 3px solid var(--text-error);
            }
            
            .progress-indicator {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: var(--background-primary);
                padding: 15px;
                border-radius: 6px;
                box-shadow: var(--shadow-s);
                min-width: 200px;
            }
            
            .progress-bar {
                height: 4px;
                background: var(--background-modifier-border);
                border-radius: 2px;
                overflow: hidden;
            }
            
            .progress-fill {
                height: 100%;
                background: var(--interactive-accent);
                transition: width 0.3s ease;
            }
            
            .progress-text {
                display: block;
                text-align: center;
                margin-top: 8px;
                font-size: 12px;
                color: var(--text-muted);
            }
        `;
        document.head.appendChild(style);
    }
    
    public mount(containerEl: HTMLElement): void {
        containerEl.appendChild(this.containerEl);
    }
    
    public unmount(): void {
        this.containerEl.remove();
    }
}

/**
 * 예제 4: 워크플로우 자동화
 */
class AutomatedWorkflow {
    private rules: WorkflowRule[] = [];
    
    constructor(
        private eventManager: any,
        private whisperService: IWhisperService,
        private logger: ILogger
    ) {
        this.setupDefaultRules();
    }
    
    private setupDefaultRules(): void {
        // 규칙 1: 특정 폴더의 오디오 파일 자동 변환
        this.addRule({
            name: 'Auto-transcribe recordings',
            trigger: 'file:created',
            condition: (data) => {
                return data.file.path.startsWith('Recordings/') &&
                       this.isAudioFile(data.file);
            },
            action: async (data) => {
                await this.transcribeFile(data.file);
            }
        });
        
        // 규칙 2: 변환 완료 시 자동 태그 추가
        this.addRule({
            name: 'Auto-tag transcriptions',
            trigger: 'transcription:complete',
            condition: (data) => data.language !== 'en',
            action: async (data) => {
                const tag = `#transcribed-${data.language}`;
                await this.addTagToCurrentNote(tag);
            }
        });
        
        // 규칙 3: 에러 발생 시 로그 파일 생성
        this.addRule({
            name: 'Log errors',
            trigger: 'transcription:error',
            condition: () => true,
            action: async (data) => {
                await this.logError(data.error);
            }
        });
    }
    
    public addRule(rule: WorkflowRule): void {
        this.rules.push(rule);
        
        // 이벤트 리스너 등록
        this.eventManager.on(rule.trigger, async (data: any) => {
            if (rule.condition(data)) {
                try {
                    await rule.action(data);
                    this.logger.debug(`Workflow rule executed: ${rule.name}`);
                } catch (error) {
                    this.logger.error(`Workflow rule failed: ${rule.name}`, error as Error);
                }
            }
        });
    }
    
    private async transcribeFile(file: TFile): Promise<void> {
        const buffer = await this.app.vault.readBinary(file);
        const response = await this.whisperService.transcribe(buffer);
        
        // 변환 결과를 같은 폴더에 마크다운으로 저장
        const transcriptionPath = file.path.replace(/\.[^.]+$/, '.md');
        await this.app.vault.create(
            transcriptionPath,
            `# Transcription of ${file.name}\n\n${response.text}`
        );
    }
    
    private async addTagToCurrentNote(tag: string): Promise<void> {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (activeView) {
            const editor = activeView.editor;
            const content = editor.getValue();
            
            // 프론트매터에 태그 추가
            if (content.startsWith('---')) {
                // 기존 프론트매터가 있는 경우
                const endIndex = content.indexOf('---', 3);
                const frontmatter = content.substring(0, endIndex);
                
                if (frontmatter.includes('tags:')) {
                    // tags 필드가 있는 경우
                    const newContent = content.replace(
                        /tags:\s*\[(.*?)\]/,
                        (match, tags) => `tags: [${tags}, ${tag}]`
                    );
                    editor.setValue(newContent);
                } else {
                    // tags 필드 추가
                    const newContent = content.replace(
                        '---',
                        `---\ntags: [${tag}]`
                    );
                    editor.setValue(newContent);
                }
            } else {
                // 프론트매터 생성
                editor.setValue(`---\ntags: [${tag}]\n---\n\n${content}`);
            }
        }
    }
    
    private async logError(error: Error): Promise<void> {
        const logPath = `Logs/transcription-errors-${new Date().toISOString().split('T')[0]}.md`;
        
        let logContent = '';
        if (await this.app.vault.adapter.exists(logPath)) {
            logContent = await this.app.vault.adapter.read(logPath);
        }
        
        logContent += `\n## Error at ${new Date().toLocaleString()}\n`;
        logContent += `- **Message**: ${error.message}\n`;
        logContent += `- **Stack**: \`\`\`\n${error.stack}\n\`\`\`\n`;
        
        await this.app.vault.adapter.write(logPath, logContent);
    }
    
    private isAudioFile(file: TFile): boolean {
        const audioExtensions = ['m4a', 'mp3', 'wav', 'mp4', 'ogg', 'webm'];
        return audioExtensions.includes(file.extension.toLowerCase());
    }
}

// 인터페이스 정의
interface WorkflowRule {
    name: string;
    trigger: string;
    condition: (data: any) => boolean;
    action: (data: any) => Promise<void>;
}

interface AudioFilePickerModal extends Modal {
    // 구현...
}

// 내보내기
export {
    CustomTranscriptionCommands,
    TranscriptionOptionsModal,
    TranscriptionDashboard,
    AutomatedWorkflow
};