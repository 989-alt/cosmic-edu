import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, useTexture } from '@react-three/drei';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { degToRad } from '../../utils/mathUtils';
import { useAppStore } from '../../store/appStore';
import { getTexturePath } from '../../utils/texturePaths';
import { monthlyData } from '../../data/shadowLabData';
import { SimLayout, SimStage, SimStageControls, SimDock, SimInspector, StatRow } from '../../components/SimLayout';

const SEASONS = [
    { name: '춘분 (3월)', angle: 0, date: '3/21', month: 3 },
    { name: '하지 (6월)', angle: Math.PI / 2, date: '6/21', month: 6 },
    { name: '추분 (9월)', angle: Math.PI, date: '9/23', month: 9 },
    { name: '동지 (12월)', angle: (3 * Math.PI) / 2, date: '12/22', month: 12 },
];

function getSeasonDetails(timeValue: number) {
    const dayOfYear = Math.round(timeValue * 365);
    const month = Math.ceil(((dayOfYear % 365) / 365) * 12) || 1;
    const clampedMonth = Math.max(1, Math.min(12, month));
    const data = monthlyData[clampedMonth - 1];

    let seasonName = '봄';
    let emoji = '🌸';
    let color = '#f472b6';
    if (clampedMonth >= 6 && clampedMonth <= 8) { seasonName = '여름'; emoji = '☀️'; color = '#ef4444'; }
    else if (clampedMonth >= 9 && clampedMonth <= 11) { seasonName = '가을'; emoji = '🍂'; color = '#f59e0b'; }
    else if (clampedMonth >= 12 || clampedMonth <= 2) { seasonName = '겨울'; emoji = '❄️'; color = '#3b82f6'; }

    // 자전축이 태양을 향하는 정도 (양수: 북반구 여름, 음수: 북반구 겨울)
    const tiltTowardSun = 23.44 * Math.sin(timeValue * Math.PI * 2);

    return {
        month: clampedMonth,
        seasonName, emoji, color,
        meridianAltitude: data.meridianAltitude,
        dayLength: data.dayLength,
        avgTemperature: data.avgTemperature,
        tiltTowardSun,
        dayOfYear,
    };
}

function SunCenter() {
    const sunMap = useTexture(getTexturePath('sun'));
    return (
        <mesh>
            <sphereGeometry args={[4, 32, 32]} />
            <meshBasicMaterial map={sunMap} />
            <pointLight intensity={2} distance={100} color="#fbbf24" />
        </mesh>
    );
}

function OrbitingEarth({ orbitalAngle, tiltTowardSun, onClick }: { orbitalAngle: number; tiltTowardSun: number, onClick: () => void }) {
    const earthRef = useRef<THREE.Mesh>(null);
    const earthMap = useTexture(getTexturePath('earthDay'));
    const orbitRadius = 25;
    const x = Math.cos(orbitalAngle) * orbitRadius;
    const z = Math.sin(orbitalAngle) * orbitRadius;

    useFrame((_, delta) => {
        if (earthRef.current) {
            earthRef.current.rotation.y += delta * 2;
        }
    });

    const orbitPoints = useMemo(() => {
        const pts: THREE.Vector3[] = [];
        for (let i = 0; i <= 128; i++) {
            const a = (i / 128) * Math.PI * 2;
            pts.push(new THREE.Vector3(Math.cos(a) * orbitRadius, 0, Math.sin(a) * orbitRadius));
        }
        return pts;
    }, []);
    const orbitGeo = useMemo(() => new THREE.BufferGeometry().setFromPoints(orbitPoints), [orbitPoints]);

    return (
        <group>
            <line>
                <bufferGeometry attach="geometry" {...orbitGeo} />
                <lineBasicMaterial color="#3b82f6" opacity={0.3} transparent />
            </line>

            <group position={[x, 0, z]}>
                <group rotation={[0, 0, degToRad(23.44)]}>
                    <mesh ref={earthRef} onClick={(e) => { e.stopPropagation(); onClick(); }} onPointerEnter={() => document.body.style.cursor = 'pointer'} onPointerLeave={() => document.body.style.cursor = 'auto'}>
                        <sphereGeometry args={[1.5, 32, 32]} />
                        <meshStandardMaterial map={earthMap} roughness={0.7} />
                    </mesh>
                    {/* 자전축 */}
                    <mesh>
                        <cylinderGeometry args={[0.02, 0.02, 5, 8]} />
                        <meshBasicMaterial color="#ef4444" opacity={0.5} transparent />
                    </mesh>
                    {/* 자전축 레이블 */}
                    <Html position={[0, 3, 0]} center>
                        <div style={{ color: '#ef4444', fontSize: '0.55rem', whiteSpace: 'nowrap' }}>자전축 23.44°</div>
                    </Html>
                </group>

                <Html position={[0, -2.5, 0]} center>
                    <div style={{ color: '#4a90d9', fontSize: '0.7rem', fontFamily: 'var(--font-sans)' }}>지구</div>
                </Html>
            </group>

            {SEASONS.map((s) => {
                const sx = Math.cos(s.angle) * (orbitRadius + 3);
                const sz = Math.sin(s.angle) * (orbitRadius + 3);
                return (
                    <Html key={s.name} position={[sx, 1, sz]} center>
                        <div style={{
                            color: 'var(--text-muted)', fontSize: '0.65rem', fontFamily: 'var(--font-sans)',
                            background: 'var(--bg-glass)', padding: '2px 8px', borderRadius: 4,
                            whiteSpace: 'nowrap',
                        }}>
                            {s.name}
                        </div>
                    </Html>
                );
            })}
        </group>
    );
}

function StarfieldBg() {
    const starMap = useTexture(getTexturePath('starfield'));
    return (
        <mesh>
            <sphereGeometry args={[300, 32, 32]} />
            <meshBasicMaterial map={starMap} side={THREE.BackSide} />
        </mesh>
    );
}

/* 낮/밤 비율 미니 차트 */
function DayNightMiniChart({ dayLength }: { dayLength: number }) {
    const dayFrac = dayLength / 24;
    const dayDeg = dayFrac * 360;
    return (
        <div style={{
            width: 50, height: 50, borderRadius: '50%',
            background: `conic-gradient(#fbbf24 0deg, #fbbf24 ${dayDeg}deg, #1e293b ${dayDeg}deg)`,
            border: '2px solid rgba(255,255,255,0.15)',
        }}>
            <div style={{
                position: 'absolute', width: 50, height: 50,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.5rem', color: 'white',
            }}>
                {dayLength.toFixed(1)}h
            </div>
        </div>
    );
}

export default function Revolution() {
    const timeValue = useAppStore((s) => s.timeValue);
    const isPlaying = useAppStore((s) => s.isPlaying);
    const speed = useAppStore((s) => s.speed);
    const setTimeValue = useAppStore((s) => s.setTimeValue);
    const orbitalAngle = timeValue * Math.PI * 2;
    const controlsRef = useRef<any>(null);

    const [spaceHeld, setSpaceHeld] = useState(false);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => { if (e.code === 'Space') { e.preventDefault(); setSpaceHeld(true); } };
        const onKeyUp = (e: KeyboardEvent) => { if (e.code === 'Space') setSpaceHeld(false); };
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); };
    }, []);

    const handleEarthClick = useCallback(() => {
        if (!controlsRef.current) return;
        const controls = controlsRef.current;
        const target = new THREE.Vector3(Math.cos(orbitalAngle) * 25, 0, Math.sin(orbitalAngle) * 25);
        const camOffset = new THREE.Vector3(target.x, 8, target.z + 15);

        const startTarget = controls.target.clone();
        const startPos = controls.object.position.clone();
        let progress = 0;
        const animate = () => {
            progress += 0.04;
            if (progress >= 1) progress = 1;
            const t = 1 - Math.pow(1 - progress, 3);
            controls.target.lerpVectors(startTarget, target, t);
            controls.object.position.lerpVectors(startPos, camOffset, t);
            controls.update();
            if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }, [orbitalAngle]);

    const details = getSeasonDetails(timeValue);

    const AutoAdvance = () => {
        useFrame((_, delta) => {
            if (isPlaying) {
                setTimeValue((prev: number) => {
                    const newVal = prev + delta * speed * 0.005;
                    return newVal > 1 ? newVal - 1 : newVal;
                });
            }
        });
        return null;
    };

    return (
        <SimLayout>
            <SimStage>
                <Canvas camera={{ position: [0, 40, 40], fov: 50 }} style={{ background: '#0a0e1a' }}>
                    <AutoAdvance />
                    <ambientLight intensity={0.4} />
                    <StarfieldBg />
                    <SunCenter />
                    <OrbitingEarth orbitalAngle={orbitalAngle} tiltTowardSun={details.tiltTowardSun} onClick={handleEarthClick} />
                    <OrbitControls
                        ref={controlsRef}
                        enablePan={spaceHeld}
                        maxDistance={80}
                        minDistance={10}
                        mouseButtons={{
                            LEFT: spaceHeld ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE,
                            MIDDLE: THREE.MOUSE.DOLLY,
                            RIGHT: THREE.MOUSE.PAN,
                        }}
                    />
                </Canvas>

            <SimStageControls>
                <button className="sub-module-btn" onClick={handleEarthClick} style={{ fontSize: '0.75rem', background: 'var(--accent-primary)', color: 'white' }}>
                    🌍 지구 추적
                </button>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                    💡 스페이스바+드래그로 맵 이동
                </div>
            </SimStageControls>
            </SimStage>


            <SimInspector
                title={`${details.emoji} ${details.month}월 — ${details.seasonName}`}
                sections={[
                    {
                        id: 'info', label: '설명', content: (
                            <>
                                {/* 인과관계 시각화 */}
                                <div style={{
                                    background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 12, marginBottom: 12,
                                    fontSize: '0.75rem', lineHeight: 1.8,
                                }}>
                                    <div style={{ color: '#fbbf24', fontWeight: 'bold', marginBottom: 8 }}>🔗 계절 변화의 인과관계</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <div style={{ color: 'var(--text-primary)' }}>
                                            1️⃣ 자전축이 태양 쪽으로 <span style={{ color: details.tiltTowardSun >= 0 ? '#ef4444' : '#3b82f6', fontWeight: 'bold' }}>
                                                {details.tiltTowardSun >= 0 ? `기울어짐 (+${details.tiltTowardSun.toFixed(1)}°)` : `반대쪽으로 기울어짐 (${details.tiltTowardSun.toFixed(1)}°)`}
                                            </span>
                                        </div>
                                        <div style={{ color: 'var(--text-muted)', textAlign: 'center' }}>↓</div>
                                        <div style={{ color: 'var(--text-primary)' }}>
                                            2️⃣ 남중 고도 = <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>{details.meridianAltitude}°</span>
                                            {details.meridianAltitude >= 60 ? ' (높음 → 빛이 집중)' : details.meridianAltitude <= 40 ? ' (낮음 → 빛이 분산)' : ' (중간)'}
                                        </div>
                                        <div style={{ color: 'var(--text-muted)', textAlign: 'center' }}>↓</div>
                                        <div style={{ color: 'var(--text-primary)' }}>
                                            3️⃣ 낮의 길이 = <span style={{ color: '#818cf8', fontWeight: 'bold' }}>{details.dayLength}시간</span>
                                            {details.dayLength >= 13 ? ' (길다 → 열 흡수↑)' : details.dayLength <= 11 ? ' (짧다 → 열 흡수↓)' : ''}
                                        </div>
                                        <div style={{ color: 'var(--text-muted)', textAlign: 'center' }}>↓</div>
                                        <div style={{ color: 'var(--text-primary)' }}>
                                            4️⃣ 평균 기온 = <span style={{
                                                color: details.avgTemperature >= 20 ? '#ef4444' : details.avgTemperature <= 5 ? '#3b82f6' : '#fbbf24',
                                                fontWeight: 'bold', fontSize: '1rem'
                                            }}>{details.avgTemperature}°C</span>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ marginTop: 12, borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
                                        <strong>💡 핵심 요약:</strong> 계절이 변하는 이유는{' '}
                                        <strong style={{ color: '#ef4444' }}>지구의 자전축이 23.44° 기울어져 있기 때문</strong>입니다.
                                        자전축의 방향은 공전 중 변하지 않으므로, 공전 위치에 따라 태양빛을 받는 각도가 달라집니다.
                                        여름에는 남중 고도가 높아 좁은 면적에 빛이 집중되고 낮이 길어 기온이 올라갑니다.
                                        겨울에는 그 반대입니다.
                                    </p>
                                </div>
                            </>
                        ),
                    },
                    {
                        id: 'stats', label: '수치', content: (
                            <>
                                <StatRow label="경과 일수" value={`${details.dayOfYear}일 / 365일`} />
                                <StatRow label="현재 계절" value={`${details.emoji} ${details.seasonName}`} />
                                <StatRow label="공전 각도" value={`${Math.round(timeValue * 360)}°`} />
                                <StatRow label="자전축 기울기" value="23.44°" />
                                <StatRow label="공전 주기" value="365.25일" />
                            </>
                        ),
                    },
                ]}
            />

            <SimDock
                play={{ playing: isPlaying, onToggle: () => useAppStore.getState().togglePlaying() }}
                speed={{ value: speed, onCycle: () => useAppStore.getState().cycleSpeed() }}
                slider={{
                    label: '공전 위치', min: 0, max: 1, step: 0.001, value: timeValue,
                    onChange: setTimeValue,
                }}
                presets={SEASONS.map((s, i) => ({
                    label: `${s.date} ${s.name.split(' ')[0]}`,
                    onClick: () => setTimeValue(i * 0.25),
                }))}
            />
        </SimLayout>
    );
}
