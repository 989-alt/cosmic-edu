export interface PlanetData {
  id: string;
  name: string;
  nameKo: string;
  diameter: number; // km
  mass: string; // scientific notation string
  rotationPeriod: number; // hours
  orbitalPeriod: number; // Earth days
  distanceAU: number; // AU from Sun
  axialTilt: number; // degrees
  hasRing: boolean;
  ringColor?: string;
  color: string; // fallback color
  description: string;
}

export const SUN_DIAMETER = 1_391_000; // km

export const planets: PlanetData[] = [
  {
    id: 'mercury',
    name: 'Mercury',
    nameKo: '수성',
    diameter: 4_879,
    mass: '3.30 × 10²³ kg',
    rotationPeriod: 1407.6,
    orbitalPeriod: 88,
    distanceAU: 0.39,
    axialTilt: 0.034,
    hasRing: false,
    color: '#8c7e6d',
    description: '태양에서 가장 가까운 행성으로, 대기가 거의 없어 낮과 밤의 온도 차이가 매우 큽니다.',
  },
  {
    id: 'venus',
    name: 'Venus',
    nameKo: '금성',
    diameter: 12_104,
    mass: '4.87 × 10²⁴ kg',
    rotationPeriod: -5832.5, // retrograde
    orbitalPeriod: 225,
    distanceAU: 0.72,
    axialTilt: 177.4,
    hasRing: false,
    color: '#e8cda0',
    description: '두꺼운 이산화탄소 대기로 인해 표면 온도가 약 465°C로, 태양계에서 가장 뜨거운 행성입니다.',
  },
  {
    id: 'earth',
    name: 'Earth',
    nameKo: '지구',
    diameter: 12_742,
    mass: '5.97 × 10²⁴ kg',
    rotationPeriod: 23.93,
    orbitalPeriod: 365.25,
    distanceAU: 1.0,
    axialTilt: 23.44,
    hasRing: false,
    color: '#4a90d9',
    description: '생명체가 사는 유일한 행성으로, 물이 액체 상태로 존재할 수 있는 적절한 온도를 가지고 있습니다.',
  },
  {
    id: 'mars',
    name: 'Mars',
    nameKo: '화성',
    diameter: 6_779,
    mass: '6.42 × 10²³ kg',
    rotationPeriod: 24.62,
    orbitalPeriod: 687,
    distanceAU: 1.52,
    axialTilt: 25.19,
    hasRing: false,
    color: '#c1440e',
    description: '붉은 행성이라 불리며, 표면에 산화철(녹)이 많아 붉게 보입니다.',
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    nameKo: '목성',
    diameter: 139_820,
    mass: '1.90 × 10²⁷ kg',
    rotationPeriod: 9.93,
    orbitalPeriod: 4333,
    distanceAU: 5.20,
    axialTilt: 3.13,
    hasRing: true,
    ringColor: '#8B7355',
    color: '#c88b3a',
    description: '태양계에서 가장 큰 행성으로, 대적점이라는 거대한 폭풍이 수백 년째 계속되고 있습니다.',
  },
  {
    id: 'saturn',
    name: 'Saturn',
    nameKo: '토성',
    diameter: 116_460,
    mass: '5.68 × 10²⁶ kg',
    rotationPeriod: 10.66,
    orbitalPeriod: 10759,
    distanceAU: 9.58,
    axialTilt: 26.73,
    hasRing: true,
    ringColor: '#D4AA6A',
    color: '#e8d5a3',
    description: '아름다운 고리로 유명한 행성으로, 고리는 얼음과 암석 조각으로 이루어져 있습니다.',
  },
  {
    id: 'uranus',
    name: 'Uranus',
    nameKo: '천왕성',
    diameter: 50_724,
    mass: '8.68 × 10²⁵ kg',
    rotationPeriod: -17.24, // retrograde
    orbitalPeriod: 30687,
    distanceAU: 19.2,
    axialTilt: 97.77,
    hasRing: true,
    ringColor: '#5F8FAF',
    color: '#73c2d4',
    description: '자전축이 거의 옆으로 누워있는 행성으로, 메탄 가스 때문에 청록색으로 보입니다.',
  },
  {
    id: 'neptune',
    name: 'Neptune',
    nameKo: '해왕성',
    diameter: 49_244,
    mass: '1.02 × 10²⁶ kg',
    rotationPeriod: 16.11,
    orbitalPeriod: 60190,
    distanceAU: 30.07,
    axialTilt: 28.32,
    hasRing: true,
    ringColor: '#4169A0',
    color: '#3f54ba',
    description: '태양계에서 가장 먼 행성으로, 태양계에서 가장 강한 바람(시속 2,100km)이 붑니다.',
  },
];
