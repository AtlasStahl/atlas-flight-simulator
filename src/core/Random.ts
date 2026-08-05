/**
 * Seedbares PRNG — QA-03
 *
 * Mulberry32: schneller 32-Bit PRNG mit gut verteilter Ausgabe.
 * Ermöglicht reproduzierbare Weltgenerierung und Debugging.
 */

/** Mulberry32 PRNG — returns a function that produces [0, 1) floats */
export function mulberry32(seed: number): () => number {
  let state = seed | 0;
  return (): number => {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t = (t + Math.imul(t ^ (t >>> 7), t | 61)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard-Instanz mit festem Seed für reproduzierbare Weltgenerierung */
export const worldRandom = mulberry32(42);

/** PRNG mit Seed aus URL-Parameter `?seed=` oder Default 42 */
export function getSeededRandom(): () => number {
  const params = new URLSearchParams(window.location.search);
  const seed = params.get('seed');
  const seedValue = seed !== null ? parseInt(seed, 10) : 42;
  return mulberry32(isNaN(seedValue) ? 42 : seedValue);
}