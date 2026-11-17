/** UCT MCTS on tic-tac-toe: takes a forced win, blocks a forced loss, and its tree statistics add up. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { test } from "node:test";
import { backup, bestMove, legal, newNode, iterate, play, select, toMove, uct, unroll, winner, type Board, type MctsNode } from "../src/models/mcts.ts";
import { randInt, rng } from "../src/models/rng.ts";

/** Write python/tests/fixtures/<name>.json with UPDATE_FIXTURES=1; otherwise assert it matches the current output. */
function checkFixture(name: string, data: unknown) {
  const path = new URL(`../python/tests/fixtures/${name}.json`, import.meta.url);
  const text = JSON.stringify(data) + "\n";
  if (process.env.UPDATE_FIXTURES) writeFileSync(path, text);
  else assert.equal(readFileSync(path, "utf8"), text, `python/tests/fixtures/${name}.json is stale: run UPDATE_FIXTURES=1 node --test tests/${name}.test.ts`);
}

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

test("fixture for the Python port: rules on many boards, UCT scores, selection and a backup on a given tree", () => {
  // boards from random games, every position along the way
  const r = rng(31);
  const boards: Board[] = [];
  for (let g = 0; g < 12; g++) {
    let b: Board = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    boards.push(b);
    for (let moves = legal(b); moves.length > 0; moves = legal(b)) boards.push((b = play(b, moves[randInt(r, moves.length)])));
  }
  const rules = boards.map((b) => ({ board: b, winner: winner(b), toMove: toMove(b), legal: legal(b), play: legal(b).map((i) => play(b, i)) }));
  // a two-level tree with given statistics: root, its children, and the children of the first child
  const root = newNode([X, _, O, X, _, _, _, _, O]);
  const stats: [number, number][] = [[7, 3], [3, 2], [12, 5], [2, -1], [5, 1]];
  for (const [k, move] of [...root.untried].entries()) {
    const child = newNode(play(root.board, move), move, root);
    [child.n, child.w] = stats[k];
    root.children.push(child);
  }
  root.untried = [];
  root.n = 1 + stats.reduce((s, [n]) => s + n, 0);
  const first = root.children[0];
  for (const [k, move] of [...first.untried].entries()) {
    const child = newNode(play(first.board, move), move, first);
    [child.n, child.w] = [1 + k, k % 2 ? -1 : 1];
    first.children.push(child);
  }
  first.untried = [];
  const tree = {
    board: root.board,
    n: root.n,
    children: root.children.map((c) => ({ move: c.move, n: c.n, w: c.w, children: c.children.map((g) => ({ move: g.move, n: g.n, w: g.w })) })),
  };
  const ucts = [Math.SQRT2, 0.5].map((c) => ({ c, scores: root.children.map((ch) => uct(ch, c)), selected: select(root, c).map((nd) => nd.move) }));
  const path = select(root);
  backup(path, -1);
  checkFixture("mcts", {
    rules,
    tree,
    ucts,
    backup: { path: path.map((nd) => nd.move), result: -1, after: path.map((nd) => ({ n: nd.n, w: nd.w })) },
  });
});
