import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Line, useTexture } from '@react-three/drei';
import { useRef, useState, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { Globe, Lightbulb, AlertTriangle, CheckCircle2, Skull, type LucideIcon } from 'lucide-react';
import { degToRad } from '../../utils/mathUtils';
import { AXIAL_TILT, declination, orbitAngle } from '../../utils/solar';
import { useSeasonStore } from '../../store/seasonStore';
import { SimLayout, SimStage, SimHud, SimDock, SimInspector, StatRow } from '../../components/SimLayout';
import { getTexturePath } from '../../utils/texturePaths';

const ORBIT_RADIUS = 16;
const SPEEDS = [1, 2, 5, 10, 50, 100];
const LABEL_Z: [number, number] = [5, 0];

/** 궤도 위 계절 표지. 각도는 손으로 적지 않고 orbitAngle(month) 로만 얻는다. */
const SEASON_MARKERS = [
    { month: 3, label: '3월 춘분', color: '#f472b6', cls: 'spring' },
    { month: 6, label: '6월 하지', color: '#ef4444', cls: 'summer' },
    { month: 9, label: '9월 추분', color: '#f59e0b', cls: 'autumn' },
    { month: 12, label: '12월 동지', color: '#60a5fa', cls: 'winter' },
];

function HeatmapEarth({ axialTilt, subsolarLat }: { axialTilt: number; subsolarLat: number }) {
    const earthRef = useRef<THREE.Group>(null);
    const tiltRad = degToRad(axialTilt);
    const [earthMap, cloudMap] = useTexture([getTexturePath('earthDay'), getTexturePath('earthClouds')]);

    // 햇빛이 가장 세게 닿는 위도 띠: 직사 위도 ±12°, 경계 밖은 8° 가우시안으로 페이드.
    const band = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 128;
        const ctx = canvas.getContext('2d')!;

        for (let y = 0; y < 128; y++) {
            const lat = 90 - (y / 128) * 180;
            const d = Math.abs(lat - subsolarLat);
            const alpha = 0.55 * (d <= 12 ? 1 : Math.exp(-((d - 12) ** 2) / (2 * 8 * 8)));
            if (alpha < 0.01) continue;
            ctx.fillStyle = `rgba(251, 191, 36, ${alpha.toFixed(3)})`;
            ctx.fillRect(0, y, 256, 1);
        }

        return new THREE.CanvasTexture(canvas);
    }, [subsolarLat]);
    useEffect(() => () => band.dispose(), [band]);

    useFrame((_, delta) => {
        if (earthRef.current) {
            earthRef.current.rotation.y += delta * 0.5;
        }
    });

    // 자전축은 월드 고정: rotation=[0,0,+tilt] -> 축 방향 (−sin t, cos t, 0), 즉 −x 로 기욺.
    // 검산) month=6 -> orbitAngle(6)=0 -> 지구 (+R,0,0) -> 태양 방향 −x. 축도 −x -> 북극이 태양을 향함 = 북반구 여름.
    return (
        <group rotation={[0, 0, tiltRad]}>
            <group ref={earthRef}>
                <mesh>
                    <sphereGeometry args={[3, 64, 64]} />
                    <meshStandardMaterial map={earthMap} roughness={0.8} />
                </mesh>
                <mesh>
                    <sphereGeometry args={[3.02, 64, 64]} />
                    <meshBasicMaterial map={band} transparent depthWrite={false} />
                </mesh>
                <mesh>
                    <sphereGeometry args={[3.04, 48, 48]} />
                    <meshStandardMaterial
                        map={cloudMap} alphaMap={cloudMap}
                        transparent opacity={0.35} depthWrite={false}
                    />
                </mesh>
            </group>
            {/* 자전축: 북(빨강) / 남(파랑) */}
            <Line points={[[0, 0, 0], [0, 4.5, 0]]} color="#ef4444" lineWidth={2} transparent opacity={0.9} />
            <Line points={[[0, 0, 0], [0, -4.5, 0]]} color="#60a5fa" lineWidth={2} transparent opacity={0.9} />
            <Html position={[0, 4.9, 0]} center zIndexRange={LABEL_Z} style={{ whiteSpace: 'nowrap' }}>
                <div className="stage-label muted">N</div>
            </Html>
        </group>
    );
}

/** 태양 -> 지구 평행 광선 3개. sunDir = 지구에서 태양을 향한 단위벡터. */
function SunRays({ sunDir }: { sunDir: THREE.Vector3 }) {
    const quaternion = useMemo(
        () => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), sunDir.clone().negate()),
        [sunDir],
    );

    return (
        <>
            {[-1.2, 0, 1.2].map((dy) => (
                <group key={dy} position={[0, dy, 0]} quaternion={quaternion}>
                    <Line points={[[0, -1.25, 0], [0, 0.8, 0]]} color="#fde68a" lineWidth={1.6} transparent opacity={0.8} />
                    <mesh position={[0, 1, 0]}>
                        <coneGeometry args={[0.18, 0.5, 12]} />
                        <meshBasicMaterial color="#fde68a" transparent opacity={0.8} />
                    </mesh>
                </group>
            ))}
        </>
    );
}

/* 우주 배경 */
function StarfieldBg() {
    const starMap = useTexture(getTexturePath('starfield'));
    return (
        <mesh>
            <sphereGeometry args={[200, 32, 32]} />
            <meshBasicMaterial map={starMap} color="#6b7280" side={THREE.BackSide} />
        </mesh>
    );
}

/* 태양: 중심에 고정 */
function SunCenter() {
    const sunMap = useTexture(getTexturePath('sun'));

    const glow = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d')!;
        const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
        grad.addColorStop(0, 'rgba(253, 230, 138, 0.95)');
        grad.addColorStop(1, 'rgba(245, 158, 11, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 256, 256);
        return new THREE.CanvasTexture(canvas);
    }, []);
    useEffect(() => () => glow.dispose(), [glow]);

    return (
        <group>
            <mesh>
                <sphereGeometry args={[4, 32, 32]} />
                <meshBasicMaterial map={sunMap} />
                <pointLight intensity={2} distance={100} color="#fbbf24" />
            </mesh>
            <sprite scale={[16, 16, 1]}>
                <spriteMaterial map={glow} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
            </sprite>
        </group>
    );
}

/* 지구가 태양 주위를 공전하는 구조 */
function OrbitingScene({ axialTilt, month, subsolarLat }: { axialTilt: number; month: number; subsolarLat: number }) {
    const θ = orbitAngle(month);
    const x = Math.cos(θ) * ORBIT_RADIUS;
    const z = Math.sin(θ) * ORBIT_RADIUS;

    const sunDir = useMemo(() => new THREE.Vector3(-x, 0, -z).normalize(), [x, z]);

    const orbitPts = useMemo(() => {
        const pts: THREE.Vector3[] = [];
        for (let i = 0; i <= 128; i++) {
            const a = (i / 128) * Math.PI * 2;
            pts.push(new THREE.Vector3(Math.cos(a) * ORBIT_RADIUS, 0, Math.sin(a) * ORBIT_RADIUS));
        }
        return pts;
    }, []);

    // month 는 1..12 를 주기 11 로 순환(AutoAdvance)하므로 감싼 거리로 가장 가까운 마커를 고른다.
    const nearestMonth = useMemo(() => {
        const dist = (m: number) => {
            const d = Math.abs(m - month);
            return Math.min(d, 11 - d);
        };
        return SEASON_MARKERS.reduce((a, b) => (dist(b.month) < dist(a.month) ? b : a)).month;
    }, [month]);

    return (
        <group>
            {/* 태양이 지구를 비추는 평행광. 기본 target 이 원점(=태양)이라 위치를 반대편에 두면 태양->지구 방향이 된다. */}
            <directionalLight position={[-x, 0, -z]} intensity={1.6} />

            {/* 궤도선 */}
            <Line points={orbitPts} color="#94a3b8" lineWidth={1.2} transparent opacity={0.35} />

            {/* 계절 마커 */}
            {SEASON_MARKERS.map((m) => {
                const a = orbitAngle(m.month);
                const mx = Math.cos(a) * ORBIT_RADIUS;
                const mz = Math.sin(a) * ORBIT_RADIUS;
                return (
                    <group key={m.month} position={[mx, 0, mz]}>
                        <mesh rotation={[-Math.PI / 2, 0, 0]}>
                            <circleGeometry args={[m.month === nearestMonth ? 0.6 : 0.4, 32]} />
                            <meshBasicMaterial color={m.color} side={THREE.DoubleSide} />
                        </mesh>
                        {Math.abs(month - m.month) > 0.7 && (
                            <Html position={[0, -1.4, 0]} center zIndexRange={LABEL_Z} style={{ whiteSpace: 'nowrap' }}>
                                <div className={`stage-label ${m.cls}`}>{m.label}</div>
                            </Html>
                        )}
                    </group>
                );
            })}

            {/* 햇빛 방향 화살표: 지구 중심에서 태양 쪽 5.5 지점 */}
            <group position={[x + sunDir.x * 5.5, 0, z + sunDir.z * 5.5]}>
                <SunRays sunDir={sunDir} />
            </group>

            {/* 지구: 궤도 위를 이동 */}
            <group position={[x, 0, z]}>
                <HeatmapEarth axialTilt={axialTilt} subsolarLat={subsolarLat} />
                <Html position={[0, 6, 0]} center zIndexRange={LABEL_Z} style={{ whiteSpace: 'nowrap' }}>
                    <div className="stage-label earth strong">지구 · 기울기 {axialTilt.toFixed(1)}°</div>
                </Html>
            </group>
        </group>
    );
}

/** 재생 중 month 를 1->12->1 로 순환. ×1 에서 1개월/초. */
function AutoAdvance({ playing, speed }: { playing: boolean; speed: number }) {
    const setMonth = useSeasonStore((s) => s.setMonth);
    useFrame((_, delta) => {
        if (!playing) return;
        const next = useSeasonStore.getState().month + delta * speed;
        setMonth(next > 12 ? next - 11 : next);
    });
    return null;
}

interface Stage { max: number; Icon: LucideIcon; color: string; title: string; text: string }

const STAGES: Stage[] = [
    {
        max: 10, Icon: AlertTriangle, color: 'var(--accent-sun)', title: '기울기 10° 이하',
        text: '계절 변화가 거의 없습니다. 적도와 온대의 기후 차이가 줄어듭니다.',
    },
    {
        max: 25, Icon: CheckCircle2, color: 'var(--accent-success)', title: '현재 지구 (23.44°)',
        text: '온화한 사계절이 존재합니다.',
    },
    {
        max: 35, Icon: AlertTriangle, color: 'var(--accent-sun)', title: '30° 전후',
        text: '여름과 겨울의 기온차가 더 심해집니다. 극지방 빙하가 계절마다 크게 녹았다 얼었다를 반복합니다.',
    },
    {
        max: 50, Icon: AlertTriangle, color: 'var(--accent-sun)', title: '40~50°',
        text: '여름에는 적도까지 백야가 나타나고, 겨울에는 중위도에서도 극야가 생깁니다. 농사를 짓기 어려워집니다.',
    },
    {
        max: 65, Icon: AlertTriangle, color: 'var(--accent-danger)', title: '50~65°',
        text: '생태계가 크게 무너집니다. 대부분의 지역에서 농사가 불가능하고, 폭풍과 기온 변동이 극심해집니다.',
    },
    {
        max: 80, Icon: AlertTriangle, color: 'var(--accent-danger)', title: '65~80°',
        text: '한쪽 반구가 몇 달 동안 태양을 전혀 보지 못합니다. 바닷물의 흐름이 흐트러지고 대멸종이 일어날 수 있습니다.',
    },
    {
        max: 90, Icon: Skull, color: 'var(--accent-danger)', title: '80~90° (천왕성과 비슷)',
        text: '한 반구가 6개월 내내 태양을 향해 타고, 반대쪽은 6개월 동안 어둡습니다. 생명체가 살 수 없습니다.',
    },
];

function stageOf(tilt: number): Stage {
    return STAGES.find((s) => tilt <= s.max) ?? STAGES[STAGES.length - 1];
}

export default function AxisImpact() {
    const [axialTilt, setAxialTilt] = useState(AXIAL_TILT);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1);
    const month = useSeasonStore((s) => s.month);
    const setMonth = useSeasonStore((s) => s.setMonth);

    // 기울기 슬라이더가 23.44° 가 아니면 적위도 그만큼 비례 스케일된다.
    const subsolarLat = declination(month, axialTilt);
    const seasonLabel = subsolarLat > 10 ? '북반구 여름' : subsolarLat < -10 ? '북반구 겨울' : '봄/가을';

    return (
        <SimLayout>
            <SimStage>
                <Canvas camera={{ position: [0, 32, 36], fov: 45 }} style={{ background: '#0a0e1a' }}>
                    <AutoAdvance playing={isPlaying} speed={speed} />
                    <ambientLight intensity={0.25} />
                    <StarfieldBg />
                    <SunCenter />
                    <OrbitingScene axialTilt={axialTilt} month={month} subsolarLat={subsolarLat} />
                    <OrbitControls enablePan={false} minDistance={25} maxDistance={70}
                        minPolarAngle={0.35} maxPolarAngle={1.35} />
                </Canvas>
                <SimHud items={[
                    { label: '태양 직사 위도', value: `${subsolarLat.toFixed(1)}°`, color: 'var(--accent-sun)' },
                    { label: '자전축 기울기', value: `${axialTilt.toFixed(1)}°` },
                    { label: '현재 계절', value: seasonLabel },
                ]} />
            </SimStage>

            <SimInspector
                title={<><Globe size={18} /> 자전축 기울기와 계절</>}
                sections={[
                    {
                        id: 'desc', label: '설명', content: (
                            <>
                                <div className="insp-key">
                                    <Lightbulb size={18} />
                                    <span>자전축이 기울어져 있어서 계절이 생깁니다.</span>
                                </div>
                                <StatRow label="자전축 기울기" value={`${axialTilt.toFixed(1)}°`} />
                                <StatRow label="태양 직사 위도" value={`${subsolarLat.toFixed(1)}°`} />
                                <StatRow label="현재 계절" value={seasonLabel} />
                                <div className="insp-note">
                                    지구 위 노란 띠는 햇빛이 가장 똑바로 닿는 곳입니다. 6월엔 북쪽으로, 12월엔 남쪽으로 내려갑니다.
                                    자전축이 기울면 남중 고도가 달라지고, 그러면 에너지 밀도가 달라져 기온이 변합니다.
                                </div>
                            </>
                        ),
                    },
                    {
                        id: 'catastrophe', label: '재앙 단계', content: (() => {
                            const stage = stageOf(axialTilt);
                            return (
                                <>
                                    <div style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 6,
                                        padding: '4px 10px', marginBottom: 10, borderRadius: 'var(--radius-sm)',
                                        border: '1px solid currentColor', color: stage.color,
                                        fontSize: '0.78rem', fontWeight: 700,
                                    }}>
                                        <stage.Icon size={16} />
                                        <span>{stage.title}</span>
                                    </div>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                                        {stage.text}
                                    </p>
                                </>
                            );
                        })(),
                    },
                ]}
            />

            <SimDock
                play={{ playing: isPlaying, onToggle: () => setIsPlaying((p) => !p) }}
                speed={{ value: speed, onCycle: () => setSpeed((s) => SPEEDS[(SPEEDS.indexOf(s) + 1) % SPEEDS.length]) }}
                slider={{
                    label: '공전 위치', min: 1, max: 12, step: 0.05, value: month,
                    onChange: setMonth, display: `${Math.round(month)}월`,
                    ticks: ['3월 춘분', '6월 하지', '9월 추분', '12월 동지'],
                }}
                presets={[
                    { label: '0° 계절없음', onClick: () => setAxialTilt(0), active: axialTilt === 0 },
                    { label: '23.44° 실제', onClick: () => setAxialTilt(AXIAL_TILT), active: axialTilt === AXIAL_TILT },
                    { label: '45° 극단', onClick: () => setAxialTilt(45), active: axialTilt === 45 },
                    { label: '90° 천왕성', onClick: () => setAxialTilt(90), active: axialTilt === 90 },
                ]}
            >
                <div className="slider-container">
                    <span className="slider-label">자전축 기울기: {axialTilt.toFixed(1)}°</span>
                    <input type="range" className="slider-input" style={{ width: 160 }}
                        aria-label="자전축 기울기"
                        min={0} max={90} step={0.5}
                        value={axialTilt} onChange={(e) => setAxialTilt(parseFloat(e.target.value))} />
                </div>
            </SimDock>
        </SimLayout>
    );
}
