import { create } from 'zustand';

/** 6학년 2학기 네 탭이 공유하는 상태. 월(1~12) 하나뿐이다. */
interface SeasonState {
    month: number; // 1~12, 실수 허용
    setMonth: (m: number) => void;
}

export const useSeasonStore = create<SeasonState>((set) => ({
    month: 6,
    setMonth: (m) => set({ month: Math.max(1, Math.min(12, m)) }),
}));
