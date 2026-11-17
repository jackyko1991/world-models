/**
 * A tiny "game" and a count-based, action-conditioned next-frame generator learned from recorded play (Concepts ▸
 * Generative worlds ▸ video). The game: a 6 × 4 grid, a player and a coin; stepping on the coin moves it to a new spot
 * chosen by a clock the frame does not show, so from frames alone a coin pick-up has several possible outcomes.
 *
 * The pipeline is the shape of a video world model, shrunk to a lookup table:
 *   frame → tokens (2 × 2 patches, each mapped to a codebook entry) → table[(tokens, action)] → counts of next tokens.
 * States that never appeared in the recorded play have no entry: there the generator can only guess.
 */
import { randInt, rng } from "./rng.ts";

export const W = 6;
export const H = 4;
/** cell values in a frame */
export const EMPTY = 0;
export const PLAYER = 1;
export const COIN = 2;
export type Cell = 0 | 1 | 2;
export type Frame = Cell[]; // length W * H, row-major

export const ACTIONS = ["stay", "left", "right", "up", "down"] as const;
export type Action = 0 | 1 | 2 | 3 | 4;
export const DX = [0, -1, 1, 0, 0];
export const DY = [0, 0, 0, -1, 1];
/** where the coin can appear; which one is next depends on the hidden clock */
export const COIN_SPOTS: readonly [number, number][] = [
  [5, 0],
  [0, 3],
  [3, 1],
  [5, 3],
  [1, 0],
];

/** the true state: player position, coin spot, and a clock the frame does not show */
export interface GameState {
  px: number;
  py: number;
  coin: number;
  clock: number;
}

export const START: GameState = { px: 2, py: 2, coin: 0, clock: 0 };

// #region step
/** One step of the true game. Walls block; eating the coin moves it to COIN_SPOTS[clock mod 5] (skipping the player). */
export function step(s: GameState, a: Action): GameState {
  const px = Math.min(W - 1, Math.max(0, s.px + DX[a]));
  const py = Math.min(H - 1, Math.max(0, s.py + DY[a]));
  const clock = s.clock + 1;
  let coin = s.coin;
  const [cx, cy] = COIN_SPOTS[coin];
  if (px === cx && py === cy) {
    coin = clock % COIN_SPOTS.length;
    const at = (k: number) => COIN_SPOTS[k][0] === px && COIN_SPOTS[k][1] === py;
    while (at(coin)) coin = (coin + 1) % COIN_SPOTS.length;
  }
  return { px, py, coin, clock };
}
// #endregion step

/** true when the action walks into a wall (the player does not move) */
export const blocked = (s: GameState, a: Action) => {
  const x = s.px + DX[a];
  const y = s.py + DY[a];
  return a !== 0 && (x < 0 || x >= W || y < 0 || y >= H);
};

export function render(s: GameState): Frame {
  const f: Frame = new Array(W * H).fill(EMPTY);
  const [cx, cy] = COIN_SPOTS[s.coin];
  f[cy * W + cx] = COIN;
  f[s.py * W + s.px] = PLAYER;
  return f;
}

// ---- tokenizer: 2 × 2 patches → codebook ids --------------------------------------------------------------------

export const PATCH = 2;
export const TOKENS = (W / PATCH) * (H / PATCH); // 6 tokens per frame
/** the token id for a patch that never appeared while building the codebook */
export const UNKNOWN = -1;

export interface Codebook {
  /** token id → patch pattern (the patch's 4 cells read as a base-3 number) */
  patterns: number[];
}

// #region tokenize
/** The patch patterns of a frame: each 2 × 2 patch read as a base-3 number (0 … 80). */
export function patches(f: Frame): number[] {
  const out: number[] = [];
  for (let by = 0; by < H; by += PATCH)
    for (let bx = 0; bx < W; bx += PATCH) {
      let code = 0;
      for (let k = PATCH * PATCH - 1; k >= 0; k--) code = code * 3 + f[(by + (k >> 1)) * W + bx + (k & 1)];
      out.push(code);
    }
  return out;
}

/** The codebook: every patch pattern seen in the training frames, numbered in order of first appearance. */
export function buildCodebook(frames: Frame[]): Codebook {
  const patterns: number[] = [];
  for (const f of frames) for (const p of patches(f)) if (!patterns.includes(p)) patterns.push(p);
  return { patterns };
}

export const encode = (f: Frame, cb: Codebook): number[] => patches(f).map((p) => cb.patterns.indexOf(p));
// #endregion tokenize

/** tokens → frame; an UNKNOWN token decodes to an empty patch */
export function decode(tokens: number[], cb: Codebook): Frame {
  const f: Frame = new Array(W * H).fill(EMPTY);
  const per = W / PATCH;
  tokens.forEach((t, i) => {
    let code = t === UNKNOWN ? 0 : cb.patterns[t];
    const bx = (i % per) * PATCH;
    const by = Math.floor(i / per) * PATCH;
    for (let k = 0; k < PATCH * PATCH; k++) {
      f[(by + (k >> 1)) * W + bx + (k & 1)] = (code % 3) as Cell;
      code = Math.floor(code / 3);
    }
  });
  return f;
}

// ---- recorded play -----------------------------------------------------------------------------------------------

export interface Transition {
  before: GameState;
  action: Action;
  after: GameState;
}

/** `steps` moves of a player pressing random keys from START (fixed seed). */
export function record(steps: number, seed = 7): Transition[] {
  const r = rng(seed);
  const out: Transition[] = [];
  let s = START;
  for (let i = 0; i < steps; i++) {
    const a = randInt(r, ACTIONS.length) as Action;
    const n = step(s, a);
    out.push({ before: s, action: a, after: n });
    s = n;
  }
  return out;
}

// ---- the generator: a table of counts ------------------------------------------------------------------------------

export interface Generator {
  cb: Codebook;
  /** key `tokens|action` → next tokens (joined) → count */
  table: Map<string, Map<string, number>>;
}

const key = (tokens: number[], a: Action) => `${tokens.join(",")}|${a}`;

// #region generator
/** "Training": tokenize every recorded frame and count which next frame followed each (frame, action). */
export function train(play: Transition[]): Generator {
  const cb = buildCodebook(play.flatMap((t) => [render(t.before), render(t.after)]));
  const table = new Map<string, Map<string, number>>();
  for (const t of play) {
    const k = key(encode(render(t.before), cb), t.action);
    const next = encode(render(t.after), cb).join(",");
    const row = table.get(k) ?? new Map<string, number>();
    row.set(next, (row.get(next) ?? 0) + 1);
    table.set(k, row);
  }
  return { cb, table };
}

export interface Prediction {
  /** how many times this (frame, action) was seen in training; 0 means the generator is guessing */
  seen: number;
  /** possible next frames (as tokens) with their probabilities, most likely first */
  outcomes: { tokens: number[]; p: number }[];
}

/** p(next tokens | tokens, action) from the counts. Unseen: copy the frame unchanged, with seen = 0. */
export function predict(g: Generator, tokens: number[], a: Action): Prediction {
  const row = g.table.get(key(tokens, a));
  if (!row) return { seen: 0, outcomes: [{ tokens: tokens.slice(), p: 0 }] };
  let n = 0;
  for (const c of row.values()) n += c;
  const outcomes = [...row.entries()]
    .map(([t, c]) => ({ tokens: t.split(",").map(Number), p: c / n }))
    .sort((x, y) => y.p - x.p); // stable: ties keep first-seen order
  return { seen: n, outcomes };
}
// #endregion generator

/** how many of the reachable (state, action) pairs the table has an entry for (read through their frames) */
export function coverage(g: Generator): { seen: number; total: number } {
  let seen = 0;
  let total = 0;
  for (let px = 0; px < W; px++)
    for (let py = 0; py < H; py++)
      for (let coin = 0; coin < COIN_SPOTS.length; coin++) {
        if (COIN_SPOTS[coin][0] === px && COIN_SPOTS[coin][1] === py) continue;
        const toks = encode(render({ px, py, coin, clock: 0 }), g.cb);
        for (let a = 0; a < ACTIONS.length; a++) {
          total++;
          if (g.table.has(key(toks, a as Action))) seen++;
        }
      }
  return { seen, total };
}
