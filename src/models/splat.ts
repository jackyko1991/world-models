/**
 * Gaussian splatting, small and exact: the maths behind Concepts ▸ 3D scene models ▸ Gaussian splatting and
 * Coding Skills ▸ Rays and splats. Pure functions, no DOM.
 *
 * A 3-D Gaussian has a mean μ, a covariance Σ = R S Sᵀ Rᵀ (R from a unit quaternion, S = diag(scales)), an opacity and
 * a colour stored as spherical-harmonic coefficients (degree 0 and 1). To draw it, the mean goes through the camera
 * (view matrix W, then the perspective divide) and Σ through the EWA approximation Σ' = J W Σ Wᵀ Jᵀ, where J is the
 * Jacobian of the perspective divide at the mean (Zwicker et al. 2001; Kerbl et al. 2023). The 2-D Gaussians are sorted
 * by depth and alpha-composited front to back, stopping a pixel once almost no light gets through.
 *
 * Conventions (shared with scripts/splat2d.py and scripts/splat3d.py, which save reference pixels the tests check):
 * world y is up; camera coordinates have x right, y down, z forward; pixel (i, j) is sampled at its centre
 * (i + ½, j + ½); u = fx·x/z + cx with cx = width/2. Row-major 3×3 matrices are flat arrays of 9 numbers; a symmetric
 * 2×2 matrix [[a, b], [b, c]] is stored as [a, b, c].
 */
import { rng } from "./rng.ts";

export type Vec3 = [number, number, number];
/** a unit quaternion [w, x, y, z] */
export type Quat = [number, number, number, number];
/** row-major 3×3 */
export type Mat3 = number[];
/** symmetric 2×2 [[a, b], [b, c]] as [a, b, c] */
export type Sym2 = [number, number, number];

/** One 3-D Gaussian. `sh` holds 12 numbers: for k = 0..3 (DC, then the three degree-1 terms), sh[3k + channel]. */
export interface Splat3D {
  mean: Vec3;
  quat: Quat;
  scale: Vec3;
  opacity: number;
  sh: number[];
}

/** A Gaussian on the screen, ready to composite. */
export interface Projected {
  /** index in the input list */
  index: number;
  /** screen position of the mean, pixels */
  x: number;
  y: number;
  /** camera-space depth (sort key) */
  depth: number;
  /** 2-D covariance Σ' and its inverse (the "conic") */
  cov: Sym2;
  conic: Sym2;
  opacity: number;
  rgb: Vec3;
  /** half-width of a box outside which alpha < 1/255 (pixels) */
  radius: number;
}

/** Thresholds of the 3DGS rasteriser: skip a splat's pixel below ALPHA_MIN, clamp at ALPHA_MAX, stop a pixel below T_MIN. */
export const ALPHA_MIN = 1 / 255;
export const ALPHA_MAX = 0.99;
export const T_MIN = 1e-4;
/** spherical-harmonic constants for degree 0 and 1 */
export const SH_C0 = 0.28209479177387814;
export const SH_C1 = 0.4886025119029199;

// ── small linear algebra ─────────────────────────────────────────────────────────────────────────────────────────────

export const mul3 = (a: Mat3, b: Mat3): Mat3 => {
  const m: Mat3 = new Array(9).fill(0);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) m[3 * i + j] += a[3 * i + k] * b[3 * k + j];
  return m;
};
export const transpose3 = (a: Mat3): Mat3 => [a[0], a[3], a[6], a[1], a[4], a[7], a[2], a[5], a[8]];
export const apply3 = (a: Mat3, v: Vec3): Vec3 => [
  a[0] * v[0] + a[1] * v[1] + a[2] * v[2],
  a[3] * v[0] + a[4] * v[1] + a[5] * v[2],
  a[6] * v[0] + a[7] * v[1] + a[8] * v[2],
];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const normalize = (a: Vec3): Vec3 => {
  const n = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / n, a[1] / n, a[2] / n];
};

// ── the 3-D Gaussian ─────────────────────────────────────────────────────────────────────────────────────────────────

/** Rotation matrix of a quaternion [w, x, y, z] (normalised first). */
export function quatToRot(q: Quat): Mat3 {
  const n = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  const [w, x, y, z] = [q[0] / n, q[1] / n, q[2] / n, q[3] / n];
  return [
    1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y),
    2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x),
    2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y),
  ];
}

/** Σ = R S Sᵀ Rᵀ = M Mᵀ with M = R S: symmetric and positive definite whenever every scale is non-zero. */
export function covariance3D(q: Quat, s: Vec3): Mat3 {
  const R = quatToRot(q);
  const M = R.map((v, i) => v * s[i % 3]); // R · diag(s) scales column j by s[j]
  return mul3(M, transpose3(M));
}

/** Colour seen from direction `dir` (unit, camera → Gaussian): 0.5 + SH degree 0 and 1, clamped to [0, 1]. */
export function shColour(sh: number[], dir: Vec3): Vec3 {
  const [x, y, z] = dir;
  const c: Vec3 = [0, 0, 0];
  for (let ch = 0; ch < 3; ch++) {
    let v = 0.5 + SH_C0 * sh[ch];
    if (sh.length >= 12) v += SH_C1 * (-y * sh[3 + ch] + z * sh[6 + ch] - x * sh[9 + ch]);
    c[ch] = Math.min(1, Math.max(0, v));
  }
  return c;
}

// ── the camera ───────────────────────────────────────────────────────────────────────────────────────────────────────

export interface Camera {
  /** position in the world */
  pos: Vec3;
  /** view rotation: rows are the camera's right, down and forward axes, so t = W (p − pos) */
  W: Mat3;
  fx: number;
  fy: number;
  cx: number;
  cy: number;
  width: number;
  height: number;
  /** Gaussians nearer than this are skipped */
  near: number;
}

/** A camera on a sphere around `target`, looking at it: azimuth about world y, elevation above the ground plane. */
export function orbitCamera(az: number, el: number, radius: number, target: Vec3, fovy: number, width: number, height: number): Camera {
  const pos: Vec3 = [
    target[0] + radius * Math.cos(el) * Math.sin(az),
    target[1] + radius * Math.sin(el),
    target[2] + radius * Math.cos(el) * Math.cos(az),
  ];
  const f = normalize(sub(target, pos));
  const right = normalize(cross(f, [0, 1, 0]));
  const down = cross(f, right);
  const fy = height / 2 / Math.tan(fovy / 2);
  return { pos, W: [...right, ...down, ...f], fx: fy, fy, cx: width / 2, cy: height / 2, width, height, near: 0.2 };
}

export const toCamera = (cam: Camera, p: Vec3): Vec3 => apply3(cam.W, sub(p, cam.pos));

/** The pinhole projection of a world point to pixel coordinates. */
export function projectPoint(cam: Camera, p: Vec3): [number, number] {
  const t = toCamera(cam, p);
  return [(cam.fx * t[0]) / t[2] + cam.cx, (cam.fy * t[1]) / t[2] + cam.cy];
}

/** J = ∂(u, v)/∂t of the perspective divide at camera-space point t: a 2×3 matrix, row-major. */
export function perspectiveJacobian(t: Vec3, fx: number, fy: number): number[] {
  const [x, y, z] = t;
  return [fx / z, 0, (-fx * x) / (z * z), 0, fy / z, (-fy * y) / (z * z)];
}

/** EWA: Σ' = J W Σ Wᵀ Jᵀ (+ blur·I, the low-pass filter 3DGS adds so a splat never gets thinner than a pixel). */
export function projectCovariance(cam: Camera, mean: Vec3, sigma: Mat3, blur = 0.3): Sym2 {
  const J = perspectiveJacobian(toCamera(cam, mean), cam.fx, cam.fy);
  const T = [0, 1, 2, 3, 4, 5].map((k) => {
    const r = Math.floor(k / 3), c = k % 3; // T = J W, 2×3
    return J[3 * r] * cam.W[c] + J[3 * r + 1] * cam.W[3 + c] + J[3 * r + 2] * cam.W[6 + c];
  });
  const TS = [0, 1, 2, 3, 4, 5].map((k) => {
    const r = Math.floor(k / 3), c = k % 3; // (J W) Σ, 2×3
    return T[3 * r] * sigma[c] + T[3 * r + 1] * sigma[3 + c] + T[3 * r + 2] * sigma[6 + c];
  });
  const dot = (r1: number, r2: number) => TS[3 * r1] * T[3 * r2] + TS[3 * r1 + 1] * T[3 * r2 + 1] + TS[3 * r1 + 2] * T[3 * r2 + 2];
  return [dot(0, 0) + blur, dot(0, 1), dot(1, 1) + blur];
}

export const det2 = (m: Sym2) => m[0] * m[2] - m[1] * m[1];
export const invert2 = (m: Sym2): Sym2 => {
  const d = det2(m);
  return [m[2] / d, -m[1] / d, m[0] / d];
};
/** eigenvalues of a symmetric 2×2, largest first */
export function eigen2(m: Sym2): [number, number] {
  const mid = (m[0] + m[2]) / 2, r = Math.sqrt(Math.max(0, ((m[0] - m[2]) / 2) ** 2 + m[1] * m[1]));
  return [mid + r, mid - r];
}

/** An ellipse to draw for Σ': semi-axes at k standard deviations and the angle of the major axis (radians). */
export function ellipseAxes(cov: Sym2, k = 1): { rx: number; ry: number; angle: number } {
  const [l1, l2] = eigen2(cov);
  return { rx: k * Math.sqrt(Math.max(l1, 0)), ry: k * Math.sqrt(Math.max(l2, 0)), angle: 0.5 * Math.atan2(2 * cov[1], cov[0] - cov[2]) };
}

/** Box half-width beyond which opacity·exp(−½ dᵀΣ'⁻¹d) < 1/255 (0 if the splat is fainter than that everywhere). */
export function splatRadius(cov: Sym2, opacity: number): number {
  const m2 = 2 * Math.log(opacity / ALPHA_MIN);
  return m2 > 0 ? Math.sqrt(m2 * eigen2(cov)[0]) : 0;
}

/** Project one 3-D Gaussian: screen mean, depth, Σ', its inverse and the view-dependent colour (null if behind the camera). */
export function projectSplat(s: Splat3D, cam: Camera, index = 0, blur = 0.3): Projected | null {
  const t = toCamera(cam, s.mean);
  if (t[2] < cam.near) return null;
  const cov = projectCovariance(cam, s.mean, covariance3D(s.quat, s.scale), blur);
  if (det2(cov) <= 0) return null;
  const dir = normalize(sub(s.mean, cam.pos));
  return {
    index,
    x: (cam.fx * t[0]) / t[2] + cam.cx,
    y: (cam.fy * t[1]) / t[2] + cam.cy,
    depth: t[2],
    cov,
    conic: invert2(cov),
    opacity: s.opacity,
    rgb: shColour(s.sh, dir),
    radius: splatRadius(cov, s.opacity),
  };
}

// ── compositing ──────────────────────────────────────────────────────────────────────────────────────────────────────

/** alpha of a projected Gaussian at a point: opacity·exp(−½ dᵀ Σ'⁻¹ d), clamped to 0.99; 0 below 1/255. */
export function splatAlpha(p: Projected, px: number, py: number): number {
  const dx = px - p.x, dy = py - p.y;
  const power = -0.5 * (p.conic[0] * dx * dx + 2 * p.conic[1] * dx * dy + p.conic[2] * dy * dy);
  if (power > 0) return 0;
  const a = Math.min(ALPHA_MAX, p.opacity * Math.exp(power));
  return a < ALPHA_MIN ? 0 : a;
}

/** Nearest first. */
export const sortByDepth = (list: Projected[]): Projected[] => list.slice().sort((a, b) => a.depth - b.depth);

export interface Image {
  width: number;
  height: number;
  /** rgb in [0, 1], row-major, 3 per pixel */
  rgb: Float64Array;
  /** light left over (transmittance) per pixel */
  T: Float64Array;
}

/**
 * Front-to-back compositing over a background, in the order given (nearest first):
 *   C += c·α·T,  T ← T·(1 − α),  stopping a pixel once T would fall below 10⁻⁴.
 * Loops splat by splat over each one's bounding box, which visits the same (splat, pixel) pairs in the same order as
 * a per-pixel loop would, so the result is identical.
 */
export function composite(sorted: Projected[], width: number, height: number, bg: Vec3 = [1, 1, 1]): Image {
  const n = width * height;
  const rgb = new Float64Array(3 * n), T = new Float64Array(n).fill(1);
  const done = new Uint8Array(n);
  for (const p of sorted) {
    if (p.radius <= 0) continue;
    const x0 = Math.max(0, Math.floor(p.x - p.radius - 0.5)), x1 = Math.min(width - 1, Math.ceil(p.x + p.radius - 0.5));
    const y0 = Math.max(0, Math.floor(p.y - p.radius - 0.5)), y1 = Math.min(height - 1, Math.ceil(p.y + p.radius - 0.5));
    for (let j = y0; j <= y1; j++) {
      for (let i = x0; i <= x1; i++) {
        const k = j * width + i;
        if (done[k]) continue;
        const a = splatAlpha(p, i + 0.5, j + 0.5);
        if (a === 0) continue;
        const next = T[k] * (1 - a);
        if (next < T_MIN) {
          done[k] = 1;
          continue;
        }
        const w = a * T[k];
        rgb[3 * k] += p.rgb[0] * w;
        rgb[3 * k + 1] += p.rgb[1] * w;
        rgb[3 * k + 2] += p.rgb[2] * w;
        T[k] = next;
      }
    }
  }
  for (let k = 0; k < n; k++) for (let c = 0; c < 3; c++) rgb[3 * k + c] += T[k] * bg[c];
  return { width, height, rgb, T };
}

/** Project, sort by depth and composite a whole scene. */
export function renderSplats(splats: Splat3D[], cam: Camera, bg: Vec3 = [1, 1, 1], blur = 0.3): Image & { projected: Projected[] } {
  const projected: Projected[] = [];
  splats.forEach((s, i) => {
    const p = projectSplat(s, cam, i, blur);
    if (p) projected.push(p);
  });
  const sorted = sortByDepth(projected);
  return { ...composite(sorted, cam.width, cam.height, bg), projected: sorted };
}

/** One pixel, front to back: C = Σᵢ cᵢ αᵢ Πⱼ<ᵢ (1 − αⱼ) + T·bg (no early stop). Layers nearest first. */
export function compositeFrontToBack(layers: { rgb: Vec3; alpha: number }[], bg: Vec3): Vec3 {
  const c: Vec3 = [0, 0, 0];
  let T = 1;
  for (const l of layers) {
    for (let k = 0; k < 3; k++) c[k] += l.rgb[k] * l.alpha * T;
    T *= 1 - l.alpha;
  }
  return [c[0] + T * bg[0], c[1] + T * bg[1], c[2] + T * bg[2]];
}

/** The painter's algorithm: start from the background and lay each layer over it, farthest first. Same answer. */
export function compositeBackToFront(layers: { rgb: Vec3; alpha: number }[], bg: Vec3): Vec3 {
  let c: Vec3 = [...bg];
  for (let i = layers.length - 1; i >= 0; i--) {
    const { rgb, alpha } = layers[i];
    c = [rgb[0] * alpha + c[0] * (1 - alpha), rgb[1] * alpha + c[1] * (1 - alpha), rgb[2] * alpha + c[2] * (1 - alpha)];
  }
  return c;
}

/** Which splats light pixel (i, j), and how much: weight αᵢTᵢ, in compositing order (for "click a Gaussian"). */
export function contributions(sorted: Projected[], i: number, j: number): { index: number; weight: number }[] {
  const out: { index: number; weight: number }[] = [];
  let T = 1;
  for (const p of sorted) {
    const a = splatAlpha(p, i + 0.5, j + 0.5);
    if (a === 0) continue;
    const next = T * (1 - a);
    if (next < T_MIN) break;
    out.push({ index: p.index, weight: a * T });
    T = next;
  }
  return out;
}

// ── 2-D Gaussians (the image-fitting demo) ───────────────────────────────────────────────────────────────────────────

/** A 2-D Gaussian as scripts/splat2d.py stores it: [x, y, sx, sy, θ, r, g, b, opacity], pixel units. */
export type Gauss2D = number[];

/** Σ = R(θ) diag(sx², sy²) R(θ)ᵀ */
export function cov2D(sx: number, sy: number, theta: number): Sym2 {
  const c = Math.cos(theta), s = Math.sin(theta);
  return [c * c * sx * sx + s * s * sy * sy, c * s * (sx * sx - sy * sy), s * s * sx * sx + c * c * sy * sy];
}

/** A stored 2-D Gaussian as a screen splat. Its depth is its index: the list order is the compositing order. */
export function gauss2DToProjected(g: Gauss2D, index: number): Projected {
  const cov = cov2D(g[2], g[3], g[4]);
  return { index, x: g[0], y: g[1], depth: index, cov, conic: invert2(cov), opacity: g[8], rgb: [g[5], g[6], g[7]], radius: splatRadius(cov, g[8]) };
}

// ── loading a scene ──────────────────────────────────────────────────────────────────────────────────────────────────

/** Floats per splat in public/models/splat3d.bin: mean 3, quat 4, scale 3, opacity 1, sh 12. */
export const SPLAT_FLOATS = 23;

export function decodeSplats(data: Float32Array): Splat3D[] {
  const out: Splat3D[] = [];
  for (let o = 0; o + SPLAT_FLOATS <= data.length; o += SPLAT_FLOATS) {
    const f = Array.from(data.subarray(o, o + SPLAT_FLOATS));
    out.push({ mean: [f[0], f[1], f[2]], quat: [f[3], f[4], f[5], f[6]], scale: [f[7], f[8], f[9]], opacity: f[10], sh: f.slice(11, 23) });
  }
  return out;
}

/** Rotation about world y by angle a, as a quaternion (for moving scenes). */
export const quatY = (a: number): Quat => [Math.cos(a / 2), 0, Math.sin(a / 2), 0];
/** Hamilton product q ⊗ r */
export function quatMul(q: Quat, r: Quat): Quat {
  return [
    q[0] * r[0] - q[1] * r[1] - q[2] * r[2] - q[3] * r[3],
    q[0] * r[1] + q[1] * r[0] + q[2] * r[3] - q[3] * r[2],
    q[0] * r[2] - q[1] * r[3] + q[2] * r[0] + q[3] * r[1],
    q[0] * r[3] + q[1] * r[2] - q[2] * r[1] + q[3] * r[0],
  ];
}

// ── a moving scene (Concepts ▸ toward world models) ──────────────────────────────────────────────────────────────────

/** RGB → the degree-0 SH coefficients that give that colour (0.5 + C0·sh = c). */
export const rgbToSh = (c: Vec3): number[] => [(c[0] - 0.5) / SH_C0, (c[1] - 0.5) / SH_C0, (c[2] - 0.5) / SH_C0];

/** What a canonical Gaussian belongs to, which decides how it moves. */
export type Part = "floor" | "ball" | "box" | "moon";

export interface DynamicScene {
  canonical: Splat3D[];
  part: Part[];
}

/**
 * Canonical Gaussians (time-free), in the manner of D-NeRF and 4D-GS: a floor, a ball that bounces, a box that spins
 * and a small moon that orbits it. `deform` then moves them to time t. Procedural, from a fixed seed.
 */
export function dynamicScene(seed = 3): DynamicScene {
  const r = rng(seed);
  const canonical: Splat3D[] = [];
  const part: Part[] = [];
  const add = (p: Part, mean: Vec3, scale: Vec3, quat: Quat, rgb: Vec3, opacity = 0.9) => {
    canonical.push({ mean, quat, scale, opacity, sh: rgbToSh(rgb) });
    part.push(p);
  };
  const flatX: Quat = [Math.SQRT1_2, Math.SQRT1_2, 0, 0]; // z axis → y: a disc lying on the floor
  for (let i = -6; i < 6; i++)
    for (let j = -6; j < 6; j++) {
      const light = (i + j) % 2 === 0;
      for (let k = 0; k < 4; k++) {
        const mean: Vec3 = [(i + 0.25 + 0.5 * r()) * 0.2, 0, (j + 0.25 + 0.5 * r()) * 0.2];
        if (Math.hypot(mean[0], mean[2]) > 1.2) continue;
        add("floor", mean, [0.065, 0.065, 0.005], flatX, light ? [0.82, 0.78, 0.7] : [0.55, 0.52, 0.48]);
      }
    }
  // ball: centred at the origin in its own frame
  for (let n = 0; n < 260; n++) {
    const u = 2 * r() - 1, a = 2 * Math.PI * r(), c = Math.sqrt(1 - u * u);
    const nrm: Vec3 = [c * Math.cos(a), u, c * Math.sin(a)];
    const shade = 0.55 + 0.45 * Math.max(0, 0.4 * nrm[0] + 0.8 * nrm[1] + 0.45 * nrm[2]);
    add("ball", [0.25 * nrm[0], 0.25 * nrm[1], 0.25 * nrm[2]], [0.06, 0.06, 0.06], [1, 0, 0, 0], [0.9 * shade, 0.22 * shade, 0.18 * shade]);
  }
  // box: a cube of side 0.5 sitting on the floor, its faces sampled
  for (let n = 0; n < 300; n++) {
    const face = n % 5, a = r() - 0.5, b = r() - 0.5;
    const p: Vec3 = face === 0 ? [a, 0.5, b] : face === 1 ? [0.5, a, b] : face === 2 ? [-0.5, a, b] : face === 3 ? [a, b, 0.5] : [a, b, -0.5];
    const shade = [1, 0.8, 0.6, 0.9, 0.7][face];
    add("box", [p[0] * 0.5, p[1] * 0.5 + 0.25, p[2] * 0.5], [0.05, 0.05, 0.05], [1, 0, 0, 0], [0.2 * shade, 0.4 * shade, 0.85 * shade]);
  }
  for (let n = 0; n < 40; n++) {
    const u = 2 * r() - 1, a = 2 * Math.PI * r(), c = Math.sqrt(1 - u * u);
    add("moon", [0.08 * c * Math.cos(a), 0.08 * u, 0.08 * c * Math.sin(a)], [0.035, 0.035, 0.035], [1, 0, 0, 0], [0.95, 0.75, 0.15]);
  }
  return { canonical, part };
}

/** Height of the bouncing ball's centre at time t ∈ [0, 1] (two bounces, each a parabola). */
export const ballHeight = (t: number) => {
  const ph = (2 * t) % 1;
  return 0.25 + 1.6 * ph * (1 - ph);
};

/**
 * The deformation field: canonical Gaussians → their state at time t. Means move (μ(t) = f(μ₀, t)) and the box's
 * Gaussians also turn (q(t) = Δq(t) ⊗ q₀), which is what D-NeRF and 4D-GS learn with networks; here it is written down.
 */
export function deform(scene: DynamicScene, t: number): Splat3D[] {
  const spin = 2 * Math.PI * t;
  const dq = quatY(spin);
  const R = quatToRot(dq);
  const ball: Vec3 = [-0.55, ballHeight(t), 0.2];
  const box: Vec3 = [0.5, 0, -0.3];
  return scene.canonical.map((g, i) => {
    switch (scene.part[i]) {
      case "ball": {
        // squash a little near the floor
        const sq = Math.max(0, 0.3 - ball[1]) * 1.5;
        return { ...g, mean: [ball[0] + g.mean[0] * (1 + sq), ball[1] + g.mean[1] * (1 - sq), ball[2] + g.mean[2] * (1 + sq)] };
      }
      case "box": {
        const m = apply3(R, g.mean);
        return { ...g, mean: [box[0] + m[0], m[1], box[2] + m[2]], quat: quatMul(dq, g.quat) };
      }
      case "moon": {
        const a = 2 * spin;
        return { ...g, mean: [box[0] + 0.55 * Math.cos(a) + g.mean[0], 0.75 + 0.1 * Math.sin(2 * a) + g.mean[1], box[2] + 0.55 * Math.sin(a) + g.mean[2]] };
      }
      default:
        return g;
    }
  });
}
