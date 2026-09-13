import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { useEffect, useState, lazy, Suspense } from 'react';
import { Loader } from '@react-three/drei';
import { Telescope, Info, Moon, Globe, Sun } from 'lucide-react';
import { useAppStore } from './store/appStore';
import AboutModal from './components/AboutModal';
import OnboardingTutorial from './components/OnboardingTutorial';
import ControlHints from './components/ControlHints';

// Lazy load modules for code splitting
const Grade4MoonSolar = lazy(() => import('./modules/grade4-moon-solar/Grade4MoonSolar'));
const Grade6Rotation = lazy(() => import('./modules/grade6-rotation/Grade6Rotation'));
const Grade6Season = lazy(() => import('./modules/grade6-season/Grade6Season'));

// Loading fallback component
function ModuleLoader() {
  return (
    <div className="module-loader">
      <div className="module-loader-spinner" />
      <p>모듈을 불러오는 중...</p>
    </div>
  );
}

function Home() {
  return (
    <section className="module-home" aria-labelledby="home-title">
      <h1 id="home-title" className="module-home-title">COSMIC-EDU</h1>
      <p className="module-home-subtitle">초등 과학 천체 시뮬레이터 · 우주를 직접 조작하며 배우세요</p>
      <nav className="module-cards" aria-label="학습 모듈 선택">
        <Link to="/grade4-moon-solar" className="module-card" aria-labelledby="card1-title card1-grade">
          <span className="module-card-icon icon-tile moon" aria-hidden="true"><Moon size={28} /></span>
          <span id="card1-grade" className="module-card-grade">4학년 2학기</span>
          <h2 id="card1-title" className="module-card-title">밤하늘 관찰</h2>
          <p className="module-card-desc">
            달의 위상 변화를 관찰하고, 태양계 행성들의 크기와 거리를 비교해보세요.
          </p>
          <div className="module-card-topics" aria-label="학습 주제">
            <span className="module-card-topic">달의 위상</span>
            <span className="module-card-topic">태양계 샌드박스</span>
            <span className="module-card-topic">일식·월식</span>
          </div>
        </Link>

        <Link to="/grade6-rotation" className="module-card" aria-labelledby="card2-title card2-grade">
          <span className="module-card-icon icon-tile earth" aria-hidden="true"><Globe size={28} /></span>
          <span id="card2-grade" className="module-card-grade">6학년 1학기</span>
          <h2 id="card2-title" className="module-card-title">지구의 운동</h2>
          <p className="module-card-desc">
            지구의 자전과 공전을 체험하며 낮과 밤, 계절이 생기는 원리를 이해하세요.
          </p>
          <div className="module-card-topics" aria-label="학습 주제">
            <span className="module-card-topic">자전·일주 운동</span>
            <span className="module-card-topic">공전</span>
          </div>
        </Link>

        <Link to="/grade6-season" className="module-card" aria-labelledby="card3-title card3-grade">
          <span className="module-card-icon icon-tile sun" aria-hidden="true"><Sun size={28} /></span>
          <span id="card3-grade" className="module-card-grade">6학년 2학기</span>
          <h2 id="card3-title" className="module-card-title">계절의 변화</h2>
          <p className="module-card-desc">
            태양의 고도와 그림자, 에너지 밀도를 탐구하며 계절이 변하는 원인을 알아보세요.
          </p>
          <div className="module-card-topics" aria-label="학습 주제">
            <span className="module-card-topic">태양 고도·그림자</span>
            <span className="module-card-topic">남중 고도</span>
            <span className="module-card-topic">에너지 밀도</span>
            <span className="module-card-topic">자전축</span>
          </div>
        </Link>
      </nav>
    </section>
  );
}

function AppHeader() {
  const { performanceLevel, setPerformanceLevel, showToast } = useAppStore();
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  const togglePerf = () => {
    const next = performanceLevel === 'high' ? 'low' : 'high';
    setPerformanceLevel(next);
    showToast(next === 'high' ? '고사양 모드 활성화 (8K 텍스처, 고품질 그림자)' : '저사양 모드 활성화 (2K 텍스처, 성능 최적화)');
  };

  return (
    <>
      <header className="app-header" role="banner">
        <Link to="/" className="app-logo" aria-label="COSMIC-EDU 홈으로 이동">
          <span className="app-logo-icon" aria-hidden="true"><Telescope size={18} /></span>
          <span className="app-logo-text">COSMIC-EDU</span>
        </Link>
        <nav className="app-header-controls" aria-label="사이트 설정">
          <button
            className="perf-toggle"
            onClick={() => setIsAboutOpen(true)}
            aria-label="정보 및 출처 보기"
            aria-haspopup="dialog"
            style={{ background: 'transparent', border: '1px solid var(--border-subtle)', marginRight: '8px' }}
          >
            <Info size={14} /> 정보
          </button>
          <button
            className="perf-toggle"
            onClick={togglePerf}
            aria-label={`그래픽 품질: ${performanceLevel === 'high' ? '고사양' : '저사양'} 모드. 클릭하여 변경`}
            aria-pressed={performanceLevel === 'high'}
          >
            <span className={`indicator ${performanceLevel}`} aria-hidden="true" />
            {performanceLevel === 'high' ? '고사양' : '저사양'}
          </button>
        </nav>
      </header>
      {isAboutOpen && <AboutModal onClose={() => setIsAboutOpen(false)} />}
    </>
  );
}

function Toast() {
  const toastMessage = useAppStore((s) => s.toastMessage);
  if (!toastMessage) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      style={{
        position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)',
        background: 'var(--bg-glass)', backdropFilter: 'blur(12px)',
        border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)',
        padding: '12px 24px', color: 'var(--text-primary)', zIndex: 9999,
        boxShadow: 'var(--shadow-card)', fontSize: '0.9rem',
        animation: 'fadeIn 0.3s ease-out'
      }}
    >
      {toastMessage}
    </div>
  );
}

export default function App() {
  const initPerformance = useAppStore((s) => s.initPerformance);

  useEffect(() => {
    initPerformance();
  }, [initPerformance]);

  return (
    <Router>
      <div className="app-container">
        <a href="#main-content" className="skip-link">
          본문으로 바로가기
        </a>
        <OnboardingTutorial />
        <AppHeader />
        <Toast />
        <main id="main-content" className="app-content" role="main">
          <Suspense fallback={<ModuleLoader />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/grade4-moon-solar/*" element={<Grade4MoonSolar />} />
              <Route path="/grade6-rotation/*" element={<Grade6Rotation />} />
              <Route path="/grade6-season/*" element={<Grade6Season />} />
            </Routes>
          </Suspense>
        </main>
        <ControlHints />
        <Loader
          containerStyles={{ background: 'var(--bg-primary)' }}
          innerStyles={{ background: 'var(--bg-glass)', width: '300px', height: '10px' }}
          barStyles={{ background: 'var(--gradient-cosmic)' }}
          dataInterpolation={(p) => `우주 데이터를 불러오는 중... ${Math.round(p)}%`}
        />
      </div>
    </Router>
  );
}
