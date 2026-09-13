import { useState, useEffect } from 'react';
import { BookOpen, Check, Lightbulb, ArrowRight } from 'lucide-react';

interface ObjectiveData {
    title: string;
    grade: string;
    unit: string;
    objectives: string[];
    tips: string;
}

const OBJECTIVES: Record<string, ObjectiveData> = {
    'grade4-moon-solar': {
        title: '밤하늘 관찰',
        grade: '4학년 2학기',
        unit: '3. 지구와 달',
        objectives: [
            '달의 위상이 변하는 이유를 이해한다',
            '태양계 행성들의 크기와 거리를 비교한다',
            '일식과 월식이 일어나는 원리를 안다',
        ],
        tips: '달을 드래그하여 위치를 변경하고, 지구에서 보이는 달의 모양을 관찰하세요!',
    },
    'grade6-rotation': {
        title: '지구의 운동',
        grade: '6학년 1학기',
        unit: '2. 지구와 달의 운동',
        objectives: [
            '자전으로 인해 낮과 밤이 생기는 원리를 이해한다',
            '지구의 자전 방향과 태양의 일주 운동을 연결한다',
            '공전으로 인해 계절이 변하는 원리를 이해한다',
        ],
        tips: '우주 시점과 관측자 시점을 전환하며 지구의 자전을 다양한 각도에서 관찰하세요!',
    },
    'grade6-season': {
        title: '계절의 변화',
        grade: '6학년 2학기',
        unit: '2. 계절의 변화',
        objectives: [
            '태양의 남중 고도가 계절에 따라 달라지는 이유를 안다',
            '태양 고도와 그림자 길이의 관계를 이해한다',
            '에너지 밀도와 기온의 관계를 이해한다',
            '자전축 기울기가 계절 변화의 원인임을 이해한다',
        ],
        tips: '슬라이더로 계절을 변경하며 태양 고도, 그림자, 에너지 분포의 변화를 관찰하세요!',
    },
};

interface LearningObjectivesProps {
    moduleKey: string;
}

export default function LearningObjectives({ moduleKey }: LearningObjectivesProps) {
    const [isOpen, setIsOpen] = useState(false);
    const storageKey = `cosmic-edu-objectives-seen-${moduleKey}`;

    useEffect(() => {
        const seen = sessionStorage.getItem(storageKey);
        if (!seen) {
            setIsOpen(true);
        }
    }, [storageKey]);

    const handleClose = () => {
        sessionStorage.setItem(storageKey, 'true');
        setIsOpen(false);
    };

    const data = OBJECTIVES[moduleKey];
    if (!isOpen || !data) return null;

    return (
        <div className="objectives-overlay">
            <div className="objectives-modal">
                <div className="objectives-header">
                    <span className="objectives-grade">{data.grade}</span>
                    <span className="objectives-unit">{data.unit}</span>
                </div>
                <h2 className="objectives-title"><span className="icon-tile" style={{ width: 36, height: 36 }}><BookOpen size={20} /></span>{data.title}</h2>
                <div className="objectives-subtitle">이번에 배울 내용</div>

                <ul className="objectives-list">
                    {data.objectives.map((obj, idx) => (
                        <li key={idx} className="objectives-item">
                            <span className="objectives-check" aria-hidden="true"><Check size={16} /></span>
                            {obj}
                        </li>
                    ))}
                </ul>

                <div className="objectives-tip">
                    <span className="objectives-tip-icon" aria-hidden="true"><Lightbulb size={18} /></span>
                    <span>{data.tips}</span>
                </div>

                <button className="objectives-btn" onClick={handleClose}>
                    학습 시작하기 <ArrowRight size={16} style={{ verticalAlign: '-3px' }} />
                </button>
            </div>
        </div>
    );
}
