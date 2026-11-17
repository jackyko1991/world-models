/**
 * A fan of rollouts on a one-dimensional world, to tell apart the two kinds of uncertainty.
 *
 * The true world drifts to the right with a wobble and some noise:  x' = x + Δ(x) + σ ε,  Δ(x) = 0.3 (1 + 0.5 sin 2x),
 * σ = 0.05, ε ~ N(0, 1). The models only ever saw transitions with x in [0, 3] (DATA_RANGE).
 *
 * - deterministic: one model, its mean prediction only: one line;
 * - stochastic: the same model plus its learned noise σ̂ (aleatoric uncertainty): a spread of lines;
 * - ensemble: K models, each fitted to a bootstrap resample of the data with its own random features (as in PETS,
 *   Chua et al. 2018); each sampled trajectory follows one member and adds noise. Where the data was, the members
 *   agree; beyond it they disagree (epistemic uncertainty).
 * All randomness comes from rng(seed), so every fan is reproducible.
 */
import { gaussian, randInt, rng, type Rng } from "./rng.ts";

export const SIGMA = 0.05;
export const DATA_RANGE: [number, number] = [0, 3];
/** the true mean change per step */
export const drift = (x: number) => 0.3 * (1 + 0.5 * Math.sin(2 * x));
/** one step of the true world (noise drawn from r) */
export const trueStep = (x: number, r: Rng) => x + drift(x) + SIGMA * gaussian(r);

// #region member
/** One ensemble member: Δ̂(x) = Σ_j w_j cos(ω_j x + b_j), random features fitted by ridge regression. */
export interface Member {
  omega: number[];
  phase: number[];
  w: number[];
}

const FEATURES = 16;
const RIDGE = 1e-2;

export const phi = (m: Pick<Member, "omega" | "phase">, x: number) => m.omega.map((o, j) => Math.cos(o * x + m.phase[j]));
export const predictDelta = (m: Member, x: number) => phi(m, x).reduce((a, v, j) => a + v * m.w[j], 0);

/** Fit one member to (x, Δ) pairs: draw its random features from r, then solve the ridge normal equations. */
export function fitMember(xs: number[], ys: number[], r: Rng): Member {
  const omega = Array.from({ length: FEATURES }, () => 1.5 * gaussian(r));
  const phase = Array.from({ length: FEATURES }, () => 2 * Math.PI * r());
  const P = xs.map((x) => phi({ omega, phase }, x));
  const A = Array.from({ length: FEATURES }, (_, i) =>
    Array.from({ length: FEATURES }, (_, j) => P.reduce((a, p) => a + p[i] * p[j], 0) + (i === j ? RIDGE : 0)),
  );
  const b = Array.from({ length: FEATURES }, (_, i) => P.reduce((a, p, n) => a + p[i] * ys[n], 0));
  return { omega, phase, w: solveSym(A, b) };
}
// #endregion member

/** Solve A w = b for symmetric positive definite A (Cholesky). */
export function solveSym(A: number[][], b: number[]): number[] {
  const n = b.length;
  const L = A.map(() => new Array<number>(n).fill(0));
  for (let i = 0; i < n; i++)
    for (let j = 0; j <= i; j++) {
      let s = A[i][j];
      for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
      L[i][j] = i === j ? Math.sqrt(s) : s / L[j][j];
    }
  const y = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) {
    let s = b[i];
    for (let k = 0; k < i; k++) s -= L[i][k] * y[k];
    y[i] = s / L[i][i];
  }
  const w = new Array<number>(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = y[i];
    for (let k = i + 1; k < n; k++) s -= L[k][i] * w[k];
    w[i] = s / L[i][i];
  }
  return w;
}

/** Logged transitions: x uniform in DATA_RANGE, Δ = x' − x from the true world. */
export function dataset(n = 80, seed = 3) {
  const r = rng(seed);
  const xs = Array.from({ length: n }, () => DATA_RANGE[0] + (DATA_RANGE[1] - DATA_RANGE[0]) * r());
  const ys = xs.map((x) => trueStep(x, r) - x);
  return { xs, ys };
}

// #region ensemble
export interface Ensemble {
  members: Member[];
  /** the learned noise level σ̂: the spread of the residuals on the training data */
  sigma: number;
}

/** K members, each fitted to a bootstrap resample (draw n points with replacement) with its own random features. */
export function fitEnsemble(K = 5, seed = 5, data = dataset()): Ensemble {
  const r = rng(seed);
  const n = data.xs.length;
  const members = Array.from({ length: K }, () => {
    const idx = Array.from({ length: n }, () => randInt(r, n));
    return fitMember(idx.map((i) => data.xs[i]), idx.map((i) => data.ys[i]), r);
  });
  const res = data.xs.map((x, i) => data.ys[i] - predictDelta(members[0], x));
  const sigma = Math.sqrt(res.reduce((a, v) => a + v * v, 0) / n);
  return { members, sigma };
}

/** Mean and spread (standard deviation across members) of the predicted change at x: the epistemic part. */
export function disagreement(e: Ensemble, x: number) {
  const p = e.members.map((m) => predictDelta(m, x));
  const mean = p.reduce((a, v) => a + v, 0) / p.length;
  const sd = Math.sqrt(p.reduce((a, v) => a + (v - mean) ** 2, 0) / p.length);
  return { mean, sd };
}
// #endregion ensemble

// #region fan
export type FanKind = "true" | "deterministic" | "stochastic" | "ensemble";

/**
 * `paths` rollouts of `horizon` steps from x0. Each path of the ensemble keeps one member for its whole length
 * (PETS's "trajectory sampling"); paths cycle through the members. Returns, for each path, x_0 … x_H and its member.
 */
export function fan(kind: FanKind, e: Ensemble, x0: number, horizon: number, paths: number, seed = 1) {
  const r = rng(seed);
  const n = kind === "deterministic" ? 1 : paths;
  return Array.from({ length: n }, (_, p) => {
    const m = kind === "ensemble" ? p % e.members.length : 0;
    const xs = [x0];
    for (let t = 0; t < horizon; t++) {
      const x = xs[t];
      if (kind === "true") xs.push(trueStep(x, r));
      else {
        const noise = kind === "deterministic" ? 0 : e.sigma * gaussian(r);
        xs.push(x + predictDelta(e.members[m], x) + noise);
      }
    }
    return { member: m, xs };
  });
}
// #endregion fan

/** The spread (standard deviation) of a fan at each step. */
export function spread(paths: { xs: number[] }[]): number[] {
  return paths[0].xs.map((_, t) => {
    const v = paths.map((p) => p.xs[t]);
    const mean = v.reduce((a, x) => a + x, 0) / v.length;
    return Math.sqrt(v.reduce((a, x) => a + (x - mean) ** 2, 0) / v.length);
  });
}

/** Φ(z), the standard normal CDF (Abramowitz & Stegun 7.1.26 for erf, error below 1.5e-7). */
export function normalCdf(z: number): number {
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const erf = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return z >= 0 ? 0.5 * (1 + erf) : 0.5 * (1 - erf);
}

/** The z with Φ(z) = p (bisection on normalCdf). */
export function normalQuantile(p: number): number {
  let lo = -10;
  let hi = 10;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (normalCdf(mid) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

// #region calibration
export const LEVELS = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];

/**
 * A reliability curve for one-step predictions at test points x in `range`. For each nominal level p, the fraction of
 * true next states that fall inside the model's central p-interval. A calibrated model gives fraction ≈ p.
 * - "aleatoric": member 0 with its noise σ̂ only;
 * - "total": the ensemble mean, with variance σ̂² + (spread across members)².
 */
export function reliability(e: Ensemble, kind: "aleatoric" | "total", range: [number, number], n = 400, seed = 9) {
  const r = rng(seed);
  const z: number[] = [];
  for (let i = 0; i < n; i++) {
    const x = range[0] + (range[1] - range[0]) * r();
    const next = trueStep(x, r);
    let mean: number;
    let sd: number;
    if (kind === "aleatoric") {
      mean = x + predictDelta(e.members[0], x);
      sd = e.sigma;
    } else {
      const d = disagreement(e, x);
      mean = x + d.mean;
      sd = Math.sqrt(e.sigma ** 2 + d.sd ** 2);
    }
    z.push(Math.abs(next - mean) / sd);
  }
  const observed = LEVELS.map((p) => z.filter((v) => v <= normalQuantile((1 + p) / 2)).length / n);
  const error = observed.reduce((a, o, i) => a + Math.abs(o - LEVELS[i]), 0) / LEVELS.length;
  return { levels: LEVELS, observed, error };
}
// #endregion calibration
