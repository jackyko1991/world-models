/**
 * The gridworld: the true step obeys its rules (walls, ice, key and door, reward), the learned model agrees with it
 * on plain floor and differs exactly where the page says it does (ice and the door), and frames differ only there.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { ACTIONS, DELTA, MAP, diffCells, learnedStep, observe, rollout, start, trueStep, type Action, type State } from "../src/models/gridworld.ts";

const at = (row: number, col: number, hasKey = false, doorOpen = false): State => ({ row, col, hasKey, doorOpen });

test("walls block a move, floor allows it", () => {
  assert.deepEqual(trueStep(start(), "up").next, start()); // a wall above the start
  assert.deepEqual(trueStep(start(), "right").next, at(1, 2));
});

test("ice slides the agent on; the learned model stops on the first ice cell", () => {
  assert.deepEqual(trueStep(at(1, 3), "right").next, at(1, 6));
  assert.deepEqual(learnedStep(at(1, 3), "right").next, at(1, 4));
  assert.deepEqual(trueStep(at(1, 6), "left").next, at(1, 3));
  // sliding into a wall stops on the ice, where both agree
  assert.deepEqual(trueStep(at(2, 4), "up").next, at(1, 4));
  assert.deepEqual(learnedStep(at(2, 4), "up").next, at(1, 4));
});

// #region door
test("the door opens only with the key; the learned model never lets you through", () => {
  assert.deepEqual(trueStep(at(2, 6), "down").next, at(2, 6)); // locked
  const withKey = at(2, 6, true);
  assert.deepEqual(trueStep(withKey, "down").next, at(3, 6, true, true));
  assert.deepEqual(learnedStep(withKey, "down").next, withKey);
  // the predicted frame differs from the true one in exactly two cells: where the agent is and where it is not
  const diff = diffCells(observe(trueStep(withKey, "down").next), observe(learnedStep(withKey, "down").next));
  assert.deepEqual(diff, [[2, 6], [3, 6]]);
});
// #endregion door

test("picking up the key, then a full path to the goal with reward 1 at the end", () => {
  const path: Action[] = ["down", "down"];
  const s = rollout((s, a) => trueStep(s, a), start(), path);
  assert.equal(s[2].hasKey, true);
  assert.equal(observe(s[2])[3][1], "A");
  const toGoal: Action[] = ["up", "up", "right", "right", "right", "right", "down", "down", "down", "down"];
  const states = rollout(trueStep, s[2], toGoal);
  const last = states[states.length - 1];
  // right from (1,3) slides over the ice to (1,6), so one "right" is spare and bumps the wall
  assert.deepEqual(last, at(5, 6, true, true));
  assert.equal(trueStep(states[states.length - 2], "down").reward, 1);
  assert.equal(trueStep(start(), "right").reward, 0);
});

test("the learned model is exactly right except when the move enters ice or the door", () => {
  let agree = 0;
  for (let row = 1; row < 6; row++)
    for (let col = 1; col < 7; col++)
      for (const hasKey of [false, true]) {
        const s = at(row, col, hasKey);
        if (["#", "D"].includes(observe(at(0, 0))[row][col])) continue;
        for (const a of ACTIONS) {
          const [dr, dc] = DELTA[a];
          const entering = MAP[row + dr][col + dc];
          const same = JSON.stringify(trueStep(s, a)) === JSON.stringify(learnedStep(s, a));
          if (same) agree++;
          else assert.ok(entering === "ice" || entering === "door", `${row},${col} ${a} enters ${entering}`);
        }
      }
  assert.ok(agree > 150, `agreed on ${agree} transitions`);
});
