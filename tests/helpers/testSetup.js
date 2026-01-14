/**
 * 테스트 환경 설정 및 공통 Mock 설정
 */

const { TextEncoder, TextDecoder } = require('util');

// Node.js 환경에서 브라우저 API 모킹
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

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
}));

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
}));

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
}));

// Blob 모킹
global.Blob = jest.fn().mockImplementation(function (parts, options) {
    const size = (parts || []).reduce((acc, part) => {
        if (part instanceof ArrayBuffer) return acc + part.byteLength;
        if (typeof part === 'string') return acc + part.length;
        return acc;
    }, 0);

    return {
        size,
        type: options?.type || '',
        slice: jest.fn(),
        stream: jest.fn(),
        text: jest.fn(),
        arrayBuffer: jest.fn()
    };
});

// File 모킹
global.File = jest.fn().mockImplementation(function (parts, name, options) {
    return {
        ...new Blob(parts, options),
        name,
        lastModified: options?.lastModified || Date.now(),
        webkitRelativePath: ''
    };
});

// AbortController 모킹
global.AbortController = jest.fn().mockImplementation(() => ({
    signal: {
        aborted: false,
        onabort: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
    },
    abort: jest.fn(function () {
        this.signal.aborted = true;
        if (this.signal.onabort) this.signal.onabort();
    })
}));

// 커스텀 매처 추가
expect.extend({
    toBeValidArrayBuffer(received) {
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
    
    toContainTimestamp(received) {
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

// 테스트 타임아웃 설정
jest.setTimeout(15000);

globalThis.__JEST_FAKE_TIME = Date.now();

if (typeof jest !== 'undefined' && typeof jest.advanceTimersByTime === 'function') {
    const originalAdvanceTimersByTime = jest.advanceTimersByTime.bind(jest);
    jest.advanceTimersByTime = (...args) => {
        try {
            return originalAdvanceTimersByTime(...args);
        } catch (error) {
            if (error && typeof error.message === 'string' && error.message.includes('not replaced with fake timers')) {
                // continue to update mock time for compatibility
            } else {
                throw error;
            }
        } finally {
            const increment = typeof args[0] === 'number' ? args[0] : 0;
            if (!Number.isNaN(increment)) {
                if (process.env.DEBUG_NOTIFICATION) {
                    console.log('Advance timers by', increment);
                }
                if (typeof globalThis.__JEST_FAKE_TIME !== 'number') {
                    globalThis.__JEST_FAKE_TIME = Date.now();
                }
                globalThis.__JEST_FAKE_TIME += increment;
            }
        }
    };
}

afterEach(() => {
    globalThis.__JEST_FAKE_TIME = Date.now();
    try {
        const { requestUrl } = require('obsidian');
        if (typeof requestUrl?.mockReset === 'function') {
            requestUrl.mockReset();
        }
    } catch (error) {
        // ignore in case module is not available
    }
});
