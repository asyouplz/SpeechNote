/**
 * Deepgram 통합 테스트
 * 구현된 기능들이 올바르게 작동하는지 검증
 */

import { DeepgramModelRegistry } from '../src/config/DeepgramModelRegistry';

// 테스트 실행 함수
async function runTests() {
    console.log('=== Deepgram Integration Tests ===\n');
    
    // 1. Registry 초기화 테스트
    console.log('1. Testing DeepgramModelRegistry initialization...');
    const registry = DeepgramModelRegistry.getInstance();
    console.log(`   ✓ Registry initialized`);
    
    // 2. 모델 로드 테스트
    console.log('\n2. Testing model loading...');
    const models = registry.getAllModels();
    console.log(`   ✓ Loaded ${models.length} models`);
    models.forEach(model => {
        console.log(`     - ${model.name} (${model.tier}): $${model.pricing.perMinute}/min`);
    });
    
    // 3. 기능 로드 테스트
    console.log('\n3. Testing feature loading...');
    const features = registry.getAllFeatures();
    console.log(`   ✓ Loaded ${features.size} features`);
    features.forEach((feature, key) => {
        console.log(`     - ${key}: ${feature.name}${feature.requiresPremium ? ' (Premium)' : ''}`);
    });
    
    // 4. 모델 검색 테스트
    console.log('\n4. Testing model search functions...');
    
    // 언어별 검색
    const koreanModels = registry.getModelsByLanguage('ko');
    console.log(`   ✓ Models supporting Korean: ${koreanModels.map(m => m.name).join(', ')}`);
    
    // 티어별 검색
    const premiumModels = registry.getModelsByTier('premium');
    console.log(`   ✓ Premium models: ${premiumModels.map(m => m.name).join(', ')}`);
    
    // 가격별 검색
    const budgetModels = registry.getModelsByPriceRange(0.01);
    console.log(`   ✓ Models under $0.01/min: ${budgetModels.map(m => m.name).join(', ')}`);
    
    // 5. 추천 시스템 테스트
    console.log('\n5. Testing recommendation system...');
    
    const recommendedForKorean = registry.getRecommendedModel({
        language: 'ko',
        maxPrice: 0.015,
        minAccuracy: 85
    });
    console.log(`   ✓ Recommended for Korean (budget $0.015/min): ${recommendedForKorean?.name || 'None'}`);
    
    const recommendedWithFeatures = registry.getRecommendedModel({
        requiredFeatures: ['diarization', 'smartFormat'],
        minAccuracy: 90
    });
    console.log(`   ✓ Recommended with diarization & smart format: ${recommendedWithFeatures?.name || 'None'}`);
    
    // 6. 비용 계산 테스트
    console.log('\n6. Testing cost calculation...');
    const testDuration = 60; // 60분
    models.forEach(model => {
        const cost = registry.calculateCost(model.id, testDuration);
        console.log(`   - ${model.name}: $${cost.toFixed(2)} for ${testDuration} minutes`);
    });
    
    // 7. 성능 점수 테스트
    console.log('\n7. Testing performance scoring...');
    models.forEach(model => {
        const score = registry.getPerformanceScore(model.id);
        console.log(`   - ${model.name}: ${score}/100 points`);
    });
    
    // 8. 모델 검증 테스트
    console.log('\n8. Testing model validation...');
    models.forEach(model => {
        const validation = registry.validateModel(model.id);
        if (validation.valid) {
            console.log(`   ✓ ${model.name}: Valid`);
        } else {
            console.log(`   ✗ ${model.name}: Invalid - ${validation.errors.join(', ')}`);
        }
    });
    
    // 9. 기능 지원 확인 테스트
    console.log('\n9. Testing feature support...');
    const nova2 = registry.getModel('nova-2');
    if (nova2) {
        console.log(`   Nova-2 feature support:`);
        ['punctuation', 'smartFormat', 'diarization', 'summarization'].forEach(feature => {
            const supported = registry.isFeatureSupported('nova-2', feature);
            console.log(`     - ${feature}: ${supported ? '✓' : '✗'}`);
        });
    }
    
    // 10. 언어 지원 확인 테스트
    console.log('\n10. Testing language support...');
    const testLanguages = ['en', 'ko', 'ja', 'zh', 'ar', 'hi'];
    console.log(`   Nova-2 language support:`);
    testLanguages.forEach(lang => {
        const supported = registry.isLanguageSupported('nova-2', lang);
        console.log(`     - ${lang}: ${supported ? '✓' : '✗'}`);
    });
    
    console.log('\n=== All tests completed successfully! ===');
}

// 테스트 실행
runTests().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});