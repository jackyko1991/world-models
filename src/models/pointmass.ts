/**
 * A 2-D point mass that must reach a goal around a round obstacle: the toy system the CEM planner works on
 * (Concepts ▸ Planning and imagination ▸ cem). State [x, y, vx, vy] in a [-1, 1]² arena; the action is a force
 * [ax, ay], each component clipped to [-1, 1]. Semi-implicit Euler with light drag, so a rollout is cheap and exact
 * (the planner's "model" here is the true dynamics; the page says so).
 */

export type PmState = readonly [number, number, number, number];

export interface PointMass {
  dt: number;
  drag: number;
  /** force scale: an action of 1 accelerates by `gain` per second */
  gain: number;
  start: PmState;
  goal: readonly [number, number];
  obstacle: { x: number; y: number; r: number };
}

export const POINT_MASS: PointMass = {
  dt: 0.1,
  drag: 0.5,
  gain: 2.5,
  start: [-0.75, -0.55, 0, 0],
  goal: [0.7, 0.55],
  obstacle: { x: 0, y: 0, r: 0.3 },
};

const clip = (v: number) => Math.max(-1, Math.min(1, v));

/** One step of the true dynamics. */
export function pmStep(m: PointMass, s: PmState, ax: number, ay: number): PmState {
  const vx = s[2] + m.dt * (m.gain * clip(ax) - m.drag * s[2]);
  const vy = s[3] + m.dt * (m.gain * clip(ay) - m.drag * s[3]);
  return [s[0] + m.dt * vx, s[1] + m.dt * vy, vx, vy];
}

/** Roll out a flat action sequence [ax0, ay0, ax1, ay1, …]; returns the visited states (first is `s`). */
export function pmRollout(m: PointMass, s: PmState, actions: ArrayLike<number>): PmState[] {
  const path: PmState[] = [s];
  for (let t = 0; t + 1 < actions.length; t += 2) path.push(pmStep(m, path[path.length - 1], actions[t], actions[t + 1]));
  return path;
}

/**
 * The cost of a plan: squared distance to the goal at every step (the last one counted 5 times), a small effort
 * penalty, and a steep penalty for entering the obstacle or leaving the arena.
 */
export function pmCost(m: PointMass, s: PmState, actions: ArrayLike<number>): number {
  const path = pmRollout(m, s, actions);
  let c = 0;
  for (let t = 1; t < path.length; t++) {
    const [x, y] = path[t];
    const d2 = (x - m.goal[0]) ** 2 + (y - m.goal[1]) ** 2;
    c += t === path.length - 1 ? 5 * d2 : d2;
    const inside = m.obstacle.r - Math.hypot(x - m.obstacle.x, y - m.obstacle.y);
    if (inside > 0) c += 20 + 200 * inside;
    if (Math.abs(x) > 1 || Math.abs(y) > 1) c += 20;
  }
  for (let i = 0; i < actions.length; i++) c += 0.01 * clip(actions[i]) ** 2;
  return c;
}

/** Distance from a state to the goal. */
export const pmGoalDistance = (m: PointMass, s: PmState) => Math.hypot(s[0] - m.goal[0], s[1] - m.goal[1]);
