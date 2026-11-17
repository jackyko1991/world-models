/**
 * The tiny NeRF: the TS forward pass reproduces what scripts/tiny_nerf.py computed (float64 numpy, from the same
 * rounded weights) for σ and rgb at fixed points and for whole rendered pixels, within 1e-4; the asset stays under
 * 2 MB and 50k parameters; and early ray termination changes a pixel by no more than its threshold.
 */
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { test } from "node:test";
import { field, loadNerf, parameterCount, positionalEncoding, renderPixel, type TinyNerfData } from "../src/models/nerfTiny.ts";
import { orbitCamera } from "../src/models/volumeRender.ts";

const PATH = new URL("../public/models/tiny-nerf.json", import.meta.url);
const data = JSON.parse(readFileSync(PATH, "utf8")) as TinyNerfData;
const m = loadNerf(data);
const camFor = (az: number, el: number) => orbitCamera(data.render.size, data.render.fov, data.render.radius, az, el);

test("the asset is small: ≤ 2 MB and ≤ 50k parameters", () => {
  assert.ok(statSync(PATH).size <= 2 * 1024 * 1024);
  assert.equal(parameterCount(m), data.training.parameters);
  assert.ok(parameterCount(m) <= 50_000);
});

test("positional encoding: p, then sin and cos at frequencies 2^k π", () => {
  const g = positionalEncoding([0.25, -0.5, 1], 2);
  assert.equal(g.length, 3 + 6 * 2);
  assert.deepEqual([...g.slice(0, 3)], [0.25, -0.5, 1]);
  const close = (a: number, b: number) => Math.abs(a - b) < 1e-12;
  assert.ok(close(g[3], Math.sin(Math.PI * 0.25)) && close(g[6], Math.sin(2 * Math.PI * 0.25)));
  assert.ok(close(g[9], Math.cos(Math.PI * 0.25)) && close(g[14], Math.cos(2 * Math.PI * 1)));
});

test("σ and rgb at fixed points match the script's reference within 1e-4", () => {
  data.reference.points.forEach((p, k) => {
    const { sigma, rgb } = field(m, p);
    assert.ok(Math.abs(sigma - data.reference.sigma[k]) < 1e-4 * Math.max(1, data.reference.sigma[k]), `σ at ${p}: ${sigma} vs ${data.reference.sigma[k]}`);
    rgb.forEach((c, i) => assert.ok(Math.abs(c - data.reference.rgb[k][i]) < 1e-4, `rgb at ${p}`));
  });
  // the reference points include one inside the red sphere (dense, red) and one off the scene (empty)
  assert.ok(data.reference.sigma[0] > 5 && data.reference.rgb[0][0] > 0.5 && data.reference.rgb[0][2] < 0.4);
});

test("rendered pixels match the script's reference within 1e-4", () => {
  for (const px of data.reference.pixels) {
    const c = renderPixel(m, camFor(px.azimuth, px.elevation), px.i, px.j);
    c.forEach((x, k) => assert.ok(Math.abs(x - px.rgb[k]) < 1e-4, `pixel (${px.i}, ${px.j}) at azimuth ${px.azimuth}: ${c} vs ${px.rgb}`));
  }
});

test("early ray termination changes a pixel by at most its threshold", () => {
  const cam = camFor(0.9, 0.4);
  for (let j = 4; j < data.render.size; j += 9)
    for (let i = 2; i < data.render.size; i += 7) {
      const full = renderPixel(m, cam, i, j);
      const fast = renderPixel(m, cam, i, j, 1e-3);
      full.forEach((x, k) => assert.ok(Math.abs(x - fast[k]) <= 1e-3 + 1e-12));
    }
});
