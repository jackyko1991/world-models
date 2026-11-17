/**
 * Losses: reconstruction is zero only for a perfect reconstruction and the Gaussian NLL is MSE rescaled; the KL
 * matches its closed form, a Monte Carlo estimate and the VAE special case; latent prediction is zero for a
 * collapsed (constant) encoder, which is why training must guard against collapse.
 */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { test } from "node:test";
import { cosineLoss, gaussianNll, klGaussian, klStandardNormal, latentPrediction, mse, vaeLoss } from "../src/models/losses.ts";
import { gaussian, rng } from "../src/models/rng.ts";

/** Write python/tests/fixtures/<name>.json with UPDATE_FIXTURES=1; otherwise assert it matches the current output. */
function checkFixture(name: string, data: unknown) {
  const path = new URL(`../python/tests/fixtures/${name}.json`, import.meta.url);
  const text = JSON.stringify(data) + "\n";
  if (process.env.UPDATE_FIXTURES) writeFileSync(path, text);
  else assert.equal(readFileSync(path, "utf8"), text, `python/tests/fixtures/${name}.json is stale: run UPDATE_FIXTURES=1 node --test tests/${name}.test.ts`);
}

const close = (a: number, b: number, tol: number) => assert.ok(Math.abs(a - b) <= tol, `${a} vs ${b}`);

test("reconstruction: MSE and the Gaussian NLL", () => {
  assert.equal(mse([1, 2, 3], [1, 2, 3]), 0);
  close(mse([0, 0], [1, 3]), 5, 1e-12);
  // NLL with σ = 1: ½ Σ (x − x̂)² + n · ½ log 2π
  close(gaussianNll([0, 0], [1, 3]), 5 + Math.log(2 * Math.PI), 1e-12);
});

// #region kl
test("KL: zero for equal distributions, positive otherwise, equal to a Monte Carlo estimate", () => {
  const q = { mean: [0.5, -1], std: [0.8, 0.3] };
  const p = { mean: [0, -0.5], std: [1.2, 0.6] };
  assert.equal(klGaussian(q, q), 0);
  assert.ok(klGaussian(q, p) > 0);
  // E_q[log q(z) − log p(z)] by sampling z ~ q (fixed seed)
  const logN = (z: number, m: number, s: number) => -0.5 * Math.log(2 * Math.PI * s * s) - (z - m) ** 2 / (2 * s * s);
  const r = rng(42);
  const N = 200_000;
  let acc = 0;
  for (let n = 0; n < N; n++)
    for (let i = 0; i < 2; i++) {
      const z = q.mean[i] + q.std[i] * gaussian(r);
      acc += (logN(z, q.mean[i], q.std[i]) - logN(z, p.mean[i], p.std[i])) / N;
    }
  close(acc, klGaussian(q, p), 0.01);
});
// #endregion kl

test("the VAE's KL is the general KL with a standard normal prior", () => {
  const q = { mean: [0.3, -2, 1], std: [0.5, 1, 2] };
  close(klStandardNormal(q), klGaussian(q, { mean: [0, 0, 0], std: [1, 1, 1] }), 1e-12);
  close(vaeLoss([1], [1], { mean: [0], std: [1] }), 0.5 * Math.log(2 * Math.PI), 1e-12);
});

// #region collapse
test("latent prediction: a collapsed encoder scores a perfect zero", () => {
  const constant = () => [0.7, 0.7];
  assert.equal(latentPrediction(constant(), constant()), 0); // every input mapped to the same point
  assert.ok(latentPrediction([1, 0], [0, 1]) > 0);
  close(cosineLoss([2, 0], [5, 0]), 0, 1e-12); // scale does not matter
  close(cosineLoss([1, 0], [-1, 0]), 4, 1e-12);
});
// #endregion collapse

test("fixture for the Python port: every loss for given inputs", () => {
  const r = rng(13);
  const vec = (n: number, scale = 1) => Array.from({ length: n }, () => scale * gaussian(r));
  const pos = (n: number) => Array.from({ length: n }, () => 0.2 + 2 * r());
  const cases = [1, 3, 8].map((n) => {
    const x = vec(n);
    const xHat = vec(n);
    const q = { mean: vec(n), std: pos(n) };
    const p = { mean: vec(n), std: pos(n) };
    const sigma = 0.3 + r();
    return {
      x, xHat, q, p, sigma,
      mse: mse(x, xHat),
      gaussianNll: gaussianNll(x, xHat, sigma),
      klGaussian: klGaussian(q, p),
      klStandardNormal: klStandardNormal(q),
      latentPrediction: latentPrediction(x, xHat),
      cosineLoss: cosineLoss(x, xHat),
      vaeLoss: vaeLoss(x, xHat, q, 0.5),
    };
  });
  checkFixture("losses", { cases });
});
