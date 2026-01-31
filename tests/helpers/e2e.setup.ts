/**
 * E2E Test Setup
 *
 * E2E 테스트 환경 설정
 * - DOM 환경 초기화
 * - 전역 Mock 설정
 * - 테스트 유틸리티 제공
 */

import '@testing-library/jest-dom';
import { requestUrl } from 'obsidian';
import { TextEncoder, TextDecoder } from 'util';

// 전역 객체 설정
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

jest.setTimeout(30000);

if (typeof HTMLMediaElement !== 'undefined') {
    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
        configurable: true,
        value: jest.fn().mockResolvedValue(undefined),
    });
    Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
        configurable: true,
        value: jest.fn(),
    });
}

const activeTimeouts = new Set<ReturnType<typeof setTimeout>>();
const activeIntervals = new Set<ReturnType<typeof setInterval>>();
const originalSetTimeout = global.setTimeout;
const originalSetInterval = global.setInterval;
const originalClearTimeout = global.clearTimeout;
const originalClearInterval = global.clearInterval;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;
const originalConsoleInfo = console.info;
const originalConsoleDebug = console.debug;
const originalConsoleLog = console.log;

const IGNORED_CONSOLE_WARNINGS = ['Workspace event API not available', '[E2E-Test]'];
const IGNORED_CONSOLE_ERRORS = ['Critical error in render()', '[E2E-Test]'];
const IGNORED_CONSOLE_INFO = [
    'Whisper provider initialized',
    'Deepgram provider initialized',
    'Providers reinitialized with new configuration',
];
const IGNORED_CONSOLE_DEBUG = ['Deepgram provider not initialized: disabled or missing API key'];
const IGNORED_CONSOLE_LOG = ['[DEBUG] Test message'];

const shouldIgnoreConsoleMessage = (ignored: string[], args: unknown[]): boolean =>
    args.some((arg) => typeof arg === 'string' && ignored.some((text) => arg.includes(text)));

console.warn = (...args: unknown[]) => {
    if (shouldIgnoreConsoleMessage(IGNORED_CONSOLE_WARNINGS, args)) {
        return;
    }
    originalConsoleWarn(...args);
};
console.error = (...args: unknown[]) => {
    if (shouldIgnoreConsoleMessage(IGNORED_CONSOLE_ERRORS, args)) {
        return;
    }
    originalConsoleError(...args);
};
console.info = (...args: unknown[]) => {
    if (shouldIgnoreConsoleMessage(IGNORED_CONSOLE_INFO, args)) {
        return;
    }
    originalConsoleInfo(...args);
};
console.debug = (...args: unknown[]) => {
    if (shouldIgnoreConsoleMessage(IGNORED_CONSOLE_DEBUG, args)) {
        return;
    }
    originalConsoleDebug(...args);
};
console.log = (...args: unknown[]) => {
    if (shouldIgnoreConsoleMessage(IGNORED_CONSOLE_LOG, args)) {
        return;
    }
    originalConsoleLog(...args);
};

global.setTimeout = ((...args: Parameters<typeof setTimeout>) => {
    const id = originalSetTimeout(...args);
    activeTimeouts.add(id);
    return id;
}) as typeof setTimeout;

global.setInterval = ((...args: Parameters<typeof setInterval>) => {
    const id = originalSetInterval(...args);
    activeIntervals.add(id);
    return id;
}) as typeof setInterval;

global.clearTimeout = ((id: ReturnType<typeof setTimeout>) => {
    activeTimeouts.delete(id);
    return originalClearTimeout(id);
}) as typeof clearTimeout;

global.clearInterval = ((id: ReturnType<typeof setInterval>) => {
    activeIntervals.delete(id);
    return originalClearInterval(id);
}) as typeof clearInterval;

// Obsidian requestUrl Mock
(requestUrl as jest.Mock).mockClear();

// LocalStorage Mock
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    length: 0,
    key: jest.fn(),
};
global.localStorage = localStorageMock as any;

// SessionStorage Mock
global.sessionStorage = localStorageMock as any;

// IndexedDB Mock
const indexedDBMock = {
    open: jest.fn().mockReturnValue({
        onsuccess: jest.fn(),
        onerror: jest.fn(),
        onupgradeneeded: jest.fn(),
    }),
};
global.indexedDB = indexedDBMock as any;

// File API Mock
global.File = class File {
    name: string;
    size: number;
    type: string;
    lastModified: number;
    private content: ArrayBuffer;

    constructor(
        bits: Array<ArrayBuffer | ArrayBufferView | Blob | string>,
        name: string,
        options?: FilePropertyBag
    ) {
        this.name = name;
        this.type = options?.type || '';
        this.lastModified = options?.lastModified || Date.now();

        // 콘텐츠 크기 계산
        let totalSize = 0;
        bits.forEach((bit) => {
            if (typeof bit === 'string') {
                totalSize += new TextEncoder().encode(bit).length;
            } else if (bit instanceof ArrayBuffer) {
                totalSize += bit.byteLength;
            } else if (ArrayBuffer.isView(bit)) {
                totalSize += bit.byteLength;
            }
        });
        this.size = totalSize;

        // 실제 콘텐츠 저장
        this.content = new ArrayBuffer(totalSize);
    }

    async arrayBuffer(): Promise<ArrayBuffer> {
        return this.content;
    }

    async text(): Promise<string> {
        return new TextDecoder().decode(this.content);
    }

    slice(start?: number, end?: number, contentType?: string): Blob {
        return new Blob([this.content.slice(start, end)], { type: contentType });
    }
} as any;

// Blob API Mock
global.Blob = class Blob {
    size: number;
    type: string;
    private content: ArrayBuffer;

    constructor(
        bits?: Array<ArrayBuffer | ArrayBufferView | Blob | string>,
        options?: BlobPropertyBag
    ) {
        this.type = options?.type || '';

        // 콘텐츠 크기 계산
        let totalSize = 0;
        if (bits) {
            bits.forEach((bit) => {
                if (typeof bit === 'string') {
                    totalSize += new TextEncoder().encode(bit).length;
                } else if (bit instanceof ArrayBuffer) {
                    totalSize += bit.byteLength;
                } else if (ArrayBuffer.isView(bit)) {
                    totalSize += bit.byteLength;
                }
            });
        }
        this.size = totalSize;
        this.content = new ArrayBuffer(totalSize);
    }

    async arrayBuffer(): Promise<ArrayBuffer> {
        return this.content;
    }

    async text(): Promise<string> {
        return new TextDecoder().decode(this.content);
    }

    slice(start?: number, end?: number, contentType?: string): Blob {
        return new Blob([this.content.slice(start, end)], { type: contentType });
    }
} as any;

// FormData Mock
global.FormData = class FormData {
    private data: Map<string, any> = new Map();

    append(name: string, value: any, fileName?: string): void {
        this.data.set(name, { value, fileName });
    }

    delete(name: string): void {
        this.data.delete(name);
    }

    get(name: string): any {
        return this.data.get(name)?.value;
    }

    getAll(name: string): any[] {
        return this.data.has(name) ? [this.data.get(name)?.value] : [];
    }

    has(name: string): boolean {
        return this.data.has(name);
    }

    set(name: string, value: any, fileName?: string): void {
        this.data.set(name, { value, fileName });
    }

    forEach(callback: (value: any, key: string, parent: FormData) => void): void {
        this.data.forEach((item, key) => {
            callback(item.value, key, this);
        });
    }
} as any;

// DataTransfer Mock
global.DataTransfer = class DataTransfer {
    dropEffect: string = 'none';
    effectAllowed: string = 'uninitialized';
    files: FileList;
    items: DataTransferItemList;
    types: ReadonlyArray<string> = [];

    constructor() {
        const filesArray: File[] = [];
        const itemsArray: DataTransferItem[] = [];

        const filesList = filesArray as unknown as FileList & {
            item: (index: number) => File | null;
        };
        filesList.item = (index: number) => filesArray[index] ?? null;
        this.files = filesList;

        const itemsList = itemsArray as unknown as DataTransferItemList & {
            add: (file: File) => DataTransferItem;
            clear: () => void;
            remove: (index: number) => void;
        };

        itemsList.add = (file: File) => {
            const item = {
                kind: 'file',
                type: file.type,
                getAsFile: () => file,
            } as DataTransferItem;
            itemsArray.push(item);
            filesArray.push(file);
            this.types = ['Files'];
            return item;
        };
        itemsList.clear = () => {
            itemsArray.length = 0;
            filesArray.length = 0;
            this.types = [];
        };
        itemsList.remove = (index: number) => {
            itemsArray.splice(index, 1);
            filesArray.splice(index, 1);
            if (itemsArray.length === 0) {
                this.types = [];
            }
        };

        this.items = itemsList;
    }

    clearData(format?: string): void {
        // Implementation
    }

    getData(format: string): string {
        return '';
    }

    setData(format: string, data: string): void {
        // Implementation
    }

    setDragImage(image: Element, x: number, y: number): void {
        // Implementation
    }
} as any;

// DragEvent Mock
global.DragEvent = class DragEvent extends Event {
    dataTransfer: DataTransfer | null;

    constructor(type: string, init: { dataTransfer?: DataTransfer } = {}) {
        super(type);
        this.dataTransfer = init.dataTransfer ?? null;
    }
} as any;

// AbortController Mock (if not available)
if (!global.AbortController) {
    global.AbortController = class AbortController {
        signal: AbortSignal;

        constructor() {
            this.signal = {
                aborted: false,
                onabort: null,
                addEventListener: jest.fn(),
                removeEventListener: jest.fn(),
                dispatchEvent: jest.fn(),
            } as any;
        }

        abort(): void {
            (this.signal as any).aborted = true;
            if ((this.signal as any).onabort) {
                (this.signal as any).onabort();
            }
        }
    } as any;
}

// Performance API Mock
global.performance = {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => []),
} as any;

// IntersectionObserver Mock
global.IntersectionObserver = class IntersectionObserver {
    constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {}

    observe(target: Element): void {}
    unobserve(target: Element): void {}
    disconnect(): void {}
    takeRecords(): IntersectionObserverEntry[] {
        return [];
    }
} as any;

// ResizeObserver Mock
global.ResizeObserver = class ResizeObserver {
    constructor(callback: ResizeObserverCallback) {}

    observe(target: Element, options?: ResizeObserverOptions): void {}
    unobserve(target: Element): void {}
    disconnect(): void {}
} as any;

// MutationObserver Mock
global.MutationObserver = class MutationObserver {
    constructor(callback: MutationCallback) {}

    observe(target: Node, options?: MutationObserverInit): void {}
    disconnect(): void {}
    takeRecords(): MutationRecord[] {
        return [];
    }
} as any;

// 테스트 유틸리티 함수
export const waitFor = (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms));

export const mockApiResponse = (data: any, status = 200): void => {
    (requestUrl as jest.Mock).mockResolvedValueOnce({
        status,
        json: data,
        text: JSON.stringify(data),
        headers: new Headers(),
    });
};

export const mockApiError = (error: string, status = 500): void => {
    (requestUrl as jest.Mock).mockRejectedValueOnce(new Error(error));
};

export const createMockFile = (name: string, size: number, type: string): File => {
    const content = new ArrayBuffer(size);
    return new File([content], name, { type });
};

export const dispatchCustomEvent = (element: Element, eventName: string, detail?: any): void => {
    const event = new CustomEvent(eventName, { detail, bubbles: true });
    element.dispatchEvent(event);
};

// 테스트 환경 리셋
beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    (requestUrl as jest.Mock).mockClear();
    document.body.innerHTML = '';
});

// 테스트 완료 후 정리
afterEach(() => {
    activeTimeouts.forEach((id) => originalClearTimeout(id));
    activeTimeouts.clear();
    activeIntervals.forEach((id) => originalClearInterval(id));
    activeIntervals.clear();

    jest.restoreAllMocks();
});

// 전역 에러 핸들러
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
