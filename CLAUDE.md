# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

COSMIC-EDU is an interactive 3D astronomy simulator for Korean elementary school science education. It uses React Three Fiber (R3F) for WebGL-based 3D visualizations of celestial mechanics, targeting grades 4-6 curriculum.

## Commands

```bash
npm run dev      # Start development server (Vite)
npm run build    # TypeScript check + production build
npm run lint     # ESLint
npm run preview  # Preview production build
```

## Architecture

### Module Structure
The app is organized by Korean elementary grade/semester curriculum units:

- **`/grade4-moon-solar`** - 4th grade astronomy: Moon phases, Solar System sandbox, Eclipses
- **`/grade6-rotation`** - 6th grade Earth motion: Day/night cycle, Earth's revolution
- **`/grade6-season`** - 6th grade seasons: Daily sun altitude, Seasonal altitude, Energy density, Axis tilt impact

Each grade module (`Grade4MoonSolar.tsx`, etc.) is a container with sub-module navigation that renders specific 3D simulations.

### 3D Rendering Pattern
Simulations use a consistent pattern:
1. React Three Fiber `<Canvas>` as the root 3D container
2. A `Scene` component containing celestial bodies and lighting
3. `useFrame` hook for animation tied to global time state
4. `@react-three/drei` helpers: `OrbitControls`, `Html` (3D-anchored labels), `useTexture`
5. Textures loaded via `getTexturePath()` utility with high/low quality variants

### State Management
Zustand store (`src/store/appStore.ts`) manages:
- `performanceLevel` / `performanceConfig` - Auto-detected or user-toggled (high/low)
- `timeValue` (0-1 normalized) - Modules interpret this as lunar days, hours, seasons, etc.
- `isPlaying` / `speed` - Animation control with 1x-100x speed multipliers

### Performance System
`performanceDetector.ts` runs a WebGL benchmark on startup to auto-select quality:
- **High**: 8K textures, shadows, bloom, 5000 stars
- **Low**: 2K textures, no shadows/bloom, 500 stars

### Data Files
Static scientific data in `src/data/`:
- `planets.ts` - Solar system planet properties (diameter, orbital period, etc.)
- `moonPhases.ts` - Lunar phase names, illumination, orbital angles
- `constellations.ts` - Star patterns for constellation viewer
- `eclipseData.ts`, `shadowLabData.ts` - Simulation-specific datasets

### Shared Components
- `InfoPanel` - Glassmorphism overlay showing simulation stats
- `LearningObjectives` / `LearningQuiz` - Educational scaffolding per module
- `TimeControlDial` - Play/pause, speed control, time slider
- `MoonPhase2D` - Canvas-based 2D moon phase visualization
- `OnboardingTutorial` / `ControlHints` - First-time user guidance

## Key Conventions

- All user-facing text is in Korean (한국어)
- Texture paths use `getTexturePath(key)` to handle quality switching
- Time is normalized 0-1 in store; each simulation interprets it contextually
- 3D scenes use consistent coordinate system: Y-up, Z-toward camera
- CSS variables defined in `index.css` for theming (`--bg-glass`, `--accent-sun`, etc.)
