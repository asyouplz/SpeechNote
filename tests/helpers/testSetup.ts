/**
 * 테스트 환경 설정 및 공통 Mock 설정
 */

import { TextEncoder, TextDecoder } from 'util';

// Node.js 환경에서 브라우저 API 모킹
global.TextEncoder = TextEncoder as any;
global.TextDecoder = TextDecoder as any;

// AudioContext 모킹
global.AudioContext = jest.fn().mockImplementation(() => ({
    decodeAudioData: jest.fn().mockResolvedValue({
        duration: 10,
        sampleRate: 44100,
        numberOfChannels: 2,
        length: 441000,
        getChannelData: jest.fn().mockReturnValue(new Float32Array(441000))
    }),
    createBufferSource: jest.fn().mockReturnValue({
        buffer: null,
        connect: jest.fn(),
        start: jest.fn(),
        stop: jest.fn()
    }),
    createChannelMerger: jest.fn().mockReturnValue({
        connect: jest.fn()
    }),
    destination: {},
    close: jest.fn()
})) as any;

// OfflineAudioContext 모킹
global.OfflineAudioContext = jest.fn().mockImplementation((channels, length, sampleRate) => ({
    length,
    sampleRate,
    numberOfChannels: channels,
    createBufferSource: jest.fn().mockReturnValue({
        buffer: null,
        connect: jest.fn(),
        start: jest.fn()
    }),
    createChannelMerger: jest.fn().mockReturnValue({
        connect: jest.fn()
    }),
    destination: {},
    startRendering: jest.fn().mockResolvedValue({
        duration: length / sampleRate,
        sampleRate,
        numberOfChannels: channels,
        length,
        getChannelData: jest.fn().mockReturnValue(new Float32Array(length))
    })
})) as any;

// FormData 모킹
global.FormData = jest.fn().mockImplementation(() => ({
    append: jest.fn(),
    delete: jest.fn(),
    get: jest.fn(),
    getAll: jest.fn(),
    has: jest.fn(),
    set: jest.fn(),
    entries: jest.fn(),
    keys: jest.fn(),
    values: jest.fn(),
    forEach: jest.fn()
})) as any;

// Blob 모킹
global.Blob = jest.fn().mockImplementation((parts: any[], options?: any) => ({
    size: parts.reduce((acc, part) => {
        if (part instanceof ArrayBuffer) return acc + part.byteLength;
        if (typeof part === 'string') return acc + part.length;
        return acc;
    }, 0),
    type: options?.type || '',
    slice: jest.fn(),
    stream: jest.fn(),
    text: jest.fn(),
    arrayBuffer: jest.fn()
})) as any;

// File 모킹
global.File = jest.fn().mockImplementation((parts: any[], name: string, options?: any) => ({
    ...new Blob(parts, options),
    name,
    lastModified: options?.lastModified || Date.now(),
    webkitRelativePath: ''
})) as any;

// AbortController 모킹
global.AbortController = jest.fn().mockImplementation(() => ({
    signal: {
        aborted: false,
        onabort: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
    },
    abort: jest.fn(function(this: any) {
        this.signal.aborted = true;
        if (this.signal.onabort) this.signal.onabort();
    })
})) as any;

// requestUrl 모킹 (Obsidian API)
jest.mock('obsidian', () => ({
    requestUrl: jest.fn(),
    Plugin: jest.fn(),
    Modal: jest.fn(),
    Setting: jest.fn(),
    PluginSettingTab: jest.fn(),
    TFile: jest.fn(),
    TFolder: jest.fn(),
    Vault: jest.fn(),
    Workspace: jest.fn(),
    App: jest.fn(),
    Editor: jest.fn(),
    MarkdownView: jest.fn(),
    Notice: jest.fn(),
    DropdownComponent: jest.fn(),
    ToggleComponent: jest.fn(),
    TextComponent: jest.fn()
}));

// 커스텀 매처 추가
expect.extend({
    toBeValidArrayBuffer(received: any) {
        const pass = received instanceof ArrayBuffer && received.byteLength > 0;
        
        if (pass) {
            return {
                message: () => `expected ${received} not to be a valid ArrayBuffer`,
                pass: true
            };
        } else {
            return {
                message: () => `expected ${received} to be a valid ArrayBuffer with byteLength > 0`,
                pass: false
            };
        }
    },
    
    toContainTimestamp(received: string) {
        const timestampRegex = /\[\d{2}:\d{2}(:\d{2})?\]/;
        const pass = timestampRegex.test(received);
        
        if (pass) {
            return {
                message: () => `expected "${received}" not to contain timestamp`,
                pass: true
            };
        } else {
            return {
                message: () => `expected "${received}" to contain timestamp in format [MM:SS] or [HH:MM:SS]`,
                pass: false
            };
        }
    }
});

// TypeScript 타입 확장
declare global {
    namespace jest {
        interface Matchers<R> {
            toBeValidArrayBuffer(): R;
            toContainTimestamp(): R;
        }
    }
}

// 테스트 타임아웃 설정
jest.setTimeout(10000);

export {};