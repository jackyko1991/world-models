/**
 * A small gridworld with a true step function and a "learned" model that is wrong in two visible, explainable ways.
 *
 * The world: walls, floor, a strip of ice, a key and a locked door in front of the goal room. The true dynamics:
 * - a move into a wall (or into the door while it is locked and you hold no key) leaves you where you are;
 * - stepping onto ice makes you slide on in the same direction until you leave the ice or would hit a wall;
 * - stepping onto the key picks it up; walking into the door while holding the key opens it for good;
 * - reaching the goal gives reward 1.
 *
 * The learned model stands in for a model fitted to logged transitions in which the agent never walked on ice and
 * never carried the key to the door. It has learned walls, floor, key pickup and reward, but believes ice is floor
 * (no slide) and that a door is a wall that never opens. Pure functions, no randomness: p(s'|s,a) is a point mass.
 */

// #region types
/** What a cell of the map is made of. The map never changes; what can change (key taken, door open) is in State. */
export type Cell = "wall" | "floor" | "ice" | "key" | "door" | "goal";

/** The four moves. */
export type Action = "up" | "down" | "left" | "right";

/** Everything the world needs to know to compute the next step. */
export interface State {
  row: number;
  col: number;
  /** the agent is carrying the key (so the key is no longer on the map) */
  hasKey: boolean;
  /** the door has been opened (it stays open) */
  doorOpen: boolean;
}

/** An observation is a picture of the world: one symbol per cell, with the agent drawn on top. */
export type Frame = string[][];

/** One transition, as a model predicts it or as the world produces it. */
export interface Transition {
  next: State;
  reward: number;
}
// #endregion types

/** The map, row by row: # wall, . floor, ~ ice, K key, D door, G goal, A where the agent starts. */
export const MAP_TEXT = [
  "########",
  "#A..~~.#",
  "#.#....#",
  "#K#.##D#",
  "#.#.#..#",
  "#...#.G#",
  "########",
];

const SYMBOL: Record<string, Cell> = { "#": "wall", ".": "floor", "~": "ice", K: "key", D: "door", G: "goal", A: "floor" };

export const MAP: Cell[][] = MAP_TEXT.map((line) => [...line].map((ch) => SYMBOL[ch]));
export const ROWS = MAP.length;
export const COLS = MAP[0].length;

export const ACTIONS: Action[] = ["up", "down", "left", "right"];
export const DELTA: Record<Action, [number, number]> = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };

export function start(): State {
  const row = MAP_TEXT.findIndex((l) => l.includes("A"));
  return { row, col: MAP_TEXT[row].indexOf("A"), hasKey: false, doorOpen: false };
}

/** The cell as it looks in a given state: a taken key is floor, an opened door is floor. */
export function cellAt(s: State, row: number, col: number): Cell {
  const c = MAP[row][col];
  if (c === "key" && s.hasKey) return "floor";
  if (c === "door" && s.doorOpen) return "floor";
  return c;
}

// #region step
/** The true world: one step of the dynamics and its reward. */
export function trueStep(s: State, a: Action): Transition {
  const [dr, dc] = DELTA[a];
  let { row, col, hasKey, doorOpen } = s;
  const blocked = (r: number, c: number) => {
    const cell = cellAt({ row, col, hasKey, doorOpen }, r, c);
    return cell === "wall" || (cell === "door" && !hasKey);
  };
  if (!blocked(row + dr, col + dc)) {
    row += dr;
    col += dc;
    // ice: keep sliding while on ice and the next cell is free
    while (MAP[row][col] === "ice" && !blocked(row + dr, col + dc)) {
      row += dr;
      col += dc;
    }
  }
  if (MAP[row][col] === "key") hasKey = true;
  if (MAP[row][col] === "door") doorOpen = true;
  const next = { row, col, hasKey, doorOpen };
  return { next, reward: reward(next) };
}

/** What the learned model predicts: it treats ice as floor and every door as a wall. */
export function learnedStep(s: State, a: Action): Transition {
  const [dr, dc] = DELTA[a];
  let { row, col, hasKey } = s;
  const cell = cellAt(s, row + dr, col + dc);
  if (cell !== "wall" && cell !== "door") {
    row += dr;
    col += dc;
  }
  if (MAP[row][col] === "key") hasKey = true;
  const next = { ...s, row, col, hasKey };
  return { next, reward: reward(next) };
}

/** The reward model r(s'): 1 on the goal, 0 elsewhere. */
export function reward(s: State): number {
  return MAP[s.row][s.col] === "goal" ? 1 : 0;
}
// #endregion step

// #region observe
/** The observation model: draw the state as a frame (agent "A" on top of the cell it stands on). */
export function observe(s: State): Frame {
  const sym: Record<Cell, string> = { wall: "#", floor: ".", ice: "~", key: "K", door: "D", goal: "G" };
  return MAP.map((line, r) => line.map((_, c) => (r === s.row && c === s.col ? "A" : sym[cellAt(s, r, c)])));
}

/** The cells where two frames differ, as [row, col] pairs. */
export function diffCells(a: Frame, b: Frame): [number, number][] {
  const out: [number, number][] = [];
  a.forEach((line, r) => line.forEach((ch, c) => ch !== b[r][c] && out.push([r, c])));
  return out;
}
// #endregion observe

// #region rollout
/** Run a sequence of actions through a step function (the world or the model) and keep every state. */
export function rollout(step: (s: State, a: Action) => Transition, s0: State, actions: Action[]): State[] {
  const states = [s0];
  for (const a of actions) states.push(step(states[states.length - 1], a).next);
  return states;
}
// #endregion rollout
