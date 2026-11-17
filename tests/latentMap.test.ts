/**
 * The latent map's decoder in TS reproduces the reference decodes saved by scripts/latent_map.py, decodes the
 * encoded frames back to (nearly) the true frames, and interpolating in latent space moves the ball while
 * interpolating pixels cross-fades two half-bright balls.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { decode, lerpLatent, lerpPixels, nearest, peak, renderFrame, type LatentMapData } from "../src/models/latentMap.ts";

const data: LatentMapData = JSON.parse(readFileSync(new URL("../public/models/latent-map.json", import.meta.url), "utf8"));
const { size, radius, layers, points } = data;

test("the TS decoder reproduces the script's reference outputs within 1e-4", () => {
  assert.ok(data.references.length >= 3);
  for (const ref of data.references) {
    const out = decode(layers, ref.z);
    assert.equal(out.length, size * size);
    const err = Math.max(...out.map((v, i) => Math.abs(v - ref.out[i])));
    assert.ok(err < 1e-4, `z=${ref.z}: max error ${err}`);
  }
});

test("decoding an encoded frame gives back the true frame", () => {
  let total = 0;
  for (const p of points) {
    const truth = renderFrame(size, radius, p.x, p.y);
    const out = decode(layers, p.z);
    total += out.reduce((s, v, i) => s + Math.abs(v - truth[i]), 0) / out.length;
  }
  const mean = total / points.length;
  assert.ok(mean < 0.02, `mean pixel error ${mean}`);
  assert.ok(Math.abs(mean - data.reconstructionError) < 1e-3, "matches the script's own figure");
});

test("the map is organised by the generating factors", () => {
  // nearby latents come from nearby balls: the nearest exported neighbour of a point is close in (x, y)
  let far = 0;
  points.forEach((p, i) => {
    const others = points.filter((_, j) => j !== i);
    const q = others[nearest(others, p.z)];
    if (Math.hypot(p.x - q.x, p.y - q.y) > 2) far++;
  });
  assert.ok(far / points.length < 0.05, `${far} of ${points.length} neighbours are far apart`);
});

test("latent interpolation keeps one bright ball; pixel interpolation fades two", () => {
  const [a, b] = [points.reduce((m, p) => (p.x + p.y < m.x + m.y ? p : m)), points.reduce((m, p) => (p.x + p.y > m.x + m.y ? p : m))];
  const fa = renderFrame(size, radius, a.x, a.y);
  const fb = renderFrame(size, radius, b.x, b.y);
  assert.ok(peak(lerpPixels(fa, fb, 0.5)) < 0.6, "the halfway cross-fade is two half-bright balls");
  for (const t of [0.25, 0.5, 0.75]) assert.ok(peak(lerpLatent(layers, a.z, b.z, t)) > 0.85, `latent t=${t} keeps a full ball`);
});

test("the asset stays small", () => {
  const bytes = readFileSync(new URL("../public/models/latent-map.json", import.meta.url)).length;
  assert.ok(bytes < 2 * 1024 * 1024);
});
