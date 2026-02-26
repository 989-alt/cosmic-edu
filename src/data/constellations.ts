export interface ConstellationStar {
    ra: number;  // right ascension (hours)
    dec: number; // declination (degrees)
}

export interface ConstellationData {
    id: string;
    name: string;
    nameKo: string;
    season: 'spring' | 'summer' | 'autumn' | 'winter';
    zodiac: boolean;
    eclipticLongitude: number; // degrees (0-360)
    stars: ConstellationStar[];
    lines: [number, number][]; // pairs of star indices to connect
    description: string;
}

export const constellations: ConstellationData[] = [
    // 봄
    {
        id: 'leo', name: 'Leo', nameKo: '사자자리', season: 'spring', zodiac: true,
        eclipticLongitude: 150,
        stars: [
            { ra: 10.14, dec: 11.97 }, { ra: 10.33, dec: 19.84 }, { ra: 10.28, dec: 23.42 },
            { ra: 11.24, dec: 20.52 }, { ra: 11.82, dec: 14.57 }, { ra: 11.35, dec: 10.53 },
        ],
        lines: [[0, 1], [1, 2], [1, 3], [3, 4], [4, 5], [5, 0]],
        description: '봄철 남쪽 하늘에서 볼 수 있는 별자리로, 1등성 레굴루스가 있습니다.',
    },
    {
        id: 'virgo', name: 'Virgo', nameKo: '처녀자리', season: 'spring', zodiac: true,
        eclipticLongitude: 180,
        stars: [
            { ra: 13.42, dec: -11.16 }, { ra: 13.17, dec: -5.54 }, { ra: 12.69, dec: -1.45 },
            { ra: 12.33, dec: -0.67 }, { ra: 11.84, dec: 1.76 },
        ],
        lines: [[0, 1], [1, 2], [2, 3], [3, 4]],
        description: '봄철 별자리 중 가장 크며, 1등성 스피카가 밝게 빛납니다.',
    },
    // 여름
    {
        id: 'scorpius', name: 'Scorpius', nameKo: '전갈자리', season: 'summer', zodiac: true,
        eclipticLongitude: 240,
        stars: [
            { ra: 16.49, dec: -26.43 }, { ra: 16.00, dec: -22.62 }, { ra: 15.98, dec: -26.11 },
            { ra: 16.84, dec: -34.29 }, { ra: 17.20, dec: -37.30 }, { ra: 17.62, dec: -43.00 },
        ],
        lines: [[0, 1], [0, 2], [0, 3], [3, 4], [4, 5]],
        description: '여름철 남쪽 하늘에서 볼 수 있으며, 붉은 1등성 안타레스가 심장 부분에 있습니다.',
    },
    {
        id: 'sagittarius', name: 'Sagittarius', nameKo: '궁수자리', season: 'summer', zodiac: true,
        eclipticLongitude: 270,
        stars: [
            { ra: 18.40, dec: -29.83 }, { ra: 18.10, dec: -30.42 }, { ra: 18.35, dec: -25.42 },
            { ra: 19.04, dec: -29.88 }, { ra: 18.92, dec: -26.30 },
        ],
        lines: [[0, 1], [0, 2], [0, 3], [3, 4], [4, 2]],
        description: '여름 은하수의 중심 방향에 있는 별자리입니다.',
    },
    // 가을
    {
        id: 'pegasus', name: 'Pegasus', nameKo: '페가수스자리', season: 'autumn', zodiac: false,
        eclipticLongitude: 330,
        stars: [
            { ra: 23.08, dec: 15.21 }, { ra: 23.06, dec: 28.08 }, { ra: 0.22, dec: 15.18 },
            { ra: 0.14, dec: 29.09 },
        ],
        lines: [[0, 1], [1, 3], [3, 2], [2, 0]],
        description: '가을 밤하늘에서 큰 사각형(가을의 대사각형)을 이루는 별자리입니다.',
    },
    {
        id: 'aquarius', name: 'Aquarius', nameKo: '물병자리', season: 'autumn', zodiac: true,
        eclipticLongitude: 330,
        stars: [
            { ra: 22.10, dec: -0.32 }, { ra: 21.53, dec: -5.57 }, { ra: 22.48, dec: -0.02 },
            { ra: 22.59, dec: -7.58 },
        ],
        lines: [[0, 1], [0, 2], [2, 3]],
        description: '가을철 남쪽 하늘에서 볼 수 있는 황도 12궁 별자리입니다.',
    },
    // 겨울
    {
        id: 'orion', name: 'Orion', nameKo: '오리온자리', season: 'winter', zodiac: false,
        eclipticLongitude: 80,
        stars: [
            { ra: 5.92, dec: 7.41 },  // Betelgeuse
            { ra: 5.24, dec: -8.20 }, // Rigel
            { ra: 5.42, dec: -1.94 }, // Belt 1
            { ra: 5.54, dec: -1.20 }, // Belt 2
            { ra: 5.68, dec: -1.94 }, // Belt 3
            { ra: 5.59, dec: 9.93 },  // Bellatrix
            { ra: 5.80, dec: -9.67 }, // Saiph
        ],
        lines: [[0, 5], [5, 2], [2, 3], [3, 4], [4, 6], [6, 1], [1, 2], [0, 2]],
        description: '겨울 밤하늘에서 가장 찾기 쉬운 별자리로, 삼태성(벨트)이 특징입니다.',
    },
    {
        id: 'gemini', name: 'Gemini', nameKo: '쌍둥이자리', season: 'winter', zodiac: true,
        eclipticLongitude: 90,
        stars: [
            { ra: 7.76, dec: 28.03 },  // Pollux
            { ra: 7.58, dec: 31.89 },  // Castor
            { ra: 6.75, dec: 16.40 },
            { ra: 6.38, dec: 22.51 },
        ],
        lines: [[0, 1], [0, 2], [1, 3]],
        description: '겨울 밤하늘의 쌍둥이 별, 카스토르와 폴룩스가 밝게 빛나는 별자리입니다.',
    },
];

export function getVisibleConstellations(monthIndex: number): ConstellationData[] {
    const seasons: Record<number, string> = {
        2: 'spring', 3: 'spring', 4: 'spring',
        5: 'summer', 6: 'summer', 7: 'summer',
        8: 'autumn', 9: 'autumn', 10: 'autumn',
        11: 'winter', 0: 'winter', 1: 'winter',
    };
    const season = seasons[monthIndex];
    return constellations.filter(c => c.season === season);
}
