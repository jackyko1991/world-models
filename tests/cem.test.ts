/** CEM: converges on a quadratic's known optimum, beats random shooting at equal samples, and MPC reaches the goal. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { CEM_DEFAULTS, cem, mpc, randomShooting } from "../src/models/cem.ts";
import { POINT_MASS, pmCost, pmGoalDistance, pmRollout, pmStep, type PmState } from "../src/models/pointmass.ts";
import { rng } from "../src/models/rng.ts";

test("CEM converges on the optimum of a shifted quadratic", () => {
  const target = [0.3, -0.5, 0.8, 0.1, -0.2, 0.6];
  const cost = (p: number[]) => p.reduce((s, v, d) => s + (v - target[d]) ** 2, 0);
  const D = target.length;
  const out = cem(cost, new Array(D).fill(0), new Array(D).fill(0.5), 30, { ...CEM_DEFAULTS, samples: 100, elites: 10, minStd: 1e-4 }, rng(1));
  out.mean.forEach((m, d) => assert.ok(Math.abs(m - target[d]) < 0.01, `mean[${d}] = ${m}, expected ${target[d]}`));
  assert.ok(out.bestCost < 1e-3, `best cost ${out.bestCost}`);
  // the best cost found never gets worse from one iteration to the next
  const best = out.history.map((it) => it.costs[it.elites[0]]);
  const running = best.map((_, k) => Math.min(...best.slice(0, k + 1)));
  assert.equal(running[running.length - 1], out.bestCost);
  // the Gaussian narrows as it closes in
  assert.ok(Math.max(...out.history[29].std) < Math.max(...out.history[0].std) / 10);
});

test("CEM beats random shooting with the same number of samples on the point mass", () => {
  const H = 25;
  const cost = (p: number[]) => pmCost(POINT_MASS, POINT_MASS.start, p);
  const zeros = new Array(2 * H).fill(0);
  const std = new Array(2 * H).fill(0.7);
  let cemSum = 0;
  let rsSum = 0;
  for (const seed of [1, 2, 3, 4, 5]) {
    cemSum += cem(cost, zeros, std, 6, CEM_DEFAULTS, rng(seed)).bestCost;
    rsSum += randomShooting(cost, zeros, std, 6 * CEM_DEFAULTS.samples, 1, rng(seed)).bestCost;
  }
  assert.ok(cemSum < 0.8 * rsSum, `CEM ${cemSum / 5} vs random shooting ${rsSum / 5}`);
});

test("MPC with CEM drives the point mass to the goal without touching the obstacle", () => {
  const m = POINT_MASS;
  const H = 25;
  const visited = mpc<PmState>(
    m.start,
    50,
    (s) => (p) => pmCost(m, s, p),
    (s, a) => pmStep(m, s, a[0], a[1]),
    2,
    H,
    { ...CEM_DEFAULTS, iters: 4, initStd: 0.6 },
    rng(7),
  );
  const last = visited[visited.length - 1];
  assert.ok(pmGoalDistance(m, last) < 0.08, `ended ${pmGoalDistance(m, last)} from the goal`);
  for (const s of visited) assert.ok(Math.hypot(s[0] - m.obstacle.x, s[1] - m.obstacle.y) > m.obstacle.r - 0.02, "hit the obstacle");
});

test("a rollout of the point mass is exact: zero force only decays the velocity", () => {
  const path = pmRollout(POINT_MASS, [0, 0, 1, 0], new Array(20).fill(0));
  const vx = path.map((s) => s[2]);
  for (let t = 1; t < vx.length; t++) assert.ok(Math.abs(vx[t] - vx[t - 1] * (1 - POINT_MASS.dt * POINT_MASS.drag)) < 1e-12);
});
