import { describe, it, expect } from 'vitest';
import { isWaxing, terminatorX, isLitAt } from './moon';

// 배포본에서 실제로 났던 버그: 음력 3일(초승달)이 거의 보름달로 그려짐.
// 이 검사는 "오른쪽 70% 지점"과 "왼쪽 70% 지점"의 명암만 본다.
describe('달 위상 명암 판정 (북반구)', () => {
    it('초승달(3일, 밝기 0.1): 오른쪽 가장자리만 밝다', () => {
        const w = isWaxing(3);
        expect(isLitAt(0.1, w, 0.95, 0)).toBe(true);
        expect(isLitAt(0.1, w, 0.7, 0)).toBe(false);
        expect(isLitAt(0.1, w, -0.7, 0)).toBe(false);
    });
    it('상현달(7일, 밝기 0.5): 오른쪽 반 밝음, 왼쪽 반 어둠', () => {
        const w = isWaxing(7);
        expect(isLitAt(0.5, w, 0.3, 0.5)).toBe(true);
        expect(isLitAt(0.5, w, -0.3, 0.5)).toBe(false);
    });
    it('차오르는 볼록달(10일, 밝기 0.75): 왼쪽 30%까지 밝고 왼쪽 가장자리는 어둠', () => {
        const w = isWaxing(10);
        expect(isLitAt(0.75, w, -0.3, 0)).toBe(true);
        expect(isLitAt(0.75, w, -0.7, 0)).toBe(false);
    });
    it('보름(15일, 밝기 1): 전부 밝음 / 삭(1일, 밝기 0): 전부 어둠', () => {
        for (const x of [-0.9, 0, 0.9]) {
            expect(isLitAt(1, true, x, 0)).toBe(true);
            expect(isLitAt(0, true, x, 0)).toBe(false);
        }
    });
    it('하현달(22일, 밝기 0.5): 왼쪽 반 밝음', () => {
        const w = isWaxing(22);
        expect(w).toBe(false);
        expect(isLitAt(0.5, w, -0.3, 0)).toBe(true);
        expect(isLitAt(0.5, w, 0.3, 0)).toBe(false);
    });
    it('그믐달(25일, 밝기 0.15): 왼쪽 가장자리만 밝다', () => {
        const w = isWaxing(25);
        expect(isLitAt(0.15, w, -0.95, 0)).toBe(true);
        expect(isLitAt(0.15, w, -0.6, 0)).toBe(false);
        expect(isLitAt(0.15, w, 0.7, 0)).toBe(false);
    });
    it('terminatorX 는 waxing/waning 에서 부호만 반대', () => {
        expect(terminatorX(0.2, true)).toBeCloseTo(0.6, 6);
        expect(terminatorX(0.2, false)).toBeCloseTo(-0.6, 6);
    });
});
