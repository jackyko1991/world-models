/**
 * The JEPA toy: with only the prediction loss the embeddings collapse (their variance goes to ~0); with VICReg's
 * variance and covariance terms they stay spread; and the hand-written gradient matches a finite difference.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { embed, initState, makeData, spread, stats, train, trainStep, type ToyState } from "../src/models/jepaToy.ts";

const data = makeData();
const start = initState();
const STEPS = 300;

test("without the anti-collapse term the cloud shrinks to a point", () => {
  const { state, history } = train(start, data, { antiCollapse: false }, STEPS);
  assert.ok(spread(start, data) > 0.5, "starts spread out");
  assert.ok(history[STEPS - 1] < 1e-4, `final variance ${history[STEPS - 1]}`);
  // and the prediction loss is (almost) perfect: collapse is the trivial solution
  assert.ok(trainStep(state, data, { antiCollapse: false }).prediction < 1e-4);
  // the spread falls (nearly) monotonically
  assert.ok(history[50] < history[0] && history[150] < history[50] && history[299] < history[150]);
});

test("with the VICReg terms every dimension keeps a standard deviation near γ = 1", () => {
  const { state, history } = train(start, data, { antiCollapse: true }, STEPS);
  assert.ok(Math.min(...history.slice(50)) > 1.5, `min variance ${Math.min(...history.slice(50))}`);
  const { variance, cov } = stats(embed(state, data).z);
  for (const v of variance) assert.ok(Math.sqrt(v) > 0.8, `std ${Math.sqrt(v)}`);
  assert.ok(Math.abs(cov) < 0.2, `covariance ${cov}`);
});

test("switching the term on after a collapse spreads the cloud again", () => {
  const collapsed = train(start, data, { antiCollapse: false }, 150).state;
  const healed = train(collapsed, data, { antiCollapse: true }, 300).state;
  assert.ok(spread(collapsed, data) < 1e-2 && spread(healed, data) > 1.5);
});

test("the analytic gradient matches central differences", () => {
  const h = 1e-6;
  const nudge = (s: ToyState, k: number, j: number, e: number): ToyState => ({ ...s, W: s.W.map((r, a) => r.map((w, b) => (a === k && b === j ? w + e : w))) });
  for (const antiCollapse of [false, true]) {
    const lr = 1e-6;
    const after = trainStep(start, data, { antiCollapse, lr }).state;
    const loss = (s: ToyState) => {
      const r = trainStep(s, data, { antiCollapse });
      return r.prediction + r.regulariser;
    };
    for (const [k, j] of [[0, 0], [1, 3], [0, 2]]) {
      const analytic = (start.W[k][j] - after.W[k][j]) / lr;
      const numeric = (loss(nudge(start, k, j, h)) - loss(nudge(start, k, j, -h))) / (2 * h);
      assert.ok(Math.abs(analytic - numeric) < 1e-5 * Math.max(1, Math.abs(numeric)), `${antiCollapse} W[${k}][${j}]: ${analytic} vs ${numeric}`);
    }
  }
});

test("training is deterministic", () => {
  assert.deepEqual(train(start, makeData(), { antiCollapse: true }, 20).state, train(initState(), data, { antiCollapse: true }, 20).state);
});
