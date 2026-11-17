/** UCT MCTS on tic-tac-toe: takes a forced win, blocks a forced loss, and its tree statistics add up. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { bestMove, legal, newNode, iterate, toMove, unroll, winner, type MctsNode } from "../src/models/mcts.ts";
import { rng } from "../src/models/rng.ts";

const _ = 0;
const X = 1;
const O = -1;

test("rules: winner, turn and legal moves", () => {
  assert.equal(winner([X, X, X, O, O, _, _, _, _]), X);
  assert.equal(winner([X, O, X, X, O, O, O, X, X]), 0);
  assert.equal(toMove([X, _, _, _, _, _, _, _, _]), O);
  assert.deepEqual(legal([X, X, X, O, O, _, _, _, _]), []);
});

test("MCTS takes the immediate win rather than blocking", () => {
  // X threatens 6 (column 0), O threatens 5 (column 2); X to move wins at 6
  const b = [X, _, O, X, _, _, _, _, O];
  for (const seed of [1, 2, 3]) assert.equal(bestMove(b, 2000, rng(seed)).move, 6);
});

test("MCTS blocks a forced loss", () => {
  // O threatens 2 (diagonal 2-4-6); X has no win, so X must block at 2
  const b = [_, X, _, _, O, _, O, _, X];
  for (const seed of [1, 2, 3]) assert.equal(bestMove(b, 3000, rng(seed)).move, 2);
});

test("visit counts add up: the root's are its children's; any other node's are its children's plus its own first visit", () => {
  const root = newNode([_, _, _, _, X, _, _, _, _]);
  const r = rng(4);
  for (let i = 0; i < 500; i++) iterate(root, r);
  const check = (n: MctsNode) => {
    if (n.children.length) assert.equal(n.n, (n.parent ? 1 : 0) + n.children.reduce((s, c) => s + c.n, 0));
    n.children.forEach(check);
  };
  assert.equal(root.n, 500);
  check(root);
});

test("MuZero unroll: one prediction per hidden state, rewards from g", () => {
  // a toy learned model whose hidden state is a counter: reward = action, value = state
  const out = unroll<number, number>(
    { h: (o) => o.reduce((a, b) => a + b, 0), g: (s, a) => ({ reward: a, next: s + a }), f: (s) => ({ policy: [0.5, 0.5], value: s }) },
    [1, 2],
    [1, 0, 1],
  );
  assert.deepEqual(out.map((p) => p.value), [3, 4, 4, 5]);
  assert.deepEqual(out.map((p) => p.reward), [0, 1, 0, 1]);
});
