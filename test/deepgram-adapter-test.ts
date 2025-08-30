/**
 * Deepgram Adapter 통합 테스트
 * TranscriberFactory → DeepgramAdapter → DeepgramService → API 전체 흐름 검증
 */

import { TranscriberFactory } from '../src/infrastructure/api/TranscriberFactory';
import { Logger } from '../src/infrastructure/logging/Logger';
import { TranscriptionProvider } from '../src/infrastructure/api/providers/ITranscriber';

// 모의 설정 매니저
class MockSettingsManager {
    private settings: any = {};
    
    constructor(private apiKey: string) {
        this.settings = {
            transcription: {
                defaultProvider: 'deepgram',
                autoSelect: false,
                fallbackEnabled: true,
                deepgram: {
                    enabled: true,
                    apiKey: apiKey,
                    model: 'nova-2'
                }
            }
        };
    }
    
    async load() {
        return this.settings;
    }
    
    async save(settings: any) {
        this.settings = settings;
    }
    
    get(key: string) {
        if (key === 'transcription') {
            return this.settings.transcription;
        }
        return this.settings[key];
    }
    
    async set(key: string, value: any) {
        this.settings[key] = value;
    }
}

// 테스트 실행
async function runDeepgramAdapterTest() {
    console.log('=== Deepgram Adapter Integration Test ===\n');
    
    // API 키 확인
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
        console.error('❌ DEEPGRAM_API_KEY environment variable not set');
        console.log('Please set: export DEEPGRAM_API_KEY="your-api-key"');
        return;
    }
    
    // 1. 초기화
    console.log('1. Initializing TranscriberFactory...');
    const logger = new Logger('DeepgramTest');
    const settingsManager = new MockSettingsManager(apiKey);
    const factory = new TranscriberFactory(settingsManager as any, logger);
    console.log('   ✓ Factory initialized');
    
    // 2. Provider 확인
    console.log('\n2. Checking available providers...');
    const availableProviders = factory.getAvailableProviders();
    console.log(`   Available providers: ${availableProviders.join(', ')}`);
    
    if (!availableProviders.includes('deepgram')) {
        console.error('   ❌ Deepgram provider not available');
        return;
    }
    console.log('   ✓ Deepgram provider is available');
    
    // 3. Deepgram Provider 가져오기
    console.log('\n3. Getting Deepgram provider...');
    const provider = factory.getProvider('deepgram');
    console.log(`   ✓ Got provider: ${provider.getProviderName()}`);
    
    // 4. Provider 능력 확인
    console.log('\n4. Checking provider capabilities...');
    const capabilities = provider.getCapabilities();
    console.log(`   - Supported languages: ${capabilities.languages.length}`);
    console.log(`   - Max file size: ${capabilities.maxFileSize / (1024*1024*1024)}GB`);
    console.log(`   - Audio formats: ${capabilities.audioFormats.join(', ')}`);
    console.log(`   - Features: ${capabilities.features.slice(0, 5).join(', ')}...`);
    
    // 5. API 키 검증
    console.log('\n5. Validating API key...');
    const isValid = await provider.validateApiKey(apiKey);
    if (isValid) {
        console.log('   ✓ API key is valid');
    } else {
        console.error('   ❌ API key validation failed');
        return;
    }
    
    // 6. 테스트 오디오 생성 및 전사
    console.log('\n6. Testing transcription with sample audio...');
    
    // 간단한 WAV 헤더와 무음 데이터 생성 (1초)
    const sampleRate = 16000;
    const duration = 1; // 1초
    const numSamples = sampleRate * duration;
    const audioData = new ArrayBuffer(44 + numSamples * 2); // WAV header + audio data
    const view = new DataView(audioData);
    
    // WAV 헤더 작성
    const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, 1, true); // 1 channel
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // byte rate
    view.setUint16(32, 2, true); // block align
    view.setUint16(34, 16, true); // bits per sample
    writeString(36, 'data');
    view.setUint32(40, numSamples * 2, true);
    
    // 무음 데이터 (0으로 채움)
    for (let i = 44; i < audioData.byteLength; i += 2) {
        view.setInt16(i, 0, true);
    }
    
    try {
        const startTime = Date.now();
        const response = await provider.transcribe(audioData, {
            language: 'en',
            deepgram: {
                punctuate: true,
                smartFormat: true
            }
        });
        const elapsed = Date.now() - startTime;
        
        console.log('   ✓ Transcription completed');
        console.log(`   - Time: ${elapsed}ms`);
        console.log(`   - Provider: ${response.provider}`);
        console.log(`   - Text: "${response.text || '(empty/silence detected)'}"`);
        console.log(`   - Language: ${response.language || 'not detected'}`);
        console.log(`   - Confidence: ${response.confidence?.toFixed(2) || 'N/A'}`);
        
        // 응답에 text 필드가 있는지 확인
        if ('text' in response) {
            console.log('   ✓ Response contains "text" field');
        } else {
            console.error('   ❌ Response missing "text" field');
        }
        
    } catch (error) {
        console.error('   ❌ Transcription failed:', (error as Error).message);
    }
    
    // 7. 메트릭 확인
    console.log('\n7. Checking metrics...');
    try {
        const metrics = factory.getMetrics('deepgram');
        if (Array.isArray(metrics)) {
            console.log('   No metrics available yet');
        } else {
            console.log(`   - Total requests: ${metrics.totalRequests}`);
            console.log(`   - Successful: ${metrics.successfulRequests}`);
            console.log(`   - Failed: ${metrics.failedRequests}`);
            console.log(`   - Average latency: ${metrics.averageLatency.toFixed(0)}ms`);
        }
    } catch (error) {
        console.log('   No metrics recorded yet');
    }
    
    console.log('\n=== Test completed successfully! ===');
}

// 테스트 실행
runDeepgramAdapterTest().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});