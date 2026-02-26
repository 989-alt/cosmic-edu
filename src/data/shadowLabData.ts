// 하루 동안 시간별 태양 고도·그림자 길이·기온 데이터 (한국 위도 37°N, 여름 기준)
export interface TimeSlotData {
    time: string;
    hour: number;
    altitude: number;    // 태양 고도 (°)
    shadowLength: number; // 그림자 길이 (cm, 막대 높이 100cm 기준)
    temperature: number;  // 기온 (°C)
}

// 하루 동안 데이터 (여름 기준 — 7월)
export const dailyShadowData: TimeSlotData[] = [
    { time: '9:30', hour: 9.5, altitude: 45, shadowLength: 100, temperature: 27 },
    { time: '10:30', hour: 10.5, altitude: 57, shadowLength: 65, temperature: 29 },
    { time: '11:30', hour: 11.5, altitude: 68, shadowLength: 40, temperature: 31 },
    { time: '12:30', hour: 12.5, altitude: 76, shadowLength: 25, temperature: 32 },
    { time: '13:30', hour: 13.5, altitude: 68, shadowLength: 40, temperature: 33 },
    { time: '14:30', hour: 14.5, altitude: 57, shadowLength: 65, temperature: 33 },
];

// 계절별 데이터 (한국 위도 37°N)
export interface SeasonalData {
    season: string;
    seasonEn: string;
    month: number; // 대표 월
    meridianAltitude: number; // 남중 고도 (°)
    dayLength: number; // 낮 길이 (시간)
    nightLength: number; // 밤 길이 (시간)
    avgTemperature: number; // 평균 기온 (°C)
    declination: number; // 적위 (°)
}

export const seasonalData: SeasonalData[] = [
    {
        season: '봄 (춘분)', seasonEn: 'Spring Equinox', month: 3,
        meridianAltitude: 53, dayLength: 12, nightLength: 12,
        avgTemperature: 12, declination: 0,
    },
    {
        season: '여름 (하지)', seasonEn: 'Summer Solstice', month: 6,
        meridianAltitude: 76.5, dayLength: 14.8, nightLength: 9.2,
        avgTemperature: 26, declination: 23.5,
    },
    {
        season: '가을 (추분)', seasonEn: 'Autumn Equinox', month: 9,
        meridianAltitude: 53, dayLength: 12, nightLength: 12,
        avgTemperature: 20, declination: 0,
    },
    {
        season: '겨울 (동지)', seasonEn: 'Winter Solstice', month: 12,
        meridianAltitude: 29.5, dayLength: 9.5, nightLength: 14.5,
        avgTemperature: -2, declination: -23.5,
    },
];

// 월별 상세 데이터
export interface MonthlyData {
    month: number;
    monthName: string;
    meridianAltitude: number;
    dayLength: number;
    avgTemperature: number;
}

export const monthlyData: MonthlyData[] = [
    { month: 1, monthName: '1월', meridianAltitude: 30, dayLength: 9.7, avgTemperature: -3 },
    { month: 2, monthName: '2월', meridianAltitude: 38, dayLength: 10.7, avgTemperature: -0.5 },
    { month: 3, monthName: '3월', meridianAltitude: 53, dayLength: 12, avgTemperature: 5 },
    { month: 4, monthName: '4월', meridianAltitude: 63, dayLength: 13.2, avgTemperature: 12 },
    { month: 5, monthName: '5월', meridianAltitude: 72, dayLength: 14.2, avgTemperature: 18 },
    { month: 6, monthName: '6월', meridianAltitude: 76.5, dayLength: 14.8, avgTemperature: 23 },
    { month: 7, monthName: '7월', meridianAltitude: 74, dayLength: 14.4, avgTemperature: 26 },
    { month: 8, monthName: '8월', meridianAltitude: 67, dayLength: 13.5, avgTemperature: 26 },
    { month: 9, monthName: '9월', meridianAltitude: 53, dayLength: 12, avgTemperature: 21 },
    { month: 10, monthName: '10월', meridianAltitude: 44, dayLength: 11, avgTemperature: 15 },
    { month: 11, monthName: '11월', meridianAltitude: 34, dayLength: 10.1, avgTemperature: 7 },
    { month: 12, monthName: '12월', meridianAltitude: 29.5, dayLength: 9.5, avgTemperature: 0 },
];

export function calculateMeridianAltitude(latitude: number, declination: number): number {
    return 90 - latitude + declination;
}

export function calculateShadowLength(stickHeight: number, altitudeDeg: number): number {
    if (altitudeDeg <= 0) return Infinity;
    if (altitudeDeg >= 90) return 0;
    return stickHeight / Math.tan((altitudeDeg * Math.PI) / 180);
}

export function calculateEnergyDensity(altitudeDeg: number): number {
    return Math.sin((altitudeDeg * Math.PI) / 180);
}
