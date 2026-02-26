# COSMIC-EDU Frontend Review Report

**Review Date:** 2026-02-27
**Reviewer:** Senior Frontend Engineer
**Project:** 초등 과학 천체 시뮬레이터

---

## Executive Summary

COSMIC-EDU는 React Three Fiber 기반의 3D 천문학 교육 시뮬레이터로, 전반적으로 잘 구조화되어 있습니다. 그러나 **번들 크기 최적화**, **반응형 디자인 확장**, **접근성 개선**이 시급히 필요합니다.

| 항목 | 현재 상태 | 권장 수준 | 우선순위 |
|------|----------|----------|---------|
| 번들 크기 | 1,258 KB | < 500 KB | 🔴 Critical |
| 반응형 브레이크포인트 | 1개 (768px) | 3-4개 | 🟠 High |
| 접근성 (a11y) | 미흡 | WCAG AA | 🟠 High |
| 코드 스플리팅 | 없음 | 라우트별 분리 | 🔴 Critical |
| TypeScript 커버리지 | 높음 | 유지 | ✅ Good |

---

## 1. Performance Issues

### 1.1 Bundle Size (Critical)

**현재 상태:**
```
dist/index.html                  0.46 kB │ gzip:   0.30 kB
dist/assets/index-xxx.css       16.55 kB │ gzip:   4.13 kB
dist/assets/index-xxx.js     1,258.59 kB │ gzip: 385.35 kB
```

**문제점:**
- 단일 번들로 모든 모듈이 한 번에 로드됨
- Three.js + React Three Fiber가 전체 번들의 ~70% 차지
- 초기 로딩 시간이 느린 네트워크에서 10초 이상 소요 가능

**권장 개선안:**

```typescript
// vite.config.ts - 코드 스플리팅 설정
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-three': ['three', '@react-three/fiber', '@react-three/drei'],
          'vendor-state': ['zustand'],
        }
      }
    }
  }
})
```

```typescript
// App.tsx - 동적 임포트로 라우트별 코드 스플리팅
import { lazy, Suspense } from 'react';

const Grade4MoonSolar = lazy(() => import('./modules/grade4-moon-solar/Grade4MoonSolar'));
const Grade6Rotation = lazy(() => import('./modules/grade6-rotation/Grade6Rotation'));
const Grade6Season = lazy(() => import('./modules/grade6-season/Grade6Season'));

// Routes에서 Suspense로 감싸기
<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/grade4-moon-solar/*" element={<Grade4MoonSolar />} />
    ...
  </Routes>
</Suspense>
```

**예상 효과:** 초기 번들 ~400KB로 감소, 모듈별 ~300KB 지연 로딩

### 1.2 3D Rendering Optimization

**현재 상태:**
- useFrame에서 매 프레임 상태 업데이트
- 텍스처 프리로딩 전략 없음

**권장 개선안:**

```typescript
// 텍스처 프리로딩
import { useTexture, Preload } from '@react-three/drei';

// Canvas 내부에 추가
<Preload all />

// 텍스처 캐싱 활용
const textures = useTexture({
  earth: '/textures/earth_2k.jpg',
  moon: '/textures/moon_2k.jpg',
});
```

---

## 2. Responsive Design Issues

### 2.1 Breakpoint Coverage (High Priority)

**현재 상태:**
- 단일 브레이크포인트: `768px`
- 태블릿, 대형 모니터 대응 없음

**권장 브레이크포인트 시스템:**

```css
/* index.css에 추가 */
/* Mobile: default */
/* Tablet Portrait */
@media (min-width: 640px) { ... }

/* Tablet Landscape */
@media (min-width: 768px) { ... }

/* Desktop */
@media (min-width: 1024px) { ... }

/* Large Desktop */
@media (min-width: 1280px) { ... }
```

### 2.2 Component-specific Issues

| 컴포넌트 | 문제 | 해결안 |
|---------|------|--------|
| `.controls-panel` | 모바일에서 버튼 겹침 | `flex-wrap: wrap` + 반응형 gap |
| `.info-panel` | 모바일에서 3D 뷰 가림 | 하단 시트(bottom sheet) 전환 |
| `.graph-panel` | 좁은 화면에서 오버플로우 | 전체화면 모달 전환 |
| `.module-cards` | 작은 화면에서 카드 너무 좁음 | `minmax(280px, 1fr)` |

**권장 모바일 패널 패턴:**

```css
/* 모바일에서 info-panel을 하단 시트로 변환 */
@media (max-width: 640px) {
  .info-panel {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    top: auto;
    width: 100%;
    max-height: 40vh;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    transform: translateY(calc(100% - 48px));
    transition: transform var(--transition-normal);
  }

  .info-panel.expanded {
    transform: translateY(0);
  }
}
```

---

## 3. Accessibility (a11y) Issues

### 3.1 Critical Issues

| 문제 | 현재 | WCAG 기준 | 수정 |
|------|------|----------|------|
| 버튼 라벨 없음 | `<button>▶️</button>` | 2.4.6 | `aria-label="재생"` |
| 색상 대비 | `#64748b` on `#0a0e1a` | 4.5:1 | `#94a3b8` 이상 |
| 키보드 내비게이션 | 부분적 | 전체 지원 | `tabIndex`, `onKeyDown` |
| 스크린리더 | 미지원 | 전체 지원 | ARIA landmarks |

### 3.2 권장 수정

```tsx
// 버튼 접근성 개선
<button
  className="control-btn"
  onClick={togglePlay}
  aria-label={isPlaying ? "일시정지" : "재생"}
  aria-pressed={isPlaying}
>
  {isPlaying ? '⏸' : '▶️'}
</button>

// 슬라이더 접근성
<input
  type="range"
  className="slider-input"
  aria-label="시간 조절"
  aria-valuemin={0}
  aria-valuemax={100}
  aria-valuenow={timeValue * 100}
  aria-valuetext={`${Math.round(timeValue * 24)}시`}
/>

// 랜드마크 추가
<main role="main" aria-label="시뮬레이션 영역">
  <Canvas>...</Canvas>
</main>
<aside role="complementary" aria-label="정보 패널">
  ...
</aside>
```

---

## 4. State Management Issues

### 4.1 Shared Time State Problem

**현재 문제:**
- `appStore.timeValue`가 전역으로 공유됨
- 모듈 간 전환 시 시간 상태 충돌

**권장 해결안:**

```typescript
// 모듈별 독립 시간 상태
interface ModuleTimeState {
  grade4MoonSolar: { timeValue: number; isPlaying: boolean };
  grade6Rotation: { timeValue: number; isPlaying: boolean };
  grade6Season: { timeValue: number; isPlaying: boolean };
}

// 또는 각 모듈에서 로컬 상태 사용
const DayNight = () => {
  const [localTime, setLocalTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  // ...
};
```

### 4.2 Performance Mode Not Working

**문제:** `performanceLevel` 변경 시 3D 씬에 반영 안됨

**원인:** 텍스처 해상도와 그림자 설정이 초기 로드 시에만 적용됨

**해결안:**

```typescript
// 3D 컴포넌트에서 performanceConfig 구독
const Earth = () => {
  const { performanceConfig } = useAppStore();
  const textureUrl = performanceConfig.textureQuality === 'high'
    ? '/textures/earth_8k.jpg'
    : '/textures/earth_2k.jpg';

  // useEffect로 텍스처 동적 교체
  useEffect(() => {
    // 텍스처 리로드 로직
  }, [performanceConfig.textureQuality]);
};
```

---

## 5. Code Architecture Improvements

### 5.1 Component Structure

**현재 구조:**
```
src/
├── modules/
│   ├── grade4-moon-solar/
│   │   ├── Grade4MoonSolar.tsx (라우터 + 전체 로직)
│   │   └── MoonPhase.tsx (3D + UI 혼재)
```

**권장 구조:**
```
src/
├── modules/
│   ├── grade4-moon-solar/
│   │   ├── index.tsx (라우터)
│   │   ├── components/
│   │   │   ├── MoonPhaseScene.tsx (3D 전용)
│   │   │   ├── MoonPhaseControls.tsx (UI 전용)
│   │   │   └── MoonPhaseInfo.tsx (정보 패널)
│   │   ├── hooks/
│   │   │   └── useMoonPhase.ts (비즈니스 로직)
│   │   └── constants.ts
```

### 5.2 Custom Hooks 추출

```typescript
// hooks/useSimulationTime.ts
export const useSimulationTime = (initialValue = 0) => {
  const [time, setTime] = useState(initialValue);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  useFrame((_, delta) => {
    if (isPlaying) {
      setTime(prev => (prev + delta * speed * 0.01) % 1);
    }
  });

  return { time, isPlaying, speed, setTime, setIsPlaying, setSpeed };
};
```

---

## 6. SEO & Meta Tags

**현재 상태:** 기본 index.html만 존재

**권장 추가:**

```html
<!-- index.html -->
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="초등학생을 위한 3D 천문학 시뮬레이터. 달의 위상, 지구의 자전과 공전, 계절의 변화를 직접 체험하세요." />
  <meta name="keywords" content="초등과학, 천문학, 시뮬레이터, 달의위상, 지구자전, 계절변화" />
  <meta property="og:title" content="COSMIC-EDU - 초등 과학 천체 시뮬레이터" />
  <meta property="og:description" content="우주를 직접 조작하며 배우는 3D 천문학 교육" />
  <meta property="og:image" content="/og-image.png" />
  <title>COSMIC-EDU - 초등 과학 천체 시뮬레이터</title>
</head>
```

---

## 7. Priority Action Items

### Immediate (이번 주)
1. ✅ Vite 코드 스플리팅 설정
2. ✅ lazy loading으로 모듈 분리
3. ✅ 버튼에 aria-label 추가

### Short-term (2주 내)
4. 반응형 브레이크포인트 확장 (640px, 1024px, 1280px)
5. 모바일 info-panel을 하단 시트로 변환
6. 모듈별 독립 시간 상태 적용

### Medium-term (1개월)
7. 텍스처 프리로딩 및 캐싱 전략
8. 컴포넌트 구조 리팩토링 (Scene/Controls 분리)
9. 커스텀 훅으로 비즈니스 로직 추출
10. E2E 테스트 추가 (Playwright)

---

## 8. Positive Highlights

- **TypeScript 활용도 높음:** 타입 안정성 확보
- **Zustand 상태 관리:** 간결하고 효과적
- **CSS 변수 시스템:** 일관된 디자인 토큰
- **glassmorphism 디자인:** 현대적이고 교육적 콘텐츠에 적합
- **모듈화 구조:** 학년별 분리로 확장성 좋음
- **React Three Fiber 패턴:** drei 활용 적절함

---

## Conclusion

COSMIC-EDU는 교육용 3D 시뮬레이터로서 우수한 기반을 갖추고 있습니다. **번들 최적화**와 **반응형 확장**에 집중하면 프로덕션 품질에 도달할 수 있습니다. 특히 코드 스플리팅은 즉시 적용 가능하며 사용자 경험을 크게 개선할 것입니다.

---

*Report generated by Senior Frontend Review*
