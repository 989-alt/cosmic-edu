import { useEffect, useMemo, useRef, useState } from 'react';
import { Sun, Lightbulb } from 'lucide-react';
import { useSeasonStore } from '../../store/seasonStore';
import {
    KOREA_LAT,
    declination,
    formatHour,
    hourAngle,
    meridianAltitude,
    shadowLength,
    skyProjection,
    sunAltitude,
    sunTimes,
} from '../../utils/solar';
import { SvgPill } from '../../components/SvgPill';
import { SimLayout, SimStage, SimHud, SimDock, SimInspector, StatRow } from '../../components/SimLayout';

/**
 * 하루 태양 고도 — 관측자가 남쪽을 보고 선 2D SVG 측면 도해.
 * 계산은 전부 solar.ts. 이 파일은 값을 좌표로 옮겨 그리기만 한다.
 */

const HORIZON_Y = 468;
const CX = 500;
const ARC_RX = 420;
const ARC_RY = 330;
const STICK_PX = 120; // 막대 1 m = 120 px. 그림자도 같은 환산.
const SHADOW_MAX_PX = 460; // 지평선 폭 클램프
const ALT_ARC_R = 110;
const SAMPLES = 60;

interface Pt { x: number; y: number; altitude: number }

function project(month: number, hour: number): Pt {
    const p = skyProjection(KOREA_LAT, declination(month), hourAngle(hour));
    return { x: CX + p.x * ARC_RX, y: HORIZON_Y - p.y * ARC_RY, altitude: p.altitude };
}

/** 일출~일몰 호를 SVG path 로. */
function arcPath(month: number): string {
    const { sunrise, sunset } = sunTimes(KOREA_LAT, declination(month));
    let d = '';
    for (let i = 0; i < SAMPLES; i++) {
        const h = sunrise + ((sunset - sunrise) * i) / (SAMPLES - 1);
        const p = project(month, h);
        d += `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    }
    return d;
}

/** 고스트 호(하지·동지)는 month 와 무관한 상수. */
const GHOST_SUMMER = arcPath(6);
const GHOST_WINTER = arcPath(12);
const GHOST_SUMMER_LABEL = project(6, 15);
const GHOST_WINTER_LABEL = project(12, 15);

/** 일출~일몰 60점 표본. 고도(°)와 그림자 길이(m, 6 m 클램프). */
function sampleDay(month: number) {
    const decl = declination(month);
    const { sunrise, sunset } = sunTimes(KOREA_LAT, decl);
    const altitude: number[] = [];
    const shadow: number[] = [];
    for (let i = 0; i < SAMPLES; i++) {
        const h = sunrise + ((sunset - sunrise) * i) / (SAMPLES - 1);
        const a = sunAltitude(KOREA_LAT, decl, hourAngle(h));
        altitude.push(Math.max(0, a));
        shadow.push(Math.min(shadowLength(1, a), 6));
    }
    return { altitude, shadow };
}

/* === 하늘 색: 고도로 선형 보간 === */
type RGB = [number, number, number];
const NIGHT: RGB = [11, 16, 38];
const DUSK: RGB = [214, 122, 58];
const DAY: RGB = [96, 165, 226];

function mix(a: RGB, b: RGB, t: number): RGB {
    const k = Math.max(0, Math.min(1, t));
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}
function hex(c: RGB, scale = 1): string {
    const h = c.map((v) => Math.round(Math.max(0, Math.min(255, v * scale))).toString(16).padStart(2, '0'));
    return `#${h.join('')}`;
}
function skyColor(alt: number): RGB {
    if (alt <= -6) return NIGHT;
    if (alt < 4) return mix(NIGHT, DUSK, (alt + 6) / 10);
    return mix(DUSK, DAY, (alt - 4) / 26);
}


/* === Inspector 그래프 === */
function AutoGraph({ t, data, label, color, yRange, unit, current }: {
    t: number;
    /** y 값 배열 (x 는 등간격) */
    data: number[];
    label: string;
    color: string;
    yRange: [number, number];
    unit: string;
    /** 현재 시각의 값. 마커·수치는 이 값을 그대로 쓴다. */
    current: number;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const w = canvas.width;
        const h = canvas.height;
        const toY = (v: number) => h - ((v - yRange[0]) / (yRange[1] - yRange[0])) * h;

        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= 6; i++) {
            const x = (i / 6) * w;
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let i = 0; i <= 4; i++) {
            const y = (i / 4) * h;
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }

        // 전체 곡선 (반투명)
        ctx.strokeStyle = `${color}44`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        data.forEach((y, i) => {
            const px = (i / (data.length - 1)) * w;
            const py = toY(y);
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        });
        ctx.stroke();

        // 현재 시각까지 (진한 색)
        const fillIdx = t * (data.length - 1);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let i = 0; i <= Math.floor(fillIdx); i++) {
            const px = (i / (data.length - 1)) * w;
            const py = toY(data[i]);
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.lineTo(t * w, toY(current));
        ctx.stroke();

        // 현재 위치 마커
        const mx = t * w;
        const my = toY(current);
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(mx, my, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(mx, my, 3, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = color;
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(label, 4, 14);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`${current.toFixed(1)}${unit}`, w - 4, 14);
        ctx.textAlign = 'left';

        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '9px sans-serif';
        ctx.fillText(`${yRange[1]}`, 2, 26);
        ctx.fillText(`${yRange[0]}`, 2, h - 3);
    }, [t, data, label, color, yRange, unit, current]);

    return (
        <canvas
            ref={canvasRef}
            width={320}
            height={90}
            style={{ width: '100%', height: 90, borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)' }}
        />
    );
}

export default function DailyShadowLab() {
    const month = useSeasonStore((s) => s.month);
    const setMonth = useSeasonStore((s) => s.setMonth);

    const decl = declination(month);
    const { sunrise, sunset, dayLength } = sunTimes(KOREA_LAT, decl);

    const [hour, setHour] = useState(12);
    const [playing, setPlaying] = useState(false);

    // 계절이 바뀌면 일출~일몰 범위가 달라진다. 남중으로 리셋(렌더 중 조정 패턴).
    const [prevMonth, setPrevMonth] = useState(month);
    if (prevMonth !== month) {
        setPrevMonth(month);
        setHour(12);
        setPlaying(false);
    }

    // ▶ 재생: 일출->일몰 12초
    useEffect(() => {
        if (!playing) return;
        const span = sunset - sunrise;
        let raf = 0;
        let prev = 0;
        const step = (ts: number) => {
            if (prev) {
                const d = ((ts - prev) / 1000) * (span / 12);
                setHour((h) => {
                    if (h + d >= sunset) { setPlaying(false); return sunset; }
                    return h + d;
                });
            }
            prev = ts;
            raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, [playing, sunrise, sunset]);

    const alt = sunAltitude(KOREA_LAT, decl, hourAngle(hour));
    const sun = project(month, hour);
    const meridian = project(month, 12);
    const night = alt <= 0;

    const shadowM = shadowLength(1, alt);
    const rawShadowPx = shadowM * STICK_PX;
    const shadowPx = Math.min(rawShadowPx, SHADOW_MAX_PX);
    const shadowClamped = !(rawShadowPx <= SHADOW_MAX_PX);
    const shadowDir = sun.x < CX ? 1 : -1;
    const shadowEnd = CX + shadowDir * shadowPx;

    const currentArc = useMemo(() => arcPath(month), [month]);

    // 일출~일몰 60점 샘플. 그래프 두 개가 같은 표본을 쓴다.
    const series = useMemo(() => sampleDay(month), [month]);

    const t = sunset > sunrise ? Math.max(0, Math.min(1, (hour - sunrise) / (sunset - sunrise))) : 0;
    const isNoon = Math.abs(hour - 12) < 0.06;

    // 고도각 호: 지평선 -> 태양 시선
    const sight = Math.atan2(HORIZON_Y - sun.y, sun.x - CX);
    const rightSide = sun.x >= CX;
    const arcStart = rightSide ? 0 : Math.PI;
    const arcSweep = rightSide ? 0 : 1;
    const arcMid = (arcStart + sight) / 2;
    const polar = (r: number, a: number) => `${(CX + r * Math.cos(a)).toFixed(1)} ${(HORIZON_Y - r * Math.sin(a)).toFixed(1)}`;

    const sky = skyColor(alt);

    return (
        <SimLayout>
            <SimStage>
                <svg viewBox="0 0 1000 560" preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%' }}>
                    <defs>
                        <linearGradient id="dsl-sky" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={hex(sky, 0.45)} />
                            <stop offset="70%" stopColor={hex(sky, 0.85)} />
                            <stop offset="100%" stopColor={hex(sky, 1.15)} />
                        </linearGradient>
                        <linearGradient id="dsl-ground" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#334155" />
                            <stop offset="100%" stopColor="#0f172a" />
                        </linearGradient>
                        <radialGradient id="dsl-glow">
                            <stop offset="0%" stopColor="#fff7d6" stopOpacity="0.9" />
                            <stop offset="30%" stopColor="#fde68a" stopOpacity="0.45" />
                            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
                        </radialGradient>
                        <radialGradient id="dsl-sun" cx="0.4" cy="0.4" r="0.7">
                            <stop offset="0%" stopColor="#fffbea" />
                            <stop offset="100%" stopColor="#fbbf24" />
                        </radialGradient>
                        <radialGradient id="dsl-horizon" cx="0.5" cy="1" r="0.6">
                            <stop offset="0%" stopColor="#fdba74" stopOpacity={alt < 15 && alt > -8 ? 0.45 : 0} />
                            <stop offset="100%" stopColor="#fdba74" stopOpacity="0" />
                        </radialGradient>
                        <linearGradient id="dsl-shadow" x1={shadowDir > 0 ? 0 : 1} y1="0" x2={shadowDir > 0 ? 1 : 0} y2="0">
                            <stop offset="0%" stopColor="#020617" stopOpacity="0.75" />
                            <stop offset="100%" stopColor="#020617" stopOpacity="0.05" />
                        </linearGradient>
                        <linearGradient id="dsl-stick" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#f8fafc" />
                            <stop offset="100%" stopColor="#94a3b8" />
                        </linearGradient>
                        <clipPath id="dsl-skyclip"><rect x="0" y="0" width="1000" height={HORIZON_Y} /></clipPath>
                    </defs>

                    {/* 하늘·땅 */}
                    <rect x="0" y="0" width="1000" height={HORIZON_Y} fill="url(#dsl-sky)" />
                    <rect x="0" y={HORIZON_Y - 140} width="1000" height="140" fill="url(#dsl-horizon)" />
                    {night && [80, 210, 330, 470, 610, 760, 900, 150, 540, 840].map((sx, i) => (
                        <circle key={i} cx={sx} cy={40 + ((i * 97) % 300)} r={i % 3 === 0 ? 1.8 : 1.1} fill="#e2e8f0" opacity={0.55} />
                    ))}
                    <rect x="0" y={HORIZON_Y} width="1000" height={560 - HORIZON_Y} fill="url(#dsl-ground)" />
                    <line x1="0" y1={HORIZON_Y} x2="1000" y2={HORIZON_Y} stroke="#cbd5e1" strokeWidth="1.5" opacity="0.7" />

                    {/* 하지·동지 고스트 호 */}
                    <g clipPath="url(#dsl-skyclip)">
                        <path d={GHOST_SUMMER} fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="5 7" opacity="0.5" />
                        <path d={GHOST_WINTER} fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeDasharray="5 7" opacity="0.5" />
                        {/* 현재 달의 태양 궤적 (글로우 + 본선) */}
                        <path d={currentArc} fill="none" stroke="#fbbf24" strokeWidth="9" opacity="0.16" strokeLinecap="round" />
                        <path d={currentArc} fill="none" stroke="#fbbf24" strokeWidth="2.5" opacity="0.95" strokeLinecap="round" />
                    </g>
                    <SvgPill x={GHOST_SUMMER_LABEL.x + 14} y={GHOST_SUMMER_LABEL.y - 16} text="하지 6월" tone="summer" anchor="start" size={13} />
                    <SvgPill x={GHOST_WINTER_LABEL.x + 14} y={GHOST_WINTER_LABEL.y - 16} text="동지 12월" tone="winter" anchor="start" size={13} />

                    {/* 정남 남중 표시 */}
                    <line x1={CX} y1={HORIZON_Y} x2={CX} y2={meridian.y} stroke="#fde68a" strokeWidth="1.2" strokeDasharray="3 7" opacity="0.5" />

                    {/* 고도각: 부채꼴 + 호 + 시선 */}
                    {!night && (
                        <>
                            <path d={`M${CX} ${HORIZON_Y} L${polar(ALT_ARC_R, arcStart)} A${ALT_ARC_R} ${ALT_ARC_R} 0 0 ${arcSweep} ${polar(ALT_ARC_R, sight)} Z`}
                                fill="#fbbf24" opacity="0.12" />
                            <path d={`M${polar(ALT_ARC_R, arcStart)} A${ALT_ARC_R} ${ALT_ARC_R} 0 0 ${arcSweep} ${polar(ALT_ARC_R, sight)}`}
                                fill="none" stroke="#fbbf24" strokeWidth="2" />
                            <line x1={CX} y1={HORIZON_Y} x2={sun.x} y2={sun.y} stroke="#fde68a" strokeWidth="1.2" strokeDasharray="3 6" opacity="0.6" />
                            <SvgPill x={CX + (ALT_ARC_R + 52) * Math.cos(arcMid)} y={HORIZON_Y - (ALT_ARC_R + 52) * Math.sin(arcMid)}
                                text={`${isNoon ? '남중 고도' : '고도'} ${alt.toFixed(0)}°`} tone="sun" size={15} />
                        </>
                    )}

                    {/* 그림자: 끝으로 갈수록 옅어지는 띠 */}
                    {!night && (
                        <>
                            <polygon points={`${CX},${HORIZON_Y + 1} ${shadowEnd},${HORIZON_Y + 1} ${shadowEnd},${HORIZON_Y + 9} ${CX},${HORIZON_Y + 13}`}
                                fill="url(#dsl-shadow)" />
                            {shadowClamped && (
                                <text x={shadowEnd + shadowDir * 14} y={HORIZON_Y + 12} fontSize="20" fill="#cbd5e1"
                                    textAnchor={shadowDir > 0 ? 'start' : 'end'}>…</text>
                            )}
                            <SvgPill x={(CX + shadowEnd) / 2} y={HORIZON_Y + 34} text={`그림자 ${shadowM.toFixed(2)} m`} size={13} />
                        </>
                    )}

                    {/* 1 m 막대 */}
                    <ellipse cx={CX} cy={HORIZON_Y + 1} rx="9" ry="3" fill="#0f172a" opacity="0.6" />
                    <rect x={CX - 4} y={HORIZON_Y - STICK_PX} width="8" height={STICK_PX} fill="url(#dsl-stick)" rx="4" />
                    <SvgPill x={CX - 16} y={HORIZON_Y - STICK_PX + 12} text="막대 1 m" anchor="end" size={13} />

                    {/* 태양 */}
                    {!night && (
                        <>
                            <circle cx={sun.x} cy={sun.y} r="78" fill="url(#dsl-glow)" />
                            <circle cx={sun.x} cy={sun.y} r="21" fill="url(#dsl-sun)" />
                            <SvgPill x={sun.x} y={sun.y - 42} text={formatHour(hour)} tone="sun" size={15} />
                        </>
                    )}

                    {/* 방위 */}
                    <SvgPill x={22} y={HORIZON_Y + 28} text="동 E" anchor="start" />
                    <SvgPill x={978} y={HORIZON_Y + 28} text="서 W" anchor="end" />
                    <SvgPill x={CX} y={530} text="남 S · 관측자가 보는 방향" />
                </svg>

                <SimHud items={[
                    { label: '태양 고도', value: `${alt.toFixed(1)}°`, color: 'var(--accent-sun)' },
                    { label: '그림자 길이', value: night ? '—' : `${shadowM.toFixed(2)} m`, color: 'var(--text-accent)' },
                    { label: '시각', value: formatHour(hour) },
                ]} />
            </SimStage>

            <SimInspector
                title={<><Sun size={18} /> 하루 동안 태양 고도와 그림자</>}
                sections={[
                    {
                        id: 'desc', label: '설명', content: (
                            <>
                                <div className="insp-key">
                                    <Lightbulb size={18} />
                                    <span>태양이 높이 뜰수록 그림자는 짧아집니다.</span>
                                </div>
                                <StatRow label="남중 고도" value={`${meridianAltitude(KOREA_LAT, decl).toFixed(1)}°`} />
                                <StatRow label="낮 길이" value={`${dayLength.toFixed(1)}시간`} />
                                <StatRow label="일출" value={formatHour(sunrise)} />
                                <StatRow label="일몰" value={formatHour(sunset)} />
                                <div className="insp-note">
                                    태양이 정남쪽에 오는 때를 남중이라고 합니다. 남중일 때 고도가 가장 높고 그림자가 가장 짧습니다.
                                    같은 남중이라도 여름은 높고 겨울은 낮습니다. 아래 프리셋으로 계절을 바꿔
                                    회색 점선(하지·동지) 궤적과 비교해 보세요.
                                </div>
                            </>
                        ),
                    },
                    {
                        id: 'graph', label: '그래프', content: (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <AutoGraph t={t} data={series.altitude} label="태양 고도 (°)" color="#fbbf24"
                                    yRange={[0, 80]} unit="°" current={Math.max(0, alt)} />
                                <AutoGraph t={t} data={series.shadow} label="그림자 길이 (m)" color="#818cf8"
                                    yRange={[0, 6]} unit="m" current={Math.min(shadowM, 6)} />
                            </div>
                        ),
                    },
                ]}
            />

            <SimDock
                play={{
                    playing,
                    onToggle: () => {
                        if (!playing && hour >= sunset - 0.02) setHour(sunrise);
                        setPlaying(!playing);
                    },
                }}
                slider={{
                    label: '시각',
                    min: sunrise, max: sunset, step: 0.05, value: hour,
                    onChange: (v) => { setHour(v); setPlaying(false); },
                    display: formatHour(hour),
                    ticks: [`일출 ${formatHour(sunrise)}`, '남중 12:00', `일몰 ${formatHour(sunset)}`],
                }}
                presets={[
                    { label: '춘분 3월', onClick: () => setMonth(3), active: Math.round(month) === 3 },
                    { label: '하지 6월', onClick: () => setMonth(6), active: Math.round(month) === 6 },
                    { label: '동지 12월', onClick: () => setMonth(12), active: Math.round(month) === 12 },
                ]}
            />
        </SimLayout>
    );
}
