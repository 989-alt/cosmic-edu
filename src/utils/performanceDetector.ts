export type PerformanceLevel = 'high' | 'low';

export async function detectPerformance(): Promise<PerformanceLevel> {
    const cores = navigator.hardwareConcurrency || 2;

    // Simple WebGL check
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    if (!gl) return 'low';

    // Quick benchmark: render triangles and measure time
    try {
        const start = performance.now();
        const iterations = 5000;
        for (let i = 0; i < iterations; i++) {
            (gl as WebGLRenderingContext).clear(
                (gl as WebGLRenderingContext).COLOR_BUFFER_BIT
            );
        }
        const elapsed = performance.now() - start;
        const opsPerMs = iterations / elapsed;

        if (cores >= 4 && opsPerMs > 100) return 'high';
        return 'low';
    } catch {
        return cores >= 4 ? 'high' : 'low';
    }
}

export interface PerformanceConfig {
    textureSize: 'high' | 'low';
    shadows: boolean;
    bloom: boolean;
    antiAlias: boolean;
    starCount: number;
    pixelRatio: number;
}

export function getPerformanceConfig(level: PerformanceLevel): PerformanceConfig {
    if (level === 'high') {
        return {
            textureSize: 'high',
            shadows: true,
            bloom: true,
            antiAlias: true,
            starCount: 5000,
            pixelRatio: Math.min(window.devicePixelRatio, 2),
        };
    }
    return {
        textureSize: 'low',
        shadows: false,
        bloom: false,
        antiAlias: false,
        starCount: 500,
        pixelRatio: 1,
    };
}
