/**
 * Custom Test Sequencer
 * 
 * 테스트 실행 순서 최적화
 * - 실패한 테스트 우선 실행
 * - 빠른 테스트 먼저 실행
 * - 의존성 있는 테스트 순서 보장
 */

const Sequencer = require('@jest/test-sequencer').default;

class CustomSequencer extends Sequencer {
    /**
     * 테스트 실행 순서 정렬
     */
    sort(tests) {
        // 테스트 결과 캐시 로드
        const cache = this.getCache(tests);
        
        return tests.sort((testA, testB) => {
            // 1. 실패한 테스트 우선
            const aFailed = cache[testA.path]?.failed || false;
            const bFailed = cache[testB.path]?.failed || false;
            
            if (aFailed && !bFailed) return -1;
            if (!aFailed && bFailed) return 1;
            
            // 2. 테스트 타입별 우선순위
            const priority = {
                'unit': 1,
                'integration': 2,
                'e2e': 3
            };
            
            const aType = this.getTestType(testA.path);
            const bType = this.getTestType(testB.path);
            
            if (priority[aType] !== priority[bType]) {
                return priority[aType] - priority[bType];
            }
            
            // 3. 실행 시간이 짧은 테스트 우선
            const aDuration = cache[testA.path]?.duration || 0;
            const bDuration = cache[testB.path]?.duration || 0;
            
            if (aDuration !== bDuration) {
                return aDuration - bDuration;
            }
            
            // 4. 파일 크기가 작은 테스트 우선
            const aSize = testA.context.config.testEnvironmentOptions?.fileSize || 0;
            const bSize = testB.context.config.testEnvironmentOptions?.fileSize || 0;
            
            if (aSize !== bSize) {
                return aSize - bSize;
            }
            
            // 5. 알파벳 순서
            return testA.path.localeCompare(testB.path);
        });
    }
    
    /**
     * 테스트 타입 판별
     */
    getTestType(path) {
        if (path.includes('/unit/')) return 'unit';
        if (path.includes('/integration/')) return 'integration';
        if (path.includes('/e2e/')) return 'e2e';
        return 'unit';
    }
    
    /**
     * 테스트 결과 캐시 저장
     */
    cacheResults(tests, results) {
        const cache = {};
        
        tests.forEach((test, index) => {
            const result = results[index];
            cache[test.path] = {
                failed: result.numFailingTests > 0,
                duration: result.perfStats.runtime,
                lastRun: Date.now()
            };
        });
        
        // 캐시 파일에 저장
        const fs = require('fs');
        const path = require('path');
        const cacheDir = path.join(process.cwd(), '.jest-cache');
        
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, { recursive: true });
        }
        
        fs.writeFileSync(
            path.join(cacheDir, 'test-sequencer-cache.json'),
            JSON.stringify(cache, null, 2)
        );
    }
    
    /**
     * 캐시 로드
     */
    getCache(tests) {
        const fs = require('fs');
        const path = require('path');
        const cacheFile = path.join(process.cwd(), '.jest-cache', 'test-sequencer-cache.json');
        
        if (fs.existsSync(cacheFile)) {
            try {
                return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
            } catch (error) {
                console.warn('Failed to load test sequencer cache:', error);
            }
        }
        
        return {};
    }
    
    /**
     * 샤드별 테스트 분배 (병렬 실행용)
     */
    shard(tests, { shardIndex, shardCount }) {
        // 테스트를 균등하게 분배
        const shardSize = Math.ceil(tests.length / shardCount);
        const start = shardSize * shardIndex;
        const end = Math.min(start + shardSize, tests.length);
        
        return tests.slice(start, end);
    }
}

module.exports = CustomSequencer;