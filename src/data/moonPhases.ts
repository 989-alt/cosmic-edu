export interface MoonPhaseData {
    day: number; // 음력 날짜 (1~30)
    name: string;
    nameEn: string;
    emoji: string;
    angle: number; // 달의 궤도 각도 (0~360)
    illumination: number; // 0~1
    description: string;
}

export const moonPhases: MoonPhaseData[] = [
    { day: 1, name: '삭 (그믐 다음날)', nameEn: 'New Moon', emoji: '🌑', angle: 0, illumination: 0, description: '달이 태양과 같은 방향에 있어 보이지 않습니다.' },
    { day: 3, name: '초승달', nameEn: 'Waxing Crescent', emoji: '🌒', angle: 36, illumination: 0.1, description: '해가 진 후 서쪽 하늘에서 가느다란 달을 볼 수 있습니다.' },
    { day: 7, name: '상현달', nameEn: 'First Quarter', emoji: '🌓', angle: 90, illumination: 0.5, description: '달의 오른쪽 반이 밝게 보입니다. 낮 12시에 뜨고 자정에 집니다.' },
    { day: 10, name: '상현과 보름 사이', nameEn: 'Waxing Gibbous', emoji: '🌔', angle: 120, illumination: 0.75, description: '달의 대부분이 밝게 빛나며, 보름달에 가까워지고 있습니다.' },
    { day: 15, name: '보름달 (망)', nameEn: 'Full Moon', emoji: '🌕', angle: 180, illumination: 1.0, description: '달 전체가 둥글게 빛납니다. 해가 질 때 동쪽에서 뜨고 해가 뜰 때 서쪽으로 집니다.' },
    { day: 18, name: '보름과 하현 사이', nameEn: 'Waning Gibbous', emoji: '🌖', angle: 216, illumination: 0.75, description: '보름달 이후 왼쪽부터 어두워지기 시작합니다.' },
    { day: 22, name: '하현달', nameEn: 'Last Quarter', emoji: '🌗', angle: 270, illumination: 0.5, description: '달의 왼쪽 반이 밝게 보입니다. 자정에 뜨고 낮 12시에 집니다.' },
    { day: 25, name: '그믐달', nameEn: 'Waning Crescent', emoji: '🌘', angle: 300, illumination: 0.15, description: '새벽 동쪽 하늘에서 가느다란 달을 볼 수 있습니다.' },
    { day: 30, name: '그믐', nameEn: 'Dark Moon', emoji: '🌑', angle: 360, illumination: 0, description: '달이 다시 태양 방향으로 돌아가 거의 보이지 않습니다.' },
];

export function getMoonPhaseForDay(day: number): MoonPhaseData {
    const clamped = Math.max(1, Math.min(30, Math.round(day)));
    // Find nearest phase
    let nearest = moonPhases[0];
    let minDist = Infinity;
    for (const phase of moonPhases) {
        const dist = Math.abs(phase.day - clamped);
        if (dist < minDist) {
            minDist = dist;
            nearest = phase;
        }
    }
    return nearest;
}

export function getMoonAngleForDay(day: number): number {
    return ((day - 1) / 29.5) * 360;
}

export function getMoonIlluminationForDay(day: number): number {
    const angle = getMoonAngleForDay(day);
    return (1 - Math.cos((angle * Math.PI) / 180)) / 2;
}
