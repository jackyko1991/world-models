/**
 * Latent actions (src/models/latentActions.ts): on clean, unlabelled frame pairs the k-means codes recover the five
 * true keys up to a renaming (the confusion matrix is a permutation matrix), the result is reproducible, and when the
 * player may walk into walls a blocked move lands in the same code as "stay" (the frames cannot tell them apart).
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { applyCode, confusion, feature, framePairs, learnLatentActions, purity } from "../src/models/latentActions.ts";
import { ACTIONS } from "../src/models/tinyGame.ts";

test("on clean data the 5 codes recover the 5 keys up to permutation", () => {
  const pairs = framePairs(500);
  const { codes, centroids } = learnLatentActions(pairs, 5);
  const m = confusion(pairs, codes, 5);
  assert.equal(purity(m), 1);
  // each code holds one key and each key one code: a permutation
  const keyOf = m.map((row) => row.findIndex((c) => c > 0));
  assert.ok(m.every((row) => row.filter((c) => c > 0).length === 1));
  assert.deepEqual([...keyOf].sort(), [0, 1, 2, 3, 4]);
  // and the code vectors are the unit moves
  const DX = [0, -1, 1, 0, 0];
  const DY = [0, 0, 0, -1, 1];
  keyOf.forEach((a, j) => {
    assert.ok(Math.abs(centroids[j][0] - DX[a]) < 1e-9 && Math.abs(centroids[j][1] - DY[a]) < 1e-9);
  });
});

test("reproducible: same seed, same codes", () => {
  const pairs = framePairs(300);
  assert.deepEqual(learnLatentActions(pairs, 5, 9).codes, learnLatentActions(pairs, 5, 9).codes);
});

test("too few codes merge keys; spare codes stay unused", () => {
  const pairs = framePairs(500);
  assert.ok(purity(confusion(pairs, learnLatentActions(pairs, 3).codes, 3)) < 1);
  const eight = confusion(pairs, learnLatentActions(pairs, 8).codes, 8);
  assert.equal(purity(eight), 1);
  assert.equal(eight.filter((row) => row.some((c) => c > 0)).length, 5);
});

test("with walls, a blocked move is indistinguishable from 'stay'", () => {
  const pairs = framePairs(800, 3, false);
  const blockedPairs = pairs.filter((p) => p.hidden !== 0 && feature(p).every((v) => v === 0));
  assert.ok(blockedPairs.length > 0);
  const { codes } = learnLatentActions(pairs, 5);
  const stayCode = codes[pairs.findIndex((p) => p.hidden === 0)];
  pairs.forEach((p, i) => {
    if (blockedPairs.includes(p)) assert.equal(codes[i], stayCode);
  });
});

test("playing a code moves the player by its vector", () => {
  const p = framePairs(1)[0];
  const moved = applyCode(p.before, [1, 0]);
  assert.equal(moved.filter((c) => c === 1).length, 1);
  assert.equal(ACTIONS.length, 5);
});
