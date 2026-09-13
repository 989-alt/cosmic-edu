import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sun, CalendarDays, Flame, Globe } from 'lucide-react';
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
                <Link to="/" className="back-btn"><ArrowLeft size={16} /> 홈</Link>
                <button className={`sub-module-btn ${active === 'daily' ? 'active' : ''}`} onClick={() => setActive('daily')}>
                    <Sun size={16} /> 하루 태양 고도
                </button>
                <button className={`sub-module-btn ${active === 'seasonal' ? 'active' : ''}`} onClick={() => setActive('seasonal')}>
                    <CalendarDays size={16} /> 계절별 남중 고도
                </button>
                <button className={`sub-module-btn ${active === 'energy' ? 'active' : ''}`} onClick={() => setActive('energy')}>
                    <Flame size={16} /> 에너지 밀도
                </button>
                <button className={`sub-module-btn ${active === 'axis' ? 'active' : ''}`} onClick={() => setActive('axis')}>
                    <Globe size={16} /> 자전축 임팩트
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
