/**
 * A tiny NeRF in plain TypeScript: positional encoding, an MLP x ↦ (σ, rgb) run with plain loops (no GPU, no
 * libraries), and pixels rendered with the volume-rendering sum of volumeRender.ts. The weights are trained offline
 * by scripts/tiny_nerf.py (public/models/tiny-nerf.json); nothing is trained in the browser. Pure functions, no DOM.
 */
import { cameraRay, rayBox, sampleAlong, type Camera, type Vec } from "./volumeRender.ts";

export interface TinyNerfData {
  encoding: { frequencies: number; includeInput: boolean };
  /** dense layers; W is row-major [out][in] */
  layers: { in: number; out: number; W: number[]; b: number[] }[];
  render: { size: number; fov: number; radius: number; box: number; samples: number; background: number[] };
  training: { views: number; steps: number; batch: number; parameters: number; seconds: number; heldOutPsnr: number[]; trainViews: number[][] };
  reference: {
    points: number[][];
    sigma: number[];
    rgb: number[][];
    pixels: { azimuth: number; elevation: number; i: number; j: number; rgb: number[] }[];
  };
}

export interface TinyNerf {
  freqs: number;
  layers: { in: number; out: number; W: Float64Array; b: Float64Array }[];
  render: TinyNerfData["render"];
  /** scratch buffers, one per layer output, reused for every point */
  buf: Float64Array[];
}

export function loadNerf(data: TinyNerfData): TinyNerf {
  const layers = data.layers.map((l) => ({ in: l.in, out: l.out, W: Float64Array.from(l.W), b: Float64Array.from(l.b) }));
  const buf = [new Float64Array(3 + 6 * data.encoding.frequencies), ...layers.map((l) => new Float64Array(l.out))];
  return { freqs: data.encoding.frequencies, layers, render: data.render, buf };
}

export const parameterCount = (m: TinyNerf): number => m.layers.reduce((s, l) => s + l.W.length + l.b.length, 0);

// pe-start
/**
 * Positional encoding γ(p) = (p, sin(2^k π p), cos(2^k π p)) for k = 0 … L−1, applied to each coordinate:
 * 3 + 6L numbers for a 3-D point, in the order the training script uses (all sines, then all cosines).
 */
export function positionalEncoding(p: ArrayLike<number>, L: number, out: Float64Array = new Float64Array(p.length * (1 + 2 * L))): Float64Array {
  const D = p.length;
  for (let c = 0; c < D; c++) out[c] = p[c];
  for (let k = 0; k < L; k++) {
    const f = 2 ** k * Math.PI;
    for (let c = 0; c < D; c++) {
      out[D + k * D + c] = Math.sin(f * p[c]);
      out[D + L * D + k * D + c] = Math.cos(f * p[c]);
    }
  }
  return out;
}
// pe-end

// mlp-start
/** The network: γ(x) → ReLU layers → σ = softplus(h₀) ≥ 0, rgb = sigmoid(h₁…₃) ∈ (0, 1). */
export function field(m: TinyNerf, x: ArrayLike<number>): { sigma: number; rgb: Vec } {
  let h: ArrayLike<number> = positionalEncoding(x, m.freqs, m.buf[0]);
  m.layers.forEach((layer, l) => {
    const out = m.buf[l + 1];
    const last = l === m.layers.length - 1;
    for (let o = 0; o < layer.out; o++) {
      let s = layer.b[o];
      const row = o * layer.in;
      for (let i = 0; i < layer.in; i++) s += layer.W[row + i] * h[i];
      out[o] = last || s > 0 ? s : 0; // ReLU on hidden layers
    }
    h = out;
  });
  const softplus = (z: number) => Math.max(z, 0) + Math.log1p(Math.exp(-Math.abs(z)));
  const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));
  return { sigma: softplus(h[0]), rgb: [sigmoid(h[1]), sigmoid(h[2]), sigmoid(h[3])] };
}
// mlp-end

// pixel-start
/**
 * One pixel: its camera ray, samples at the bin midpoints where the ray crosses the scene's box, the network at each,
 * and the volume-rendering sum over the background. `stopBelow` ends the ray early once the transmittance is tiny
 * (its error is at most that transmittance), which skips most of the work behind a surface.
 */
export function renderPixel(m: TinyNerf, cam: Camera, i: number, j: number, stopBelow = 0): Vec {
  const bg = m.render.background;
  const { o, d } = cameraRay(cam, i, j);
  const span = rayBox(o, d, m.render.box);
  if (!span) return bg.slice();
  const [near, far] = span;
  const ts = sampleAlong(near, far, m.render.samples);
  const c = [0, 0, 0];
  let T = 1;
  for (let s = 0; s < ts.length && T > stopBelow; s++) {
    const delta = (s + 1 < ts.length ? ts[s + 1] : far) - ts[s];
    const { sigma, rgb } = field(m, [o[0] + ts[s] * d[0], o[1] + ts[s] * d[1], o[2] + ts[s] * d[2]]);
    const alpha = 1 - Math.exp(-sigma * delta);
    for (let k = 0; k < 3; k++) c[k] += T * alpha * rgb[k];
    T *= 1 - alpha;
  }
  return c.map((x, k) => x + T * bg[k]);
}
// pixel-end

/** Render rows [rowStart, rowEnd) of an image into RGBA bytes (row-major, cam.width × cam.height). */
export function renderRows(m: TinyNerf, cam: Camera, rowStart: number, rowEnd: number, rgba: Uint8ClampedArray, stopBelow = 1e-3): void {
  for (let j = rowStart; j < rowEnd; j++)
    for (let i = 0; i < cam.width; i++) {
      const c = renderPixel(m, cam, i, j, stopBelow);
      const p = 4 * (j * cam.width + i);
      rgba[p] = c[0] * 255;
      rgba[p + 1] = c[1] * 255;
      rgba[p + 2] = c[2] * 255;
      rgba[p + 3] = 255;
    }
}
