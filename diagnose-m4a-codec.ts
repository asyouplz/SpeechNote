/**
 * M4A 파일의 내부 코덱과 구조를 분석하는 진단 도구
 */

import { promises as fs } from 'fs';

export class M4ACodecAnalyzer {
    
    /**
     * M4A 파일의 상세한 메타데이터를 분석합니다
     */
    static async analyzeM4AFile(filePath: string): Promise<{
        container: string;
        codec: string | null;
        audioFormat: string | null;
        compatibility: {
            deepgram: boolean;
            recommendations: string[];
        };
        metadata: {
            duration?: number;
            sampleRate?: number;
            channels?: number;
            bitrate?: number;
        };
    }> {
        const buffer = await fs.readFile(filePath);
        const analysis = this.analyzeM4ABuffer(buffer);
        
        return {
            container: 'M4A',
            codec: analysis.codec,
            audioFormat: analysis.audioFormat,
            compatibility: this.assessDeepgramCompatibility(analysis),
            metadata: analysis.metadata
        };
    }
    
    /**
     * ArrayBuffer에서 M4A 구조 분석
     */
    static analyzeM4ABuffer(buffer: ArrayBuffer): {
        codec: string | null;
        audioFormat: string | null;
        metadata: any;
    } {
        const view = new Uint8Array(buffer);
        const result = {
            codec: null as string | null,
            audioFormat: null as string | null,
            metadata: {} as any
        };
        
        // MP4/M4A Box 구조 파싱
        let offset = 0;
        
        while (offset < view.length - 8) {
            // Box 크기 읽기 (big-endian)
            const boxSize = (view[offset] << 24) | 
                           (view[offset + 1] << 16) | 
                           (view[offset + 2] << 8) | 
                           view[offset + 3];
            
            // Box 타입 읽기
            const boxType = String.fromCharCode(
                view[offset + 4], 
                view[offset + 5], 
                view[offset + 6], 
                view[offset + 7]
            );
            
            console.log(`Found box: ${boxType}, size: ${boxSize}`);
            
            // 중요한 Box들 분석
            switch (boxType) {
                case 'ftyp':
                    result.audioFormat = this.parseFtypBox(view, offset);
                    break;
                case 'stsd':
                    result.codec = this.parseStsdBox(view, offset, boxSize);
                    break;
                case 'mvhd':
                    result.metadata = { 
                        ...result.metadata, 
                        ...this.parseMvhdBox(view, offset) 
                    };
                    break;
            }
            
            // 다음 Box로 이동
            if (boxSize <= 8) break; // 무한 루프 방지
            offset += boxSize;
        }
        
        return result;
    }
    
    /**
     * ftyp Box 분석 (파일 타입)
     */
    private static parseFtypBox(view: Uint8Array, offset: number): string {
        // Major brand (4 bytes after box header)
        const majorBrand = String.fromCharCode(
            view[offset + 8], 
            view[offset + 9], 
            view[offset + 10], 
            view[offset + 11]
        );
        
        return majorBrand;
    }
    
    /**
     * stsd Box 분석 (샘플 설명)
     */
    private static parseStsdBox(view: Uint8Array, offset: number, boxSize: number): string | null {
        // Sample Description Box 내부의 샘플 엔트리 찾기
        let sampleOffset = offset + 16; // box header + version/flags + entry_count
        
        while (sampleOffset < offset + boxSize - 4) {
            const sampleType = String.fromCharCode(
                view[sampleOffset + 4], 
                view[sampleOffset + 5], 
                view[sampleOffset + 6], 
                view[sampleOffset + 7]
            );
            
            // 오디오 코덱 식별
            if (this.isAudioCodec(sampleType)) {
                return sampleType;
            }
            
            sampleOffset += 8;
        }
        
        return null;
    }
    
    /**
     * mvhd Box 분석 (무비 헤더)
     */
    private static parseMvhdBox(view: Uint8Array, offset: number): any {
        const version = view[offset + 8];
        let timeScale: number;
        let duration: number;
        
        if (version === 1) {
            // 64-bit 버전
            timeScale = (view[offset + 28] << 24) | 
                       (view[offset + 29] << 16) | 
                       (view[offset + 30] << 8) | 
                       view[offset + 31];
            
            // duration은 64비트이지만 lower 32비트만 사용
            duration = (view[offset + 32] << 24) | 
                      (view[offset + 33] << 16) | 
                      (view[offset + 34] << 8) | 
                      view[offset + 35];
        } else {
            // 32-bit 버전
            timeScale = (view[offset + 20] << 24) | 
                       (view[offset + 21] << 16) | 
                       (view[offset + 22] << 8) | 
                       view[offset + 23];
            
            duration = (view[offset + 24] << 24) | 
                      (view[offset + 25] << 16) | 
                      (view[offset + 26] << 8) | 
                      view[offset + 27];
        }
        
        return {
            duration: timeScale > 0 ? duration / timeScale : 0,
            timeScale
        };
    }
    
    /**
     * 오디오 코덱 타입 확인
     */
    private static isAudioCodec(type: string): boolean {
        const audioCodecs = [
            'mp4a',  // AAC
            'alac',  // Apple Lossless
            'ac-3',  // AC-3
            'ec-3',  // E-AC-3
            '.mp3',  // MP3
            'opus',  // Opus
            'fLaC'   // FLAC
        ];
        
        return audioCodecs.includes(type);
    }
    
    /**
     * Deepgram 호환성 평가
     */
    private static assessDeepgramCompatibility(analysis: any): {
        deepgram: boolean;
        recommendations: string[];
    } {
        const recommendations: string[] = [];
        let isCompatible = true;
        
        // 코덱별 호환성 확인
        switch (analysis.codec) {
            case 'mp4a':
                // AAC - 일반적으로 지원됨
                recommendations.push('AAC 코덱이 감지됨 - Deepgram과 호환 가능');
                break;
            case 'alac':
                // Apple Lossless - 지원되지 않을 수 있음
                isCompatible = false;
                recommendations.push('ALAC 코덱은 지원되지 않을 수 있음 - AAC나 MP3로 변환 권장');
                break;
            case null:
                isCompatible = false;
                recommendations.push('오디오 코덱을 식별할 수 없음 - 파일 손상 가능성');
                break;
            default:
                recommendations.push(`알 수 없는 코덱 (${analysis.codec}) - 호환성 확인 필요`);
        }
        
        // 메타데이터 기반 권장사항
        if (analysis.metadata.duration && analysis.metadata.duration < 1) {
            recommendations.push('매우 짧은 오디오 - 최소 1초 이상 권장');
        }
        
        return {
            deepgram: isCompatible,
            recommendations
        };
    }
}

/**
 * 진단 실행 함수
 */
export async function diagnoseAudioFile(filePath: string) {
    console.log(`=== M4A 파일 진단: ${filePath} ===\n`);
    
    try {
        const analysis = await M4ACodecAnalyzer.analyzeM4AFile(filePath);
        
        console.log('🔍 분석 결과:');
        console.log(`컨테이너: ${analysis.container}`);
        console.log(`코덱: ${analysis.codec || '식별 불가'}`);
        console.log(`오디오 포맷: ${analysis.audioFormat || '불명'}`);
        console.log(`\n⚡ Deepgram 호환성: ${analysis.compatibility.deepgram ? '✅ 호환' : '❌ 비호환'}`);
        
        console.log('\n💡 권장사항:');
        analysis.compatibility.recommendations.forEach((rec, index) => {
            console.log(`${index + 1}. ${rec}`);
        });
        
        console.log('\n📊 메타데이터:');
        Object.entries(analysis.metadata).forEach(([key, value]) => {
            console.log(`- ${key}: ${value}`);
        });
        
    } catch (error) {
        console.error('❌ 진단 중 오류 발생:', error);
    }
}