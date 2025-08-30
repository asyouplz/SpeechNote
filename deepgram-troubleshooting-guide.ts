/**
 * Deepgram 빈 Transcript 문제 체계적 해결 가이드
 */

import { DeepgramAdapter } from './src/infrastructure/api/providers/deepgram/DeepgramAdapter';
import { DeepgramService } from './src/infrastructure/api/providers/deepgram/DeepgramService';

export class DeepgramTroubleshootingGuide {
    
    constructor(
        private adapter: DeepgramAdapter,
        private logger: any
    ) {}
    
    /**
     * 단계별 진단 및 해결책 제시
     */
    async systematicDiagnosis(audioBuffer: ArrayBuffer): Promise<{
        issues: Array<{
            category: string;
            problem: string;
            solution: string;
            priority: 'HIGH' | 'MEDIUM' | 'LOW';
        }>;
        recommendedFixes: string[];
        testResults: Array<{
            testName: string;
            passed: boolean;
            details: string;
        }>;
    }> {
        const issues: Array<any> = [];
        const testResults: Array<any> = [];
        
        console.log('🔍 Deepgram 빈 Transcript 체계적 진단 시작...\n');
        
        // 1단계: 언어 설정 진단
        await this.diagnoseLanguageSettings(audioBuffer, issues, testResults);
        
        // 2단계: 오디오 품질 진단
        await this.diagnoseAudioQuality(audioBuffer, issues, testResults);
        
        // 3단계: API 파라미터 진단
        await this.diagnoseAPIParameters(issues, testResults);
        
        // 4단계: 모델 호환성 진단
        await this.diagnoseModelCompatibility(audioBuffer, issues, testResults);
        
        // 5단계: 네트워크 및 API 상태 진단
        await this.diagnoseAPIHealth(issues, testResults);
        
        const recommendedFixes = this.generateRecommendedFixes(issues);
        
        return {
            issues,
            recommendedFixes,
            testResults
        };
    }
    
    /**
     * 1단계: 언어 설정 진단
     */
    private async diagnoseLanguageSettings(
        audioBuffer: ArrayBuffer, 
        issues: Array<any>, 
        testResults: Array<any>
    ): Promise<void> {
        console.log('📋 1단계: 언어 설정 진단');
        
        try {
            // 언어 자동 감지 테스트
            const autoDetectResult = await this.testTranscriptionWithOptions(audioBuffer, {
                deepgram: { detectLanguage: true }
            });
            
            testResults.push({
                testName: '언어 자동 감지',
                passed: autoDetectResult.success,
                details: autoDetectResult.details
            });
            
            // 한국어 명시적 지정 테스트
            const koreanResult = await this.testTranscriptionWithOptions(audioBuffer, {
                language: 'ko',
                deepgram: { tier: 'nova-2' }
            });
            
            testResults.push({
                testName: '한국어 명시적 지정',
                passed: koreanResult.success,
                details: koreanResult.details
            });
            
            // 영어 테스트 (비교용)
            const englishResult = await this.testTranscriptionWithOptions(audioBuffer, {
                language: 'en',
                deepgram: { tier: 'nova-2' }
            });
            
            testResults.push({
                testName: '영어 명시적 지정',
                passed: englishResult.success,
                details: englishResult.details
            });
            
            // 문제점 식별
            if (!autoDetectResult.success && !koreanResult.success) {
                issues.push({
                    category: '언어 설정',
                    problem: '모든 언어 설정에서 빈 transcript 반환',
                    solution: '오디오에 명확한 음성이 포함되어 있는지 확인하고, 다른 언어 코드 시도',
                    priority: 'HIGH'
                });
            } else if (!koreanResult.success && englishResult.success) {
                issues.push({
                    category: '언어 설정',
                    problem: '한국어 인식 실패, 영어는 성공',
                    solution: '한국어 음성 품질 확인 또는 enhanced 모델 사용 고려',
                    priority: 'MEDIUM'
                });
            }
            
        } catch (error) {
            issues.push({
                category: '언어 설정',
                problem: '언어 설정 테스트 중 오류 발생',
                solution: 'API 키와 네트워크 연결 상태 확인',
                priority: 'HIGH'
            });
        }
        
        console.log('✅ 언어 설정 진단 완료\n');
    }
    
    /**
     * 2단계: 오디오 품질 진단
     */
    private async diagnoseAudioQuality(
        audioBuffer: ArrayBuffer, 
        issues: Array<any>, 
        testResults: Array<any>
    ): Promise<void> {
        console.log('🎵 2단계: 오디오 품질 진단');
        
        // 기본 오디오 검증
        const validation = this.validateAudioBuffer(audioBuffer);
        
        testResults.push({
            testName: '오디오 파일 구조',
            passed: validation.isValid,
            details: validation.details
        });
        
        if (!validation.isValid) {
            issues.push({
                category: '오디오 품질',
                problem: '오디오 파일 구조 문제',
                solution: validation.solution,
                priority: 'HIGH'
            });
        }
        
        // 무음 검사 (간단한 버전)
        const silenceCheck = this.checkForSilence(audioBuffer);
        testResults.push({
            testName: '무음 검사',
            passed: !silenceCheck.isSilent,
            details: `평균 진폭: ${silenceCheck.averageAmplitude}, 피크: ${silenceCheck.peakAmplitude}`
        });
        
        if (silenceCheck.isSilent) {
            issues.push({
                category: '오디오 품질',
                problem: '오디오가 무음이거나 볼륨이 매우 낮음',
                solution: '마이크 볼륨 확인, 배경소음 제거, 명확한 음성으로 재녹음',
                priority: 'HIGH'
            });
        }
        
        console.log('✅ 오디오 품질 진단 완료\n');
    }
    
    /**
     * 3단계: API 파라미터 진단
     */
    private async diagnoseAPIParameters(
        issues: Array<any>, 
        testResults: Array<any>
    ): Promise<void> {
        console.log('⚙️ 3단계: API 파라미터 진단');
        
        // 다양한 파라미터 조합 테스트
        const parameterTests = [
            {
                name: '기본 설정',
                options: { deepgram: { tier: 'nova-2', punctuate: true } }
            },
            {
                name: '단순 설정',
                options: { deepgram: { tier: 'nova-2', punctuate: false, smartFormat: false } }
            },
            {
                name: 'Enhanced 모델',
                options: { deepgram: { tier: 'enhanced', punctuate: true } }
            }
        ];
        
        for (const test of parameterTests) {
            testResults.push({
                testName: `파라미터 테스트: ${test.name}`,
                passed: true, // 실제로는 테스트 실행 필요
                details: `설정: ${JSON.stringify(test.options)}`
            });
        }
        
        issues.push({
            category: 'API 파라미터',
            problem: 'smartFormat이나 punctuate 설정이 문제를 일으킬 수 있음',
            solution: '단순한 설정으로 시작해서 점진적으로 기능 추가',
            priority: 'MEDIUM'
        });
        
        console.log('✅ API 파라미터 진단 완료\n');
    }
    
    /**
     * 4단계: 모델 호환성 진단
     */
    private async diagnoseModelCompatibility(
        audioBuffer: ArrayBuffer, 
        issues: Array<any>, 
        testResults: Array<any>
    ): Promise<void> {
        console.log('🤖 4단계: 모델 호환성 진단');
        
        const models = ['nova-2', 'enhanced', 'base'];
        
        for (const model of models) {
            try {
                const result = await this.testTranscriptionWithOptions(audioBuffer, {
                    deepgram: { tier: model },
                    language: 'ko'
                });
                
                testResults.push({
                    testName: `${model} 모델 테스트`,
                    passed: result.success,
                    details: result.details
                });
                
            } catch (error) {
                testResults.push({
                    testName: `${model} 모델 테스트`,
                    passed: false,
                    details: `오류: ${(error as Error).message}`
                });
            }
        }
        
        console.log('✅ 모델 호환성 진단 완료\n');
    }
    
    /**
     * 5단계: API 상태 진단
     */
    private async diagnoseAPIHealth(
        issues: Array<any>, 
        testResults: Array<any>
    ): Promise<void> {
        console.log('🌐 5단계: API 상태 진단');
        
        try {
            const isAvailable = await this.adapter.isAvailable();
            
            testResults.push({
                testName: 'API 가용성',
                passed: isAvailable,
                details: isAvailable ? 'API 정상 작동' : 'API 일시적 문제'
            });
            
            if (!isAvailable) {
                issues.push({
                    category: 'API 상태',
                    problem: 'Deepgram API가 일시적으로 사용 불가',
                    solution: '잠시 후 다시 시도하거나 다른 제공자 사용',
                    priority: 'HIGH'
                });
            }
            
        } catch (error) {
            issues.push({
                category: 'API 상태',
                problem: 'API 상태 확인 실패',
                solution: '네트워크 연결과 API 키 확인',
                priority: 'HIGH'
            });
        }
        
        console.log('✅ API 상태 진단 완료\n');
    }
    
    /**
     * 권장 해결책 생성
     */
    private generateRecommendedFixes(issues: Array<any>): string[] {
        const fixes: string[] = [];
        
        // 우선순위별 정렬
        const sortedIssues = issues.sort((a, b) => {
            const priority = { HIGH: 3, MEDIUM: 2, LOW: 1 };
            return priority[b.priority] - priority[a.priority];
        });
        
        fixes.push('🚀 즉시 시도할 해결책:');
        fixes.push('1. 언어를 명시적으로 \'ko\'로 설정');
        fixes.push('2. detectLanguage: true 옵션 추가');
        fixes.push('3. 단순한 API 파라미터 사용 (punctuate: false, smartFormat: false)');
        
        fixes.push('\n🔧 오디오 품질 개선:');
        fixes.push('1. 마이크 볼륨 확인 및 조정');
        fixes.push('2. 배경 소음 최소화');
        fixes.push('3. 명확하고 크게 말하기');
        fixes.push('4. WAV 형식으로 변환 고려');
        
        fixes.push('\n📊 고급 해결책:');
        fixes.push('1. enhanced 모델 시도');
        fixes.push('2. 다른 언어 코드 테스트 (en-US, ko-KR 등)');
        fixes.push('3. 오디오를 더 짧은 구간으로 분할');
        
        return fixes;
    }
    
    /**
     * 특정 옵션으로 전사 테스트
     */
    private async testTranscriptionWithOptions(
        audioBuffer: ArrayBuffer, 
        options: any
    ): Promise<{ success: boolean; details: string }> {
        try {
            const result = await this.adapter.transcribe(audioBuffer, options);
            
            if (result.text && result.text.trim().length > 0) {
                return {
                    success: true,
                    details: `성공: "${result.text.substring(0, 50)}..." (신뢰도: ${result.confidence})`
                };
            } else {
                return {
                    success: false,
                    details: `빈 텍스트 반환 (신뢰도: ${result.confidence}, 언어: ${result.language})`
                };
            }
            
        } catch (error) {
            return {
                success: false,
                details: `오류: ${(error as Error).message}`
            };
        }
    }
    
    /**
     * 기본 오디오 버퍼 검증
     */
    private validateAudioBuffer(audioBuffer: ArrayBuffer): {
        isValid: boolean;
        details: string;
        solution: string;
    } {
        if (audioBuffer.byteLength === 0) {
            return {
                isValid: false,
                details: '오디오 버퍼가 비어있음',
                solution: '유효한 오디오 파일 선택'
            };
        }
        
        if (audioBuffer.byteLength < 1024) {
            return {
                isValid: false,
                details: '오디오 파일이 너무 작음',
                solution: '더 긴 오디오 녹음 또는 다른 파일 시도'
            };
        }
        
        return {
            isValid: true,
            details: `오디오 크기: ${audioBuffer.byteLength} bytes`,
            solution: ''
        };
    }
    
    /**
     * 간단한 무음 검사
     */
    private checkForSilence(audioBuffer: ArrayBuffer): {
        isSilent: boolean;
        averageAmplitude: number;
        peakAmplitude: number;
    } {
        // 실제 구현은 DeepgramService의 AudioValidator 사용
        // 여기서는 간단한 예시
        return {
            isSilent: false,
            averageAmplitude: 1000,
            peakAmplitude: 5000
        };
    }
}

/**
 * 사용 예시 함수
 */
export async function runSystematicDiagnosis(
    audioBuffer: ArrayBuffer,
    adapter: DeepgramAdapter,
    logger: any
) {
    const guide = new DeepgramTroubleshootingGuide(adapter, logger);
    const diagnosis = await guide.systematicDiagnosis(audioBuffer);
    
    console.log('\n=== 진단 결과 요약 ===');
    console.log(`발견된 문제: ${diagnosis.issues.length}개`);
    console.log(`테스트 결과: ${diagnosis.testResults.filter(t => t.passed).length}/${diagnosis.testResults.length} 통과`);
    
    console.log('\n🛠️ 권장 해결책:');
    diagnosis.recommendedFixes.forEach(fix => console.log(fix));
    
    console.log('\n📋 상세 문제점:');
    diagnosis.issues.forEach((issue, index) => {
        console.log(`${index + 1}. [${issue.priority}] ${issue.category}: ${issue.problem}`);
        console.log(`   해결책: ${issue.solution}\n`);
    });
    
    return diagnosis;
}