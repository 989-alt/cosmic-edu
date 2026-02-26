import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, useTexture } from '@react-three/drei';
import { useState, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { degToRad } from '../../utils/mathUtils';
import InfoPanel, { StatRow } from '../../components/InfoPanel';
import { eclipseTypes, eclipseEducation } from '../../data/eclipseData';
import { useAppStore } from '../../store/appStore';
import { getTexturePath } from '../../utils/texturePaths';
import MoonPhase2D from '../../components/MoonPhase2D';
import { getMoonIlluminationForDay } from '../../data/moonPhases';

function SunBody() {
    const sunMap = useTexture(getTexturePath('sun'));
    return (
        <mesh position={[60, 0, 0]}>
            <sphereGeometry args={[8, 64, 64]} />
            <meshBasicMaterial map={sunMap} />
            <pointLight intensity={3} distance={200} color="#fff5e0" />
        </mesh>
    );
}

function EarthBody() {
    const earthMap = useTexture(getTexturePath('earthDay'));
    return (
        <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[2.5, 32, 32]} />
            <meshStandardMaterial map={earthMap} roughness={0.8} />
        </mesh>
    );
}

function MoonOrbit({ lunarDay, orbitTilt, eclipseType }: { lunarDay: number; orbitTilt: number; eclipseType: string | null }) {
    const moonMap = useTexture(getTexturePath('moon'));
    const orbitRadius = 10;
    const angle = degToRad((lunarDay / 30) * 360);
    const tiltRad = degToRad(orbitTilt);

    const x = Math.cos(angle) * orbitRadius;
    const rawZ = Math.sin(angle) * orbitRadius;
    const y = rawZ * Math.sin(tiltRad);
    const z = rawZ * Math.cos(tiltRad);

    const orbitPoints = useMemo(() => {
        const pts: THREE.Vector3[] = [];
        for (let i = 0; i <= 128; i++) {
            const a = (i / 128) * Math.PI * 2;
            const ox = Math.cos(a) * orbitRadius;
            const oRawZ = Math.sin(a) * orbitRadius;
            const oy = oRawZ * Math.sin(tiltRad);
            const oz = oRawZ * Math.cos(tiltRad);
            pts.push(new THREE.Vector3(ox, oy, oz));
        }
        return pts;
    }, [orbitRadius, tiltRad]);

    const orbitGeometry = useMemo(() => {
        return new THREE.BufferGeometry().setFromPoints(orbitPoints);
    }, [orbitPoints]);

    // 블러드문 / 코로나 판정
    const isTotalSolar = eclipseType === 'total-solar';
    const isPartialSolar = eclipseType === 'partial-solar';
    const isTotalLunar = eclipseType === 'total-lunar';
    const isPartialLunar = eclipseType === 'partial-lunar';
    const isLunarEclipse = isTotalLunar || isPartialLunar;
    const isSolarEclipse = isTotalSolar || isPartialSolar;

    // 블러드문: 월식 때 달 색상
    const moonColor = isTotalLunar ? '#8B2500' : isPartialLunar ? '#B8602A' : '#ffffff';
    const moonEmissive = isLunarEclipse ? new THREE.Color(isTotalLunar ? '#8B0000' : '#993300') : undefined;

    // 코로나/링이 카메라를 향하도록 방향 계산
    const coronaRef = useRef<THREE.Group>(null);
    useFrame(({ camera }) => {
        if (coronaRef.current && isSolarEclipse) {
            coronaRef.current.lookAt(camera.position);
        }
    });

    return (
        <group>
            <line>
                <bufferGeometry attach="geometry" {...orbitGeometry} />
                <lineBasicMaterial color="#ffffff" opacity={0.2} transparent />
            </line>
            <mesh position={[x, y, z]}>
                <sphereGeometry args={[0.7, 32, 32]} />
                <meshStandardMaterial
                    map={isLunarEclipse ? undefined : moonMap}
                    color={moonColor}
                    emissive={moonEmissive}
                    emissiveIntensity={isLunarEclipse ? 0.5 : 0}
                    roughness={0.9}
                />
            </mesh>

            {/* 개기일식: 코로나 효과 (카메라를 향하도록) */}
            {isSolarEclipse && (
                <group ref={coronaRef} position={[x, y, z]}>
                    {/* 내부 코로나 */}
                    <mesh>
                        <ringGeometry args={[0.7, 1.4, 64]} />
                        <meshBasicMaterial
                            color="#FFE4B5"
                            opacity={isTotalSolar ? 0.6 : 0.25}
                            transparent
                            side={THREE.DoubleSide}
                        />
                    </mesh>
                    {/* 외부 코로나 */}
                    <mesh>
                        <ringGeometry args={[1.2, 2.5, 64]} />
                        <meshBasicMaterial
                            color="#FFF8DC"
                            opacity={isTotalSolar ? 0.3 : 0.1}
                            transparent
                            side={THREE.DoubleSide}
                        />
                    </mesh>
                    {/* 코로나 광선 (방사형) */}
                    {isTotalSolar && Array.from({ length: 16 }).map((_, i) => {
                        const a = (i / 16) * Math.PI * 2;
                        const len = 1.2 + (i % 3) * 0.4;
                        const startR = 1.3;
                        return (
                            <mesh key={i}
                                position={[Math.cos(a) * (startR + len / 2), Math.sin(a) * (startR + len / 2), 0]}
                                rotation={[0, 0, a + Math.PI / 2]}>
                                <cylinderGeometry args={[0.015, 0.005, len, 4]} />
                                <meshBasicMaterial color="#FFF8DC" opacity={0.3} transparent />
                            </mesh>
                        );
                    })}
                </group>
            )}

            {/* 블러드문 글로우 */}
            {isLunarEclipse && (
                <mesh position={[x, y, z]}>
                    <sphereGeometry args={[0.85, 32, 32]} />
                    <meshBasicMaterial
                        color={isTotalLunar ? '#8B0000' : '#993300'}
                        opacity={isTotalLunar ? 0.35 : 0.15}
                        transparent
                    />
                </mesh>
            )}

            <Html position={[x, y + 1.2, z]} center>
                <div style={{ color: '#d1d5db', fontSize: '0.7rem', fontFamily: 'var(--font-sans)' }}>
                    달{isTotalLunar ? ' 🔴' : isTotalSolar ? ' 👑' : ''}
                </div>
            </Html>
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

function ShadowCones() {
    return (
        <group>
            {/* 반영 (Penumbra) - 넓고 옅은 그림자 */}
            <mesh position={[-15, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <coneGeometry args={[4.5, 30, 32, 1, true]} />
                <meshBasicMaterial color="#3a3a5a" opacity={0.15} transparent side={THREE.DoubleSide} />
            </mesh>
            {/* 본영 (Umbra) - 좁고 진한 그림자 */}
            <mesh position={[-8, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <coneGeometry args={[1.5, 16, 32, 1, true]} />
                <meshBasicMaterial color="#000000" opacity={0.6} transparent side={THREE.DoubleSide} />
            </mesh>
        </group>
    );
}

function detectEclipseType(lunarDay: number, orbitTilt: number): string | null {
    const angle = (lunarDay / 30) * 360;
    const tiltEffect = Math.abs(Math.sin(degToRad(angle)) * orbitTilt);

    if (lunarDay <= 2 || lunarDay >= 29) {
        if (tiltEffect < 1.5) return 'total-solar';
        if (tiltEffect < 3) return 'partial-solar';
        return null;
    }
    if (lunarDay >= 14 && lunarDay <= 16) {
        if (tiltEffect < 1.5) return 'total-lunar';
        if (tiltEffect < 3) return 'partial-lunar';
        return null;
    }
    return null;
}

export default function Eclipse() {
    const [orbitTilt, setOrbitTilt] = useState(5.14);
    const timeValue = useAppStore((s) => s.timeValue);
    const lunarDay = Math.round(timeValue * 29.5) + 1;

    const eclipseType = detectEclipseType(lunarDay, orbitTilt);
    const eclipseInfo = eclipseType ? eclipseTypes.find(e => e.id === eclipseType) : null;

    return (
        <>
            <Canvas camera={{ position: [0, 30, 40], fov: 45 }} style={{ background: '#0a0e1a' }}>
                <ambientLight intensity={0.35} />
                <directionalLight position={[60, 0, 0]} intensity={1.5} color="#fbbf24" />
                <StarfieldBg />
                <SunBody />
                <EarthBody />
                <MoonOrbit lunarDay={lunarDay} orbitTilt={orbitTilt} eclipseType={eclipseType} />
                <ShadowCones />
                <OrbitControls enablePan={false} minDistance={15} maxDistance={100} />

                <Html position={[60, 10, 0]} center>
                    <div style={{ color: '#fbbf24', fontSize: '0.75rem', fontFamily: 'var(--font-sans)' }}>태양</div>
                </Html>
                <Html position={[0, 4, 0]} center>
                    <div style={{ color: '#4a90d9', fontSize: '0.75rem', fontFamily: 'var(--font-sans)' }}>지구</div>
                </Html>
            </Canvas>

            <div style={{
                position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
                background: 'var(--bg-glass)', backdropFilter: 'blur(12px)',
                border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xl)',
                padding: '12px 24px', zIndex: 50, display: 'flex', alignItems: 'center', gap: 20,
            }}>
                <div className="slider-container">
                    <span className="slider-label">음력 날짜: {lunarDay}일</span>
                    <input type="range" className="slider-input" style={{ width: 200 }}
                        min={0} max={1} step={0.001}
                        value={useAppStore.getState().timeValue}
                        onChange={(e) => useAppStore.getState().setTimeValue(parseFloat(e.target.value))} />
                </div>
                <div className="slider-container">
                    <span className="slider-label">달 궤도 기울기: {orbitTilt.toFixed(1)}°</span>
                    <input type="range" className="slider-input" style={{ width: 160 }}
                        min={0} max={10} step={0.1}
                        value={orbitTilt}
                        onChange={(e) => setOrbitTilt(parseFloat(e.target.value))} />
                </div>
            </div>

            <InfoPanel title={eclipseInfo ? `🌑 ${eclipseInfo.name}` : '🌑 일식·월식 시뮬레이터'}>
                {eclipseInfo ? (
                    <>
                        <p style={{ marginBottom: 12 }}>{eclipseInfo.description}</p>
                        <p style={{ marginBottom: 12, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            <strong>조건:</strong> {eclipseInfo.condition}
                        </p>
                        {(eclipseType === 'total-solar' || eclipseType === 'partial-solar') && (
                            <div style={{ background: 'rgba(255,228,181,0.1)', padding: 10, borderRadius: 8, marginBottom: 12 }}>
                                <div style={{ fontSize: '0.8rem', color: '#FFE4B5', marginBottom: 4 }}>👑 코로나 현상</div>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                    개기일식 때 달이 태양을 완전히 가리면, 평소에 보이지 않던 태양의 <strong>코로나(대기)</strong>가
                                    달 주위로 하얗게 빛나며 보입니다. 태양의 코로나는 온도가 100만°C 이상이지만,
                                    밀도가 매우 낮아 평소에는 태양 표면의 밝은 빛에 가려져 보이지 않습니다.
                                </p>
                            </div>
                        )}
                        {(eclipseType === 'total-lunar' || eclipseType === 'partial-lunar') && (
                            <div style={{ background: 'rgba(139,0,0,0.1)', padding: 10, borderRadius: 8, marginBottom: 12 }}>
                                <div style={{ fontSize: '0.8rem', color: '#CC4444', marginBottom: 4 }}>🔴 블러드문 현상</div>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                    개기월식 때 달이 붉게 보이는 이유는 지구 대기가 태양빛을 <strong>굴절</strong>시키기 때문입니다.
                                    파란빛은 대기에서 산란되고, <strong>붉은빛만</strong> 지구 대기를 통과하여 달에 도달합니다.
                                    이것은 석양이 붉은 것과 같은 원리입니다!
                                </p>
                            </div>
                        )}
                    </>
                ) : (
                    <p style={{ marginBottom: 12 }}>
                        음력 날짜 슬라이더를 1일(삭) 또는 15일(보름)으로 맞추고, 궤도 기울기를 조절해보세요.<br /><br />
                        <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>
                            * 진한 검은색 원뿔은 <b>본영(완전한 그림자)</b>, 옅은 원뿔은 <b>반영(부분 그림자)</b>을 나타냅니다.
                        </span>
                    </p>
                )}
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 12, marginTop: 12 }}>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
                        <strong>💡 왜 매달 일식/월식이 일어나지 않을까?</strong><br />
                        {eclipseEducation.whyNotEveryMonth}
                    </p>
                </div>
                <StatRow label="음력 날짜" value={`${lunarDay}일`} />
                <StatRow label="궤도 기울기" value={`${orbitTilt.toFixed(1)}°`} />
                <StatRow label="식 현상" value={eclipseInfo ? eclipseInfo.name : '없음'} />
                <div style={{ marginTop: 12, borderTop: '1px solid var(--border-subtle)', paddingTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <MoonPhase2D illumination={getMoonIlluminationForDay(lunarDay)} lunarDay={lunarDay} size={56} eclipseType={eclipseType} />
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        지구에서 본 달의 모습<br />
                        (밝기: {Math.round(getMoonIlluminationForDay(lunarDay) * 100)}%)
                    </div>
                </div>
            </InfoPanel>
        </>
    );
}
