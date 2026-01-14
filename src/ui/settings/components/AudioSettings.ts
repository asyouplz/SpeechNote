import { Setting } from 'obsidian';
import type SpeechToTextPlugin from '../../../main';

/**
 * 오디오 설정 컴포넌트
 * 음성 변환 관련 설정을 관리
 */
export class AudioSettings {
    constructor(private plugin: SpeechToTextPlugin) {}

    render(containerEl: HTMLElement): void {
        // 언어 설정
        new Setting(containerEl)
            .setName('언어')
            .setDesc('음성 인식 언어를 선택하세요 (자동 감지 권장)')
            .addDropdown(dropdown => dropdown
                .addOption('auto', '자동 감지')
                .addOption('en', 'English')
                .addOption('ko', '한국어')
                .addOption('ja', '日本語')
                .addOption('zh', '中文')
                .addOption('es', 'Español')
                .addOption('fr', 'Français')
                .addOption('de', 'Deutsch')
                .addOption('it', 'Italiano')
                .addOption('pt', 'Português')
                .addOption('ru', 'Русский')
                .addOption('ar', 'العربية')
                .addOption('hi', 'हिन्दी')
                .setValue(this.plugin.settings.language)
                .onChange(async (value) => {
                    this.plugin.settings.language = value;
                    await this.plugin.saveSettings();
                }));

        // Whisper 모델 선택
        new Setting(containerEl)
            .setName('Whisper 모델')
            .setDesc('사용할 Whisper 모델을 선택하세요')
            .addDropdown(dropdown => dropdown
                .addOption('whisper-1', 'Whisper-1 (기본)')
                .setValue(this.plugin.settings.model)
                .onChange(async (value: string) => {
                    if (value === 'whisper-1') {
                        this.plugin.settings.model = value;
                        await this.plugin.saveSettings();
                    }
                }))
            .setDisabled(true); // 현재는 whisper-1만 지원

        // 응답 형식
        new Setting(containerEl)
            .setName('응답 형식')
            .setDesc('API 응답 형식을 선택하세요')
            .addDropdown(dropdown => dropdown
                .addOption('json', 'JSON (구조화된 데이터)')
                .addOption('text', 'Text (일반 텍스트)')
                .addOption('verbose_json', 'Verbose JSON (상세 정보)')
                .addOption('srt', 'SRT (자막 형식)')
                .addOption('vtt', 'VTT (WebVTT 형식)')
                .setValue(
                    typeof this.plugin.settings['responseFormat'] === 'string'
                        ? this.plugin.settings['responseFormat']
                        : 'json'
                )
                .onChange(async (value) => {
                    this.plugin.settings['responseFormat'] = value;
                    await this.plugin.saveSettings();
                }));

        // 온도 설정
        const temperatureSetting = new Setting(containerEl)
            .setName('온도 (Temperature)')
            .setDesc('텍스트 생성의 창의성 수준 (0: 보수적, 1: 창의적)');

        const tempValue = containerEl.createDiv({ cls: 'temperature-value' });
        tempValue.setText(String(this.plugin.settings.temperature || 0));

        temperatureSetting.addSlider(slider => slider
            .setLimits(0, 1, 0.1)
            .setValue(this.plugin.settings.temperature || 0)
            .onChange(async (value) => {
                this.plugin.settings.temperature = value;
                tempValue.setText(String(value));
                await this.plugin.saveSettings();
            })
            .setDynamicTooltip());

        // 프롬프트 설정
        new Setting(containerEl)
            .setName('커스텀 프롬프트')
            .setDesc('음성 인식을 가이드할 프롬프트를 입력하세요 (선택사항)')
            .addTextArea(text => text
                .setPlaceholder('예: 의학 용어가 포함된 대화입니다.')
                .setValue(this.plugin.settings.prompt || '')
                .onChange(async (value) => {
                    this.plugin.settings.prompt = value;
                    await this.plugin.saveSettings();
                }));

        // 파일 크기 제한
        const fileSizeSetting = new Setting(containerEl)
            .setName('최대 파일 크기')
            .setDesc('업로드 가능한 최대 파일 크기 (MB)');

        const sizeValue = containerEl.createDiv({ cls: 'filesize-value' });
        const currentSize = Math.round(this.plugin.settings.maxFileSize / (1024 * 1024));
        sizeValue.setText(`${currentSize} MB`);

        fileSizeSetting.addSlider(slider => slider
            .setLimits(1, 25, 1)
            .setValue(currentSize)
            .onChange(async (value) => {
                this.plugin.settings.maxFileSize = value * 1024 * 1024;
                sizeValue.setText(`${value} MB`);
                await this.plugin.saveSettings();
            })
            .setDynamicTooltip());

        // 오디오 품질 설정
        new Setting(containerEl)
            .setName('오디오 전처리')
            .setDesc('업로드 전 오디오 파일을 최적화합니다')
            .addToggle(toggle => toggle
                .setValue(false)
                .onChange(async (_value) => {
                    // 오디오 전처리 설정
                    await this.plugin.saveSettings();
                }));

        // 노이즈 제거
        new Setting(containerEl)
            .setName('노이즈 제거')
            .setDesc('배경 소음을 자동으로 제거합니다 (실험적)')
            .addToggle(toggle => toggle
                .setValue(false)
                .onChange(async (_value) => {
                    // 노이즈 제거 설정
                    await this.plugin.saveSettings();
                }))
            .setDisabled(true); // 아직 구현되지 않음

        // 지원 파일 형식
        const formatInfo = containerEl.createDiv({ cls: 'format-info' });
        formatInfo.createEl('h4', { text: '지원 파일 형식' });
        
        const formatList = formatInfo.createEl('ul');
        const formats = [
            { ext: 'm4a', desc: 'Apple 오디오' },
            { ext: 'mp3', desc: 'MP3 오디오' },
            { ext: 'wav', desc: 'WAV 오디오' },
            { ext: 'mp4', desc: 'MP4 비디오 (오디오 추출)' },
            { ext: 'mpeg', desc: 'MPEG 오디오' },
            { ext: 'mpga', desc: 'MPEG 오디오' },
            { ext: 'webm', desc: 'WebM 오디오' }
        ];
        
        formats.forEach(format => {
            formatList.createEl('li', { 
                text: `${format.ext.toUpperCase()} - ${format.desc}` 
            });
        });

        // 제한사항 안내
        const limitations = containerEl.createDiv({ cls: 'limitations-info' });
        limitations.createEl('h4', { text: '제한사항' });
        
        const limitList = limitations.createEl('ul');
        const limits = [
            '최대 파일 크기: 25MB',
            '최대 오디오 길이: 제한 없음 (큰 파일은 자동 분할)',
            '동시 처리: 1개 파일',
            'API 요청 제한: 분당 50회'
        ];
        
        limits.forEach(limit => {
            limitList.createEl('li', { text: limit });
        });
    }
}
