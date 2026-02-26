export function degToRad(deg: number): number {
    return (deg * Math.PI) / 180;
}

export function radToDeg(rad: number): number {
    return (rad * 180) / Math.PI;
}

// Lerp for smooth animations
export function lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t;
}

// Clamp value between min and max
export function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

// Kepler's equation solver (for elliptical orbits)
export function solveKepler(M: number, e: number, tolerance = 1e-6): number {
    let E = M;
    for (let i = 0; i < 100; i++) {
        const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
        E -= dE;
        if (Math.abs(dE) < tolerance) break;
    }
    return E;
}

// Convert eccentric anomaly to true anomaly
export function eccentricToTrue(E: number, e: number): number {
    return 2 * Math.atan2(
        Math.sqrt(1 + e) * Math.sin(E / 2),
        Math.sqrt(1 - e) * Math.cos(E / 2)
    );
}

// Position on elliptical orbit
export function getOrbitalPosition(
    semiMajorAxis: number,
    eccentricity: number,
    trueAnomaly: number,
    inclination = 0
): [number, number, number] {
    const r = semiMajorAxis * (1 - eccentricity * eccentricity) / (1 + eccentricity * Math.cos(trueAnomaly));
    const x = r * Math.cos(trueAnomaly);
    const z = r * Math.sin(trueAnomaly);
    const y = z * Math.sin(degToRad(inclination));
    const zAdjusted = z * Math.cos(degToRad(inclination));
    return [x, y, zAdjusted];
}

// Shadow length calculation
export function shadowLength(stickHeight: number, altitudeDeg: number): number {
    if (altitudeDeg <= 0) return stickHeight * 100;
    if (altitudeDeg >= 90) return 0;
    return stickHeight / Math.tan(degToRad(altitudeDeg));
}

// Energy density based on solar altitude
export function energyDensity(altitudeDeg: number): number {
    return Math.sin(degToRad(altitudeDeg));
}

// Irradiated area (1/sin)
export function irradiatedArea(altitudeDeg: number): number {
    const sinA = Math.sin(degToRad(altitudeDeg));
    if (sinA <= 0.01) return 100;
    return 1 / sinA;
}
