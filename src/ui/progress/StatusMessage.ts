/**
 * 상태 메시지 표시 시스템
 * - 현재 작업 단계 표시
 * - 상세 로그 메시지
 * - 에러 메시지 및 해결 방법
 * - 다국어 지원
 */

import { EventManager } from '../../application/EventManager';

export type Language = 'ko' | 'en' | 'ja' | 'zh';
export type MessageType = 'info' | 'success' | 'warning' | 'error' | 'progress';

export interface StatusMessage {
    key: string;
    type: MessageType;
    params?: Record<string, any>;
    timestamp?: number;
}

export interface LocalizedMessage {
    [key: string]: {
        [lang in Language]: string;
    };
}

/**
 * 다국어 메시지 저장소
 */
export class MessageStore {
    private static messages: LocalizedMessage = {
        // 파일 선택 관련
        'file.selecting': {
            ko: '파일을 선택하는 중...',
            en: 'Selecting file...',
            ja: 'ファイルを選択中...',
            zh: '正在选择文件...',
        },
        'file.selected': {
            ko: '파일이 선택되었습니다: {fileName}',
            en: 'File selected: {fileName}',
            ja: 'ファイルが選択されました: {fileName}',
            zh: '已选择文件: {fileName}',
        },
        'file.validating': {
            ko: '파일을 검증하는 중...',
            en: 'Validating file...',
            ja: 'ファイルを検証中...',
            zh: '正在验证文件...',
        },
        'file.invalid_format': {
            ko: '지원하지 않는 파일 형식입니다. {supportedFormats} 형식만 지원됩니다.',
            en: 'Unsupported file format. Only {supportedFormats} formats are supported.',
            ja: 'サポートされていないファイル形式です。{supportedFormats}形式のみサポートされています。',
            zh: '不支持的文件格式。仅支持 {supportedFormats} 格式。',
        },
        'file.too_large': {
            ko: '파일이 너무 큽니다. 최대 {maxSize}까지 지원됩니다.',
            en: 'File is too large. Maximum {maxSize} is supported.',
            ja: 'ファイルが大きすぎます。最大{maxSize}までサポートされています。',
            zh: '文件太大。最大支持 {maxSize}。',
        },

        // 업로드 관련
        'upload.preparing': {
            ko: '업로드를 준비하는 중...',
            en: 'Preparing upload...',
            ja: 'アップロードの準備中...',
            zh: '正在准备上传...',
        },
        'upload.progress': {
            ko: '업로드 중... {percentage}%',
            en: 'Uploading... {percentage}%',
            ja: 'アップロード中... {percentage}%',
            zh: '正在上传... {percentage}%',
        },
        'upload.completed': {
            ko: '업로드가 완료되었습니다',
            en: 'Upload completed',
            ja: 'アップロードが完了しました',
            zh: '上传完成',
        },
        'upload.failed': {
            ko: '업로드에 실패했습니다: {error}',
            en: 'Upload failed: {error}',
            ja: 'アップロードに失敗しました: {error}',
            zh: '上传失败: {error}',
        },

        // API 처리 관련
        'api.connecting': {
            ko: 'API 서버에 연결하는 중...',
            en: 'Connecting to API server...',
            ja: 'APIサーバーに接続中...',
            zh: '正在连接到API服务器...',
        },
        'api.processing': {
            ko: '음성을 처리하는 중... 이 작업은 몇 분 정도 걸릴 수 있습니다.',
            en: 'Processing audio... This may take a few minutes.',
            ja: '音声を処理中... この作業には数分かかる場合があります。',
            zh: '正在处理音频... 这可能需要几分钟。',
        },
        'api.transcribing': {
            ko: '음성을 텍스트로 변환하는 중... {percentage}%',
            en: 'Transcribing audio to text... {percentage}%',
            ja: '音声をテキストに変換中... {percentage}%',
            zh: '正在将音频转换为文本... {percentage}%',
        },
        'api.formatting': {
            ko: '텍스트를 포맷팅하는 중...',
            en: 'Formatting text...',
            ja: 'テキストをフォーマット中...',
            zh: '正在格式化文本...',
        },
        'api.completed': {
            ko: '변환이 완료되었습니다',
            en: 'Conversion completed',
            ja: '変換が完了しました',
            zh: '转换完成',
        },
        'api.rate_limit': {
            ko: 'API 요청 한도에 도달했습니다. {retryAfter}초 후에 다시 시도해주세요.',
            en: 'API rate limit reached. Please try again after {retryAfter} seconds.',
            ja: 'APIリクエストの上限に達しました。{retryAfter}秒後に再試行してください。',
            zh: '已达到API请求限制。请在 {retryAfter} 秒后重试。',
        },

        // 에러 메시지
        'error.network': {
            ko: '네트워크 연결에 실패했습니다. 인터넷 연결을 확인해주세요.',
            en: 'Network connection failed. Please check your internet connection.',
            ja: 'ネットワーク接続に失敗しました。インターネット接続を確認してください。',
            zh: '网络连接失败。请检查您的互联网连接。',
        },
        'error.api_key_invalid': {
            ko: 'API 키가 유효하지 않습니다. 설정에서 올바른 API 키를 입력해주세요.',
            en: 'Invalid API key. Please enter a valid API key in settings.',
            ja: 'APIキーが無効です。設定で正しいAPIキーを入力してください。',
            zh: 'API密钥无效。请在设置中输入有效的API密钥。',
        },
        'error.api_key_missing': {
            ko: 'API 키가 설정되지 않았습니다. 설정에서 API 키를 입력해주세요.',
            en: 'API key is not set. Please enter an API key in settings.',
            ja: 'APIキーが設定されていません。設定でAPIキーを入力してください。',
            zh: 'API密钥未设置。请在设置中输入API密钥。',
        },
        'error.server': {
            ko: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
            en: 'Server error occurred. Please try again later.',
            ja: 'サーバーエラーが発生しました。しばらくしてから再試行してください。',
            zh: '服务器错误。请稍后重试。',
        },
        'error.timeout': {
            ko: '요청 시간이 초과되었습니다. 파일 크기를 줄이거나 네트워크 연결을 확인해주세요.',
            en: 'Request timed out. Please reduce file size or check network connection.',
            ja: 'リクエストがタイムアウトしました。ファイルサイズを減らすか、ネットワーク接続を確認してください。',
            zh: '请求超时。请减小文件大小或检查网络连接。',
        },
        'error.unknown': {
            ko: '알 수 없는 오류가 발생했습니다: {error}',
            en: 'Unknown error occurred: {error}',
            ja: '不明なエラーが発生しました: {error}',
            zh: '发生未知错误: {error}',
        },

        // 성공 메시지
        'success.saved': {
            ko: '저장되었습니다',
            en: 'Saved',
            ja: '保存されました',
            zh: '已保存',
        },
        'success.copied': {
            ko: '클립보드에 복사되었습니다',
            en: 'Copied to clipboard',
            ja: 'クリップボードにコピーされました',
            zh: '已复制到剪贴板',
        },
        'success.inserted': {
            ko: '텍스트가 삽입되었습니다',
            en: 'Text inserted',
            ja: 'テキストが挿入されました',
            zh: '文本已插入',
        },

        // 작업 단계
        'step.initializing': {
            ko: '초기화 중...',
            en: 'Initializing...',
            ja: '初期化中...',
            zh: '正在初始化...',
        },
        'step.file_selection': {
            ko: '파일 선택',
            en: 'File Selection',
            ja: 'ファイル選択',
            zh: '文件选择',
        },
        'step.file_validation': {
            ko: '파일 검증',
            en: 'File Validation',
            ja: 'ファイル検証',
            zh: '文件验证',
        },
        'step.uploading': {
            ko: '업로드',
            en: 'Uploading',
            ja: 'アップロード',
            zh: '上传',
        },
        'step.processing': {
            ko: 'API 처리',
            en: 'API Processing',
            ja: 'API処理',
            zh: 'API处理',
        },
        'step.formatting': {
            ko: '포맷팅',
            en: 'Formatting',
            ja: 'フォーマット',
            zh: '格式化',
        },
        'step.completed': {
            ko: '완료',
            en: 'Completed',
            ja: '完了',
            zh: '完成',
        },

        // 해결 방법
        'solution.check_internet': {
            ko: '해결 방법: 인터넷 연결을 확인하고 다시 시도해주세요.',
            en: 'Solution: Check your internet connection and try again.',
            ja: '解決方法: インターネット接続を確認して再試行してください。',
            zh: '解决方案: 检查您的互联网连接并重试。',
        },
        'solution.check_api_key': {
            ko: '해결 방법: 설정에서 올바른 API 키를 입력했는지 확인해주세요.',
            en: 'Solution: Make sure you have entered the correct API key in settings.',
            ja: '解決方法: 設定で正しいAPIキーを入力したことを確認してください。',
            zh: '解决方案: 确保您在设置中输入了正确的API密钥。',
        },
        'solution.reduce_file_size': {
            ko: '해결 방법: 파일 크기를 줄이거나 더 짧은 음성 파일을 사용해주세요.',
            en: 'Solution: Reduce file size or use a shorter audio file.',
            ja: '解決方法: ファイルサイズを減らすか、より短い音声ファイルを使用してください。',
            zh: '解决方案: 减小文件大小或使用较短的音频文件。',
        },
        'solution.retry_later': {
            ko: '해결 방법: 잠시 후 다시 시도해주세요.',
            en: 'Solution: Please try again later.',
            ja: '解決方法: しばらくしてから再試行してください。',
            zh: '解决方案: 请稍后重试。',
        },
    };

    /**
     * 메시지 추가
     */
    static addMessage(key: string, translations: { [lang in Language]: string }) {
        this.messages[key] = translations;
    }

    /**
     * 메시지 가져오기
     */
    static getMessage(key: string, lang: Language, params?: Record<string, any>): string {
        const message = this.messages[key]?.[lang] || key;

        if (!params) return message;

        // 파라미터 치환
        return message.replace(/\{(\w+)\}/g, (match, param) => {
            return params[param] !== undefined ? String(params[param]) : match;
        });
    }

    /**
     * 모든 메시지 가져오기
     */
    static getAllMessages(): LocalizedMessage {
        return this.messages;
    }
}

/**
 * 상태 메시지 표시 컴포넌트
 */
export class StatusMessageDisplay {
    private element: HTMLElement | null = null;
    private messageQueue: StatusMessage[] = [];
    private currentLanguage: Language = 'ko';
    private maxMessages = 50;
    private showTimestamp = true;
    private autoScroll = true;
    private eventManager: EventManager;

    constructor(
        options: {
            language?: Language;
            maxMessages?: number;
            showTimestamp?: boolean;
            autoScroll?: boolean;
        } = {}
    ) {
        this.currentLanguage = options.language || 'ko';
        this.maxMessages = options.maxMessages || 50;
        this.showTimestamp = options.showTimestamp !== false;
        this.autoScroll = options.autoScroll !== false;
        this.eventManager = EventManager.getInstance();
    }

    private isLanguage(value: string): value is Language {
        return value === 'ko' || value === 'en' || value === 'ja' || value === 'zh';
    }

    /**
     * 컴포넌트 생성
     */
    create(container: HTMLElement): HTMLElement {
        this.element = createEl('div', { cls: 'status-message-display' });
        this.element.setAttribute('role', 'log');
        this.element.setAttribute('aria-label', '상태 메시지 로그');
        this.element.setAttribute('aria-live', 'polite');

        // 헤더
        const header = createEl('div', { cls: 'status-message-display__header' });

        const title = createEl('h3', {
            text: this.getLocalizedText('Status Messages', '상태 메시지'),
        });
        header.appendChild(title);

        // 컨트롤
        const controls = createEl('div', { cls: 'status-message-display__controls' });

        // 언어 선택
        const langSelect = createEl('select', { cls: 'status-message-display__lang-select' });
        langSelect.setAttribute('aria-label', '언어 선택');

        const languages = [
            { value: 'ko', label: '한국어' },
            { value: 'en', label: 'English' },
            { value: 'ja', label: '日本語' },
            { value: 'zh', label: '中文' },
        ];

        if (langSelect instanceof HTMLSelectElement) {
            languages.forEach((lang) => {
                const option = createEl('option', { text: lang.label });
                if (option instanceof HTMLOptionElement) {
                    option.value = lang.value;
                    if (lang.value === this.currentLanguage) {
                        option.selected = true;
                    }
                    langSelect.appendChild(option);
                }
            });

            langSelect.addEventListener('change', () => {
                const value = langSelect.value;
                if (this.isLanguage(value)) {
                    this.setLanguage(value);
                }
            });
        }

        controls.appendChild(langSelect);

        // 클리어 버튼
        const clearBtn = createEl('button', {
            cls: 'status-message-display__clear',
            text: this.getLocalizedText('Clear', '지우기'),
        });
        clearBtn.addEventListener('click', () => this.clear());
        controls.appendChild(clearBtn);

        header.appendChild(controls);
        this.element.appendChild(header);

        // 메시지 컨테이너
        const messageContainer = createEl('div', { cls: 'status-message-display__messages' });
        this.element.appendChild(messageContainer);

        container.appendChild(this.element);

        return this.element;
    }

    /**
     * 메시지 추가
     */
    addMessage(message: StatusMessage) {
        if (!message.timestamp) {
            message.timestamp = Date.now();
        }

        this.messageQueue.push(message);

        // 최대 메시지 수 제한
        if (this.messageQueue.length > this.maxMessages) {
            this.messageQueue.shift();
        }

        this.renderMessage(message);

        // 이벤트 발생
        this.eventManager.emit('status:message', message);
    }

    /**
     * 메시지 렌더링
     */
    private renderMessage(message: StatusMessage) {
        if (!this.element) return;

        const messageContainer = this.element.querySelector('.status-message-display__messages');
        if (!messageContainer) return;

        const messageEl = createEl('div', {
            cls: `status-message status-message--${message.type}`,
        });

        // 타임스탬프
        if (this.showTimestamp && message.timestamp) {
            const timestamp = createEl('span', {
                cls: 'status-message__timestamp',
                text: this.formatTimestamp(message.timestamp),
            });
            messageEl.appendChild(timestamp);
        }

        // 아이콘
        const icon = createEl('span', {
            cls: 'status-message__icon',
            text: this.getMessageIcon(message.type),
        });
        messageEl.appendChild(icon);

        // 메시지 텍스트
        const text = createEl('span', {
            cls: 'status-message__text',
            text: MessageStore.getMessage(message.key, this.currentLanguage, message.params),
        });
        messageEl.appendChild(text);

        messageContainer.appendChild(messageEl);

        // 자동 스크롤
        if (this.autoScroll) {
            messageContainer.scrollTop = messageContainer.scrollHeight;
        }

        // 애니메이션
        requestAnimationFrame(() => {
            messageEl.classList.add('status-message--show');
        });
    }

    /**
     * 메시지 아이콘 가져오기
     */
    private getMessageIcon(type: MessageType): string {
        const icons: Record<MessageType, string> = {
            info: 'ⓘ',
            success: '✓',
            warning: '⚠',
            error: '✖',
            progress: '↺',
        };

        return icons[type] || '';
    }

    /**
     * 타임스탬프 포맷팅
     */
    private formatTimestamp(timestamp: number): string {
        const date = new Date(timestamp);
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    }

    /**
     * 언어 설정
     */
    setLanguage(language: Language) {
        this.currentLanguage = language;
        this.rerender();
    }

    /**
     * 전체 다시 렌더링
     */
    private rerender() {
        if (!this.element) return;

        const messageContainer = this.element.querySelector('.status-message-display__messages');
        if (!messageContainer) return;

        // 기존 메시지 제거
        messageContainer.replaceChildren();

        // 모든 메시지 다시 렌더링
        this.messageQueue.forEach((message) => {
            this.renderMessage(message);
        });
    }

    /**
     * 메시지 지우기
     */
    clear() {
        this.messageQueue = [];

        if (this.element) {
            const messageContainer = this.element.querySelector(
                '.status-message-display__messages'
            );
            if (messageContainer) {
                messageContainer.replaceChildren();
            }
        }

        // 이벤트 발생
        this.eventManager.emit('status:clear', {});
    }

    /**
     * 로컬라이즈된 텍스트 가져오기
     */
    private getLocalizedText(en: string, ko: string): string {
        return this.currentLanguage === 'ko' ? ko : en;
    }

    /**
     * 컴포넌트 제거
     */
    destroy() {
        this.element?.remove();
        this.element = null;
        this.messageQueue = [];
    }
}

/**
 * 상태 메시지 매니저
 */
export class StatusMessageManager {
    private static instance: StatusMessageManager;
    private display: StatusMessageDisplay | null = null;
    private currentLanguage: Language = 'ko';
    private eventManager: EventManager;

    private constructor() {
        this.eventManager = EventManager.getInstance();
        this.detectLanguage();
    }

    static getInstance(): StatusMessageManager {
        if (!this.instance) {
            this.instance = new StatusMessageManager();
        }
        return this.instance;
    }

    /**
     * 언어 자동 감지
     */
    private detectLanguage() {
        const lang = navigator.language.toLowerCase();

        if (lang.startsWith('ko')) {
            this.currentLanguage = 'ko';
        } else if (lang.startsWith('ja')) {
            this.currentLanguage = 'ja';
        } else if (lang.startsWith('zh')) {
            this.currentLanguage = 'zh';
        } else {
            this.currentLanguage = 'en';
        }
    }

    /**
     * 디스플레이 초기화
     */
    initDisplay(
        container: HTMLElement,
        options?: {
            language?: Language;
            maxMessages?: number;
            showTimestamp?: boolean;
            autoScroll?: boolean;
        }
    ) {
        this.display = new StatusMessageDisplay({
            language: options?.language || this.currentLanguage,
            ...options,
        });

        return this.display.create(container);
    }

    /**
     * 메시지 표시
     */
    showMessage(key: string, type: MessageType = 'info', params?: Record<string, any>) {
        if (!this.display) {
            console.warn('StatusMessageDisplay is not initialized');
            return;
        }

        this.display.addMessage({
            key,
            type,
            params,
            timestamp: Date.now(),
        });
    }

    /**
     * 정보 메시지
     */
    info(key: string, params?: Record<string, any>) {
        this.showMessage(key, 'info', params);
    }

    /**
     * 성공 메시지
     */
    success(key: string, params?: Record<string, any>) {
        this.showMessage(key, 'success', params);
    }

    /**
     * 경고 메시지
     */
    warning(key: string, params?: Record<string, any>) {
        this.showMessage(key, 'warning', params);
    }

    /**
     * 오류 메시지
     */
    error(key: string, params?: Record<string, any>) {
        this.showMessage(key, 'error', params);
    }

    /**
     * 진행 메시지
     */
    progress(key: string, params?: Record<string, any>) {
        this.showMessage(key, 'progress', params);
    }

    /**
     * 언어 설정
     */
    setLanguage(language: Language) {
        this.currentLanguage = language;
        this.display?.setLanguage(language);
    }

    /**
     * 메시지 지우기
     */
    clear() {
        this.display?.clear();
    }
}
