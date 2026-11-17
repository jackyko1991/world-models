/**
 * src/models/splat.ts: Σ = R S Sᵀ Rᵀ is symmetric positive definite; the EWA covariance J W Σ Wᵀ Jᵀ matches the one
 * built from a finite-difference Jacobian of the real projection (and Monte-Carlo samples for a small Gaussian);
 * front-to-back compositing equals the painter's back-to-front order; the bounding-box compositor equals a per-pixel
 * reference; and the renderer reproduces the reference pixels scripts/splat2d.py and scripts/splat3d.py saved.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { gaussian, rng } from "../src/models/rng.ts";
import {
  composite,
  compositeBackToFront,
  compositeFrontToBack,
  covariance3D,
  decodeSplats,
  deform,
  dynamicScene,
  ballHeight,
  gauss2DToProjected,
  orbitCamera,
  perspectiveJacobian,
  projectCovariance,
  projectPoint,
  projectSplat,
  quatToRot,
  renderSplats,
  sortByDepth,
  splatAlpha,
  ALPHA_MIN,
  T_MIN,
  type Projected,
  type Quat,
  type Splat3D,
  type Vec3,
} from "../src/models/splat.ts";

const close = (a: number, b: number, tol: number, what: string) => assert.ok(Math.abs(a - b) <= tol, `${what}: ${a} vs ${b} (tol ${tol})`);
const randQuat = (r: () => number): Quat => [gaussian(r), gaussian(r), gaussian(r), gaussian(r)];

test("R is a rotation and Σ = R S Sᵀ Rᵀ is symmetric positive definite", () => {
  const r = rng(1);
  for (let n = 0; n < 50; n++) {
    const q = randQuat(r);
    const R = quatToRot(q);
    // RᵀR = I, det R = +1
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++) {
        const d = R[i] * R[j] + R[3 + i] * R[3 + j] + R[6 + i] * R[6 + j];
        close(d, i === j ? 1 : 0, 1e-12, "RᵀR");
      }
    const s: Vec3 = [0.01 + r(), 0.01 + r(), 0.01 + r()];
    const S = covariance3D(q, s);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) close(S[3 * i + j], S[3 * j + i], 1e-14, "symmetry");
    // Sylvester: leading principal minors positive
    const m1 = S[0], m2 = S[0] * S[4] - S[1] * S[3];
    const m3 = S[0] * (S[4] * S[8] - S[5] * S[7]) - S[1] * (S[3] * S[8] - S[5] * S[6]) + S[2] * (S[3] * S[7] - S[4] * S[6]);
    assert.ok(m1 > 0 && m2 > 0 && m3 > 0, "positive definite");
    close(m3, (s[0] * s[1] * s[2]) ** 2, 1e-12, "det Σ = (s₁s₂s₃)²");
    close(S[0] + S[4] + S[8], s[0] ** 2 + s[1] ** 2 + s[2] ** 2, 1e-12, "trace Σ = Σ sᵢ²");
  }
});

test("EWA: J W Σ Wᵀ Jᵀ equals the covariance from a finite-difference Jacobian of the projection", () => {
  const r = rng(2);
  for (let n = 0; n < 30; n++) {
    const cam = orbitCamera(6 * r(), 1.2 * r() - 0.2, 2 + 3 * r(), [0, 0.3, 0], 0.8, 160, 120);
    const mean: Vec3 = [gaussian(r) * 0.5, 0.3 + gaussian(r) * 0.3, gaussian(r) * 0.5];
    const Sigma = covariance3D(randQuat(r), [0.05 + 0.2 * r(), 0.05 + 0.2 * r(), 0.05 + 0.2 * r()]);
    // A = ∂(u, v)/∂p by central differences on the real pinhole projection
    const h = 1e-6;
    const A = [0, 1, 2].map((k) => {
      const p1 = [...mean] as Vec3, p0 = [...mean] as Vec3;
      p1[k] += h;
      p0[k] -= h;
      const [u1, v1] = projectPoint(cam, p1), [u0, v0] = projectPoint(cam, p0);
      return [(u1 - u0) / (2 * h), (v1 - v0) / (2 * h)];
    }); // A[k] = column k
    const ref = [0, 0, 0, 0]; // A Σ Aᵀ
    for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) ref[2 * a + b] += A[i][a] * Sigma[3 * i + j] * A[j][b];
    const cov = projectCovariance(cam, mean, Sigma, 0);
    const scale = Math.max(Math.abs(ref[0]), Math.abs(ref[3]));
    close(cov[0], ref[0], 1e-5 * scale, "Σ'xx");
    close(cov[1], ref[1], 1e-5 * scale, "Σ'xy");
    close(cov[2], ref[3], 1e-5 * scale, "Σ'yy");
  }
  // and the analytic J against finite differences of the perspective divide itself
  const t: Vec3 = [0.3, -0.2, 2.5];
  const J = perspectiveJacobian(t, 100, 90);
  const div = (q: Vec3) => [(100 * q[0]) / q[2], (90 * q[1]) / q[2]];
  for (let k = 0; k < 3; k++) {
    const a = [...t] as Vec3, b = [...t] as Vec3;
    a[k] += 1e-6;
    b[k] -= 1e-6;
    const [ua, va] = div(a), [ub, vb] = div(b);
    close(J[k], (ua - ub) / 2e-6, 1e-5, `J row 0 col ${k}`);
    close(J[3 + k], (va - vb) / 2e-6, 1e-5, `J row 1 col ${k}`);
  }
});

test("EWA: for a small Gaussian, projected samples have the predicted covariance", () => {
  const r = rng(3);
  const cam = orbitCamera(0.4, 0.3, 3, [0, 0, 0], 0.9, 200, 200);
  const q = randQuat(r), s: Vec3 = [0.04, 0.02, 0.01];
  const mean: Vec3 = [0.3, 0.1, -0.2];
  const R = quatToRot(q);
  const pred = projectCovariance(cam, mean, covariance3D(q, s), 0);
  const N = 40000;
  const pts: [number, number][] = [];
  for (let n = 0; n < N; n++) {
    const z = [gaussian(r) * s[0], gaussian(r) * s[1], gaussian(r) * s[2]];
    const p: Vec3 = [0, 1, 2].map((i) => mean[i] + R[3 * i] * z[0] + R[3 * i + 1] * z[1] + R[3 * i + 2] * z[2]) as Vec3;
    pts.push(projectPoint(cam, p));
  }
  const mx = pts.reduce((a, p) => a + p[0], 0) / N, my = pts.reduce((a, p) => a + p[1], 0) / N;
  const cxx = pts.reduce((a, p) => a + (p[0] - mx) ** 2, 0) / N;
  const cxy = pts.reduce((a, p) => a + (p[0] - mx) * (p[1] - my), 0) / N;
  const cyy = pts.reduce((a, p) => a + (p[1] - my) ** 2, 0) / N;
  const sc = Math.max(pred[0], pred[2]);
  close(cxx, pred[0], 0.04 * sc, "sample var x");
  close(cxy, pred[1], 0.04 * sc, "sample cov xy");
  close(cyy, pred[2], 0.04 * sc, "sample var y");
});

test("front-to-back compositing equals back-to-front (the painter's algorithm)", () => {
  const r = rng(4);
  for (let n = 0; n < 100; n++) {
    const layers = Array.from({ length: 1 + Math.floor(r() * 12) }, () => ({ rgb: [r(), r(), r()] as Vec3, alpha: r() }));
    const bg: Vec3 = [r(), r(), r()];
    const a = compositeFrontToBack(layers, bg), b = compositeBackToFront(layers, bg);
    for (let k = 0; k < 3; k++) close(a[k], b[k], 1e-12, "channel");
  }
});

test("the bounding-box compositor equals a per-pixel front-to-back loop", () => {
  const r = rng(5);
  const splats: Splat3D[] = Array.from({ length: 60 }, () => ({
    mean: [gaussian(r) * 0.6, gaussian(r) * 0.6, gaussian(r) * 0.6],
    quat: randQuat(r),
    scale: [0.02 + 0.15 * r(), 0.02 + 0.15 * r(), 0.02 + 0.15 * r()],
    opacity: 0.2 + 0.79 * r(),
    sh: Array.from({ length: 12 }, () => gaussian(r)),
  }));
  const cam = orbitCamera(0.5, 0.4, 3, [0, 0, 0], 0.9, 48, 40);
  const bg: Vec3 = [0.9, 0.95, 1];
  const img = renderSplats(splats, cam, bg);
  // reference: every pixel, every splat in depth order, the same thresholds
  const sorted: Projected[] = sortByDepth(splats.map((s, i) => projectSplat(s, cam, i)).filter((p): p is Projected => p !== null));
  let maxErr = 0;
  for (let j = 0; j < 40; j++)
    for (let i = 0; i < 48; i++) {
      let T = 1;
      const c = [0, 0, 0];
      for (const p of sorted) {
        const a = splatAlpha(p, i + 0.5, j + 0.5);
        if (a < ALPHA_MIN) continue;
        if (T * (1 - a) < T_MIN) break;
        for (let k = 0; k < 3; k++) c[k] += p.rgb[k] * a * T;
        T *= 1 - a;
      }
      for (let k = 0; k < 3; k++) maxErr = Math.max(maxErr, Math.abs(c[k] + T * bg[k] - img.rgb[3 * (j * 48 + i) + k]));
    }
  assert.ok(maxErr < 1e-12, `max error ${maxErr}`);
  // a pixel with nothing on it shows the background, and every pixel stays in [0, 1]
  assert.ok(img.rgb.every((v) => v >= -1e-12 && v <= 1 + 1e-12));
});

const model = (name: string) => new URL(`../public/models/${name}`, import.meta.url);

test("2-D splats: the TypeScript renderer reproduces the pixels scripts/splat2d.py saved", { skip: !existsSync(model("splat2d.json")) }, () => {
  const d = JSON.parse(readFileSync(model("splat2d.json"), "utf8"));
  const g: number[][] = d.snapshots[d.reference.snapshot].g;
  const img = composite(g.map(gauss2DToProjected), d.width, d.height, d.background);
  for (const px of d.reference.pixels) for (let k = 0; k < 3; k++) close(img.rgb[3 * (px.j * d.width + px.i) + k], px.rgb[k], 1e-7, `pixel (${px.i}, ${px.j})`);
  // training improved the fit: PSNR rises from the first to the last snapshot, and densification added Gaussians
  const first = d.snapshots[0], last = d.snapshots[d.snapshots.length - 1];
  assert.ok(last.psnr > first.psnr + 15, `psnr ${first.psnr} → ${last.psnr}`);
  assert.ok(last.count > first.count, "densification added Gaussians");
  // and the TS render of the last snapshot is close to the target picture
  let se = 0;
  for (let k = 0; k < img.rgb.length; k++) se += (img.rgb[k] - d.target[k] / 255) ** 2;
  const psnr = -10 * Math.log10(se / img.rgb.length);
  assert.ok(psnr > 30, `TS-rendered PSNR ${psnr}`);
});

test("3-D splats: the TypeScript renderer reproduces the pixels scripts/splat3d.py saved", { skip: !existsSync(model("splat3d.json")) }, () => {
  const meta = JSON.parse(readFileSync(model("splat3d.json"), "utf8"));
  const buf = readFileSync(model("splat3d.bin"));
  const data = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
  const splats = decodeSplats(data);
  assert.equal(splats.length, meta.count);
  assert.ok(splats.length <= 10000 && buf.byteLength <= 2 * 1024 * 1024);
  const ref = meta.reference;
  const cam = orbitCamera(ref.az, ref.el, ref.radius, meta.target, meta.fovy, ref.width, ref.height);
  const img = renderSplats(splats, cam, meta.background, meta.blur);
  for (const px of ref.pixels) for (let k = 0; k < 3; k++) close(img.rgb[3 * (px.j * ref.width + px.i) + k], px.rgb[k], 1e-6, `pixel (${px.i}, ${px.j})`);
  assert.ok(meta.heldOut.psnr > meta.heldOut.psnrInit, "fitting improved the held-out view");
});

test("the moving scene: the box moves rigidly, the ball stays above the floor, and t = 0 and t = 1 agree", () => {
  const scene = dynamicScene(3);
  const a = deform(scene, 0.13), b = deform(scene, 0.71), z0 = deform(scene, 0), z1 = deform(scene, 1);
  const box = scene.part.map((p, i) => (p === "box" ? i : -1)).filter((i) => i >= 0);
  const dist = (s: Splat3D[], i: number, j: number) => Math.hypot(...([0, 1, 2].map((k) => s[i].mean[k] - s[j].mean[k])) as [number, number, number]);
  for (let k = 0; k + 1 < box.length; k += 7) close(dist(a, box[k], box[k + 1]), dist(b, box[k], box[k + 1]), 1e-12, "rigid box");
  for (let t = 0; t <= 1; t += 0.01) assert.ok(ballHeight(t) >= 0.25 - 1e-12, "ball rests on or above the floor");
  z0.forEach((g, i) => g.mean.forEach((v, k) => close(v, z1[i].mean[k], 1e-9, "loop")));
});
