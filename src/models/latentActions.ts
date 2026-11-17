/**
 * Latent actions from unlabelled frame pairs (Concepts ▸ Generative worlds ▸ genie), Genie's idea at toy scale.
 * The learner sees only pairs of frames of the tiny game (src/models/tinyGame.ts), never the key that was pressed.
 * For each pair it measures how the player-coloured pixels moved (a 2-D vector), then vector-quantises those vectors
 * with k-means into k codes. Each code has then "come to mean" one kind of transition. The true keys are kept beside
 * the pairs only to grade the result afterwards.
 *
 * Simplified on purpose: Genie learns its encoder (a transformer over the frames) and its codebook jointly, with a
 * decoder that must rebuild the next frame from the past frames and the code; here the encoder is a fixed hand-written
 * feature and only the codebook is learned.
 */
import { randInt, rng } from "./rng.ts";
import { ACTIONS, blocked, H, PLAYER, render, START, step, W, type Action, type Frame, type GameState } from "./tinyGame.ts";

export interface FramePair {
  before: Frame;
  after: Frame;
  /** the key actually pressed: hidden from the learner, used only for grading */
  hidden: Action;
}

/**
 * `n` frame pairs from random play (fixed seed). `clean`: the player never walks into a wall, so every key changes
 * the frame in its own way (a blocked move looks exactly like "stay").
 */
export function framePairs(n: number, seed = 3, clean = true): FramePair[] {
  const r = rng(seed);
  const out: FramePair[] = [];
  let s: GameState = START;
  while (out.length < n) {
    const a = randInt(r, ACTIONS.length) as Action;
    if (clean && blocked(s, a)) continue;
    const next = step(s, a);
    out.push({ before: render(s), after: render(next), hidden: a });
    s = next;
  }
  return out;
}

// #region feature
/** Where the player-coloured pixels are on average (x, y). */
function centroid(f: Frame): [number, number] {
  let x = 0;
  let y = 0;
  let n = 0;
  f.forEach((c, i) => {
    if (c === PLAYER) {
      x += i % W;
      y += Math.floor(i / W);
      n++;
    }
  });
  return n ? [x / n, y / n] : [W / 2, H / 2];
}

/** The learner's only input: how the player-coloured pixels moved between the two frames. */
export function feature(p: { before: Frame; after: Frame }): [number, number] {
  const [x0, y0] = centroid(p.before);
  const [x1, y1] = centroid(p.after);
  return [x1 - x0, y1 - y0];
}
// #endregion feature

const d2 = (a: readonly number[], b: readonly number[]) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;

export interface LatentActions {
  /** code → the movement vector it stands for (the codebook) */
  centroids: [number, number][];
  /** code assigned to each pair */
  codes: number[];
}

// #region kmeans
/** Vector quantisation by k-means (k-means++ start, fixed seed): each pair gets the nearest of k code vectors. */
export function learnLatentActions(pairs: FramePair[], k: number, seed = 1, iters = 25): LatentActions {
  const pts = pairs.map(feature);
  const r = rng(seed);
  const centroids: [number, number][] = [[...pts[randInt(r, pts.length)]]];
  while (centroids.length < k) {
    const dist = pts.map((p) => Math.min(...centroids.map((c) => d2(p, c))));
    const total = dist.reduce((a, b) => a + b, 0);
    if (total === 0) {
      centroids.push([...centroids[0]]); // fewer distinct movements than codes: a spare code
      continue;
    }
    let u = r() * total;
    let i = 0;
    while (u > dist[i]) u -= dist[i++];
    centroids.push([...pts[Math.min(i, pts.length - 1)]]);
  }
  let codes = pts.map(() => 0);
  for (let it = 0; it < iters; it++) {
    codes = pts.map((p) => {
      let best = 0;
      centroids.forEach((c, j) => {
        if (d2(p, c) < d2(p, centroids[best])) best = j;
      });
      return best;
    });
    centroids.forEach((c, j) => {
      const mine = pts.filter((_, i) => codes[i] === j);
      if (mine.length) c.splice(0, 2, mine.reduce((s, p) => s + p[0], 0) / mine.length, mine.reduce((s, p) => s + p[1], 0) / mine.length);
    });
  }
  return { centroids, codes };
}
// #endregion kmeans

/** Grading only: counts[code][true key]. */
export function confusion(pairs: FramePair[], codes: number[], k: number): number[][] {
  const m = Array.from({ length: k }, () => new Array(ACTIONS.length).fill(0));
  pairs.forEach((p, i) => m[codes[i]][p.hidden]++);
  return m;
}

/** Fraction of pairs whose code's majority key is their own key (1 = the codes recover the keys up to renaming). */
export function purity(m: number[][]): number {
  let hit = 0;
  let all = 0;
  for (const row of m) {
    hit += Math.max(...row);
    all += row.reduce((a, b) => a + b, 0);
  }
  return all ? hit / all : 0;
}

/**
 * Play a code: move the player-coloured pixels of `f` by the code's vector, rounded to whole cells (walls stop it).
 * The learner never needs to know which key that was.
 */
export function applyCode(f: Frame, v: [number, number]): Frame {
  const dx = Math.round(v[0]);
  const dy = Math.round(v[1]);
  const out = f.map((c) => (c === PLAYER ? 0 : c)) as Frame;
  f.forEach((c, i) => {
    if (c !== PLAYER) return;
    const x = Math.min(W - 1, Math.max(0, (i % W) + dx));
    const y = Math.min(H - 1, Math.max(0, Math.floor(i / W) + dy));
    out[y * W + x] = PLAYER;
  });
  return out;
}
