import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, useTexture } from '@react-three/drei';
import { useRef } from 'react';
import * as THREE from 'three';
import { getMoonPhaseForDay, getMoonAngleForDay, getMoonIlluminationForDay } from '../../data/moonPhases';
import InfoPanel, { StatRow } from '../../components/InfoPanel';
import { useAppStore } from '../../store/appStore';
import { degToRad } from '../../utils/mathUtils';
import { getTexturePath } from '../../utils/texturePaths';
import MoonPhase2D from '../../components/MoonPhase2D';

function Sun() {
    const sunMap = useTexture(getTexturePath('sun'));
    return (
        <mesh position={[30, 0, 0]}>
            <sphereGeometry args={[3, 32, 32]} />
            <meshBasicMaterial map={sunMap} />
            <pointLight intensity={2} distance={100} color="#fbbf24" />
        </mesh>
    );
}

function Earth() {
    const earthMap = useTexture(getTexturePath('earthDay'));
    return (
        <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[2, 32, 32]} />
            <meshStandardMaterial map={earthMap} roughness={0.8} />
        </mesh>
    );
}

function Moon({ lunarDay }: { lunarDay: number }) {
    const meshRef = useRef<THREE.Mesh>(null);
    const moonMap = useTexture(getTexturePath('moon'));
    const angle = degToRad(getMoonAngleForDay(lunarDay));
    const orbitRadius = 8;
    const x = Math.cos(angle) * orbitRadius;
    const z = Math.sin(angle) * orbitRadius;

    return (
        <group>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[orbitRadius - 0.02, orbitRadius + 0.02, 64]} />
                <meshBasicMaterial color="#ffffff" opacity={0.15} transparent />
            </mesh>
            <mesh ref={meshRef} position={[x, 0, z]}>
                <sphereGeometry args={[0.8, 32, 32]} />
                <meshStandardMaterial map={moonMap} roughness={0.9} />
            </mesh>
            <Html position={[x, 1.5, z]} center>
                <div style={{ color: '#d1d5db', fontSize: '0.7rem', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap' }}>
                    달
                </div>
            </Html>
        </group>
    );
}

function SunLight() {
    return (
        <>
            <directionalLight position={[30, 0, 0]} intensity={1.5} color="#fbbf24" />
            <ambientLight intensity={0.35} />
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

function Scene({ lunarDay }: { lunarDay: number }) {
    const { isPlaying, speed, setTimeValue } = useAppStore();

    useFrame((_, delta) => {
        if (isPlaying) {
            const dayIncrement = delta * speed * 0.5;
            setTimeValue((prev: number) => {
                const newVal = prev + dayIncrement / 30;
                return newVal > 1 ? newVal - 1 : newVal;
            });
        }
    });

    return (
        <group>
            <SunLight />
            <StarfieldBg />
            <Sun />
            <Earth />
            <Moon lunarDay={lunarDay} />
            <Html position={[30, 4, 0]} center>
                <div style={{ color: '#fbbf24', fontSize: '0.75rem', fontFamily: 'var(--font-sans)' }}>태양</div>
            </Html>
            <Html position={[0, 3, 0]} center>
                <div style={{ color: '#4a90d9', fontSize: '0.75rem', fontFamily: 'var(--font-sans)' }}>지구</div>
            </Html>
        </group>
    );
}

export default function MoonPhase() {
    const timeValue = useAppStore((s) => s.timeValue);
    const lunarDay = Math.round(timeValue * 29.5) + 1;
    const phase = getMoonPhaseForDay(lunarDay);
    const illumination = getMoonIlluminationForDay(lunarDay);

    return (
        <>
            <Canvas
                camera={{ position: [0, 20, 25], fov: 50 }}
                style={{ background: '#0a0e1a' }}
            >
                <Scene lunarDay={lunarDay} />
                <OrbitControls enablePan={false} minDistance={10} maxDistance={60} />
            </Canvas>

            <InfoPanel title={`🌙 ${phase.name}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                    <MoonPhase2D illumination={illumination} lunarDay={lunarDay} size={72} />
                    <div>
                        <p style={{ margin: 0, fontSize: '0.8rem' }}>{phase.description}</p>
                        <p style={{ margin: '4px 0 0', fontSize: '0.7rem', color: 'var(--text-muted)' }}>지구에서 본 달의 모습 →</p>
                    </div>
                </div>
                <StatRow label="음력 날짜" value={`${lunarDay}일`} />
                <StatRow label="영어 이름" value={phase.nameEn} />
                <StatRow label="밝기" value={`${Math.round(illumination * 100)}%`} />
                <StatRow label="궤도 각도" value={`${Math.round(getMoonAngleForDay(lunarDay))}°`} />
            </InfoPanel>

            <div style={{
                position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
                background: 'var(--bg-glass)', backdropFilter: 'blur(12px)',
                border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xl)',
                padding: '10px 20px', zIndex: 50, display: 'flex', alignItems: 'center', gap: 12
            }}>
                <MoonPhase2D illumination={illumination} lunarDay={lunarDay} size={40} />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>음력</span>
                <input
                    type="range" min={0} max={1} step={0.001}
                    value={useAppStore.getState().timeValue}
                    onChange={(e) => useAppStore.getState().setTimeValue(parseFloat(e.target.value))}
                    className="slider-input" style={{ width: 200 }}
                />
                <span style={{ fontSize: '0.85rem', color: 'var(--accent-sun)', fontFamily: 'var(--font-mono)', minWidth: 36 }}>
                    {lunarDay}일
                </span>
            </div>
        </>
    );
}
