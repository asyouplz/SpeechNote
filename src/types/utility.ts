/**
 * 유틸리티 타입 정의
 * TypeScript의 고급 타입 시스템을 활용한 재사용 가능한 타입들
 */

/**
 * 깊은 부분 타입 (모든 속성을 선택적으로)
 */
export type DeepPartial<T> = T extends object ? {
    [P in keyof T]?: DeepPartial<T[P]>;
} : T;

/**
 * 깊은 읽기 전용 타입
 */
export type DeepReadonly<T> = T extends object ? {
    readonly [P in keyof T]: DeepReadonly<T[P]>;
} : T;

/**
 * 깊은 필수 타입 (모든 속성을 필수로)
 */
export type DeepRequired<T> = T extends object ? {
    [P in keyof T]-?: DeepRequired<T[P]>;
} : T;

/**
 * Nullable 타입
 */
export type Nullable<T> = T | null;

/**
 * Optional 타입
 */
export type Optional<T> = T | undefined;

/**
 * Maybe 타입 (null 또는 undefined 가능)
 */
export type Maybe<T> = T | null | undefined;

/**
 * 배열 요소 타입 추출
 */
export type ArrayElement<T> = T extends readonly (infer U)[] ? U : never;

/**
 * Promise 내부 타입 추출
 */
export type PromiseType<T> = T extends Promise<infer U> ? U : never;

/**
 * 함수 반환 타입 추출
 */
export type ReturnTypeOf<T extends (...args: any) => any> = T extends (...args: any) => infer R ? R : never;

/**
 * 함수 매개변수 타입 추출
 */
export type ParametersOf<T extends (...args: any) => any> = T extends (...args: infer P) => any ? P : never;

/**
 * 객체의 값 타입들
 */
export type ValueOf<T> = T[keyof T];

/**
 * 특정 키만 선택
 */
export type PickByValue<T, V> = Pick<T, {
    [K in keyof T]: T[K] extends V ? K : never;
}[keyof T]>;

/**
 * 특정 키 제외
 */
export type OmitByValue<T, V> = Pick<T, {
    [K in keyof T]: T[K] extends V ? never : K;
}[keyof T]>;

/**
 * 문자열 리터럴 유니온 타입
 */
export type StringLiteral<T> = T extends string ? (string extends T ? never : T) : never;

/**
 * 타입 XOR (하나만 선택)
 */
export type XOR<T, U> = (T | U) extends object ?
    (Without<T, U> & U) | (Without<U, T> & T) :
    T | U;

/**
 * Without 헬퍼 타입
 */
type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

/**
 * 불변 타입
 */
export type Immutable<T> = {
    readonly [P in keyof T]: T[P] extends object ? Immutable<T[P]> : T[P];
};

/**
 * 가변 타입
 */
export type Mutable<T> = {
    -readonly [P in keyof T]: T[P];
};

/**
 * 타입 Diff (차집합)
 */
export type Diff<T, U> = T extends U ? never : T;

/**
 * 타입 교집합
 */
export type Intersection<T, U> = T extends U ? T : never;

/**
 * 함수 타입인지 확인
 */
export type IsFunction<T> = T extends (...args: any[]) => any ? true : false;

/**
 * 배열 타입인지 확인
 */
export type IsArray<T> = T extends any[] ? true : false;

/**
 * 객체 타입인지 확인
 */
export type IsObject<T> = T extends object ? (T extends any[] ? false : true) : false;

/**
 * 타입 병합
 */
export type Merge<T, U> = Omit<T, keyof U> & U;

/**
 * 재귀적 키 경로
 */
export type Path<T> = T extends object ? {
    [K in keyof T]: K extends string ?
        T[K] extends object ?
            K | `${K}.${Path<T[K]>}` :
            K :
        never;
}[keyof T] : never;

/**
 * 경로로 타입 접근
 */
export type PathValue<T, P extends Path<T>> = P extends `${infer K}.${infer Rest}` ?
    K extends keyof T ?
        Rest extends Path<T[K]> ?
            PathValue<T[K], Rest> :
            never :
        never :
    P extends keyof T ?
        T[P] :
        never;

/**
 * 타입 별칭
 */
export type Alias<T> = T & {};

/**
 * 조건부 타입
 */
export type If<C extends boolean, T, F> = C extends true ? T : F;

/**
 * 타입 스위치
 */
export type Switch<T extends string | number, Cases extends Record<T, any>, Default = never> = 
    T extends keyof Cases ? Cases[T] : Default;

/**
 * 튜플 타입
 */
export type Tuple<T, N extends number> = N extends N ? 
    number extends N ? T[] : _TupleOf<T, N, []> : never;

type _TupleOf<T, N extends number, R extends unknown[]> = 
    R['length'] extends N ? R : _TupleOf<T, N, [...R, T]>;

/**
 * 에러 결과 타입
 */
export type Result<T, E = Error> = 
    | { success: true; data: T }
    | { success: false; error: E };

/**
 * 비동기 결과 타입
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

/**
 * Either 타입 (함수형 프로그래밍)
 */
export type Either<L, R> = 
    | { type: 'left'; value: L }
    | { type: 'right'; value: R };

/**
 * 브랜드 타입 (명목적 타이핑)
 */
export type Brand<T, B> = T & { __brand: B };

/**
 * 타입 안전 Omit
 */
export type StrictOmit<T, K extends keyof T> = Omit<T, K>;

/**
 * 타입 안전 Extract
 */
export type StrictExtract<T, U extends T> = Extract<T, U>;