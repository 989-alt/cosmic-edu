import { useRef, useEffect } from 'react';
import { isWaxing, litSignedDistance } from '../utils/moon';

/**
 * 2D Canvas로 달의 위상을 렌더링하는 컴포넌트.
 * illumination: 0 (삭) ~ 1 (보름) 사이의 값
 * lunarDay: 1~30. 1~15는 차오르는 달, 16~30은 기우는 달
 * size: 캔버스 크기 (px)
 * eclipseType: 일식/월식 타입 (optional)
 *
 * 명암은 utils/moon.ts 의 부호 거리로 픽셀마다 판정한다.
 * Canvas 호 방향 플래그(counterclockwise)로 그리던 이전 방식은 부호 버그가 잦아 폐기.
 */
export default function MoonPhase2D({ illumination, lunarDay, size = 80, eclipseType }: {
    illumination: number;
    lunarDay: number;
    size?: number;
    eclipseType?: string | null;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const scale = 2; // 슈퍼샘플. 픽셀 판정이라 2배로 그려 CSS로 줄인다.

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const w = canvas.width;
        const h = canvas.height;
        const cx = w / 2;
        const cy = h / 2;
        const r = w / 2 - 4 * scale;

        ctx.clearRect(0, 0, w, h);

        const isTotalSolar = eclipseType === 'total-solar';
        const isPartialSolar = eclipseType === 'partial-solar';
        const isTotalLunar = eclipseType === 'total-lunar';
        const isPartialLunar = eclipseType === 'partial-lunar';
        const isLunarEclipse = isTotalLunar || isPartialLunar;
        const isSolarEclipse = isTotalSolar || isPartialSolar;

        // 일식 시 코로나 효과 (배경 글로우)
        if (isSolarEclipse) {
            const coronaGrad = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * 2);
            coronaGrad.addColorStop(0, isTotalSolar ? 'rgba(255,228,181,0.7)' : 'rgba(255,228,181,0.3)');
            coronaGrad.addColorStop(0.5, isTotalSolar ? 'rgba(255,248,220,0.3)' : 'rgba(255,248,220,0.1)');
            coronaGrad.addColorStop(1, 'rgba(255,248,220,0)');
            ctx.fillStyle = coronaGrad;
            ctx.fillRect(0, 0, w, h);

            if (isTotalSolar) {
                for (let i = 0; i < 16; i++) {
                    const a = (i / 16) * Math.PI * 2;
                    const len = r * (0.6 + (i % 3) * 0.2);
                    ctx.beginPath();
                    ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
                    ctx.lineTo(cx + Math.cos(a) * (r + len), cy + Math.sin(a) * (r + len));
                    ctx.strokeStyle = 'rgba(255,248,220,0.3)';
                    ctx.lineWidth = scale;
                    ctx.stroke();
                }
            }
        }

        // 색상 스톱 (중심 → 가장자리)
        const lit: [number, number, number][] = isLunarEclipse
            ? (isTotalLunar ? [[204, 68, 68], [139, 37, 0], [90, 16, 16]] : [[204, 119, 68], [170, 85, 51], [136, 68, 34]])
            : [[232, 224, 208], [200, 192, 176], [168, 152, 128]];
        const dark: [number, number, number] = isLunarEclipse
            ? (isTotalLunar ? [90, 16, 16] : [74, 32, 16])
            : [32, 32, 50];

        const mix = (a: [number, number, number], b: [number, number, number], t: number) =>
            [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t] as const;
        const litColor = (d: number) => (d < 0.7 ? mix(lit[0], lit[1], d / 0.7) : mix(lit[1], lit[2], (d - 0.7) / 0.3));

        const waxing = isWaxing(lunarDay);
        const img = ctx.createImageData(w, h);
        const px = img.data;
        for (let py = 0; py < h; py++) {
            for (let pxi = 0; pxi < w; pxi++) {
                const nx = (pxi + 0.5 - cx) / r;
                const ny = (py + 0.5 - cy) / r;
                const d = Math.hypot(nx, ny);
                const edgeAlpha = Math.max(0, Math.min(1, (1 - d) * r)); // 원판 가장자리 1px 안티에일리어싱
                if (edgeAlpha <= 0) continue;
                const s = litSignedDistance(illumination, waxing, nx, ny) * r; // 밝은 쪽 양수, 픽셀 단위
                const litMix = Math.max(0, Math.min(1, s + 0.5));
                const c = mix(dark, litColor(d) as unknown as [number, number, number], litMix);
                const i = (py * w + pxi) * 4;
                px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = Math.round(edgeAlpha * 255);
            }
        }
        ctx.putImageData(img, 0, 0);

        // 테두리
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        if (isSolarEclipse) {
            ctx.strokeStyle = 'rgba(255, 228, 181, 0.5)';
            ctx.lineWidth = 2 * scale;
        } else if (isLunarEclipse) {
            ctx.strokeStyle = 'rgba(200, 50, 50, 0.4)';
            ctx.lineWidth = 1.5 * scale;
        } else {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = scale;
        }
        ctx.stroke();
    }, [illumination, lunarDay, size, eclipseType]);

    return (
        <canvas
            ref={canvasRef}
            width={size * scale}
            height={size * scale}
            style={{
                width: size, height: size, borderRadius: '50%',
                boxShadow: eclipseType?.includes('solar')
                    ? '0 0 20px rgba(255,228,181,0.5)'
                    : eclipseType?.includes('lunar')
                        ? '0 0 15px rgba(200,50,50,0.4)'
                        : '0 0 15px rgba(255,255,255,0.1)',
            }}
        />
    );
}
