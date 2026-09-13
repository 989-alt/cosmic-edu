import { useState, useEffect } from 'react';
import { Telescope, BookOpen, MousePointer2, Lightbulb, ArrowLeft, ArrowRight, type LucideIcon } from 'lucide-react';

const ONBOARDING_STEPS: { title: string; content: string; Icon: LucideIcon }[] = [
    {
        title: 'COSMIC-EDU에 오신 것을 환영합니다',
        content: '초등학교 과학 교과과정에 맞춘 인터랙티브 천체 시뮬레이터입니다. 우주를 직접 조작하며 과학 원리를 배워보세요.',
        Icon: Telescope,
    },
    {
        title: '학년별 모듈 선택',
        content: '홈 화면에서 학년과 단원을 선택하세요. 4학년 밤하늘 관찰, 6학년 지구의 운동과 계절의 변화를 학습할 수 있습니다.',
        Icon: BookOpen,
    },
    {
        title: '3D 조작 방법',
        content: '• 마우스 드래그: 화면 회전\n• 마우스 휠: 확대/축소\n• 우클릭 드래그: 화면 이동\n• 스페이스바+드래그: 맵 이동 (일부 모듈)',
        Icon: MousePointer2,
    },
    {
        title: '학습 팁',
        content: '오른쪽 정보 패널에서 자세한 설명을 확인하세요. 재생 버튼으로 애니메이션을 재생하고, 아래 슬라이더로 시간을 조절할 수 있습니다.',
        Icon: Lightbulb,
    },
];

const STORAGE_KEY = 'cosmic-edu-onboarding-completed';

export default function OnboardingTutorial() {
    const [isOpen, setIsOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        const completed = localStorage.getItem(STORAGE_KEY);
        if (!completed) {
            setIsOpen(true);
        }
    }, []);

    const handleNext = () => {
        if (currentStep < ONBOARDING_STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleComplete();
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleComplete = () => {
        localStorage.setItem(STORAGE_KEY, 'true');
        setIsOpen(false);
    };

    if (!isOpen) return null;

    const step = ONBOARDING_STEPS[currentStep];

    return (
        <div className="onboarding-overlay">
            <div className="onboarding-modal" role="dialog" aria-labelledby="onboarding-title">
                <div className="onboarding-icon icon-tile" aria-hidden="true"><step.Icon size={34} /></div>
                <h2 id="onboarding-title" className="onboarding-title">{step.title}</h2>
                <p className="onboarding-content">{step.content}</p>

                <div className="onboarding-progress" aria-hidden="true">
                    {ONBOARDING_STEPS.map((_, idx) => (
                        <div
                            key={idx}
                            className={`onboarding-dot ${idx === currentStep ? 'active' : ''} ${idx < currentStep ? 'completed' : ''}`}
                        />
                    ))}
                </div>

                <div className="onboarding-actions">
                    {currentStep > 0 && (
                        <button className="onboarding-btn secondary" onClick={handlePrev}>
                            <ArrowLeft size={16} /> 이전
                        </button>
                    )}
                    <button className="onboarding-btn skip" onClick={handleComplete}>
                        건너뛰기
                    </button>
                    <button className="onboarding-btn primary" onClick={handleNext}>
                        {currentStep === ONBOARDING_STEPS.length - 1 ? '시작하기' : '다음'} <ArrowRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}

// 온보딩 다시 보기 버튼용 (설정에서 사용)
export function resetOnboarding() {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
}
