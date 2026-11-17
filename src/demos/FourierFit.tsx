/**
 * Spectral bias (Concepts ▸ 3D scene models ▸ NeRF): the same small MLP fitted to a 1-D signal, once on x itself
 * (sky) and once on Fourier features γ(x) (amber), against the target (gray). A slider steps through training
 * snapshots precomputed by scripts/fourier_fit.py; bars show how much of each frequency each network has recovered.
 */
import { RichText, useLang } from "@learnkit/web";
import { useEffect, useRef, useState } from "react";
import { DemoButton, Slider } from "../pages/kit.tsx";
import { mse, recovered, type FourierFitData } from "../models/fourierFit.ts";

const AMBER = "#b45309";
const SKY = "#0284c7";
const GRAY = "#374151";
const W = 480;
const H = 200;

export default function FourierFit() {
  const { pick } = useLang();
  const [data, setData] = useState<FourierFitData | null>(null);
  const [failed, setFailed] = useState(false);
  const [k, setK] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    let live = true;
    fetch(`${import.meta.env.BASE_URL}models/fourier-fit.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: FourierFitData) => {
        if (!live) return;
        setData(d);
        setK(Math.min(d.steps.length - 1, d.steps.findIndex((s) => s >= 60)));
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!playing || !data) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setK(data.steps.length - 1);
      setPlaying(false);
      return;
    }
    timer.current = window.setInterval(() => {
      setK((x) => {
        if (x >= data.steps.length - 1) {
          setPlaying(false);
          return x;
        }
        return x + 1;
      });
    }, 160);
    return () => {
      if (timer.current !== null) window.clearInterval(timer.current);
    };
  }, [playing, data]);

  if (failed) return <p className="text-xs text-gray-500">{pick(["Could not load the training snapshots.", "無法載入訓練快照。"])}</p>;
  if (!data) return <p className="text-xs text-gray-500">{pick(["Loading training snapshots…", "正在載入訓練快照……"])}</p>;

  const px = (i: number) => 8 + (i / (data.grid - 1)) * (W - 16);
  const py = (y: number) => H / 2 - y * 52;
  const path = (ys: number[]) => ys.map((y, i) => `${i ? "L" : "M"}${px(i).toFixed(1)},${py(y).toFixed(1)}`).join(" ");
  const plain = data.runs.plain.predictions[k];
  const fourier = data.runs.fourier.predictions[k];
  const rp = recovered(data, plain);
  const rf = recovered(data, fourier);

  return (
    <div className="w-full max-w-[520px] space-y-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full rounded border border-gray-200 bg-white" role="img" aria-label={pick(["Target signal and the two networks' fits", "目標訊號與兩個網路的擬合"])}>
        <line x1={0} y1={py(0)} x2={W} y2={py(0)} stroke="#e5e7eb" />
        <path d={path(data.target)} fill="none" stroke={GRAY} strokeWidth={2.5} opacity={0.45} />
        <path d={path(plain)} fill="none" stroke={SKY} strokeWidth={1.6} />
        <path d={path(fourier)} fill="none" stroke={AMBER} strokeWidth={1.6} />
        <g fontSize={11}>
          <text x={10} y={16} fill={GRAY}>{pick(["target", "目標"])}</text>
          <text x={60} y={16} fill={SKY}>{pick(["MLP on x", "以 x 為輸入的 MLP"])}</text>
          <text x={W - 10} y={16} fill={AMBER} textAnchor="end">{pick(["MLP on γ(x)", "以 γ(x) 為輸入的 MLP"])}</text>
        </g>
      </svg>

      <div className="grid grid-cols-[auto_1fr_1fr] items-center gap-x-2 gap-y-1 text-xs text-gray-700">
        <span />
        <span style={{ color: SKY }}>{pick(["on x", "輸入 x"])}</span>
        <span style={{ color: AMBER }}>{pick(["on γ(x)", "輸入 γ(x)"])}</span>
        {data.components.map((c, i) => (
          <Row key={c.cycles} label={pick([`${c.cycles} cycle${c.cycles > 1 ? "s" : ""}`, `${c.cycles} 個週期`])} a={rp[i]} b={rf[i]} />
        ))}
        <span>{pick(["error (MSE)", "誤差（MSE）"])}</span>
        <span className="font-mono">{mse(plain, data.target).toExponential(1)}</span>
        <span className="font-mono">{mse(fourier, data.target).toExponential(1)}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Slider label={["training step", "訓練步數"]} value={k} min={0} max={data.steps.length - 1} onChange={(v) => { setPlaying(false); setK(v); }} format={(v) => String(data.steps[v])} />
        <DemoButton onClick={() => { if (k >= data.steps.length - 1) setK(0); setPlaying((p) => !p); }} active={playing}>
          {playing ? pick(["❚❚ pause", "❚❚ 暫停"]) : pick(["▶ train", "▶ 訓練"])}
        </DemoButton>
      </div>
      <p className="text-[11px] text-gray-500">
        <RichText
          text={pick([
            `Bars: how much of each frequency the fit has recovered (1 − its amplitude in the error). Both networks: ${data.train.depth} hidden ReLU layers of ${data.train.width}, Adam, ${data.train.n} training points, the same seed; $\\gamma$ uses $L = ${data.runs.fourier.frequencies}$.`,
            `長條：擬合已取回每個頻率的多少（1 − 誤差中該頻率的振幅）。兩個網路都是 ${data.train.depth} 層、每層 ${data.train.width} 個單元的 ReLU 隱藏層，Adam，${data.train.n} 個訓練點，相同的亂數種子；$\\gamma$ 使用 $L = ${data.runs.fourier.frequencies}$。`,
          ])}
        />
      </p>
    </div>
  );
}

function Row({ label, a, b }: { label: string; a: number; b: number }) {
  const bar = (v: number, colour: string) => (
    <span className="flex items-center gap-1.5">
      <span className="h-2.5 flex-1 rounded-sm bg-gray-100">
        <span className="block h-2.5 rounded-sm" style={{ width: `${Math.round(v * 100)}%`, background: colour }} />
      </span>
      <span className="w-8 text-right font-mono tabular-nums">{Math.round(v * 100)}%</span>
    </span>
  );
  return (
    <>
      <span>{label}</span>
      {bar(a, SKY)}
      {bar(b, AMBER)}
    </>
  );
}
