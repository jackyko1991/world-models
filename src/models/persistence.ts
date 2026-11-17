/**
 * Two ways to keep a generated world (Concepts ▸ Generative worlds ▸ world-labs).
 *
 * The camera stands at the centre of a small round world and turns (yaw only). A view is a strip of VIEW columns
 * covering FOV; each column is either sky or the front face of an object (a colour and a height).
 *
 * (a) A **frame model**: each new view is generated from the views of the last `memory` steps only. A column that was
 *     in one of those views is copied; a column nobody remembers is invented afresh. Turn away for long enough and
 *     come back, and the place is re-invented, so it may have changed.
 * (b) An **explicit 3-D scene**: a fixed set of splats (points with a size and a colour), rendered by projecting each
 *     onto the strip and keeping the nearest. Rendering is a pure function of the camera, so coming back shows the
 *     same thing.
 *
 * Both start from the same first view (the frame model is "prompted" with a render of the scene), like Genie 2 or a
 * World Labs model prompted with one image.
 */
import { randInt, rng } from "./rng.ts";

/** columns all the way round */
export const RING = 48;
/** columns in one view (FOV = VIEW / RING × 360° = 60°) */
export const VIEW = 8;
export const PALETTE = ["#0f766e", "#b91c1c", "#7c3aed", "#2563eb", "#ca8a04", "#db2777"] as const;

/** One column of a view: sky (null) or an object face. */
export type Column = { colour: number; height: number } | null;
export type View = Column[];

export interface Splat {
  /** direction from the camera, in columns (0 … RING) */
  az: number;
  /** distance from the camera */
  dist: number;
  /** half-width in the same units as dist */
  radius: number;
  /** top of the splat above the ground (same units) */
  top: number;
  colour: number;
}

/** column index of the camera's left edge → absolute ring column of view column i */
export const ringCol = (yaw: number, i: number) => (((yaw + i) % RING) + RING) % RING;

// ---- (b) the explicit scene ---------------------------------------------------------------------------------------

/** A fixed scene of 14 objects round the camera, each a few splats wide (seeded). */
export function makeScene(seed = 11): Splat[] {
  const r = rng(seed);
  const splats: Splat[] = [];
  for (let o = 0; o < 14; o++) {
    const az = o * (RING / 14) + r() * 1.5;
    const dist = 3 + r() * 5;
    const top = 1 + r() * 2.5;
    const colour = randInt(r, PALETTE.length);
    const n = 2 + randInt(r, 3);
    for (let k = 0; k < n; k++) splats.push({ az: az + k * 0.7, dist, radius: 0.35 * dist * ((2 * Math.PI) / RING), top, colour });
  }
  return splats;
}

// #region project
/** Project every splat onto the strip; in each column keep the nearest splat (a z-buffer). */
export function renderScene(splats: Splat[], yaw: number): View {
  const out: View = new Array(VIEW).fill(null);
  const depth = new Array(VIEW).fill(Infinity);
  const colAngle = (2 * Math.PI) / RING;
  for (const s of splats) {
    const half = Math.atan(s.radius / s.dist) / colAngle; // angular half-width, in columns
    for (let i = 0; i < VIEW; i++) {
      let d = yaw + i + 0.5 - s.az; // signed angle from the splat to the column centre, in columns
      d = ((((d + RING / 2) % RING) + RING) % RING) - RING / 2;
      if (Math.abs(d) <= half + 0.5 && s.dist < depth[i]) {
        depth[i] = s.dist;
        out[i] = { colour: s.colour, height: s.top / s.dist }; // farther = shorter on screen
      }
    }
  }
  return out;
}
// #endregion project

// ---- (a) the frame model -------------------------------------------------------------------------------------------

export interface FrameModel {
  /** steps taken so far */
  t: number;
  yaw: number;
  /** the last views, most recent last, each with the yaw it was seen at */
  memory: { yaw: number; view: View }[];
  seed: number;
}

export function startFrameModel(first: View, yaw: number, seed = 5): FrameModel {
  return { t: 0, yaw, memory: [{ yaw, view: first }], seed };
}

/** A plausible column to fill a gap: often continue the neighbouring object, otherwise sky or a new object. */
function invent(neighbour: Column, r: () => number): Column {
  if (neighbour && r() < 0.55) return { ...neighbour };
  if (r() < 0.4) return null;
  return { colour: randInt(r, PALETTE.length), height: 0.15 + r() * 0.55 };
}

// #region framestep
/**
 * Turn by `dir` (±1 column) and generate the next view from the last `memory` views only: remembered columns are
 * copied, forgotten ones invented (randomness seeded by the step number, so a run is reproducible).
 */
export function stepFrameModel(m: FrameModel, dir: 1 | -1, memory: number): FrameModel {
  const t = m.t + 1;
  const yaw = (((m.yaw + dir) % RING) + RING) % RING;
  const r = rng(m.seed * 100003 + t);
  const recent = m.memory.slice(-memory);
  const recall = (col: number): Column | undefined => {
    for (let k = recent.length - 1; k >= 0; k--) {
      const i = (((col - recent[k].yaw) % RING) + RING) % RING;
      if (i < VIEW) return recent[k].view[i];
    }
    return undefined; // nobody remembers this column
  };
  const view: View = new Array(VIEW).fill(null);
  // fill from the side we came from, so an invented column can continue its neighbour
  const order = dir === 1 ? [...view.keys()] : [...view.keys()].reverse();
  for (const i of order) {
    const known = recall(ringCol(yaw, i));
    const prev = i - dir >= 0 && i - dir < VIEW ? view[i - dir] : null;
    view[i] = known !== undefined ? known : invent(prev, r);
  }
  return { t, yaw, memory: [...recent, { yaw, view }], seed: m.seed };
}
// #endregion framestep

/** Turn the frame model by `steps` columns one step at a time (negative = the other way). */
export function turn(m: FrameModel, steps: number, memory: number): FrameModel {
  let s = m;
  for (let k = 0; k < Math.abs(steps); k++) s = stepFrameModel(s, steps > 0 ? 1 : -1, memory);
  return s;
}

const same = (a: Column, b: Column) => (a === null ? b === null : b !== null && a.colour === b.colour && Math.abs(a.height - b.height) < 1e-9);

/** number of columns in which two views differ */
export const differences = (a: View, b: View) => a.reduce((n, c, i) => n + (same(c, b[i]) ? 0 : 1), 0);
export const sameColumn = same;
