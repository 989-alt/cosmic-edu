import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, useTexture } from '@react-three/drei';
import { useState, useMemo, useRef } from 'react';
import { Eclipse as EclipseIcon, Lightbulb, Crown, Moon } from 'lucide-react';
import * as THREE from 'three';
import { degToRad } from '../../utils/mathUtils';
import { eclipseTypes, eclipseEducation } from '../../data/eclipseData';
import { useAppStore } from '../../store/appStore';
import { getTexturePath } from '../../utils/texturePaths';
import MoonPhase2D from '../../components/MoonPhase2D';
import { getMoonIlluminationForDay } from '../../data/moonPhases';
import { SimLayout, SimStage, SimDock, SimInspector, StatRow } from '../../components/SimLayout';

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
                <div style={{ color: 'var(--accent-moon)', fontSize: '0.7rem', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap' }}>
                    달{isTotalLunar ? ' · 블러드문' : isTotalSolar ? ' · 코로나' : ''}
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
        <SimLayout>
            <SimStage>
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
                        <div style={{ color: 'var(--accent-sun)', fontSize: '0.75rem', fontFamily: 'var(--font-sans)' }}>태양</div>
                    </Html>
                    <Html position={[0, 4, 0]} center>
                        <div style={{ color: 'var(--accent-earth)', fontSize: '0.75rem', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap' }}>지구</div>
                    </Html>
                </Canvas>
            </SimStage>

            <SimInspector
                title={eclipseInfo
                    ? <><EclipseIcon size={18} /> {eclipseInfo.name}</>
                    : <><EclipseIcon size={18} /> 일식·월식 시뮬레이터</>}
                sections={[
                    {
                        id: 'info', label: '설명', content: (
                            <>
                                {eclipseInfo ? (
                                    <>
                                        <div className="insp-key">
                                            <Lightbulb size={18} />
                                            <span>{eclipseInfo.description}</span>
                                        </div>
                                        <StatRow label="종류" value={eclipseInfo.type === 'solar' ? '일식' : '월식'} />
                                        <StatRow label="음력 날짜" value={`${lunarDay}일`} />
                                        <StatRow label="궤도 기울기" value={`${orbitTilt.toFixed(1)}°`} />
                                        <div className="insp-note">{eclipseInfo.condition}</div>
                                        {(eclipseType === 'total-solar' || eclipseType === 'partial-solar') && (
                                            <div style={{ background: 'var(--bg-raised)', padding: 10, borderRadius: 8, marginTop: 12 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--accent-sun)', marginBottom: 4 }}>
                                                    <Crown size={16} /> 코로나 현상
                                                </div>
                                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                                    달이 태양을 완전히 가리면 태양의 대기인 코로나가 하얗게 보입니다.
                                                    코로나는 100만°C가 넘지만 아주 옅어서, 평소에는 태양 표면 빛에 가려집니다.
                                                </p>
                                            </div>
                                        )}
                                        {(eclipseType === 'total-lunar' || eclipseType === 'partial-lunar') && (
                                            <div style={{ background: 'var(--bg-raised)', padding: 10, borderRadius: 8, marginTop: 12 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--accent-danger)', marginBottom: 4 }}>
                                                    <Moon size={16} /> 블러드문 현상
                                                </div>
                                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                                    월식 때 달이 붉은 건 지구 대기가 햇빛을 꺾기 때문입니다.
                                                    파란빛은 흩어지고 붉은빛만 통과해 달에 닿습니다. 석양이 붉은 것과 같은 원리입니다.
                                                </p>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <div className="insp-key">
                                            <Lightbulb size={18} />
                                            <span>태양·달·지구가 일직선일 때만 식이 일어나요.</span>
                                        </div>
                                        <StatRow label="음력 날짜" value={`${lunarDay}일`} />
                                        <StatRow label="궤도 기울기" value={`${orbitTilt.toFixed(1)}°`} />
                                        <StatRow label="식 현상" value="없음" />
                                        <div className="insp-note">
                                            음력 날짜를 1일(삭)이나 15일(보름)에 맞추고 궤도 기울기를 줄여 보세요.
                                            진한 원뿔이 본영(완전한 그림자), 옅은 원뿔이 반영(부분 그림자)입니다.
                                        </div>
                                    </>
                                )}
                                <div className="insp-note">
                                    <strong style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', marginBottom: 4 }}>
                                        <Lightbulb size={16} /> 왜 매달 일어나지 않을까?
                                    </strong>
                                    {eclipseEducation.whyNotEveryMonth}
                                </div>
                            </>
                        ),
                    },
                    {
                        id: 'stats', label: '수치', content: (
                            <>
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
                            </>
                        ),
                    },
                ]}
            />

            <SimDock
                slider={{
                    label: '음력 날짜', min: 0, max: 1, step: 0.001,
                    value: useAppStore.getState().timeValue,
                    onChange: (v) => useAppStore.getState().setTimeValue(v),
                    display: `${lunarDay}일`,
                }}
            >
                <div className="slider-container">
                    <span className="slider-label">달 궤도 기울기: {orbitTilt.toFixed(1)}°</span>
                    <input type="range" className="slider-input" style={{ width: 160 }}
                        min={0} max={10} step={0.1}
                        value={orbitTilt}
                        onChange={(e) => setOrbitTilt(parseFloat(e.target.value))} />
                </div>
            </SimDock>
        </SimLayout>
    );
}
