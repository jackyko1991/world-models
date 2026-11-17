/**
 * Persistence (src/models/persistence.ts): rendering the explicit splat scene is the same after any round trip; the
 * frame model with a long enough memory gives the same view back after a short pan; turning far away and back with a
 * short memory changes what is there; and the z-buffer keeps the nearest splat.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { RING, VIEW, differences, makeScene, renderScene, startFrameModel, turn, type Splat } from "../src/models/persistence.ts";

const scene = makeScene();

test("the scene fills most of the ring, and the explicit render is unchanged after a full round trip", () => {
  let filled = 0;
  for (let y = 0; y < RING; y += VIEW) filled += renderScene(scene, y).filter((c) => c).length;
  assert.ok(filled > RING / 2);
  const before = renderScene(scene, 3);
  for (let y = 3; y < 3 + RING; y++) renderScene(scene, y % RING);
  assert.equal(differences(before, renderScene(scene, 3)), 0);
});

test("the frame model starts from the scene's view, and copies what is still in view", () => {
  const first = renderScene(scene, 0);
  let m = startFrameModel(first, 0);
  m = turn(m, 1, 4);
  // view column i now shows what was column i + 1
  for (let i = 0; i < VIEW - 1; i++) assert.deepEqual(m.memory.at(-1)!.view[i], first[i + 1]);
});

test("short pan with enough memory: the view comes back unchanged", () => {
  const first = renderScene(scene, 0);
  const m = turn(turn(startFrameModel(first, 0), 3, 8), -3, 8);
  assert.equal(m.yaw, 0);
  assert.equal(differences(m.memory.at(-1)!.view, first), 0);
});

test("turn away and back with a short memory: the place is re-invented and has changed", () => {
  const first = renderScene(scene, 0);
  let changed = 0;
  for (const seed of [1, 2, 3, 4, 5]) {
    const m = turn(turn({ ...startFrameModel(first, 0), seed }, RING / 2, 4), -RING / 2, 4);
    assert.equal(m.yaw, 0);
    if (differences(m.memory.at(-1)!.view, first) > 0) changed++;
  }
  assert.ok(changed >= 4, `changed in ${changed} of 5 runs`);
});

test("forgetting grows with the time away: longer trips change at least as many runs", () => {
  const first = renderScene(scene, 0);
  const runs = (away: number) =>
    [1, 2, 3, 4, 5, 6, 7, 8].reduce((n, seed) => n + differences(turn(turn({ ...startFrameModel(first, 0), seed }, away, 4), -away, 4).memory.at(-1)!.view, first), 0);
  assert.equal(runs(1), 0);
  assert.ok(runs(12) > runs(1));
});

test("z-buffer: a nearer splat hides a farther one in the same direction", () => {
  const far: Splat = { az: 4, dist: 8, radius: 1, top: 2, colour: 1 };
  const near: Splat = { az: 4, dist: 3, radius: 0.5, top: 1, colour: 2 };
  const v = renderScene([far, near], 0);
  assert.equal(v[3]?.colour, 2);
  assert.equal(renderScene([near, far], 0)[3]?.colour, 2);
});
