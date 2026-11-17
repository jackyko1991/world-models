/**
 * The cross-entropy method on a point mass, one phase at a time (Concepts ▸ Planning and imagination ▸ cem; also
 * beside the code on Coding Skills ▸ Planning in code). Left: the arena with every sampled plan rolled through the
 * model (faint), the elites (amber) and the refitted mean plan; the path actually taken by MPC is gray-700. Right: the
 * Gaussian over the *first* action (ax, ay), with its 2σ ellipse before (dashed) and after (amber) the refit.
 */
import { useLang } from "@learnkit/web";
import { useMemo, useRef, useState } from "react";
import { CEM_DEFAULTS, cemIteration, randomShooting, type CemIteration } from "../models/cem.ts";
import { POINT_MASS, pmCost, pmGoalDistance, pmRollout, pmStep, type PmState } from "../models/pointmass.ts";
import { rng, type Rng } from "../models/rng.ts";
import { DemoButton } from "../pages/kit.tsx";

/** What the demo just did: the Coding Skills page lights up the matching lines. */
export type CemPhase = "start" | "sampled" | "elites" | "refit" | "act";

const H = 25; // planning horizon (steps of 0.1 s)
const D = 2 * H;
const INIT_STD = 0.7;
const AMBER = "#b45309";
const TRUE = "#374151";
const SEED = 11;

interface Planner {
  state: PmState;
  mean: number[];
  std: number[];
  /** iterations done since the last real step */
  k: number;
  phase: CemPhase;
  it: CemIteration | null;
  best: number[] | null;
  bestCost: number;
  taken: PmState[];
}

const fresh = (state: PmState, mean = new Array<number>(D).fill(0), taken: PmState[] = [state]): Planner => ({
  state,
  mean,
  std: new Array<number>(D).fill(INIT_STD),
  k: 0,
  phase: "start",
  it: null,
  best: null,
  bestCost: Infinity,
  taken,
});

// arena [-1, 1]² → 0…300
const S = 300;
const px = (x: number) => ((x + 1) / 2) * S;
const py = (y: number) => ((1 - y) / 2) * S;
const pathD = (path: readonly PmState[]) => path.map((s, i) => `${i ? "L" : "M"}${px(s[0]).toFixed(1)},${py(s[1]).toFixed(1)}`).join("");

export default function CemPlanner({ onPhase }: { onPhase?: (p: CemPhase) => void }) {
  const { pick } = useLang();
  const m = POINT_MASS;
  const r = useRef<Rng>(rng(SEED));
  const [p, setP] = useState<Planner>(() => fresh(m.start));
  const set = (next: Planner) => {
    setP(next);
    onPhase?.(next.phase);
  };
  const cost = useMemo(() => (plan: number[]) => pmCost(m, p.state, plan), [m, p.state]);

  const next = () => {
    if (p.phase === "start" || p.phase === "refit" || p.phase === "act") {
      const it = cemIteration(cost, p.mean, p.std, CEM_DEFAULTS, r.current);
      const c = it.costs[it.elites[0]];
      const better = c < p.bestCost;
      set({ ...p, it, phase: "sampled", best: better ? it.plans[it.elites[0]] : p.best, bestCost: better ? c : p.bestCost });
    } else if (p.phase === "sampled") set({ ...p, phase: "elites" });
    else if (p.phase === "elites" && p.it) set({ ...p, phase: "refit", mean: p.it.nextMean, std: p.it.nextStd, k: p.k + 1 });
  };
  const fullIteration = () => {
    let q = p;
    if (q.phase === "sampled" || q.phase === "elites") {
      q = { ...q, phase: "refit", mean: q.it!.nextMean, std: q.it!.nextStd, k: q.k + 1 };
    } else {
      const it = cemIteration(cost, q.mean, q.std, CEM_DEFAULTS, r.current);
      const c = it.costs[it.elites[0]];
      const better = c < q.bestCost;
      q = { ...q, it, phase: "refit", mean: it.nextMean, std: it.nextStd, k: q.k + 1, best: better ? it.plans[it.elites[0]] : q.best, bestCost: better ? c : q.bestCost };
    }
    set(q);
  };
  const act = () => {
    // plan first if nothing has been planned from this state (three whole iterations)
    let { best, mean, std } = p;
    if (p.k === 0) {
      let bestCost = Infinity;
      for (let k = 0; k < 3; k++) {
        const it = cemIteration(cost, mean, std, CEM_DEFAULTS, r.current);
        if (it.costs[it.elites[0]] < bestCost) [best, bestCost] = [it.plans[it.elites[0]], it.costs[it.elites[0]]];
        [mean, std] = [it.nextMean, it.nextStd];
      }
    }
    if (!best) return;
    const s = pmStep(m, p.state, best[0], best[1]);
    // receding horizon: shift the mean one step forward as the next warm start, widen the search again
    set({ ...fresh(s, [...mean.slice(2), 0, 0], [...p.taken, s]), phase: "act" });
  };
  const reset = () => {
    r.current = rng(SEED);
    set(fresh(m.start));
  };

  // random shooting with as many samples as CEM has drawn so far from this state, for comparison
  const shooting = useMemo(() => {
    if (p.k === 0) return null;
    return randomShooting(cost, new Array<number>(D).fill(0), new Array<number>(D).fill(INIT_STD), p.k * CEM_DEFAULTS.samples, 1, rng(SEED + p.k)).bestCost;
  }, [cost, p.k]);

  const it = p.it;
  const showElites = p.phase === "elites" || p.phase === "refit";
  const eliteSet = new Set(showElites && it ? it.elites : []);
  const meanPath = pmRollout(m, p.state, p.mean);
  const bestPath = p.best ? pmRollout(m, p.state, p.best) : null;

  // first-action panel: [-1, 1]² → 0…160
  const A = 160;
  const ax = (v: number) => ((v + 1) / 2) * A;
  const ay = (v: number) => ((1 - v) / 2) * A;
  const ellipse = (mean: number[], std: number[], cls: string, dash?: string) => (
    <ellipse
      cx={ax(mean[0])}
      cy={ay(mean[1])}
      rx={Math.max(1.5, std[0] * A)}
      ry={Math.max(1.5, std[1] * A)}
      fill="none"
      stroke={cls}
      strokeWidth={1.5}
      strokeDasharray={dash}
    />
  );

  const phaseText: Record<CemPhase, [string, string]> = {
    start: ["Press Next phase to sample plans from the Gaussian, or Act to plan and take one step.", "按「下一步」從高斯分布取樣計畫，或按「行動」規劃並走一步。"],
    sampled: [
      `Sampled ${CEM_DEFAULTS.samples} plans of ${H} steps and rolled each through the model (faint paths).`,
      `取樣了 ${CEM_DEFAULTS.samples} 個長 ${H} 步的計畫，每個都在模型中推演（淡色路徑）。`,
    ],
    elites: [`Kept the ${CEM_DEFAULTS.elites} cheapest plans: the elites (amber).`, `留下最便宜的 ${CEM_DEFAULTS.elites} 個計畫：菁英（琥珀色）。`],
    refit: [
      "Refitted the Gaussian to the elites: its mean plan (thick amber) and a narrower spread.",
      "把高斯分布重新擬合到菁英上：平均計畫（粗琥珀線），分布也變窄了。",
    ],
    act: [
      "MPC: carried out only the first action of the best plan, then started planning again from the new state.",
      "MPC：只執行最佳計畫的第一個動作，然後從新狀態重新開始規劃。",
    ],
  };
  const [en, zh] = phaseText[p.phase];

  return (
    <div className="w-full space-y-3">
      <div className="flex flex-wrap items-start justify-center gap-4">
        <svg viewBox={`0 0 ${S} ${S}`} className="h-auto w-full max-w-[340px] rounded border border-gray-200 bg-white" role="img" aria-label={pick(["Point mass arena with sampled plans", "質點場地與取樣的計畫"])}>
          <circle cx={px(m.obstacle.x)} cy={py(m.obstacle.y)} r={(m.obstacle.r / 2) * S} className="fill-gray-200 stroke-gray-400" />
          <text x={px(m.obstacle.x)} y={py(m.obstacle.y) + 4} textAnchor="middle" className="fill-gray-500 text-[10px]">
            {pick(["obstacle", "障礙物"])}
          </text>
          {it &&
            p.phase !== "act" &&
            it.plans.map((plan, i) =>
              eliteSet.has(i) ? null : <path key={i} d={pathD(pmRollout(m, p.state, plan))} fill="none" stroke="#9ca3af" strokeOpacity={0.35} strokeWidth={0.8} />,
            )}
          {it &&
            p.phase !== "act" &&
            [...eliteSet].map((i) => <path key={`e${i}`} d={pathD(pmRollout(m, p.state, it.plans[i]))} fill="none" stroke={AMBER} strokeOpacity={0.75} strokeWidth={1.3} />)}
          {(p.phase === "refit" || p.phase === "start" || p.phase === "act") && (
            <path d={pathD(meanPath)} fill="none" stroke={AMBER} strokeWidth={2.6} strokeDasharray={p.phase === "refit" ? undefined : "4 3"} />
          )}
          {bestPath && p.phase === "refit" && <path d={pathD(bestPath)} fill="none" stroke={AMBER} strokeWidth={1} strokeDasharray="1 2" />}
          <path d={pathD(p.taken)} fill="none" stroke={TRUE} strokeWidth={2.2} />
          <circle cx={px(m.start[0])} cy={py(m.start[1])} r={4} fill={TRUE} />
          <circle cx={px(p.state[0])} cy={py(p.state[1])} r={5} fill="white" stroke={TRUE} strokeWidth={2} />
          <g transform={`translate(${px(m.goal[0])},${py(m.goal[1])})`}>
            <circle r={9} fill="none" stroke={TRUE} strokeWidth={1.5} />
            <circle r={3} fill={TRUE} />
          </g>
          <text x={px(m.goal[0])} y={py(m.goal[1]) - 13} textAnchor="middle" className="fill-gray-700 text-[10px]">
            {pick(["goal", "目標"])}
          </text>
        </svg>
        <div className="flex flex-col items-center gap-1">
          <svg viewBox={`-6 -6 ${A + 12} ${A + 12}`} className="h-auto w-[170px] rounded border border-gray-200 bg-white" role="img" aria-label={pick(["Gaussian over the first action", "第一個動作的高斯分布"])}>
            <line x1={ax(-1)} x2={ax(1)} y1={ay(0)} y2={ay(0)} className="stroke-gray-200" />
            <line x1={ax(0)} x2={ax(0)} y1={ay(-1)} y2={ay(1)} className="stroke-gray-200" />
            <rect x={0} y={0} width={A} height={A} fill="none" className="stroke-gray-300" />
            {it && p.phase !== "act" && it.plans.map((plan, i) => (eliteSet.has(i) ? null : <circle key={i} cx={ax(plan[0])} cy={ay(plan[1])} r={1.8} fill="#9ca3af" />))}
            {it && p.phase !== "act" && [...eliteSet].map((i) => <circle key={`e${i}`} cx={ax(it.plans[i][0])} cy={ay(it.plans[i][1])} r={2.6} fill={AMBER} />)}
            {it && p.phase !== "refit" && p.phase !== "act" && ellipse(it.mean, it.std.map((v) => 2 * v), "#6b7280", "3 3")}
            {(p.phase === "refit" || p.phase === "start" || p.phase === "act") && ellipse(p.mean, p.std.map((v) => 2 * v), p.phase === "refit" ? AMBER : "#6b7280", p.phase === "refit" ? undefined : "3 3")}
          </svg>
          <p className="text-[11px] text-gray-500">{pick(["first action (a_x, a_y), 2σ ellipse", "第一個動作 (a_x, a_y)，2σ 橢圓"])}</p>
        </div>
      </div>
      <p className="text-center text-xs text-gray-700" aria-live="polite">
        {pick([en, zh])}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <DemoButton onClick={next} active>
          {pick(["Next phase", "下一步"])}
        </DemoButton>
        <DemoButton onClick={fullIteration}>{pick(["Whole iteration", "完整一輪"])}</DemoButton>
        <DemoButton onClick={act}>{pick(["Act (MPC step)", "行動（MPC 一步）"])}</DemoButton>
        <DemoButton onClick={reset}>{pick(["Reset", "重設"])}</DemoButton>
      </div>
      <dl className="mx-auto grid max-w-md grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] text-gray-600 tabular-nums">
        <dt>{pick(["CEM iterations from this state", "從此狀態起的 CEM 輪數"])}</dt>
        <dd className="text-right font-mono">{p.k}</dd>
        <dt>{pick(["best plan cost (CEM)", "最佳計畫成本（CEM）"])}</dt>
        <dd className="text-right font-mono">{Number.isFinite(p.bestCost) ? p.bestCost.toFixed(2) : "–"}</dd>
        <dt>{pick(["random shooting, same samples", "隨機射擊，相同樣本數"])}</dt>
        <dd className="text-right font-mono">{shooting === null ? "–" : shooting.toFixed(2)}</dd>
        <dt>{pick(["real steps taken · distance to goal", "已走真實步數 · 距目標"])}</dt>
        <dd className="text-right font-mono">
          {p.taken.length - 1} · {pmGoalDistance(m, p.state).toFixed(2)}
        </dd>
      </dl>
    </div>
  );
}
