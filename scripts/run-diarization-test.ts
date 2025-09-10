/**
 * Deepgram diarization smoke test using a local file
 * Usage:
 *   DEEPGRAM_API_KEY=xxxx npm run test:diarize
 */

import { readFileSync } from 'fs';
import { basename } from 'path';

async function main() {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
        console.error('❌ DEEPGRAM_API_KEY 환경 변수가 설정되지 않았습니다.');
        process.exit(1);
    }

    // Default test file path from the repo
    const filePath = process.argv[2] || 'test/3d67026a0365d4b34a577dbc792af6ec_MD5.m4a';

    console.log(`🎧 테스트 파일: ${filePath}`);
    const audio = readFileSync(filePath);

    const params = new URLSearchParams({
        model: 'nova-3',
        smart_format: 'true',
        diarize: 'true',
        diarize_version: '2023-10-12',
        utterances: 'true'
    });

    const url = `https://api.deepgram.com/v1/listen?${params.toString()}`;

    // Long timeout for larger files
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10 * 60 * 1000); // 10 minutes
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Token ${apiKey}`,
            'Content-Type': 'audio/mp4',
        },
        body: audio,
        signal: controller.signal,
    } as any).finally(() => clearTimeout(timeout));

    if (!res.ok) {
        const text = await res.text();
        console.error(`❌ API 오류: ${res.status} ${res.statusText}`);
        console.error(text);
        process.exit(1);
    }

    const data = await res.json();
    const alt = data?.results?.channels?.[0]?.alternatives?.[0];
    const words: Array<{ word: string; speaker?: number }>
        = alt?.words || [];
    const transcript: string = alt?.transcript || '';

    // Count unique speakers
    const speakers = new Set<number>();
    for (const w of words) {
        if (typeof w.speaker === 'number') speakers.add(w.speaker);
    }

    console.log('--- 결과 요약 ---');
    console.log(`파일: ${basename(filePath)}`);
    console.log(`텍스트 길이: ${transcript?.length || 0}`);
    console.log(`단어 수: ${words.length}`);
    console.log(`감지된 화자 수: ${speakers.size}`);

    // Simple formatting by speaker prefix
    if (words.length > 0 && speakers.size > 0) {
        let lastSpeaker = words[0].speaker ?? 0;
        let line = `Speaker ${lastSpeaker + 1}:`;
        const lines: string[] = [];
        for (const w of words) {
            const s = w.speaker ?? 0;
            if (s !== lastSpeaker) {
                lines.push(line.trim());
                line = `Speaker ${s + 1}:`;
                lastSpeaker = s;
            }
            line += ` ${w.word}`;
        }
        lines.push(line.trim());
        const preview = lines.slice(0, 8).join('\n');
        console.log('\n--- 화자 분리 미리보기 ---');
        console.log(preview);
    } else {
        console.log('\n(화자 정보가 없거나 단어 목록이 비어 있습니다)');
    }
}

// Node 18+ global fetch; fallback if not available
declare const fetch: any;

main().catch((err) => {
    console.error('테스트 실패:', err);
    process.exit(1);
});
