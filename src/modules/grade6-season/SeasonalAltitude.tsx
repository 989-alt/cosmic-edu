import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html, Line } from '@react-three/drei';
import { useMemo, useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import {
    Flower2, Sun, Leaf, Snowflake, Sunrise, Sunset, Lightbulb, HelpCircle, type LucideIcon,
} from 'lucide-react';
import { degToRad } from '../../utils/mathUtils';
import {
    KOREA_LAT, declination, meridianAltitude, sunAltitude, sunAzimuth, sunTimes, hourAngle, formatHour,
} from '../../utils/solar';
import { useSeasonStore } from '../../store/seasonStore';
import { SimLayout, SimStage, SimHud, SimDock, SimInspector, StatRow } from '../../components/SimLayout';

/**
 * 계절별 남중 고도 — 관측자 시점 3D 하나.
 * 좌표: 관측자 원점, +x=서, −x=동, −z=남(카메라가 보는 방향), +y=위.
 * 모든 각은 solar.ts 공식에서 받는다(데이터 테이블 없음).
 */

const D = 14; // 천구 반지름 (카메라 프레임 안에 호 전체가 들어오는 크기)
const LABEL_Z = [5, 0] as [number, number];
const WEDGE_R = 5; // 남중 고도 각도 쐐기 반지름

function sunPoint(decl: number, hour: number): THREE.Vector3 {
    const H = hourAngle(hour);
    const alt = degToRad(sunAltitude(KOREA_LAT, decl, H));
    const az = degToRad(sunAzimuth(KOREA_LAT, decl, H));
    return new THREE.Vector3(
        D * Math.cos(alt) * Math.sin(az),
        D * Math.sin(alt),
        -D * Math.cos(alt) * Math.cos(az),
    );
}

/** 일출~일몰 60점 호. 남쪽으로 기울어지고 여름 일출점은 정동보다 북쪽에 찍힌다. */
function arcPoints(month: number): THREE.Vector3[] {
    const decl = declination(month);
    const { sunrise, sunset } = sunTimes(KOREA_LAT, decl);
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 60; i++) pts.push(sunPoint(decl, sunrise + ((sunset - sunrise) * i) / 60));
    return pts;
}

function seasonOf(month: number): { name: string; Icon: LucideIcon; color: string } {
    const m = Math.round(month);
    if (m >= 3 && m <= 5) return { name: '봄', Icon: Flower2, color: 'var(--season-spring)' };
    if (m >= 6 && m <= 8) return { name: '여름', Icon: Sun, color: 'var(--season-summer)' };
    if (m >= 9 && m <= 11) return { name: '가을', Icon: Leaf, color: 'var(--season-autumn)' };
    return { name: '겨울', Icon: Snowflake, color: 'var(--season-winter)' };
}

/** 위(천정) -> 아래(지평선) 세로 그라데이션. 하늘 돔 전용. */
function makeSkyTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#0b1226');
    g.addColorStop(0.78, '#1e2a4a');
    g.addColorStop(0.94, '#3b3a5e');
    g.addColorStop(1, '#3b3a5e');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 256);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

/** 중심 -> 가장자리 방사형 그라데이션. 가장자리에서 투명해져 하늘에 녹아든다. */
function makeGroundTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(51, 65, 85, 1)');
    g.addColorStop(0.55, 'rgba(32, 45, 68, 0.86)');
    g.addColorStop(1, 'rgba(15, 23, 42, 0.6)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

/** 태양 발광 스프라이트용 방사형 그라데이션. */
function makeGlowTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(253, 230, 138, 0.9)');
    g.addColorStop(0.35, 'rgba(251, 191, 36, 0.4)');
    g.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

/** 관측자를 감싸는 반구 하늘 (낮 장면이라 별은 없음) */
function SkyDome() {
    const map = useMemo(() => makeSkyTexture(), []);
    return (
        <mesh>
            <sphereGeometry args={[60, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshBasicMaterial map={map} side={THREE.BackSide} depthWrite={false} />
        </mesh>
    );
}

function Ground() {
    const map = useMemo(() => makeGroundTexture(), []);
    return (
        <group>
            <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[20, 96]} />
                <meshBasicMaterial map={map} transparent depthWrite={false} />
            </mesh>

            {/* 거리 눈금 동심원 */}
            {[5, 10, 15].map((r) => (
                <mesh key={r} position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[r - 0.04, r + 0.04, 96]} />
                    <meshBasicMaterial color="#94a3b8" transparent opacity={0.18} depthWrite={false} />
                </mesh>
            ))}

            {/* 남북·동서 십자선 */}
            <Line points={[[0, 0.01, -20], [0, 0.01, 20]]} color="#94a3b8" lineWidth={1} transparent opacity={0.25} />
            <Line points={[[-20, 0.01, 0], [20, 0.01, 0]]} color="#94a3b8" lineWidth={1} transparent opacity={0.25} />

            {/* 지평선 링 */}
            <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[19.88, 20, 96]} />
                <meshBasicMaterial color="#cbd5e1" opacity={0.5} transparent />
            </mesh>

            {/* 관측자 막대 */}
            <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.6, 32]} />
                <meshBasicMaterial color="#1e293b" />
            </mesh>
            <mesh position={[0, 0.5, 0]}>
                <cylinderGeometry args={[0.12, 0.12, 1, 12]} />
                <meshStandardMaterial color="#e2e8f0" />
            </mesh>
            <mesh position={[0, 1.2, 0]}>
                <sphereGeometry args={[0.22, 16, 16]} />
                <meshStandardMaterial color="#e2e8f0" />
            </mesh>
            <Html position={[0, 2, 0]} center zIndexRange={LABEL_Z}>
                <div className="stage-label muted">관측자 (위도 37°N)</div>
            </Html>

            {([
                ['동', -19, 0, 0],
                ['서', 19, 0, 0],
                ['남', 0, 0, -19],
                ['북', 0, 0, 19],
            ] as const).map(([label, x, y, z]) => (
                <Html key={label} position={[x, y + 0.6, z]} center zIndexRange={LABEL_Z}>
                    <div className="stage-label muted">{label}</div>
                </Html>
            ))}
        </group>
    );
}

/** 원점 -> 남중 태양 선 + 지평선(−z)과의 각도 호 + 라벨 */
function MeridianAngle({ decl }: { decl: number }) {
    const alt = meridianAltitude(KOREA_LAT, decl);
    const altRad = degToRad(alt);
    const tip = new THREE.Vector3(0, D * Math.sin(altRad), -D * Math.cos(altRad));

    const wedge: THREE.Vector3[] = [];
    for (let i = 0; i <= 32; i++) {
        const θ = (altRad * i) / 32;
        wedge.push(new THREE.Vector3(0, WEDGE_R * Math.sin(θ), -WEDGE_R * Math.cos(θ)));
    }

    // 쐐기 안쪽을 채우는 반투명 부채꼴. shape 로컬 (x,y) -> 월드 (0, y, −x).
    const fan = new THREE.Shape();
    fan.moveTo(0, 0);
    fan.absarc(0, 0, WEDGE_R, 0, altRad, false);
    fan.lineTo(0, 0);

    return (
        <group>
            <mesh rotation={[0, Math.PI / 2, 0]}>
                <shapeGeometry args={[fan]} />
                <meshBasicMaterial color="#fbbf24" transparent opacity={0.12} side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
            <Line points={[new THREE.Vector3(0, 0, 0), tip]} color="#fde68a" lineWidth={1} transparent opacity={0.7} dashed dashSize={0.5} gapSize={0.35} />
            <Line points={[new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -D)]} color="#94a3b8" lineWidth={1} transparent opacity={0.35} dashed dashSize={0.5} gapSize={0.4} />
            <Line points={wedge} color="#fbbf24" lineWidth={2} />
            <Html
                position={[0, (WEDGE_R + 1.6) * Math.sin(altRad / 2) + 0.5, -(WEDGE_R + 1.6) * Math.cos(altRad / 2)]}
                center zIndexRange={LABEL_Z}
            >
                <div className="stage-label sun strong">남중 고도 {alt.toFixed(1)}°</div>
            </Html>
        </group>
    );
}

function SunArc({ month, animHour }: { month: number; animHour: number }) {
    const decl = declination(month);
    const pts = useMemo(() => arcPoints(month), [month]);
    const summer = useMemo(() => arcPoints(6), []);
    const winter = useMemo(() => arcPoints(12), []);

    const rise = pts[0];
    const set = pts[pts.length - 1];
    const { sunrise, sunset } = sunTimes(KOREA_LAT, decl);
    const sun = animHour >= 0 ? sunPoint(decl, animHour) : sunPoint(decl, 12);
    const glow = useMemo(() => makeGlowTexture(), []);

    return (
        <group>
            {/* 고스트 호: 하지(붉은) · 동지(푸른) */}
            <Line points={summer} color="#ef4444" lineWidth={1.2} opacity={0.45} transparent dashed dashSize={0.6} gapSize={0.4} />
            <Line points={winter} color="#60a5fa" lineWidth={1.2} opacity={0.45} transparent dashed dashSize={0.6} gapSize={0.4} />
            <Html position={[summer[10].x, summer[10].y + 0.8, summer[10].z]} center zIndexRange={LABEL_Z}>
                <div className="stage-label muted">하지 호</div>
            </Html>
            <Html position={[winter[10].x, winter[10].y + 0.8, winter[10].z]} center zIndexRange={LABEL_Z}>
                <div className="stage-label muted">동지 호</div>
            </Html>

            {/* 현재 월 호 + 글로우 겹침 */}
            <Line points={pts} color="#fbbf24" lineWidth={6} transparent opacity={0.18} />
            <Line points={pts} color="#fbbf24" lineWidth={2} />

            <mesh position={sun}>
                <sphereGeometry args={[0.9, 24, 24]} />
                <meshBasicMaterial color="#fde68a" />
            </mesh>
            <sprite position={sun} scale={[6, 6, 1]}>
                <spriteMaterial map={glow} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
            </sprite>
            <directionalLight position={sun} intensity={1.0} />

            {/* 일출 마커 */}
            <mesh position={[rise.x, 0.04, rise.z]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.45, 32]} />
                <meshBasicMaterial color="#fb923c" transparent opacity={0.9} />
            </mesh>
            <Line points={[[rise.x, 0.04, rise.z], [rise.x, 1.2, rise.z]]} color="#fb923c" lineWidth={1.2} transparent opacity={0.7} />
            <Html position={[rise.x, 1.9, rise.z]} center zIndexRange={LABEL_Z}>
                <div className="stage-label"><Sunrise size={12} /> 일출 {formatHour(sunrise)}</div>
            </Html>

            {/* 일몰 마커 */}
            <mesh position={[set.x, 0.04, set.z]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.45, 32]} />
                <meshBasicMaterial color="#f472b6" transparent opacity={0.9} />
            </mesh>
            <Line points={[[set.x, 0.04, set.z], [set.x, 1.2, set.z]]} color="#f472b6" lineWidth={1.2} transparent opacity={0.7} />
            <Html position={[set.x, 1.9, set.z]} center zIndexRange={LABEL_Z}>
                <div className="stage-label"><Sunset size={12} /> 일몰 {formatHour(sunset)}</div>
            </Html>

            <MeridianAngle decl={decl} />
        </group>
    );
}

function DayNightCircle({ dayLength }: { dayLength: number }) {
    const dayDeg = (dayLength / 24) * 360;
    return (
        <div style={{
            width: 90, height: 90, borderRadius: '50%', position: 'relative',
            background: `conic-gradient(var(--accent-sun) 0deg, var(--accent-sun) ${dayDeg}deg, var(--bg-raised) ${dayDeg}deg, var(--bg-raised) 360deg)`,
            border: '2px solid var(--border-subtle)',
        }}>
            <div style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                textAlign: 'center', fontSize: '0.55rem', color: 'white',
            }}>
                <div>낮 {dayLength.toFixed(1)}h</div>
                <div>밤 {(24 - dayLength).toFixed(1)}h</div>
            </div>
        </div>
    );
}

function MonthlyDayLength({ month, onPick }: { month: number; onPick: (m: number) => void }) {
    const rows = useMemo(
        () => Array.from({ length: 12 }, (_, i) => ({
            month: i + 1,
            dayLength: sunTimes(KOREA_LAT, declination(i + 1)).dayLength,
        })),
        [],
    );
    const current = rows[Math.round(month) - 1];

    return (
        <>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                <span>월별 낮 길이 (시간)</span>
                <span style={{ color: 'var(--accent-sun)', fontFamily: 'var(--font-mono)' }}>{current.dayLength.toFixed(1)}h</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 70 }}>
                {rows.map((m) => {
                    const height = Math.max(((m.dayLength - 8) / 8) * 60, 3);
                    const active = Math.round(month) === m.month;
                    return (
                        <div key={m.month}
                            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer' }}
                            onClick={() => onPick(m.month)}>
                            <div style={{
                                height, width: '100%', borderRadius: '2px 2px 0 0',
                                background: active ? 'var(--accent-sun)' : m.dayLength > 12 ? 'var(--season-autumn)' : 'var(--season-winter)',
                                opacity: active ? 1 : 0.4, transition: 'all 0.2s',
                            }} />
                            <span style={{
                                fontSize: '0.5rem', color: active ? 'var(--accent-sun)' : 'var(--text-muted)',
                                fontWeight: active ? 'bold' : 'normal',
                            }}>{m.month}</span>
                        </div>
                    );
                })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.5rem', color: 'var(--text-muted)', marginTop: 4 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Snowflake size={12} /> 짧은 낮</span>
                <span>12h (낮=밤)</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Sun size={12} /> 긴 낮</span>
            </div>
        </>
    );
}

const PRESETS = [
    { label: '춘분 3월', month: 3 },
    { label: '하지 6월', month: 6 },
    { label: '추분 9월', month: 9 },
    { label: '동지 12월', month: 12 },
];

export default function SeasonalAltitude() {
    const month = useSeasonStore((s) => s.month);
    const setMonth = useSeasonStore((s) => s.setMonth);

    const [isAnimating, setIsAnimating] = useState(false);
    const [animT, setAnimT] = useState(-1); // -1 = 정지, 0~1 = 일출->일몰 진행
    const rafRef = useRef<number>(0);
    const startRef = useRef<number>(0);

    const decl = declination(month);
    const alt = meridianAltitude(KOREA_LAT, decl);
    const { sunrise, sunset, dayLength } = sunTimes(KOREA_LAT, decl);
    const season = seasonOf(month);
    const animHour = animT >= 0 ? sunrise + animT * dayLength : -1;

    useEffect(() => {
        if (!isAnimating) return;
        const tick = (ts: number) => {
            const t = Math.min((ts - startRef.current) / 8000, 1);
            setAnimT(t);
            if (t >= 1) { setIsAnimating(false); return; }
            rafRef.current = requestAnimationFrame(tick);
        };
        startRef.current = performance.now();
        rafRef.current = requestAnimationFrame(tick);
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, [isAnimating]);

    // 월을 바꾸면 애니메이션 정지 (effect 대신 setter 에서 처리)
    const pickMonth = (m: number) => {
        setIsAnimating(false);
        setAnimT(-1);
        setMonth(m);
    };

    const hud = [
        { label: '남중 고도', value: `${alt.toFixed(1)}°`, color: 'var(--accent-sun)' },
        animHour >= 0
            ? { label: '현재 시각', value: formatHour(animHour), color: 'var(--accent-sun)' }
            : { label: '낮 길이', value: `${dayLength.toFixed(1)}h`, color: 'var(--season-autumn)' },
        { label: '일출', value: formatHour(sunrise), color: '#ff6b35' },
        { label: '일몰', value: formatHour(sunset), color: '#c44569' },
    ];

    return (
        <SimLayout>
            <SimStage>
                <SimHud items={hud} />
                <Canvas camera={{ position: [0, 8, 26], fov: 60 }} style={{ background: '#0a0e1a' }}>
                    <ambientLight intensity={0.5} />
                    <SkyDome />
                    <Ground />
                    <SunArc month={month} animHour={animHour} />
                    <OrbitControls
                        enablePan={false} target={[0, 6, -2]} minDistance={10} maxDistance={34}
                        minAzimuthAngle={-1.0} maxAzimuthAngle={1.0}
                        minPolarAngle={0.6} maxPolarAngle={1.45}
                    />
                </Canvas>
            </SimStage>

            <SimInspector
                title={<><season.Icon size={18} style={{ color: season.color }} /> {Math.round(month)}월 — {season.name}</>}
                sections={[
                    {
                        id: 'info', label: '설명', content: (
                            <>
                                <div className="insp-key">
                                    <Lightbulb size={18} />
                                    <span>남중 고도가 높은 계절일수록 낮이 깁니다.</span>
                                </div>
                                <StatRow label="남중 고도" value={`${alt.toFixed(1)}°`} />
                                <StatRow label="낮 길이" value={`${dayLength.toFixed(1)}시간`} />
                                <StatRow label="밤 길이" value={`${(24 - dayLength).toFixed(1)}시간`} />
                                <StatRow label="낮-밤 차이" value={`${Math.abs(2 * dayLength - 24).toFixed(1)}시간`} />

                                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
                                    <DayNightCircle dayLength={dayLength} />
                                </div>

                                <div className="insp-note">
                                    남중 고도가 높은 여름에는 태양이 하늘에 더 오래 머뭅니다. 그래서 낮이 길어지고 밤이 짧아집니다.
                                    아래 재생 버튼을 누르면 하루 동안의 태양 궤적을 볼 수 있습니다.
                                </div>
                            </>
                        ),
                    },
                    {
                        id: 'chart', label: '월별 낮 길이',
                        content: <MonthlyDayLength month={month} onPick={pickMonth} />,
                    },
                    {
                        id: 'why', label: '왜?', content: (
                            <>
                                <div className="insp-key">
                                    <HelpCircle size={18} />
                                    <span>남중 고도는 왜 달라질까요?</span>
                                </div>
                                <ul className="insp-list" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                                    <li>지구의 <strong>자전축은 항상 같은 방향</strong>으로 기울어져 있습니다.</li>
                                    <li>공전하면서 <strong>북반구가 태양을 향하는 정도</strong>가 달라집니다.</li>
                                    <li><span style={{ color: 'var(--season-summer)' }}>여름(6월)</span>에는 북반구가 태양을 향해 남중 고도가 높아집니다.</li>
                                    <li><span style={{ color: 'var(--season-winter)' }}>겨울(12월)</span>에는 북반구가 태양에서 멀어져 남중 고도가 낮아집니다.</li>
                                </ul>
                            </>
                        ),
                    },
                ]}
            />

            <SimDock
                play={{ playing: isAnimating, onToggle: () => { setIsAnimating(!isAnimating); if (isAnimating) setAnimT(-1); else setAnimT(0); } }}
                slider={{
                    label: '월', min: 1, max: 12, step: 0.1, value: month, onChange: pickMonth,
                    display: `${Math.round(month)}월 · ${season.name}`,
                    ticks: ['1월 겨울', '6월 여름', '12월 겨울'],
                    disabled: isAnimating,
                }}
                presets={PRESETS.map((p) => ({
                    label: p.label, onClick: () => pickMonth(p.month), active: Math.round(month) === p.month,
                }))}
            />
        </SimLayout>
    );
}
