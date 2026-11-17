/** Dyna-Q against Q-learning on Sutton & Barto's maze, averaged over fixed seeds, at equal real steps. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { DYNA_DEFAULTS, DYNA_MAZE, averageCurve, dynaQ, greedy, mazeStep, shortestPath } from "../src/models/dyna.ts";
import { rng } from "../src/models/rng.ts";

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];

test("the maze: shortest path is 14 steps and walls block", () => {
  assert.equal(shortestPath(DYNA_MAZE), 14);
  // from (1, 1) moving right hits the wall at (1, 2)
  assert.equal(mazeStep(DYNA_MAZE, 1 * 9 + 1, 1).next, 1 * 9 + 1);
});

test("Dyna-Q reaches the goal in fewer real steps than Q-learning", () => {
  // real steps until the 5th arrival at the goal (a run that never gets there counts as all its steps)
  const stepsTo5 = (n: number, seed: number) => dynaQ(DYNA_MAZE, { ...DYNA_DEFAULTS, n, seed }).episodeEnds[4] ?? DYNA_DEFAULTS.steps;
  const mean = (n: number) => SEEDS.reduce((s, seed) => s + stepsTo5(n, seed), 0) / SEEDS.length;
  const [q, d5, d50] = [mean(0), mean(5), mean(50)];
  assert.ok(d5 < 0.6 * q, `5 episodes: Q-learning ${q} real steps, Dyna-Q (n=5) ${d5}`);
  assert.ok(d50 < d5, `n=50 ${d50} should beat n=5 ${d5}`);
  // the first episode is a random walk (nothing is known until the goal is found), so it is the same for every n
  for (const seed of SEEDS) assert.equal(dynaQ(DYNA_MAZE, { ...DYNA_DEFAULTS, n: 0, seed }).episodeEnds[0], dynaQ(DYNA_MAZE, { ...DYNA_DEFAULTS, n: 50, seed }).episodeEnds[0]);
});

test("more imagined updates give more episodes at every checkpoint of real steps", () => {
  const c0 = averageCurve(DYNA_MAZE, 0, SEEDS);
  const c10 = averageCurve(DYNA_MAZE, 10, SEEDS);
  for (const t of [1000, 2000, 3000, 4000]) assert.ok(c10[t] > c0[t], `at ${t} steps: n=10 ${c10[t]} vs n=0 ${c0[t]}`);
});

test("after enough steps the greedy policy of Dyna-Q walks the shortest path", () => {
  const run = dynaQ(DYNA_MAZE, { ...DYNA_DEFAULTS, n: 50, seed: 3 });
  const r = rng(0);
  let s = DYNA_MAZE.start;
  let steps = 0;
  while (s !== DYNA_MAZE.goal && steps < 100) [s, steps] = [mazeStep(DYNA_MAZE, s, greedy(run.q, s, r)).next, steps + 1];
  assert.equal(steps, shortestPath(DYNA_MAZE));
});
