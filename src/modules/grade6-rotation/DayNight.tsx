import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, useTexture } from '@react-three/drei';
import { useRef, useState, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { degToRad } from '../../utils/mathUtils';
import { useAppStore } from '../../store/appStore';
import { getTexturePath } from '../../utils/texturePaths';
import { SimLayout, SimStage, SimStageControls, SimDock, SimInspector, StatRow } from '../../components/SimLayout';

/* 대표 대륙과 경도 */
const REGIONS = [
    { name: '한국/일본', lon: 127, emoji: '🇰🇷' },
    { name: '중국', lon: 116, emoji: '🇨🇳' },
    { name: '인도', lon: 77, emoji: '🇮🇳' },
    { name: '유럽', lon: 15, emoji: '🇪🇺' },
    { name: '아프리카', lon: 25, emoji: '🌍' },
    { name: '미국 동부', lon: -74, emoji: '🇺🇸' },
    { name: '미국 서부', lon: -118, emoji: '🇺🇸' },
    { name: '호주', lon: 151, emoji: '🇦🇺' },
];

function getDayNightRegions(rotationAngle: number) {
    const sunLon = -(rotationAngle * 180 / Math.PI) % 360;

    const dayRegions: string[] = [];
    const nightRegions: string[] = [];

    REGIONS.forEach(r => {
        let diff = ((r.lon - sunLon) % 360 + 540) % 360 - 180;
        if (Math.abs(diff) < 90) {
            dayRegions.push(`${r.emoji} ${r.name}`);
        } else {
            nightRegions.push(`${r.emoji} ${r.name}`);
        }
    });

    return { dayRegions, nightRegions };
}

function EarthWithTerminator({ rotationAngle }: { rotationAngle: number }) {
    const earthRef = useRef<THREE.Mesh>(null);
    const earthMap = useTexture(getTexturePath('earthDay'));
    const cloudsMap = useTexture(getTexturePath('earthClouds'));

    useFrame(() => {
        if (earthRef.current) {
            earthRef.current.rotation.y = rotationAngle;
        }
    });

    return (
        <group>
            <mesh ref={earthRef}>
                <sphereGeometry args={[3, 64, 64]} />
                <meshStandardMaterial map={earthMap} roughness={0.7} />
            </mesh>
            <mesh rotation={[0, rotationAngle * 0.9, 0]}>
                <sphereGeometry args={[3.05, 64, 64]} />
                <meshStandardMaterial map={cloudsMap} transparent opacity={0.3} />
            </mesh>
            {/* Axis line */}
            <mesh rotation={[0, 0, degToRad(23.44)]}>
                <cylinderGeometry args={[0.03, 0.03, 8, 8]} />
                <meshBasicMaterial color="#ef4444" opacity={0.6} transparent />
            </mesh>
            <Html position={[0, 4.5, 0]} center>
                <div style={{ color: '#ef4444', fontSize: '0.7rem', fontWeight: 700 }}>N</div>
            </Html>
            <Html position={[0, -4.5, 0]} center>
                <div style={{ color: '#ef4444', fontSize: '0.7rem', fontWeight: 700 }}>S</div>
            </Html>

            {/* 동/서 방향 표시 — 태양빛이 +x에서 오므로, 자전 방향(서→동)에 따라 표시 */}
            {/* 지구 자전 방향: 서에서 동으로 (위에서 보면 반시계) */}
            {/* 태양이 +x 방향이므로, +z가 동, -z가 서 */}
            <Html position={[0, 0, 5]} center>
                <div style={{
                    color: '#4ade80', fontSize: '0.85rem', fontWeight: 'bold',
                    background: 'rgba(0,0,0,0.6)', padding: '3px 10px', borderRadius: 6,
                    whiteSpace: 'nowrap',
                }}>→ 동(E)</div>
            </Html>
            <Html position={[0, 0, -5]} center>
                <div style={{
                    color: '#f59e0b', fontSize: '0.85rem', fontWeight: 'bold',
                    background: 'rgba(0,0,0,0.6)', padding: '3px 10px', borderRadius: 6,
                    whiteSpace: 'nowrap',
                }}>← 서(W)</div>
            </Html>
        </group>
    );
}

function SunLight() {
    return (
        <>
            <directionalLight position={[50, 5, 0]} intensity={1.5} color="#fbbf24" />
            <ambientLight intensity={0.3} />
        </>
    );
}

function StarfieldBg() {
    const starMap = useTexture(getTexturePath('starfield'));
    return (
        <mesh>
            <sphereGeometry args={[200, 32, 32]} />
            <meshBasicMaterial map={starMap} side={THREE.BackSide} />
        </mesh>
    );
}

function SunIndicator() {
    const sunMap = useTexture(getTexturePath('sun'));
    return (
        <mesh position={[50, 5, 0]}>
            <sphereGeometry args={[3, 16, 16]} />
            <meshBasicMaterial map={sunMap} />
        </mesh>
    );
}

/* 관측자 시점 카메라 초기화: 동쪽을 바라보도록 설정 */
function ObserverCameraController() {
    const { camera } = useThree();
    const initializedRef = useRef(false);

    useEffect(() => {
        if (!initializedRef.current) {
            // 동쪽(+x 방향)을 바라보도록 설정
            camera.position.set(0, 3, -5);
            camera.lookAt(30, 15, 0); // 동쪽 하늘 위를 바라봄
            initializedRef.current = true;
        }
    }, [camera]);

    return null;
}

/* 관측자 시점 용 씬: 지표면에서 하늘을 바라봄 */
function ObserverScene({ rotationAngle }: { rotationAngle: number }) {
    const starMap = useTexture(getTexturePath('starfield'));
    const sunMap = useTexture(getTexturePath('sun'));

    const sunDist = 40;
    const maxAltitude = 76; // 남중 고도 (여름 기준, 위도 37°N)

    // rotationAngle: 0~2π (0시~24시)
    // 6시(일출) = π/2, 12시(정오) = π, 18시(일몰) = 3π/2
    // dayAngle: 일출(0) → 정오(π/2) → 일몰(π)
    const dayAngle = rotationAngle - Math.PI / 2;

    // 태양 고도: sin 곡선으로 0 → 최대 → 0 (일출~일몰)
    // 밤에는 음수 (수평선 아래)
    const sunAltitude = Math.sin(dayAngle) * maxAltitude;

    // 단순한 동-서 이동 (x축 방향)
    // 동(+x) → 서(-x)로 직선 이동
    const sunX = Math.cos(dayAngle) * sunDist;

    // 고도에 따른 높이 (y축)
    const sunY = Math.sin(degToRad(Math.max(sunAltitude, -30))) * sunDist;

    // 남쪽으로 약간 치우침 (z축) - 남중 시 최대
    const sunZ = -Math.abs(Math.sin(dayAngle)) * 8;

    const isDay = sunAltitude > -5; // 박명 포함
    const isDawn = sunAltitude > -10 && sunAltitude < 10;
    const skyBrightness = Math.max(0, Math.min(1, (sunAltitude + 10) / 40));

    // 하늘 색상 계산
    const getSkyColor = () => {
        if (sunAltitude < -10) return new THREE.Color(0.01, 0.01, 0.04); // 깊은 밤
        if (sunAltitude < 0) {
            // 박명 (여명/황혼)
            const t = (sunAltitude + 10) / 10;
            return new THREE.Color(
                0.1 + t * 0.3,
                0.05 + t * 0.15,
                0.1 + t * 0.2
            );
        }
        if (sunAltitude < 20) {
            // 일출/일몰 직후
            const t = sunAltitude / 20;
            return new THREE.Color(
                0.4 - t * 0.2,
                0.2 + t * 0.3,
                0.3 + t * 0.5
            );
        }
        // 낮
        return new THREE.Color(0.2 * skyBrightness, 0.5 * skyBrightness, 0.9 * skyBrightness);
    };

    return (
        <group>
            {/* 하늘 반구 */}
            <mesh>
                <sphereGeometry args={[100, 32, 32]} />
                <meshBasicMaterial color={getSkyColor()} side={THREE.BackSide} />
            </mesh>

            {/* 별 (밤과 박명에 보임) */}
            {sunAltitude < 10 && (
                <mesh>
                    <sphereGeometry args={[99, 32, 32]} />
                    <meshBasicMaterial
                        map={starMap}
                        side={THREE.BackSide}
                        transparent
                        opacity={Math.max(0, 1 - (sunAltitude + 10) / 20)}
                    />
                </mesh>
            )}

            {/* 태양 궤적 (반투명 호) */}
            <SunTrajectoryLine maxAltitude={maxAltitude} sunDist={sunDist} />

            {/* 수평선 강조 링 */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
                <ringGeometry args={[38, 42, 64]} />
                <meshBasicMaterial color="#fbbf24" opacity={0.15} transparent />
            </mesh>

            {/* 태양 */}
            <mesh position={[sunX, sunY, sunZ]}>
                <sphereGeometry args={[2.5, 32, 32]} />
                <meshBasicMaterial map={sunMap} />
                <pointLight intensity={isDay ? 2.5 : 0.3} distance={100} color="#fbbf24" />
            </mesh>

            {/* 태양 위치 라벨 */}
            <Html position={[sunX, sunY + 4, sunZ]} center>
                <div style={{
                    color: '#fbbf24',
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                    background: 'rgba(0,0,0,0.6)',
                    padding: '3px 8px',
                    borderRadius: 4,
                    whiteSpace: 'nowrap',
                }}>
                    ☀️ 고도 {sunAltitude.toFixed(0)}°
                    {sunAltitude <= 0 && ' (수평선 아래)'}
                </div>
            </Html>

            {/* 지표면 */}
            <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[60, 64]} />
                <meshStandardMaterial
                    color={isDay ? '#4a7a2e' : '#1a3010'}
                    roughness={0.9}
                    emissive="#1a2810"
                    emissiveIntensity={0.3}
                />
            </mesh>

            {/* 지평선 표시 - 항상 보이게 */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.4, 0]}>
                <ringGeometry args={[58, 60, 64]} />
                <meshBasicMaterial color="#3a5a2a" />
            </mesh>

            {/* 지표면 그리드 - 항상 표시하여 공간감 유지 */}
            <gridHelper
                args={[100, 20, '#2a4a1a', '#1a3a10']}
                position={[0, -0.3, 0]}
            />

            {/* 방위 표시 - 수평선 높이에 */}
            <Html position={[45, 2, 0]} center>
                <div style={{ color: '#4ade80', fontSize: '1rem', fontWeight: 'bold', background: 'rgba(0,0,0,0.6)', padding: '4px 12px', borderRadius: 6 }}>
                    동(E) 🌅
                </div>
            </Html>
            <Html position={[-45, 2, 0]} center>
                <div style={{ color: '#f59e0b', fontSize: '1rem', fontWeight: 'bold', background: 'rgba(0,0,0,0.6)', padding: '4px 12px', borderRadius: 6 }}>
                    🌇 서(W)
                </div>
            </Html>
            <Html position={[0, 2, -45]} center>
                <div style={{ color: '#818cf8', fontSize: '1rem', fontWeight: 'bold', background: 'rgba(0,0,0,0.6)', padding: '4px 12px', borderRadius: 6 }}>
                    남(S)
                </div>
            </Html>
            <Html position={[0, 2, 45]} center>
                <div style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 'bold', background: 'rgba(0,0,0,0.6)', padding: '4px 10px', borderRadius: 6 }}>
                    북(N)
                </div>
            </Html>

            {/* 환경광 - 밤에도 충분한 조명 유지 */}
            <ambientLight intensity={isDay ? 0.5 : 0.4} />
            <hemisphereLight args={['#87CEEB', '#3a5a2a', isDay ? 0.3 : 0.2]} />

            {/* 달빛 효과 (밤) */}
            {!isDay && (
                <directionalLight position={[20, 40, 20]} intensity={0.3} color="#c0d0ff" />
            )}

            {/* 낮 태양광 */}
            {isDay && (
                <directionalLight
                    position={[sunX * 0.5, Math.max(sunY, 5), sunZ * 0.5]}
                    intensity={0.8}
                    color="#ffeedd"
                />
            )}
        </group>
    );
}

/* 태양 궤적 선 - 동(+x)에서 서(-x)로 반원 호 */
function SunTrajectoryLine({ maxAltitude, sunDist }: { maxAltitude: number; sunDist: number }) {
    const points = useMemo(() => {
        const pts: THREE.Vector3[] = [];
        // 일출(동)에서 일몰(서)까지의 궤적: dayAngle 0 ~ π
        for (let i = 0; i <= 50; i++) {
            const dayAngle = (i / 50) * Math.PI; // 0 ~ π

            // 동-서 이동 (x축)
            const x = Math.cos(dayAngle) * sunDist;

            // 고도 (y축)
            const altitude = Math.sin(dayAngle) * maxAltitude;
            const y = Math.sin(degToRad(altitude)) * sunDist;

            // 남쪽 치우침 (z축)
            const z = -Math.abs(Math.sin(dayAngle)) * 8;

            pts.push(new THREE.Vector3(x, y, z));
        }
        return pts;
    }, [maxAltitude, sunDist]);

    const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);

    return (
        <line>
            <bufferGeometry attach="geometry" {...geometry} />
            <lineBasicMaterial color="#fbbf24" opacity={0.3} transparent linewidth={2} />
        </line>
    );
}

function CompassHUD() {
    return (
        <div style={{
            position: 'relative', margin: '8px auto', width: 80, height: 80,
            borderRadius: '50%', border: '2px solid var(--border-subtle)',
            background: 'var(--bg-glass)', backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.65rem', color: 'var(--text-muted)',
        }}>
            <div style={{ position: 'absolute', top: 4, fontWeight: 700, color: '#ef4444' }}>N</div>
            <div style={{ position: 'absolute', bottom: 4 }}>S</div>
            <div style={{ position: 'absolute', left: 6 }}>W</div>
            <div style={{ position: 'absolute', right: 6 }}>E</div>
            <div style={{ fontSize: '1.2rem' }}>🧭</div>
        </div>
    );
}

export default function DayNight() {
    const [viewMode, setViewMode] = useState<'space' | 'observer'>('space');
    const timeValue = useAppStore((s) => s.timeValue);
    const isPlaying = useAppStore((s) => s.isPlaying);
    const speed = useAppStore((s) => s.speed);
    const setTimeValue = useAppStore((s) => s.setTimeValue);

    // 낮 상태로 시작 (0.5 = 정오)
    useEffect(() => {
        setTimeValue(0.5);
    }, []);

    // 관측자 시점 전환 시 일출 시점(~6시=0.25)으로 설정하여 동쪽에서 태양이 뜨는 장면부터 시작
    useEffect(() => {
        if (viewMode === 'observer') {
            setTimeValue(0.25); // 6시 = 일출
        }
    }, [viewMode]);

    const rotationAngle = timeValue * Math.PI * 2;
    const hourOfDay = Math.round(timeValue * 24);

    const { dayRegions, nightRegions } = getDayNightRegions(rotationAngle);

    const AutoAdvance = () => {
        useFrame((_, delta) => {
            if (isPlaying) {
                setTimeValue((prev: number) => {
                    const newVal = prev + delta * speed * 0.02;
                    return newVal > 1 ? newVal - 1 : newVal;
                });
            }
        });
        return null;
    };

    return (
        <SimLayout>
            <SimStage>
                {viewMode === 'space' ? (
                    <Canvas
                        camera={{ position: [0, 10, 15], fov: 50 }}
                        style={{ background: '#0a0e1a' }}
                    >
                        <AutoAdvance />
                        <SunLight />
                        <StarfieldBg />
                        <EarthWithTerminator rotationAngle={rotationAngle} />
                        <SunIndicator />
                        <OrbitControls enablePan={false} minDistance={5} maxDistance={50} />
                    </Canvas>
                ) : (
                    <Canvas
                        camera={{ position: [0, 3, -8], fov: 75 }}
                        style={{ background: '#0a0e1a' }}
                    >
                        <AutoAdvance />
                        <ObserverScene rotationAngle={rotationAngle} />
                        {/* 초기에 동쪽(+x)을 바라보도록 target 설정 */}
                        <ObserverCameraController />
                        <OrbitControls
                            enablePan={false}
                            minDistance={0.5}
                            maxDistance={10}
                            enableZoom={true}
                            minPolarAngle={Math.PI * 0.05}
                            maxPolarAngle={Math.PI * 0.65}
                            target={[20, 10, 0]}
                        />
                    </Canvas>
                )}

            <SimStageControls>
                <div className="scale-toggle">
                    <button className={`scale-btn ${viewMode === 'space' ? 'active' : ''}`} onClick={() => setViewMode('space')}>
                        🛸 우주 시점
                    </button>
                    <button className={`scale-btn ${viewMode === 'observer' ? 'active' : ''}`} onClick={() => setViewMode('observer')}>
                        👤 관측자 시점 (지표면)
                    </button>
                </div>
            </SimStageControls>
            </SimStage>


            <SimInspector
                title="🌓 자전과 일주 운동"
                sections={[
                    {
                        id: 'info', label: '정보', content: (
                            <>
                                <p style={{ marginBottom: 12 }}>
                                    지구는 하루에 한 바퀴 자전합니다. 자전 때문에 태양과 별이 동쪽에서 떠서 서쪽으로 지는 것처럼 보입니다.
                                </p>
                                <StatRow label="현재 시각 (약)" value={`${hourOfDay}:00`} />
                                <StatRow label="자전 각도" value={`${Math.round(timeValue * 360)}°`} />
                                <StatRow label="자전축 기울기" value="23.44°" />

                                {viewMode === 'observer' && (
                                    <div style={{ marginTop: 12, borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                                            💡 <strong>관측자 시점:</strong> 지표면에서 하늘을 바라보고 있습니다.
                                            태양이 동쪽에서 떠서 남쪽을 지나 서쪽으로 지는 모습을 관찰하세요.
                                            마우스로 시점을 자유롭게 움직여보세요!
                                        </p>
                                    </div>
                                )}
                            </>
                        ),
                    },
                    {
                        id: 'regions', label: '지역', content: (
                            <>
                                <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#fbbf24', marginBottom: 6 }}>
                                    🌍 대륙별 낮/밤 상태
                                </div>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.65rem', color: '#fbbf24', marginBottom: 4 }}>☀️ 낮 지역</div>
                                        {dayRegions.map(r => (
                                            <div key={r} style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{r}</div>
                                        ))}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.65rem', color: '#818cf8', marginBottom: 4 }}>🌙 밤 지역</div>
                                        {nightRegions.map(r => (
                                            <div key={r} style={{ fontSize: '0.65rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{r}</div>
                                        ))}
                                    </div>
                                </div>
                                {viewMode === 'observer' && <CompassHUD />}
                            </>
                        ),
                    },
                ]}
            />

            <SimDock
                play={{ playing: isPlaying, onToggle: () => useAppStore.getState().togglePlaying() }}
                speed={{ value: speed, onCycle: () => useAppStore.getState().cycleSpeed() }}
                slider={{
                    label: '시각', min: 0, max: 1, step: 0.001, value: timeValue,
                    onChange: setTimeValue, display: `${hourOfDay}:00`,
                }}
            >
                <button className="control-btn" style={{ width: 44 }} onClick={() => setTimeValue((p: number) => (p - 1 / 24 < 0 ? p - 1 / 24 + 1 : p - 1 / 24))} title="-1시간">
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>-1H</span>
                </button>
                <button className="control-btn" style={{ width: 44 }} onClick={() => setTimeValue((p: number) => (p + 1 / 24 > 1 ? p + 1 / 24 - 1 : p + 1 / 24))} title="+1시간">
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>+1H</span>
                </button>
            </SimDock>
        </SimLayout>
    );
}
