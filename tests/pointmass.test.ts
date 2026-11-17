/** The point mass: exact rollouts, the cost's terms, and a fixture for the Python port (python/wm/pointmass.py). */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { test } from "node:test";
import { POINT_MASS, pmCost, pmGoalDistance, pmRollout, pmStep, type PmState } from "../src/models/pointmass.ts";
import { rng } from "../src/models/rng.ts";

/** Write python/tests/fixtures/<name>.json with UPDATE_FIXTURES=1; otherwise assert it matches the current output. */
function checkFixture(name: string, data: unknown) {
  const path = new URL(`../python/tests/fixtures/${name}.json`, import.meta.url);
  const text = JSON.stringify(data) + "\n";
  if (process.env.UPDATE_FIXTURES) writeFileSync(path, text);
  else assert.equal(readFileSync(path, "utf8"), text, `python/tests/fixtures/${name}.json is stale: run UPDATE_FIXTURES=1 node --test tests/${name}.test.ts`);
}

test("zero force only decays the velocity; a clipped action equals the bound", () => {
  const s: PmState = [0, 0, 1, 0];
  const next = pmStep(POINT_MASS, s, 0, 0);
  assert.ok(Math.abs(next[2] - (1 - POINT_MASS.dt * POINT_MASS.drag)) < 1e-12);
  assert.deepEqual(pmStep(POINT_MASS, s, 5, -3), pmStep(POINT_MASS, s, 1, -1));
});

test("the cost: a plan through the obstacle costs more than one around it, and resting at the goal costs nothing", () => {
  const m = POINT_MASS;
  assert.equal(pmCost(m, [m.goal[0], m.goal[1], 0, 0], new Array(10).fill(0)), 0);
  assert.equal(pmGoalDistance(m, [m.goal[0], m.goal[1], 0, 0]), 0);
  const straight = pmCost(m, m.start, new Array(30).fill(0).map((_, i) => (i % 2 ? 0.55 : 0.75)));
  assert.ok(straight > 20, `straight through the obstacle: ${straight}`);
});

test("fixture for the Python port: steps, rollouts and costs for given plans", () => {
  const r = rng(5);
  const u = (lo: number, hi: number) => lo + (hi - lo) * r();
  const cases = [];
  for (let k = 0; k < 6; k++) {
    const s: PmState = [u(-0.9, 0.9), u(-0.9, 0.9), u(-0.5, 0.5), u(-0.5, 0.5)];
    const actions = Array.from({ length: 2 * (5 + k * 3) }, () => u(-1.5, 1.5)); // some beyond the bound, to test the clip
    cases.push({ s, actions, path: pmRollout(POINT_MASS, s, actions), cost: pmCost(POINT_MASS, s, actions), step: pmStep(POINT_MASS, s, actions[0], actions[1]) });
  }
  // a plan straight through the obstacle and out of the arena, so every penalty fires
  const through = new Array(40).fill(0).map((_, i) => (i % 2 ? 0.6 : 0.8));
  cases.push({ s: POINT_MASS.start, actions: through, path: pmRollout(POINT_MASS, POINT_MASS.start, through), cost: pmCost(POINT_MASS, POINT_MASS.start, through), step: pmStep(POINT_MASS, POINT_MASS.start, 0.8, 0.6) });
  checkFixture("pointmass", { model: POINT_MASS, cases });
});
