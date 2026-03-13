/**
 * 상태 메시지 표시 시스템
 * - 현재 작업 단계 표시
 * - 상세 로그 메시지
 * - 에러 메시지 및 해결 방법
 * - 다국어 지원
 */

import { EventManager } from '../../application/EventManager';

export type Language = 'en';
export type MessageType = 'info' | 'success' | 'warning' | 'error' | 'progress';

export interface StatusMessage {
    key: string;
    type: MessageType;
    params?: Record<string, unknown>;
    timestamp?: number;
}

export interface LocalizedMessage {
    [key: string]: {
        en: string;
    };
}

const englishOnly = (message: string): { en: string } => ({ en: message });

/**
 * 다국어 메시지 저장소
 */
export class MessageStore {
    private static messages: LocalizedMessage = {
        'file.selecting': englishOnly('Selecting file...'),
        'file.selected': englishOnly('File selected: {fileName}'),
        'file.validating': englishOnly('Validating file...'),
        'file.invalid_format': englishOnly(
            'Unsupported file format. Only {supportedFormats} formats are supported.'
        ),
        'file.too_large': englishOnly('File is too large. Maximum {maxSize} is supported.'),
        'upload.preparing': englishOnly('Preparing upload...'),
        'upload.progress': englishOnly('Uploading... {percentage}%'),
        'upload.completed': englishOnly('Upload completed'),
        'upload.failed': englishOnly('Upload failed: {error}'),
        'api.connecting': englishOnly('Connecting to API server...'),
        'api.processing': englishOnly('Processing audio... This may take a few minutes.'),
        'api.transcribing': englishOnly('Transcribing audio to text... {percentage}%'),
        'api.formatting': englishOnly('Formatting text...'),
        'api.completed': englishOnly('Conversion completed'),
        'api.rate_limit': englishOnly(
            'API rate limit reached. Please try again after {retryAfter} seconds.'
        ),
        'error.network': englishOnly(
            'Network connection failed. Please check your internet connection.'
        ),
        'error.api_key_invalid': englishOnly(
            'Invalid API key. Please enter a valid API key in settings.'
        ),
        'error.api_key_missing': englishOnly(
            'API key is not set. Please enter an API key in settings.'
        ),
        'error.server': englishOnly('Server error occurred. Please try again later.'),
        'error.timeout': englishOnly(
            'Request timed out. Please reduce file size or check network connection.'
        ),
        'error.unknown': englishOnly('Unknown error occurred: {error}'),
        'success.saved': englishOnly('Saved'),
        'success.copied': englishOnly('Copied to clipboard'),
        'success.inserted': englishOnly('Text inserted'),
        'step.initializing': englishOnly('Initializing...'),
        'step.file_selection': englishOnly('File selection'),
        'step.file_validation': englishOnly('File validation'),
        'step.uploading': englishOnly('Uploading'),
        'step.processing': englishOnly('API processing'),
        'step.formatting': englishOnly('Formatting'),
        'step.completed': englishOnly('Completed'),
        'solution.check_internet': englishOnly(
            'Solution: Check your internet connection and try again.'
        ),
        'solution.check_api_key': englishOnly(
            'Solution: Make sure you have entered the correct API key in settings.'
        ),
        'solution.reduce_file_size': englishOnly(
            'Solution: Reduce file size or use a shorter audio file.'
        ),
        'solution.retry_later': englishOnly('Solution: Please try again later.'),
    };

    /**
     * 메시지 추가
     */
    static addMessage(key: string, translations: { en: string }) {
        this.messages[key] = translations;
    }

    private static formatParamValue(value: unknown): string {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';

        if (typeof value === 'string') return value;
        if (typeof value === 'number') return Number.isNaN(value) ? 'NaN' : value.toString();
        if (typeof value === 'boolean') return value ? 'true' : 'false';
        if (typeof value === 'bigint') return value.toString();
        if (typeof value === 'symbol') return value.description ?? 'symbol';
        if (typeof value === 'function') return '[function]';

        try {
            return JSON.stringify(value);
        } catch {
            return '[unserializable]';
        }
    }

    /**
     * 메시지 가져오기
     */
    static getMessage(key: string, lang: Language, params?: Record<string, unknown>): string {
        const message = this.messages[key]?.[lang] || key;

        if (!params) return message;

        // 파라미터 치환
        return message.replace(/\{(\w+)\}/g, (match: string, param: string) => {
            const value = params[param];
            return value !== undefined ? this.formatParamValue(value) : match;
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
    private currentLanguage: Language = 'en';
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
        this.currentLanguage = options.language || 'en';
        this.maxMessages = options.maxMessages || 50;
        this.showTimestamp = options.showTimestamp !== false;
        this.autoScroll = options.autoScroll !== false;
        this.eventManager = EventManager.getInstance();
    }

    private isLanguage(value: string): value is Language {
        return value === 'en';
    }

    /**
     * 컴포넌트 생성
     */
    create(container: HTMLElement): HTMLElement {
        this.element = createEl('div', { cls: 'sn-status-message-display' });
        this.element.setAttribute('role', 'log');
        this.element.setAttribute('aria-label', 'Status message log');
        this.element.setAttribute('aria-live', 'polite');

        // 헤더
        const header = createEl('div', { cls: 'sn-status-message-display__header' });

        const title = createEl('h3', {
            text: this.getLocalizedText('Status messages'),
        });
        header.appendChild(title);

        // 컨트롤
        const controls = createEl('div', { cls: 'sn-status-message-display__controls' });

        // 언어 선택
        const langSelect = createEl('select', { cls: 'sn-status-message-display__lang-select' });
        langSelect.setAttribute('aria-label', 'Language selection');

        const languages = [{ value: 'en', label: 'English' }];

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
            cls: 'sn-status-message-display__clear',
            text: this.getLocalizedText('Clear'),
        });
        clearBtn.addEventListener('click', () => this.clear());
        controls.appendChild(clearBtn);

        header.appendChild(controls);
        this.element.appendChild(header);

        // 메시지 컨테이너
        const messageContainer = createEl('div', { cls: 'sn-status-message-display__messages' });
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

        const messageContainer = this.element.querySelector('.sn-status-message-display__messages');
        if (!messageContainer) return;

        const messageEl = createEl('div', {
            cls: `sn-status-message sn-status-message--${message.type}`,
        });

        // 타임스탬프
        if (this.showTimestamp && message.timestamp) {
            const timestamp = createEl('span', {
                cls: 'sn-status-message__timestamp',
                text: this.formatTimestamp(message.timestamp),
            });
            messageEl.appendChild(timestamp);
        }

        // 아이콘
        const icon = createEl('span', {
            cls: 'sn-status-message__icon',
            text: this.getMessageIcon(message.type),
        });
        messageEl.appendChild(icon);

        // 메시지 텍스트
        const text = createEl('span', {
            cls: 'sn-status-message__text',
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
            messageEl.classList.add('sn-status-message--show');
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

        const messageContainer = this.element.querySelector('.sn-status-message-display__messages');
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
                '.sn-status-message-display__messages'
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
    private getLocalizedText(en: string): string {
        return en;
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
    private currentLanguage: Language = 'en';
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
        this.currentLanguage = 'en';
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
    showMessage(key: string, type: MessageType = 'info', params?: Record<string, unknown>) {
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
    info(key: string, params?: Record<string, unknown>) {
        this.showMessage(key, 'info', params);
    }

    /**
     * 성공 메시지
     */
    success(key: string, params?: Record<string, unknown>) {
        this.showMessage(key, 'success', params);
    }

    /**
     * 경고 메시지
     */
    warning(key: string, params?: Record<string, unknown>) {
        this.showMessage(key, 'warning', params);
    }

    /**
     * 오류 메시지
     */
    error(key: string, params?: Record<string, unknown>) {
        this.showMessage(key, 'error', params);
    }

    /**
     * 진행 메시지
     */
    progress(key: string, params?: Record<string, unknown>) {
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
