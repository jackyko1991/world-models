/** Dyna-Q against Q-learning on Sutton & Barto's maze, averaged over fixed seeds, at equal real steps. */
import assert from "node:assert/strict";
import { assertClose } from "./fixtures.ts";
import { readFileSync, writeFileSync } from "node:fs";
import { test } from "node:test";
import { DYNA_DEFAULTS, DYNA_MAZE, averageCurve, dynaQ, episodesByStep, greedy, mazeStep, qUpdate, shortestPath } from "../src/models/dyna.ts";
import { randInt, rng } from "../src/models/rng.ts";

/** Write python/tests/fixtures/<name>.json with UPDATE_FIXTURES=1; otherwise assert it matches the current output. */
function checkFixture(name: string, data: unknown) {
  const path = new URL(`../python/tests/fixtures/${name}.json`, import.meta.url);
  const text = JSON.stringify(data) + "\n";
  if (process.env.UPDATE_FIXTURES) writeFileSync(path, text);
  else assertClose(JSON.parse(readFileSync(path, "utf8")), JSON.parse(text), `python/tests/fixtures/${name}.json is stale: run UPDATE_FIXTURES=1 node --test tests/${name}.test.ts`);
}

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

test("fixture for the Python port: the maze's steps, Q-learning updates on a given table, a learning curve", () => {
  const m = DYNA_MAZE;
  const steps = [];
  for (let s = 0; s < m.rows * m.cols; s++) for (let a = 0; a < 4; a++) steps.push({ s, a, ...mazeStep(m, s, a) });
  // a table of small values and a sequence of transitions (some into the goal), applied one after another
  const r = rng(21);
  const q = Float64Array.from({ length: m.rows * m.cols * 4 }, () => r() * 0.5);
  const q0 = Array.from(q);
  const transitions = [];
  for (let k = 0; k < 40; k++) {
    const s = randInt(r, m.rows * m.cols);
    const a = randInt(r, 4);
    const { next, reward, done } = k % 8 === 7 ? { next: m.goal, reward: 1, done: true } : mazeStep(m, s, a);
    qUpdate(q, s, a, reward, next, done, DYNA_DEFAULTS.alpha, DYNA_DEFAULTS.gamma);
    transitions.push({ s, a, reward, next, terminal: done });
  }
  const run = { episodeEnds: [17, 40, 41, 77, 100], q: new Float64Array(0) };
  checkFixture("dyna", {
    maze: { rows: m.rows, cols: m.cols, walls: [...m.walls].sort((a, b) => a - b), start: m.start, goal: m.goal },
    alpha: DYNA_DEFAULTS.alpha,
    gamma: DYNA_DEFAULTS.gamma,
    steps,
    shortestPath: shortestPath(m),
    q0,
    transitions,
    q: Array.from(q),
    episodeEnds: run.episodeEnds,
    episodesByStep: episodesByStep(run, 100),
  });
});
