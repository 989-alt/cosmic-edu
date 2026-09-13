import { describe, it, expect } from 'vitest';
import {
    KOREA_LAT, AXIAL_TILT, declination, subsolarLatitude, orbitAngle,
    meridianAltitude, hourAngle, sunAltitude, sunAzimuth, sunTimes,
    shadowLength, energyDensity, irradiatedArea, skyProjection,
} from './solar';

describe('declination / subsolarLatitude', () => {
    it('6월 +23.44, 12월 −23.44, 3·9월 0', () => {
        expect(declination(6)).toBeCloseTo(AXIAL_TILT, 5);
        expect(declination(12)).toBeCloseTo(-AXIAL_TILT, 5);
        expect(declination(3)).toBeCloseTo(0, 5);
        expect(declination(9)).toBeCloseTo(0, 5);
        expect(subsolarLatitude(6)).toBe(declination(6));
    });
});

describe('orbitAngle 과 자전축 규약 (rotation=[0,0,+tilt] → 축이 −x 로 기욺)', () => {
    it('6월 지구는 +x, 태양 방향 −x 와 축 방향이 일치 = 북반구 여름', () => {
        const θ = orbitAngle(6);
        const earth = [Math.cos(θ), 0, Math.sin(θ)];
        const toSun = [-earth[0], 0, -earth[2]];
        const axisXZ = [-Math.sin(AXIAL_TILT * Math.PI / 180), 0]; // 축의 x,z 성분
        const dot = toSun[0] * axisXZ[0] + toSun[2] * axisXZ[1];
        expect(dot).toBeGreaterThan(0.3);
    });
    it('12월은 반대, 3·9월은 직교', () => {
        const axisX = -Math.sin(AXIAL_TILT * Math.PI / 180);
        const dotFor = (m: number) => { const θ = orbitAngle(m); return -Math.cos(θ) * axisX; };
        expect(dotFor(12)).toBeLessThan(-0.3);
        expect(dotFor(3)).toBeCloseTo(0, 5);
        expect(dotFor(9)).toBeCloseTo(0, 5);
    });
});

describe('37°N 남중 고도', () => {
    it('하지 76.44, 동지 29.56, 춘분 53', () => {
        expect(meridianAltitude(KOREA_LAT, declination(6))).toBeCloseTo(76.44, 1);
        expect(meridianAltitude(KOREA_LAT, declination(12))).toBeCloseTo(29.56, 1);
        expect(meridianAltitude(KOREA_LAT, declination(3))).toBeCloseTo(53, 1);
    });
    it('sunAltitude 남중(H=0)은 meridianAltitude 와 같다', () => {
        for (const m of [1, 4, 6, 9, 12]) {
            expect(sunAltitude(KOREA_LAT, declination(m), 0)).toBeCloseTo(meridianAltitude(KOREA_LAT, declination(m)), 6);
        }
    });
});

describe('일출·일몰·낮 길이', () => {
    it('하지 낮 약 14.5h, 동지 약 9.5h, 춘분 12h', () => {
        expect(sunTimes(KOREA_LAT, declination(6)).dayLength).toBeCloseTo(14.54, 1);
        expect(sunTimes(KOREA_LAT, declination(12)).dayLength).toBeCloseTo(9.46, 1);
        expect(sunTimes(KOREA_LAT, declination(3)).dayLength).toBeCloseTo(12, 5);
    });
    it('일출 시각에 고도 0', () => {
        const { sunrise } = sunTimes(KOREA_LAT, declination(6));
        expect(sunAltitude(KOREA_LAT, declination(6), hourAngle(sunrise))).toBeCloseTo(0, 6);
    });
    it('춘분 일출은 정동(−90°), 일몰은 정서(+90°)', () => {
        const d = declination(3);
        const { sunrise, sunset } = sunTimes(KOREA_LAT, d);
        expect(sunAzimuth(KOREA_LAT, d, hourAngle(sunrise))).toBeCloseTo(-90, 3);
        expect(sunAzimuth(KOREA_LAT, d, hourAngle(sunset))).toBeCloseTo(90, 3);
    });
    it('하지 일출은 동보다 북쪽(|az|>90), 동지는 남쪽(|az|<90)', () => {
        const s = sunTimes(KOREA_LAT, declination(6));
        expect(Math.abs(sunAzimuth(KOREA_LAT, declination(6), hourAngle(s.sunrise)))).toBeGreaterThan(90);
        const w = sunTimes(KOREA_LAT, declination(12));
        expect(Math.abs(sunAzimuth(KOREA_LAT, declination(12), hourAngle(w.sunrise)))).toBeLessThan(90);
    });
});

describe('그림자·에너지', () => {
    it('shadowLength 45° → 높이와 같음, 0° 이하 Infinity, 90° → 0', () => {
        expect(shadowLength(1, 45)).toBeCloseTo(1, 6);
        expect(shadowLength(1, 0)).toBe(Infinity);
        expect(shadowLength(1, 90)).toBe(0);
    });
    it('energyDensity 는 고도 단조 증가, irradiatedArea 는 역수', () => {
        expect(energyDensity(30)).toBeLessThan(energyDensity(60));
        expect(irradiatedArea(30)).toBeCloseTo(2, 6);
        expect(energyDensity(30) * irradiatedArea(30)).toBeCloseTo(1, 6);
    });
});

describe('skyProjection (남향 측면 도해)', () => {
    it('오전은 왼쪽(x<0), 오후는 오른쪽(x>0), 남중은 x≈0', () => {
        const d = declination(6);
        expect(skyProjection(KOREA_LAT, d, -45).x).toBeLessThan(0);
        expect(skyProjection(KOREA_LAT, d, 45).x).toBeGreaterThan(0);
        expect(skyProjection(KOREA_LAT, d, 0).x).toBeCloseTo(0, 6);
        expect(skyProjection(KOREA_LAT, d, 0).y).toBeCloseTo(Math.sin(76.44 * Math.PI / 180), 2);
    });
});
