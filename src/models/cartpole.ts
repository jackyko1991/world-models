/**
 * Cart-pole: the true simulator and a learned linear model.
 *
 * The true dynamics are the classic equations of Barto, Sutton & Anderson (1983), in the corrected form given by
 * Florian (2007), without friction: a cart of mass 1 kg on a rail, a uniform pole of mass 0.1 kg and half-length
 * 0.5 m hinged on it, gravity 9.8 m/s², a horizontal force F on the cart. θ = 0 is upright, θ > 0 leans right.
 * They are integrated with classical fourth-order Runge–Kutta at a fixed step dt = 0.02 s (the step OpenAI Gym uses).
 *
 * The learned model is linear, s' = A s + B F + c, fitted by least squares to 2000 one-step transitions of the
 * simulator from random states near upright (fixed seed). It is good for one step near where its data lies and
 * worse further away, and in a rollout it is fed its own predictions, so its error compounds.
 */
import { gaussian, rng } from "./rng.ts";

// #region step
/** State [x, ẋ, θ, θ̇]: cart position (m), cart velocity (m/s), pole angle (rad), angular velocity (rad/s). */
export type CartState = [number, number, number, number];

export const G = 9.8;
export const CART_MASS = 1.0;
export const POLE_MASS = 0.1;
/** half the pole's length (m) */
export const HALF_LENGTH = 0.5;
/** the simulator's time step (s) */
export const DT = 0.02;

/** ds/dt for force F (N): the frictionless cart-pole equations of motion. */
export function derivs([, xd, th, thd]: CartState, force: number): CartState {
  const total = CART_MASS + POLE_MASS;
  const sin = Math.sin(th);
  const cos = Math.cos(th);
  const temp = (force + POLE_MASS * HALF_LENGTH * thd * thd * sin) / total;
  const thdd = (G * sin - cos * temp) / (HALF_LENGTH * (4 / 3 - (POLE_MASS * cos * cos) / total));
  const xdd = temp - (POLE_MASS * HALF_LENGTH * thdd * cos) / total;
  return [xd, xdd, thd, thdd];
}

/** One step of the true simulator: classical Runge–Kutta (RK4) over dt, force held constant. */
export function step(s: CartState, force: number, dt = DT): CartState {
  const add = (a: CartState, k: CartState, h: number) => a.map((v, i) => v + h * k[i]) as CartState;
  const k1 = derivs(s, force);
  const k2 = derivs(add(s, k1, dt / 2), force);
  const k3 = derivs(add(s, k2, dt / 2), force);
  const k4 = derivs(add(s, k3, dt), force);
  return s.map((v, i) => v + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])) as CartState;
}
// #endregion step

// #region rollout
/** A one-step model: the true simulator, or a learned approximation of it. */
export type Model = (s: CartState, force: number) => CartState;

/** Feed a model its own predictions for as many steps as there are forces; returns s_0 … s_H. */
export function rollout(model: Model, s0: CartState, forces: number[]): CartState[] {
  const states: CartState[] = [s0];
  for (const f of forces) states.push(model(states[states.length - 1], f));
  return states;
}
// #endregion rollout

/** Total mechanical energy (J): kinetic of cart and pole (translation and rotation about its centre) plus potential. */
export function energy([, xd, th, thd]: CartState): number {
  const m = POLE_MASS;
  const l = HALF_LENGTH;
  const kinetic = 0.5 * (CART_MASS + m) * xd * xd + m * l * xd * thd * Math.cos(th) + (2 / 3) * m * l * l * thd * thd;
  return kinetic + m * G * l * Math.cos(th);
}

// #region fit
/** A linear model s' = A s + B F + c, stored as 4 rows of 6 weights [A row | B | c]. */
export type LinearWeights = number[][];

/** Features of one input: the state, the force and a constant 1 (for the bias c). */
const features = (s: CartState, f: number) => [...s, f, 1];

export function linearModel(w: LinearWeights): Model {
  return (s, f) => {
    const z = features(s, f);
    return w.map((row) => row.reduce((acc, wi, i) => acc + wi * z[i], 0)) as CartState;
  };
}

/** Least squares for each output: solve (ZᵀZ + λI) w = Zᵀy by Gaussian elimination (λ tiny, for stability). */
export function fitLinear(inputs: CartState[], forces: number[], targets: CartState[], lambda = 1e-6): LinearWeights {
  const Z = inputs.map((s, n) => features(s, forces[n]));
  const d = Z[0].length;
  const ZtZ = Array.from({ length: d }, (_, i) => Array.from({ length: d }, (_, j) => Z.reduce((a, z) => a + z[i] * z[j], 0) + (i === j ? lambda : 0)));
  return [0, 1, 2, 3].map((k) => solve(ZtZ, Array.from({ length: d }, (_, i) => Z.reduce((a, z, n) => a + z[i] * targets[n][k], 0))));
}
// #endregion fit

/** Solve M w = b (M square) by Gaussian elimination with partial pivoting. */
export function solve(M: number[][], b: number[]): number[] {
  const n = b.length;
  const a = M.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
    [a[c], a[p]] = [a[p], a[c]];
    for (let r = c + 1; r < n; r++) {
      const k = a[r][c] / a[c][c];
      for (let j = c; j <= n; j++) a[r][j] -= k * a[c][j];
    }
  }
  const w = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let acc = a[r][n];
    for (let j = r + 1; j < n; j++) acc -= a[r][j] * w[j];
    w[r] = acc / a[r][r];
  }
  return w;
}

// #region data
/** Training data: random states near upright (|θ| ≲ 0.1 rad) and random forces, one true step each. */
export function trainingData(n = 2000, seed = 7) {
  const r = rng(seed);
  const inputs: CartState[] = [];
  const forces: number[] = [];
  const targets: CartState[] = [];
  for (let i = 0; i < n; i++) {
    const s: CartState = [0.5 * gaussian(r), 0.5 * gaussian(r), 0.05 * gaussian(r), 0.3 * gaussian(r)];
    const f = 10 * (2 * r() - 1);
    inputs.push(s);
    forces.push(f);
    targets.push(step(s, f));
  }
  return { inputs, forces, targets };
}
// #endregion data

let cached: LinearWeights | null = null;
/** The learned model's fixed weights (fitted once, deterministically, from trainingData()). */
export function learnedWeights(): LinearWeights {
  if (!cached) {
    const { inputs, forces, targets } = trainingData();
    cached = fitLinear(inputs, forces, targets);
  }
  return cached;
}
export const learned: Model = (s, f) => linearModel(learnedWeights())(s, f);

/** Euclidean distance between two states. */
export const stateError = (a: CartState, b: CartState) => Math.hypot(...a.map((v, i) => v - b[i]));

/** A force pattern for demos: none, or a push right then left (±5 N, switching every 0.5 s). */
export function forcePattern(kind: "none" | "push", horizon: number): number[] {
  return Array.from({ length: horizon }, (_, t) => (kind === "none" ? 0 : Math.floor(t / 25) % 2 === 0 ? 5 : -5));
}

// #region horizon
/**
 * Mean error against horizon, over `starts` random initial states (fixed seed) and zero force:
 * - rollout: the model is fed its own predictions (open loop), as when it imagines the future;
 * - oneStep: at every step the model starts again from the true state (its single-step error only).
 */
export function errorVsHorizon(model: Model, horizon: number, starts = 40, seed = 11) {
  const r = rng(seed);
  const rolloutErr = new Array<number>(horizon + 1).fill(0);
  const oneStepErr = new Array<number>(horizon + 1).fill(0);
  for (let k = 0; k < starts; k++) {
    const s0: CartState = [0.2 * gaussian(r), 0.2 * gaussian(r), 0.05 * gaussian(r), 0.1 * gaussian(r)];
    const forces = new Array<number>(horizon).fill(0);
    const truth = rollout(step, s0, forces);
    const imagined = rollout(model, s0, forces);
    for (let t = 1; t <= horizon; t++) {
      rolloutErr[t] += stateError(imagined[t], truth[t]) / starts;
      oneStepErr[t] += stateError(model(truth[t - 1], 0), truth[t]) / starts;
    }
  }
  return { rollout: rolloutErr, oneStep: oneStepErr };
}
// #endregion horizon
