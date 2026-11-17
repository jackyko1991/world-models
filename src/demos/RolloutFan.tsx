/**
 * The fan of rollouts (Concepts ▸ uncertainty): from one start, the true world (noisy), a deterministic model (one
 * line), a stochastic model (its learned noise only) and an ensemble of K models (PETS-style trajectory sampling).
 * Below, the members' predicted change Δ̂(x) against x, with the training data marked: they agree on the data and
 * part company beyond it. Also `RolloutCalibration` (Coding Skills ▸ checking): a reliability plot from the ensemble.
 */
import { useLang } from "@learnkit/web";
import { useMemo, useState } from "react";
import { DATA_RANGE, dataset, drift, fan, fitEnsemble, predictDelta, reliability, type FanKind } from "../models/ensemble.ts";
import { DemoButton, Slider } from "../pages/kit.tsx";
import { Axes, COLOR, Legend, makeScale, path } from "./RolloutPlot.tsx";

const H = 25;
const X0 = 0.5;
const MEMBER_COLORS = ["#b45309", "#0284c7", "#7c3aed", "#059669", "#db2777"];

export default function RolloutFan() {
  const { pick } = useLang();
  const [kind, setKind] = useState<FanKind>("ensemble");
  const [paths, setPaths] = useState(20);
  const [seed, setSeed] = useState(1);
  const [showTrue, setShowTrue] = useState(true);
  const ens = useMemo(() => fitEnsemble(), []);
  const data = useMemo(() => dataset(), []);
  const lines = useMemo(() => fan(kind, ens, X0, H, paths, seed), [kind, ens, paths, seed]);
  const truth = useMemo(() => fan("true", ens, X0, H, paths, seed + 1000), [ens, paths, seed]);
  const ts = Array.from({ length: H + 1 }, (_, i) => i);

  const s = makeScale(380, 230, [0, H], [0, 9], { pad: { l: 36, r: 10, t: 10, b: 32 } });
  const d = makeScale(380, 170, [0, 9], [-0.6, 1.2], { pad: { l: 36, r: 10, t: 10, b: 32 } });
  const xs = Array.from({ length: 181 }, (_, i) => i * 0.05);

  const modes: { k: FanKind; label: [string, string] }[] = [
    { k: "deterministic", label: ["Deterministic", "確定性"] },
    { k: "stochastic", label: ["Stochastic", "隨機"] },
    { k: "ensemble", label: ["Ensemble (K = 5)", "集成（K = 5）"] },
  ];
  const note: Record<FanKind, [string, string]> = {
    true: ["", ""],
    deterministic: [
      "One model, its mean prediction only: a single confident line, which stalls where the model wrongly predicts no motion.",
      "一個模型，只取平均預測：一條很有把握的線，在模型誤以為不會再動的地方停住。",
    ],
    stochastic: [
      "The same model plus its learned noise: the spread is the world's noise (aleatoric). It stays narrow beyond the data, so the model is confidently wrong.",
      "同一個模型加上它學到的雜訊：散開的程度是世界的雜訊（偶然性）。超出資料後它仍然很窄，所以模型錯得很有把握。",
    ],
    ensemble: [
      "Five models fitted to resampled data, each path following one of them (colour = member). On the data they agree; beyond x = 3 they disagree (epistemic).",
      "五個用重抽樣資料擬合的模型，每條路徑跟隨其中一個（顏色代表成員）。在資料範圍內它們一致；超過 x = 3 之後開始分歧（認知性）。",
    ],
  };

  return (
    <div className="w-full space-y-3">
      <div className="flex flex-wrap justify-center gap-2" role="group" aria-label={pick(["Kind of model", "模型種類"])}>
        {modes.map((m) => (
          <DemoButton key={m.k} active={kind === m.k} onClick={() => setKind(m.k)}>
            {pick(m.label)}
          </DemoButton>
        ))}
        <DemoButton active={showTrue} onClick={() => setShowTrue((v) => !v)}>
          {pick(["Show the true world", "顯示真實世界"])}
        </DemoButton>
        <DemoButton onClick={() => setSeed((v) => v + 1)}>{pick(["Resample", "重新取樣"])}</DemoButton>
      </div>
      <div className="grid items-start gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <svg viewBox="0 0 380 230" className="h-auto w-full max-w-[400px]" role="img" aria-label={pick(["Fan of rollouts: state against step", "推演扇形：狀態對步數"])}>
            <Axes s={s} clipId="fan-clip" xTicks={[0, 5, 10, 15, 20, 25]} yTicks={[0, 3, 6, 9]} xLabel={pick(["step", "步數"])} yLabel={pick(["state x", "狀態 x"])}>
              <rect x={s.left} y={s.y(DATA_RANGE[1])} width={s.right - s.left} height={s.y(DATA_RANGE[0]) - s.y(DATA_RANGE[1])} fill={COLOR.second} opacity="0.08" />
              {showTrue && truth.map((p, i) => <path key={`t${i}`} d={path(s, ts, p.xs)} fill="none" stroke={COLOR.truth} strokeWidth="1" opacity="0.35" />)}
              {lines.map((p, i) => (
                <path
                  key={i}
                  d={path(s, ts, p.xs)}
                  fill="none"
                  stroke={kind === "ensemble" ? MEMBER_COLORS[p.member] : COLOR.model}
                  strokeWidth={kind === "deterministic" ? 2.5 : 1.3}
                  opacity={kind === "deterministic" ? 1 : 0.75}
                />
              ))}
            </Axes>
            <text x={s.left + 4} y={s.y(DATA_RANGE[1]) + 12} fontSize="9" fill={COLOR.second}>
              {pick(["states seen in training", "訓練中見過的狀態"])}
            </text>
          </svg>
          <Legend
            items={[
              ...(showTrue ? [{ color: COLOR.truth, label: pick(["true world (noisy)", "真實世界（有雜訊）"]) }] : []),
              { color: COLOR.model, label: pick(["model rollouts", "模型推演"]) },
            ]}
          />
        </div>
        <div className="space-y-1">
          <svg viewBox="0 0 380 170" className="h-auto w-full max-w-[400px]" role="img" aria-label={pick(["Each member's predicted change against x", "每個成員預測的變化量對 x"])}>
            <Axes s={d} clipId="fan-delta-clip" xTicks={[0, 3, 6, 9]} yTicks={[-0.5, 0, 0.5, 1]} xLabel={pick(["state x", "狀態 x"])} yLabel={pick(["change Δ per step", "每步變化 Δ"])}>
              <rect x={d.x(DATA_RANGE[0])} y={d.top} width={d.x(DATA_RANGE[1]) - d.x(DATA_RANGE[0])} height={d.bottom - d.top} fill={COLOR.second} opacity="0.08" />
              {data.xs.map((x, i) => (
                <circle key={i} cx={d.x(x)} cy={d.y(data.ys[i])} r="1.6" fill={COLOR.second} opacity="0.6" />
              ))}
              <path d={path(d, xs, xs.map(drift))} fill="none" stroke={COLOR.truth} strokeWidth="2" />
              {(kind === "ensemble" ? ens.members : ens.members.slice(0, 1)).map((m, k) => (
                <path key={k} d={path(d, xs, xs.map((x) => predictDelta(m, x)))} fill="none" stroke={kind === "ensemble" ? MEMBER_COLORS[k] : COLOR.model} strokeWidth="1.5" />
              ))}
            </Axes>
          </svg>
          <Legend
            items={[
              { color: COLOR.truth, label: pick(["true mean change", "真實的平均變化"]) },
              { color: COLOR.second, label: pick(["training data", "訓練資料"]) },
            ]}
          />
        </div>
      </div>
      <div className="flex justify-center">
        <Slider label={["Sampled paths", "取樣路徑數"]} value={paths} min={5} max={40} step={5} onChange={setPaths} />
      </div>
      <p className="text-center text-xs text-gray-700" aria-live="polite">
        {pick(note[kind])}
      </p>
    </div>
  );
}

/** Reliability plot: observed coverage of the central p-interval against p, in the data and beyond it. */
export function RolloutCalibration() {
  const { pick } = useLang();
  const [where, setWhere] = useState<"in" | "out">("out");
  const ens = useMemo(() => fitEnsemble(), []);
  const range = (): [number, number] => (where === "in" ? DATA_RANGE : [3, 6]);
  const ale = useMemo(() => reliability(ens, "aleatoric", range()), [ens, where]);
  const tot = useMemo(() => reliability(ens, "total", range()), [ens, where]);
  const s = makeScale(300, 260, [0, 1], [0, 1], { pad: { l: 40, r: 12, t: 10, b: 34 } });
  const lv = [0, ...ale.levels, 1];
  return (
    <div className="w-full max-w-[340px] space-y-2">
      <div className="flex flex-wrap justify-center gap-2">
        <DemoButton active={where === "in"} onClick={() => setWhere("in")}>
          {pick(["Test inside the data (x in 0–3)", "在資料內測試（x 在 0–3）"])}
        </DemoButton>
        <DemoButton active={where === "out"} onClick={() => setWhere("out")}>
          {pick(["Beyond it (x in 3–6)", "超出資料（x 在 3–6）"])}
        </DemoButton>
      </div>
      <svg viewBox="0 0 300 260" className="h-auto w-full" role="img" aria-label={pick(["Reliability plot", "可靠度圖"])}>
        <Axes
          s={s}
          clipId="calib-clip"
          xTicks={[0, 0.5, 1]}
          yTicks={[0, 0.5, 1]}
          xLabel={pick(["interval's nominal probability p", "區間的標稱機率 p"])}
          yLabel={pick(["fraction of outcomes inside", "結果落在區間內的比例"])}
        >
          <line x1={s.x(0)} y1={s.y(0)} x2={s.x(1)} y2={s.y(1)} stroke={COLOR.truth} strokeDasharray="3 3" />
          <path d={path(s, lv, [0, ...ale.observed, 1])} fill="none" stroke={COLOR.model} strokeWidth="2.5" />
          <path d={path(s, lv, [0, ...tot.observed, 1])} fill="none" stroke={COLOR.second} strokeWidth="2.5" />
          {ale.levels.map((p, i) => (
            <g key={p}>
              <circle cx={s.x(p)} cy={s.y(ale.observed[i])} r="3" fill={COLOR.model} />
              <circle cx={s.x(p)} cy={s.y(tot.observed[i])} r="3" fill={COLOR.second} />
            </g>
          ))}
        </Axes>
        <text x={s.x(0.62)} y={s.y(0.55)} fontSize="9" fill={COLOR.truth} transform={`rotate(-41 ${s.x(0.62)} ${s.y(0.55)})`}>
          {pick(["perfectly calibrated", "完美校準"])}
        </text>
      </svg>
      <Legend
        items={[
          { color: COLOR.model, label: pick([`noise only (error ${ale.error.toFixed(2)})`, `只有雜訊（誤差 ${ale.error.toFixed(2)}）`]) },
          { color: COLOR.second, label: pick([`noise + disagreement (error ${tot.error.toFixed(2)})`, `雜訊 + 分歧（誤差 ${tot.error.toFixed(2)}）`]) },
        ]}
      />
    </div>
  );
}
