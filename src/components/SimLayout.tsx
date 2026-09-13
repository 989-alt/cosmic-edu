import { useState, type ReactNode } from 'react';
import './SimLayout.css';

/**
 * 시뮬레이터 공용 레이아웃. CSS grid 로 Stage / Inspector / Dock 을 나눠
 * 장면 위에 떠 있는 오버레이를 없앤다. Stage 위에 남는 건 HUD 칩 한 줄뿐.
 *
 *   ┌ stage ───────────┬ inspector ┐
 *   │ [hud chips]      │ 수치·설명  │
 *   ├ dock ────────────┴───────────┤
 *
 * 900px 미만: 세로로 쌓이고 Inspector 는 접히는 시트가 된다.
 */
export function SimLayout({ children }: { children: ReactNode }) {
    return <div className="sim-layout">{children}</div>;
}

export function SimStage({ children }: { children: ReactNode }) {
    return <div className="sim-stage">{children}</div>;
}

export interface HudItem { label: string; value: string; color?: string }

/** Stage 좌상단 실시간 수치 칩. 최대 4개 권장, 그 이상은 Inspector 로. */
export function SimHud({ items }: { items: HudItem[] }) {
    return (
        <div className="sim-hud" aria-live="polite">
            {items.map((it) => (
                <div key={it.label} className="sim-hud-chip">
                    <span className="sim-hud-label">{it.label}</span>
                    <span className="sim-hud-value" style={it.color ? { color: it.color } : undefined}>{it.value}</span>
                </div>
            ))}
        </div>
    );
}

/** Stage 위 좌하단에 두는 부가 컨트롤(시점 토글 등). 꼭 필요할 때만. */
export function SimStageControls({ children }: { children: ReactNode }) {
    return <div className="sim-stage-controls">{children}</div>;
}

export interface DockSlider {
    label: string;
    min: number; max: number; step: number;
    value: number;
    onChange: (v: number) => void;
    /** 슬라이더 아래 눈금 라벨 (좌→우) */
    ticks?: string[];
    /** 우측 표시값 */
    display?: string;
    disabled?: boolean;
}
export interface DockPreset { label: string; onClick: () => void; active?: boolean }

export function SimDock({ play, speed, slider, presets, children }: {
    play?: { playing: boolean; onToggle: () => void };
    speed?: { value: number; onCycle: () => void };
    slider?: DockSlider;
    presets?: DockPreset[];
    children?: ReactNode;
}) {
    return (
        <div className="sim-dock">
            {presets && presets.length > 0 && (
                <div className="sim-dock-presets" role="group" aria-label="프리셋">
                    {presets.map((p) => (
                        <button key={p.label} className={`sim-preset ${p.active ? 'active' : ''}`} onClick={p.onClick}>{p.label}</button>
                    ))}
                </div>
            )}
            <div className="sim-dock-main">
                {play && (
                    <button className={`control-btn ${play.playing ? 'active' : ''}`} onClick={play.onToggle}
                        aria-label={play.playing ? '일시정지' : '재생'}>
                        {play.playing ? '⏸' : '▶'}
                    </button>
                )}
                {speed && (
                    <button className="control-btn" onClick={speed.onCycle} aria-label="배속 변경">
                        <span className="speed-label">×{speed.value}</span>
                    </button>
                )}
                {slider && <div className="sim-dock-slider">
                    <div className="sim-dock-slider-head">
                        <span className="slider-label">{slider.label}</span>
                        {slider.display && <span className="sim-dock-display">{slider.display}</span>}
                    </div>
                    <input type="range" className="slider-input" aria-label={slider.label}
                        min={slider.min} max={slider.max} step={slider.step} value={slider.value}
                        disabled={slider.disabled}
                        onChange={(e) => slider.onChange(parseFloat(e.target.value))} />
                    {slider.ticks && (
                        <div className="sim-dock-ticks">
                            {slider.ticks.map((t, i) => <span key={i}>{t}</span>)}
                        </div>
                    )}
                </div>}
                {children}
            </div>
        </div>
    );
}

export interface InspectorSection { id: string; label: string; content: ReactNode }

export function SimInspector({ title, sections }: { title: ReactNode; sections: InspectorSection[] }) {
    const [tab, setTab] = useState(sections[0]?.id);
    const [open, setOpen] = useState(() =>
        typeof window === 'undefined' ? true : !window.matchMedia('(max-width: 899px)').matches,
    );
    const current = sections.find((s) => s.id === tab) ?? sections[0];

    return (
        <aside className={`sim-inspector ${open ? 'open' : 'closed'}`} aria-label="정보 패널">
            <button className="sim-inspector-head" onClick={() => setOpen(!open)} aria-expanded={open}>
                <span className="sim-inspector-title">{title}</span>
                <span className="sim-inspector-chevron" aria-hidden="true">{open ? '▾' : '▴'}</span>
            </button>
            {open && (
                <>
                    {sections.length > 1 && (
                        <div className="sim-inspector-tabs" role="tablist">
                            {sections.map((s) => (
                                <button key={s.id} role="tab" aria-selected={s.id === current?.id}
                                    className={`sim-inspector-tab ${s.id === current?.id ? 'active' : ''}`}
                                    onClick={() => setTab(s.id)}>{s.label}</button>
                            ))}
                        </div>
                    )}
                    <div className="sim-inspector-body" role="tabpanel">{current?.content}</div>
                </>
            )}
        </aside>
    );
}

/** Inspector 안에서 쓰는 수치 행. 기존 InfoPanel.StatRow 와 같은 마크업. */
export function StatRow({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="info-panel-stat">
            <span className="info-panel-stat-label">{label}</span>
            <span className="info-panel-stat-value">{value}</span>
        </div>
    );
}
