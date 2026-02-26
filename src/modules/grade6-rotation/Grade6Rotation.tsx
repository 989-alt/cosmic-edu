import { useState } from 'react';
import { Link } from 'react-router-dom';
import DayNight from './DayNight';
import Revolution from './Revolution';
import LearningObjectives from '../../components/LearningObjectives';
import LearningQuiz from '../../components/LearningQuiz';

type SubModule = 'daynight' | 'revolution';

export default function Grade6Rotation() {
    const [active, setActive] = useState<SubModule>('daynight');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <LearningObjectives moduleKey="grade6-rotation" />
            <LearningQuiz moduleKey="grade6-rotation" />
            <div className="sub-module-nav">
                <Link to="/" className="back-btn">← 홈</Link>
                <button className={`sub-module-btn ${active === 'daynight' ? 'active' : ''}`} onClick={() => setActive('daynight')}>
                    🌓 자전과 일주 운동
                </button>
                <button className={`sub-module-btn ${active === 'revolution' ? 'active' : ''}`} onClick={() => setActive('revolution')}>
                    🌏 지구의 공전
                </button>
            </div>
            <div className="canvas-container">
                {active === 'daynight' && <DayNight />}
                {active === 'revolution' && <Revolution />}
            </div>
        </div>
    );
}
