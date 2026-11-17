/**
 * Tabular Q-learning and Dyna-Q on a small maze (Concepts ▸ Planning and imagination ▸ imagination; Coding Skills ▸
 * Planning in code ▸ dyna). The maze is the one in Sutton & Barto's Example 8.1: 6 × 9 cells, start on the left,
 * goal top right, reward 1 on reaching the goal and 0 otherwise.
 *
 * Dyna-Q (Sutton 1990) is Q-learning plus a table model of the transitions seen so far: after every real step it
 * makes `n` extra Q-learning updates on transitions replayed from the model ("imagined" steps). With n = 0 it is plain
 * Q-learning. Randomness only from rng.ts.
 */
import { randInt, rng, type Rng } from "./rng.ts";

export interface Maze {
  rows: number;
  cols: number;
  /** wall cells, as row * cols + col */
  walls: ReadonlySet<number>;
  start: number;
  goal: number;
}

const cell = (r: number, c: number) => r * 9 + c;

/** Sutton & Barto (2018), Example 8.1 (Figure 8.2): the Dyna maze. */
export const DYNA_MAZE: Maze = {
  rows: 6,
  cols: 9,
  walls: new Set([cell(1, 2), cell(2, 2), cell(3, 2), cell(4, 5), cell(0, 7), cell(1, 7), cell(2, 7)]),
  start: cell(2, 0),
  goal: cell(0, 8),
};

/** Actions: up, right, down, left. */
export const MOVES = [
  [-1, 0],
  [0, 1],
  [1, 0],
  [0, -1],
] as const;

/** The true maze: a move into a wall or off the grid leaves you where you are. */
export function mazeStep(m: Maze, s: number, a: number): { next: number; reward: number; done: boolean } {
  const r = Math.floor(s / m.cols) + MOVES[a][0];
  const c = (s % m.cols) + MOVES[a][1];
  const blocked = r < 0 || r >= m.rows || c < 0 || c >= m.cols || m.walls.has(r * m.cols + c);
  const next = blocked ? s : r * m.cols + c;
  return { next, reward: next === m.goal ? 1 : 0, done: next === m.goal };
}

export interface DynaOptions {
  /** imagined updates per real step (0 = Q-learning) */
  n: number;
  /** real steps to run */
  steps: number;
  alpha: number;
  gamma: number;
  epsilon: number;
  seed: number;
}

export const DYNA_DEFAULTS: Omit<DynaOptions, "n" | "seed"> = { steps: 4000, alpha: 0.1, gamma: 0.95, epsilon: 0.1 };

/** The greedy action, ties broken at random (so an untrained agent wanders instead of walking into a wall forever). */
export function greedy(q: Float64Array, s: number, r: Rng): number {
  let best = -Infinity;
  let ties: number[] = [];
  for (let a = 0; a < 4; a++) {
    const v = q[s * 4 + a];
    if (v > best) [best, ties] = [v, [a]];
    else if (v === best) ties.push(a);
  }
  return ties[randInt(r, ties.length)];
}

export interface DynaRun {
  /** the real step (1-based) at which each episode reached the goal */
  episodeEnds: number[];
  /** Q[s * 4 + a] after the run */
  q: Float64Array;
}

/** One Q-learning update of Q[s * 4 + a], in place. At the goal (`terminal`) there is no future, so the target is just r. */
export function qUpdate(q: Float64Array, s: number, a: number, reward: number, next: number, terminal: boolean, alpha: number, gamma: number) {
  const best = Math.max(q[next * 4], q[next * 4 + 1], q[next * 4 + 2], q[next * 4 + 3]);
  const target = reward + (terminal ? 0 : gamma * best);
  q[s * 4 + a] += alpha * (target - q[s * 4 + a]);
}

// #region dyna
export function dynaQ(m: Maze, o: DynaOptions): DynaRun {
  const r = rng(o.seed); // acting
  const ri = rng(o.seed + 7919); // imagining (a separate stream, so runs with different n share their first episode)
  const q = new Float64Array(m.rows * m.cols * 4);
  const model = new Map<number, { next: number; reward: number }>(); // (s, a) → what happened last time
  const seen: number[] = []; // the keys of `model`, so we can pick one at random
  const update = (s: number, a: number, reward: number, next: number) => qUpdate(q, s, a, reward, next, next === m.goal, o.alpha, o.gamma);
  const episodeEnds: number[] = [];
  let s = m.start;
  for (let t = 1; t <= o.steps; t++) {
    // act in the real maze (ε-greedy) and learn from it: plain Q-learning
    const a = r() < o.epsilon ? randInt(r, 4) : greedy(q, s, r);
    const { next, reward, done } = mazeStep(m, s, a);
    update(s, a, reward, next);
    // remember the transition in the table model
    if (!model.has(s * 4 + a)) seen.push(s * 4 + a);
    model.set(s * 4 + a, { next, reward });
    // imagine: n more updates on transitions replayed from the model
    for (let k = 0; k < o.n; k++) {
      const key = seen[randInt(ri, seen.length)];
      const sim = model.get(key)!;
      update(Math.floor(key / 4), key % 4, sim.reward, sim.next);
    }
    if (done) episodeEnds.push(t);
    s = done ? m.start : next;
  }
  return { episodeEnds, q };
}
// #endregion

/** Episodes completed by each real step 0…steps (index t = episodes finished within the first t real steps). */
export function episodesByStep(run: DynaRun, steps: number): number[] {
  const out = new Array<number>(steps + 1).fill(0);
  for (const e of run.episodeEnds) out[e]++;
  for (let t = 1; t <= steps; t++) out[t] += out[t - 1];
  return out;
}

/** The learning curve averaged over seeds: mean episodes completed against real steps. */
export function averageCurve(m: Maze, n: number, seeds: readonly number[], opts = DYNA_DEFAULTS): number[] {
  const sum = new Array<number>(opts.steps + 1).fill(0);
  for (const seed of seeds) episodesByStep(dynaQ(m, { ...opts, n, seed }), opts.steps).forEach((v, t) => (sum[t] += v / seeds.length));
  return sum;
}

/** The shortest path length from start to goal (breadth-first search), for reference. */
export function shortestPath(m: Maze): number {
  const dist = new Map<number, number>([[m.start, 0]]);
  const queue = [m.start];
  while (queue.length) {
    const s = queue.shift()!;
    if (s === m.goal) return dist.get(s)!;
    for (let a = 0; a < 4; a++) {
      const { next } = mazeStep(m, s, a);
      if (!dist.has(next)) [dist.set(next, dist.get(s)! + 1), queue.push(next)];
    }
  }
  return Infinity;
}
