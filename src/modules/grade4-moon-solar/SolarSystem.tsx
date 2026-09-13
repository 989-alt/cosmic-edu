import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, useTexture } from '@react-three/drei';
import { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { Orbit, Globe, Lightbulb, GraduationCap, Ruler, Sparkles } from 'lucide-react';
import * as THREE from 'three';
import { planets, SUN_DIAMETER } from '../../data/planets';
import { ScaleMode, getSunRadius, getPlanetRadius, getPlanetDistance } from '../../utils/scaleHelper';
import { useAppStore } from '../../store/appStore';
import { getTexturePath, getPlanetTexturePath } from '../../utils/texturePaths';
import { SimLayout, SimStage, SimDock, SimInspector, StatRow } from '../../components/SimLayout';

function SunMesh({ mode }: { mode: ScaleMode }) {
    const radius = getSunRadius(mode);
    const sunMap = useTexture(getTexturePath('sun'));
    return (
        <mesh>
            <sphereGeometry args={[radius, 64, 64]} />
            <meshBasicMaterial map={sunMap} />
            <pointLight intensity={3} distance={500} color="#fff5e0" />
        </mesh>
    );
}

function PlanetMesh({
    planet,
    index,
    mode,
    time,
    onHover,
    onClick,
}: {
    planet: typeof planets[0];
    index: number;
    mode: ScaleMode;
    time: number;
    onHover: (p: typeof planets[0] | null) => void;
    onClick: (p: typeof planets[0]) => void;
}) {
    const meshRef = useRef<THREE.Mesh>(null);
    const radius = getPlanetRadius(planet.diameter, mode);
    const distance = getPlanetDistance(index, planet.distanceAU, mode);

    const texturePath = getPlanetTexturePath(planet.id);
    const planetMap = useTexture(texturePath || '/textures/2k_moon.jpg');

    // Saturn ring texture
    const saturnRingPath = getTexturePath('saturnRing');
    const saturnRingMap = useTexture(saturnRingPath);

    const orbitalAngle = (time / planet.orbitalPeriod) * Math.PI * 2;
    const x = Math.cos(orbitalAngle) * distance;
    const z = Math.sin(orbitalAngle) * distance;

    const orbitPoints = useMemo(() => {
        const pts: THREE.Vector3[] = [];
        for (let i = 0; i <= 128; i++) {
            const a = (i / 128) * Math.PI * 2;
            pts.push(new THREE.Vector3(Math.cos(a) * distance, 0, Math.sin(a) * distance));
        }
        return pts;
    }, [distance]);

    const orbitGeometry = useMemo(() => {
        return new THREE.BufferGeometry().setFromPoints(orbitPoints);
    }, [orbitPoints]);

    return (
        <group>
            <line>
                <bufferGeometry attach="geometry" {...orbitGeometry} />
                <lineBasicMaterial color="#ffffff" opacity={0.08} transparent />
            </line>

            <mesh
                ref={meshRef}
                position={[x, 0, z]}
                onPointerEnter={() => onHover(planet)}
                onPointerLeave={() => onHover(null)}
                onClick={() => onClick(planet)}
            >
                <sphereGeometry args={[radius, 32, 32]} />
                <meshStandardMaterial map={planetMap} roughness={0.7} />
            </mesh>

            {planet.hasRing && (
                <mesh position={[x, 0, z]} rotation={[Math.PI / 2.5, 0, 0]}>
                    <ringGeometry args={[radius * 1.3, radius * 2.2, 64]} />
                    <meshBasicMaterial
                        map={planet.id === 'saturn' ? saturnRingMap : undefined}
                        color={planet.ringColor || '#D4AA6A'}
                        side={THREE.DoubleSide}
                        opacity={0.7}
                        transparent
                    />
                </mesh>
            )}

            <Html position={[x, radius + 0.8, z]} center>
                <div style={{
                    color: planet.color, fontSize: '0.65rem', fontFamily: 'var(--font-sans)',
                    whiteSpace: 'nowrap', textShadow: '0 0 4px rgba(0,0,0,0.8)',
                }}>
                    {planet.nameKo}
                </div>
            </Html>
        </group>
    );
}

function Starfield() {
    const starfieldMap = useTexture(getTexturePath('starfield'));
    return (
        <mesh>
            <sphereGeometry args={[400, 64, 64]} />
            <meshBasicMaterial map={starfieldMap} side={THREE.BackSide} />
        </mesh>
    );
}

function Scene({
    mode,
    time,
    onHover,
    onClick,
}: {
    mode: ScaleMode;
    time: number;
    onHover: (p: typeof planets[0] | null) => void;
    onClick: (p: typeof planets[0]) => void;
}) {
    return (
        <group>
            <ambientLight intensity={0.4} />
            <Starfield />
            <SunMesh mode={mode} />
            {planets.map((p, i) => (
                <PlanetMesh
                    key={p.id}
                    planet={p}
                    index={i}
                    mode={mode}
                    time={time}
                    onHover={onHover}
                    onClick={onClick}
                />
            ))}
        </group>
    );
}

function VolumeBar({ mode }: { mode: ScaleMode }) {
    if (mode === 'learning') return null;

    const EARTH_DIAMETER = 12742;

    return (
        <div className="volume-bar-container" style={{ position: 'static', left: 'auto', right: 'auto', bottom: 'auto' }}>
            <div className="volume-bar-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Orbit size={16} /> 행성 크기 비교 (지구 = 1 기준)
            </div>
            <div className="volume-bar-list">
                {planets.map((p) => {
                    const ratio = p.diameter / EARTH_DIAMETER;
                    const logHeight = Math.max(Math.log10(ratio * 10 + 1) * 30, 4);
                    const isEarth = p.id === 'earth';
                    return (
                        <div key={p.id} className="volume-bar-item">
                            <div style={{
                                fontSize: '0.5rem', color: isEarth ? 'var(--accent-sun)' : 'var(--text-muted)',
                                fontFamily: 'var(--font-mono)', marginBottom: 2, fontWeight: isEarth ? 'bold' : 'normal',
                            }}>
                                ×{ratio < 1 ? ratio.toFixed(2) : ratio.toFixed(1)}
                            </div>
                            <div
                                className="volume-bar-bar"
                                style={{
                                    height: logHeight,
                                    background: isEarth ? 'var(--accent-sun)' : p.color,
                                    opacity: isEarth ? 1 : 0.8,
                                    border: isEarth ? '1px solid var(--accent-sun)' : 'none',
                                }}
                            />
                            <span className="volume-bar-label" style={{
                                color: isEarth ? 'var(--accent-sun)' : undefined,
                                fontWeight: isEarth ? 'bold' : undefined,
                            }}>{p.nameKo}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function SolarSystem() {
    const [mode, setMode] = useState<ScaleMode>('learning');
    const [hoveredPlanet, setHoveredPlanet] = useState<typeof planets[0] | null>(null);
    const [selectedPlanet, setSelectedPlanet] = useState<typeof planets[0] | null>(null);
    const [spaceHeld, setSpaceHeld] = useState(false);
    const timeValue = useAppStore((s) => s.timeValue);
    const time = timeValue * 4333;
    const controlsRef = useRef<any>(null);

    // Spacebar pan support
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => { if (e.code === 'Space') { e.preventDefault(); setSpaceHeld(true); } };
        const onKeyUp = (e: KeyboardEvent) => { if (e.code === 'Space') setSpaceHeld(false); };
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); };
    }, []);

    const displayPlanet = selectedPlanet || hoveredPlanet;

    /* Zoom to planet */
    const handleSelectPlanet = useCallback((p: typeof planets[0] | null) => {
        setSelectedPlanet(p);
        if (p && controlsRef.current) {
            const idx = planets.indexOf(p);
            const distance = getPlanetDistance(idx, p.distanceAU, mode);
            const orbitalAngle = (time / p.orbitalPeriod) * Math.PI * 2;
            const x = Math.cos(orbitalAngle) * distance;
            const z = Math.sin(orbitalAngle) * distance;
            const radius = getPlanetRadius(p.diameter, mode);

            const controls = controlsRef.current;
            const target = new THREE.Vector3(x, 0, z);
            const camOffset = new THREE.Vector3(x, radius * 4 + 5, z + radius * 6 + 5);

            // Animate
            const startTarget = controls.target.clone();
            const startPos = controls.object.position.clone();
            let progress = 0;
            const animate = () => {
                progress += 0.04;
                if (progress >= 1) progress = 1;
                const t = 1 - Math.pow(1 - progress, 3); // easeOutCubic
                controls.target.lerpVectors(startTarget, target, t);
                controls.object.position.lerpVectors(startPos, camOffset, t);
                controls.update();
                if (progress < 1) requestAnimationFrame(animate);
            };
            requestAnimationFrame(animate);
        }
    }, [mode, time]);

    return (
        <SimLayout>
            <SimStage>
                <Canvas
                    camera={{ position: [0, 80, 120], fov: 50 }}
                    style={{ background: '#0a0e1a' }}
                >
                    <Scene
                        mode={mode}
                        time={time}
                        onHover={setHoveredPlanet}
                        onClick={handleSelectPlanet}
                    />
                    <OrbitControls
                        ref={controlsRef}
                        enablePan={spaceHeld}
                        maxDistance={400}
                        minDistance={5}
                        mouseButtons={{
                            LEFT: spaceHeld ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE,
                            MIDDLE: THREE.MOUSE.DOLLY,
                            RIGHT: THREE.MOUSE.PAN,
                        }}
                    />
                </Canvas>
            </SimStage>

            <SimDock
                presets={planets.map(p => ({ label: p.nameKo, onClick: () => handleSelectPlanet(p), active: selectedPlanet?.id === p.id }))}
            >
                <div className="scale-toggle">
                    <button className={`scale-btn ${mode === 'learning' ? 'active' : ''}`} onClick={() => setMode('learning')}><GraduationCap size={16} /> 학습용</button>
                    <button className={`scale-btn ${mode === 'realSize' ? 'active' : ''}`} onClick={() => setMode('realSize')}><Ruler size={16} /> 크기 비교</button>
                    <button className={`scale-btn ${mode === 'realDistance' ? 'active' : ''}`} onClick={() => setMode('realDistance')}><Sparkles size={16} /> 거리+크기</button>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', flex: 1 }}>
                    {mode === 'learning' && '행성 크기와 거리를 학습용으로 과장'}
                    {mode === 'realSize' && '행성 크기는 실제 비율, 거리는 압축'}
                    {mode === 'realDistance' && '크기 실제 비율 + 거리 대수 스케일'}
                    <br />
                    <Lightbulb size={14} /> 행성 버튼으로 바로 관찰 · 스페이스바+드래그로 맵 이동
                </div>
            </SimDock>


            <SimInspector
                title={displayPlanet
                    ? <><Globe size={18} /> {displayPlanet.nameKo} ({displayPlanet.name})</>
                    : <><Orbit size={18} /> 태양계 샌드박스</>}
                sections={[
                    {
                        id: 'info', label: '정보', content: displayPlanet ? (
                            <>
                                <div className="insp-key">
                                    <Lightbulb size={18} />
                                    <span>{displayPlanet.description}</span>
                                </div>
                                <StatRow label="지름" value={`${displayPlanet.diameter.toLocaleString()} km`} />
                                <StatRow label="질량" value={displayPlanet.mass} />
                                <StatRow label="자전 주기" value={`${Math.abs(displayPlanet.rotationPeriod).toFixed(1)}시간`} />
                                <StatRow label="공전 주기" value={`${displayPlanet.orbitalPeriod.toLocaleString()}일`} />
                                <StatRow label="태양 거리" value={`${displayPlanet.distanceAU} AU`} />
                                <StatRow label="자전축 기울기" value={`${displayPlanet.axialTilt}°`} />
                                <StatRow label="고리" value={displayPlanet.hasRing ? '있음' : '없음'} />
                                <StatRow label="지구 대비 크기" value={`${(displayPlanet.diameter / 12742).toFixed(2)}배`} />
                                <div className="insp-note">
                                    태양에서 멀어질수록 한 바퀴 도는 길이 길어집니다. 그래서 공전 주기도 함께 길어집니다.
                                </div>
                                {selectedPlanet && (
                                    <button
                                        onClick={() => setSelectedPlanet(null)}
                                        style={{ marginTop: 12, padding: '4px 8px', fontSize: '0.75rem', background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', borderRadius: 4, cursor: 'pointer' }}
                                    >
                                        닫기
                                    </button>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="insp-key">
                                    <Lightbulb size={18} />
                                    <span>태양 둘레를 여덟 행성이 돌고 있어요.</span>
                                </div>
                                <StatRow label="행성 수" value={`${planets.length}개`} />
                                <StatRow label="중심 천체" value="태양" />
                                <StatRow label="태양 지름" value={`${SUN_DIAMETER.toLocaleString()} km`} />
                                <div className="insp-note">
                                    행성을 클릭하거나 마우스를 올리면 자세한 정보가 나옵니다.
                                </div>
                            </>
                        ),
                    },
                    {
                        id: 'compare', label: '크기 비교', content: mode === 'learning' ? (
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                크기 비교 또는 거리+크기 모드에서 확인할 수 있습니다.
                            </p>
                        ) : (
                            <VolumeBar mode={mode} />
                        ),
                    },
                ]}
            />
        </SimLayout>
    );
}
