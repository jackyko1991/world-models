/**
 * Concepts ▸ Limits ▸ rollout error e(H): true trajectories (gray) and the model's open-loop rollouts (amber) that
 * start from the same state ŝ_t = s_t and step with f_θ; the gap is measured at the horizon t + H, and averaging it over
 * N starts gives e(H), which the inset shows growing with H. Made-up curves, drawn to show the idea.
 */
import { useLang } from "@learnkit/web";
import { AMBER, AMBER_FILL, FAINT, GRAY, LIGHT, Note, SERIF, Sym } from "./RepresentationParts.tsx";

const K = 5; // the horizon H, in steps
const X0 = 26, DX = 32;
const px = (k: number) => X0 + k * DX;

/** Three start states: a true path and a drift that grows with the step count. */
const PAIRS = [
  { truth: (k: number) => 48 - 18 * Math.sin(0.55 * k), drift: (k: number) => 2.0 * k ** 1.5, bold: true },
  { truth: (k: number) => 104 + 14 * Math.sin(0.5 * k + 0.8), drift: (k: number) => -1.4 * k ** 1.5, bold: false },
  { truth: (k: number) => 140 - 3 * k, drift: (k: number) => 0.9 * k ** 1.5, bold: false },
];
const steps = Array.from({ length: K + 1 }, (_, k) => k);
const line = (f: (k: number) => number) => steps.map((k) => `${px(k)},${f(k).toFixed(1)}`).join(" ");
const e = (h: number) => PAIRS.reduce((a, p) => a + Math.abs(p.drift(h)), 0) / PAIRS.length;

export default function LimitsRollout() {
  const { pick } = useLang();
  const b = PAIRS[0], xH = px(K);
  const yT = b.truth(K), yP = b.truth(K) + b.drift(K);
  // inset: e(H) for H = 0..K
  const ix = (h: number) => 236 + h * 15, iy = (v: number) => 156 - v * 3;
  return (
    <svg
      viewBox="0 0 320 180"
      className="h-auto w-full max-w-[340px]"
      role="img"
      aria-label={pick([
        "Three gray true trajectories and three amber predicted ones. Each prediction starts on its true state at time t and is stepped forward by the learned model f_θ without correction, so it drifts away. At the horizon t + H a bracket measures the gap between predicted and true state. A small inset plots e(H), the average of that gap, rising as H grows.",
        "三條灰色的真實軌跡與三條琥珀色的預測軌跡。每條預測都從時間 t 的真實狀態出發，由學出的模型 f_θ 一步步往前推、不經修正，因此逐漸偏離。在視野 t + H 處，一個括號量出預測狀態與真實狀態的差距。小圖畫出這個差距的平均 e(H)，隨 H 增大而上升。",
      ])}
    >
      {/* time axis and the horizon */}
      <line x1={X0 - 6} y1={152} x2={xH + 14} y2={152} stroke={LIGHT} />
      {steps.map((k) => <line key={k} x1={px(k)} y1={150} x2={px(k)} y2={154} stroke={LIGHT} />)}
      <Sym x={px(0)} y={168} main="t" size={13} anchor="middle" />
      <Sym x={xH} y={168} main="t" rest=" + H" size={13} anchor="middle" />
      <line x1={xH} y1={14} x2={xH} y2={150} stroke={LIGHT} strokeDasharray="3 3" />

      {PAIRS.map((p, i) => {
        const o = p.bold ? 1 : 0.4;
        return (
          <g key={i} opacity={o}>
            <polyline points={line(p.truth)} fill="none" stroke={GRAY} strokeWidth={p.bold ? 2 : 1.5} />
            <polyline points={line((k) => p.truth(k) + p.drift(k))} fill="none" stroke={AMBER} strokeWidth={p.bold ? 2 : 1.5} strokeDasharray={p.bold ? undefined : "4 2"} />
            {steps.map((k) => (
              <g key={k}>
                <circle cx={px(k)} cy={p.truth(k)} r={2.4} fill={GRAY} />
                {k > 0 && <circle cx={px(k)} cy={p.truth(k) + p.drift(k)} r={2.6} fill={AMBER_FILL} stroke={AMBER} />}
              </g>
            ))}
          </g>
        );
      })}

      {/* labels on the bold pair */}
      <text x={px(0) - 4} y={b.truth(0) + 18} fontFamily={SERIF} fontStyle="italic" fontSize={12} fill={GRAY}>
        ŝ<tspan dy={4} fontSize={11}>t</tspan>
        <tspan dy={-4}> = s</tspan>
        <tspan dy={4} fontSize={11}>t</tspan>
      </text>
      <Sym x={px(1) + 20} y={b.truth(2) + b.drift(2) + 20} main="f" sub="θ" size={12} fill={AMBER} />
      <Sym x={px(3) + 4} y={b.truth(3) - 8} main="s" size={12} />
      <Sym x={px(3) - 4} y={b.truth(3) + b.drift(3) + 18} main="ŝ" size={12} fill={AMBER} />

      {/* the gap at the horizon */}
      <path d={`M${xH + 4},${yT} h4 V${yP} h-4`} fill="none" stroke={GRAY} strokeWidth={1.2} />
      <Sym x={xH + 11} y={(yT + yP) / 2 + 5} main="‖ŝ − s‖" size={13} />

      {/* inset: e(H) grows with H */}
      <rect x={226} y={96} width={90} height={74} rx={4} fill="white" stroke={FAINT} />
      <line x1={234} y1={156} x2={312} y2={156} stroke={LIGHT} />
      <line x1={234} y1={156} x2={234} y2={104} stroke={LIGHT} />
      <polyline points={steps.map((h) => `${ix(h)},${iy(e(h)).toFixed(1)}`).join(" ")} fill="none" stroke={AMBER} strokeWidth={1.6} />
      <circle cx={ix(K)} cy={iy(e(K))} r={3} fill={AMBER_FILL} stroke={AMBER} />
      <Sym x={240} y={114} main="e" rest="(H)" size={12} fill={AMBER} />
      <Sym x={310} y={168} main="H" size={12} anchor="end" />
      <Note x={xH - 4} y={10} size={11} anchor="end">{pick([`N = ${PAIRS.length} starts`, `N = ${PAIRS.length} 個起點`])}</Note>
    </svg>
  );
}
