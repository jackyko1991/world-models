/**
 * A toy joint-embedding predictive setup, small enough to train by hand-written gradient descent in the browser.
 *
 * N points x_i in R^D come in three clusters. Each has two noisy views, v_i and v'_i. A linear encoder z = W v maps a
 * view to 2-D; a linear predictor p = A z + b guesses the embedding of the other view from this one. The prediction
 * loss alone is minimised by W = 0 — every point embedded at the same place — so plain gradient descent collapses the
 * cloud. The VICReg terms (a hinge on each dimension's standard deviation, and a penalty on off-diagonal covariance)
 * forbid that answer. Everything is deterministic: data from `rng(seed)`, full-batch gradient steps.
 */
import { gaussian, rng } from "./rng.ts";

export const DIM = 4; // input dimension D
export const EMB = 2; // embedding dimension

export interface ToyData {
  /** first and second view of every point, each a length-D vector */
  v: number[][];
  vp: number[][];
  /** cluster of every point (0, 1, 2), for colouring */
  cluster: number[];
}

export interface ToyState {
  W: number[][]; // EMB × DIM encoder
  A: number[][]; // EMB × EMB predictor
  b: number[]; // EMB predictor bias
  step: number;
}

export interface ToyOptions {
  /** add the VICReg variance and covariance terms */
  antiCollapse: boolean;
  lr?: number;
  /** target standard deviation γ of each embedding dimension */
  gamma?: number;
  varWeight?: number;
  covWeight?: number;
}

export function makeData(seed = 1, n = 48, noise = 0.45): ToyData {
  const r = rng(seed);
  const centres = [0, 1, 2].map(() => Array.from({ length: DIM }, () => 1.2 * gaussian(r)));
  const v: number[][] = [];
  const vp: number[][] = [];
  const cluster: number[] = [];
  for (let i = 0; i < n; i++) {
    const c = i % 3;
    const x = centres[c].map((m) => m + 0.35 * gaussian(r));
    v.push(x.map((xi) => xi + noise * gaussian(r)));
    vp.push(x.map((xi) => xi + noise * gaussian(r)));
    cluster.push(c);
  }
  return { v, vp, cluster };
}

export function initState(seed = 2): ToyState {
  const r = rng(seed);
  return {
    W: Array.from({ length: EMB }, () => Array.from({ length: DIM }, () => 0.5 * gaussian(r))),
    A: [
      [1, 0],
      [0, 1],
    ],
    b: [0, 0],
    step: 0,
  };
}

const matvec = (M: number[][], x: number[]) => M.map((row) => row.reduce((s, m, j) => s + m * x[j], 0));

/** Embeddings of both views and the predictions of the second from the first. */
export function embed(s: ToyState, d: ToyData) {
  const z = d.v.map((x) => matvec(s.W, x));
  const zp = d.vp.map((x) => matvec(s.W, x));
  const pred = z.map((zi) => matvec(s.A, zi).map((p, k) => p + s.b[k]));
  return { z, zp, pred };
}

/** Per-dimension mean and (unbiased) variance of a set of embeddings. */
export function stats(z: number[][]) {
  const n = z.length;
  const mean = [0, 1].map((k) => z.reduce((s, zi) => s + zi[k], 0) / n);
  const variance = [0, 1].map((k) => z.reduce((s, zi) => s + (zi[k] - mean[k]) ** 2, 0) / (n - 1));
  const cov = z.reduce((s, zi) => s + (zi[0] - mean[0]) * (zi[1] - mean[1]), 0) / (n - 1);
  return { mean, variance, cov };
}

/** Total variance of the embeddings of the first views (trace of their covariance): 0 means collapse. */
export const spread = (s: ToyState, d: ToyData): number => {
  const { variance } = stats(embed(s, d).z);
  return variance[0] + variance[1];
};

// #region regulariser
/**
 * VICReg's anti-collapse terms on one batch of embeddings, and their gradient with respect to every embedding.
 *   variance:   Σ_k max(0, γ − sqrt(Var z_k + ε))         (keep every dimension spread out)
 *   covariance: Σ_{j≠k} C_jk² / EMB                        (decorrelate the dimensions)
 */
function vicreg(z: number[][], gamma: number, wv: number, wc: number) {
  const n = z.length;
  const eps = 1e-4;
  const { mean, variance, cov } = stats(z);
  const sd = variance.map((v) => Math.sqrt(v + eps));
  let loss = 0;
  for (let k = 0; k < EMB; k++) loss += wv * Math.max(0, gamma - sd[k]);
  loss += (wc * 2 * cov * cov) / EMB;
  const grad = z.map((zi) => {
    const g = [0, 0];
    for (let k = 0; k < EMB; k++) {
      const c = zi[k] - mean[k];
      if (sd[k] < gamma) g[k] -= (wv * c) / ((n - 1) * sd[k]);
      const other = zi[1 - k] - mean[1 - k];
      g[k] += (wc * 4 * cov * other) / ((n - 1) * EMB);
    }
    return g;
  });
  return { loss, grad };
}
// #endregion regulariser

export interface StepResult {
  state: ToyState;
  /** prediction loss (1/N) Σ ||A z_i + b − z'_i||² before the step */
  prediction: number;
  /** anti-collapse loss before the step (0 when switched off) */
  regulariser: number;
}

// #region step
/** One full-batch gradient step on prediction loss (+ the VICReg terms on both views when switched on). */
export function trainStep(s: ToyState, d: ToyData, o: ToyOptions): StepResult {
  const { lr = 0.05, gamma = 1, varWeight = 1, covWeight = 0.5 } = o;
  const n = d.v.length;
  const { z, zp, pred } = embed(s, d);
  const gA = [
    [0, 0],
    [0, 0],
  ];
  const gb = [0, 0];
  const gz = z.map(() => [0, 0]); // ∂loss/∂z_i
  const gzp = z.map(() => [0, 0]); // ∂loss/∂z'_i
  let prediction = 0;
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < EMB; k++) {
      const r = pred[i][k] - zp[i][k]; // residual of the prediction
      prediction += (r * r) / n;
      const g = (2 * r) / n;
      gb[k] += g;
      for (let j = 0; j < EMB; j++) {
        gA[k][j] += g * z[i][j];
        gz[i][j] += s.A[k][j] * g; // through the predictor
      }
      gzp[i][k] -= g; // through the target branch (no stop-gradient here)
    }
  }
  let regulariser = 0;
  if (o.antiCollapse) {
    for (const [zs, gs] of [
      [z, gz],
      [zp, gzp],
    ] as const) {
      const v = vicreg(zs, gamma, varWeight, covWeight);
      regulariser += v.loss;
      v.grad.forEach((g, i) => g.forEach((gk, k) => (gs[i][k] += gk)));
    }
  }
  // chain rule into the encoder: z = W v, so ∂/∂W = Σ_i ∂/∂z_i v_iᵀ (both views share W)
  const W = s.W.map((row, k) =>
    row.map((w, j) => {
      let g = 0;
      for (let i = 0; i < n; i++) g += gz[i][k] * d.v[i][j] + gzp[i][k] * d.vp[i][j];
      return w - lr * g;
    }),
  );
  const A = s.A.map((row, k) => row.map((a, j) => a - lr * gA[k][j]));
  const b = s.b.map((bk, k) => bk - lr * gb[k]);
  return { state: { W, A, b, step: s.step + 1 }, prediction, regulariser };
}
// #endregion step

/** Run `steps` gradient steps from `s`; returns the final state and the spread after every step. */
export function train(s: ToyState, d: ToyData, o: ToyOptions, steps: number) {
  const history: number[] = [];
  for (let t = 0; t < steps; t++) {
    s = trainStep(s, d, o).state;
    history.push(spread(s, d));
  }
  return { state: s, history };
}
