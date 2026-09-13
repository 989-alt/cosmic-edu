import { useState } from 'react';
import { degToRad } from '../../utils/mathUtils';
import {
    KOREA_LAT, declination, meridianAltitude, energyDensity, irradiatedArea,
} from '../../utils/solar';
import { useSeasonStore } from '../../store/seasonStore';
import { SimLayout, SimStage, SimHud, SimDock, SimInspector, StatRow } from '../../components/SimLayout';

/**
 * 에너지 밀도 — 2D SVG "손전등 비유" 측면 도해.
 * 폭이 고정된 평행 광선 다발이 고도각 θ 로 바닥에 닿으면 조사 구간이 1/sin(θ) 로 늘어난다.
 * 물리량(밀도·퍼짐 배율·남중 고도)은 전부 solar.ts 에서 받고, 여기서는 좌표만 만든다.
 */

/* 도해 좌표 (viewBox 1000×560) */
const VIEW_W = 1000;
const GROUND_Y = 430;      // 지평선
const CENTER_X = 500;      // 다발 중심선이 바닥과 만나는 점
const BEAM_W = 160;        // 광선 다발 폭(고정). 이 폭을 100 cm 로 환산해 표기한다.
const RAY_COUNT = 8;
const MAX_BAND = 900;      // 조사 구간 표시 최대 폭
const SUN_R = 30;
const SUN_DIST = 480;

/** 바닥 조사 구간 색: 밀도 1 = 빨강(집중), 0 = 파랑(분산). */
function heatColor(density: number): string {
    const t = Math.max(0, Math.min(1, density));
    const mix = (a: number, b: number) => Math.round(a + (b - a) * t).toString(16).padStart(2, '0');
    return `#${mix(0x3b, 0xef)}${mix(0x82, 0x44)}${mix(0xf6, 0x44)}`;
}

/**
 * 바닥 (gx, gy) 에 닿는 광선이 상자 밖(left/top)으로 나가는 시작점.
 * 광선 진행 방향은 (cos θ, sin θ) — 화면 좌표라 y 는 아래가 양수다.
 */
function rayStart(gx: number, gy: number, rad: number, left: number, top: number) {
    const c = Math.cos(rad), s = Math.sin(rad);
    let k = (gy - top) / s;
    if (c > 1e-6) k = Math.min(k, (gx - left) / c);
    return { x: gx - k * c, y: gy - k * s };
}

/** 광선 끝 화살촉. */
function arrowHead(gx: number, gy: number, rad: number, size: number): string {
    const c = Math.cos(rad), s = Math.sin(rad);
    const bx = gx - size * c, by = gy - size * s;
    const w = size * 0.36;
    return `${gx},${gy} ${bx - w * -s},${by - w * c} ${bx + w * -s},${by + w * c}`;
}

function getSeasonLabel(altitude: number): { label: string; emoji: string; color: string } {
    if (altitude >= 70) return { label: '여름 (하지 전후)', emoji: '☀️', color: '#ef4444' };
    if (altitude >= 55) return { label: '봄/가을', emoji: '🌤️', color: '#fbbf24' };
    if (altitude >= 40) return { label: '초겨울/늦겨울', emoji: '🌥️', color: '#60a5fa' };
    return { label: '겨울 (동지 전후)', emoji: '❄️', color: '#3b82f6' };
}

/** 우상단 비교 미니 도해 하나 (180×120 로컬 좌표). */
function MiniSpread({ x, y, altitude, caption }: { x: number; y: number; altitude: number; caption: string }) {
    const rad = degToRad(altitude);
    const sin = Math.sin(rad);
    const w = 34;
    const band = Math.min(w / sin, 170);
    const gy = 88;
    const color = heatColor(energyDensity(altitude));

    return (
        <g transform={`translate(${x}, ${y})`}>
            <rect x={0} y={0} width={180} height={120} rx={8} fill="#0f172a" stroke="#334155" />
            <g clipPath="url(#mini-clip)">
                {[-w / 2, 0, w / 2].map((s, i) => {
                    const gx = 90 - s / sin;
                    const st = rayStart(gx, gy, rad, 2, 2);
                    return <line key={i} x1={st.x} y1={st.y} x2={gx} y2={gy} stroke="#fbbf24" strokeWidth={2} opacity={0.8} />;
                })}
                <line x1={4} y1={gy} x2={176} y2={gy} stroke="#78716c" strokeWidth={2} />
                <rect x={90 - band / 2} y={gy - 3} width={band} height={7} rx={3} fill={color} />
            </g>
            <text x={90} y={110} fontSize={14} fill="#e2e8f0" textAnchor="middle">{caption}</text>
        </g>
    );
}

export default function EnergyDensity() {
    const month = useSeasonStore((s) => s.month);
    const setMonth = useSeasonStore((s) => s.setMonth);
    const [altitude, setAltitude] = useState(() => meridianAltitude(KOREA_LAT, declination(month)));

    const rad = degToRad(altitude);
    const sin = Math.sin(rad), cos = Math.cos(rad);
    const density = energyDensity(altitude);
    const area = irradiatedArea(altitude);
    const season = getSeasonLabel(altitude);
    const color = heatColor(density);
    const disp = Math.round(altitude * 10) / 10;

    /* 태양: 다발이 오는 방향(좌상)으로 SUN_DIST 만큼. 화면 밖으로 나가지 않게 거리를 줄인다. */
    const sunDist = Math.min(SUN_DIST, (GROUND_Y - 150) / sin, cos > 1e-6 ? (CENTER_X - 50) / cos : Infinity);
    const sunX = CENTER_X - sunDist * cos;
    const sunY = GROUND_Y - sunDist * sin;

    /* 조사 구간: 실제 길이는 BEAM_W/sin, 표시는 MAX_BAND 로 클램프 */
    const bandFull = BEAM_W * area;
    const band = Math.min(bandFull, MAX_BAND);
    const clamped = bandFull > MAX_BAND;
    const bandL = CENTER_X - band / 2, bandR = CENTER_X + band / 2;
    const cm = Math.round(area * 100);

    /* 고도각 호: 바닥 중심에서 지평선(좌) → 광선이 오는 방향 */
    const ARC_R = 90;
    const arcPath = `M ${CENTER_X - ARC_R} ${GROUND_Y} A ${ARC_R} ${ARC_R} 0 0 1 ${CENTER_X - ARC_R * cos} ${GROUND_Y - ARC_R * sin}`;
    const labRad = degToRad(180 + altitude / 2);
    const labX = CENTER_X + 128 * Math.cos(labRad), labY = GROUND_Y + 128 * Math.sin(labRad);

    const presets = [
        { label: '동지 29.6°', month: 12 },
        { label: '춘·추분 53°', month: 3 },
        { label: '하지 76.4°', month: 6 },
    ];
    const isActive = (m: number) => Math.abs(altitude - meridianAltitude(KOREA_LAT, declination(m))) <= 0.5;

    const rows = [
        { name: '하지 (6월)', month: 6 },
        { name: '춘·추분 (3·9월)', month: 3 },
        { name: '동지 (12월)', month: 12 },
    ];

    return (
        <SimLayout>
            <SimStage>
                <svg viewBox={`0 0 ${VIEW_W} 560`} preserveAspectRatio="xMidYMid meet">
                    <defs>
                        <clipPath id="mini-clip"><rect x={0} y={0} width={180} height={120} rx={8} /></clipPath>
                    </defs>

                    {/* 하늘 / 땅 */}
                    <rect x={0} y={0} width={VIEW_W} height={GROUND_Y} fill="#0a0e1a" />
                    <rect x={0} y={GROUND_Y} width={VIEW_W} height={560 - GROUND_Y} fill="#4a3524" />
                    <line x1={0} y1={GROUND_Y} x2={VIEW_W} y2={GROUND_Y} stroke="#a8a29e" strokeWidth={3} />

                    {/* 태양 */}
                    <circle cx={sunX} cy={sunY} r={SUN_R} fill="#fbbf24" />
                    <circle cx={sunX} cy={sunY} r={SUN_R + 10} fill="#fbbf24" opacity={0.2} />

                    {/* 평행 광선 다발 8줄 (폭 고정 BEAM_W) */}
                    {Array.from({ length: RAY_COUNT }, (_, i) => {
                        const s = -BEAM_W / 2 + (i * BEAM_W) / (RAY_COUNT - 1);
                        const gx = CENTER_X - s / sin;
                        const st = rayStart(gx, GROUND_Y, rad, -60, -60);
                        return (
                            <g key={i}>
                                <line x1={st.x} y1={st.y} x2={gx} y2={GROUND_Y} stroke="#fbbf24" strokeWidth={3} opacity={0.85} />
                                <polygon points={arrowHead(gx, GROUND_Y, rad, 16)} fill="#fbbf24" />
                            </g>
                        );
                    })}

                    {/* 바닥 조사 구간 */}
                    <rect x={bandL} y={GROUND_Y - 7} width={band} height={14} rx={7} fill={color} />
                    <line x1={bandL} y1={GROUND_Y - 16} x2={bandL} y2={475} stroke="#fde68a" strokeWidth={2} />
                    <line x1={bandR} y1={GROUND_Y - 16} x2={bandR} y2={475} stroke="#fde68a" strokeWidth={2} />
                    <line x1={bandL} y1={470} x2={bandR} y2={470} stroke="#fde68a" strokeWidth={2} />
                    {clamped && (
                        <>
                            <text x={bandL - 18} y={476} fontSize={20} fill="#fde68a" textAnchor="middle">…</text>
                            <text x={bandR + 18} y={476} fontSize={20} fill="#fde68a" textAnchor="middle">…</text>
                        </>
                    )}
                    <text x={CENTER_X} y={502} fontSize={20} fill="#fde68a" textAnchor="middle">{cm} cm</text>
                    <text x={CENTER_X} y={528} fontSize={14} fill="#d6d3d1" textAnchor="middle">
                        빛다발 폭 100 cm 가 바닥에서 {cm} cm 로 퍼진다
                    </text>

                    {/* 고도각 호 */}
                    <path d={arcPath} fill="none" stroke="#67e8f9" strokeWidth={2} />
                    <text x={labX} y={labY} fontSize={18} fill="#67e8f9" textAnchor="middle">고도 {disp}°</text>

                    {/* 우상단 비교 미니 도해 */}
                    <MiniSpread x={612} y={16} altitude={76.4} caption="여름 76°" />
                    <MiniSpread x={804} y={16} altitude={30} caption="겨울 30°" />
                </svg>

                <SimHud items={[
                    { label: '태양 고도', value: `${disp}°`, color: '#fbbf24' },
                    { label: '조사 면적 배율', value: `${area.toFixed(1)}배`, color: '#818cf8' },
                    { label: '에너지 밀도', value: `${Math.round(density * 100)}%`, color },
                    { label: '계절', value: `${season.emoji} ${season.label}`, color: season.color },
                ]} />
            </SimStage>

            <SimInspector
                title="🔥 태양 고도와 에너지 밀도"
                sections={[
                    {
                        id: 'explain', label: '설명', content: (
                            <>
                                <p style={{ marginTop: 0, marginBottom: 12 }}>
                                    손전등을 바닥에 똑바로 비추면 빛이 좁고 밝게 모이지만(여름), 비스듬히 비추면
                                    같은 양의 빛이 넓게 퍼져 흐려집니다(겨울). 태양도 똑같습니다 — 빛의 양은 그대로인데
                                    고도가 낮을수록 바닥의 더 넓은 면적에 나뉘어 담기므로 단위면적당 에너지가 줄어듭니다.
                                </p>
                                <StatRow label="빛이 퍼지는 정도" value={`${area.toFixed(1)}배`} />
                                <StatRow label="바닥 에너지 밀도" value={`${Math.round(density * 100)}%`} />
                                <div style={{ marginTop: 12, borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 'bold', marginBottom: 8 }}>🎨 바닥 색 범례</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                        <span style={{ width: 14, height: 14, borderRadius: 3, background: '#ef4444' }} />
                                        <span style={{ fontSize: '0.75rem' }}>빨강 = 에너지 집중 (고도 높음)</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ width: 14, height: 14, borderRadius: 3, background: '#3b82f6' }} />
                                        <span style={{ fontSize: '0.75rem' }}>파랑 = 에너지 분산 (고도 낮음)</span>
                                    </div>
                                </div>
                            </>
                        ),
                    },
                    {
                        id: 'compare', label: '비교', content: (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                                <thead>
                                    <tr style={{ color: 'var(--text-muted)' }}>
                                        <th style={{ textAlign: 'left', padding: '6px 4px' }}>계절</th>
                                        <th style={{ textAlign: 'right', padding: '6px 4px' }}>남중 고도</th>
                                        <th style={{ textAlign: 'right', padding: '6px 4px' }}>퍼짐 배율</th>
                                        <th style={{ textAlign: 'right', padding: '6px 4px' }}>밀도</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((r) => {
                                        const alt = meridianAltitude(KOREA_LAT, declination(r.month));
                                        const on = isActive(r.month);
                                        return (
                                            <tr key={r.month} style={{
                                                borderTop: '1px solid var(--border-subtle)',
                                                background: on ? 'rgba(99, 102, 241, 0.22)' : undefined,
                                                color: on ? 'var(--text-primary)' : undefined,
                                                fontWeight: on ? 700 : undefined,
                                            }}>
                                                <td style={{ padding: '6px 4px' }}>{r.name}</td>
                                                <td style={{ textAlign: 'right', padding: '6px 4px', fontFamily: 'var(--font-mono)' }}>{alt.toFixed(1)}°</td>
                                                <td style={{ textAlign: 'right', padding: '6px 4px', fontFamily: 'var(--font-mono)' }}>{irradiatedArea(alt).toFixed(1)}배</td>
                                                <td style={{ textAlign: 'right', padding: '6px 4px', fontFamily: 'var(--font-mono)' }}>{Math.round(energyDensity(alt) * 100)}%</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        ),
                    },
                ]}
            />

            <SimDock
                slider={{
                    label: '태양 고도', min: 5, max: 90, step: 1, value: altitude,
                    onChange: setAltitude, display: `${disp}°`,
                    ticks: ['5° 낮음', '45°', '90° 머리 위'],
                }}
                presets={presets.map((p) => ({
                    label: p.label,
                    active: isActive(p.month),
                    onClick: () => {
                        setMonth(p.month);
                        setAltitude(meridianAltitude(KOREA_LAT, declination(p.month)));
                    },
                }))}
            />
        </SimLayout>
    );
}
