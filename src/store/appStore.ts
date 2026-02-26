import { create } from 'zustand';
import { PerformanceLevel, detectPerformance, getPerformanceConfig, PerformanceConfig } from '../utils/performanceDetector';

interface AppState {
    // Performance
    performanceLevel: PerformanceLevel;
    performanceConfig: PerformanceConfig;
    setPerformanceLevel: (level: PerformanceLevel) => void;
    initPerformance: () => Promise<void>;

    // Time control
    toastMessage: string | null;
    showToast: (msg: string) => void;
    isPlaying: boolean;
    speed: number; // 1, 10, 100
    timeValue: number; // generic 0~1 range, modules interpret differently
    setPlaying: (playing: boolean) => void;
    setSpeed: (speed: number) => void;
    setTimeValue: (val: number | ((prev: number) => number)) => void;
    togglePlaying: () => void;
    cycleSpeed: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
    performanceLevel: 'high',
    performanceConfig: getPerformanceConfig('high'),
    setPerformanceLevel: (level) =>
        set({ performanceLevel: level, performanceConfig: getPerformanceConfig(level) }),
    initPerformance: async () => {
        const level = await detectPerformance();
        set({ performanceLevel: level, performanceConfig: getPerformanceConfig(level) });
    },

    toastMessage: null,
    showToast: (msg) => {
        set({ toastMessage: msg });
        setTimeout(() => set((s) => (s.toastMessage === msg ? { toastMessage: null } : s)), 3000);
    },
    isPlaying: false,
    speed: 1,
    timeValue: 0,
    setPlaying: (playing) => set({ isPlaying: playing }),
    setSpeed: (speed) => set({ speed }),
    setTimeValue: (val) => {
        if (typeof val === 'function') {
            set((s) => ({ timeValue: val(s.timeValue) }));
        } else {
            set({ timeValue: val });
        }
    },
    togglePlaying: () => set((s) => ({ isPlaying: !s.isPlaying })),
    cycleSpeed: () => {
        const speeds = [1, 2, 5, 10, 50, 100];
        const current = get().speed;
        const idx = speeds.indexOf(current);
        set({ speed: speeds[(idx + 1) % speeds.length] });
    },
}));
