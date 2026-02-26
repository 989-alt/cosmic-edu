import { useState } from 'react';

const HINTS = [
    { icon: '🖱️', action: '드래그', description: '화면 회전' },
    { icon: '🔍', action: '휠 스크롤', description: '확대/축소' },
    { icon: '✋', action: '우클릭+드래그', description: '화면 이동' },
    { icon: '📱', action: '두 손가락', description: '터치 확대/이동' },
];

export default function ControlHints() {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <aside
            className={`control-hints ${isExpanded ? 'expanded' : ''}`}
            role="complementary"
            aria-label="조작 도움말"
        >
            <button
                className="control-hints-toggle"
                onClick={() => setIsExpanded(!isExpanded)}
                aria-label={isExpanded ? '도움말 닫기' : '조작 방법 보기'}
                aria-expanded={isExpanded}
                aria-controls="control-hints-panel"
            >
                {isExpanded ? '✕' : '❓'}
            </button>

            {isExpanded && (
                <div
                    id="control-hints-panel"
                    className="control-hints-content"
                    role="region"
                    aria-label="조작 방법 안내"
                >
                    <h3 className="control-hints-title">조작 방법</h3>
                    <ul className="control-hints-list">
                        {HINTS.map((hint, idx) => (
                            <li key={idx} className="control-hint-item">
                                <span className="control-hint-icon" aria-hidden="true">{hint.icon}</span>
                                <span className="control-hint-action">{hint.action}</span>
                                <span className="control-hint-desc">{hint.description}</span>
                            </li>
                        ))}
                    </ul>
                    <p className="control-hints-footer">
                        <kbd>Space</kbd> 재생/정지 · 슬라이더로 시간 조절
                    </p>
                </div>
            )}
        </aside>
    );
}
