/**
 * Einheitenumwandlungen für die UI — UI-08
 *
 * Alle Konvertierungen finden an der UI-Grenze statt (AGENTS.md §7).
 * Physik und Config verwenden durchgängig m/s, kg, N, m².
 */

/** Meter pro Sekunde → Kilometer pro Stunde */
export function mpsToKmh(ms: number): number {
  return ms * 3.6;
}

/** Meter pro Sekunde → Knoten (1 kt = 0.514444 m/s) */
export function mpsToKnots(ms: number): number {
  return ms / 0.514444;
}

/** Meter pro Sekunde → Fuß pro Minute */
export function mpsToFpm(ms: number): number {
  return ms * 196.85;
}

/** Meter → Fuß */
export function metersToFeet(m: number): number {
  return m * 3.28084;
}

/** Grad pro Sekunde → Radiant (pro Frame) */
export function degPerSecToRad(degPerSec: number, dt: number): number {
  return (degPerSec * dt * Math.PI) / 180;
}