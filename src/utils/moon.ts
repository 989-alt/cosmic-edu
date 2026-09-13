/**
 * 달 위상 기하 순수 함수. MoonPhase2D 는 이 함수로 픽셀 단위 판정만 하고 그린다.
 * 북반구 기준: 차오르는 달은 오른쪽이 밝고, 기우는 달은 왼쪽이 밝다.
 */

/** 음력 날짜(1~30) → 차오르는 달 여부. 1~15 차오름, 16~30 기욺. */
export function isWaxing(lunarDay: number): boolean {
    return lunarDay <= 15;
}

/**
 * 명암 경계선(터미네이터)이 가로축(y=0)과 만나는 x 좌표(반지름 1 기준).
 * 밝은 부분은 waxing 이면 [terminatorX, +1], 아니면 [−1, terminatorX].
 * illumination 0 → 경계가 밝은 쪽 가장자리(전부 어둠), 1 → 반대쪽 가장자리(전부 밝음).
 */
export function terminatorX(illumination: number, waxing: boolean): number {
    const k = 1 - 2 * Math.max(0, Math.min(1, illumination));
    return waxing ? k : -k;
}

/**
 * 달 원판 위 점(x, y) (반지름 1 정규화)이 밝은 면인지.
 * 경계선은 x = terminatorX·√(1−y²) 인 타원 호.
 */
export function isLitAt(illumination: number, waxing: boolean, x: number, y: number): boolean {
    return litSignedDistance(illumination, waxing, x, y) >= 0;
}

/** 밝은 면 쪽이 양수인 부호 거리(x 방향). 안티에일리어싱용. */
export function litSignedDistance(illumination: number, waxing: boolean, x: number, y: number): number {
    const edge = terminatorX(illumination, waxing) * Math.sqrt(Math.max(0, 1 - y * y));
    return waxing ? x - edge : edge - x;
}
