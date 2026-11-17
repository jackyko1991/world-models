/**
 * Monte Carlo tree search with UCT (Kocsis & Szepesvári 2006) on tic-tac-toe (Concepts ▸ Planning and imagination ▸
 * muzero). Each iteration has four phases, exported separately so the demo can show them one at a time:
 * selection (walk down by the UCT score), expansion (add one untried move), simulation (play random moves to the
 * end) and backup (add the result to every node on the path).
 *
 * Here the search uses the true rules (`play`, `winner`). MuZero searches the same way but inside a *learned* model,
 * sketched by `MuZeroModel` at the end: no board is ever reconstructed.
 * Randomness only from rng.ts.
 */
import { randInt, type Rng } from "./rng.ts";

/** A board: 9 cells, row by row, 1 = X, -1 = O, 0 = empty. */
export type Board = readonly number[];

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
] as const;

/** 1 or -1 for a win, 0 for a draw, null while the game goes on. */
export function winner(b: Board): number | null {
  for (const [i, j, k] of LINES) if (b[i] !== 0 && b[i] === b[j] && b[j] === b[k]) return b[i];
  return b.includes(0) ? null : 0;
}

/** Whose turn it is: X (1) moves first. */
export const toMove = (b: Board) => (b.filter((v) => v === 1).length > b.filter((v) => v === -1).length ? -1 : 1);

export const legal = (b: Board) => (winner(b) === null ? b.flatMap((v, i) => (v === 0 ? [i] : [])) : []);

export const play = (b: Board, i: number): Board => b.map((v, j) => (j === i ? toMove(b) : v));

export interface MctsNode {
  board: Board;
  /** the move that led here (-1 at the root) */
  move: number;
  parent: MctsNode | null;
  children: MctsNode[];
  untried: number[];
  /** visits */
  n: number;
  /** total result, from the point of view of the player who made `move` */
  w: number;
}

export function newNode(board: Board, move = -1, parent: MctsNode | null = null): MctsNode {
  return { board, move, parent, children: [], untried: legal(board), n: 0, w: 0 };
}

/** The UCT score of a child: its mean result plus an exploration bonus that shrinks as it is visited. */
export const uct = (child: MctsNode, c: number) => child.w / child.n + c * Math.sqrt(Math.log(child.parent!.n) / child.n);

/** 1. Selection: from the root, follow the best UCT child while every move of the node has been tried. */
export function select(root: MctsNode, c = Math.SQRT2): MctsNode[] {
  const path = [root];
  let node = root;
  while (node.untried.length === 0 && node.children.length > 0) {
    node = node.children.reduce((a, b) => (uct(b, c) > uct(a, c) ? b : a));
    path.push(node);
  }
  return path;
}

/** 2. Expansion: add one untried move of the leaf as a new child (none at the end of a game). */
export function expand(leaf: MctsNode, r: Rng): MctsNode {
  if (leaf.untried.length === 0) return leaf;
  const move = leaf.untried.splice(randInt(r, leaf.untried.length), 1)[0];
  const child = newNode(play(leaf.board, move), move, leaf);
  leaf.children.push(child);
  return child;
}

/** 3. Simulation: random moves to the end of the game; returns the final board (its winner is the result). */
export function simulate(board: Board, r: Rng): Board {
  let b = board;
  for (let moves = legal(b); moves.length > 0; moves = legal(b)) b = play(b, moves[randInt(r, moves.length)]);
  return b;
}

/** 4. Backup: every node on the path gets a visit and the result, seen from the player who moved into it. */
export function backup(path: MctsNode[], result: number) {
  for (const node of path) {
    node.n += 1;
    if (node.parent) node.w += result * toMove(node.parent.board);
  }
}

/** One full iteration; returns the path including the new node. */
export function iterate(root: MctsNode, r: Rng, c = Math.SQRT2): { path: MctsNode[]; end: Board; result: number } {
  const path = select(root, c);
  const leaf = path[path.length - 1];
  const child = expand(leaf, r);
  if (child !== leaf) path.push(child);
  const end = simulate(child.board, r);
  const result = winner(end)!;
  backup(path, result);
  return { path, end, result };
}

/** Search for `iterations` and return the most visited move at the root. */
export function bestMove(board: Board, iterations: number, r: Rng): { move: number; root: MctsNode } {
  const root = newNode(board);
  for (let i = 0; i < iterations; i++) iterate(root, r);
  const top = root.children.reduce((a, b) => (b.n > a.n ? b : a));
  return { move: top.move, root };
}

// #region muzero
/**
 * MuZero's learned model (Schrittwieser et al. 2020), as three functions on a hidden state that need not mean
 * anything to a person. MCTS runs exactly as above, but `g` replaces `play` and `f`'s value replaces `simulate`:
 *   h (representation): past observations → hidden state s⁰
 *   g (dynamics):       (sᵏ, action) → (reward rᵏ⁺¹, next hidden state sᵏ⁺¹)
 *   f (prediction):     sᵏ → (policy pᵏ, value vᵏ)
 * Training unrolls g for K steps and matches only rᵏ, pᵏ, vᵏ to observed rewards, search policies and returns;
 * there is no loss on reconstructing observations.
 */
export interface MuZeroModel<Obs, Hidden> {
  h: (observations: Obs[]) => Hidden;
  g: (s: Hidden, action: number) => { reward: number; next: Hidden };
  f: (s: Hidden) => { policy: number[]; value: number };
}

/** Unroll the learned model along a sequence of actions: the predictions a MuZero loss compares with real data. */
export function unroll<O, H>(m: MuZeroModel<O, H>, obs: O[], actions: number[]) {
  let s = m.h(obs);
  const out = [{ reward: 0, ...m.f(s) }];
  for (const a of actions) {
    const { reward, next } = m.g(s, a);
    s = next;
    out.push({ reward, ...m.f(s) });
  }
  return out;
}
// #endregion
