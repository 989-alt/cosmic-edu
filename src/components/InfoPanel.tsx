import { useState } from 'react';

interface InfoPanelProps {
    title: string;
    children: React.ReactNode;
    visible?: boolean;
    defaultCollapsed?: boolean;
}

export default function InfoPanel({ title, children, visible = true, defaultCollapsed = false }: InfoPanelProps) {
    const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

    if (!visible) return null;

    return (
        <div className={`info-panel ${isCollapsed ? 'collapsed' : ''}`}>
            <div
                className="info-panel-header"
                onClick={() => setIsCollapsed(!isCollapsed)}
                style={{ cursor: 'pointer' }}
            >
                <div className="info-panel-title">{title}</div>
                <button
                    className="info-panel-toggle"
                    aria-label={isCollapsed ? '펼치기' : '접기'}
                >
                    {isCollapsed ? '◀' : '▶'}
                </button>
            </div>
            {!isCollapsed && (
                <div className="info-panel-content">{children}</div>
            )}
        </div>
    );
}

interface StatRowProps {
    label: string;
    value: string | number;
}

export function StatRow({ label, value }: StatRowProps) {
    return (
        <div className="info-panel-stat">
            <span className="info-panel-stat-label">{label}</span>
            <span className="info-panel-stat-value">{value}</span>
        </div>
    );
}
