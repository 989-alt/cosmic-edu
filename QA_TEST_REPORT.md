# COSMIC-EDU QA 테스트 보고서

**테스트 일시:** 2026-02-27
**테스트 대상:** COSMIC-EDU 3D 천체 시뮬레이터 (http://localhost:5175)
**테스트 방법:** 코드 리뷰 및 정적 분석
**빌드 상태:** ✅ 성공 (bundle size: 1.25MB)

---

## 📋 전체 요약

### 테스트 범위
- ✅ 홈 페이지 (모듈 카드, 헤더, 네비게이션)
- ✅ 4학년 모듈 (달의 위상, 태양계, 일식/월식)
- ✅ 6학년 자전/공전 모듈 (낮과 밤, 공전)
- ✅ 6학년 계절 모듈 (태양 고도, 남중 고도, 에너지 밀도, 자전축)
- ✅ 공통 컴포넌트 (학습 목표, 퀴즈, 온보딩, 컨트롤)

### 발견된 주요 이슈
- **심각도 높음:** 1개
- **심각도 중간:** 8개
- **심각도 낮음:** 12개
- **개선 제안:** 15개

---

## 🔴 심각도 높음 (Critical)

### C1. 번들 크기 초과 경고
**위치:** 전체 애플리케이션
**설명:** 빌드 시 번들 크기가 1.25MB로 500KB 권장 크기를 초과함
```
(!) Some chunks are larger than 500 kB after minification.
dist/assets/index-DOeX97Eu.js   1,252.33 kB │ gzip: 349.21 kB
```
**영향:**
- 초기 로딩 시간 증가 (특히 저속 네트워크)
- 모바일 환경에서 성능 저하
- 데이터 사용량 증가

**권장 해결책:**
1. Dynamic import()로 모듈 코드 분할
2. Three.js 텍스처를 lazy loading으로 전환
3. React.lazy()로 라우트 기반 코드 스플리팅

---

## 🟡 심각도 중간 (High)

### H1. 텍스처 로딩 에러 처리 부재
**위치:** 모든 3D 모듈 (MoonPhase.tsx, Eclipse.tsx, DailyShadowLab.tsx 등)
**설명:** `useTexture()` 훅 사용 시 에러 핸들링이 없음
```typescript
// 현재 코드
const sunMap = useTexture(getTexturePath('sun'));
```
**문제점:**
- 텍스처 로딩 실패 시 앱 크래시 가능
- 네트워크 오류 시 사용자에게 피드백 없음
- 개발 환경과 프로덕션 환경 경로 차이로 인한 오류 가능성

**재현 방법:**
1. 네트워크를 오프라인으로 전환
2. 모듈 페이지 접속
3. 텍스처 로딩 실패로 빈 화면 표시

**권장 해결책:**
```typescript
// Suspense 경계 추가
<Suspense fallback={<Loader />}>
  <Scene />
</Suspense>
```

---

### H2. 반응형 레이아웃 미흡
**위치:** 모든 모듈 페이지
**설명:** 768px 이하에서 일부 CSS만 반응형 처리됨

**문제점:**
- 그래프 패널 (380px 고정 너비)이 좁은 화면에서 잘림
- 컨트롤 패널이 화면 밖으로 넘침
- 정보 패널이 콘텐츠를 가림

**영향받는 요소:**
```css
.graph-panel { width: 380px; } /* 모바일에서 너비 초과 */
.controls-panel { min-width: 450px; } /* DailyShadowLab */
.info-panel { width: 320px; } /* 태블릿에서 260px로만 축소 */
```

**권장 해결책:**
```css
@media (max-width: 480px) {
  .graph-panel { width: calc(100vw - 32px); }
  .controls-panel { min-width: auto; flex-direction: column; }
}
```

---

### H3. 접근성 (a11y) 문제
**위치:** 전체 UI 컴포넌트
**설명:** 키보드 네비게이션 및 스크린 리더 지원 부족

**구체적 문제:**
1. **버튼에 aria-label 없음**
```typescript
// 현재
<button className="control-btn" onClick={togglePlaying}>
  {isPlaying ? '⏸' : '▶'}
</button>

// 개선 필요
<button aria-label={isPlaying ? "일시정지" : "재생"}>
```

2. **슬라이더에 레이블 연결 안됨**
```typescript
// 현재
<span className="slider-label">음력 날짜: {lunarDay}일</span>
<input type="range" ... />

// 개선 필요
<label htmlFor="lunar-slider">음력 날짜: {lunarDay}일</label>
<input id="lunar-slider" type="range" aria-valuetext={`${lunarDay}일`} />
```

3. **모달 다이얼로그 role 누락**
```typescript
// LearningObjectives, LearningQuiz 모달
<div className="objectives-overlay">
  <div className="objectives-modal"> {/* role="dialog" 필요 */}
```

4. **포커스 트랩 없음**
- 모달 열릴 때 배경 요소에 포커스 가능
- ESC 키로 닫기 기능 없음

---

### H4. 온보딩 튜토리얼 스킵 후 재시작 불가
**위치:** OnboardingTutorial.tsx
**설명:** 온보딩을 건너뛴 후 다시 볼 수 있는 방법이 UI에 없음

```typescript
// resetOnboarding() 함수는 있지만 UI에서 호출 불가
export function resetOnboarding() {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
}
```

**권장 해결책:**
- AboutModal 또는 헤더에 "튜토리얼 다시보기" 버튼 추가
- 설정 메뉴 추가

---

### H5. 학습 목표 팝업 세션 스토리지 사용
**위치:** LearningObjectives.tsx
**설명:** sessionStorage 사용으로 새 탭에서 매번 표시됨

```typescript
const seen = sessionStorage.getItem(storageKey);
```

**문제점:**
- 사용자가 같은 모듈을 여러 탭에서 열 때마다 팝업 표시
- localStorage 사용이 더 적합

**권장 해결책:**
```typescript
const seen = localStorage.getItem(storageKey);
```

---

### H6. 성능 모드 전환 시 텍스처 미반영
**위치:** appStore.ts, 모든 3D 씬
**설명:** 고사양/저사양 모드 변경해도 이미 로드된 텍스처는 변경되지 않음

```typescript
// performanceDetector.ts에서 textureResolution 정의
high: { textureResolution: '8k', ... }
low: { textureResolution: '2k', ... }

// 하지만 useTexture()는 초기 로드 시에만 실행됨
```

**재현 방법:**
1. 고사양 모드에서 모듈 로드
2. 저사양 모드로 전환
3. 텍스처는 여전히 8K 유지

**영향:**
- 토스트 메시지만 표시되고 실제 성능 변화 없음
- 사용자 혼란

**권장 해결책:**
- 성능 모드 변경 시 페이지 리로드 또는
- 텍스처를 동적으로 교체하는 로직 추가

---

### H7. Eclipse 모듈 일식 감지 로직 정확도 부족
**위치:** Eclipse.tsx, detectEclipseType()
**설명:** 단순 범위 체크로 일식 판정

```typescript
function detectEclipseType(lunarDay: number, orbitTilt: number): string | null {
    if (lunarDay <= 2 || lunarDay >= 29) { // 너무 넓은 범위
        if (tiltEffect < 1.5) return 'total-solar';
    }
}
```

**문제점:**
- 음력 1~2일, 29~30일 전체에서 일식 발생으로 표시
- 실제로는 더 정밀한 계산 필요

**권장 개선:**
```typescript
// 음력 1일 (삭) 기준 ±0.5일 범위로 좁히기
if (Math.abs(lunarDay - 1) < 0.5 || Math.abs(lunarDay - 30) < 0.5)
```

---

### H8. DailyShadowLab 자동 재생 종료 후 재시작 UX
**위치:** DailyShadowLab.tsx
**설명:** 자동 재생이 끝나면 t=1에서 멈추고, 다시 재생하려면 슬라이더를 수동으로 0으로 이동해야 함

```typescript
const next = prev + delta * 0.08;
if (next >= 1) {
    setIsPlaying(false);
    return 1; // 끝에서 멈춤
}
```

**권장 개선:**
- 재생 버튼 클릭 시 t >= 0.99면 자동으로 t=0으로 리셋 (이미 구현됨)
- 또는 루프 재생 옵션 추가

---

## 🟢 심각도 낮음 (Medium)

### M1. Console 에러/경고 가능성
**위치:** 여러 컴포넌트
**설명:** React 19 StrictMode에서 잠재적 경고 발생 가능

**잠재적 문제:**
1. **useFrame 내 setState 호출**
```typescript
// MoonPhase.tsx
useFrame((_, delta) => {
    if (isPlaying) {
        setTimeValue((prev: number) => { ... }); // 매 프레임 호출
    }
});
```

2. **직접적인 getState() 호출**
```typescript
// MoonPhase.tsx line 149
value={useAppStore.getState().timeValue}
onChange={(e) => useAppStore.getState().setTimeValue(...)}
```
- 컴포넌트 외부에서 호출하면 리렌더링 트리거 안됨

3. **key prop 누락**
```typescript
// AutoGraph에서 여러 canvas 렌더링 시 key 없음
```

---

### M2. 타입 안전성 문제
**위치:** 여러 컴포넌트
**설명:** any 타입 사용 및 타입 단언

**예시:**
```typescript
// appStore.ts
setTimeValue: (val: number | ((prev: number) => number)) => {
    if (typeof val === 'function') {
        set((s) => ({ timeValue: val(s.timeValue) })); // 함수 타입 추론 불완전
    }
}
```

---

### M3. InfoPanel 너비 하드코딩
**위치:** InfoPanel 컴포넌트
**설명:** 320px 고정 너비

```css
.info-panel { width: 320px; }
```

**문제:**
- 긴 텍스트나 다국어 지원 시 제약
- 콘텐츠가 많은 모듈에서 스크롤 과다

---

### M4. 3D 씬 카메라 초기 위치 일관성 부족
**위치:** 각 모듈의 Canvas 컴포넌트
**설명:** 모듈마다 카메라 위치가 다름

```typescript
// MoonPhase: [0, 20, 25]
// Eclipse: [0, 30, 40]
// DailyShadowLab: [0, 14, 18]
// SolarSystem: [0, 50, 80]
```

**영향:**
- 모듈 간 전환 시 급격한 시점 변화로 혼란
- 학습 흐름 방해

**권장 개선:**
- 각 모듈의 특성에 맞되, 일관된 패턴 유지
- 카메라 애니메이션으로 부드러운 전환

---

### M5. 시간 컨트롤 상태 모듈 간 공유
**위치:** appStore.ts
**설명:** isPlaying, speed, timeValue가 전역 상태

**문제점:**
- 모듈 A에서 재생 중 → 모듈 B로 이동 → 여전히 재생 중
- timeValue 범위가 모듈마다 다른 의미 (음력 날짜 vs 시간 vs 계절)

**권장 개선:**
- 모듈별 로컬 상태 사용
- 또는 모듈 전환 시 자동 리셋

---

### M6. 그래프 렌더링 최적화 부족
**위치:** DailyShadowLab.tsx, AutoGraph
**설명:** 매 timeT 변경마다 canvas 전체 다시 그림

```typescript
useEffect(() => {
    // 매번 clearRect + 전체 재렌더링
    ctx.clearRect(0, 0, w, h);
    // ... 모든 그리기 로직
}, [t, data, label, color, yRange, unit]); // t가 자주 변경됨
```

**개선 방법:**
- requestAnimationFrame 사용
- 불필요한 재렌더링 방지 (useMemo, useCallback)

---

### M7. OrbitControls 설정 일관성 부족
**위치:** 각 모듈
**설명:** enablePan, minDistance, maxDistance가 모듈마다 다름

```typescript
// MoonPhase
<OrbitControls enablePan={false} minDistance={10} maxDistance={60} />

// DailyShadowLab
<OrbitControls enablePan={false} maxDistance={30} minDistance={5} />
```

**영향:**
- 일부 모듈에서 너무 가까이/멀리 줌 가능
- 사용자 혼란

---

### M8. 퀴즈 데이터 하드코딩
**위치:** LearningQuiz.tsx
**설명:** 모든 퀴즈가 컴포넌트 내부에 하드코딩됨

```typescript
const QUIZZES: Record<string, QuizData> = {
    'grade4-moon-solar': { ... },
    // ...
}
```

**개선 방법:**
- JSON 파일로 분리
- 다국어 지원 용이
- 교육자가 퀴즈 수정 가능

---

### M9. HTML-in-Canvas 라벨 성능
**위치:** 모든 3D 씬에서 Html 컴포넌트 사용
**설명:** drei의 Html 컴포넌트는 DOM 요소로 매 프레임 위치 계산

```typescript
<Html position={[x, y + 1.5, z]} center>
    <div>달</div>
</Html>
```

**영향:**
- 많은 라벨 사용 시 성능 저하
- 특히 애니메이션 중 끊김 가능

**개선 방법:**
- Sprite 또는 Text 컴포넌트 사용
- 필수 라벨만 Html로 유지

---

### M10. 색상 값 하드코딩
**위치:** 여러 컴포넌트
**설명:** CSS 변수 대신 직접 색상 코드 사용

```typescript
// DailyShadowLab.tsx
<div style={{ color: '#fbbf24' }}>태양 고도</div>
```

**문제:**
- 테마 변경 시 수정 어려움
- CSS 변수와 불일치

**권장:**
```typescript
<div style={{ color: 'var(--accent-sun)' }}>태양 고도</div>
```

---

### M11. 에러 경계 부재
**위치:** App.tsx
**설명:** React Error Boundary가 없음

**영향:**
- 컴포넌트 오류 시 전체 앱 크래시
- 사용자에게 에러 페이지 대신 빈 화면

**권장 추가:**
```typescript
<ErrorBoundary fallback={<ErrorPage />}>
  <Routes>...</Routes>
</ErrorBoundary>
```

---

### M12. 달 위상 2D 프리뷰 일식 표시 개선 필요
**위치:** MoonPhase2D.tsx (추정)
**설명:** Eclipse 모듈에서 eclipseType prop 전달하지만 2D 프리뷰가 일식을 명확히 표현 못할 수 있음

---

## 💡 개선 제안 (Enhancement)

### E1. 로딩 상태 개선
**설명:** 초기 로딩 시 진행률 표시

**현재:**
```typescript
<Loader dataInterpolation={(p) => `우주 데이터를 불러오는 중... ${Math.round(p)}%`} />
```

**개선안:**
- 스켈레톤 UI 추가
- 텍스처별 로딩 상태 표시

---

### E2. 다크 모드 토글
**설명:** 현재 다크 테마만 제공, 라이트 모드 옵션 없음

---

### E3. 스크린샷/녹화 기능
**설명:** 학습 내용 캡처 기능

---

### E4. 즐겨찾기/북마크
**설명:** 자주 사용하는 모듈 즐겨찾기

---

### E5. 학습 진행도 추적
**설명:** LocalStorage로 방문한 모듈, 완료한 퀴즈 저장

---

### E6. 애니메이션 속도 프리셋
**설명:** 현재 1, 2, 5, 10, 50, 100 중 선택

**개선안:**
- "느림(×1)", "보통(×5)", "빠름(×20)" 같은 명확한 레이블
- 각 모듈에 최적화된 기본 속도

---

### E7. 모듈 설명 영상/GIF
**설명:** 각 모듈 시작 전 미리보기 영상

---

### E8. 교사용 대시보드
**설명:** 학생 학습 데이터 조회 (별도 백엔드 필요)

---

### E9. 소리 효과
**설명:** 버튼 클릭, 퀴즈 정답 시 사운드

---

### E10. VR 모드
**설명:** WebXR로 VR 헤드셋 지원

---

### E11. 다국어 지원
**설명:** 영어, 일본어 등 추가

---

### E12. 인쇄 가능 워크시트
**설명:** PDF 다운로드 기능

---

### E13. 게임화 요소
**설명:** 배지, 레벨, 리더보드

---

### E14. 협업 모드
**설명:** 여러 사용자가 동시에 같은 씬 조작

---

### E15. 접근성 모드
**설명:** 색맹 지원 팔레트, 고대비 모드

---

## 🎯 우선순위 권장 사항

### 즉시 수정 필요 (P0)
1. C1 - 번들 크기 최적화 (코드 스플리팅)
2. H1 - 텍스처 에러 처리
3. H3 - 기본 접근성 개선 (aria-label, role)

### 다음 릴리즈 (P1)
4. H2 - 반응형 레이아웃 완성
5. H6 - 성능 모드 실제 적용
6. M11 - Error Boundary 추가

### 향후 개선 (P2)
7. H4, H5 - 사용자 경험 개선
8. M1~M10 - 코드 품질 개선
9. E1~E6 - 주요 기능 추가

---

## ✅ 긍정적 평가 항목

1. **우수한 UI/UX 디자인**
   - 글래스모피즘 스타일 일관성
   - 직관적인 아이콘 사용
   - 부드러운 애니메이션

2. **교육적 가치**
   - 학습 목표 명확
   - 퀴즈로 복습 가능
   - 실시간 피드백

3. **코드 구조**
   - 컴포넌트 재사용성 높음
   - TypeScript로 타입 안전성
   - Zustand로 상태 관리 간결

4. **3D 시각화**
   - Three.js 활용 우수
   - 실제 천문 현상 정확히 표현
   - 그래프 연동으로 이해도 향상

5. **온보딩 경험**
   - 첫 방문자 가이드 제공
   - 각 모듈별 학습 목표 팝업

---

## 📊 테스트 환경

- **브라우저:** Chrome 최신 버전 (추정)
- **OS:** Windows 11
- **Node.js:** v20+ (추정)
- **빌드 도구:** Vite 7.3.1
- **React:** 19.2.4
- **Three.js:** 0.183.1

---

## 📝 추가 테스트 권장 사항

1. **실제 브라우저 테스트**
   - Chrome, Firefox, Safari, Edge에서 크로스 브라우저 테스트
   - 모바일 실기기 테스트 (iOS Safari, Chrome Android)

2. **성능 프로파일링**
   - Chrome DevTools Performance 탭으로 FPS 측정
   - Lighthouse 스코어 확인

3. **사용자 테스트**
   - 실제 초등학생/교사 대상 UX 테스트
   - A/B 테스트로 UI 개선

4. **자동화 테스트 추가**
   - Playwright/Cypress로 E2E 테스트
   - Jest로 유닛 테스트
   - Visual regression 테스트

---

**보고서 작성자:** QA Tester Agent
**다음 리뷰 예정일:** 코드 수정 후
