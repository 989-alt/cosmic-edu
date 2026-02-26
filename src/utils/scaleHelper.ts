import { SUN_DIAMETER } from '../data/planets';

// 태양의 기본 렌더링 반지름 (Three.js units)
const BASE_SUN_RADIUS = 8;

// --- 모드 1: 학습용 비율 ---
const LEARNING_PLANET_RADIUS = 1.2; // 모든 행성 동일 크기
const LEARNING_DISTANCE_GAP = 12;   // 행성 간 균등 간격

// --- 모드 2: 실제 크기 비율 ---
const MIN_RENDER_RADIUS = 0.15; // 최소 보장 크기

// --- 모드 3: 실제 거리 비율 ---
const DISTANCE_SCALE_FACTOR = 20;

export type ScaleMode = 'learning' | 'realSize' | 'realDistance';

export function getSunRadius(mode: ScaleMode): number {
    if (mode === 'learning') return 3;
    return BASE_SUN_RADIUS;
}

export function getPlanetRadius(
    planetDiameter: number,
    mode: ScaleMode
): number {
    switch (mode) {
        case 'learning':
            return LEARNING_PLANET_RADIUS;
        case 'realSize':
        case 'realDistance': {
            const ratio = planetDiameter / SUN_DIAMETER;
            const scaled = BASE_SUN_RADIUS * ratio;
            return Math.max(scaled, MIN_RENDER_RADIUS);
        }
        default:
            return LEARNING_PLANET_RADIUS;
    }
}

export function getPlanetDistance(
    planetIndex: number,
    auDistance: number,
    mode: ScaleMode
): number {
    switch (mode) {
        case 'learning':
            return (planetIndex + 1) * LEARNING_DISTANCE_GAP + getSunRadius('learning') + 2;
        case 'realSize':
            return (planetIndex + 1) * LEARNING_DISTANCE_GAP + getSunRadius('realSize') + 2;
        case 'realDistance': {
            if (auDistance === 0) return 0;
            return Math.log10(auDistance * 100 + 1) * DISTANCE_SCALE_FACTOR + getSunRadius('realDistance') + 2;
        }
        default:
            return (planetIndex + 1) * LEARNING_DISTANCE_GAP;
    }
}

// Volume comparison (log scale for bar chart)
export function getVolumeBarWidth(planetDiameter: number, maxWidth: number): number {
    const volume = (4 / 3) * Math.PI * Math.pow(planetDiameter / 2, 3);
    const sunVolume = (4 / 3) * Math.PI * Math.pow(SUN_DIAMETER / 2, 3);
    const logRatio = Math.log10(volume / sunVolume + 1);
    const logMax = Math.log10(2); // ~1 for Sun itself
    return Math.max((logRatio / logMax) * maxWidth, 4);
}
