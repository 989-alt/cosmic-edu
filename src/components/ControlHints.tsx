import { useState } from 'react';
import { HelpCircle, X, MousePointer2, ZoomIn, Hand, Smartphone } from 'lucide-react';

const HINTS = [
    { Icon: MousePointer2, action: '드래그', description: '화면 회전' },
    { Icon: ZoomIn, action: '휠 스크롤', description: '확대/축소' },
    { Icon: Hand, action: '우클릭+드래그', description: '화면 이동' },
    { Icon: Smartphone, action: '두 손가락', description: '터치 확대/이동' },
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
                {isExpanded ? <X size={20} /> : <HelpCircle size={22} />}
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
                        {HINTS.map(({ Icon, action, description }) => (
                            <li key={action} className="control-hint-item">
                                <span className="control-hint-icon" aria-hidden="true"><Icon size={16} /></span>
                                <span className="control-hint-action">{action}</span>
                                <span className="control-hint-desc">{description}</span>
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
