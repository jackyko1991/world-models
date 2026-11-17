/**
 * A seeded random number generator (mulberry32) shared by every model, so a demo run is reproducible and testable.
 * `rng(seed)` returns a function giving uniform numbers in [0, 1); `gaussian(r)` draws a standard normal from it.
 */
export type Rng = () => number;

export function rng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A standard normal sample (Box–Muller). */
export function gaussian(r: Rng): number {
  const u = Math.max(r(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r());
}

/** An integer in [0, n). */
export const randInt = (r: Rng, n: number): number => Math.floor(r() * n);
