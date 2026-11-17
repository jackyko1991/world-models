/**
 * Volume rendering: the quadrature's weights sum to 1 − T_final, a uniform slab matches the analytic transmittance
 * e^{−σL}, the pixel converges as samples are added, camera rays point where they should, and hierarchical samples
 * gather where the weights are. With UPDATE_FIXTURES=1 it writes python/tests/fixtures/volume_render.json (inputs and
 * outputs for the Python model to match); otherwise it checks that file is current.
 */
import assert from "node:assert/strict";
import { assertClose } from "./fixtures.ts";
import { readFileSync, writeFileSync } from "node:fs";
import { test } from "node:test";
import { rng } from "../src/models/rng.ts";
import { blobField, cameraRay, deltas, marchField, orbitCamera, over, rayBox, renderRay, sampleAlong, samplePdf, type Blob } from "../src/models/volumeRender.ts";

const BLOBS: Blob[] = [
  { centre: [0.2, 0.1], radius: 0.15, peak: 8, colour: [0.9, 0.2, 0.1] },
  { centre: [0.55, -0.05], radius: 0.1, peak: 20, colour: [0.1, 0.4, 0.9] },
];
const field = blobField(BLOBS);

test("weights sum to 1 − T_final, for any densities and sample positions", () => {
  const r = rng(1);
  for (let trial = 0; trial < 50; trial++) {
    const n = 1 + Math.floor(r() * 40);
    const ts = sampleAlong(0, 2, n, r);
    const sigmas = ts.map(() => r() * 10);
    const colours = ts.map(() => [r(), r(), r()]);
    const res = renderRay(sigmas, colours, ts, 2);
    const sum = res.weights.reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(sum - (1 - res.tFinal)) < 1e-12, `trial ${trial}: ${sum} vs ${1 - res.tFinal}`);
    // T_final is the transmittance e^{−Σ σ_i δ_i}
    const optical = sigmas.reduce((a, s, i) => a + s * ((i + 1 < n ? ts[i + 1] : 2) - ts[i]), 0);
    assert.ok(Math.abs(res.tFinal - Math.exp(-optical)) < 1e-12);
    // every weight is non-negative, and a white field composited over black gives exactly 1 − T_final
    assert.ok(res.weights.every((w) => w >= 0));
    const white = renderRay(sigmas, ts.map(() => [1, 1, 1]), ts, 2);
    assert.ok(Math.abs(white.colour[0] - (1 - white.tFinal)) < 1e-12);
    assert.ok(Math.abs(over(white, [1, 1, 1])[1] - 1) < 1e-12);
  }
});

test("a uniform slab matches the analytic transmittance e^{−σL}", () => {
  const sigma = 3;
  const [a, b] = [0.3, 0.7]; // the slab inside a ray from 0 to 1
  const slab = (p: number[]) => ({ sigma: p[0] >= a && p[0] < b ? sigma : 0, colour: [0.2, 0.6, 1] });
  const exact = Math.exp(-sigma * (b - a));
  // samples on bins that line up with the slab: exact up to rounding
  const aligned = marchField(slab, [0, 0], [1, 0], 0, 1, 10);
  assert.ok(Math.abs(aligned.tFinal - exact) < 1e-12, `${aligned.tFinal} vs ${exact}`);
  // and the colour is (1 − e^{−σL}) times the slab's colour
  assert.ok(Math.abs(aligned.colour[2] - (1 - exact)) < 1e-12);
  // with bins that do not line up, the error shrinks as samples are added
  const errs = [7, 31, 127, 511].map((n) => Math.abs(marchField(slab, [0, 0], [1, 0], 0, 1, n).tFinal - exact));
  for (let i = 1; i < errs.length; i++) assert.ok(errs[i] < errs[i - 1], `errors ${errs}`);
  assert.ok(errs[3] < 5e-3);
});

test("more samples converge to the same pixel", () => {
  const o = [-1, 0.02];
  const d = [1, 0];
  const ref = over(marchField(field, o, d, 0, 2.5, 20000), [1, 1, 1]);
  const err = (n: number) => {
    const c = over(marchField(field, o, d, 0, 2.5, n), [1, 1, 1]);
    return Math.hypot(...c.map((x, k) => x - ref[k]));
  };
  const errs = [8, 32, 128, 512].map(err);
  for (let i = 1; i < errs.length; i++) assert.ok(errs[i] < errs[i - 1], `errors ${errs}`);
  assert.ok(errs[3] < 1e-3, `errors ${errs}`);
  // the ray passes through both blobs, so it is far from the background
  assert.ok(Math.hypot(...ref.map((x) => x - 1)) > 0.3);
});

test("stratified samples stay in their bins and average to the midpoints", () => {
  const r = rng(7);
  const n = 16;
  const mean = new Array(n).fill(0);
  const runs = 2000;
  for (let s = 0; s < runs; s++) {
    const ts = sampleAlong(1, 3, n, r);
    ts.forEach((t, i) => {
      assert.ok(t >= 1 + (i * 2) / n && t <= 1 + ((i + 1) * 2) / n);
      mean[i] += t / runs;
    });
  }
  const mid = sampleAlong(1, 3, n);
  mean.forEach((m, i) => assert.ok(Math.abs(m - mid[i]) < 0.01));
});

test("camera rays: the centre ray looks at the origin, corners spread by the field of view", () => {
  const cam = orbitCamera(64, 40, 3, 0.7, 0.4);
  const { o, d } = cameraRay(cam, 31.5, 31.5); // i + 0.5 = 32 = the image centre
  const toOrigin = o.map((x) => -x / 3);
  assert.ok(Math.hypot(...d.map((x, k) => x - toOrigin[k])) < 1e-12);
  // the left edge of the image is half the field of view away from the centre
  const edge = cameraRay(cam, -0.5, 31.5).d;
  const angle = (Math.acos(edge.reduce((a, x, k) => a + x * d[k], 0)) * 180) / Math.PI;
  assert.ok(Math.abs(angle - 20) < 1e-9, `${angle}`);
  // a ray from outside hits the box around the origin, entering before it leaves
  const hit = rayBox(o, d, 1)!;
  assert.ok(hit && hit[1] > hit[0]);
  for (const t of hit) assert.ok(Math.abs(Math.max(...o.map((x, k) => Math.abs(x + t * d[k]))) - 1) < 1e-9);
  // and a ray pointing away misses it
  assert.equal(rayBox(o, d.map((x) => -x), 1), null);
});

test("hierarchical sampling puts the fine samples where the weights are", () => {
  const o = [-1, 0.0];
  const d = [1, 0];
  const coarse = marchField(field, o, d, 0, 2.5, 32);
  const fine = samplePdf(coarse.ts, coarse.weights, 0, 2.5, 64);
  // fraction of samples within the blobs (x in [−0.3, 0.75] → t in [0.7, 1.75])
  const inside = (ts: number[]) => ts.filter((t) => t > 0.7 && t < 1.75).length / ts.length;
  assert.ok(inside(fine) > 0.95, `fine ${inside(fine)}`);
  assert.ok(inside(coarse.ts) < 0.45);
  assert.ok(fine.every((t, i) => t >= 0 && t <= 2.5 && (i === 0 || t >= fine[i - 1])));
});

/** Write (UPDATE_FIXTURES=1) or check python/tests/fixtures/<name>.json, which the Python tests match. */
function fixture(name: string, value: unknown) {
  const path = new URL(`../python/tests/fixtures/${name}.json`, import.meta.url);
  const text = JSON.stringify(value) + "\n";
  if (process.env.UPDATE_FIXTURES) writeFileSync(path, text);
  else assertClose(JSON.parse(readFileSync(path, "utf8")), JSON.parse(text), `${name}.json is stale: run UPDATE_FIXTURES=1 node --test`);
}

/** An Rng that returns the given numbers in turn, so Python can be handed the same "random" draws. */
const given = (us: number[]) => {
  let k = 0;
  return () => us[k++];
};

test("fixture for the Python model (python/tests/fixtures/volume_render.json)", () => {
  const r = rng(11);
  const orbit = { size: 64, fov: 40, radius: 3, azimuth: 0.7, elevation: 0.4 };
  const cam = orbitCamera(orbit.size, orbit.fov, orbit.radius, orbit.azimuth, orbit.elevation);
  const pixels = [[0, 0], [31.5, 31.5], [10, 50], [63, 7], [-0.5, 31.5]];
  const rays = pixels.map(([i, j]) => ({ i, j, ...cameraRay(cam, i, j) }));
  const boxes = [
    { o: cam.origin, d: rays[1].d, b: 1 },
    { o: cam.origin, d: rays[0].d, b: 1.2 },
    { o: cam.origin, d: rays[1].d.map((x) => -x), b: 1 },
    { o: [0.1, -0.2, 0.3], d: [0.6, 0.0, 0.8], b: 1 },
  ].map((c) => ({ ...c, span: rayBox(c.o, c.d, c.b) }));
  const u = Array.from({ length: 8 }, () => r());
  const sampling = { near: 1, far: 3, n: 8, u, midpoints: sampleAlong(1, 3, 8), stratified: sampleAlong(1, 3, 8, given(u)) };
  const rays1d = [3, 12, 40].map((n) => {
    const ts = sampleAlong(0, 2, n, r);
    const sigmas = ts.map(() => r() * 10);
    const colours = ts.map(() => [r(), r(), r()]);
    return { ts, sigmas, colours, far: 2, deltas: deltas(ts, 2), result: renderRay(sigmas, colours, ts, 2) };
  });
  const march = marchField(field, [-1, 0.02], [1, 0], 0, 2.5, 32);
  const pdfU = Array.from({ length: 16 }, () => r());
  const pdf = {
    ts: march.ts,
    weights: march.weights,
    near: 0,
    far: 2.5,
    n: 16,
    u: pdfU,
    even: samplePdf(march.ts, march.weights, 0, 2.5, 16),
    drawn: samplePdf(march.ts, march.weights, 0, 2.5, 16, given(pdfU)),
  };
  fixture("volume_render", {
    orbit,
    camera: cam,
    rays,
    boxes,
    sampling,
    renderRay: rays1d,
    blobs: BLOBS,
    march: { o: [-1, 0.02], d: [1, 0], near: 0, far: 2.5, n: 32, ts: march.ts, weights: march.weights, colour: march.colour, tFinal: march.tFinal, over: over(march, [1, 1, 1]) },
    pdf,
  });
});
