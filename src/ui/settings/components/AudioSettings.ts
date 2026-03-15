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
            .setName('Language')
            .setDesc('Choose the speech recognition language (auto-detect recommended)')
            .addDropdown((dropdown) =>
                dropdown
                    .addOption('auto', 'Auto-detect')
                    .addOption('en', 'English')
                    .addOption('ko', 'Korean')
                    .addOption('ja', 'Japanese')
                    .addOption('zh', 'Chinese')
                    .addOption('es', 'Spanish')
                    .addOption('fr', 'French')
                    .addOption('de', 'Deutsch')
                    .addOption('it', 'Italian')
                    .addOption('pt', 'Portuguese')
                    .addOption('ru', 'Russian')
                    .addOption('ar', 'Arabic')
                    .addOption('hi', 'Hindi')
                    .setValue(this.plugin.settings.language)
                    .onChange(async (value) => {
                        this.plugin.settings.language = value;
                        await this.plugin.saveSettings();
                    })
            );

        // Whisper 모델 선택
        new Setting(containerEl)
            .setName('General model')
            .setDesc('Choose which model to use')
            .addDropdown((dropdown) =>
                dropdown
                    .addOption('whisper-1', 'Default model')
                    .setValue(this.plugin.settings.model)
                    .onChange(async (value: string) => {
                        if (value === 'whisper-1') {
                            this.plugin.settings.model = value;
                            await this.plugin.saveSettings();
                        }
                    })
            )
            .setDisabled(true); // 현재는 whisper-1만 지원

        // 응답 형식
        new Setting(containerEl)
            .setName('Response format')
            .setDesc('Choose the API response format')
            .addDropdown((dropdown) =>
                dropdown
                    .addOption('json', 'JSON (structured data)')
                    .addOption('text', 'Text (plain text)')
                    .addOption('verbose_json', 'Detailed JSON output')
                    .addOption('srt', 'Subtitle format (.srt)')
                    .addOption('vtt', 'Caption format (.vtt)')
                    .setValue(
                        typeof this.plugin.settings['responseFormat'] === 'string'
                            ? this.plugin.settings['responseFormat']
                            : 'json'
                    )
                    .onChange(async (value) => {
                        this.plugin.settings['responseFormat'] = value;
                        await this.plugin.saveSettings();
                    })
            );

        // 온도 설정
        const temperatureSetting = new Setting(containerEl)
            .setName('Temperature')
            .setDesc('Creativity level for generated text (0 = focused, 1 = more varied)');

        const tempValue = containerEl.createDiv({ cls: 'temperature-value' });
        tempValue.setText(String(this.plugin.settings.temperature || 0));

        temperatureSetting.addSlider((slider) =>
            slider
                .setLimits(0, 1, 0.1)
                .setValue(this.plugin.settings.temperature || 0)
                .onChange(async (value) => {
                    this.plugin.settings.temperature = value;
                    tempValue.setText(String(value));
                    await this.plugin.saveSettings();
                })
                .setDynamicTooltip()
        );

        // 프롬프트 설정
        new Setting(containerEl)
            .setName('Custom prompt')
            .setDesc('Enter an optional prompt to guide speech recognition')
            .addTextArea((text) =>
                text
                    .setPlaceholder('Example: This recording contains medical terminology.')
                    .setValue(this.plugin.settings.prompt || '')
                    .onChange(async (value) => {
                        this.plugin.settings.prompt = value;
                        await this.plugin.saveSettings();
                    })
            );

        // 파일 크기 제한
        const fileSizeSetting = new Setting(containerEl)
            .setName('Maximum file size')
            .setDesc('Maximum upload size in megabytes');

        const sizeValue = containerEl.createDiv({ cls: 'filesize-value' });
        const currentSize = Math.round(this.plugin.settings.maxFileSize / (1024 * 1024));
        sizeValue.setText(`${currentSize} megabytes`);

        fileSizeSetting.addSlider((slider) =>
            slider
                .setLimits(1, 25, 1)
                .setValue(currentSize)
                .onChange(async (value) => {
                    this.plugin.settings.maxFileSize = value * 1024 * 1024;
                    sizeValue.setText(`${value} megabytes`);
                    await this.plugin.saveSettings();
                })
                .setDynamicTooltip()
        );

        // 오디오 품질 설정
        new Setting(containerEl)
            .setName('Audio preprocessing')
            .setDesc('Optimize audio files before upload')
            .addToggle((toggle) =>
                toggle.setValue(false).onChange(async (_value) => {
                    // 오디오 전처리 설정
                    await this.plugin.saveSettings();
                })
            );

        // 노이즈 제거
        new Setting(containerEl)
            .setName('Noise reduction')
            .setDesc('Automatically remove background noise (experimental)')
            .addToggle((toggle) =>
                toggle.setValue(false).onChange(async (_value) => {
                    // 노이즈 제거 설정
                    await this.plugin.saveSettings();
                })
            )
            .setDisabled(true); // 아직 구현되지 않음

        // 지원 파일 형식
        const formatInfo = containerEl.createDiv({ cls: 'format-info' });
        formatInfo.createEl('h4', { text: 'Supported file formats' });

        const formatList = formatInfo.createEl('ul');
        const formats = [
            { ext: 'm4a', desc: 'Apple audio' },
            { ext: 'mp3', desc: 'MP3 audio' },
            { ext: 'wav', desc: 'WAV audio' },
            { ext: 'mp4', desc: 'MP4 video (audio extracted)' },
            { ext: 'mpeg', desc: 'MPEG audio' },
            { ext: 'mpga', desc: 'MPEG audio' },
            { ext: 'webm', desc: 'WebM audio' },
        ];

        formats.forEach((format) => {
            formatList.createEl('li', {
                text: `${format.ext.toUpperCase()} - ${format.desc}`,
            });
        });

        // 제한사항 안내
        const limitations = containerEl.createDiv({ cls: 'limitations-info' });
        limitations.createEl('h4', { text: 'Limits' });

        const limitList = limitations.createEl('ul');
        const limits = [
            'Maximum file size: 25 megabytes',
            'Maximum audio length: unlimited (large files are split automatically)',
            'Concurrent processing: 1 file',
            'API request limit: 50 requests per minute',
        ];

        limits.forEach((limit) => {
            limitList.createEl('li', { text: limit });
        });
    }
}
