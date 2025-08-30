/**
 * Deepgram 빈 Transcript 디버깅 스크립트
 * 
 * 이 스크립트는 빈 transcript 문제를 진단하기 위한 디버깅 도구입니다.
 */

import { DeepgramService } from './src/infrastructure/api/providers/deepgram/DeepgramService';
import { DeepgramAdapter } from './src/infrastructure/api/providers/deepgram/DeepgramAdapter';

// 간단한 로거 구현
class DebugLogger {
    debug(message: string, data?: any): void {
        console.log(`[DEBUG] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
    
    info(message: string, data?: any): void {
        console.log(`[INFO] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
    
    warn(message: string, data?: any): void {
        console.log(`[WARN] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
    
    error(message: string, error?: Error, data?: any): void {
        console.log(`[ERROR] ${message}`, error?.message, data ? JSON.stringify(data, null, 2) : '');
        if (error?.stack) {
            console.log(error.stack);
        }
    }
}

/**
 * 테스트용 오디오 데이터 생성 (무음)
 */
function createSilentWAV(durationSeconds: number = 5): ArrayBuffer {
    const sampleRate = 44100;
    const numChannels = 1;
    const bitsPerSample = 16;
    const numSamples = sampleRate * durationSeconds;
    const byteRate = sampleRate * numChannels * bitsPerSample / 8;
    const blockAlign = numChannels * bitsPerSample / 8;
    const dataSize = numSamples * blockAlign;
    const fileSize = 36 + dataSize;
    
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    
    // WAV 헤더
    const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, fileSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);
    
    // 무음 데이터 (이미 0으로 초기화됨)
    return buffer;
}

/**
 * 테스트용 노이즈 오디오 생성
 */
function createNoiseWAV(durationSeconds: number = 5): ArrayBuffer {
    const silentWAV = createSilentWAV(durationSeconds);
    const view = new DataView(silentWAV);
    
    // 44바이트 헤더 이후부터 노이즈 추가
    const dataStart = 44;
    const dataSize = silentWAV.byteLength - dataStart;
    
    for (let i = dataStart; i < silentWAV.byteLength; i += 2) {
        // 낮은 볼륨의 랜덤 노이즈 추가
        const noise = (Math.random() - 0.5) * 1000; // 16-bit 범위의 1/30 정도
        view.setInt16(i, noise, true);
    }
    
    return silentWAV;
}

/**
 * 메인 디버깅 함수
 */
async function debugDeepgramEmptyTranscript() {
    console.log('=== Deepgram Empty Transcript 디버깅 시작 ===\n');
    
    const logger = new DebugLogger();
    const apiKey = process.env.DEEPGRAM_API_KEY || 'your-api-key-here';
    
    if (apiKey === 'your-api-key-here') {
        console.error('환경변수 DEEPGRAM_API_KEY를 설정해주세요.');
        process.exit(1);
    }
    
    const service = new DeepgramService(apiKey, logger);
    const adapter = new DeepgramAdapter(service, logger);
    
    // 테스트 케이스들 - 다양한 언어 설정과 모델 조합
    const testCases = [
        {
            name: '한국어 명시적 설정 + 자동감지',
            audio: createNoiseWAV(5),
            options: {
                language: 'ko',
                deepgram: {
                    tier: 'nova-2',
                    detectLanguage: true,
                    punctuate: true,
                    smartFormat: true
                }
            }
        },
        {
            name: '자동 언어 감지만 활성화',
            audio: createNoiseWAV(5),
            options: {
                deepgram: {
                    tier: 'nova-2',
                    detectLanguage: true,
                    punctuate: false,
                    smartFormat: false
                }
            }
        },
        {
            name: 'Enhanced 모델 + 한국어',
            audio: createNoiseWAV(5),
            options: {
                language: 'ko',
                deepgram: {
                    tier: 'enhanced',
                    punctuate: true,
                    smartFormat: false
                }
            }
        },
        {
            name: '최소 설정 테스트',
            audio: createNoiseWAV(5),
            options: {
                language: 'ko',
                deepgram: {
                    tier: 'nova-2'
                }
            }
        },
        {
            name: '영어 설정 (비교용)',
            audio: createNoiseWAV(5),
            options: {
                language: 'en',
                deepgram: {
                    tier: 'nova-2',
                    punctuate: true
                }
            }
        },
        {
            name: '무음 오디오 테스트',
            audio: createSilentWAV(5),
            options: {
                language: 'ko',
                deepgram: {
                    tier: 'nova-2',
                    detectLanguage: true
                }
            }
        }
    ];
    
    for (const testCase of testCases) {
        console.log(`\n--- 테스트: ${testCase.name} ---`);
        console.log(`오디오 크기: ${testCase.audio.byteLength} bytes`);
        console.log(`옵션: ${JSON.stringify(testCase.options, null, 2)}`);
        
        try {
            const result = await adapter.transcribe(testCase.audio, testCase.options);
            
            console.log(`결과: "${result.text}"`);
            console.log(`신뢰도: ${result.confidence}`);
            console.log(`언어: ${result.language || 'unknown'}`);
            console.log(`세그먼트 수: ${result.segments?.length || 0}`);
            
        } catch (error) {
            console.log(`에러 발생: ${(error as Error).message}`);
            console.log(`에러 타입: ${(error as Error).constructor.name}`);
        }
        
        // 테스트 간 대기 (API 제한 방지)
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n=== 디버깅 완료 ===');
    console.log('\n권장 사항:');
    console.log('1. 실제 음성이 포함된 오디오 파일로 테스트해보세요');
    console.log('2. 오디오 볼륨과 품질을 확인하세요');
    console.log('3. 다른 Deepgram 모델 (enhanced, base)을 시도해보세요');
    console.log('4. 언어 설정을 명시적으로 지정해보세요');
}

// 스크립트 실행
if (require.main === module) {
    debugDeepgramEmptyTranscript().catch(error => {
        console.error('디버깅 스크립트 실행 중 오류:', error);
        process.exit(1);
    });
}

export { debugDeepgramEmptyTranscript, createSilentWAV, createNoiseWAV };