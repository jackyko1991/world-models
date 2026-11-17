/**
 * The JEPA toy (src/models/jepaToy.ts): 48 points embedded in 2-D by a linear encoder trained to predict each
 * point's second view from its first. Step or play gradient descent; switch VICReg's anti-collapse terms on and off at
 * any time and watch the cloud collapse or spread. Gray rings: embeddings of the second views (the targets); amber
 * dots: the predictor's guesses from the first views.
 */
import { useLang } from "@learnkit/web";
import { useEffect, useMemo, useRef, useState } from "react";
import { embed, initState, makeData, spread, trainStep, type ToyState } from "../models/jepaToy.ts";
import { DemoButton } from "../pages/kit.tsx";

const MAX_STEPS = 400;
const LIM = 4;
const VB = 240;
const at = (v: number, flip = false) => ((flip ? LIM - v : v + LIM) / (2 * LIM)) * VB;

export default function JepaCollapse() {
  const { pick } = useLang();
  const data = useMemo(() => makeData(), []);
  const [state, setState] = useState<ToyState>(() => initState());
  const [anti, setAnti] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [history, setHistory] = useState<{ v: number; anti: boolean }[]>(() => [{ v: spread(initState(), data), anti: false }]);
  const [loss, setLoss] = useState<number | null>(null);
  const live = useRef({ state, anti });
  live.current = { state, anti };

  const advance = (n: number) => {
    let s = live.current.state;
    const add: { v: number; anti: boolean }[] = [];
    let last = 0;
    for (let i = 0; i < n && s.step < MAX_STEPS; i++) {
      const r = trainStep(s, data, { antiCollapse: live.current.anti });
      s = r.state;
      last = r.prediction;
      add.push({ v: spread(s, data), anti: live.current.anti });
    }
    if (!add.length) return false;
    setState(s);
    setLoss(last);
    setHistory((h) => [...h, ...add]);
    return s.step < MAX_STEPS;
  };

  useEffect(() => {
    if (!playing) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let id = 0;
    const tick = () => {
      const more = advance(reduce ? 25 : 2);
      if (more) id = requestAnimationFrame(tick);
      else setPlaying(false);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  const reset = () => {
    const s = initState();
    setPlaying(false);
    setState(s);
    setLoss(null);
    setHistory([{ v: spread(s, data), anti }]);
  };

  const { zp, pred } = embed(state, data);
  const v = history[history.length - 1].v;
  const vmax = 3;
  const W = 240;
  const H = 90;
  const px = (i: number) => (i / MAX_STEPS) * W;
  const py = (val: number) => H - (Math.min(val, vmax) / vmax) * (H - 6);

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <DemoButton active={anti} onClick={() => setAnti(!anti)}>
          {anti ? pick(["Anti-collapse term: on", "防塌縮項：開"]) : pick(["Anti-collapse term: off", "防塌縮項：關"])}
        </DemoButton>
        <DemoButton onClick={() => setPlaying(!playing)}>{playing ? pick(["❚❚ Pause", "❚❚ 暫停"]) : pick(["▶ Play", "▶ 播放"])}</DemoButton>
        <DemoButton onClick={() => advance(1)}>{pick(["Step", "走一步"])}</DemoButton>
        <DemoButton onClick={() => advance(25)}>{pick(["+25 steps", "+25 步"])}</DemoButton>
        <DemoButton onClick={reset}>{pick(["Reset", "重設"])}</DemoButton>
      </div>
      <div className="flex w-full flex-wrap items-start justify-center gap-4">
        <svg
          viewBox={`0 0 ${VB} ${VB}`}
          className="h-auto w-full max-w-[280px] rounded-md border border-gray-300 bg-white"
          role="img"
          aria-label={pick([
            `Embeddings after ${state.step} steps; total variance ${v.toFixed(3)}`,
            `${state.step} 步之後的嵌入；總變異數 ${v.toFixed(3)}`,
          ])}
        >
          <line x1={0} y1={VB / 2} x2={VB} y2={VB / 2} className="stroke-gray-200" />
          <line x1={VB / 2} y1={0} x2={VB / 2} y2={VB} className="stroke-gray-200" />
          {pred.map((p, i) => (
            <line key={`l${i}`} x1={at(p[0])} y1={at(p[1], true)} x2={at(zp[i][0])} y2={at(zp[i][1], true)} className="stroke-amber-300" strokeWidth={0.8} />
          ))}
          {zp.map((p, i) => {
            const [x, y] = [at(p[0]), at(p[1], true)];
            const c = data.cluster[i];
            return c === 0 ? (
              <circle key={`t${i}`} cx={x} cy={y} r={3.6} className="fill-none stroke-gray-700" strokeWidth={1.2} />
            ) : c === 1 ? (
              <rect key={`t${i}`} x={x - 3.2} y={y - 3.2} width={6.4} height={6.4} className="fill-none stroke-gray-700" strokeWidth={1.2} />
            ) : (
              <path key={`t${i}`} d={`M${x},${y - 4} L${x + 3.6},${y + 2.6} L${x - 3.6},${y + 2.6} Z`} className="fill-none stroke-gray-700" strokeWidth={1.2} />
            );
          })}
          {pred.map((p, i) => (
            <circle key={`p${i}`} cx={at(p[0])} cy={at(p[1], true)} r={1.8} className="fill-(--lk-accent)" />
          ))}
        </svg>
        <div className="flex flex-col gap-1 text-xs text-gray-600">
          <p className="font-medium text-gray-700">{pick(["Spread of the embeddings, Var z₁ + Var z₂", "嵌入的散布：Var z₁ + Var z₂"])}</p>
          <svg viewBox={`-2 0 ${W + 4} ${H + 2}`} className="h-auto w-full max-w-[260px] rounded border border-gray-200 bg-white" aria-hidden>
            <line x1={0} y1={py(2)} x2={W} y2={py(2)} className="stroke-gray-200" strokeDasharray="3 3" />
            {history.slice(1).map((h, i) => (
              <line key={i} x1={px(i)} y1={py(history[i].v)} x2={px(i + 1)} y2={py(h.v)} stroke={h.anti ? "#0284c7" : "#374151"} strokeWidth={1.5} />
            ))}
          </svg>
          <p className="font-mono tabular-nums">
            {pick(["step", "步數"])} {state.step}/{MAX_STEPS} · {pick(["spread", "散布"])} {v < 1e-3 ? v.toExponential(1) : v.toFixed(3)}
            {loss !== null && (
              <>
                {" "}
                · {pick(["prediction loss", "預測損失"])} {loss < 1e-3 ? loss.toExponential(1) : loss.toFixed(3)}
              </>
            )}
          </p>
          <p className="text-[11px]">
            <span className="text-gray-700">━</span> {pick(["term off", "防塌縮項關"])} <span className="text-sky-600">━</span> {pick(["term on", "防塌縮項開"])}{" "}
            <span className="text-gray-400">┅</span> {pick(["2 = two dimensions at σ = γ = 1", "2 = 兩個維度都在 σ = γ = 1"])}
          </p>
          <p className="text-[11px]">
            <span className="text-gray-700">○□△</span> {pick(["targets z′ (three clusters)", "目標 z′（三個群）"])} ·{" "}
            <span className="text-(--lk-accent)">●</span> {pick(["predictions A z + b", "預測 A z + b"])}
          </p>
        </div>
      </div>
    </div>
  );
}
