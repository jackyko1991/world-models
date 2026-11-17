/**
 * Planning by search over action sequences (Concepts ▸ Planning and imagination ▸ cem; Coding Skills ▸ Planning in
 * code ▸ cem). A plan is a flat vector of actions; `cost` scores it by rolling it through a model.
 *
 * - Random shooting: draw N plans from one fixed Gaussian, keep the cheapest.
 * - Cross-entropy method (Rubinstein 1999): draw N plans from a Gaussian, keep the K cheapest (the elites), refit the
 *   Gaussian's mean and standard deviation to the elites, repeat.
 * - Model-predictive control: plan, carry out only the first action, then plan again from where you land.
 *
 * Randomness only from rng.ts, so every run is reproducible.
 */
import { gaussian, type Rng } from "./rng.ts";

export type Cost = (plan: number[]) => number;

export interface CemOptions {
  /** plans drawn per iteration (N) */
  samples: number;
  /** plans kept per iteration (K) */
  elites: number;
  /** each action is clipped to [-bound, bound] */
  bound: number;
  /** a floor for the standard deviation, so the search never freezes completely */
  minStd: number;
}

export const CEM_DEFAULTS: CemOptions = { samples: 60, elites: 6, bound: 1, minStd: 0.02 };

/** Everything one CEM iteration did, for the demo to draw. */
export interface CemIteration {
  mean: number[];
  std: number[];
  plans: number[][];
  costs: number[];
  /** indices into `plans`, cheapest first */
  elites: number[];
  nextMean: number[];
  nextStd: number[];
}

// #region cem
/** One CEM iteration: sample, score, keep the elites, refit. */
export function cemIteration(cost: Cost, mean: number[], std: number[], o: CemOptions, r: Rng): CemIteration {
  const D = mean.length;
  // 1. sample N plans from the current Gaussian, clipped to the action bounds
  const plans: number[][] = [];
  for (let i = 0; i < o.samples; i++) {
    const p = new Array<number>(D);
    for (let d = 0; d < D; d++) p[d] = Math.max(-o.bound, Math.min(o.bound, mean[d] + std[d] * gaussian(r)));
    plans.push(p);
  }
  // 2. score each plan by rolling it through the model
  const costs = plans.map(cost);
  // 3. keep the K cheapest
  const elites = costs.map((_, i) => i).sort((a, b) => costs[a] - costs[b]).slice(0, o.elites);
  // 4. refit: the elites' mean and standard deviation become the next Gaussian
  const nextMean = new Array<number>(D).fill(0);
  const nextStd = new Array<number>(D).fill(0);
  for (const i of elites) for (let d = 0; d < D; d++) nextMean[d] += plans[i][d] / elites.length;
  for (const i of elites) for (let d = 0; d < D; d++) nextStd[d] += (plans[i][d] - nextMean[d]) ** 2 / elites.length;
  for (let d = 0; d < D; d++) nextStd[d] = Math.max(o.minStd, Math.sqrt(nextStd[d]));
  return { mean, std, plans, costs, elites, nextMean, nextStd };
}

/** CEM for a few iterations from N(mean, std²); returns the best plan seen and every iteration. */
export function cem(cost: Cost, mean: number[], std: number[], iters: number, o: CemOptions, r: Rng) {
  let best = mean;
  let bestCost = Infinity;
  const history: CemIteration[] = [];
  for (let k = 0; k < iters; k++) {
    const it = cemIteration(cost, mean, std, o, r);
    history.push(it);
    if (it.costs[it.elites[0]] < bestCost) [best, bestCost] = [it.plans[it.elites[0]], it.costs[it.elites[0]]];
    [mean, std] = [it.nextMean, it.nextStd];
  }
  return { best, bestCost, mean, history };
}
// #endregion

/** Random shooting: `samples` plans from one fixed N(mean, std²); the cheapest wins. */
export function randomShooting(cost: Cost, mean: number[], std: number[], samples: number, bound: number, r: Rng) {
  let best = mean;
  let bestCost = Infinity;
  for (let i = 0; i < samples; i++) {
    const p = mean.map((m, d) => Math.max(-bound, Math.min(bound, m + std[d] * gaussian(r))));
    const c = cost(p);
    if (c < bestCost) [best, bestCost] = [p, c];
  }
  return { best, bestCost };
}

// #region mpc
/**
 * Model-predictive control: at every real step, plan a whole sequence with CEM, carry out only its first action,
 * then shift the plan one step forward as the next warm start (a receding horizon).
 * `planCost(state)` returns the cost of a plan from that state; `act` is the real system.
 */
export function mpc<S>(
  state: S,
  steps: number,
  planCost: (s: S) => Cost,
  act: (s: S, action: number[]) => S,
  actionDim: number,
  horizon: number,
  o: CemOptions & { iters: number; initStd: number },
  r: Rng,
): S[] {
  const D = actionDim * horizon;
  let mean = new Array<number>(D).fill(0);
  const visited = [state];
  for (let t = 0; t < steps; t++) {
    const plan = cem(planCost(state), mean, new Array<number>(D).fill(o.initStd), o.iters, o, r);
    state = act(state, plan.best.slice(0, actionDim)); // only the first action is carried out
    visited.push(state);
    mean = [...plan.mean.slice(actionDim), ...new Array<number>(actionDim).fill(0)]; // warm start
  }
  return visited;
}
// #endregion
