/**
 * Cart-pole demos.
 * - default (Concepts ▸ rollouts): the true simulator and the learned linear model start from the same state; a
 *   horizon slider draws both trajectories of the pole angle, the two cart-poles at that step, and the error against
 *   horizon averaged over 40 starts (open-loop rollout against one-step error).
 * - `CartpoleErrorPlot`: that error plot alone (Coding Skills ▸ checking).
 * - `CartpoleTrajectory` (Coding Skills ▸ rollout): what `rollout(step, s0, forces)` returns, as a strip of poses.
 */
import { useLang } from "@learnkit/web";
import { useEffect, useMemo, useRef, useState } from "react";
import { DT, errorVsHorizon, forcePattern, HALF_LENGTH, learned, rollout, step, type CartState } from "../models/cartpole.ts";
import { DemoButton, Slider } from "../pages/kit.tsx";
import { Axes, COLOR, Legend, makeScale, path, prefersReducedMotion } from "./RolloutPlot.tsx";

const MAX_H = 100;

/** A cart and its pole, drawn at rail position x (m) and angle θ (rad); off-rail carts are pinned to the edge. */
function CartPole({ s, color, toX, railY, scale, ghost = false }: { s: CartState; color: string; toX: (x: number) => number; railY: number; scale: number; ghost?: boolean }) {
  const off = Math.abs(s[0]) > 2.4;
  const x = toX(Math.max(-2.4, Math.min(2.4, s[0])));
  const len = 2 * HALF_LENGTH * scale;
  const tipX = x + len * Math.sin(s[2]);
  const tipY = railY - 10 - len * Math.cos(s[2]);
  const finite = Number.isFinite(tipX) && Number.isFinite(tipY);
  return (
    <g opacity={ghost ? 0.85 : 1}>
      <rect x={x - 22} y={railY - 18} width="44" height="16" rx="3" fill={ghost ? "none" : color} stroke={color} strokeWidth="2" strokeDasharray={ghost ? "4 3" : undefined} />
      {finite && <line x1={x} y1={railY - 10} x2={tipX} y2={tipY} stroke={color} strokeWidth="5" strokeLinecap="round" strokeDasharray={ghost ? "7 4" : undefined} />}
      <circle cx={x} cy={railY - 10} r="3" fill="#fff" stroke={color} />
      {off && (
        <text x={x + (s[0] > 0 ? -26 : 26)} y={railY + 14} fontSize="10" fill={color} textAnchor={s[0] > 0 ? "end" : "start"}>
          {s[0] > 0 ? "→" : "←"} {s[0].toFixed(0)} m
        </text>
      )}
    </g>
  );
}

/** Mean state error against horizon (log scale): open-loop rollout and one-step, with an optional marker at h. */
export function CartpoleErrorPlot({ h }: { h?: number }) {
  const { pick } = useLang();
  const err = useMemo(() => errorVsHorizon(learned, MAX_H), []);
  const ts = Array.from({ length: MAX_H }, (_, i) => i + 1);
  const s = makeScale(360, 210, [0, MAX_H], [1e-6, 1e4], { log: true, pad: { l: 44, r: 10, t: 10, b: 32 } });
  return (
    <div className="w-full max-w-[380px] space-y-1">
      <svg viewBox="0 0 360 210" className="h-auto w-full" role="img" aria-label={pick(["Prediction error against horizon, log scale", "預測誤差對步數（對數刻度）"])}>
        <Axes
          s={s}
          clipId="cp-err-clip"
          xTicks={[0, 25, 50, 75, 100]}
          yTicks={[1e-6, 1e-4, 1e-2, 1, 1e2, 1e4]}
          fmtY={(v) => `10^${Math.round(Math.log10(v))}`.replace("10^0", "1")}
          xLabel={pick(["horizon (steps of 0.02 s)", "步數（每步 0.02 秒）"])}
          yLabel={pick(["mean state error", "平均狀態誤差"])}
        >
          <path d={path(s, ts, ts.map((t) => err.oneStep[t]))} fill="none" stroke={COLOR.second} strokeWidth="2" strokeDasharray="5 3" />
          <path d={path(s, ts, ts.map((t) => err.rollout[t]))} fill="none" stroke={COLOR.model} strokeWidth="2.5" />
          {h !== undefined && <line x1={s.x(h)} x2={s.x(h)} y1={s.top} y2={s.bottom} stroke={COLOR.truth} strokeDasharray="2 3" />}
        </Axes>
      </svg>
      <Legend
        items={[
          { color: COLOR.model, label: pick(["rollout (fed its own predictions)", "推演（餵入自己的預測）"]) },
          { color: COLOR.second, label: pick(["one step (restarted from the truth)", "單步（每步從真實狀態重新開始）"]), dashed: true },
        ]}
      />
    </div>
  );
}

export default function CartpoleDemo() {
  const { pick } = useLang();
  const [h, setH] = useState(30);
  const [theta0, setTheta0] = useState(0.1);
  const [kind, setKind] = useState<"none" | "push">("none");
  const [playing, setPlaying] = useState(false);
  const raf = useRef(0);

  const { truth, model } = useMemo(() => {
    const s0: CartState = [0, 0, theta0, 0];
    const forces = forcePattern(kind, MAX_H);
    return { truth: rollout(step, s0, forces), model: rollout(learned, s0, forces) };
  }, [theta0, kind]);

  useEffect(() => {
    if (!playing) return;
    if (prefersReducedMotion()) {
      setH(MAX_H);
      setPlaying(false);
      return;
    }
    let last = performance.now();
    const tick = (now: number) => {
      if (now - last > 40) {
        last = now;
        setH((v) => {
          if (v >= MAX_H) {
            setPlaying(false);
            return v;
          }
          return v + 1;
        });
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing]);

  const ts = Array.from({ length: h + 1 }, (_, i) => i);
  const sA = makeScale(360, 190, [0, MAX_H], [-7, 7], { pad: { l: 36, r: 10, t: 10, b: 32 } });
  const err = Math.hypot(...truth[h].map((v, i) => v - model[h][i]));
  const toX = (x: number) => 180 + x * 60;

  return (
    <div className="w-full space-y-3">
      <div className="grid items-start gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <svg viewBox="0 0 360 150" className="h-auto w-full max-w-[380px]" role="img" aria-label={pick(["The two cart-poles at the chosen step", "選定步數時的兩台倒單擺小車"])}>
            <line x1="20" x2="340" y1="120" y2="120" stroke="#9ca3af" strokeWidth="2" />
            {[-2, -1, 0, 1, 2].map((x) => (
              <text key={x} x={toX(x)} y="136" fontSize="9" textAnchor="middle" fill={COLOR.muted}>
                {x} m
              </text>
            ))}
            <CartPole s={truth[h]} color={COLOR.truth} toX={toX} railY={120} scale={70} />
            <CartPole s={model[h]} color={COLOR.model} toX={toX} railY={120} scale={70} ghost />
            <text x="10" y="16" fontSize="10" fill={COLOR.muted}>
              t = {(h * DT).toFixed(2)} s · {pick(["error", "誤差"])} {err < 1e3 ? err.toPrecision(2) : err.toExponential(1)}
            </text>
          </svg>
          <svg viewBox="0 0 360 190" className="h-auto w-full max-w-[380px]" role="img" aria-label={pick(["Pole angle over time, true and predicted", "擺桿角度隨時間的變化：真實與預測"])}>
            <Axes
              s={sA}
              clipId="cp-angle-clip"
              xTicks={[0, 25, 50, 75, 100]}
              yTicks={[-6, -3, 0, 3, 6]}
              xLabel={pick(["step", "步數"])}
              yLabel={pick(["pole angle θ (rad)", "擺角 θ（弧度）"])}
            >
              <line x1={sA.x(0)} x2={sA.x(MAX_H)} y1={sA.y(Math.PI)} y2={sA.y(Math.PI)} stroke="#d1d5db" strokeDasharray="2 3" />
              <path d={path(sA, ts, ts.map((t) => truth[t][2]))} fill="none" stroke={COLOR.truth} strokeWidth="2.5" />
              <path d={path(sA, ts, ts.map((t) => Math.max(-50, Math.min(50, model[t][2]))))} fill="none" stroke={COLOR.model} strokeWidth="2.5" strokeDasharray="6 3" />
            </Axes>
            <text x={sA.right - 2} y={sA.y(Math.PI) - 3} fontSize="9" textAnchor="end" fill={COLOR.muted}>
              {pick(["θ = π: hanging down", "θ = π：垂下"])}
            </text>
          </svg>
          <Legend
            items={[
              { color: COLOR.truth, label: pick(["true simulator", "真實模擬器"]) },
              { color: COLOR.model, label: pick(["learned linear model", "學到的線性模型"]), dashed: true },
            ]}
          />
        </div>
        <div className="flex flex-col items-center gap-1">
          <p className="text-xs font-semibold text-gray-700">{pick(["Error against horizon, 40 starts", "誤差對步數（40 個起點平均）"])}</p>
          <CartpoleErrorPlot h={h} />
        </div>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Slider label={["Horizon $H$ (steps)", "預測步數 $H$"]} value={h} min={1} max={MAX_H} onChange={(v) => { setPlaying(false); setH(v); }} />
        <Slider label={["Start angle $\\theta_0$", "起始角度 $\\theta_0$"]} value={theta0} min={0.02} max={0.3} step={0.01} onChange={setTheta0} format={(v) => `${v.toFixed(2)} rad`} />
        <div className="flex flex-wrap justify-center gap-2">
          <DemoButton active={kind === "none"} onClick={() => setKind("none")}>
            {pick(["No force", "不施力"])}
          </DemoButton>
          <DemoButton active={kind === "push"} onClick={() => setKind("push")}>
            {pick(["Push ±5 N every 0.5 s", "每 0.5 秒交替推 ±5 N"])}
          </DemoButton>
          <DemoButton onClick={() => { if (h >= MAX_H) setH(1); setPlaying((p) => !p); }} active={playing}>
            {playing ? pick(["Pause", "暫停"]) : pick(["▶ Play", "▶ 播放"])}
          </DemoButton>
        </div>
      </div>
    </div>
  );
}

/** Coding Skills ▸ rollout: the states `rollout(step, s0, forces)` returns, every 5th drawn as a pose along time. */
export function CartpoleTrajectory() {
  const { pick } = useLang();
  const [h, setH] = useState(40);
  const states = useMemo(() => rollout(step, [0, 0, 0.1, 0], forcePattern("push", 100)), []);
  const shown = states.slice(0, h + 1).filter((_, i) => i % 5 === 0);
  return (
    <div className="w-full space-y-2">
      <svg viewBox="0 0 360 120" className="mx-auto h-auto w-full max-w-[420px]" role="img" aria-label={pick(["A strip of cart-pole poses over time", "倒單擺小車隨時間的一排姿態"])}>
        <line x1="10" x2="350" y1="96" y2="96" stroke="#d1d5db" />
        {shown.map((s, k) => {
          const x = 18 + k * 16;
          const len = 40;
          return (
            <g key={k} opacity={0.35 + (0.65 * (k + 1)) / shown.length}>
              <rect x={x - 5} y="90" width="10" height="6" fill={COLOR.truth} />
              <line x1={x} y1="90" x2={x + len * Math.sin(s[2])} y2={90 - len * Math.cos(s[2])} stroke={COLOR.truth} strokeWidth="2.5" strokeLinecap="round" />
            </g>
          );
        })}
        <text x="10" y="114" fontSize="9" fill={COLOR.muted}>
          {pick(["poses every 5 steps (0.1 s); the pole falls and swings under the pushes", "每 5 步（0.1 秒）畫一個姿態；擺桿在推力下倒下並擺盪"])}
        </text>
      </svg>
      <div className="flex justify-center">
        <Slider label={["`forces.length`", "`forces.length`"]} value={h} min={5} max={100} step={5} onChange={setH} />
      </div>
      <p className="text-center font-mono text-[11px] text-gray-600">
        states[{h}] = [{states[h].map((v) => v.toFixed(3)).join(", ")}]
      </p>
    </div>
  );
}
