import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html, useTexture } from '@react-three/drei';
import { useState, useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { degToRad, shadowLength as calcShadow } from '../../utils/mathUtils';
import { dailyShadowData } from '../../data/shadowLabData';
import InfoPanel, { StatRow } from '../../components/InfoPanel';
import { getTexturePath } from '../../utils/texturePaths';

/* 보간 함수: 시간 슬라이더 값(0~1)으로 데이터 사이 보간 */
function interpolateData(t: number) {
    const idx = t * (dailyShadowData.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.min(lo + 1, dailyShadowData.length - 1);
    const frac = idx - lo;

    const dLo = dailyShadowData[lo];
    const dHi = dailyShadowData[hi];

    return {
        altitude: dLo.altitude + (dHi.altitude - dLo.altitude) * frac,
        shadowLength: dLo.shadowLength + (dHi.shadowLength - dLo.shadowLength) * frac,
        temperature: dLo.temperature + (dHi.temperature - dLo.temperature) * frac,
        hour: dLo.hour + (dHi.hour - dLo.hour) * frac,
    };
}

function formatTime(hour: number): string {
    const h = Math.floor(hour);
    const m = Math.round((hour - h) * 60);
    return `${h}:${m.toString().padStart(2, '0')}`;
}

// t (0~1) → azimuth: t=0은 동(90°), t=0.5은 남(0°), t=1은 서(-90°)
function timeToAzimuth(t: number): number {
    return degToRad(90 - t * 180);
}

function SunMesh({ timeT, displayAltitude }: { timeT: number; displayAltitude: number }) {
    const sunMap = useTexture(getTexturePath('sun'));
    // getSunPosition3D와 동일한 계산 사용 - 궤적과 일치
    const pos = getSunPosition3D(timeT);

    return (
        <group>
            <mesh position={[pos.x, pos.y, pos.z]}>
                <sphereGeometry args={[0.8, 16, 16]} />
                <meshBasicMaterial map={sunMap} />
                <pointLight intensity={1.5} distance={50} color="#fbbf24" />
            </mesh>
            <Html position={[pos.x, pos.y + 1.5, pos.z]} center style={{ whiteSpace: 'nowrap' }}>
                <div style={{
                    color: '#fbbf24', fontSize: '0.75rem', fontFamily: 'var(--font-mono)',
                    background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: 4,
                    whiteSpace: 'nowrap',
                }}>
                    ☀️ {Math.round(displayAltitude)}°
                </div>
            </Html>
        </group>
    );
}

const PEAK_ALTITUDE = 76; // 남중 고도 (여름 기준)
const SUN_DIST = 12;

// t (0~1) 기준으로 태양의 3D 좌표 계산 (단순한 반원 궤적)
// 동(+x) → 남쪽 하늘 최고점 → 서(-x) 방향으로 이동
function getSunPosition3D(t: number): THREE.Vector3 {
    // x: 동(+)에서 서(-)로 직선 이동 (cos 사용)
    const x = Math.cos(t * Math.PI) * SUN_DIST;

    // y: 고도 - sin 곡선으로 0 → 최대 → 0
    const altitudeRad = degToRad(Math.sin(t * Math.PI) * PEAK_ALTITUDE);
    const y = Math.sin(altitudeRad) * SUN_DIST;

    // z: 남쪽(-z)으로 약간 치우침 (남중 시 최대)
    const z = -Math.sin(t * Math.PI) * 4;

    return new THREE.Vector3(x, y, z);
}

function SunTrajectory() {
    const pathPoints = useMemo(() => {
        const pts: THREE.Vector3[] = [];
        // 부드러운 반원 궤적
        for (let t = 0; t <= 1; t += 0.01) {
            pts.push(getSunPosition3D(t));
        }
        return pts;
    }, []);
    const pathGeo = useMemo(() => new THREE.BufferGeometry().setFromPoints(pathPoints), [pathPoints]);

    return (
        <line>
            <bufferGeometry attach="geometry" {...pathGeo} />
            <lineBasicMaterial color="#fbbf24" opacity={0.3} transparent />
        </line>
    );
}

/* 태양 조명 - getSunPosition3D와 동일한 위치 사용하여 구불거림 방지 */
function SunDirectionalLight({ timeT }: { timeT: number }) {
    const pos = getSunPosition3D(timeT);
    return (
        <directionalLight
            position={[pos.x, pos.y, pos.z]}
            intensity={1.2}
            color="#fbbf24"
        />
    );
}

function TreeAndShadow({ altitude, azimuth }: { altitude: number; azimuth: number }) {
    const treeHeight = 3;
    const trunkHeight = 1.8;
    const shadow = calcShadow(treeHeight, altitude);
    const clampedShadow = Math.min(shadow, 20);

    return (
        <group>
            {/* 나무 줄기 */}
            <mesh position={[0, trunkHeight / 2, 0]}>
                <cylinderGeometry args={[0.12, 0.18, trunkHeight, 8]} />
                <meshStandardMaterial color="#6B4226" roughness={0.9} />
            </mesh>
            {/* 나무 수관 (잎) */}
            <mesh position={[0, trunkHeight + 0.6, 0]}>
                <sphereGeometry args={[0.9, 16, 16]} />
                <meshStandardMaterial color="#2D7D3A" roughness={0.8} />
            </mesh>
            {/* 작은 수관 위 */}
            <mesh position={[0, trunkHeight + 1.3, 0]}>
                <sphereGeometry args={[0.55, 16, 16]} />
                <meshStandardMaterial color="#3A9648" roughness={0.8} />
            </mesh>

            {/* 그림자 (나무 모양 타원) */}
            <group rotation={[0, azimuth + Math.PI, 0]}>
                <mesh position={[0, 0.01, clampedShadow / 2]} rotation={[-Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[1.5, clampedShadow]} />
                    <meshBasicMaterial color="#000000" opacity={0.6} transparent />
                </mesh>
            </group>

            {/* 흙 지면 (갈색 단색) */}
            <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[24, 24]} />
                <meshStandardMaterial color="#8B7355" roughness={1} />
            </mesh>
            {/* 지면 가장자리 잔디 */}
            <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[10, 12, 64]} />
                <meshStandardMaterial color="#4a6b3a" roughness={1} transparent opacity={0.5} />
            </mesh>

            {/* 방위 표시 — 가독성 개선 */}
            <Html position={[0, 0.3, -10]} center style={{ whiteSpace: 'nowrap' }}>
                <div style={{ color: '#818cf8', fontSize: '0.8rem', fontWeight: 'bold', whiteSpace: 'nowrap', background: 'rgba(0,0,0,0.5)', padding: '2px 8px', borderRadius: 4 }}>⬇ 남(S)</div>
            </Html>
            <Html position={[10, 0.3, 0]} center style={{ whiteSpace: 'nowrap' }}>
                <div style={{ color: '#4ade80', fontSize: '0.8rem', fontWeight: 'bold', whiteSpace: 'nowrap', background: 'rgba(0,0,0,0.5)', padding: '2px 8px', borderRadius: 4 }}>→ 동(E)</div>
            </Html>
            <Html position={[-10, 0.3, 0]} center style={{ whiteSpace: 'nowrap' }}>
                <div style={{ color: '#f59e0b', fontSize: '0.8rem', fontWeight: 'bold', whiteSpace: 'nowrap', background: 'rgba(0,0,0,0.5)', padding: '2px 8px', borderRadius: 4 }}>← 서(W)</div>
            </Html>
            <Html position={[0, 0.3, 10]} center style={{ whiteSpace: 'nowrap' }}>
                <div style={{ color: '#94a3b8', fontSize: '0.75rem', whiteSpace: 'nowrap', background: 'rgba(0,0,0,0.5)', padding: '2px 8px', borderRadius: 4 }}>⬆ 북(N)</div>
            </Html>
        </group>
    );
}

/* 자동으로 그려지는 그래프 (슬라이더 위치까지만 채움) */
function AutoGraph({ t, data, label, color, yRange, unit }: {
    t: number;
    data: { x: number; y: number }[];
    label: string;
    color: string;
    yRange: [number, number];
    unit: string;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(0, 0, w, h);

        // Grid
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= 6; i++) {
            const x = (i / 6) * w;
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let i = 0; i <= 4; i++) {
            const y = (i / 4) * h;
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }

        // 전체 경로 (반투명)
        ctx.strokeStyle = `${color}33`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        data.forEach((d, i) => {
            const x = (i / (data.length - 1)) * w;
            const y = h - ((d.y - yRange[0]) / (yRange[1] - yRange[0])) * h;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // 현재까지 채워진 경로 (진한 색)
        const fillIdx = t * (data.length - 1);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let i = 0; i <= Math.ceil(fillIdx); i++) {
            const progress = Math.min(i, fillIdx);
            const frac = progress - Math.floor(progress);
            const lo = Math.floor(progress);
            const hi = Math.min(lo + 1, data.length - 1);
            const yVal = data[lo].y + (data[hi].y - data[lo].y) * frac;

            const x = (progress / (data.length - 1)) * w;
            const y = h - ((yVal - yRange[0]) / (yRange[1] - yRange[0])) * h;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // 현재 위치 마커
        const currentVal = interpolateData(t);
        const currentY = label.includes('고도') ? currentVal.altitude : label.includes('그림자') ? currentVal.shadowLength : currentVal.temperature;
        const markerX = t * w;
        const markerY = h - ((currentY - yRange[0]) / (yRange[1] - yRange[0])) * h;

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(markerX, markerY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(markerX, markerY, 3, 0, Math.PI * 2);
        ctx.fill();

        // 라벨
        ctx.fillStyle = color;
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(label, 4, 14);

        // 현재 값
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`${currentY.toFixed(1)}${unit}`, w - 60, 14);

        // Y축 라벨
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '9px sans-serif';
        ctx.fillText(`${yRange[1]}`, 2, 10);
        ctx.fillText(`${yRange[0]}`, 2, h - 2);
    }, [t, data, label, color, yRange, unit]);

    return (
        <canvas
            ref={canvasRef}
            width={340}
            height={90}
            style={{ width: '100%', height: 90, borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)' }}
        />
    );
}

function AutoPlay({ timeT, setTimeT, setIsPlaying }: {
    timeT: number;
    setTimeT: React.Dispatch<React.SetStateAction<number>>;
    setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
}) {
    useEffect(() => {
        let raf: number;
        let lastTime = 0;
        const animate = (ts: number) => {
            if (lastTime) {
                const delta = (ts - lastTime) / 1000;
                setTimeT((prev: number) => {
                    const next = prev + delta * 0.08; // ~12 seconds full cycle
                    if (next >= 1) {
                        setIsPlaying(false);
                        return 1;
                    }
                    return next;
                });
            }
            lastTime = ts;
            raf = requestAnimationFrame(animate);
        };
        raf = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(raf);
    }, [setTimeT, setIsPlaying]);
    return null;
}

export default function DailyShadowLab() {
    const [timeT, setTimeT] = useState(0); // 0~1, 시작은 동쪽(일출)
    const [isPlaying, setIsPlaying] = useState(false);
    const current = interpolateData(timeT);
    const azimuth = timeToAzimuth(timeT);

    const altData = dailyShadowData.map((d, i) => ({ x: i, y: d.altitude }));
    const shadowData = dailyShadowData.map((d, i) => ({ x: i, y: d.shadowLength }));
    const tempData = dailyShadowData.map((d, i) => ({ x: i, y: d.temperature }));

    return (
        <>
            <Canvas camera={{ position: [0, 14, 18], fov: 55 }} style={{ background: '#0a0e1a' }}>
                <ambientLight intensity={0.4} />
                <SunDirectionalLight timeT={timeT} />
                <SunTrajectory />
                <SunMesh timeT={timeT} displayAltitude={current.altitude} />
                <TreeAndShadow altitude={current.altitude} azimuth={azimuth} />
                <OrbitControls enablePan={false} maxDistance={30} minDistance={5} />
            </Canvas>

            {/* Measurements */}
            <div style={{
                position: 'absolute', top: 16, left: 16, zIndex: 40,
                display: 'flex', gap: 8, flexWrap: 'wrap',
            }}>
                <div style={{
                    background: 'var(--bg-glass)', padding: '10px 16px', borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)', backdropFilter: 'blur(12px)',
                }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>시각</div>
                    <div style={{ fontSize: '1.1rem', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{formatTime(current.hour)}</div>
                </div>
                <div style={{
                    background: 'var(--bg-glass)', padding: '10px 16px', borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)', backdropFilter: 'blur(12px)',
                }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>태양 고도</div>
                    <div style={{ fontSize: '1.1rem', fontFamily: 'var(--font-mono)', color: '#fbbf24' }}>{current.altitude.toFixed(1)}°</div>
                </div>
                <div style={{
                    background: 'var(--bg-glass)', padding: '10px 16px', borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)', backdropFilter: 'blur(12px)',
                }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>그림자 길이</div>
                    <div style={{ fontSize: '1.1rem', fontFamily: 'var(--font-mono)', color: '#818cf8' }}>{current.shadowLength.toFixed(1)}cm</div>
                </div>
                <div style={{
                    background: 'var(--bg-glass)', padding: '10px 16px', borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)', backdropFilter: 'blur(12px)',
                }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>기온</div>
                    <div style={{ fontSize: '1.1rem', fontFamily: 'var(--font-mono)', color: '#ef4444' }}>{current.temperature.toFixed(1)}°C</div>
                </div>
            </div>

            {/* Auto-drawing Graphs */}
            <div className="graph-panel">
                <div className="graph-title">📊 시간에 따른 변화 그래프 (슬라이더를 움직여 보세요!)</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <AutoGraph t={timeT} data={altData} label="태양 고도 (°)" color="#fbbf24" yRange={[30, 80]} unit="°" />
                    <AutoGraph t={timeT} data={shadowData} label="그림자 길이 (cm)" color="#818cf8" yRange={[0, 120]} unit="cm" />
                    <AutoGraph t={timeT} data={tempData} label="기온 (°C)" color="#ef4444" yRange={[25, 35]} unit="°C" />
                </div>
            </div>

            {/* Auto play */}
            {isPlaying && (
                <AutoPlay timeT={timeT} setTimeT={setTimeT} setIsPlaying={setIsPlaying} />
            )}

            {/* Time Slider */}
            <div style={{
                position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
                background: 'var(--bg-glass)', backdropFilter: 'blur(12px)',
                border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xl)',
                padding: '12px 24px', zIndex: 50, display: 'flex', alignItems: 'center', gap: 16,
                minWidth: 450,
            }}>
                <button className={`control-btn ${isPlaying ? 'active' : ''}`}
                    onClick={() => { setIsPlaying(!isPlaying); if (timeT >= 0.99) setTimeT(0); }}
                    style={{ fontSize: '1.2rem', padding: '6px 10px' }}>
                    {isPlaying ? '⏸' : '▶'}
                </button>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>동(일출)</span>
                <div style={{ flex: 1 }}>
                    <div style={{ textAlign: 'center', fontSize: '0.85rem', fontFamily: 'var(--font-mono)', color: '#fbbf24', marginBottom: 4 }}>
                        🕐 {formatTime(current.hour)}
                    </div>
                    <input
                        type="range" className="slider-input" style={{ width: '100%' }}
                        min={0} max={1} step={0.005}
                        value={timeT}
                        onChange={(e) => { setTimeT(parseFloat(e.target.value)); setIsPlaying(false); }}
                    />
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>서(일몰)</span>
            </div>
        </>
    );
}
