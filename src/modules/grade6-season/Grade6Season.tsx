import { useState } from 'react';
import { Link } from 'react-router-dom';
import DailyShadowLab from './DailyShadowLab';
import SeasonalAltitude from './SeasonalAltitude';
import EnergyDensity from './EnergyDensity';
import AxisImpact from './AxisImpact';
import LearningObjectives from '../../components/LearningObjectives';
import LearningQuiz from '../../components/LearningQuiz';

type SubModule = 'daily' | 'seasonal' | 'energy' | 'axis';

export default function Grade6Season() {
    const [active, setActive] = useState<SubModule>('daily');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <LearningObjectives moduleKey="grade6-season" />
            <LearningQuiz moduleKey="grade6-season" />
            <div className="sub-module-nav">
                <Link to="/" className="back-btn">← 홈</Link>
                <button className={`sub-module-btn ${active === 'daily' ? 'active' : ''}`} onClick={() => setActive('daily')}>
                    ☀️ 하루 태양 고도
                </button>
                <button className={`sub-module-btn ${active === 'seasonal' ? 'active' : ''}`} onClick={() => setActive('seasonal')}>
                    📅 계절별 남중 고도
                </button>
                <button className={`sub-module-btn ${active === 'energy' ? 'active' : ''}`} onClick={() => setActive('energy')}>
                    🔥 에너지 밀도
                </button>
                <button className={`sub-module-btn ${active === 'axis' ? 'active' : ''}`} onClick={() => setActive('axis')}>
                    🌐 자전축 임팩트
                </button>
            </div>
            <div className="canvas-container">
                {active === 'daily' && <DailyShadowLab />}
                {active === 'seasonal' && <SeasonalAltitude />}
                {active === 'energy' && <EnergyDensity />}
                {active === 'axis' && <AxisImpact />}
            </div>
        </div>
    );
}
