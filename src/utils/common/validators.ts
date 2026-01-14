/**
 * 공통 검증 유틸리티 함수들
 * 입력값 검증 로직을 중앙화하여 일관성 확보
 */

/**
 * API 키 형식 검증
 */
export function validateApiKey(key: string, provider: 'openai' | 'anthropic' = 'openai'): boolean {
    if (!key || typeof key !== 'string') return false;
    
    switch (provider) {
        case 'openai':
            // OpenAI API 키: sk-로 시작하고 최소 20자
            return /^sk-[A-Za-z0-9]{20,}$/.test(key);
        case 'anthropic':
            // Anthropic API 키 형식
            return /^sk-ant-[A-Za-z0-9]{20,}$/.test(key);
        default:
            return false;
    }
}

/**
 * 파일 크기 검증
 */
export function validateFileSize(
    sizeInBytes: number, 
    maxSizeInBytes: number, 
    minSizeInBytes = 0
): { valid: boolean; error?: string } {
    if (sizeInBytes < minSizeInBytes) {
        return {
            valid: false,
            error: `File size must be at least ${minSizeInBytes} bytes`
        };
    }
    
    if (sizeInBytes > maxSizeInBytes) {
        return {
            valid: false,
            error: `File size must not exceed ${maxSizeInBytes} bytes`
        };
    }
    
    return { valid: true };
}

/**
 * 파일 확장자 검증
 */
export function validateFileExtension(
    fileName: string, 
    allowedExtensions: string[]
): { valid: boolean; error?: string } {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    if (!extension) {
        return {
            valid: false,
            error: 'File has no extension'
        };
    }
    
    const normalizedExtensions = allowedExtensions.map(ext => 
        ext.toLowerCase().replace(/^\./, '')
    );
    
    if (!normalizedExtensions.includes(extension)) {
        return {
            valid: false,
            error: `File type .${extension} is not supported. Allowed types: ${normalizedExtensions.map(e => `.${e}`).join(', ')}`
        };
    }
    
    return { valid: true };
}

/**
 * URL 형식 검증
 */
export function validateUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
        return false;
    }
}

/**
 * 이메일 형식 검증
 */
export function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * 범위 검증
 */
export function validateRange(
    value: number, 
    min: number, 
    max: number, 
    inclusive = true
): { valid: boolean; error?: string } {
    if (inclusive) {
        if (value < min || value > max) {
            return {
                valid: false,
                error: `Value must be between ${min} and ${max} (inclusive)`
            };
        }
    } else {
        if (value <= min || value >= max) {
            return {
                valid: false,
                error: `Value must be between ${min} and ${max} (exclusive)`
            };
        }
    }
    
    return { valid: true };
}

/**
 * 문자열 길이 검증
 */
export function validateStringLength(
    str: string, 
    minLength = 0, 
    maxLength = Infinity
): { valid: boolean; error?: string } {
    if (str.length < minLength) {
        return {
            valid: false,
            error: `String must be at least ${minLength} characters long`
        };
    }
    
    if (str.length > maxLength) {
        return {
            valid: false,
            error: `String must not exceed ${maxLength} characters`
        };
    }
    
    return { valid: true };
}

/**
 * JSON 문자열 검증
 */
export function validateJson(jsonString: string): { valid: boolean; data?: unknown; error?: string } {
    try {
        const data = JSON.parse(jsonString);
        return { valid: true, data };
    } catch (error) {
        return {
            valid: false,
            error: error instanceof Error ? error.message : 'Invalid JSON'
        };
    }
}

/**
 * 날짜 검증
 */
export function validateDate(dateString: string): { valid: boolean; date?: Date; error?: string } {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
        return {
            valid: false,
            error: 'Invalid date format'
        };
    }
    
    return { valid: true, date };
}

/**
 * 배열 검증
 */
export function validateArray<T>(
    arr: T[], 
    minLength = 0, 
    maxLength = Infinity
): { valid: boolean; error?: string } {
    if (!Array.isArray(arr)) {
        return {
            valid: false,
            error: 'Value is not an array'
        };
    }
    
    if (arr.length < minLength) {
        return {
            valid: false,
            error: `Array must contain at least ${minLength} items`
        };
    }
    
    if (arr.length > maxLength) {
        return {
            valid: false,
            error: `Array must not exceed ${maxLength} items`
        };
    }
    
    return { valid: true };
}

/**
 * 필수 필드 검증
 */
export function validateRequiredFields<T extends Record<string, unknown>>(
    obj: T, 
    requiredFields: (keyof T)[]
): { valid: boolean; missingFields?: string[] } {
    const missingFields = requiredFields.filter(field => 
        obj[field] === undefined || obj[field] === null || obj[field] === ''
    );
    
    if (missingFields.length > 0) {
        return {
            valid: false,
            missingFields: missingFields.map(String)
        };
    }
    
    return { valid: true };
}
