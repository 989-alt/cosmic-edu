import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Moon, Orbit, Eclipse as EclipseIcon } from 'lucide-react';
import MoonPhase from './MoonPhase';
import SolarSystem from './SolarSystem';
import Eclipse from './Eclipse';
import LearningObjectives from '../../components/LearningObjectives';
import LearningQuiz from '../../components/LearningQuiz';

type SubModule = 'moon' | 'solar' | 'eclipse';

export default function Grade4MoonSolar() {
    const [active, setActive] = useState<SubModule>('moon');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <LearningObjectives moduleKey="grade4-moon-solar" />
            <LearningQuiz moduleKey="grade4-moon-solar" />
            <div className="sub-module-nav">
                <Link to="/" className="back-btn"><ArrowLeft size={16} /> 홈</Link>
                <button className={`sub-module-btn ${active === 'moon' ? 'active' : ''}`} onClick={() => setActive('moon')}>
                    <Moon size={16} /> 달의 위상 변화
                </button>
                <button className={`sub-module-btn ${active === 'solar' ? 'active' : ''}`} onClick={() => setActive('solar')}>
                    <Orbit size={16} /> 태양계 샌드박스
                </button>
                <button className={`sub-module-btn ${active === 'eclipse' ? 'active' : ''}`} onClick={() => setActive('eclipse')}>
                    <EclipseIcon size={16} /> 일식·월식
                </button>
            </div>
            <div className="canvas-container">
                {active === 'moon' && <MoonPhase />}
                {active === 'solar' && <SolarSystem />}
                {active === 'eclipse' && <Eclipse />}
            </div>
        </div>
    );
}
