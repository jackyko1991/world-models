/**
 * Dyna-Q against Q-learning on Sutton & Barto's maze (Concepts ▸ Planning and imagination ▸ imagination; Coding
 * Skills ▸ Planning in code ▸ dyna). A slider sets n, the imagined updates per real step. The chart shows episodes
 * completed against real steps, averaged over fixed seeds (computed once, in the browser, on mount); the two mazes
 * show what each agent's greedy policy knows a few steps into its second episode.
 */
import { useLang } from "@learnkit/web";
import { useMemo, useState } from "react";
import { DYNA_DEFAULTS, DYNA_MAZE, MOVES, averageCurve, dynaQ, type Maze } from "../models/dyna.ts";
import { Slider } from "../pages/kit.tsx";

const NS = [0, 1, 2, 5, 10, 20, 50] as const;
const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const STEPS = DYNA_DEFAULTS.steps;
const AMBER = "#b45309";
const TRUE = "#374151";
/** the maze snapshot: this seed, this many real steps after the first episode ends */
const SNAP_SEED = 2;
const SNAP_AFTER = 30;

function MazePolicy({ m, q, title, color }: { m: Maze; q: Float64Array; title: string; color: string }) {
  const C = 18;
  return (
    <figure className="flex flex-col items-center">
      <svg viewBox={`-1 -1 ${m.cols * C + 2} ${m.rows * C + 2}`} className="h-auto w-[170px]" role="img" aria-label={title}>
        {Array.from({ length: m.rows * m.cols }, (_, s) => {
          const x = (s % m.cols) * C;
          const y = Math.floor(s / m.cols) * C;
          const wall = m.walls.has(s);
          const vals = [0, 1, 2, 3].map((a) => q[s * 4 + a]);
          const best = Math.max(...vals);
          const a = vals.indexOf(best);
          const cx = x + C / 2;
          const cy = y + C / 2;
          return (
            <g key={s}>
              <rect x={x} y={y} width={C} height={C} className={wall ? "fill-gray-500" : "fill-white stroke-gray-200"} />
              {s === m.start && <text x={cx} y={cy + 4} textAnchor="middle" className="fill-gray-700 text-[10px] font-semibold">S</text>}
              {s === m.goal && <text x={cx} y={cy + 4} textAnchor="middle" className="fill-gray-700 text-[10px] font-semibold">G</text>}
              {!wall && s !== m.goal && s !== m.start && best > 0 && (
                <line
                  x1={cx - MOVES[a][1] * 5}
                  y1={cy - MOVES[a][0] * 5}
                  x2={cx + MOVES[a][1] * 5}
                  y2={cy + MOVES[a][0] * 5}
                  stroke={color}
                  strokeWidth={1.8}
                  markerEnd={color === AMBER ? "url(#wm-dyna-amber)" : "url(#wm-dyna-gray)"}
                />
              )}
            </g>
          );
        })}
        <defs>
          {[
            ["wm-dyna-amber", AMBER],
            ["wm-dyna-gray", TRUE],
          ].map(([id, c]) => (
            <marker key={id} id={id} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto">
              <path d="M0,0 L10,5 L0,10 z" fill={c} />
            </marker>
          ))}
        </defs>
      </svg>
      <figcaption className="mt-1 text-[11px] text-gray-600">{title}</figcaption>
    </figure>
  );
}

export default function DynaCurves() {
  const { pick } = useLang();
  const [ni, setNi] = useState(3);
  const n = NS[ni];
  // all curves once on mount (about 0.1 s): 7 values of n × 10 seeds × 4000 real steps
  const curves = useMemo(() => NS.map((k) => averageCurve(DYNA_MAZE, k, SEEDS)), []);
  const snap = useMemo(() => {
    const first = dynaQ(DYNA_MAZE, { ...DYNA_DEFAULTS, n: 0, seed: SNAP_SEED }).episodeEnds[0];
    const steps = first + SNAP_AFTER;
    return NS.map((k) => dynaQ(DYNA_MAZE, { ...DYNA_DEFAULTS, steps, n: k, seed: SNAP_SEED }).q);
  }, []);

  const W = 480;
  const Hh = 240;
  const L = 40;
  const B = 28;
  const yMax = Math.ceil(Math.max(...curves[curves.length - 1]) / 50) * 50;
  const X = (t: number) => L + (t / STEPS) * (W - L - 10);
  const Y = (v: number) => Hh - B - (v / yMax) * (Hh - B - 10);
  const line = (c: number[]) => {
    let d = "";
    for (let t = 0; t <= STEPS; t += 20) d += `${t ? "L" : "M"}${X(t).toFixed(1)},${Y(c[t]).toFixed(1)}`;
    return d;
  };
  const at = 2000;

  return (
    <div className="w-full space-y-3">
      <div className="flex justify-center">
        <Slider label={["imagined updates per real step $n$", "每個真實步驟的想像更新次數 $n$"]} value={ni} min={0} max={NS.length - 1} onChange={setNi} format={(i) => String(NS[i])} />
      </div>
      <svg viewBox={`0 0 ${W} ${Hh}`} className="mx-auto h-auto w-full max-w-[520px]" role="img" aria-label={pick(["Episodes completed against real steps", "完成回合數對真實步數"])}>
        {[0, 1000, 2000, 3000, 4000].map((t) => (
          <g key={t}>
            <line x1={X(t)} x2={X(t)} y1={Y(0)} y2={Y(yMax)} className="stroke-gray-100" />
            <text x={X(t)} y={Hh - B + 14} textAnchor="middle" className="fill-gray-500 text-[10px]">
              {t}
            </text>
          </g>
        ))}
        {[0, yMax / 2, yMax].map((v) => (
          <g key={v}>
            <line x1={L} x2={W - 10} y1={Y(v)} y2={Y(v)} className="stroke-gray-100" />
            <text x={L - 5} y={Y(v) + 3} textAnchor="end" className="fill-gray-500 text-[10px]">
              {v}
            </text>
          </g>
        ))}
        <text x={(L + W) / 2} y={Hh - 2} textAnchor="middle" className="fill-gray-600 text-[10px]">
          {pick(["real steps in the maze", "在迷宮中的真實步數"])}
        </text>
        <text x={10} y={Hh / 2} transform={`rotate(-90 10 ${Hh / 2})`} textAnchor="middle" className="fill-gray-600 text-[10px]">
          {pick(["episodes completed", "完成的回合數"])}
        </text>
        {curves.map((c, i) => (i === 0 || i === ni ? null : <path key={i} d={line(c)} fill="none" stroke={AMBER} strokeOpacity={0.15} strokeWidth={1} />))}
        <path d={line(curves[0])} fill="none" stroke={TRUE} strokeWidth={2} />
        {ni > 0 && <path d={line(curves[ni])} fill="none" stroke={AMBER} strokeWidth={2.4} />}
        <text x={X(STEPS) - 4} y={Y(curves[0][STEPS]) - 5} textAnchor="end" className="fill-gray-700 text-[10px] font-semibold">
          {pick(["Q-learning (n = 0)", "Q 學習（n = 0）"])}
        </text>
        {ni > 0 && (
          <text x={X(STEPS) - 4} y={Y(curves[ni][STEPS]) + 13} textAnchor="end" className="text-[10px] font-semibold" fill={AMBER}>
            {`Dyna-Q (n = ${n})`}
          </text>
        )}
      </svg>
      <p className="text-center text-xs text-gray-700 tabular-nums" aria-live="polite">
        {pick([
          `After ${at} real steps: Q-learning ${curves[0][at].toFixed(1)} episodes, Dyna-Q (n = ${n}) ${curves[ni][at].toFixed(1)} (mean of ${SEEDS.length} seeds).`,
          `走了 ${at} 個真實步驟後：Q 學習完成 ${curves[0][at].toFixed(1)} 回合，Dyna-Q（n = ${n}）${curves[ni][at].toFixed(1)} 回合（${SEEDS.length} 個種子的平均）。`,
        ])}
      </p>
      <div className="flex flex-wrap justify-center gap-4">
        <MazePolicy m={DYNA_MAZE} q={snap[0]} title={pick(["Q-learning (n = 0)", "Q 學習（n = 0）"])} color={TRUE} />
        <MazePolicy m={DYNA_MAZE} q={snap[ni]} title={`Dyna-Q (n = ${n})`} color={AMBER} />
      </div>
      <p className="text-center text-[11px] text-gray-500">
        {pick([
          `Arrows: the greedy action wherever the agent has learned some value, ${SNAP_AFTER} real steps into its second episode (seed ${SNAP_SEED}).`,
          `箭頭：智能體已學到正價值的格子上的貪婪動作，取第二回合開始後 ${SNAP_AFTER} 個真實步驟時（種子 ${SNAP_SEED}）。`,
        ])}
      </p>
    </div>
  );
}
