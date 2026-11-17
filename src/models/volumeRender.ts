/**
 * Volume rendering (Kajiya & Von Herzen 1984; Max 1995; the form NeRF uses): camera rays, samples along a ray, and the
 * emission–absorption quadrature
 *
 *   C = Σ_i T_i (1 − e^{−σ_i δ_i}) c_i,   T_i = e^{−Σ_{j<i} σ_j δ_j},
 *
 * whose weights w_i = T_i (1 − e^{−σ_i δ_i}) sum to 1 − T_final. Pure functions, no DOM; works in 2-D (the demo's
 * slice) and 3-D (the tiny NeRF). Randomness only from rng.ts.
 */
import type { Rng } from "./rng.ts";

export type Vec = number[];

// --- camera rays ----------------------------------------------------------------------------------------------
/** A pinhole camera: image size, focal length in pixels, and a camera-to-world pose (rotation columns + origin). */
export interface Camera {
  width: number;
  height: number;
  /** focal length in pixels: f = (width / 2) / tan(fov / 2) */
  focal: number;
  /** camera-to-world rotation, columns = camera right, up and back (the camera looks along −back) */
  right: Vec;
  up: Vec;
  back: Vec;
  /** camera centre in world coordinates */
  origin: Vec;
}

// rays-start
/** The ray through the centre of pixel (i, j) (i = column, j = row from the top), with a unit direction. */
export function cameraRay(cam: Camera, i: number, j: number): { o: Vec; d: Vec } {
  // pixel → camera coordinates (x right, y up, z back): the image plane sits at z = −1
  const x = (i + 0.5 - cam.width / 2) / cam.focal;
  const y = -(j + 0.5 - cam.height / 2) / cam.focal;
  const z = -1;
  // camera → world: d = R [x, y, z]
  const d = [0, 1, 2].map((k) => x * cam.right[k] + y * cam.up[k] + z * cam.back[k]);
  return { o: cam.origin.slice(), d: normalize(d) };
}
// rays-end

/** A camera on a sphere of radius r around the origin (azimuth, elevation in radians), looking at the origin, y up. */
export function orbitCamera(size: number, fovDeg: number, radius: number, azimuth: number, elevation: number): Camera {
  const back = [Math.cos(elevation) * Math.sin(azimuth), Math.sin(elevation), Math.cos(elevation) * Math.cos(azimuth)];
  const right = normalize(cross([0, 1, 0], back));
  const up = cross(back, right);
  const focal = size / 2 / Math.tan(((fovDeg / 2) * Math.PI) / 180);
  return { width: size, height: size, focal, right, up, back, origin: back.map((b) => b * radius) };
}

/** Where a ray enters and leaves the box [−b, b]^n (slab method), or null if it misses. */
export function rayBox(o: Vec, d: Vec, b: number): [number, number] | null {
  let t0 = -Infinity;
  let t1 = Infinity;
  for (let k = 0; k < o.length; k++) {
    const inv = 1 / d[k];
    let a = (-b - o[k]) * inv;
    let c = (b - o[k]) * inv;
    if (a > c) [a, c] = [c, a];
    t0 = Math.max(t0, a);
    t1 = Math.min(t1, c);
  }
  t0 = Math.max(t0, 0);
  return t1 > t0 ? [t0, t1] : null;
}

// --- sampling along a ray -------------------------------------------------------------------------------------
// sampling-start
/**
 * n sample distances in [near, far]: the midpoints of n equal bins, or (with an rng) one uniform draw per bin, NeRF's
 * stratified sampling, so training sees every depth.
 */
export function sampleAlong(near: number, far: number, n: number, r?: Rng): number[] {
  const step = (far - near) / n;
  return Array.from({ length: n }, (_, i) => near + (i + (r ? r() : 0.5)) * step);
}

/** δ_i = t_{i+1} − t_i, and for the last sample the distance to `far`, so the deltas tile the ray up to `far`. */
export function deltas(ts: number[], far: number): number[] {
  return ts.map((t, i) => (i + 1 < ts.length ? ts[i + 1] : far) - t);
}
// sampling-end

// --- the quadrature ---------------------------------------------------------------------------------------------
export interface RayResult {
  /** α_i = 1 − e^{−σ_i δ_i}: the chance the ray stops inside segment i */
  alphas: number[];
  /** T_i = Π_{j<i} (1 − α_j): the chance the ray reaches sample i */
  trans: number[];
  /** w_i = T_i α_i: how much sample i contributes to the pixel */
  weights: number[];
  /** C = Σ w_i c_i (no background) */
  colour: Vec;
  /** T_final = Π_i (1 − α_i): light that passes the whole ray (the background's share) */
  tFinal: number;
}

// quadrature-start
/** Composite densities σ_i and colours c_i at samples t_i (front to back) into one colour. */
export function renderRay(sigmas: number[], colours: Vec[], ts: number[], far: number): RayResult {
  const ds = deltas(ts, far);
  const channels = colours[0]?.length ?? 3;
  const colour = new Array<number>(channels).fill(0);
  const alphas: number[] = [];
  const trans: number[] = [];
  const weights: number[] = [];
  let T = 1; // transmittance so far: e^{−Σ_{j<i} σ_j δ_j}
  for (let i = 0; i < ts.length; i++) {
    const alpha = 1 - Math.exp(-sigmas[i] * ds[i]);
    const w = T * alpha;
    for (let k = 0; k < channels; k++) colour[k] += w * colours[i][k];
    alphas.push(alpha);
    trans.push(T);
    weights.push(w);
    T *= 1 - alpha; // = e^{−σ_i δ_i}
  }
  return { alphas, trans, weights, colour, tFinal: T };
}
// quadrature-end

/** The colour seen over a background: C + T_final · background. */
export const over = (res: RayResult, background: Vec): Vec => res.colour.map((c, k) => c + res.tFinal * background[k]);

/** March a ray through a density/colour field: sample, evaluate, composite. */
export function marchField(field: (p: Vec) => { sigma: number; colour: Vec }, o: Vec, d: Vec, near: number, far: number, n: number, r?: Rng): RayResult & { ts: number[]; points: Vec[] } {
  const ts = sampleAlong(near, far, n, r);
  const points = ts.map((t) => o.map((ok, k) => ok + t * d[k]));
  const vals = points.map(field);
  const res = renderRay(
    vals.map((v) => v.sigma),
    vals.map((v) => v.colour),
    ts,
    far,
  );
  return { ...res, ts, points };
}

// --- hierarchical sampling ------------------------------------------------------------------------------------
/**
 * NeRF's fine pass: draw n new distances from the piecewise-constant pdf the coarse weights define over the bins
 * around the coarse samples (inverse-transform sampling), so samples gather where the surface is.
 * `u` gives the uniform numbers (evenly spaced if omitted, so it is deterministic).
 */
export function samplePdf(ts: number[], weights: number[], near: number, far: number, n: number, u?: Rng): number[] {
  // bin edges: halfway between samples, plus near and far
  const edges = [near, ...ts.slice(1).map((t, i) => (t + ts[i]) / 2), far];
  const w = weights.map((x) => x + 1e-5);
  const total = w.reduce((a, b) => a + b, 0);
  const cdf = [0];
  for (const x of w) cdf.push(cdf[cdf.length - 1] + x / total);
  const out: number[] = [];
  for (let s = 0; s < n; s++) {
    const q = u ? u() : (s + 0.5) / n;
    let b = 0;
    while (b < w.length - 1 && cdf[b + 1] < q) b++;
    const f = (q - cdf[b]) / (cdf[b + 1] - cdf[b]);
    out.push(edges[b] + f * (edges[b + 1] - edges[b]));
  }
  return out.sort((a, b) => a - b);
}

// --- a 2-D density field for the demo -------------------------------------------------------------------------
/** A soft blob: a Gaussian bump of density with a colour. */
export interface Blob {
  centre: Vec;
  radius: number;
  /** peak density σ (per unit length) */
  peak: number;
  colour: Vec;
}

/** σ(p) = Σ_k peak_k e^{−|p−c_k|²/(2r_k²)}, colour = the density-weighted mean of the blobs' colours. */
export function blobField(blobs: Blob[]) {
  return (p: Vec): { sigma: number; colour: Vec } => {
    let sigma = 0;
    const colour = [0, 0, 0];
    for (const b of blobs) {
      let d2 = 0;
      for (let k = 0; k < p.length; k++) d2 += (p[k] - b.centre[k]) ** 2;
      const s = b.peak * Math.exp(-d2 / (2 * b.radius * b.radius));
      sigma += s;
      for (let k = 0; k < 3; k++) colour[k] += s * b.colour[k];
    }
    return { sigma, colour: sigma > 1e-12 ? colour.map((c) => c / sigma) : [0, 0, 0] };
  };
}

// --- small vector helpers ---------------------------------------------------------------------------------------
export function normalize(v: Vec): Vec {
  const n = Math.hypot(...v);
  return v.map((x) => x / n);
}
export function cross(a: Vec, b: Vec): Vec {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
