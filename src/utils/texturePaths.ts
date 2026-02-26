import { useAppStore } from '../store/appStore';

// Texture path mapping based on performance level
const TEXTURE_PATHS: Record<string, { high: string; low: string }> = {
    sun: { high: '/textures/8k_sun.jpg', low: '/textures/2k_sun.jpg' },
    earthDay: { high: '/textures/8k_earth_daymap.jpg', low: '/textures/2k_earth_daymap.jpg' },
    earthNight: { high: '/textures/8k_earth_nightmap.jpg', low: '/textures/2k_earth_nightmap.jpg' },
    earthClouds: { high: '/textures/8k_earth_clouds.jpg', low: '/textures/2k_earth_clouds.jpg' },
    moon: { high: '/textures/8k_moon.jpg', low: '/textures/2k_moon.jpg' },
    mercury: { high: '/textures/8k_mercury.jpg', low: '/textures/2k_mercury.jpg' },
    venus: { high: '/textures/4k_venus_atmosphere.jpg', low: '/textures/2k_venus_atmosphere.jpg' },
    mars: { high: '/textures/8k_mars.jpg', low: '/textures/2k_mars.jpg' },
    jupiter: { high: '/textures/8k_jupiter.jpg', low: '/textures/2k_jupiter.jpg' },
    saturn: { high: '/textures/8k_saturn.jpg', low: '/textures/2k_saturn.jpg' },
    saturnRing: { high: '/textures/8k_saturn_ring_alpha.png', low: '/textures/2k_saturn_ring_alpha.png' },
    uranus: { high: '/textures/2k_uranus.jpg', low: '/textures/2k_uranus.jpg' },
    neptune: { high: '/textures/2k_neptune.jpg', low: '/textures/2k_neptune.jpg' },
    starfield: { high: '/textures/8k_stars_milky_way.jpg', low: '/textures/2k_stars_milky_way.jpg' },
};

// Planet id to texture key mapping
const PLANET_TEXTURE_MAP: Record<string, string> = {
    mercury: 'mercury',
    venus: 'venus',
    earth: 'earthDay',
    mars: 'mars',
    jupiter: 'jupiter',
    saturn: 'saturn',
    uranus: 'uranus',
    neptune: 'neptune',
};

export function getTexturePath(key: string, quality?: 'high' | 'low'): string {
    const level = quality || useAppStore.getState().performanceLevel;
    const entry = TEXTURE_PATHS[key];
    if (!entry) return '';
    return level === 'high' ? entry.high : entry.low;
}

export function getPlanetTexturePath(planetId: string, quality?: 'high' | 'low'): string {
    const key = PLANET_TEXTURE_MAP[planetId];
    if (!key) return '';
    return getTexturePath(key, quality);
}

export { TEXTURE_PATHS, PLANET_TEXTURE_MAP };
