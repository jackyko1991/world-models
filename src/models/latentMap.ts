/**
 * The latent map: the decoder of a tiny VAE (2-D latent → 16×16 frame of a ball in a box), trained offline by
 * scripts/latent_map.py and loaded from public/models/latent-map.json. Here it runs with plain matrix multiplies.
 * `renderFrame` draws the true frame for a ball position with the same formula as the script.
 */

export interface Layer {
  /** weights, [out][in] */
  W: number[][];
  b: number[];
}

export interface LatentPoint {
  /** encoder mean μ(x) of the frame */
  z: [number, number];
  /** ball centre that generated the frame, in pixels */
  x: number;
  y: number;
}

export interface LatentMapData {
  size: number;
  radius: number;
  range: [number, number];
  latentExtent: [number, number];
  reconstructionError: number;
  layers: Layer[];
  points: LatentPoint[];
  references: { z: [number, number]; out: number[] }[];
}

// #region decode
/** Decode a latent z to a frame (row-major pixels in [0, 1]): ReLU between layers, a sigmoid at the end. */
export function decode(layers: Layer[], z: readonly number[]): Float64Array {
  let h = Float64Array.from(z);
  layers.forEach(({ W, b }, k) => {
    const out = new Float64Array(b.length);
    for (let i = 0; i < b.length; i++) {
      let s = b[i];
      const row = W[i];
      for (let j = 0; j < h.length; j++) s += row[j] * h[j];
      out[i] = k < layers.length - 1 ? Math.max(s, 0) : 1 / (1 + Math.exp(-s));
    }
    h = out;
  });
  return h;
}
// #endregion decode

/** The true frame: a ball of radius r centred at (x, y), anti-aliased by one pixel (the script's `render`). */
export function renderFrame(size: number, radius: number, x: number, y: number): Float64Array {
  const f = new Float64Array(size * size);
  for (let row = 0; row < size; row++)
    for (let col = 0; col < size; col++) {
      const d = Math.hypot(col + 0.5 - x, row + 0.5 - y);
      f[row * size + col] = Math.min(1, Math.max(0, radius + 0.5 - d));
    }
  return f;
}

// #region lerp
/** Pixel interpolation: cross-fade two frames. */
export function lerpPixels(a: Float64Array, b: Float64Array, t: number): Float64Array {
  return a.map((v, i) => (1 - t) * v + t * b[i]);
}

/** Latent interpolation: walk the straight line between two codes and decode each point. */
export function lerpLatent(layers: Layer[], za: readonly number[], zb: readonly number[], t: number): Float64Array {
  return decode(layers, za.map((v, i) => (1 - t) * v + t * zb[i]));
}
// #endregion lerp

/** Index of the exported point nearest to z (for "which frame lives here?"). */
export function nearest(points: LatentPoint[], z: readonly number[]): number {
  let best = 0;
  let bd = Infinity;
  points.forEach((p, i) => {
    const d = (p.z[0] - z[0]) ** 2 + (p.z[1] - z[1]) ** 2;
    if (d < bd) {
      bd = d;
      best = i;
    }
  });
  return best;
}

/** Total "ink" of a frame (sum of pixels): a ball keeps its ink, a cross-fade of two balls does too, but spreads it. */
export const ink = (f: Float64Array): number => f.reduce((s, v) => s + v, 0);

/** Peak brightness of a frame: about 1 for a real ball, about 1/2 halfway through a cross-fade of two separate balls. */
export const peak = (f: Float64Array): number => f.reduce((m, v) => Math.max(m, v), 0);
