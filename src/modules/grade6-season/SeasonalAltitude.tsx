import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, useTexture, Line } from '@react-three/drei';
import { useState, useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { degToRad } from '../../utils/mathUtils';
import { seasonalData, monthlyData } from '../../data/shadowLabData';
import InfoPanel, { StatRow } from '../../components/InfoPanel';
import { getTexturePath } from '../../utils/texturePaths';

/* 월 값(1~12)을 보간하여 남중고도, 낮길이, 기온 계산 */
function interpolateMonth(month: number) {
    const idx = month - 1; // 0-indexed
    const lo = Math.floor(idx);
    const hi = Math.min(lo + 1, 11);
    const frac = idx - lo;

    const dLo = monthlyData[lo];
    const dHi = monthlyData[hi];

    return {
        meridianAltitude: dLo.meridianAltitude + (dHi.meridianAltitude - dLo.meridianAltitude) * frac,
        dayLength: dLo.dayLength + (dHi.dayLength - dLo.dayLength) * frac,
        avgTemperature: dLo.avgTemperature + (dHi.avgTemperature - dLo.avgTemperature) * frac,
        monthName: dLo.monthName,
    };
}

function getSeasonName(month: number): { name: string; emoji: string; color: string } {
    const m = Math.round(month);
    if (m >= 3 && m <= 5) return { name: '봄', emoji: '🌸', color: '#f472b6' };
    if (m >= 6 && m <= 8) return { name: '여름', emoji: '☀️', color: '#ef4444' };
    if (m >= 9 && m <= 11) return { name: '가을', emoji: '🍂', color: '#f59e0b' };
    return { name: '겨울', emoji: '❄️', color: '#3b82f6' };
}

/* 계절별 일출/일몰 시각 계산 */
function getSunTimes(dayLength: number) {
    const solarNoon = 12; // 태양이 남중하는 시각 (대략 12시)
    const sunrise = solarNoon - dayLength / 2;
    const sunset = solarNoon + dayLength / 2;
    return { sunrise, sunset };
}

function formatTime(hour: number): string {
    const h = Math.floor(hour);
    const m = Math.round((hour - h) * 60);
    return `${h}:${m.toString().padStart(2, '0')}`;
}

function SunPath({ meridianAltitude, dayLength, animT }: { meridianAltitude: number; dayLength: number; animT: number }) {
    const sunMap = useTexture(getTexturePath('sun'));
    const dist = 15;

    // 단일 태양 궤적: 동쪽(+x)에서 일출 → 남쪽 남중 → 서쪽(-x)에서 일몰
    // 2D 평면(xz=0)에서 반원 호를 그림 - 물결 없이 부드러운 곡선
    const arcPoints = useMemo(() => {
        const pts: THREE.Vector3[] = [];
        const steps = 60;
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            // 동쪽(0°)에서 서쪽(180°)으로 이동
            const angle = t * Math.PI;
            // 고도: sin 곡선으로 0 → 남중고도 → 0
            const altitude = Math.sin(angle) * meridianAltitude;
            const altRad = degToRad(altitude);
            // x: 동쪽(+)에서 서쪽(-)으로 일직선 이동
            const x = Math.cos(angle) * dist;
            // y: 고도에 따른 높이
            const y = Math.sin(altRad) * dist;
            pts.push(new THREE.Vector3(x, y, 0));
        }
        return pts;
    }, [meridianAltitude]);
    const arcGeo = useMemo(() => new THREE.BufferGeometry().setFromPoints(arcPoints), [arcPoints]);

    // 일출/일몰 위치
    const sunrisePos = arcPoints[0];
    const sunsetPos = arcPoints[arcPoints.length - 1];

    // 남중 위치 (중앙)
    const meridianRad = degToRad(meridianAltitude);
    const meridianX = 0; // 남쪽 = 정면
    const meridianY = Math.sin(meridianRad) * dist;

    // 애니메이션 중일 때 태양 위치 (arc 위를 animT 비율로 이동)
    const animSunPos = useMemo(() => {
        if (animT < 0) return null;
        const steps = 60;
        const idx = animT * steps;
        const lo = Math.floor(idx);
        const hi = Math.min(lo + 1, steps);
        const frac = idx - lo;
        if (lo >= arcPoints.length - 1) return arcPoints[arcPoints.length - 1];
        const p1 = arcPoints[lo];
        const p2 = arcPoints[hi] || p1;
        return new THREE.Vector3(
            p1.x + (p2.x - p1.x) * frac,
            p1.y + (p2.y - p1.y) * frac,
            p1.z + (p2.z - p1.z) * frac,
        );
    }, [animT, arcPoints]);

    // 비 애니메이션 시 남중 위치에 태양 표시
    const staticSunPos: [number, number, number] = [meridianX, meridianY, 0];
    const sunPos = animSunPos && animT >= 0
        ? [animSunPos.x, animSunPos.y, animSunPos.z] as [number, number, number]
        : staticSunPos;

    // 여름/겨울 비교 고스트 (남중 고도만 표시)
    const summerRad = degToRad(76.5);
    const winterRad = degToRad(29.5);
    const summerPos: [number, number, number] = [0, Math.sin(summerRad) * dist, 0];
    const winterPos: [number, number, number] = [0, Math.sin(winterRad) * dist, 0];
    const showSummerGhost = Math.abs(meridianAltitude - 76.5) > 5;
    const showWinterGhost = Math.abs(meridianAltitude - 29.5) > 5;

    return (
        <group>
            {/* 태양 이동 궤적 (단일 호) */}
            <line>
                <bufferGeometry attach="geometry" {...arcGeo} />
                <lineBasicMaterial color="#fbbf24" opacity={0.6} transparent />
            </line>

            {/* 일출 마커 */}
            <mesh position={[sunrisePos.x, sunrisePos.y + 0.3, sunrisePos.z]}>
                <sphereGeometry args={[0.4, 12, 12]} />
                <meshBasicMaterial color="#ff6b35" opacity={0.7} transparent />
            </mesh>
            <Html position={[sunrisePos.x + 1, sunrisePos.y + 1, sunrisePos.z]} center style={{ whiteSpace: 'nowrap' }}>
                <div style={{ color: '#ff6b35', fontSize: '0.65rem', background: 'rgba(0,0,0,0.5)', padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap' }}>
                    🌅 일출 (동)
                </div>
            </Html>

            {/* 일몰 마커 */}
            <mesh position={[sunsetPos.x, sunsetPos.y + 0.3, sunsetPos.z]}>
                <sphereGeometry args={[0.4, 12, 12]} />
                <meshBasicMaterial color="#c44569" opacity={0.7} transparent />
            </mesh>
            <Html position={[sunsetPos.x - 1, sunsetPos.y + 1, sunsetPos.z]} center style={{ whiteSpace: 'nowrap' }}>
                <div style={{ color: '#c44569', fontSize: '0.65rem', background: 'rgba(0,0,0,0.5)', padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap' }}>
                    🌇 일몰 (서)
                </div>
            </Html>

            {/* Sun */}
            <mesh position={sunPos}>
                <sphereGeometry args={[1.2, 16, 16]} />
                <meshBasicMaterial map={sunMap} />
                <pointLight intensity={2} distance={50} color="#fbbf24" />
            </mesh>

            {/* 남중 고도 라벨 */}
            <Html position={[2, meridianY / 2 + 1, 0]} center style={{ whiteSpace: 'nowrap' }}>
                <div style={{
                    color: '#fbbf24', fontSize: '1rem', fontFamily: 'var(--font-mono)',
                    fontWeight: 'bold', background: 'rgba(0,0,0,0.5)', padding: '3px 8px', borderRadius: 4,
                    whiteSpace: 'nowrap',
                }}>
                    남중 고도: {meridianAltitude.toFixed(1)}°
                </div>
            </Html>

            {/* 낮 길이 라벨 */}
            <Html position={[0, meridianY + 2.5, 0]} center style={{ whiteSpace: 'nowrap' }}>
                <div style={{
                    color: '#ff8c00', fontSize: '0.85rem', fontFamily: 'var(--font-mono)',
                    fontWeight: 'bold', background: 'rgba(0,0,0,0.6)', padding: '4px 10px', borderRadius: 6,
                    whiteSpace: 'nowrap',
                }}>
                    ☀️ 낮 {dayLength.toFixed(1)}시간 | 🌙 밤 {(24 - dayLength).toFixed(1)}시간
                </div>
            </Html>

            {/* 여름 비교 고스트 태양 */}
            {showSummerGhost && (
                <group>
                    <mesh position={summerPos}>
                        <sphereGeometry args={[0.6, 12, 12]} />
                        <meshBasicMaterial color="#ef4444" opacity={0.2} transparent />
                    </mesh>
                    <Html position={[summerPos[0] + 2, summerPos[1], 0]} center style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ color: '#ef4444', fontSize: '0.6rem', opacity: 0.6, whiteSpace: 'nowrap' }}>여름 76.5°</div>
                    </Html>
                </group>
            )}

            {/* 겨울 비교 고스트 태양 */}
            {showWinterGhost && (
                <group>
                    <mesh position={winterPos}>
                        <sphereGeometry args={[0.6, 12, 12]} />
                        <meshBasicMaterial color="#3b82f6" opacity={0.2} transparent />
                    </mesh>
                    <Html position={[winterPos[0] + 2, winterPos[1], 0]} center style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ color: '#3b82f6', fontSize: '0.6rem', opacity: 0.6, whiteSpace: 'nowrap' }}>겨울 29.5°</div>
                    </Html>
                </group>
            )}
        </group>
    );
}

function Observer() {
    return (
        <group>
            <mesh position={[0, 0.5, 0]}>
                <cylinderGeometry args={[0.12, 0.12, 1, 8]} />
                <meshStandardMaterial color="#94a3b8" />
            </mesh>
            <mesh position={[0, 1.2, 0]}>
                <sphereGeometry args={[0.22, 8, 8]} />
                <meshStandardMaterial color="#94a3b8" />
            </mesh>
            {/* 흙 지면 */}
            <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[20, 20]} />
                <meshStandardMaterial color="#5a4a3a" roughness={1} />
            </mesh>

            <Html position={[0, 2, 0]} center style={{ whiteSpace: 'nowrap' }}>
                <div style={{ color: '#94a3b8', fontSize: '0.65rem', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap' }}>
                    관측자 (위도 37°N)
                </div>
            </Html>

            {/* 지평선 라벨 */}
            <Html position={[dist, 0.5, 0]} center style={{ whiteSpace: 'nowrap' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.6rem', whiteSpace: 'nowrap' }}>지평선 (0°)</div>
            </Html>
        </group>
    );
}

const dist = 15;

/* 우주 시점: 공전 궤도와 자전축 기울기 시각화 */
function SpaceViewScene({ month }: { month: number }) {
    const earthRef = useRef<THREE.Group>(null);
    const sunMap = useTexture(getTexturePath('sun'));
    const earthMap = useTexture(getTexturePath('earthDay'));
    const starMap = useTexture(getTexturePath('starfield'));

    // 공전 각도: 3월 = 0°, 6월 = 90°, 9월 = 180°, 12월 = 270°
    const orbitAngle = ((month - 3) / 12) * Math.PI * 2;
    const orbitRadius = 12;

    // 지구 위치
    const earthX = Math.cos(orbitAngle) * orbitRadius;
    const earthZ = Math.sin(orbitAngle) * orbitRadius;

    // 자전축 기울기 (23.44°)
    const axialTilt = degToRad(23.44);

    // 태양빛 방향 (항상 원점에서 지구 방향)
    const sunLightDir = new THREE.Vector3(-earthX, 0, -earthZ).normalize();

    // 북반구가 태양을 향하는 정도 계산
    const northHemisphereExposure = Math.sin(orbitAngle); // 6월에 최대(+1), 12월에 최소(-1)

    return (
        <group>
            {/* 별 배경 */}
            <mesh>
                <sphereGeometry args={[100, 32, 32]} />
                <meshBasicMaterial map={starMap} side={THREE.BackSide} />
            </mesh>

            {/* 태양 */}
            <mesh position={[0, 0, 0]}>
                <sphereGeometry args={[2.5, 32, 32]} />
                <meshBasicMaterial map={sunMap} />
                <pointLight intensity={2} distance={50} color="#fbbf24" />
            </mesh>
            <Html position={[0, 3.5, 0]} center>
                <div style={{ color: '#fbbf24', fontSize: '0.8rem', fontWeight: 'bold' }}>☀️ 태양</div>
            </Html>

            {/* 공전 궤도 */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[orbitRadius - 0.05, orbitRadius + 0.05, 64]} />
                <meshBasicMaterial color="#3b82f6" opacity={0.3} transparent />
            </mesh>

            {/* 궤도 위 계절 마커 */}
            {[
                { angle: 0, label: '3월 (춘분)', color: '#4ade80' },
                { angle: Math.PI / 2, label: '6월 (하지)', color: '#ef4444' },
                { angle: Math.PI, label: '9월 (추분)', color: '#f59e0b' },
                { angle: Math.PI * 1.5, label: '12월 (동지)', color: '#3b82f6' },
            ].map(({ angle, label, color }) => (
                <Html
                    key={label}
                    position={[
                        Math.cos(angle) * (orbitRadius + 2),
                        0,
                        Math.sin(angle) * (orbitRadius + 2)
                    ]}
                    center
                >
                    <div style={{
                        color,
                        fontSize: '0.65rem',
                        background: 'rgba(0,0,0,0.6)',
                        padding: '2px 6px',
                        borderRadius: 4,
                        whiteSpace: 'nowrap'
                    }}>
                        {label}
                    </div>
                </Html>
            ))}

            {/* 지구 */}
            <group ref={earthRef} position={[earthX, 0, earthZ]}>
                {/* 자전축 기울기 적용 - 항상 같은 방향(북극성 방향)으로 기울어짐 */}
                <group rotation={[0, 0, axialTilt]}>
                    {/* 지구 본체 */}
                    <mesh>
                        <sphereGeometry args={[1, 32, 32]} />
                        <meshStandardMaterial map={earthMap} />
                    </mesh>

                    {/* 자전축 */}
                    <mesh>
                        <cylinderGeometry args={[0.03, 0.03, 3.5, 8]} />
                        <meshBasicMaterial color="#ef4444" />
                    </mesh>

                    {/* 북극 라벨 */}
                    <Html position={[0, 2, 0]} center>
                        <div style={{ color: '#ef4444', fontSize: '0.7rem', fontWeight: 'bold' }}>N</div>
                    </Html>

                    {/* 위도 37°N 표시 (한국 위치) */}
                    <mesh rotation={[degToRad(90 - 37), 0, 0]}>
                        <torusGeometry args={[Math.cos(degToRad(37)), 0.02, 8, 32]} />
                        <meshBasicMaterial color="#fbbf24" />
                    </mesh>
                </group>

                {/* 태양빛 화살표 (태양에서 지구로) */}
                <Html position={[earthX > 0 ? -2 : 2, 0.5, 0]} center>
                    <div style={{
                        color: '#fbbf24',
                        fontSize: '0.7rem',
                        background: 'rgba(0,0,0,0.6)',
                        padding: '2px 6px',
                        borderRadius: 4,
                        whiteSpace: 'nowrap'
                    }}>
                        ← 태양빛
                    </div>
                </Html>
            </group>

            {/* 현재 월 표시 */}
            <Html position={[earthX, 2.5, earthZ]} center>
                <div style={{
                    color: '#4a90d9',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    background: 'rgba(0,0,0,0.7)',
                    padding: '4px 10px',
                    borderRadius: 6,
                    whiteSpace: 'nowrap'
                }}>
                    🌍 지구 ({Math.round(month)}월)
                </div>
            </Html>

            {/* 태양빛이 북반구/남반구에 미치는 영향 설명 */}
            <Html position={[earthX + (earthX > 0 ? 3 : -3), -2, earthZ]} center>
                <div style={{
                    color: northHemisphereExposure > 0 ? '#ef4444' : '#3b82f6',
                    fontSize: '0.7rem',
                    background: 'rgba(0,0,0,0.7)',
                    padding: '4px 8px',
                    borderRadius: 4,
                    maxWidth: 120,
                    textAlign: 'center',
                    lineHeight: 1.4
                }}>
                    {northHemisphereExposure > 0.3
                        ? '북반구가 태양을 더 향함 → 남중고도 ↑'
                        : northHemisphereExposure < -0.3
                            ? '북반구가 태양에서 멀어짐 → 남중고도 ↓'
                            : '낮과 밤 길이 비슷 (춘분/추분)'}
                </div>
            </Html>

            {/* 조명 */}
            <ambientLight intensity={0.3} />
            <directionalLight
                position={[-earthX * 2, 0, -earthZ * 2]}
                intensity={1.5}
                color="#fbbf24"
            />
        </group>
    );
}

function DayNightCircle({ dayLength }: { dayLength: number }) {
    const dayFraction = dayLength / 24;
    const dayDeg = dayFraction * 360;

    return (
        <div style={{
            width: 90, height: 90, borderRadius: '50%', position: 'relative',
            background: `conic-gradient(#fbbf24 0deg, #fbbf24 ${dayDeg}deg, #1e293b ${dayDeg}deg, #1e293b 360deg)`,
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

export default function SeasonalAltitude() {
    const [month, setMonth] = useState(6); // 1~12
    const [viewMode, setViewMode] = useState<'observer' | 'space'>('observer');
    const [isAnimating, setIsAnimating] = useState(false);
    const [animT, setAnimT] = useState(-1); // -1 = not animating, 0~1 = animation progress
    const [elapsedSec, setElapsedSec] = useState(0);
    const rafRef = useRef<number>(0);
    const startTimeRef = useRef<number>(0);
    const data = interpolateMonth(month);
    const season = getSeasonName(month);
    const sunTimes = getSunTimes(data.dayLength);

    // 현재 애니메이션 시각 계산
    const currentAnimHour = animT >= 0
        ? sunTimes.sunrise + animT * data.dayLength
        : -1;

    // 애니메이션 시작
    const startAnimation = () => {
        setAnimT(0);
        setElapsedSec(0);
        setIsAnimating(true);
        startTimeRef.current = performance.now();
    };

    // 애니메이션 정지
    const stopAnimation = () => {
        setIsAnimating(false);
        setAnimT(-1);
        setElapsedSec(0);
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };

    useEffect(() => {
        if (!isAnimating) return;

        const animDuration = 8000; // 8초 동안 전체 일출~일몰

        const tick = (ts: number) => {
            const elapsed = ts - startTimeRef.current;
            const t = Math.min(elapsed / animDuration, 1);
            setAnimT(t);
            setElapsedSec(elapsed / 1000);
            if (t >= 1) {
                setIsAnimating(false);
                return;
            }
            rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [isAnimating]);

    // 계절 변경 시 애니메이션 정지
    useEffect(() => {
        stopAnimation();
    }, [month]);

    return (
        <>
            {viewMode === 'observer' ? (
                <Canvas camera={{ position: [10, 8, 12], fov: 50 }} style={{ background: '#0a0e1a' }}>
                    <ambientLight intensity={0.35} />
                    <directionalLight
                        position={[
                            Math.cos(degToRad(data.meridianAltitude)) * 15,
                            Math.sin(degToRad(data.meridianAltitude)) * 15,
                            0
                        ]}
                        intensity={1.2}
                        color="#fbbf24"
                    />
                    <SunPath meridianAltitude={data.meridianAltitude} dayLength={data.dayLength} animT={animT} />
                    <Observer />
                    <OrbitControls enablePan={false} maxDistance={30} minDistance={5} />
                </Canvas>
            ) : (
                <Canvas camera={{ position: [0, 20, 25], fov: 50 }} style={{ background: '#0a0e1a' }}>
                    <SpaceViewScene month={month} />
                    <OrbitControls enablePan={false} maxDistance={50} minDistance={10} />
                </Canvas>
            )}

            {/* 뷰 모드 토글 */}
            <div style={{ position: 'absolute', top: 60, left: 16, zIndex: 40 }}>
                <div className="scale-toggle">
                    <button
                        className={`scale-btn ${viewMode === 'observer' ? 'active' : ''}`}
                        onClick={() => setViewMode('observer')}
                    >
                        👤 관측자 시점
                    </button>
                    <button
                        className={`scale-btn ${viewMode === 'space' ? 'active' : ''}`}
                        onClick={() => setViewMode('space')}
                    >
                        🛸 우주 시점 (공전)
                    </button>
                </div>
            </div>

            {/* 애니메이션 시간 표시 (재생 중일 때) */}
            {animT >= 0 && (
                <div style={{
                    position: 'absolute', top: 70, left: '50%', transform: 'translateX(-50%)',
                    zIndex: 50, display: 'flex', gap: 12, alignItems: 'center',
                }}>
                    <div style={{
                        background: 'var(--bg-glass)', backdropFilter: 'blur(12px)',
                        border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)',
                        padding: '10px 20px', display: 'flex', gap: 20, alignItems: 'center',
                    }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>현재 시각</div>
                            <div style={{ fontSize: '1.3rem', fontFamily: 'var(--font-mono)', color: '#fbbf24', fontWeight: 'bold' }}>
                                {currentAnimHour >= 0 ? formatTime(currentAnimHour) : '--:--'}
                            </div>
                        </div>
                        <div style={{ width: 1, height: 30, background: 'var(--border-subtle)' }} />
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>일출</div>
                            <div style={{ fontSize: '0.9rem', fontFamily: 'var(--font-mono)', color: '#ff6b35' }}>
                                {formatTime(sunTimes.sunrise)}
                            </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>일몰</div>
                            <div style={{ fontSize: '0.9rem', fontFamily: 'var(--font-mono)', color: '#c44569' }}>
                                {formatTime(sunTimes.sunset)}
                            </div>
                        </div>
                        <div style={{ width: 1, height: 30, background: 'var(--border-subtle)' }} />
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>낮 길이</div>
                            <div style={{ fontSize: '1rem', fontFamily: 'var(--font-mono)', color: '#ff8c00', fontWeight: 'bold' }}>
                                {data.dayLength.toFixed(1)}시간
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Month Slider */}
            <div style={{
                position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
                background: 'var(--bg-glass)', backdropFilter: 'blur(12px)',
                border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xl)',
                padding: '14px 28px', zIndex: 50, display: 'flex', alignItems: 'center', gap: 16,
                minWidth: 500,
            }}>
                <span style={{ fontSize: '1.5rem' }}>{season.emoji}</span>
                {/* 재생 버튼 */}
                <button
                    className={`control-btn ${isAnimating ? 'active' : ''}`}
                    onClick={() => {
                        if (isAnimating) stopAnimation();
                        else startAnimation();
                    }}
                    style={{ fontSize: '1.2rem', padding: '6px 10px', minWidth: 40 }}
                >
                    {isAnimating ? '⏸' : '▶'}
                </button>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span className="slider-label">{Math.round(month)}월</span>
                        <span style={{ fontSize: '0.75rem', color: season.color, fontWeight: 'bold' }}>{season.name}</span>
                    </div>
                    <input type="range" className="slider-input" style={{ width: '100%' }}
                        min={1} max={12} step={0.1}
                        value={month} onChange={(e) => setMonth(parseFloat(e.target.value))}
                        disabled={isAnimating} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.55rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        <span>1월 (겨울)</span>
                        <span>6월 (여름)</span>
                        <span>12월 (겨울)</span>
                    </div>
                </div>
            </div>

            {/* Season preset buttons */}
            <div style={{
                position: 'absolute', top: 16, left: 16, zIndex: 40,
                display: 'flex', gap: 6, flexWrap: 'wrap',
            }}>
                {seasonalData.map((s) => (
                    <button key={s.season} className="sub-module-btn"
                        style={{ fontSize: '0.75rem' }}
                        onClick={() => setMonth(s.month)}>
                        {s.season}
                    </button>
                ))}
            </div>

            {/* 공전 궤도 미니맵 - 관측자 시점에서만 표시 */}
            {viewMode === 'observer' && (
            <div style={{
                position: 'absolute', bottom: 90, left: 16, zIndex: 40,
                background: 'var(--bg-glass)', backdropFilter: 'blur(10px)',
                border: '1px solid var(--border-subtle)', borderRadius: 12,
                padding: 12, width: 180, height: 200,
            }}>
                <div style={{ fontSize: '0.65rem', color: '#fbbf24', fontWeight: 'bold', marginBottom: 6, textAlign: 'center' }}>
                    🌍 공전 위치와 남중 고도
                </div>
                <svg width="156" height="156" viewBox="-78 -78 156 156" style={{ display: 'block', margin: '0 auto' }}>
                    {/* 공전 궤도 */}
                    <ellipse cx="0" cy="0" rx="60" ry="60" fill="none" stroke="rgba(59,130,246,0.3)" strokeWidth="1" />
                    {/* 태양 */}
                    <circle cx="0" cy="0" r="10" fill="#fbbf24" />
                    <text x="0" y="4" textAnchor="middle" fill="#000" fontSize="7" fontWeight="bold">☀️</text>

                    {/* 계절 위치 라벨 */}
                    <text x="0" y="-65" textAnchor="middle" fill="#3b82f6" fontSize="7">12월(동지)</text>
                    <text x="0" y="72" textAnchor="middle" fill="#ef4444" fontSize="7">6월(하지)</text>
                    <text x="-65" y="3" textAnchor="middle" fill="#4ade80" fontSize="7">3월</text>
                    <text x="65" y="3" textAnchor="middle" fill="#f59e0b" fontSize="7">9월</text>

                    {/* 지구 위치 (월에 따라) */}
                    {(() => {
                        const angle = ((month - 3) / 12) * Math.PI * 2;
                        const ex = Math.cos(angle) * 60;
                        const ey = Math.sin(angle) * 60;
                        const tiltLen = 14;
                        const tiltAngle = Math.PI / 2 + 0.41;
                        return (
                            <g>
                                <line x1="0" y1="0" x2={ex} y2={ey} stroke="rgba(251,191,36,0.2)" strokeWidth="1" strokeDasharray="3,3" />
                                <circle cx={ex} cy={ey} r="7" fill="#4a90d9" stroke="#fff" strokeWidth="1" />
                                <line
                                    x1={ex - Math.cos(tiltAngle) * tiltLen / 2}
                                    y1={ey - Math.sin(tiltAngle) * tiltLen / 2}
                                    x2={ex + Math.cos(tiltAngle) * tiltLen / 2}
                                    y2={ey + Math.sin(tiltAngle) * tiltLen / 2}
                                    stroke="#ef4444" strokeWidth="1.5"
                                />
                                <text
                                    x={ex + Math.cos(tiltAngle) * (tiltLen / 2 + 6)}
                                    y={ey + Math.sin(tiltAngle) * (tiltLen / 2 + 6) + 3}
                                    fill="#ef4444" fontSize="6" textAnchor="middle"
                                >N</text>
                            </g>
                        );
                    })()}
                </svg>
                <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: 4, lineHeight: 1.4 }}>
                    자전축은 항상 같은 방향 →<br />
                    공전 위치에 따라 태양빛 각도 변화
                </div>
            </div>
            )}

            <InfoPanel title={`📅 ${Math.round(month)}월 — ${season.emoji} ${season.name}`}>
                {viewMode === 'observer' ? (
                    <>
                        <p style={{ marginBottom: 12 }}>
                            지구의 공전에 따라 태양의 남중 고도가 달라지며, 이에 따라 <strong>낮의 길이</strong>가 변합니다.
                        </p>
                        <StatRow label="남중 고도" value={`${data.meridianAltitude.toFixed(1)}°`} />
                        <StatRow label="낮 길이" value={`${data.dayLength.toFixed(1)}시간`} />
                        <StatRow label="밤 길이" value={`${(24 - data.dayLength).toFixed(1)}시간`} />
                        <StatRow label="낮-밤 차이" value={`${Math.abs(data.dayLength - (24 - data.dayLength)).toFixed(1)}시간`} />

                        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
                            <DayNightCircle dayLength={data.dayLength} />
                        </div>

                        <div style={{ marginTop: 12, borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
                            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
                                <strong>💡 핵심:</strong> 남중 고도가 높을수록(여름) → 태양이 하늘에 더 오래 머무름 →
                                <strong>낮이 길어지고</strong> 밤이 짧아집니다.
                                <br />▶ 버튼을 눌러 태양 궤적을 관찰하세요!
                            </p>
                        </div>
                    </>
                ) : (
                    <>
                        <p style={{ marginBottom: 12 }}>
                            <strong>🛸 우주 시점</strong>에서 지구의 공전과 자전축 기울기를 관찰하세요.
                        </p>
                        <StatRow label="공전 위치" value={`${Math.round(month)}월`} />
                        <StatRow label="자전축 기울기" value="23.44°" />
                        <StatRow label="남중 고도" value={`${data.meridianAltitude.toFixed(1)}°`} />

                        <div style={{ marginTop: 12, borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
                            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
                                <strong>🔑 왜 남중 고도가 달라질까요?</strong>
                            </p>
                            <ul style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.8, paddingLeft: 16, marginTop: 8 }}>
                                <li>지구의 <strong>자전축은 항상 같은 방향</strong>으로 기울어져 있습니다.</li>
                                <li>공전하면서 <strong>북반구가 태양을 향하는 정도</strong>가 달라집니다.</li>
                                <li><span style={{ color: '#ef4444' }}>여름(6월)</span>: 북반구가 태양을 향함 → 남중 고도 ↑</li>
                                <li><span style={{ color: '#3b82f6' }}>겨울(12월)</span>: 북반구가 태양에서 멀어짐 → 남중 고도 ↓</li>
                            </ul>
                        </div>
                    </>
                )}
            </InfoPanel>

            {/* Monthly daylight bar chart */}
            <div style={{
                position: 'absolute', bottom: 100, left: 16, right: 400, zIndex: 30,
                background: 'var(--bg-glass)', backdropFilter: 'blur(12px)',
                border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)',
                padding: '12px 16px',
            }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                    월별 낮 길이 (시간)
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 60 }}>
                    {monthlyData.map((m) => {
                        const height = Math.max(((m.dayLength - 8) / 8) * 50, 3);
                        const isCurrentMonth = Math.round(month) === m.month;
                        return (
                            <div key={m.month} style={{
                                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                                cursor: 'pointer',
                            }}
                                onClick={() => setMonth(m.month)}
                            >
                                <div style={{
                                    fontSize: '0.45rem', color: isCurrentMonth ? '#fbbf24' : 'var(--text-muted)',
                                    marginBottom: 1,
                                }}>{m.dayLength.toFixed(1)}h</div>
                                <div style={{
                                    height, width: '100%', borderRadius: '2px 2px 0 0',
                                    background: isCurrentMonth ? '#fbbf24' : m.dayLength > 12 ? '#ff8c00' : '#3b82f6',
                                    opacity: isCurrentMonth ? 1 : 0.4,
                                    transition: 'all 0.2s',
                                }} />
                                <span style={{
                                    fontSize: '0.5rem',
                                    color: isCurrentMonth ? '#fbbf24' : 'var(--text-muted)',
                                    fontWeight: isCurrentMonth ? 'bold' : 'normal',
                                }}>{m.month}월</span>
                            </div>
                        );
                    })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.5rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    <span>짧은 낮 ❄️</span>
                    <span>― 12h (낮=밤) ―</span>
                    <span>☀️ 긴 낮</span>
                </div>
            </div>
        </>
    );
}
