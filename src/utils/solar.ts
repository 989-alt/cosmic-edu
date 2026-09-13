/**
 * 태양 고도·계절 계산 순수 함수 모음.
 * 6학년 2학기 네 모듈(하루 태양 고도·계절별 남중 고도·에너지 밀도·자전축)이
 * 전부 이 파일 하나를 소비한다. 3D/2D 장면은 값을 계산하지 않고 여기서 받아 그리기만 한다.
 *
 * 규약
 * - 각도 인자·반환값은 전부 도(°). 라디안은 내부에서만 쓴다.
 * - month 는 1~12 실수. 3월=춘분, 6월=하지, 9월=추분, 12월=동지로 단순화한다.
 * - 시각은 태양시(남중=12시). 균시차·굴절은 무시한다(초등 수준 도해용).
 */

export const KOREA_LAT = 37; // 관측자 위도 (°N)
export const AXIAL_TILT = 23.44; // 자전축 기울기 (°)

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

/** month(1~12) → 태양 적위(°). 6월 +23.44, 12월 −23.44, 3·9월 0. */
export function declination(month: number, tilt = AXIAL_TILT): number {
    return tilt * Math.sin(((month - 3) / 12) * Math.PI * 2);
}

/** 태양 직사 위도(°) = 적위. 자전축 모듈에서 쓰는 이름. */
export const subsolarLatitude = declination;

/**
 * 우주 시점 3D 장면에서 지구의 공전 각(라디안).
 * 지구 위치 = (R·cos θ, 0, R·sin θ), 태양은 원점, 자전축은 월드 고정으로 −x 쪽으로 기울어져 있다
 * (three.js `rotation=[0, 0, +tilt]`). 이 규약에서 북극이 태양을 향하는 달은 6월이므로 6월을 θ=0(+x)에 둔다.
 */
export function orbitAngle(month: number): number {
    return ((month - 6) / 12) * Math.PI * 2;
}

/** 남중 고도(°) = 90 − 위도 + 적위 */
export function meridianAltitude(lat: number, decl: number): number {
    return 90 - lat + decl;
}

/** 시각(태양시, 0~24) → 시간각(°). 남중 12시 = 0°, 오전 음수, 오후 양수. */
export function hourAngle(hour: number): number {
    return (hour - 12) * 15;
}

/** 태양 고도(°). 지평선 아래면 음수. */
export function sunAltitude(lat: number, decl: number, hourAngleDeg: number): number {
    const φ = lat * D2R, δ = decl * D2R, H = hourAngleDeg * D2R;
    const s = Math.sin(φ) * Math.sin(δ) + Math.cos(φ) * Math.cos(δ) * Math.cos(H);
    return Math.asin(Math.max(-1, Math.min(1, s))) * R2D;
}

/** 태양 방위각(°). 정남 0, 서쪽 양수, 동쪽 음수. */
export function sunAzimuth(lat: number, decl: number, hourAngleDeg: number): number {
    const φ = lat * D2R, δ = decl * D2R, H = hourAngleDeg * D2R;
    return Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(φ) - Math.tan(δ) * Math.cos(φ)) * R2D;
}

/** 일출·일몰 시각(태양시)과 낮 길이(시간). 극야·백야는 0/24로 클램프. */
export function sunTimes(lat: number, decl: number): { sunrise: number; sunset: number; dayLength: number } {
    const x = -Math.tan(lat * D2R) * Math.tan(decl * D2R);
    const H0 = Math.acos(Math.max(-1, Math.min(1, x))) * R2D; // 일몰 시간각
    const half = H0 / 15;
    return { sunrise: 12 - half, sunset: 12 + half, dayLength: 2 * half };
}

/** 그림자 길이. 고도 0° 이하면 Infinity. */
export function shadowLength(height: number, altitudeDeg: number): number {
    if (altitudeDeg <= 0) return Infinity;
    if (altitudeDeg >= 90) return 0;
    return height / Math.tan(altitudeDeg * D2R);
}

/** 단위 면적당 에너지 밀도(0~1) = sin(고도). */
export function energyDensity(altitudeDeg: number): number {
    return Math.max(0, Math.sin(altitudeDeg * D2R));
}

/** 같은 빛 다발이 덮는 바닥 길이 배율 = 1/sin(고도). */
export function irradiatedArea(altitudeDeg: number): number {
    const s = Math.sin(altitudeDeg * D2R);
    return s <= 0.01 ? 100 : 1 / s;
}

/**
 * 관측자가 남쪽을 보고 선 2D 측면 도해에 태양을 찍는 좌표.
 * 하늘 반구를 남향 수직면에 정사영. x: 서쪽(오른쪽) 양수, y: 위 양수, 반지름 1.
 */
export function skyProjection(lat: number, decl: number, hourAngleDeg: number): { x: number; y: number; altitude: number } {
    const alt = sunAltitude(lat, decl, hourAngleDeg);
    const az = sunAzimuth(lat, decl, hourAngleDeg);
    return { x: Math.sin(az * D2R) * Math.cos(alt * D2R), y: Math.sin(alt * D2R), altitude: alt };
}

export function formatHour(hour: number): string {
    const h = Math.floor(hour);
    const m = Math.round((hour - h) * 60);
    return `${h}:${m.toString().padStart(2, '0')}`;
}
