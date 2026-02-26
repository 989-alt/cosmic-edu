import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, useTexture } from '@react-three/drei';
import { useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { degToRad } from '../../utils/mathUtils';
import InfoPanel, { StatRow } from '../../components/InfoPanel';
import { useAppStore } from '../../store/appStore';
import { getTexturePath } from '../../utils/texturePaths';

function HeatmapEarth({ axialTilt, orbitalAngle }: { axialTilt: number; orbitalAngle: number }) {
    const earthRef = useRef<THREE.Group>(null);
    const tiltRad = degToRad(axialTilt);
    const earthMap = useTexture(getTexturePath('earthDay'));

    const texture = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 128;
        const ctx = canvas.getContext('2d')!;

        const subsolarLat = axialTilt * Math.sin(orbitalAngle);

        for (let y = 0; y < 128; y++) {
            const lat = 90 - (y / 128) * 180;
            const dist = Math.abs(lat - subsolarLat);
            const heat = Math.max(0, 1 - dist / 90);

            const r = Math.round(heat * 255);
            const g = Math.round(heat * 60);
            const b = Math.round((1 - heat) * 200);

            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.55)`;
            ctx.fillRect(0, y, 256, 1);
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.needsUpdate = true;
        return tex;
    }, [axialTilt, orbitalAngle]);

    useFrame((_, delta) => {
        if (earthRef.current) {
            earthRef.current.rotation.y += delta * 0.5;
        }
    });

    return (
        <group rotation={[0, 0, tiltRad]}>
            <group ref={earthRef}>
                <mesh>
                    <sphereGeometry args={[3, 64, 64]} />
                    <meshStandardMaterial map={earthMap} roughness={0.8} />
                </mesh>
                <mesh>
                    <sphereGeometry args={[3.02, 64, 64]} />
                    <meshBasicMaterial map={texture} transparent={true} depthWrite={false} />
                </mesh>
            </group>
            {/* Axis */}
            <mesh>
                <cylinderGeometry args={[0.03, 0.03, 8, 8]} />
                <meshBasicMaterial color="#ef4444" opacity={0.6} transparent />
            </mesh>
        </group>
    );
}

/* 우주 배경 */
function StarfieldBg() {
    const starMap = useTexture(getTexturePath('starfield'));
    return (
        <mesh>
            <sphereGeometry args={[200, 32, 32]} />
            <meshBasicMaterial map={starMap} side={THREE.BackSide} />
        </mesh>
    );
}

/* 태양: 중심에 고정 */
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

/* 지구가 태양 주위를 공전하는 구조 */
function OrbitingScene({ axialTilt, orbitalAngle }: { axialTilt: number; orbitalAngle: number }) {
    const orbitRadius = 20;
    const x = Math.cos(orbitalAngle) * orbitRadius;
    const z = Math.sin(orbitalAngle) * orbitRadius;

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
            {/* 궤도선 */}
            <line>
                <bufferGeometry attach="geometry" {...orbitGeo} />
                <lineBasicMaterial color="#3b82f6" opacity={0.2} transparent />
            </line>

            {/* 지구: 궤도 위를 이동 */}
            <group position={[x, 0, z]}>
                <HeatmapEarth axialTilt={axialTilt} orbitalAngle={orbitalAngle} />
                <Html position={[0, 5, 0]} center style={{ whiteSpace: 'nowrap' }}>
                    <div style={{
                        color: 'var(--text-primary)', fontSize: '0.75rem', fontFamily: 'var(--font-sans)',
                        background: 'var(--bg-glass)', padding: '3px 8px', borderRadius: 4,
                        whiteSpace: 'nowrap',
                    }}>
                        지구 (기울기 {axialTilt.toFixed(1)}°)
                    </div>
                </Html>
            </group>
        </group>
    );
}

function getCatastropheText(tilt: number): string {
    if (tilt <= 10) return '⚠️ 기울기 10° 이하: 계절 변화가 거의 없습니다. 적도~온대 기후 차이가 줄어듭니다.';
    if (tilt <= 25) return '✅ 현재 지구(23.44°): 온화한 사계절이 존재합니다.';
    if (tilt <= 35) return '⚠️ 30° 전후: 여름과 겨울 기온차가 더 심해지며, 극지방 빙하가 계절에 따라 크게 녹았다 얼었다를 반복합니다.';
    if (tilt <= 50) return '🔶 40~50°: 여름 적도까지 백야가 나타나고, 겨울에는 중위도에서도 극야가 발생합니다. 농업이 어려워지기 시작합니다.';
    if (tilt <= 65) return '🔴 50~65°: 생태계 대규모 붕괴. 대부분 지역에서 농업 불가능. 극심한 폭풍과 기온 변동으로 문명 유지 곤란.';
    if (tilt <= 80) return '🔴 65~80°: 한쪽 반구가 수개월간 태양을 전혀 못 보는 극야 발생. 해양 순환 교란, 대멸종 가능성.';
    return '💀 80~90°: 천왕성과 유사. 한 반구가 6개월 연속 태양을 향해 타고, 반대 반구는 6개월 암흑. 지구에 생명체 존재 불가능.';
}

export default function AxisImpact() {
    const [axialTilt, setAxialTilt] = useState(23.44);
    const timeValue = useAppStore((s) => s.timeValue);
    const isPlaying = useAppStore((s) => s.isPlaying);
    const speed = useAppStore((s) => s.speed);
    const setTimeValue = useAppStore((s) => s.setTimeValue);
    const orbitalAngle = timeValue * Math.PI * 2;

    const subsolarLat = axialTilt * Math.sin(orbitalAngle);
    const seasonLabel = subsolarLat > 10 ? '북반구 여름' : subsolarLat < -10 ? '북반구 겨울' : '봄/가을';

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
        <>
            <Canvas camera={{ position: [0, 25, 35], fov: 50 }} style={{ background: '#0a0e1a' }}>
                <AutoAdvance />
                <ambientLight intensity={0.4} />
                <StarfieldBg />
                <SunCenter />
                <OrbitingScene axialTilt={axialTilt} orbitalAngle={orbitalAngle} />
                <OrbitControls enablePan={false} maxDistance={60} minDistance={10} />
            </Canvas>

            {/* Controls */}
            <div style={{
                position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
                background: 'var(--bg-glass)', backdropFilter: 'blur(12px)',
                border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xl)',
                padding: '12px 24px', zIndex: 50, display: 'flex', alignItems: 'center', gap: 16,
            }}>
                <button className={`control-btn ${isPlaying ? 'active' : ''}`} onClick={() => useAppStore.getState().togglePlaying()}>
                    {isPlaying ? '⏸' : '▶'}
                </button>
                <button className="control-btn" onClick={() => useAppStore.getState().cycleSpeed()}>
                    <span className="speed-label">×{speed}</span>
                </button>
                <div className="slider-container">
                    <span className="slider-label">자전축 기울기: {axialTilt.toFixed(1)}°</span>
                    <input type="range" className="slider-input" style={{ width: 160 }}
                        min={0} max={90} step={0.5}
                        value={axialTilt} onChange={(e) => setAxialTilt(parseFloat(e.target.value))} />
                </div>
                <div className="slider-container">
                    <span className="slider-label">공전 위치</span>
                    <input type="range" className="slider-input" style={{ width: 120 }}
                        min={0} max={1} step={0.001}
                        value={timeValue} onChange={(e) => setTimeValue(parseFloat(e.target.value))} />
                </div>
            </div>

            {/* Quick presets */}
            <div style={{
                position: 'absolute', top: 16, left: 16, zIndex: 40,
                display: 'flex', flexWrap: 'wrap', gap: 6, maxWidth: 360
            }}>
                <button className="sub-module-btn" onClick={() => setAxialTilt(0)}>0° 계절없음</button>
                <button className="sub-module-btn" onClick={() => setAxialTilt(23.44)}>23.44° 실제</button>
                <button className="sub-module-btn" onClick={() => setAxialTilt(45)}>45° 극단</button>
                <button className="sub-module-btn" onClick={() => setAxialTilt(90)}>90° 천왕성</button>
            </div>

            <InfoPanel title="🌐 자전축 임팩트 뷰어">
                <p style={{ marginBottom: 12 }}>
                    자전축의 기울기를 변경하면 지구 표면에 도달하는 태양 에너지 분포가 달라집니다.
                    🔴빨간색은 여름(에너지 집중), 🔵파란색은 겨울(에너지 분산)입니다.
                </p>
                <StatRow label="자전축 기울기" value={`${axialTilt.toFixed(1)}°`} />
                <StatRow label="태양 직사 위도" value={`${subsolarLat.toFixed(1)}°`} />
                <StatRow label="현재 계절" value={seasonLabel} />

                <div style={{ marginTop: 12, borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
                        <strong>💡 종합:</strong> 자전축 기울기 → 남중 고도 변화 → 에너지 밀도 변화 → 기온 변화.
                        이것이 계절이 생기는 근본 원인입니다!
                    </p>
                </div>

                <div style={{ marginTop: 12, borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#fbbf24', marginBottom: 6 }}>
                        🌡️ 기울기 변화에 따른 재앙 단계
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        {getCatastropheText(axialTilt)}
                    </p>
                </div>
            </InfoPanel>
        </>
    );
}
