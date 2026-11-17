/**
 * The ensemble: members agree where the data was and disagree beyond it, the learned noise matches the true noise,
 * fans are reproducible, the ensemble's fan widens where a single stochastic model stays overconfident, and the
 * ensemble's predicted uncertainty is better calibrated out of the data than the noise alone.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { DATA_RANGE, disagreement, fan, fitEnsemble, normalCdf, normalQuantile, reliability, SIGMA, spread } from "../src/models/ensemble.ts";

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
