/**
 * The ensemble: members agree where the data was and disagree beyond it, the learned noise matches the true noise,
 * fans are reproducible, the ensemble's fan widens where a single stochastic model stays overconfident, and the
 * ensemble's predicted uncertainty is better calibrated out of the data than the noise alone.
 */
import assert from "node:assert/strict";
import { assertClose } from "./fixtures.ts";
import { readFileSync, writeFileSync } from "node:fs";
import { test } from "node:test";
import { DATA_RANGE, dataset, disagreement, fan, fitEnsemble, fitMember, normalCdf, normalQuantile, predictDelta, reliability, SIGMA, spread } from "../src/models/ensemble.ts";
import { rng } from "../src/models/rng.ts";

/** Write python/tests/fixtures/<name>.json with UPDATE_FIXTURES=1; otherwise assert it matches the current output. */
function checkFixture(name: string, data: unknown) {
  const path = new URL(`../python/tests/fixtures/${name}.json`, import.meta.url);
  const text = JSON.stringify(data) + "\n";
  if (process.env.UPDATE_FIXTURES) writeFileSync(path, text);
  else assertClose(JSON.parse(readFileSync(path, "utf8")), JSON.parse(text), `python/tests/fixtures/${name}.json is stale: run UPDATE_FIXTURES=1 node --test tests/${name}.test.ts`);
}

const e = fitEnsemble();
const meanSd = (a: number, b: number) => {
  let s = 0;
  for (let i = 0; i <= 20; i++) s += disagreement(e, a + ((b - a) * i) / 20).sd / 21;
  return s;
};

test("the normal CDF and its inverse", () => {
  assert.ok(Math.abs(normalCdf(1.959964) - 0.975) < 1e-6);
  assert.ok(Math.abs(normalQuantile(0.95) - 1.644854) < 1e-5);
  assert.ok(Math.abs(normalCdf(0) - 0.5) < 1e-9);
});

test("learned noise is close to the true noise level", () => {
  assert.ok(Math.abs(e.sigma - SIGMA) < 0.01, `σ̂ = ${e.sigma}`);
});

// #region disagreement
test("members agree inside the data and disagree outside it", () => {
  const inside = meanSd(DATA_RANGE[0], DATA_RANGE[1]);
  const outside = meanSd(DATA_RANGE[1] + 0.5, DATA_RANGE[1] + 4);
  assert.ok(inside < SIGMA / 2, `inside ${inside}`);
  assert.ok(outside > 5 * inside, `outside ${outside} vs inside ${inside}`);
});
// #endregion disagreement

test("fans are reproducible; a deterministic model draws one line", () => {
  assert.deepEqual(fan("ensemble", e, 0.5, 20, 10), fan("ensemble", e, 0.5, 20, 10));
  assert.equal(fan("deterministic", e, 0.5, 20, 10).length, 1);
});

test("leaving the data, the ensemble's fan widens beyond the single stochastic model's", () => {
  const H = 25;
  const sto = spread(fan("stochastic", e, 0.5, H, 40));
  const ens = spread(fan("ensemble", e, 0.5, H, 40));
  assert.ok(ens[H] > 3 * sto[H], `ensemble ${ens[H]} vs stochastic ${sto[H]}`);
});

// #region calibration
test("out of the data, noise alone is overconfident; adding disagreement repairs most of it", () => {
  const inData = reliability(e, "aleatoric", DATA_RANGE);
  const outAle = reliability(e, "aleatoric", [3, 6]);
  const outTot = reliability(e, "total", [3, 6]);
  assert.ok(inData.error < 0.1, `in-data calibration error ${inData.error}`);
  assert.ok(outAle.observed[8] < 0.5, "the 90 % interval covers far less than 90 %");
  assert.ok(outTot.error < outAle.error / 2, `total ${outTot.error} vs aleatoric ${outAle.error}`);
});
// #endregion calibration

test("fixture for the Python port: ridge fits for given features, predictions, disagreement, a deterministic fan", () => {
  const xs = [0, 0.5, 1.5, 2.9, 3.5, 6];
  const members = e.members.map((m) => ({ ...m, predictions: xs.map((x) => predictDelta(m, x)) }));
  // one member refitted from given data and given random features: the weights must come out the same
  const data = dataset(30, 4);
  const one = fitMember(data.xs, data.ys, rng(8));
  const paths = fan("deterministic", e, 0.5, 20, 1);
  checkFixture("ensemble", {
    sigma: e.sigma,
    xs,
    members,
    disagreement: xs.map((x) => disagreement(e, x)),
    ridge: { xs: data.xs, ys: data.ys, omega: one.omega, phase: one.phase, w: one.w },
    deterministic: paths[0].xs,
    spreadPaths: [[0, 1, 2], [0, 2, 3], [0, 0.5, 4]],
    spread: spread([[0, 1, 2], [0, 2, 3], [0, 0.5, 4]].map((xs) => ({ xs }))),
    cdf: [-3, -1, -0.2, 0, 0.7, 1.959964, 4].map((z) => [z, normalCdf(z)]),
    quantile: [0.05, 0.5, 0.75, 0.95].map((p) => [p, normalQuantile(p)]),
  });
});
