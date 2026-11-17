/**
 * Pictures for the equations of Concepts ▸ What is a world model? (#/concept/foundations): each one draws what its
 * equation means physically, labelled with the equation's own symbols. Static SVGs, 320 × 180 viewBox.
 * Also exports the small drawing helpers (Tx, bell, arrowMarker) used by ModelsPictures and CheckingPictures.
 */
import { useLang } from "@learnkit/web";
import type { ReactNode } from "react";

export const INK = "#111827";
export const GRAY = "#374151";
export const MUTED = "#6b7280";
export const AMBER = "#b45309";
export const AMBER_L = "#f59e0b";
export const AMBER_FILL = "#fde68a";
export const SKY = "#0284c7";
export const SERIF = "Georgia, 'Times New Roman', serif";
export const SANS = "ui-sans-serif, system-ui, sans-serif";
export const SVG_CLASS = "h-auto w-full max-w-[340px]";

/** Split "p(s_{t+1} | s_t)" into tspans with sub/superscripts (`_x`, `_{xy}`, `^x`, `^{xy}`). */
function mathParts(t: string, size: number): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /([_^])(\{[^}]*\}|.)/g;
  let off = 0;
  let last = 0;
  let k = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) {
    if (m.index > last) {
      out.push(<tspan key={k++} dy={-off} fontSize={size}>{t.slice(last, m.index)}</tspan>);
      off = 0;
    }
    const body = m[2].startsWith("{") ? m[2].slice(1, -1) : m[2];
    const target = m[1] === "_" ? size * 0.3 : -size * 0.42;
    out.push(<tspan key={k++} dy={target - off} fontSize={Math.max(11, size * 0.8)}>{body}</tspan>);
    off = target;
    last = m.index + m[0].length;
  }
  if (last < t.length) out.push(<tspan key={k++} dy={-off} fontSize={size}>{t.slice(last)}</tspan>);
  return out;
}

/** A label: serif italic maths by default (`t` may contain _sub and ^sup), or sans words with `word`. */
export function Tx({
  x,
  y,
  t,
  size = 14,
  fill = INK,
  anchor = "middle",
  word = false,
  weight,
}: {
  x: number;
  y: number;
  t: string;
  size?: number;
  fill?: string;
  anchor?: "start" | "middle" | "end";
  word?: boolean;
  weight?: number;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fontFamily={word ? SANS : SERIF}
      fontStyle={word ? "normal" : "italic"}
      fontSize={size}
      fontWeight={weight}
      fill={fill}
    >
      {word ? t : mathParts(t, size)}
    </text>
  );
}

/** An arrowhead marker; give each a page-unique id. */
export function arrowMarker(id: string, color: string, size = 7) {
  return (
    <marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth={size} markerHeight={size} orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill={color} />
    </marker>
  );
}

/** A Gaussian bump with mean `mu`, s.d. `sigma` (both in px), peak height `peak` above the baseline `base`. */
export function bellY(x: number, mu: number, sigma: number, peak: number, base: number) {
  return base - peak * Math.exp(-((x - mu) ** 2) / (2 * sigma * sigma));
}
export function bell(mu: number, sigma: number, peak: number, base: number, x0: number, x1: number, closed = false, n = 90) {
  const pts: string[] = [];
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    pts.push(`${i === 0 ? "M" : "L"}${x.toFixed(1)},${bellY(x, mu, sigma, peak, base).toFixed(1)}`);
  }
  return pts.join(" ") + (closed ? ` L${x1},${base} L${x0},${base} Z` : "");
}

/** A polyline path through points. */
export function line(pts: [number, number][]) {
  return pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
}

/* ------------------------------------------------------------------------------------------------------------ */

/** s_{t+1} ~ p(·|s_t,a_t), o_t ~ p(o_t|s_t), r_t = r(s_t,a_t): one state, one action, a spread of next states. */
export function TransitionPicture() {
  const { pick } = useLang();
  const from: [number, number] = [146, 78];
  const next = [
    { x: 248, y: 42, p: 0.55 },
    { x: 262, y: 82, p: 0.25 },
    { x: 252, y: 118, p: 0.15 },
    { x: 232, y: 150, p: 0.05 },
  ];
  return (
    <svg
      viewBox="0 0 320 180"
      className={SVG_CLASS}
      role="img"
      aria-label={pick([
        "A state s_t, an action arrow a_t, and four possible next states whose dot sizes show their probabilities; below, the observation o_t the state produces.",
        "狀態 s_t、動作箭頭 a_t，以及四個可能的下一個狀態，圓點大小代表機率；下方是這個狀態產生的觀測 o_t。",
      ])}
    >
      <defs>{arrowMarker("pf-tr-a", INK)}{arrowMarker("pf-tr-g", MUTED, 6)}</defs>
      <Tx x={200} y={16} t="p(s_{t+1} | s_t, a_t)" size={13} fill={AMBER} />
      {next.map((d, i) => (
        <line key={`l${i}`} x1={from[0]} y1={from[1]} x2={d.x} y2={d.y} stroke={AMBER_L} strokeWidth="1" strokeDasharray="3 2" />
      ))}
      {next.map((d, i) => {
        const r = 18 * Math.sqrt(d.p);
        return (
          <g key={`d${i}`}>
            <circle cx={d.x} cy={d.y} r={r} fill={AMBER_L} fillOpacity="0.85" stroke={AMBER} strokeWidth="1.2" />
            <Tx x={d.x + r + 5} y={d.y + 4} t={d.p.toFixed(2)} size={11} fill={AMBER} anchor="start" word />
          </g>
        );
      })}
      <circle cx="52" cy="78" r="18" fill="#e5e7eb" stroke={GRAY} strokeWidth="1.6" />
      <Tx x={52} y={83} t="s_t" fill={GRAY} />
      <line x1="72" y1="78" x2={from[0]} y2={from[1]} stroke={INK} strokeWidth="2" markerEnd="url(#pf-tr-a)" />
      <Tx x={106} y={70} t="a_t" />
      <Tx x={100} y={100} t="r_t = r(s_t, a_t)" size={12} fill={GRAY} />
      <line x1="52" y1="97" x2="52" y2="118" stroke={MUTED} strokeWidth="1.3" strokeDasharray="3 2" markerEnd="url(#pf-tr-g)" />
      <rect x="30" y="121" width="44" height="32" rx="3" fill="#fff" stroke={GRAY} strokeWidth="1.3" />
      <polyline points="33,150 45,134 53,143 59,137 71,150" fill="#d1d5db" stroke={MUTED} strokeWidth="1" />
      <circle cx="64" cy="129" r="3.5" fill={AMBER_L} />
      <Tx x={80} y={142} t="o_t ~ p(o_t | s_t)" size={12} fill={GRAY} anchor="start" />
    </svg>
  );
}

/** ŝ_0 = s_0, ŝ_{t+1} = f̂(ŝ_t, a_t): the model's chain, fed its own outputs; the true states drift off, unseen. */
export function RolloutPicture() {
  const { pick } = useLang();
  const xs = [32, 92, 152, 212, 290];
  const trueY = [110, 66, 56, 42, 24];
  const names = ["0", "1", "2", "3", "H"];
  return (
    <svg
      viewBox="0 0 320 180"
      className={SVG_CLASS}
      role="img"
      aria-label={pick([
        "A chain of predicted states ŝ_0 to ŝ_H, each made by the model f̂ from the previous prediction and an action; the true states, drawn faintly above, are never fed back.",
        "預測狀態 ŝ_0 到 ŝ_H 串成一條鏈，每一個都由模型 f̂ 從上一個預測與一個動作算出；淡淡畫在上方的真實狀態從不回饋進來。",
      ])}
    >
      <defs>{arrowMarker("pf-ro-a", AMBER)}{arrowMarker("pf-ro-k", INK, 6)}</defs>
      <Tx x={8} y={16} t={pick(["true sₜ: never fed back", "真實 sₜ：從不回饋"])} size={11} fill={MUTED} anchor="start" word />
      {xs.slice(1).map((x, i) => (
        <g key={`t${i}`}>
          <circle cx={x} cy={trueY[i + 1]} r="11" fill="none" stroke={MUTED} strokeWidth="1.2" strokeDasharray="3 2" />
          <Tx x={x + 14} y={trueY[i + 1] - 9} t={`s_${names[i + 1]}`} size={12} fill={MUTED} anchor="start" />
        </g>
      ))}
      <polyline points={xs.map((x, i) => `${x},${trueY[i]}`).join(" ")} fill="none" stroke={MUTED} strokeWidth="1" strokeDasharray="2 3" />
      {xs.slice(0, -1).map((x, i) => {
        const x2 = xs[i + 1];
        const last = i === xs.length - 2;
        return (
          <g key={`e${i}`}>
            <line x1={x + 15} y1="110" x2={x2 - 16} y2="110" stroke={AMBER} strokeWidth="1.8" strokeDasharray={last ? "4 3" : undefined} markerEnd="url(#pf-ro-a)" />
            {!last && <Tx x={(x + x2) / 2} y={103} t="f̂" size={14} fill={AMBER} />}
            {!last && (
              <>
                <line x1={(x + x2) / 2} y1="150" x2={(x + x2) / 2} y2="115" stroke={INK} strokeWidth="1.2" markerEnd="url(#pf-ro-k)" />
                <Tx x={(x + x2) / 2} y={164} t={`a_${i}`} size={13} />
              </>
            )}
          </g>
        );
      })}
      <Tx x={251} y={102} t="…" size={14} fill={AMBER} word />
      {xs.map((x, i) => (
        <g key={`n${i}`}>
          <circle cx={x} cy="110" r="14" fill={i === 0 ? "#e5e7eb" : "#fef3c7"} stroke={i === 0 ? GRAY : AMBER} strokeWidth="1.6" />
          <Tx x={x} y={115} t={i === 0 ? "s_0" : `ŝ_${names[i]}`} size={13} fill={i === 0 ? GRAY : AMBER} />
        </g>
      ))}
      <Tx x={32} y={140} t="ŝ_0 = s_0" size={12} fill={GRAY} />
    </svg>
  );
}

/** e_{t+1} = (f̂(ŝ_t) − f̂(s_t)) + (f̂(s_t) − f(s_t)): the new error is the old one carried forward plus a fresh one. */
export function ErrorSplitPicture() {
  const { pick } = useLang();
  const s: [number, number] = [52, 142];
  const sh: [number, number] = [62, 80];
  const f: [number, number] = [222, 152];
  const fs: [number, number] = [230, 112];
  const fsh: [number, number] = [244, 40];
  return (
    <svg
      viewBox="0 0 320 180"
      className={SVG_CLASS}
      role="img"
      aria-label={pick([
        "The true state s_t and the prediction ŝ_t, each stepped forward. The new error e_t+1 is the sum of the old error carried forward by the model and a fresh one-step error.",
        "真實狀態 s_t 與預測 ŝ_t 各自往前走一步。新的誤差 e_t+1 是被模型帶過來的舊誤差，加上一個新的單步誤差。",
      ])}
    >
      <defs>
        {arrowMarker("pf-es-g", GRAY, 6)}
        {arrowMarker("pf-es-a", AMBER, 6)}
        {arrowMarker("pf-es-l", AMBER_L, 6)}
      </defs>
      {/* transitions */}
      <path d={`M${s[0] + 8},${s[1] + 2} Q140,172 ${f[0] - 8},${f[1]}`} fill="none" stroke={GRAY} strokeWidth="1.5" markerEnd="url(#pf-es-g)" />
      <Tx x={140} y={174} t="f" size={13} fill={GRAY} />
      <path d={`M${s[0] + 8},${s[1] - 4} Q140,118 ${fs[0] - 8},${fs[1]}`} fill="none" stroke={AMBER} strokeWidth="1.2" strokeDasharray="4 3" markerEnd="url(#pf-es-a)" />
      <Tx x={140} y={112} t="f̂" size={13} fill={AMBER} />
      <path d={`M${sh[0] + 8},${sh[1] - 4} Q150,30 ${fsh[0] - 9},${fsh[1]}`} fill="none" stroke={AMBER} strokeWidth="1.5" markerEnd="url(#pf-es-a)" />
      <Tx x={150} y={34} t="f̂" size={13} fill={AMBER} />
      {/* old error e_t */}
      <line x1={s[0]} y1={s[1] - 6} x2={sh[0]} y2={sh[1] + 6} stroke={MUTED} strokeWidth="1.2" strokeDasharray="3 2" />
      <Tx x={50} y={114} t="e_t" size={13} fill={MUTED} anchor="end" />
      {/* the two parts of e_{t+1} */}
      <line x1={f[0]} y1={f[1] - 5} x2={fs[0]} y2={fs[1] + 6} stroke={AMBER_L} strokeWidth="3" markerEnd="url(#pf-es-l)" />
      <Tx x={240} y={140} t={pick(["new error", "新誤差"])} size={11} fill={AMBER} anchor="start" word />
      <line x1={fs[0]} y1={fs[1] - 6} x2={fsh[0]} y2={fsh[1] + 7} stroke={AMBER} strokeWidth="3" markerEnd="url(#pf-es-a)" />
      <Tx x={248} y={78} t={pick(["old error,", "舊誤差，"])} size={11} fill={AMBER} anchor="start" word />
      <Tx x={248} y={92} t={pick(["carried", "被帶過來"])} size={11} fill={AMBER} anchor="start" word />
      {/* the sum */}
      <line x1={f[0] - 6} y1={f[1] - 6} x2={fsh[0] - 7} y2={fsh[1] + 5} stroke={MUTED} strokeWidth="1" strokeDasharray="2 2" />
      <Tx x={214} y={84} t="e_{t+1}" size={13} fill={MUTED} anchor="end" />
      {/* points */}
      <circle cx={s[0]} cy={s[1]} r="6" fill={GRAY} />
      <Tx x={42} y={147} t="s_t" size={13} fill={GRAY} anchor="end" />
      <circle cx={sh[0]} cy={sh[1]} r="6" fill={AMBER_L} stroke={AMBER} strokeWidth="1.2" />
      <Tx x={52} y={78} t="ŝ_t" size={13} fill={AMBER} anchor="end" />
      <circle cx={f[0]} cy={f[1]} r="6" fill={GRAY} />
      <Tx x={232} y={172} t="s_{t+1}" size={13} fill={GRAY} anchor="start" />
      <circle cx={fs[0]} cy={fs[1]} r="5" fill="#fff" stroke={AMBER} strokeWidth="1.5" />
      <Tx x={214} y={104} t="f̂(s_t)" size={12} fill={AMBER} anchor="end" />
      <circle cx={fsh[0]} cy={fsh[1]} r="6" fill={AMBER_L} stroke={AMBER} strokeWidth="1.2" />
      <Tx x={254} y={42} t="ŝ_{t+1}" size={13} fill={AMBER} anchor="start" />
    </svg>
  );
}

/** ‖e_H‖ ≤ ε(L^H − 1)/(L − 1): the true and predicted paths part, a fresh ε each step on top of the stretched gap. */
export function CompoundingPicture() {
  const { pick } = useLang();
  const L = 1.8;
  const eps = 7;
  const xs = [20, 70, 120, 170, 250];
  const trueY = (k: number) => 150 - 7 * k;
  const gap = (k: number) => (eps * (L ** k - 1)) / (L - 1);
  const pred = xs.map((x, k) => [x, trueY(k) - gap(k)] as [number, number]);
  const truth = xs.map((x, k) => [x, trueY(k)] as [number, number]);
  const steps = ["0", "1", "2", "3", "H"];
  return (
    <svg
      viewBox="0 0 320 180"
      className={SVG_CLASS}
      role="img"
      aria-label={pick([
        "A true path and a predicted path that start together and part faster and faster; each step adds a fresh error ε on top of the previous gap stretched by L.",
        "真實路徑與預測路徑從同一點出發，卻越分越快；每一步都在被放大 L 倍的舊差距上，再加一個新的誤差 ε。",
      ])}
    >
      <line x1="16" y1="160" x2="306" y2="160" stroke="#d1d5db" strokeWidth="1" />
      {xs.map((x, k) => (
        <g key={`ax${k}`}>
          <line x1={x} y1="157" x2={x} y2="163" stroke={MUTED} strokeWidth="1" />
          <Tx x={x} y={176} t={steps[k]} size={12} fill={MUTED} />
        </g>
      ))}
      <Tx x={210} y={176} t="…" size={12} fill={MUTED} word />
      <path d={line(truth)} fill="none" stroke={GRAY} strokeWidth="2" />
      <path d={line(pred)} fill="none" stroke={AMBER} strokeWidth="2" strokeDasharray="5 3" />
      {xs.slice(1).map((x, i) => {
        const k = i + 1;
        const yT = trueY(k);
        const yP = yT - gap(k);
        return (
          <g key={`g${k}`}>
            {/* the stretched old gap */}
            <line x1={x} y1={yT} x2={x} y2={yP + eps} stroke={MUTED} strokeWidth="1.2" />
            {/* the fresh one-step error */}
            <line x1={x} y1={yP + eps} x2={x} y2={yP} stroke={AMBER_L} strokeWidth="4" />
            <Tx x={x - 5} y={yP - 4} t="ε" size={12} fill={AMBER} anchor="end" />
          </g>
        );
      })}
      <Tx x={286} y={74} t="ε(L^H − 1)" size={12} fill={GRAY} />
      <line x1="260" y1="80" x2="312" y2="80" stroke={GRAY} strokeWidth="1" />
      <Tx x={286} y={95} t="L − 1" size={12} fill={GRAY} />
      <circle cx={xs[0]} cy={trueY(0)} r="4" fill={GRAY} />
      {truth.slice(1).map(([x, y], i) => (
        <circle key={`tp${i}`} cx={x} cy={y} r="3.5" fill={GRAY} />
      ))}
      {pred.slice(1).map(([x, y], i) => (
        <circle key={`pp${i}`} cx={x} cy={y} r="3.5" fill={AMBER_L} stroke={AMBER} />
      ))}
      <Tx x={12} y={20} t={pick(["gap grows ×L per step, + ε", "差距每步 ×L，再加 ε"])} size={11} fill={MUTED} anchor="start" word />
    </svg>
  );
}

/** The cart-pole equations: cart, pole, θ, F, gravity mg, the half-length l. */
export function CartpolePicture() {
  const { pick } = useLang();
  const th = (28 * Math.PI) / 180;
  const piv: [number, number] = [150, 120];
  const len = 120; // 2l
  const com: [number, number] = [piv[0] + (len / 2) * Math.sin(th), piv[1] - (len / 2) * Math.cos(th)];
  const tip: [number, number] = [piv[0] + len * Math.sin(th), piv[1] - len * Math.cos(th)];
  const arcR = 28;
  const arcEnd: [number, number] = [piv[0] + arcR * Math.sin(th), piv[1] - arcR * Math.cos(th)];
  // the l dimension line, beside the upper half of the pole
  const nx = Math.cos(th);
  const ny = Math.sin(th);
  const dA: [number, number] = [com[0] + 12 * nx, com[1] + 12 * ny];
  const dB: [number, number] = [tip[0] + 12 * nx, tip[1] + 12 * ny];
  return (
    <svg
      viewBox="0 0 320 180"
      className={SVG_CLASS}
      role="img"
      aria-label={pick([
        "A cart on a rail pushed by a force F, with a pole hinged on top at angle θ from upright; gravity mg pulls down at the pole's centre, a distance l from the hinge.",
        "軌道上的小車受推力 F 推動，頂上鉸接的擺桿與鉛直方向夾角 θ；重力 mg 作用在擺桿中點，離鉸點距離 l。",
      ])}
    >
      <defs>
        {arrowMarker("pf-cp-k", INK)}
        {arrowMarker("pf-cp-a", AMBER)}
        {arrowMarker("pf-cp-g", MUTED, 6)}
      </defs>
      {/* rail and position */}
      <line x1="14" y1="156" x2="306" y2="156" stroke={GRAY} strokeWidth="2" />
      <line x1="40" y1="152" x2="40" y2="160" stroke={MUTED} strokeWidth="1.2" />
      <line x1="40" y1="170" x2={piv[0] - 2} y2="170" stroke={MUTED} strokeWidth="1" markerEnd="url(#pf-cp-g)" />
      <Tx x={95} y={167} t="x" size={13} fill={MUTED} />
      {/* cart */}
      <rect x={piv[0] - 40} y={piv[1]} width="80" height="26" rx="3" fill="#e5e7eb" stroke={GRAY} strokeWidth="1.6" />
      <circle cx={piv[0] - 24} cy="150" r="5" fill={GRAY} />
      <circle cx={piv[0] + 24} cy="150" r="5" fill={GRAY} />
      <Tx x={piv[0]} y={138} t="m_c" size={13} fill={GRAY} />
      {/* force */}
      <line x1="56" y1="133" x2={piv[0] - 43} y2="133" stroke={AMBER} strokeWidth="2.4" markerEnd="url(#pf-cp-a)" />
      <Tx x={80} y={126} t="F" size={14} fill={AMBER} />
      {/* vertical reference and angle */}
      <line x1={piv[0]} y1={piv[1]} x2={piv[0]} y2="30" stroke={MUTED} strokeWidth="1" strokeDasharray="3 3" />
      <path d={`M${piv[0]},${piv[1] - arcR} A${arcR},${arcR} 0 0 1 ${arcEnd[0].toFixed(1)},${arcEnd[1].toFixed(1)}`} fill="none" stroke={INK} strokeWidth="1.2" />
      <Tx x={piv[0] + 6} y={piv[1] - arcR - 6} t="θ" size={14} />
      {/* pole */}
      <line x1={piv[0]} y1={piv[1]} x2={tip[0]} y2={tip[1]} stroke={GRAY} strokeWidth="5" strokeLinecap="round" />
      <circle cx={piv[0]} cy={piv[1]} r="3.5" fill="#fff" stroke={GRAY} strokeWidth="1.5" />
      <circle cx={com[0]} cy={com[1]} r="5" fill={INK} />
      <Tx x={com[0] - 9} y={com[1] - 2} t="m" size={13} anchor="end" />
      {/* l */}
      <line x1={dA[0]} y1={dA[1]} x2={dB[0]} y2={dB[1]} stroke={MUTED} strokeWidth="1" />
      <line x1={dA[0] - 4 * nx} y1={dA[1] - 4 * ny} x2={dA[0] + 4 * nx} y2={dA[1] + 4 * ny} stroke={MUTED} strokeWidth="1" />
      <line x1={dB[0] - 4 * nx} y1={dB[1] - 4 * ny} x2={dB[0] + 4 * nx} y2={dB[1] + 4 * ny} stroke={MUTED} strokeWidth="1" />
      <Tx x={(dA[0] + dB[0]) / 2 + 9} y={(dA[1] + dB[1]) / 2 + 8} t="l" size={14} fill={GRAY} anchor="start" />
      {/* gravity */}
      <line x1={com[0]} y1={com[1] + 6} x2={com[0]} y2={com[1] + 38} stroke={INK} strokeWidth="1.8" markerEnd="url(#pf-cp-k)" />
      <Tx x={com[0] + 6} y={com[1] + 34} t="mg" size={13} anchor="start" />
      <Tx x={308} y={176} t={pick(["l = half the pole", "l = 擺桿長的一半"])} size={11} fill={MUTED} anchor="end" word />
    </svg>
  );
}

/** Kalman predict: a narrow belief at t−1 moves by A, B u and spreads (A P Aᵀ, then + Q). */
export function KalmanPredictPicture() {
  const { pick } = useLang();
  const base = 136;
  const b0 = { mu: 72, s: 12, peak: 92 };
  const sA = 19; // spread after A P Aᵀ alone
  const b1 = { mu: 218, s: 27, peak: (92 * 12) / 27 };
  const halfH = (p: number) => base - p * Math.exp(-0.5);
  return (
    <svg
      viewBox="0 0 320 180"
      className={SVG_CLASS}
      role="img"
      aria-label={pick([
        "Predict: a narrow belief about x at time t−1 is moved by the model to a new mean and widened, first by A P Aᵀ and then by the process noise Q.",
        "預測：時間 t−1 時對 x 的窄信念被模型移到新的平均值，並變寬：先由 A P Aᵀ，再加上過程雜訊 Q。",
      ])}
    >
      <defs>{arrowMarker("pf-kp-a", AMBER)}{arrowMarker("pf-kp-m", MUTED, 6)}</defs>
      <line x1="12" y1={base} x2="306" y2={base} stroke={GRAY} strokeWidth="1.2" markerEnd="url(#pf-kp-m)" />
      <Tx x={304} y={base - 6} t="x" size={13} fill={GRAY} anchor="end" />
      <path d={bell(b0.mu, b0.s, b0.peak, base, 20, 130, true)} fill={AMBER_FILL} fillOpacity="0.7" stroke={AMBER} strokeWidth="1.8" />
      <path d={bell(b1.mu, b1.s, b1.peak, base, 130, 300, true)} fill={AMBER_FILL} fillOpacity="0.3" stroke={AMBER} strokeWidth="1.8" strokeDasharray="5 3" />
      <path d={`M${b0.mu + 10},${base - b0.peak - 4} Q150,4 ${b1.mu - 6},${base - b1.peak - 8}`} fill="none" stroke={AMBER} strokeWidth="1.4" markerEnd="url(#pf-kp-a)" />
      <Tx x={150} y={20} t="A x̂ + B u" size={13} fill={AMBER} />
      {/* widths */}
      <line x1={b0.mu - b0.s} y1={halfH(b0.peak)} x2={b0.mu + b0.s} y2={halfH(b0.peak)} stroke={GRAY} strokeWidth="1.4" />
      <line x1={b1.mu - sA} y1={halfH(b1.peak) - 6} x2={b1.mu + sA} y2={halfH(b1.peak) - 6} stroke={GRAY} strokeWidth="1.2" strokeDasharray="3 2" />
      <line x1={b1.mu - b1.s} y1={halfH(b1.peak)} x2={b1.mu + b1.s} y2={halfH(b1.peak)} stroke={GRAY} strokeWidth="1.4" />
      <Tx x={b1.mu - sA - 4} y={halfH(b1.peak) - 10} t="APA^⊤" size={11} fill={GRAY} anchor="end" />
      <Tx x={b1.mu + b1.s + 4} y={halfH(b1.peak) + 4} t="+ Q" size={13} fill={GRAY} anchor="start" />
      {/* labels */}
      <Tx x={b0.mu} y={153} t="x̂_{t−1|t−1}" size={12} fill={AMBER} />
      <Tx x={b0.mu} y={171} t="P_{t−1|t−1}" size={12} fill={GRAY} />
      <Tx x={b1.mu} y={153} t="x̂_{t|t−1}" size={12} fill={AMBER} />
      <Tx x={b1.mu} y={171} t="P_{t|t−1}" size={12} fill={GRAY} />
    </svg>
  );
}

/** Kalman correct: the wide prediction and the measurement y_t combine into a narrower estimate between them. */
export function KalmanCorrectPicture() {
  const { pick } = useLang();
  const base = 132;
  const pr = { mu: 96, s: 30 };
  const me = { mu: 222, s: 22 };
  const K = pr.s ** 2 / (pr.s ** 2 + me.s ** 2);
  const po = { mu: pr.mu + K * (me.mu - pr.mu), s: Math.sqrt(1 / (1 / pr.s ** 2 + 1 / me.s ** 2)) };
  const pk = (s: number) => 2000 / s;
  return (
    <svg
      viewBox="0 0 320 180"
      className={SVG_CLASS}
      role="img"
      aria-label={pick([
        "Correct: a wide predicted Gaussian and a measurement y_t combine into a narrower corrected Gaussian between them; the Kalman gain K_t sets how far the estimate moves toward the measurement.",
        "修正：寬的預測高斯分布與量測 y_t 結合成兩者之間、更窄的修正後高斯分布；卡爾曼增益 K_t 決定估計往量測移動多遠。",
      ])}
    >
      <defs>{arrowMarker("pf-kc-a", AMBER, 6)}{arrowMarker("pf-kc-m", MUTED, 6)}</defs>
      <line x1="12" y1={base} x2="306" y2={base} stroke={GRAY} strokeWidth="1.2" markerEnd="url(#pf-kc-m)" />
      <Tx x={304} y={base - 6} t="x" size={13} fill={GRAY} anchor="end" />
      <path d={bell(pr.mu, pr.s, pk(pr.s), base, 14, 300)} fill="none" stroke={AMBER} strokeWidth="1.8" strokeDasharray="5 3" />
      <path d={bell(me.mu, me.s, pk(me.s), base, 14, 300)} fill="none" stroke={GRAY} strokeWidth="1.8" />
      <path d={bell(po.mu, po.s, pk(po.s), base, 14, 300, true)} fill={AMBER_FILL} fillOpacity="0.7" stroke={AMBER} strokeWidth="2" />
      <Tx x={pr.mu - 14} y={base - pk(pr.s) - 6} t="x̂_{t|t−1}" size={12} fill={AMBER} anchor="end" />
      <Tx x={me.mu + 14} y={base - pk(me.s) + 2} t="y_t" size={14} fill={GRAY} anchor="start" />
      <Tx x={me.mu + me.s + 6} y={base - pk(me.s) * 0.45} t="R" size={13} fill={GRAY} anchor="start" />
      <Tx x={po.mu} y={base - pk(po.s) - 6} t="x̂_{t|t}" size={12} fill={AMBER} />
      {/* innovation and gain */}
      <line x1={pr.mu} y1={base + 12} x2={me.mu} y2={base + 12} stroke={GRAY} strokeWidth="1.2" />
      <line x1={pr.mu} y1={base + 7} x2={pr.mu} y2={base + 17} stroke={GRAY} strokeWidth="1.2" />
      <line x1={me.mu} y1={base + 7} x2={me.mu} y2={base + 17} stroke={GRAY} strokeWidth="1.2" />
      <Tx x={me.mu + 6} y={base + 16} t="y_t − Hx̂" size={12} fill={GRAY} anchor="start" />
      <line x1={pr.mu} y1={base + 26} x2={po.mu - 2} y2={base + 26} stroke={AMBER} strokeWidth="2.6" markerEnd="url(#pf-kc-a)" />
      <Tx x={po.mu + 8} y={base + 31} t={`K_t(…),  K_t ≈ ${K.toFixed(2)}`} size={12} fill={AMBER} anchor="start" />
    </svg>
  );
}

/** Var = aleatoric + epistemic: a noise band around each model, and models that agree on data and fan out beyond. */
export function UncertaintyPicture() {
  const { pick } = useLang();
  const base = (x: number) => 128 - 0.17 * (x - 20) - 8 * Math.sin(x / 22);
  const edge = 170;
  const members = [-1, -0.5, 0.15, 0.6, 1];
  const yM = (x: number, d: number) => base(x) + d * 46 * Math.max(0, (x - edge) / 130) ** 2;
  const xsAll = Array.from({ length: 58 }, (_, i) => 20 + i * 5);
  const noise = 9;
  const jitter = [4, -6, 7, -2, -8, 3, 6, -5, 1, -7, 5, -3, 8, -1];
  const data = jitter.map((j, i) => [36 + i * 9.5, base(36 + i * 9.5) + j] as [number, number]);
  const bandTop = xsAll.map((x) => [x, yM(x, 0.15) - noise] as [number, number]);
  const bandBot = xsAll.map((x) => [x, yM(x, 0.15) + noise] as [number, number]).reverse();
  const xr = 298;
  const ys = members.map((d) => yM(xr, d));
  return (
    <svg
      viewBox="0 0 320 180"
      className={SVG_CLASS}
      role="img"
      aria-label={pick([
        "Five model curves of the next state s′ against the current state: inside the training data they agree and only the noise band remains (aleatoric); beyond it they fan apart (epistemic).",
        "五條模型曲線畫出下一個狀態 s′ 對目前狀態的關係：在訓練資料範圍內它們一致，只剩雜訊帶（偶然性）；超出資料後它們散開（認知性）。",
      ])}
    >
      <rect x="30" y="18" width={edge - 30} height="142" fill="#f3f4f6" />
      <Tx x={100} y={32} t={pick(["training data", "訓練資料"])} size={11} fill={MUTED} word />
      <line x1="16" y1="160" x2="308" y2="160" stroke={GRAY} strokeWidth="1" />
      <line x1="16" y1="160" x2="16" y2="14" stroke={GRAY} strokeWidth="1" />
      <Tx x={308} y={174} t="s, a" size={13} fill={GRAY} anchor="end" />
      <Tx x={22} y={24} t="s′" size={13} fill={GRAY} anchor="start" />
      <path d={line([...bandTop, ...bandBot]) + " Z"} fill={AMBER_FILL} fillOpacity="0.55" />
      {members.map((d, i) => (
        <path key={i} d={line(xsAll.map((x) => [x, yM(x, d)]))} fill="none" stroke={i % 2 ? SKY : AMBER} strokeWidth="1.6" strokeOpacity="0.9" />
      ))}
      {data.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.6" fill={GRAY} />
      ))}
      {/* aleatoric bracket */}
      <line x1="70" y1={yM(70, 0.15) - noise} x2="70" y2={yM(70, 0.15) + noise} stroke={INK} strokeWidth="1.4" />
      <Tx x={70} y={yM(70, 0.15) + noise + 16} t={pick(["aleatoric: noise", "偶然性：雜訊"])} size={11} fill={INK} word />
      {/* epistemic bracket */}
      <line x1={xr + 6} y1={Math.min(...ys)} x2={xr + 6} y2={Math.max(...ys)} stroke={INK} strokeWidth="1.4" />
      <line x1={xr + 2} y1={Math.min(...ys)} x2={xr + 10} y2={Math.min(...ys)} stroke={INK} strokeWidth="1.4" />
      <line x1={xr + 2} y1={Math.max(...ys)} x2={xr + 10} y2={Math.max(...ys)} stroke={INK} strokeWidth="1.4" />
      <Tx x={xr - 2} y={Math.min(...ys) - 6} t={pick(["epistemic: models disagree", "認知性：模型分歧"])} size={11} fill={INK} anchor="end" word />
    </svg>
  );
}

/** RSSM: the deterministic h chain, stochastic z below it; posterior from o_t, prior only while imagining. */
export function RssmPicture() {
  const { pick } = useLang();
  const cx = [56, 160, 264];
  const hy = 64;
  const zy = 118;
  const oy = 160;
  return (
    <svg
      viewBox="0 0 320 180"
      className={SVG_CLASS}
      role="img"
      aria-label={pick([
        "The RSSM unrolled: a chain of deterministic states h, each feeding a stochastic latent z below it; with an observation o the latent is the posterior q, and in the imagined step without o it is the prior p.",
        "展開的 RSSM：一串確定性狀態 h，每個都向下連到一個隨機潛在變數 z；有觀測 o 時，潛在變數是後驗 q；在沒有 o 的想像步驟中，它是先驗 p。",
      ])}
    >
      <defs>
        {arrowMarker("pf-rs-a", AMBER, 6)}
        {arrowMarker("pf-rs-g", GRAY, 6)}
        {arrowMarker("pf-rs-k", INK, 6)}
      </defs>
      {/* h chain */}
      {[0, 1].map((i) => (
        <g key={`hh${i}`}>
          <line x1={cx[i] + 23} y1={hy} x2={cx[i + 1] - 24} y2={hy} stroke={AMBER} strokeWidth="2" markerEnd="url(#pf-rs-a)" />
          <line x1={cx[i] + 14} y1={zy - 10} x2={cx[i + 1] - 24} y2={hy + 10} stroke={AMBER} strokeWidth="1.2" markerEnd="url(#pf-rs-a)" />
          <line x1={(cx[i] + cx[i + 1]) / 2 - 6} y1="26" x2={(cx[i] + cx[i + 1]) / 2 + 2} y2={hy - 6} stroke={INK} strokeWidth="1.2" markerEnd="url(#pf-rs-k)" />
          <Tx x={(cx[i] + cx[i + 1]) / 2 - 10} y={20} t={i === 0 ? "a_{t−1}" : "a_t"} size={13} />
        </g>
      ))}
      {cx.map((x, i) => {
        const sub = ["t−1", "t", "t+1"][i];
        const imagined = i === 2;
        return (
          <g key={`c${i}`}>
            <rect x={x - 22} y={hy - 14} width="44" height="28" rx="3" fill="#fef3c7" stroke={AMBER} strokeWidth="1.6" />
            <Tx x={x} y={hy + 5} t={`h_{${sub}}`} size={14} fill={AMBER} />
            <line x1={x} y1={hy + 15} x2={x} y2={zy - 19} stroke={AMBER} strokeWidth="1.2" strokeDasharray={imagined ? "4 3" : undefined} markerEnd="url(#pf-rs-a)" />
            <circle cx={x} cy={zy} r="22" fill={AMBER_FILL} fillOpacity="0.35" />
            <circle cx={x} cy={zy} r="17" fill="#fff" stroke={AMBER} strokeWidth="1.6" strokeDasharray={imagined ? "4 3" : undefined} />
            <Tx x={x} y={zy + 5} t={imagined ? `ẑ_{${sub}}` : `z_{${sub}}`} size={14} fill={AMBER} />
            {imagined ? (
              <>
                <Tx x={x + 8} y={hy + 36} t="p" size={13} fill={AMBER} anchor="start" />
                <Tx x={x} y={oy + 12} t={pick(["imagined: no o", "想像中：沒有 o"])} size={11} fill={MUTED} word />
              </>
            ) : (
              <>
                <rect x={x - 22} y={oy - 9} width="44" height="20" rx="2" fill="#e5e7eb" stroke={GRAY} strokeWidth="1.3" />
                <Tx x={x} y={oy + 6} t={`o_{${sub}}`} size={14} fill={GRAY} />
                <line x1={x} y1={oy - 9} x2={x} y2={zy + 18} stroke={GRAY} strokeWidth="1.3" markerEnd="url(#pf-rs-g)" />
                {i === 1 && <Tx x={x + 8} y={oy - 12} t="q" size={13} fill={GRAY} anchor="start" />}
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}
