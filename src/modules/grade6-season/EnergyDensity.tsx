import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html, useTexture } from '@react-three/drei';
import { useState, useMemo } from 'react';
import * as THREE from 'three';
import { degToRad, energyDensity } from '../../utils/mathUtils';
import InfoPanel, { StatRow } from '../../components/InfoPanel';
import { getTexturePath } from '../../utils/texturePaths';

function SunSource({ altitude }: { altitude: number }) {
    const sunMap = useTexture(getTexturePath('sun'));
    const rad = degToRad(altitude);
    const x = 14 * Math.cos(rad);
    const y = 12;

    return (
        <mesh position={[x, y, 0]}>
            <sphereGeometry args={[1.5, 16, 16]} />
            <meshBasicMaterial map={sunMap} />
            <pointLight intensity={2} distance={50} color="#fbbf24" />
        </mesh>
    );
}

function LightBeams({ altitude }: { altitude: number }) {
    const rad = degToRad(altitude);
    // 태양 위치 (SunSource와 동일)
    const sunX = 14 * Math.cos(rad);
    const sunY = 12;

    // 고도에 따른 빔 특성 변화
    const t = Math.max(0, Math.min(1, (altitude - 20) / 60)); // 0(겨울) ~ 1(여름) 정규화
    const beamThickness = 0.06 * t + 0.015;

    // 원형으로 퍼지는 빔 — 고도가 높으면 좁게, 낮으면 넓게
    // 그리드 크기(10)의 절반(5)을 넘지 않도록 제한
    const rawSpreadRadius = 0.8 + (1 - t) * 3.5; // 여름 0.8, 겨울 4.3
    const spreadRadius = Math.min(rawSpreadRadius, 4.5); // 그리드 내부로 제한
    const ringCount = 3; // 동심원 링 수
    const ringsBeams = [1, 6, 12]; // 각 링의 빔 수 (중심, 1번째, 2번째 링)

    // 모든 빔의 지면 타격 좌표 생성 (원형 패턴)
    const beamTargets = useMemo(() => {
        const targets: { gx: number; gz: number }[] = [];
        for (let ring = 0; ring < ringCount; ring++) {
            const count = ringsBeams[ring];
            const r = (ring / (ringCount - 1)) * spreadRadius;
            for (let i = 0; i < count; i++) {
                const angle = (i / count) * Math.PI * 2;
                targets.push({
                    gx: ring === 0 ? 0 : Math.cos(angle) * r,
                    gz: ring === 0 ? 0 : Math.sin(angle) * r,
                });
            }
        }
        return targets;
    }, [spreadRadius]);

    return (
        <group>
            {beamTargets.map((target, i) => {
                const groundY = 0.05;
                const dx = target.gx - sunX;
                const dy = groundY - sunY;
                const dz = target.gz - 0; // 태양 z=0
                const length = Math.sqrt(dx * dx + dy * dy + dz * dz);

                // 중점
                const cx = (sunX + target.gx) / 2;
                const cy = (sunY + groundY) / 2;
                const cz = target.gz / 2;

                // 방향 벡터로 회전 계산
                const dir = new THREE.Vector3(dx, dy, dz).normalize();
                const up = new THREE.Vector3(0, 1, 0);
                const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
                const euler = new THREE.Euler().setFromQuaternion(quat);

                return (
                    <mesh key={i} position={[cx, cy, cz]} rotation={euler}>
                        <cylinderGeometry args={[beamThickness, beamThickness, length, 4]} />
                        <meshBasicMaterial color="#fbbf24" opacity={0.35 + t * 0.2} transparent />
                    </mesh>
                );
            })}
            {/* 빔 끝에 화살표 헤드 */}
            {beamTargets.map((target, i) => {
                const dx = target.gx - sunX;
                const dy = 0.05 - sunY;
                const dz = target.gz;
                const dir = new THREE.Vector3(dx, dy, dz).normalize();
                const up = new THREE.Vector3(0, 1, 0);
                const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
                const euler = new THREE.Euler().setFromQuaternion(quat);
                return (
                    <mesh key={`arrow-${i}`} position={[target.gx, 0.1, target.gz]} rotation={euler}>
                        <coneGeometry args={[beamThickness * 2.5, 0.3, 6]} />
                        <meshBasicMaterial color="#fbbf24" opacity={0.7} transparent />
                    </mesh>
                );
            })}
            {/* 지면 조사 면적 표시 (원형) */}
            <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[spreadRadius, 32]} />
                <meshBasicMaterial
                    color={t > 0.6 ? '#ef4444' : t > 0.3 ? '#fbbf24' : '#3b82f6'}
                    opacity={0.15}
                    transparent
                />
            </mesh>
            {/* 원형 테두리 */}
            <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[spreadRadius - 0.05, spreadRadius + 0.05, 64]} />
                <meshBasicMaterial
                    color={t > 0.6 ? '#ef4444' : t > 0.3 ? '#fbbf24' : '#3b82f6'}
                    opacity={0.4}
                    transparent
                />
            </mesh>
            {/* 면적 라벨 */}
            <Html position={[0, -0.5, spreadRadius + 1]} center style={{ whiteSpace: 'nowrap' }}>
                <div style={{
                    color: t > 0.6 ? '#ef4444' : t > 0.3 ? '#fbbf24' : '#3b82f6',
                    fontSize: '0.7rem', fontFamily: 'var(--font-mono)',
                    background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: 4,
                    whiteSpace: 'nowrap',
                }}>
                    조사 면적: {t > 0.6 ? '좁음 (에너지 집중)' : t > 0.3 ? '보통' : '넓음 (에너지 분산)'}
                </div>
            </Html>
        </group>
    );
}

function EarthGround({ altitude }: { altitude: number }) {
    const earthMap = useTexture(getTexturePath('earthDay'));
    const density = energyDensity(altitude);
    const gridSize = 10;
    const cellCount = 10;

    const heatOverlay = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d')!;

        for (let i = 0; i < cellCount; i++) {
            for (let j = 0; j < cellCount; j++) {
                const cx = (i + 0.5) / cellCount;
                const cy = (j + 0.5) / cellCount;
                const distFromCenter = Math.sqrt((cx - 0.5) ** 2 + (cy - 0.5) ** 2) * 2;
                const localDensity = Math.max(0, density * (1 - distFromCenter * 0.3));

                const r = Math.round(localDensity * 255);
                const b = Math.round((1 - localDensity) * 200);
                ctx.fillStyle = `rgba(${r}, ${Math.round(localDensity * 60)}, ${b}, 0.6)`;
                ctx.fillRect(i * 12.8, j * 12.8, 12.8, 12.8);
            }
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.needsUpdate = true;
        return tex;
    }, [altitude, density]);

    return (
        <group>
            {/* 지구 텍스처 바닥 */}
            <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[gridSize, gridSize]} />
                <meshStandardMaterial map={earthMap} roughness={0.9} />
            </mesh>
            {/* 히트맵 오버레이 */}
            <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[gridSize, gridSize]} />
                <meshBasicMaterial map={heatOverlay} transparent />
            </mesh>
            <gridHelper args={[gridSize, cellCount, '#ffffff33', '#ffffff11']} position={[0, 0.02, 0]} />
        </group>
    );
}



function getSeasonLabel(altitude: number): { label: string; emoji: string; color: string } {
    if (altitude >= 70) return { label: '여름 (하지 전후)', emoji: '☀️', color: '#ef4444' };
    if (altitude >= 55) return { label: '봄/가을', emoji: '🌤️', color: '#fbbf24' };
    if (altitude >= 40) return { label: '초겨울/늦겨울', emoji: '🌥️', color: '#60a5fa' };
    return { label: '겨울 (동지 전후)', emoji: '❄️', color: '#3b82f6' };
}

export default function EnergyDensity() {
    const [altitude, setAltitude] = useState(60);
    const density = energyDensity(altitude);
    const area = 1 / Math.max(Math.sin(degToRad(altitude)), 0.01);
    const season = getSeasonLabel(altitude);

    return (
        <>
            <Canvas camera={{ position: [8, 10, 12], fov: 45 }} style={{ background: '#0a0e1a' }}>
                <ambientLight intensity={0.4} />
                <SunSource altitude={altitude} />
                <LightBeams altitude={altitude} />
                <EarthGround altitude={altitude} />

                <OrbitControls enablePan={false} maxDistance={30} minDistance={5} />
            </Canvas>

            {/* Altitude slider with season label */}
            <div style={{
                position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
                background: 'var(--bg-glass)', backdropFilter: 'blur(12px)',
                border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xl)',
                padding: '12px 24px', zIndex: 50, display: 'flex', alignItems: 'center', gap: 16,
            }}>
                <div style={{
                    fontSize: '1.2rem', minWidth: 32, textAlign: 'center'
                }}>{season.emoji}</div>
                <div className="slider-container" style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="slider-label">태양 고도: {altitude}°</span>
                        <span style={{ fontSize: '0.7rem', color: season.color, fontWeight: 'bold' }}>{season.label}</span>
                    </div>
                    <div style={{ position: 'relative' }}>
                        <input type="range" className="slider-input" style={{ width: '100%', minWidth: 250 }}
                            min={5} max={90} step={1}
                            value={altitude} onChange={(e) => setAltitude(parseInt(e.target.value))} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.55rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            <span>❄️ 겨울</span>
                            <span>☀️ 여름</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Measurement cards */}
            <div style={{
                position: 'absolute', top: 16, left: 16, zIndex: 40,
                display: 'flex', gap: 8, flexWrap: 'wrap',
            }}>
                <div style={{
                    background: 'var(--bg-glass)', padding: '10px 16px', borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)', backdropFilter: 'blur(12px)',
                }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>태양 고도</div>
                    <div style={{ fontSize: '1.2rem', fontFamily: 'var(--font-mono)', color: '#fbbf24' }}>{altitude}°</div>
                </div>
                <div style={{
                    background: 'var(--bg-glass)', padding: '10px 16px', borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)', backdropFilter: 'blur(12px)',
                }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>조사 면적 배율</div>
                    <div style={{ fontSize: '1.2rem', fontFamily: 'var(--font-mono)', color: '#818cf8' }}>{area.toFixed(1)}배</div>
                </div>
                <div style={{
                    background: 'var(--bg-glass)', padding: '10px 16px', borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)', backdropFilter: 'blur(12px)',
                }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>에너지 밀도</div>
                    <div style={{ fontSize: '1.2rem', fontFamily: 'var(--font-mono)', color: '#ef4444' }}>{Math.round(density * 100)}%</div>
                </div>
                <div style={{
                    background: 'var(--bg-glass)', padding: '10px 16px', borderRadius: 'var(--radius-sm)',
                    border: `2px solid ${season.color}`, backdropFilter: 'blur(12px)',
                }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>현재 계절</div>
                    <div style={{ fontSize: '1rem', fontFamily: 'var(--font-sans)', color: season.color }}>{season.emoji} {season.label}</div>
                </div>
            </div>

            <InfoPanel title="🔥 에너지 밀도 시뮬레이터">
                <p style={{ marginBottom: 12 }}>
                    같은 양의 태양빛이라도, 비스듬히 비추면 넓은 면적에 퍼져 단위면적당 에너지가 줄어듭니다.
                </p>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 8, marginBottom: 12 }}>
                    <div style={{ fontSize: '0.8rem', color: '#fbbf24', marginBottom: 4 }}>💡 손전등 비유</div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        손전등을 바닥에 똑바로 비추면 빛이 좁고 밝게 모이지만(여름), 비스듬히 비추면 빛이 넓게 퍼져 흐려집니다(겨울).
                    </p>
                </div>
                <StatRow label="빛이 퍼지는 정도" value={`${(area).toFixed(1)}배`} />
                <StatRow label="바닥의 온도(밀도)" value={`${Math.round(density * 100)}%`} />

                {/* Color Legend */}
                <div style={{ marginTop: 12, borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: 8 }}>
                        🎨 바닥 색상 의미
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <div style={{ width: 14, height: 14, borderRadius: 3, background: 'rgb(255, 60, 0)' }} />
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>🔴 빨강 = 에너지 밀집 (여름, 고도 높음)</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <div style={{ width: 14, height: 14, borderRadius: 3, background: 'rgb(0, 0, 200)' }} />
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>🔵 파랑 = 에너지 분산 (겨울, 고도 낮음)</span>
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: 12, borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
                        <strong>💡 핵심:</strong> 여름(남중 고도 76.5°)에는 에너지가 집중되고,
                        겨울(남중 고도 29.5°)에는 에너지가 넓게 퍼져서 기온이 낮습니다.
                        이것이 <strong>같은 태양인데도 계절마다 기온이 다른 이유</strong>입니다!
                    </p>
                </div>
            </InfoPanel>
        </>
    );
}
