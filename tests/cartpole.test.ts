/**
 * Cart-pole: the equations of motion against values worked out by hand, RK4 against an independent fine Euler
 * integration, energy conservation without friction or force, mirror symmetry, and the learned linear model:
 * it recovers the hand-derived linearisation, and its rollout error grows with the horizon.
 */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { test } from "node:test";
import { DT, derivs, energy, errorVsHorizon, fitLinear, G, HALF_LENGTH, learned, learnedWeights, linearModel, POLE_MASS, CART_MASS, rollout, step, trainingData, type CartState } from "../src/models/cartpole.ts";
import { gaussian, rng } from "../src/models/rng.ts";

/** Write python/tests/fixtures/<name>.json with UPDATE_FIXTURES=1; otherwise assert it matches the current output. */
function checkFixture(name: string, data: unknown) {
  const path = new URL(`../python/tests/fixtures/${name}.json`, import.meta.url);
  const text = JSON.stringify(data) + "\n";
  if (process.env.UPDATE_FIXTURES) writeFileSync(path, text);
  else assert.equal(readFileSync(path, "utf8"), text, `python/tests/fixtures/${name}.json is stale: run UPDATE_FIXTURES=1 node --test tests/${name}.test.ts`);
}

const close = (a: number, b: number, tol: number, what: string) => assert.ok(Math.abs(a - b) <= tol, `${what}: ${a} vs ${b}`);

// #region reference
test("accelerations at rest, tilted 0.1 rad, match the hand calculation", () => {
  // θ̈ = g sin θ / (l (4/3 − m cos²θ / M)), ẍ = −m l θ̈ cos θ / M, with M = 1.1 kg, m = 0.1 kg, l = 0.5 m
  const [, xdd, , thdd] = derivs([0, 0, 0.1, 0], 0);
  close(thdd, 1.573785, 1e-6, "θ̈");
  close(xdd, -0.071178, 1e-6, "ẍ");
});
// #endregion reference

test("one RK4 step agrees with 10 000 tiny Euler steps", () => {
  const s0: CartState = [0.1, -0.3, 0.2, 0.5];
  const fine = (s: CartState, f: number) => {
    let x = s;
    const h = DT / 10_000;
    for (let i = 0; i < 10_000; i++) x = x.map((v, j) => v + h * derivs(x, f)[j]) as CartState;
    return x;
  };
  const a = step(s0, 3);
  const b = fine(s0, 3);
  a.forEach((v, i) => close(v, b[i], 1e-5, `component ${i}`));
});

// #region energy
test("with no friction and no force, energy is conserved over 2 s", () => {
  const states = rollout(step, [0, 0, 0.2, 0], new Array(100).fill(0));
  const e0 = energy(states[0]);
  for (const s of states) close(energy(s), e0, 1e-5 * Math.abs(e0), "energy") // RK4 drifts, but by less than 0.001 %;
  // and the pole really moved: it fell well past horizontal
  assert.ok(Math.abs(states[100][2]) > Math.PI / 2);
});
// #endregion energy

test("mirror symmetry: flipping the state and the force flips the next state", () => {
  const s: CartState = [0.3, 0.2, -0.15, 0.4];
  const a = step(s, 4);
  const b = step(s.map((v) => -v) as CartState, -4);
  a.forEach((v, i) => close(b[i], -v, 1e-12, `component ${i}`));
});

test("the fitted linear model recovers the linearisation about upright", () => {
  const w = learnedWeights();
  const M = CART_MASS + POLE_MASS;
  const k = G / (HALF_LENGTH * (4 / 3 - POLE_MASS / M)); // ∂θ̈/∂θ at θ = 0
  close(w[2][3], DT, 1e-3, "θ' depends on θ̇ with weight dt");
  close(w[3][2], k * DT, 0.01 * k * DT, "θ̇' depends on θ with weight k·dt");
  // near upright, one step is very accurate
  const s: CartState = [0.1, 0.1, 0.03, -0.05];
  const e = Math.hypot(...learned(s, 2).map((v, i) => v - step(s, 2)[i]));
  assert.ok(e < 1e-4, `one-step error ${e}`);
});

// #region horizon
test("rollout error grows with the horizon, and faster than the one-step error", () => {
  const { rollout: r, oneStep } = errorVsHorizon(learned, 50);
  for (const [a, b] of [[1, 5], [5, 10], [10, 25], [25, 50]]) assert.ok(r[b] > r[a], `error at ${b} > error at ${a}`);
  assert.ok(r[50] > 5 * oneStep[50], "compounding: rollout error ≫ one-step error");
  assert.ok(r[1] < 1e-4);
});
// #endregion horizon

test("fixture for the Python port: derivatives, RK4 steps, energy and a least-squares fit for given data", () => {
  const r = rng(21);
  const cases = Array.from({ length: 8 }, (_, k) => {
    const s: CartState = [gaussian(r), gaussian(r), 0.5 * k * gaussian(r), 2 * gaussian(r)];
    const force = 10 * (2 * r() - 1);
    return { s, force, derivs: derivs(s, force), step: step(s, force), energy: energy(s) };
  });
  const { inputs, forces, targets } = trainingData(40, 3);
  const weights = fitLinear(inputs, forces, targets);
  const s: CartState = [0.1, 0.1, 0.03, -0.05];
  checkFixture("cartpole", { constants: { G, CART_MASS, POLE_MASS, HALF_LENGTH, DT }, cases, fit: { inputs, forces, targets, weights, s, force: 2, prediction: linearModel(weights)(s, 2) } });
});
