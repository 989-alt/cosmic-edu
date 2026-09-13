import { useState } from 'react';
import { ClipboardList, X, CheckCircle2, XCircle, Trophy, ArrowRight } from 'lucide-react';

interface QuizQuestion {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
}

interface QuizData {
    title: string;
    questions: QuizQuestion[];
}

const QUIZZES: Record<string, QuizData> = {
    'grade4-moon-solar': {
        title: '밤하늘 관찰 퀴즈',
        questions: [
            {
                question: '달이 보름달에서 그믐달로 변하는 데 걸리는 시간은?',
                options: ['약 7일', '약 15일', '약 30일', '약 1일'],
                correctIndex: 1,
                explanation: '달의 위상은 약 29.5일 주기로 변화하며, 보름달에서 그믐달까지는 약 15일이 걸립니다.',
            },
            {
                question: '일식이 일어날 때 달의 위치는?',
                options: ['지구와 태양 사이', '지구 뒤', '태양 뒤', '지구 옆'],
                correctIndex: 0,
                explanation: '일식은 달이 지구와 태양 사이에 위치하여 태양을 가릴 때 발생합니다.',
            },
            {
                question: '태양계에서 가장 큰 행성은?',
                options: ['토성', '목성', '해왕성', '천왕성'],
                correctIndex: 1,
                explanation: '목성은 태양계에서 가장 큰 행성으로, 지구의 약 11배 지름을 가지고 있습니다.',
            },
        ],
    },
    'grade6-rotation': {
        title: '지구의 운동 퀴즈',
        questions: [
            {
                question: '지구가 한 바퀴 자전하는 데 걸리는 시간은?',
                options: ['약 12시간', '약 24시간', '약 7일', '약 365일'],
                correctIndex: 1,
                explanation: '지구는 약 24시간(하루)에 한 바퀴 자전하며, 이로 인해 낮과 밤이 생깁니다.',
            },
            {
                question: '지구의 자전 방향은?',
                options: ['서쪽에서 동쪽', '동쪽에서 서쪽', '남쪽에서 북쪽', '북쪽에서 남쪽'],
                correctIndex: 0,
                explanation: '지구는 서쪽에서 동쪽으로 자전합니다. 그래서 태양이 동쪽에서 떠서 서쪽으로 지는 것처럼 보입니다.',
            },
            {
                question: '지구가 태양 주위를 한 바퀴 공전하는 데 걸리는 시간은?',
                options: ['약 30일', '약 180일', '약 365일', '약 24시간'],
                correctIndex: 2,
                explanation: '지구는 약 365일(1년)에 태양 주위를 한 바퀴 공전합니다.',
            },
        ],
    },
    'grade6-season': {
        title: '계절의 변화 퀴즈',
        questions: [
            {
                question: '여름에 기온이 높은 이유로 가장 적절한 것은?',
                options: ['태양과 가까워서', '남중 고도가 높아서', '밤이 길어서', '구름이 적어서'],
                correctIndex: 1,
                explanation: '여름에는 남중 고도가 높아 태양빛이 좁은 면적에 집중되어 에너지 밀도가 높아집니다.',
            },
            {
                question: '지구의 자전축 기울기는 약 몇 도인가요?',
                options: ['약 10°', '약 23.5°', '약 45°', '약 90°'],
                correctIndex: 1,
                explanation: '지구의 자전축은 약 23.5° 기울어져 있으며, 이것이 계절 변화의 원인입니다.',
            },
            {
                question: '겨울에 낮이 짧은 이유는?',
                options: ['지구가 느리게 자전해서', '태양이 작아져서', '남중 고도가 낮아서', '달이 태양을 가려서'],
                correctIndex: 2,
                explanation: '겨울에는 남중 고도가 낮아 태양이 하늘에 떠 있는 시간(낮)이 짧아집니다.',
            },
        ],
    },
};

interface LearningQuizProps {
    moduleKey: string;
}

export default function LearningQuiz({ moduleKey }: LearningQuizProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [score, setScore] = useState(0);
    const [quizCompleted, setQuizCompleted] = useState(false);

    const quizData = QUIZZES[moduleKey];
    if (!quizData) return null;

    const question = quizData.questions[currentQuestion];

    const handleAnswer = (index: number) => {
        if (selectedAnswer !== null) return;
        setSelectedAnswer(index);
        setShowResult(true);
        if (index === question.correctIndex) {
            setScore(score + 1);
        }
    };

    const handleNext = () => {
        if (currentQuestion < quizData.questions.length - 1) {
            setCurrentQuestion(currentQuestion + 1);
            setSelectedAnswer(null);
            setShowResult(false);
        } else {
            setQuizCompleted(true);
        }
    };

    const handleRestart = () => {
        setCurrentQuestion(0);
        setSelectedAnswer(null);
        setShowResult(false);
        setScore(0);
        setQuizCompleted(false);
    };

    const handleClose = () => {
        setIsOpen(false);
        handleRestart();
    };

    return (
        <>
            <button className="quiz-trigger-btn" onClick={() => setIsOpen(true)}>
                <ClipboardList size={18} /> 학습 퀴즈
            </button>

            {isOpen && (
                <div className="quiz-overlay">
                    <div className="quiz-modal">
                        <button className="quiz-close" onClick={handleClose} aria-label="닫기"><X size={20} /></button>

                        {!quizCompleted ? (
                            <>
                                <div className="quiz-header">
                                    <span className="quiz-title">{quizData.title}</span>
                                    <span className="quiz-progress">
                                        {currentQuestion + 1} / {quizData.questions.length}
                                    </span>
                                </div>

                                <div className="quiz-question">{question.question}</div>

                                <div className="quiz-options">
                                    {question.options.map((option, idx) => (
                                        <button
                                            key={idx}
                                            className={`quiz-option ${
                                                selectedAnswer === idx
                                                    ? idx === question.correctIndex
                                                        ? 'correct'
                                                        : 'wrong'
                                                    : ''
                                            } ${showResult && idx === question.correctIndex ? 'correct' : ''}`}
                                            onClick={() => handleAnswer(idx)}
                                            disabled={selectedAnswer !== null}
                                        >
                                            <span className="quiz-option-letter">
                                                {String.fromCharCode(65 + idx)}
                                            </span>
                                            {option}
                                        </button>
                                    ))}
                                </div>

                                {showResult && (
                                    <div className={`quiz-explanation ${selectedAnswer === question.correctIndex ? 'correct' : 'wrong'}`}>
                                        <div className="quiz-result-icon">
                                            {selectedAnswer === question.correctIndex ? <><CheckCircle2 size={18} /> 정답!</> : <><XCircle size={18} /> 오답</>}
                                        </div>
                                        <p>{question.explanation}</p>
                                        <button className="quiz-next-btn" onClick={handleNext}>
                                            {currentQuestion < quizData.questions.length - 1 ? <>다음 문제 <ArrowRight size={16} /></> : '결과 보기'}
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="quiz-complete">
                                <div className="quiz-complete-icon icon-tile" aria-hidden="true"><Trophy size={34} /></div>
                                <div className="quiz-complete-title">퀴즈 완료!</div>
                                <div className="quiz-complete-score">
                                    {quizData.questions.length}문제 중 <strong>{score}문제</strong> 정답
                                </div>
                                <div className="quiz-complete-message">
                                    {score === quizData.questions.length
                                        ? '완벽해요! 모든 문제를 맞혔어요.'
                                        : score >= quizData.questions.length / 2
                                        ? '잘했어요! 조금 더 복습하면 완벽해질 거예요.'
                                        : '다시 학습하고 도전해 보세요.'}
                                </div>
                                <div className="quiz-complete-actions">
                                    <button className="quiz-restart-btn" onClick={handleRestart}>
                                        다시 풀기
                                    </button>
                                    <button className="quiz-close-btn" onClick={handleClose}>
                                        닫기
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
