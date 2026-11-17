/**
 * The spectral-bias snapshots (public/models/fourier-fit.json, from scripts/fourier_fit.py): the stored target is the
 * signal, the TS positional encoding matches the script's, the plain network learns the low frequency long before
 * the high one and never fits the high one well, and Fourier features fit all three.
 */
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { test } from "node:test";
import { amplitudeAt, mse, recovered, signal, type FourierFitData } from "../src/models/fourierFit.ts";
import { positionalEncoding } from "../src/models/nerfTiny.ts";

const PATH = new URL("../public/models/fourier-fit.json", import.meta.url);
const data = JSON.parse(readFileSync(PATH, "utf8")) as FourierFitData;
const last = data.steps.length - 1;

test("the asset is small and complete", () => {
  assert.ok(statSync(PATH).size <= 2 * 1024 * 1024);
  for (const run of [data.runs.plain, data.runs.fourier]) {
    assert.equal(run.predictions.length, data.steps.length);
    run.predictions.forEach((p) => assert.equal(p.length, data.grid));
  }
  assert.equal(data.steps[0], 0);
  assert.equal(data.steps[last], data.train.steps);
});

test("the stored target is the signal, and amplitudeAt reads each component back", () => {
  data.target.forEach((y, n) => assert.ok(Math.abs(y - signal(data, n / data.grid)) < 1e-4));
  for (const c of data.components) assert.ok(Math.abs(amplitudeAt(data.target, c.cycles) - c.amplitude) < 1e-3);
  assert.ok(amplitudeAt(data.target, 7) < 1e-3);
});

test("the TS positional encoding matches the script's", () => {
  const { x, frequencies, gamma } = data.encodingProbe;
  x.forEach((xi, k) => {
    const g = positionalEncoding([xi], frequencies);
    assert.equal(g.length, gamma[k].length);
    g.forEach((v, i) => assert.ok(Math.abs(v - gamma[k][i]) < 1e-6));
  });
});

test("spectral bias: the plain MLP learns low frequencies first and misses the highest", () => {
  const plain = data.runs.plain.predictions.map((p) => recovered(data, p));
  // the step at which each component is first 80% recovered (Infinity if never)
  const firstAt = (c: number) => {
    const s = plain.findIndex((r) => r[c] >= 0.8);
    return s < 0 ? Infinity : data.steps[s];
  };
  assert.ok(firstAt(0) < firstAt(1), `1 cycle at ${firstAt(0)}, 4 cycles at ${firstAt(1)}`);
  assert.ok(firstAt(1) < firstAt(2), `4 cycles at ${firstAt(1)}, 12 cycles at ${firstAt(2)}`);
  assert.ok(plain[last][2] < 0.5, `plain recovers ${plain[last][2]} of the 12-cycle component`);
});

test("Fourier features fit every frequency, far better than the plain MLP", () => {
  const fourier = recovered(data, data.runs.fourier.predictions[last]);
  fourier.forEach((r) => assert.ok(r > 0.98, `${fourier}`));
  const ePlain = mse(data.runs.plain.predictions[last], data.target);
  const eFourier = mse(data.runs.fourier.predictions[last], data.target);
  assert.ok(eFourier < ePlain / 100, `${eFourier} vs ${ePlain}`);
});
