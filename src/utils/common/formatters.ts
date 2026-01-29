/**
 * 공통 포맷팅 유틸리티 함수들
 * DRY 원칙에 따라 중복 코드를 제거하고 재사용 가능한 형태로 추출
 */

/**
 * 파일 크기를 사람이 읽기 쉬운 형식으로 포맷팅
 */
export function formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const unitSize = 1024;

    if (bytes === 0) return '0 B';
    if (bytes < 0) throw new Error('Invalid file size: negative bytes');

    const unitIndex = Math.floor(Math.log(bytes) / Math.log(unitSize));
    const size = bytes / Math.pow(unitSize, unitIndex);

    // 적절한 소수점 자리수 결정
    const decimals = unitIndex === 0 ? 0 : 2;

    return `${size.toFixed(decimals)} ${units[unitIndex]}`;
}

/**
 * 날짜를 지정된 형식으로 포맷팅
 */
export function formatDate(date: Date, format: string): string {
    const tokens: Record<string, () => string> = {
        YYYY: () => date.getFullYear().toString(),
        YY: () => date.getFullYear().toString().slice(-2),
        MM: () => (date.getMonth() + 1).toString().padStart(2, '0'),
        M: () => (date.getMonth() + 1).toString(),
        DD: () => date.getDate().toString().padStart(2, '0'),
        D: () => date.getDate().toString(),
        HH: () => date.getHours().toString().padStart(2, '0'),
        H: () => date.getHours().toString(),
        mm: () => date.getMinutes().toString().padStart(2, '0'),
        m: () => date.getMinutes().toString(),
        ss: () => date.getSeconds().toString().padStart(2, '0'),
        s: () => date.getSeconds().toString(),
        SSS: () => date.getMilliseconds().toString().padStart(3, '0'),
    };

    let formatted = format;

    // 긴 토큰부터 처리하여 잘못된 치환 방지
    const sortedTokens = Object.keys(tokens).sort((a, b) => b.length - a.length);

    for (const token of sortedTokens) {
        const regex = new RegExp(token, 'g');
        formatted = formatted.replace(regex, tokens[token]());
    }

    return formatted;
}

/**
 * 시간 간격을 사람이 읽기 쉬운 형식으로 포맷팅
 */
export function formatDuration(milliseconds: number): string {
    if (milliseconds < 0) throw new Error('Invalid duration: negative milliseconds');

    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
        const remainingMinutes = minutes % 60;
        return `${hours}h ${remainingMinutes}m`;
    }

    if (minutes > 0) {
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
    }

    if (seconds > 0) {
        return `${seconds}s`;
    }

    return `${milliseconds}ms`;
}

/**
 * 백분율 포맷팅
 */
export function formatPercentage(value: number, decimals = 1): string {
    if (value < 0 || value > 100) {
        throw new Error('Percentage must be between 0 and 100');
    }

    return `${value.toFixed(decimals)}%`;
}

/**
 * 숫자를 천 단위 구분자와 함께 포맷팅
 */
export function formatNumber(value: number, locale = 'en-US'): string {
    return new Intl.NumberFormat(locale).format(value);
}

/**
 * 텍스트 자르기 (말줄임표 추가)
 */
export function truncateText(text: string, maxLength: number, suffix = '...'): string {
    if (maxLength <= 0) throw new Error('Max length must be positive');
    if (text.length <= maxLength) return text;

    const truncateAt = maxLength - suffix.length;
    if (truncateAt <= 0) return suffix;

    return text.substring(0, truncateAt) + suffix;
}

/**
 * 파일 경로에서 파일명 추출
 */
export function extractFileName(path: string, includeExtension = true): string {
    const parts = path.split('/');
    const fileName = parts[parts.length - 1];

    if (!includeExtension) {
        const dotIndex = fileName.lastIndexOf('.');
        if (dotIndex > 0) {
            return fileName.substring(0, dotIndex);
        }
    }

    return fileName;
}

/**
 * 파일 경로에서 확장자 추출
 */
export function extractFileExtension(path: string): string {
    const dotIndex = path.lastIndexOf('.');
    if (dotIndex <= 0 || dotIndex === path.length - 1) {
        return '';
    }
    return path.substring(dotIndex + 1).toLowerCase();
}

/**
 * 타임스탬프 생성
 */
export function createTimestamp(format = 'YYYY-MM-DD HH:mm:ss'): string {
    return formatDate(new Date(), format);
}

/**
 * ISO 날짜 문자열을 로컬 시간으로 포맷팅
 */
export function formatISODate(isoString: string, format = 'YYYY-MM-DD HH:mm'): string {
    try {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) {
            throw new Error('Invalid ISO date string');
        }
        return formatDate(date, format);
    } catch {
        return isoString; // 파싱 실패 시 원본 반환
    }
}
