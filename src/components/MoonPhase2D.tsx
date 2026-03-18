import { useRef, useEffect } from 'react';

/**
 * 2D Canvas로 달의 위상을 렌더링하는 컴포넌트.
 * illumination: 0 (삭) ~ 1 (보름) 사이의 값
 * lunarDay: 1~30. 1~15는 차오르는 달, 16~30은 기우는 달
 * size: 캔버스 크기 (px)
 * eclipseType: 일식/월식 타입 (optional)
 */
export default function MoonPhase2D({ illumination, lunarDay, size = 80, eclipseType }: {
    illumination: number;
    lunarDay: number;
    size?: number;
    eclipseType?: string | null;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const w = canvas.width;
        const h = canvas.height;
        const cx = w / 2;
        const cy = h / 2;
        const r = w / 2 - 4;

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

            // 코로나 광선
            if (isTotalSolar) {
                ctx.save();
                for (let i = 0; i < 16; i++) {
                    const a = (i / 16) * Math.PI * 2;
                    const len = r * (0.6 + (i % 3) * 0.2);
                    ctx.beginPath();
                    ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
                    ctx.lineTo(cx + Math.cos(a) * (r + len), cy + Math.sin(a) * (r + len));
                    ctx.strokeStyle = 'rgba(255,248,220,0.3)';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
                ctx.restore();
            }
        }

        // 달의 어두운 면 (배경)
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        if (isLunarEclipse) {
            ctx.fillStyle = isTotalLunar ? '#5a1010' : '#4a2010';
        } else {
            ctx.fillStyle = '#1a1a2e';
        }
        ctx.fill();

        // 달 표면 텍스처 느낌
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = isLunarEclipse ? 'rgba(139, 37, 0, 0.3)' : 'rgba(100, 100, 120, 0.15)';
        ctx.fill();

        // 밝은 면 그리기
        const isWaxing = lunarDay <= 15;
        const phase = illumination;

        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.clip();

        ctx.beginPath();
        if (isWaxing) {
            ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, false);
            ctx.ellipse(cx, cy, Math.abs(r * (1 - 2 * phase)), r, 0, Math.PI / 2, -Math.PI / 2, phase > 0.5);
        } else {
            ctx.arc(cx, cy, r, Math.PI / 2, -Math.PI / 2, false);
            ctx.ellipse(cx, cy, Math.abs(r * (1 - 2 * phase)), r, 0, -Math.PI / 2, Math.PI / 2, phase < 0.5);
        }
        ctx.closePath();

        if (isLunarEclipse) {
            const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
            gradient.addColorStop(0, isTotalLunar ? '#cc4444' : '#cc7744');
            gradient.addColorStop(0.7, isTotalLunar ? '#8B2500' : '#aa5533');
            gradient.addColorStop(1, isTotalLunar ? '#5a1010' : '#884422');
            ctx.fillStyle = gradient;
        } else {
            const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
            gradient.addColorStop(0, '#e8e0d0');
            gradient.addColorStop(0.7, '#c8c0b0');
            gradient.addColorStop(1, '#a89880');
            ctx.fillStyle = gradient;
        }
        ctx.fill();

        ctx.restore();

        // 테두리
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        if (isSolarEclipse) {
            ctx.strokeStyle = 'rgba(255, 228, 181, 0.5)';
            ctx.lineWidth = 2;
        } else if (isLunarEclipse) {
            ctx.strokeStyle = 'rgba(200, 50, 50, 0.4)';
            ctx.lineWidth = 1.5;
        } else {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 1;
        }
        ctx.stroke();

    }, [illumination, lunarDay, size, eclipseType]);

    return (
        <canvas
            ref={canvasRef}
            width={size}
            height={size}
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
