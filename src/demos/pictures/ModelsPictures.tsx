/** Pictures for the loss equations of Coding Skills ▸ States, models and rollouts (#/skills/models). Static SVGs. */
import { useLang } from "@learnkit/web";
import { AMBER, AMBER_FILL, GRAY, INK, MUTED, SKY, SVG_CLASS, Tx, arrowMarker, bell, bellY, line } from "./FoundationsPictures.tsx";

/** −log N(x; x̂, σ²I): the decoder's bell around x̂ above, and below it the bowl −log N whose height at x is the loss. */
export function GaussianNllPicture() {
  const { pick } = useLang();
  const mu = 150;
  const sig = 30;
  const xd = 215;
  const top = 66; // baseline of the bell
  const axis = 162;
  const floor = 22; // the constant term, in px
  const k = 12; // px per unit of (x − x̂)²/2σ²
  const bowl = (x: number) => axis - floor - (k * (x - mu) ** 2) / (2 * sig * sig);
  const xs = Array.from({ length: 81 }, (_, i) => 56 + i * 2.35);
  return (
    <svg
      viewBox="0 0 320 180"
      className={SVG_CLASS}
      role="img"
      aria-label={pick([
        "Above, the decoder's Gaussian of width σ centred on its prediction x̂, with the real x off to one side. Below, the negative log-likelihood as a bowl: a constant floor set by σ, plus a quadratic rise with the distance from x̂ to x.",
        "上方是解碼器以預測 x̂ 為中心、寬度 σ 的高斯分布，真實的 x 落在一旁。下方是負對數似然形成的碗：由 σ 決定的常數底部，加上隨 x̂ 到 x 的距離二次上升的部分。",
      ])}
    >
      <defs>{arrowMarker("pm-nl-k", INK, 5)}</defs>
      {/* the bell */}
      <path d={bell(mu, sig, 46, top, 40, 260, true)} fill={AMBER_FILL} fillOpacity="0.5" stroke={AMBER} strokeWidth="1.6" />
      <line x1="40" y1={top} x2="260" y2={top} stroke="#d1d5db" strokeWidth="1" />
      <line x1={mu - sig} y1={bellY(mu - sig, mu, sig, 46, top)} x2={mu + sig} y2={bellY(mu + sig, mu, sig, 46, top)} stroke={GRAY} strokeWidth="1.3" />
      <Tx x={mu} y={top - 8} t="σ" size={13} fill={GRAY} />
      <Tx x={14} y={30} t="N(x̂, σ^2)" size={12} fill={AMBER} anchor="start" />
      {/* the bowl */}
      <line x1="40" y1={axis} x2="270" y2={axis} stroke={GRAY} strokeWidth="1" />
      <path d={line(xs.map((x) => [x, bowl(x)]))} fill="none" stroke={AMBER} strokeWidth="2" />
      <Tx x={14} y={96} t="−log N" size={12} fill={AMBER} anchor="start" />
      {/* the constant floor */}
      <line x1={mu} y1={axis} x2={mu} y2={axis - floor} stroke={GRAY} strokeWidth="1.6" />
      <line x1={mu} y1={axis - floor} x2={xd} y2={axis - floor} stroke={MUTED} strokeWidth="1" strokeDasharray="2 2" />
      <Tx x={mu - 6} y={axis - 6} t="(n/2) log 2πσ^2" size={12} fill={GRAY} anchor="end" />
      {/* the quadratic term */}
      <line x1={xd} y1={axis - floor} x2={xd} y2={bowl(xd)} stroke={AMBER} strokeWidth="2.6" />
      <Tx x={xd + 7} y={(axis - floor + bowl(xd)) / 2 + 4} t="‖x − x̂‖^2 / 2σ^2" size={12} fill={AMBER} anchor="start" />
      {/* x and x̂ */}
      <line x1={xd} y1={top} x2={xd} y2={axis} stroke={MUTED} strokeWidth="1" strokeDasharray="3 3" />
      <line x1={mu} y1={top} x2={mu} y2={axis - floor} stroke={MUTED} strokeWidth="1" strokeDasharray="3 3" />
      <circle cx={xd} cy={top} r="4.5" fill={GRAY} />
      <circle cx={xd} cy={axis} r="4.5" fill={GRAY} />
      <Tx x={xd} y={177} t="x" size={14} fill={GRAY} />
      <Tx x={mu} y={177} t="x̂" size={14} fill={AMBER} />
      <line x1={mu + 8} y1={173} x2={xd - 8} y2={173} stroke={INK} strokeWidth="1" markerStart="url(#pm-nl-k)" markerEnd="url(#pm-nl-k)" />
    </svg>
  );
}

/** KL(q‖p) for 1-D Gaussians: two bells, the gap between their means, their widths, and q's mass where p is unlikely. */
export function KlPicture() {
  const { pick } = useLang();
  const base = 142;
  const p = { mu: 118, s: 36, peak: 2600 / 36 };
  const q = { mu: 198, s: 20, peak: 2600 / 20 };
  const xs = Array.from({ length: 121 }, (_, i) => 20 + i * 2.4);
  const excess = xs.filter((x) => bellY(x, q.mu, q.s, q.peak, base) < bellY(x, p.mu, p.s, p.peak, base) - 0.5);
  const top = excess.map((x) => [x, bellY(x, q.mu, q.s, q.peak, base)] as [number, number]);
  const bot = excess.map((x) => [x, bellY(x, p.mu, p.s, p.peak, base)] as [number, number]).reverse();
  const half = (b: { peak: number }) => base - b.peak * Math.exp(-0.5);
  return (
    <svg
      viewBox="0 0 320 180"
      className={SVG_CLASS}
      role="img"
      aria-label={pick([
        "Two Gaussians: the prior p, wide, and the posterior q, narrow and shifted right. The gap between their means, their widths σ_p and σ_q, and the shaded part of q where p is unlikely are what the KL measures.",
        "兩個高斯分布：寬的先驗 p，以及較窄、往右移的後驗 q。兩者平均值之間的差距、寬度 σ_p 與 σ_q，以及 q 落在 p 不太可能之處的陰影部分，就是 KL 衡量的東西。",
      ])}
    >
      <defs>{arrowMarker("pm-kl-k", INK, 5)}</defs>
      <line x1="14" y1={base} x2="306" y2={base} stroke={GRAY} strokeWidth="1" />
      <path d={line([...top, ...bot]) + " Z"} fill={AMBER_FILL} fillOpacity="0.8" />
      <path d={bell(p.mu, p.s, p.peak, base, 14, 306)} fill="none" stroke={SKY} strokeWidth="2" strokeDasharray="5 3" />
      <path d={bell(q.mu, q.s, q.peak, base, 14, 306)} fill="none" stroke={AMBER} strokeWidth="2" />
      <Tx x={70} y={78} t="p" size={15} fill={SKY} />
      <Tx x={228} y={30} t="q" size={15} fill={AMBER} />
      {/* widths */}
      <line x1={p.mu - p.s} y1={half(p)} x2={p.mu + p.s} y2={half(p)} stroke={SKY} strokeWidth="1.4" />
      <Tx x={p.mu - p.s - 9} y={half(p) + 4} t="σ_p" size={13} fill={SKY} anchor="end" />
      <line x1={q.mu - q.s} y1={half(q)} x2={q.mu + q.s} y2={half(q)} stroke={AMBER} strokeWidth="1.4" />
      <Tx x={q.mu + q.s + 5} y={half(q) + 4} t="σ_q" size={13} fill={AMBER} anchor="start" />
      {/* means */}
      <line x1={p.mu} y1={base - p.peak} x2={p.mu} y2={base + 6} stroke={SKY} strokeWidth="1" strokeDasharray="2 2" />
      <line x1={q.mu} y1={base - q.peak} x2={q.mu} y2={base + 6} stroke={AMBER} strokeWidth="1" strokeDasharray="2 2" />
      <line x1={p.mu + 3} y1={base + 10} x2={q.mu - 3} y2={base + 10} stroke={INK} strokeWidth="1.2" markerStart="url(#pm-kl-k)" markerEnd="url(#pm-kl-k)" />
      <Tx x={(p.mu + q.mu) / 2 - 20} y={base + 30} t="μ_q − μ_p" size={13} />
      <Tx x={310} y={base + 30} t={pick(["q where p is unlikely", "q 落在 p 不可能之處"])} size={11} fill={AMBER} anchor="end" word />
    </svg>
  );
}
