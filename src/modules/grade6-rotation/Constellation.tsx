import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, useTexture } from '@react-three/drei';
import { useMemo, useState, useRef } from 'react';
import * as THREE from 'three';
import { constellations, getVisibleConstellations, ConstellationData } from '../../data/constellations';
import InfoPanel from '../../components/InfoPanel';
import { useAppStore } from '../../store/appStore';
import { getTexturePath } from '../../utils/texturePaths';

const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
const SEASON_COLORS: Record<string, string> = {
    spring: '#f472b6', summer: '#ef4444', autumn: '#f59e0b', winter: '#3b82f6'
};

/* RA/Dec를 3D 위치로 변환 (플라네타리움 반구 위) */
function raDec2Vec(ra: number, dec: number, radius: number): THREE.Vector3 {
    const phi = (90 - dec) * (Math.PI / 180);
    const theta = ra * (Math.PI / 12); // RA: hours -> radians
    return new THREE.Vector3(
        -radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta),
    );
}

/* 별들을 밤하늘 반구 위에 배치 */
function NightSkyStars({ monthIndex }: { monthIndex: number }) {
    const visible = getVisibleConstellations(monthIndex);
    const allConstellations = constellations;
    const starfieldMap = useTexture(getTexturePath('starfield'));
    const skyRadius = 50;

    const groundTexture = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d')!;
        const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
        gradient.addColorStop(0, '#020508');
        gradient.addColorStop(0.8, '#0a1a10');
        gradient.addColorStop(1, '#1a332a'); // glow at horizon
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 512);
        const tex = new THREE.CanvasTexture(canvas);
        tex.needsUpdate = true;
        return tex;
    }, []);

    return (
        <group>
            {/* 밤하늘 배경 반구 */}
            <mesh>
                <sphereGeometry args={[skyRadius + 1, 64, 64]} />
                <meshBasicMaterial map={starfieldMap} side={THREE.BackSide} />
            </mesh>

            {/* 모든 별자리 표시 (보이는 것은 밝게, 아닌 것은 어둡게) */}
            {allConstellations.map(c => {
                const isVisible = visible.some(v => v.id === c.id);
                const opacity = isVisible ? 1 : 0.1;
                const color = isVisible ? SEASON_COLORS[c.season] : '#333';

                return (
                    <group key={c.id}>
                        {/* 별 */}
                        {c.stars.map((star, si) => {
                            const pos = raDec2Vec(star.ra, star.dec, skyRadius);
                            return (
                                <mesh key={si} position={pos}>
                                    <sphereGeometry args={[isVisible ? 0.4 : 0.15, 8, 8]} />
                                    <meshBasicMaterial color={isVisible ? '#fffbe6' : '#555'} />
                                </mesh>
                            );
                        })}

                        {/* 별자리 선 */}
                        {c.lines.map(([a, b], li) => {
                            const posA = raDec2Vec(c.stars[a].ra, c.stars[a].dec, skyRadius);
                            const posB = raDec2Vec(c.stars[b].ra, c.stars[b].dec, skyRadius);
                            const geo = new THREE.BufferGeometry().setFromPoints([posA, posB]);
                            return (
                                <line key={li}>
                                    <bufferGeometry attach="geometry" {...geo} />
                                    <lineBasicMaterial color={color} opacity={opacity * 0.6} transparent />
                                </line>
                            );
                        })}

                        {/* 별자리 이름 라벨 (보이는 것만) */}
                        {isVisible && (() => {
                            const avgRA = c.stars.reduce((s, st) => s + st.ra, 0) / c.stars.length;
                            const avgDec = c.stars.reduce((s, st) => s + st.dec, 0) / c.stars.length;
                            const labelPos = raDec2Vec(avgRA, avgDec + 5, skyRadius - 2);
                            return (
                                <Html position={labelPos} center>
                                    <div style={{
                                        color, fontSize: '0.8rem', fontWeight: 'bold',
                                        textShadow: '0 0 8px rgba(0,0,0,0.9)',
                                        whiteSpace: 'nowrap', fontFamily: 'var(--font-sans)',
                                    }}>
                                        {c.nameKo}
                                    </div>
                                </Html>
                            );
                        })()}
                    </group>
                );
            })}

            {/* 지평선 원 */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
                <ringGeometry args={[skyRadius - 1, skyRadius + 1, 64]} />
                <meshBasicMaterial color="#1a332a" side={THREE.DoubleSide} opacity={0.5} transparent />
            </mesh>

            {/* 방위 */}
            <Html position={[0, 0, -skyRadius + 5]} center><div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>남(S)</div></Html>
            <Html position={[0, 0, skyRadius - 5]} center><div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>북(N)</div></Html>
            <Html position={[skyRadius - 5, 0, 0]} center><div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>서(W)</div></Html>
            <Html position={[-skyRadius + 5, 0, 0]} center><div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>동(E)</div></Html>

            {/* 지면 */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
                <circleGeometry args={[skyRadius, 64]} />
                <meshBasicMaterial map={groundTexture} />
            </mesh>

            {/* 관측 방향 화살표 (남쪽 방향) */}
            <mesh position={[0, 10, -skyRadius * 0.6]} rotation={[Math.PI / 6, 0, 0]}>
                <coneGeometry args={[1.5, 4, 8]} />
                <meshBasicMaterial color="#fbbf24" opacity={0.3} transparent />
            </mesh>
            <Html position={[0, 12, -skyRadius * 0.5]} center>
                <div style={{ color: '#fbbf24', fontSize: '0.85rem', fontWeight: 'bold' }}>
                    👁️ 관측 방향 (태양 반대쪽)
                </div>
            </Html>

            <ambientLight intensity={0.35} />
        </group>
    );
}

/* 공전 궤도 미니맵 (카메라 연동을 위해 Canvas 내부에 배치) */
function OrbitMiniMap({ monthIndex }: { monthIndex: number }) {
    const { camera } = useThree();
    const svgRef = useRef<SVGGElement>(null);
    const earthAngle = (monthIndex / 12) * Math.PI * 2 - Math.PI / 2; // 3월=0°
    const oppositeAngle = earthAngle + Math.PI; // 밤하늘 방향

    useFrame(() => {
        if (svgRef.current) {
            // 카메라 위치(회전)에 따른 시야 방향 오프셋
            const camAzimuth = Math.atan2(camera.position.x, camera.position.z);
            // 지구의 이동 각도 + 밤하늘 기본 방향 + 카메라 시야각
            const viewAngle = oppositeAngle + camAzimuth;
            const deg = (viewAngle * 180 / Math.PI) - 90; // SVG SVG 방향 보정

            svgRef.current.setAttribute('transform', `rotate(${deg})`);
        }
    });

    return (
        <Html
            position={[-18, -10, -30]} // 좌측 하단 쯤에 배치
            style={{
                pointerEvents: 'none',
                width: 200, height: 200,
            }}
            center
            zIndexRange={[100, 0]}
        >
            <div style={{
                background: 'var(--bg-glass)', backdropFilter: 'blur(12px)',
                border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)',
                padding: 16, width: 200, height: 200, pointerEvents: 'auto'
            }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 8, textAlign: 'center' }}>
                    🌏 공전 궤도 위치 & 시야
                </div>
                <svg viewBox="-120 -120 240 240" width="170" height="170">
                    {/* 궤도 */}
                    <circle cx="0" cy="0" r="80" fill="none" stroke="#3b82f6" strokeOpacity="0.2" strokeWidth="1" />

                    {/* 태양 */}
                    <circle cx="0" cy="0" r="10" fill="#fbbf24" />
                    <text x="0" y="4" textAnchor="middle" fill="white" fontSize="8">☀️</text>

                    <g transform={`translate(${Math.cos(earthAngle) * 80}, ${Math.sin(earthAngle) * 80})`}>
                        {/* 카메라 시야각 뿔 (동적 회전) */}
                        <g ref={svgRef}>
                            <polygon points="0,0 -30,60 30,60" fill="#ffffff" opacity="0.15" />
                        </g>

                        {/* 지구 */}
                        <circle cx="0" cy="0" r="6" fill="#3b82f6" />
                        <text x="0" y="3" textAnchor="middle" fill="white" fontSize="6">🌏</text>
                    </g>

                    {/* 계절 라벨 */}
                    <text x="0" y="-95" textAnchor="middle" fill="#f472b6" fontSize="7">봄</text>
                    <text x="95" y="3" textAnchor="middle" fill="#ef4444" fontSize="7">여름</text>
                    <text x="0" y="100" textAnchor="middle" fill="#f59e0b" fontSize="7">가을</text>
                    <text x="-95" y="3" textAnchor="middle" fill="#3b82f6" fontSize="7">겨울</text>
                </svg>
            </div>
        </Html>
    );
}

export default function Constellation() {
    const timeValue = useAppStore((s) => s.timeValue);
    const monthIndex = Math.floor(timeValue * 12) % 12;
    const visible = getVisibleConstellations(monthIndex);
    const [selectedConstellation, setSelectedConstellation] = useState<ConstellationData | null>(null);

    const seasonName = monthIndex >= 2 && monthIndex <= 4 ? '봄' :
        monthIndex >= 5 && monthIndex <= 7 ? '여름' :
            monthIndex >= 8 && monthIndex <= 10 ? '가을' : '겨울';

    return (
        <>
            <Canvas
                camera={{ position: [0, 20, 0.1], fov: 120 }}
                style={{ background: '#030810' }}
            >
                <NightSkyStars monthIndex={monthIndex} />
                <OrbitControls
                    enablePan={false}
                    minDistance={0.5}
                    maxDistance={30}
                    target={[0, 20, 0]}
                />
                <OrbitMiniMap monthIndex={monthIndex} />
            </Canvas>

            {/* Month selector */}
            <div style={{
                position: 'absolute', top: 16, left: 16, zIndex: 40,
                display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 400,
            }}>
                {MONTHS.map((m, i) => (
                    <button key={m} className={`sub-module-btn ${i === monthIndex ? 'active' : ''}`}
                        style={{ fontSize: '0.7rem', padding: '4px 8px' }}
                        onClick={() => useAppStore.getState().setTimeValue(i / 12 + 0.01)}>
                        {m}
                    </button>
                ))}
            </div>

            {/* Visible constellation list */}
            <div style={{
                position: 'absolute', top: 60, left: 16, zIndex: 40,
                display: 'flex', flexDirection: 'column', gap: 4,
            }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    👁️ {MONTHS[monthIndex]} ({seasonName}) 밤하늘 별자리
                </div>
                {visible.map(c => (
                    <button key={c.id}
                        className={`sub-module-btn ${selectedConstellation?.id === c.id ? 'active' : ''}`}
                        style={{ fontSize: '0.75rem', textAlign: 'left' }}
                        onClick={() => setSelectedConstellation(selectedConstellation?.id === c.id ? null : c)}
                    >
                        ⭐ {c.nameKo} ({c.name})
                    </button>
                ))}
            </div>

            <InfoPanel title={`🌌 ${MONTHS[monthIndex]} ${seasonName}의 밤하늘`}>
                {selectedConstellation ? (
                    <>
                        <div style={{
                            fontSize: '1rem', fontWeight: 'bold',
                            color: SEASON_COLORS[selectedConstellation.season],
                            marginBottom: 8
                        }}>
                            ⭐ {selectedConstellation.nameKo} ({selectedConstellation.name})
                        </div>
                        <p style={{ marginBottom: 12, fontSize: '0.8rem', lineHeight: 1.6 }}>
                            {selectedConstellation.description}
                        </p>
                        {selectedConstellation.zodiac && (
                            <div style={{ fontSize: '0.7rem', color: '#fbbf24', marginBottom: 8 }}>
                                ♈ 황도 12궁 별자리
                            </div>
                        )}
                    </>
                ) : (
                    <p style={{ marginBottom: 12, fontSize: '0.8rem', lineHeight: 1.6 }}>
                        월을 선택하면 해당 계절에 밤하늘에서 볼 수 있는 별자리가 강조됩니다.
                        왼쪽 목록에서 별자리를 클릭하면 상세 정보를 볼 수 있습니다.
                    </p>
                )}

                <div style={{ marginTop: 12, borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#fbbf24', marginBottom: 6 }}>
                        🔗 왜 계절마다 다른 별자리가 보일까?
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                        <div style={{ marginBottom: 6 }}>
                            <span style={{ color: '#fbbf24' }}>1️⃣</span> 지구는 태양 주위를 1년에 한 바퀴 <strong>공전</strong>합니다.
                        </div>
                        <div style={{ marginBottom: 6 }}>
                            <span style={{ color: '#818cf8' }}>2️⃣</span> 밤에는 <strong>태양 반대쪽</strong> 하늘을 바라보게 됩니다.
                        </div>
                        <div style={{ marginBottom: 6 }}>
                            <span style={{ color: '#f472b6' }}>3️⃣</span> 공전 위치가 달라지면 → 반대쪽도 달라짐 → <strong>보이는 별자리가 바뀜</strong>!
                        </div>
                    </div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.7, marginTop: 8 }}>
                        예) 여름에는 태양 반대편인 <span style={{ color: '#ef4444' }}>전갈자리/궁수자리</span>  방향,
                        겨울에는 <span style={{ color: '#3b82f6' }}>오리온/쌍둥이자리</span> 방향을 바라봅니다.
                        왼쪽 아래 궤도 미니맵에서 지구의 위치와 밤하늘 방향을 확인해 보세요!
                    </p>
                </div>
            </InfoPanel>

            {/* Time slider */}
            <div style={{
                position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
                background: 'var(--bg-glass)', backdropFilter: 'blur(12px)',
                border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xl)',
                padding: '12px 24px', zIndex: 50, display: 'flex', alignItems: 'center', gap: 16,
            }}>
                <div className="slider-container">
                    <span className="slider-label">관측 시기</span>
                    <input type="range" className="slider-input" style={{ width: 200 }} min={0} max={1} step={0.001}
                        value={timeValue} onChange={(e) => useAppStore.getState().setTimeValue(parseFloat(e.target.value))} />
                </div>
                <span style={{ fontSize: '0.85rem', color: 'var(--accent-sun)', fontFamily: 'var(--font-mono)' }}>
                    {MONTHS[monthIndex]}
                </span>
            </div>
        </>
    );
}
